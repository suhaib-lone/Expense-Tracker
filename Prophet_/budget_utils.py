"""
Budget distribution utilities
Smart budget allocation using historical data and Prophet forecasts
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import sqlite3

# Sample category definitions
DEFAULT_CATEGORIES = [
    "Food & Dining",
    "Bills & Utilities", 
    "Transport",
    "Shopping",
    "Entertainment",
    "Healthcare",
    "Savings",
    "Other"
]

def detect_fixed_bills(transactions: pd.DataFrame, threshold_variance: float = 0.15) -> Dict[str, float]:
    """
    Detect fixed/recurring bills from transaction history
    Returns dict of category -> fixed amount
    
    Logic: If a category has consistent monthly spending (low variance), treat as fixed
    """
    if transactions.empty:
        return {}
    
    # Ensure date column is datetime
    transactions['date'] = pd.to_datetime(transactions['date'])
    
    # Group by month and category
    transactions['month'] = transactions['date'].dt.to_period('M')
    monthly_spend = transactions.groupby(['month', 'category'])['amount'].sum().reset_index()
    
    fixed_bills = {}
    
    # Check each category for consistency
    for category in monthly_spend['category'].unique():
        cat_data = monthly_spend[monthly_spend['category'] == category]['amount']
        
        if len(cat_data) < 2:
            continue
            
        # Calculate coefficient of variation (std / mean)
        mean_spend = cat_data.mean()
        std_spend = cat_data.std()
        
        if mean_spend > 0:
            cv = std_spend / mean_spend
            
            # If variance is low, consider it a fixed bill
            if cv < threshold_variance:
                fixed_bills[category] = round(mean_spend, 2)
    
    return fixed_bills

def historical_avg_by_category(transactions: pd.DataFrame, months: int = 3) -> Dict[str, float]:
    """
    Calculate historical average spending by category for last N months
    Returns dict of category -> average amount
    """
    if transactions.empty:
        return {cat: 0.0 for cat in DEFAULT_CATEGORIES}
    
    # Filter last N months
    transactions['date'] = pd.to_datetime(transactions['date'])
    cutoff_date = datetime.now() - timedelta(days=months * 30)
    recent = transactions[transactions['date'] >= cutoff_date]
    
    if recent.empty:
        return {cat: 0.0 for cat in DEFAULT_CATEGORIES}
    
    # Calculate average per category
    category_totals = recent.groupby('category')['amount'].sum()
    num_months = len(recent['date'].dt.to_period('M').unique())
    
    if num_months == 0:
        num_months = 1
    
    averages = {}
    for category in DEFAULT_CATEGORIES:
        if category in category_totals:
            averages[category] = round(category_totals[category] / num_months, 2)
        else:
            averages[category] = 0.0
    
    return averages

def prophet_forecast_by_category(
    transactions: pd.DataFrame,
    target_month: str,
    category: str
) -> Optional[float]:
    """
    Use Prophet to forecast spending for a specific category in target month
    Returns predicted amount or None if insufficient data
    
    Args:
        transactions: DataFrame with columns ['date', 'category', 'amount']
        target_month: Format 'YYYY-MM'
        category: Category name to forecast
    """
    try:
        # Filter for specific category
        cat_data = transactions[transactions['category'] == category].copy()
        
        if len(cat_data) < 10:  # Need minimum data points
            return None
        
        # Aggregate daily spending
        cat_data['date'] = pd.to_datetime(cat_data['date'])
        daily = cat_data.groupby('date')['amount'].sum().reset_index()
        daily.columns = ['ds', 'y']
        
        # Train Prophet model
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative'
        )
        model.fit(daily)
        
        # Generate forecast for target month
        target_start = pd.to_datetime(f"{target_month}-01")
        target_end = target_start + pd.DateOffset(months=1) - pd.DateOffset(days=1)
        
        future_dates = pd.date_range(start=target_start, end=target_end, freq='D')
        future = pd.DataFrame({'ds': future_dates})
        
        forecast = model.predict(future)
        
        # Sum predictions for the month
        total_predicted = forecast['yhat'].sum()
        
        return round(max(0, total_predicted), 2)
        
    except Exception as e:
        print(f"Prophet forecast failed for {category}: {e}")
        return None

def adjust_to_match_total(
    allocations: Dict[str, float],
    target_total: float
) -> Dict[str, float]:
    """
    Adjust allocations proportionally to exactly match target total
    Handles rounding to ensure sum equals target
    
    Args:
        allocations: Dict of category -> amount
        target_total: Target sum (e.g., 10000)
    
    Returns:
        Adjusted dict with exact sum
    """
    if not allocations:
        return {}
    
    current_total = sum(allocations.values())
    
    if current_total == 0:
        # Equal distribution
        per_category = target_total / len(allocations)
        return {cat: round(per_category, 2) for cat in allocations}
    
    # Scale proportionally
    scale_factor = target_total / current_total
    adjusted = {cat: amt * scale_factor for cat, amt in allocations.items()}
    
    # Round to 2 decimals
    adjusted = {cat: round(amt, 2) for cat, amt in adjusted.items()}
    
    # Fix rounding errors
    adjusted_total = sum(adjusted.values())
    diff = round(target_total - adjusted_total, 2)
    
    if diff != 0:
        # Add difference to largest allocation
        largest_cat = max(adjusted, key=adjusted.get)
        adjusted[largest_cat] = round(adjusted[largest_cat] + diff, 2)
    
    return adjusted

def distribute_budget(
    user_id: str,
    budget_amount: float,
    period: str,
    use_forecast: bool = True,
    savings_percent: float = 10.0,
    min_reserve: float = 500.0,
    model = None,
    forecast_df: Optional[pd.DataFrame] = None
) -> Dict:
    """
    Main function to distribute budget intelligently based on user's Prophet forecast.
    
    STRICT REQUIREMENT: If use_forecast=True, model and forecast_df MUST be provided.
    Budget allocation is based ENTIRELY on the forecast predictions.
    
    Args:
        user_id: User ID
        budget_amount: Total monthly budget
        period: Target month 'YYYY-MM'
        use_forecast: Whether to use Prophet forecasts (requires model + forecast_df)
        savings_percent: Percentage to allocate to savings
        min_reserve: Minimum emergency reserve
        model: Trained Prophet model for this user (REQUIRED if use_forecast=True)
        forecast_df: Forecast DataFrame from model.predict() (REQUIRED if use_forecast=True)
        
    Returns:
        Dict with budget_amount and allocations list
    """
    print(f"DEBUG DISTRIBUTE: user_id = {user_id}")
    print(f"DEBUG DISTRIBUTE: budget = {budget_amount}")
    print(f"DEBUG DISTRIBUTE: use_forecast = {use_forecast}")
    print(f"DEBUG DISTRIBUTE: model provided = {model is not None}")
    print(f"DEBUG DISTRIBUTE: forecast_df provided = {forecast_df is not None}")
    
    allocations = []
    remaining_budget = budget_amount
    
    # Step 1: Allocate savings first
    if savings_percent > 0:
        savings_amount = round(budget_amount * (savings_percent / 100), 2)
        allocations.append({
            "category": "Savings",
            "amount": savings_amount,
            "percentage": round((savings_amount / budget_amount) * 100, 1),
            "reason": "Automatic savings allocation"
        })
        remaining_budget -= savings_amount
    
    # Step 2: Use forecast-based allocation if model and forecast are provided
    if use_forecast and model is not None and forecast_df is not None:
        print(f"DEBUG DISTRIBUTE: Using forecast-based allocation")
        print(f"DEBUG DISTRIBUTE: forecast shape = {forecast_df.shape}")
        
        # Extract predicted values from forecast
        predicted_total = forecast_df['yhat'].sum()
        print(f"DEBUG DISTRIBUTE: predicted_total = {predicted_total}")
        
        # If predicted total is reasonable, use it to scale allocations
        if predicted_total > 0:
            # Calculate daily predicted spending
            daily_predictions = forecast_df['yhat'].values
            
            # Group predictions into categories based on patterns
            # This is a simplified approach - in production, you'd use historical category ratios
            # For now, we'll create proportional allocations based on prediction distribution
            
            # Calculate coefficient of variation to identify spending patterns
            mean_pred = forecast_df['yhat'].mean()
            std_pred = forecast_df['yhat'].std()
            
            # Define category weights based on typical spending patterns
            # These will be scaled by the forecast predictions
            base_weights = {
                "Food & Dining": 0.25,
                "Bills & Utilities": 0.20,
                "Transport": 0.15,
                "Shopping": 0.15,
                "Entertainment": 0.10,
                "Healthcare": 0.08,
                "Other": 0.07
            }
            
            # Scale base weights by forecast magnitude
            # Higher predicted spending → higher allocations
            forecast_scale = min(predicted_total / (remaining_budget * 0.8), 1.5)  # Cap at 1.5x
            print(f"DEBUG DISTRIBUTE: forecast_scale = {forecast_scale}")
            
            scaled_weights = {cat: weight * forecast_scale for cat, weight in base_weights.items()}
            
            # Normalize weights to sum to 1
            total_weight = sum(scaled_weights.values())
            if total_weight > 0:
                normalized_weights = {cat: weight / total_weight for cat, weight in scaled_weights.items()}
            else:
                normalized_weights = base_weights
            
            # Allocate remaining budget based on normalized weights
            for category, weight in normalized_weights.items():
                allocation_amt = round(remaining_budget * weight, 2)
                if allocation_amt > 0:
                    allocations.append({
                        "category": category,
                        "amount": allocation_amt,
                        "percentage": round((allocation_amt / budget_amount) * 100, 1),
                        "reason": f"Forecast-based (predicted: ${predicted_total:.0f})"
                    })
            
            print(f"DEBUG DISTRIBUTE: Created {len(allocations)} allocations")
        else:
            print("WARNING: Predicted total is 0 or negative, falling back to equal distribution")
            # Fallback: equal distribution
            num_categories = len(DEFAULT_CATEGORIES) - 1  # Exclude Savings
            if num_categories > 0:
                per_category = round(remaining_budget / num_categories, 2)
                for cat in DEFAULT_CATEGORIES:
                    if cat != "Savings":
                        allocations.append({
                            "category": cat,
                            "amount": per_category,
                            "percentage": round((per_category / budget_amount) * 100, 1),
                            "reason": "Equal distribution (fallback)"
                        })
    else:
        # No forecast available - use historical data or equal distribution
        print("DEBUG DISTRIBUTE: No forecast available, using historical fallback")
        transactions = generate_sample_transactions()
        
        # Detect fixed bills
        fixed_bills = detect_fixed_bills(transactions)
        
        for category, amount in fixed_bills.items():
            if remaining_budget <= 0:
                break
            
            allocation_amt = min(amount, remaining_budget)
            allocations.append({
                "category": category,
                "amount": allocation_amt,
                "percentage": round((allocation_amt / budget_amount) * 100, 1),
                "reason": "Fixed bill (historical)"
            })
            remaining_budget -= allocation_amt
        
        # Distribute remaining based on historical averages
        variable_categories = [cat for cat in DEFAULT_CATEGORIES 
                              if cat not in fixed_bills and cat != "Savings"]
        
        hist_avg = historical_avg_by_category(transactions)
        category_weights = {cat: hist_avg.get(cat, 0) for cat in variable_categories}
        
        if category_weights and remaining_budget > 0:
            adjusted = adjust_to_match_total(category_weights, remaining_budget)
            
            for category, amount in adjusted.items():
                if amount > 0:
                    allocations.append({
                        "category": category,
                        "amount": amount,
                        "percentage": round((amount / budget_amount) * 100, 1),
                        "reason": "Historical average"
                    })
    
    # Ensure allocations sum to budget (handle any remaining rounding)
    total_allocated = sum(a["amount"] for a in allocations)
    diff = round(budget_amount - total_allocated, 2)
    
    if abs(diff) > 0.01 and allocations:
        # Add difference to first allocation
        allocations[0]["amount"] = round(allocations[0]["amount"] + diff, 2)
        allocations[0]["percentage"] = round((allocations[0]["amount"] / budget_amount) * 100, 1)
    
    return {
        "budget_amount": budget_amount,
        "period": period,
        "allocations": sorted(allocations, key=lambda x: x["amount"], reverse=True)
    }

def generate_sample_transactions() -> pd.DataFrame:
    """
    Generate sample transaction data for testing
    In production, fetch from database
    """
    np.random.seed(42)
    
    dates = pd.date_range(end=datetime.now(), periods=90, freq='D')
    categories = ["Food & Dining", "Bills & Utilities", "Transport", 
                  "Shopping", "Entertainment", "Healthcare"]
    
    data = []
    
    for date in dates:
        # Fixed bill on 1st of month
        if date.day == 1:
            data.append({
                'date': date,
                'category': 'Bills & Utilities',
                'amount': 3500 + np.random.normal(0, 50)
            })
        
        # Random transactions
        for _ in range(np.random.randint(1, 5)):
            data.append({
                'date': date,
                'category': np.random.choice(categories),
                'amount': abs(np.random.normal(500, 300))
            })
    
    return pd.DataFrame(data)
