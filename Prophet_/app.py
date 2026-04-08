import pandas as pd
import joblib
import os
import pickle
from datetime import datetime, timedelta
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from io import StringIO
from prophet import Prophet
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import secrets
from database import (
    create_user, authenticate_user, create_budget, get_user_budget,
    create_expense, get_user_expenses, get_expense_stats,
    create_split_group, get_user_split_groups, create_split_expense,
    get_group_expenses, get_group_members, get_user_balance_in_group,
    mark_share_as_paid, get_user_notifications,
    save_user_model, get_user_model, delete_user_model,
    get_user_by_email, get_user_by_id,
    create_split_expense_direct, get_user_splits, get_split_share_by_id,
    mark_split_share_paid, confirm_split_share_payment, get_split_expense_summary,
    get_user_notifications_list, mark_notification_read, mark_all_notifications_read,
    create_notification
)
from budget_utils import distribute_budget
from receipt_ocr import process_receipt
import base64



MODEL_PATH = '../models/prophet_model.pkl'

# ============================================================================
# PER-USER MODEL STORAGE HELPERS (DATABASE-BASED)
# ============================================================================

def save_user_model_to_db(user_id: str, model) -> None:
    """
    Serialize the Prophet model with pickle and save it as a BLOB in the database
    associated with this user_id. Overwrites if a row already exists (UPSERT).
    """
    print(f"DEBUG: Saving model for user_id = {user_id}")
    try:
        model_bytes = pickle.dumps(model)
        # Get data points from model history if available
        data_points = len(model.history) if hasattr(model, 'history') else 0
        
        success = save_user_model(int(user_id), model_bytes, data_points)
        if success:
            print(f"✅ Model saved successfully for user {user_id} ({data_points} data points)")
        else:
            raise Exception("Database save operation failed")
    except Exception as e:
        print(f"❌ Error saving model for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save model: {str(e)}"
        )

def load_user_model_from_db(user_id: str):
    """
    Load the model BLOB for this user_id from the database,
    deserialize it, and return the Prophet model object.
    If no row exists, raise an HTTPException with status 404.
    """
    print(f"DEBUG: Loading model for user_id = {user_id}")
    try:
        model_data = get_user_model(int(user_id))
        
        if not model_data or not model_data.get('model_data'):
            print(f"❌ No model found for user {user_id}")
            raise HTTPException(
                status_code=404,
                detail="No trained model for this user. Please upload a CSV to train the model first."
            )
        
        model = pickle.loads(model_data['model_data'])
        print(f"✅ Model loaded successfully for user {user_id} (trained on {model_data.get('training_data_points', 0)} data points)")
        return model
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error loading model for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load model: {str(e)}"
        )

# ============================================================================
# PYDANTIC MODELS FOR API
# ============================================================================

# Pydantic models for auth
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember: Optional[bool] = False

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

class BudgetRequest(BaseModel):
    user_id: str
    budget_amount: float
    period: str  # Format: 'YYYY-MM'
    use_forecast: Optional[bool] = True
    preferences: Optional[dict] = None  # savings_percent, min_reserve

class CategoryAllocation(BaseModel):
    category: str
    amount: float
    percentage: float
    reason: str

class BudgetResponse(BaseModel):
    budget_amount: float
    period: str
    allocations: List[CategoryAllocation]

class SetBudgetRequest(BaseModel):
    user_id: str
    amount: float
    period: str  # Format: 'YYYY-MM'

class AddExpenseRequest(BaseModel):
    user_id: str
    category: str
    amount: float
    description: str
    date: str  # Format: 'YYYY-MM-DD'

class ExpenseResponse(BaseModel):
    id: int
    user_id: str
    category: str
    amount: float
    description: str
    date: str

class ExpenseStatsResponse(BaseModel):
    today: float
    week: float
    month: float
    largest: float
    since_budget: float
    by_category: dict

# Split expense models
class MemberInput(BaseModel):
    user_id: Optional[int] = None
    name: str
    phone: Optional[str] = None

class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    created_by: int
    members: List[MemberInput]

class CreateSplitExpenseRequest(BaseModel):
    group_id: int
    amount: float
    description: str
    paid_by: int
    date: str
    member_ids: List[int]

class MarkPaidRequest(BaseModel):
    share_id: int

# Direct split expense models (email-based system)
class CreateDirectSplitRequest(BaseModel):
    created_by_user_id: int
    total_amount: float
    description: str
    member_emails: List[str]  # List of email addresses to include in split

class SplitShareDetail(BaseModel):
    share_id: int
    split_expense_id: int
    amount: float
    status: str  # PENDING, PAID, CONFIRMED
    created_at: str
    paid_at: Optional[str] = None
    confirmed_at: Optional[str] = None
    total_amount: float
    description: str
    created_by_user_id: int
    creator_name: str
    creator_email: str
    is_creator: bool

class UserSplitsResponse(BaseModel):
    splits: List[SplitShareDetail]
    count: int

class MarkSplitPaidRequest(BaseModel):
    user_id: int  # User marking their share as paid

class ConfirmSplitPaymentRequest(BaseModel):
    user_id: int  # Creator confirming the payment

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://expense-tracker-blush-phi.vercel.app",
        "https://expense-tracker-git-main-suhaib-lones-projects.vercel.app",
        "https://expense-tracker-n22hciz7m-suhaib-lones-projects.vercel.app",
        "http://localhost:5173"
    ], # Or specify "http://localhost:5173"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def train_model(data):
    model = Prophet()
    model.fit(data)
    return model


# Load and preprocess data
def load_and_preprocess_data(file_path):
    data = pd.read_csv(file_path)

    # Parse dates in the 'Date' column
    data['Date'] = pd.to_datetime(data['Date'], errors='coerce')

    # Drop rows with invalid dates
    data = data.dropna(subset=['Date'])

    # Group by 'Date' and sum the values
    data_grouped = data.groupby('Date').sum().reset_index()

    # Fill missing dates with y=0
    full_date_range = pd.date_range(start=data_grouped['Date'].min(), end=data_grouped['Date'].max())
    data_grouped = data_grouped.set_index('Date').reindex(full_date_range, fill_value=0).reset_index()
    data_grouped.rename(columns={'index': 'Date'}, inplace=True)

    # Rename columns for Prophet compatibility
    data_grouped.rename(columns={'Date': 'ds', 'Amount': 'y'}, inplace=True)

    return data_grouped

# Authentication endpoints
@app.post("/api/auth/signup", response_model=AuthResponse, status_code=201)
async def signup(request: SignupRequest):
    """
    Register a new user with database storage and password hashing
    """
    try:
        # Create user in database (with hashed password)
        user_data = create_user(
            name=request.name,
            email=request.email,
            password=request.password,
            phone=request.phone
        )
        
        # Generate token (in production, use JWT with expiration)
        token = secrets.token_urlsafe(32)
        
        return AuthResponse(
            user=UserResponse(
                id=user_data['id'],
                name=user_data['name'],
                email=user_data['email']
            ),
            token=token
        )
    
    except ValueError as e:
        # Email already exists
        raise HTTPException(
            status_code=400,
            detail={"message": str(e), "errors": {"email": "This email is already registered"}}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": "An error occurred during registration"}
        )

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login existing user with database verification
    """
    # Authenticate user
    user_data = authenticate_user(request.email, request.password)
    
    if not user_data:
        raise HTTPException(
            status_code=401,
            detail={"message": "Invalid credentials"}
        )
    
    # Generate token (in production, use JWT with expiration)
    token = secrets.token_urlsafe(32)
    
    return AuthResponse(
        user=UserResponse(
            id=user_data['id'],
            name=user_data['name'],
            email=user_data['email']
        ),
        token=token
    )

# data = load_and_preprocess_data('../data/nwd.csv')

# if os.path.exists(MODEL_PATH):
#     print("Loading saved Prophet model...")
#     model = joblib.load(MODEL_PATH)
# else:
#     print("Training new Prophet model...")
#     model = Prophet()
#     model.fit(data)
#     joblib.dump(model, MODEL_PATH)

@app.post("/upload_csv")
async def upload_csv(file: UploadFile = File(...), user_id: Optional[str] = None):
    """
    Upload CSV and train a personalized Prophet model for THIS USER ONLY.
    The trained model is saved to the database for this user.
    
    RECOMMENDED: Provide user_id to save the trained model.
    Returns: Predictions from the trained model.
    """
    try:
        print(f"DEBUG TRAIN: user_id = {user_id}")
        
        # Read and decode CSV
        contents = await file.read()
        new_data = StringIO(contents.decode())
        
        # Load and preprocess the user's CSV data
        new_data_grouped = load_and_preprocess_data(new_data)
        
        # Validation: Check if data is sufficient
        if len(new_data_grouped) < 2:
            raise HTTPException(
                status_code=400,
                detail="CSV must contain at least 2 valid data points for training"
            )
        
        print(f"DEBUG TRAIN: df shape = {new_data_grouped.shape}")
        print(f"DEBUG TRAIN: date range = {new_data_grouped['ds'].min()} to {new_data_grouped['ds'].max()}")
        
        # Train NEW Prophet model on THIS user's data ONLY
        model = train_model(new_data_grouped)
        
        # Save the trained model to database for this user (UPSERT) if user_id provided
        model_saved = False
        if user_id:
            save_user_model_to_db(user_id, model)
            model_saved = True
        else:
            print("WARNING: No user_id provided. Model trained but NOT saved to database.")
        
        # Generate predictions for the next 30 days
        last_date = new_data_grouped['ds'].max()
        future_dates = pd.date_range(start=last_date, periods=30, freq='D')[1:]
        future_df = pd.DataFrame({'ds': future_dates})
        
        forecast = model.predict(future_df)
        predictions = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        predictions['ds'] = predictions['ds'].astype(str)
        
        print(f"DEBUG TRAIN: Generated {len(predictions)} predictions")
        
        response = {
            "predictions": predictions.to_dict(orient='records'),
            "model_saved": model_saved,
            "training_data_points": len(new_data_grouped),
            "message": f"Model trained successfully" + (f" and saved for user {user_id}" if model_saved else " (not saved - no user_id)")
        }
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error processing CSV: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process CSV: {str(e)}"
        )

@app.get("/api/predictions/{user_id}")
async def get_predictions(user_id: str, days: int = 30):
    """
    Generate expense predictions for a user based on their trained model.
    
    STRICT REQUIREMENT: User MUST have uploaded a CSV and trained a model first.
    Returns predictions for the specified number of days (default 30).
    """
    try:
        print(f"DEBUG PREDICT: user_id = {user_id}, days = {days}")
        
        # STRICT CHECK: Load user's model from database
        # This will raise 404 if no model exists
        model = load_user_model_from_db(user_id)
        
        # Generate future dates starting from today
        future_dates = pd.date_range(start=pd.Timestamp.today(), periods=days, freq='D')
        future_df = pd.DataFrame({'ds': future_dates})
        
        # Generate predictions
        forecast = model.predict(future_df)
        
        print(f"DEBUG PREDICT: Generated {len(forecast)} predictions")
        print(f"DEBUG PREDICT: forecast head = {forecast[['ds', 'yhat']].head(3).to_dict('records')}")
        
        # Format predictions
        predictions = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
        predictions['ds'] = predictions['ds'].astype(str)
        
        return {
            "user_id": user_id,
            "predictions": predictions.to_dict(orient='records'),
            "horizon_days": days,
            "generated_at": pd.Timestamp.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate predictions: {str(e)}"
        )

@app.post("/api/budget/distribute", response_model=BudgetResponse)
async def distribute_budget_endpoint(request: BudgetRequest):
    """
    Smart budget distribution using Prophet forecasting.
    
    STRICT REQUIREMENT: User MUST have uploaded a CSV and trained a model first.
    Budget allocation is based ENTIRELY on the user's forecast predictions.
    """
    try:
        print(f"DEBUG BUDGET: user_id = {request.user_id}, budget = {request.budget_amount}")
        
        # STRICT CHECK: Load user's model from database
        # This will raise 404 if no model exists
        model = load_user_model_from_db(request.user_id)
        
        # Generate forecast for the budget period (30 days)
        # Parse period (YYYY-MM) and create date range
        period_year = int(request.period[:4])
        period_month = int(request.period[5:7])
        
        # Create future dates for the period
        start_date = pd.Timestamp(year=period_year, month=period_month, day=1)
        # Get days in month
        if period_month == 12:
            end_date = pd.Timestamp(year=period_year + 1, month=1, day=1) - pd.Timedelta(days=1)
        else:
            end_date = pd.Timestamp(year=period_year, month=period_month + 1, day=1) - pd.Timedelta(days=1)
        
        future_dates = pd.date_range(start=start_date, end=end_date, freq='D')
        future_df = pd.DataFrame({'ds': future_dates})
        
        # Generate forecast using user's model
        forecast = model.predict(future_df)
        print(f"DEBUG BUDGET: forecast generated for {len(forecast)} days")
        print(f"DEBUG BUDGET: forecast head = {forecast[['ds', 'yhat']].head(3).to_dict('records')}")
        
        # Extract preferences
        preferences = request.preferences or {}
        savings_percent = preferences.get('savings_percent', 10.0)
        min_reserve = preferences.get('min_reserve', 500.0)
        
        # Call budget distribution logic with model and forecast
        result = distribute_budget(
            user_id=request.user_id,
            budget_amount=request.budget_amount,
            period=request.period,
            use_forecast=request.use_forecast,
            savings_percent=savings_percent,
            min_reserve=min_reserve,
            model=model,  # Pass the loaded model
            forecast_df=forecast  # Pass the forecast
        )
        
        return BudgetResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Budget distribution error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"message": f"Budget distribution failed: {str(e)}"}
        )

@app.post("/api/budget/set")
async def set_budget_endpoint(request: SetBudgetRequest):
    """
    Set user's budget amount
    """
    try:
        user_id = int(request.user_id)
        budget = create_budget(user_id, request.amount, request.period)
        return {"success": True, "budget": budget}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to set budget: {str(e)}"}
        )

@app.get("/api/budget/get/{user_id}/{period}")
async def get_budget_endpoint(user_id: str, period: str):
    """
    Get user's budget for a period
    """
    try:
        budget = get_user_budget(int(user_id), period)
        if not budget:
            return {"success": False, "budget": None}
        return {"success": True, "budget": budget}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get budget: {str(e)}"}
        )

@app.post("/api/expenses/add", response_model=ExpenseResponse)
async def add_expense_endpoint(request: AddExpenseRequest):
    """
    Add a new expense with budget validation.
    Checks if adding this expense would exceed the user's budget for the period.
    """
    try:
        user_id = int(request.user_id)
        
        # Extract period from expense date (YYYY-MM)
        expense_period = request.date[:7]  # Get YYYY-MM from YYYY-MM-DD
        
        # Get user's budget for this period
        budget = get_user_budget(user_id, expense_period)
        
        if budget:
            # Get expenses added AFTER the current budget was set
            # This ensures we only count expenses against the current budget amount
            budget_created = budget.get('created_at', '1970-01-01')
            
            # Get all expenses for this period that were created after budget was set
            period_start = f"{expense_period}-01"
            year, month = map(int, expense_period.split('-'))
            if month == 12:
                period_end = f"{year + 1}-01-01"
            else:
                period_end = f"{year}-{month + 1:02d}-01"
            
            all_expenses = get_user_expenses(user_id, period_start, period_end)
            
            # Only count expenses created after the budget was set/updated
            relevant_expenses = [
                exp for exp in all_expenses 
                if exp.get('created_at', '9999-12-31') >= budget_created
            ]
            
            # Calculate total spent since budget was set
            total_spent = sum(exp['amount'] for exp in relevant_expenses)
            
            # Calculate what total would be after adding this expense
            new_total = total_spent + request.amount
            
            # Check if it exceeds budget
            if new_total > budget['amount']:
                remaining = budget['amount'] - total_spent
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": f"Budget exceeded! You have ${remaining:.2f} remaining out of ${budget['amount']:.2f} budget for {expense_period}. This ${request.amount:.2f} expense would exceed your budget by ${new_total - budget['amount']:.2f}.",
                        "budget_exceeded": True,
                        "budget_amount": budget['amount'],
                        "total_spent": total_spent,
                        "remaining": remaining,
                        "attempted_amount": request.amount,
                        "would_exceed_by": new_total - budget['amount']
                    }
                )
        
        # Budget check passed or no budget set - create expense
        expense = create_expense(
            user_id=user_id,
            category=request.category,
            amount=request.amount,
            description=request.description,
            date=request.date
        )
        
        return ExpenseResponse(
            id=expense['id'],
            user_id=str(expense['user_id']),
            category=expense['category'],
            amount=expense['amount'],
            description=expense['description'],
            date=expense['date']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to add expense: {str(e)}"}
        )

@app.post("/api/expenses/upload-receipt")
async def upload_receipt_endpoint(file: UploadFile = File(...)):
    """
    Upload a receipt image and extract expense data using OCR
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail={"message": "Only image files are allowed"}
            )
        
        # Read image bytes
        image_bytes = await file.read()
        
        # Process receipt with OCR
        result = process_receipt(image_bytes)
        
        if not result['success']:
            raise HTTPException(
                status_code=400,
                detail={"message": result.get('error', 'Failed to process receipt')}
            )
        
        # Return extracted data for frontend review
        return {
            "success": True,
            "data": result['data']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to process receipt: {str(e)}"}
        )

@app.get("/api/expenses/list/{user_id}")
async def list_expenses_endpoint(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Get user's expenses
    """
    try:
        expenses = get_user_expenses(int(user_id), start_date, end_date)
        return {"success": True, "expenses": expenses}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get expenses: {str(e)}"}
        )

@app.get("/api/expenses/stats/{user_id}", response_model=ExpenseStatsResponse)
async def get_expense_stats_endpoint(user_id: str):
    """
    Get expense statistics
    """
    try:
        stats = get_expense_stats(int(user_id))
        return ExpenseStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get stats: {str(e)}"}
        )

@app.delete("/api/expenses/delete/{expense_id}")
async def delete_expense_endpoint(expense_id: int):
    """
    Delete an expense
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if expense exists
        cursor.execute('SELECT id FROM expenses WHERE id = ?', (expense_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail={"message": "Expense not found"})
        
        # Delete the expense
        cursor.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Expense deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to delete expense: {str(e)}"}
        )

# Split expense endpoints
@app.post("/api/split/groups/create")
async def create_group(request: CreateGroupRequest):
    """Create a new split group"""
    try:
        members_list = [member.dict() for member in request.members]
        group = create_split_group(
            name=request.name,
            description=request.description or "",
            created_by=request.created_by,
            members=members_list
        )
        return {"success": True, "group": group}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to create group: {str(e)}"}
        )

@app.get("/api/split/groups/{user_id}")
async def get_user_groups(user_id: str):
    """Get all groups user is part of"""
    try:
        groups = get_user_split_groups(int(user_id))
        return {"success": True, "groups": groups}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get groups: {str(e)}"}
        )

@app.post("/api/split/expenses/create")
async def create_expense_split(request: CreateSplitExpenseRequest):
    """Create a new split expense"""
    try:
        expense = create_split_expense(
            group_id=request.group_id,
            amount=request.amount,
            description=request.description,
            paid_by=request.paid_by,
            date=request.date,
            member_ids=request.member_ids
        )
        return {"success": True, "expense": expense}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to create expense: {str(e)}"}
        )

@app.get("/api/split/groups/{group_id}/expenses")
async def get_expenses_for_group(group_id: str):
    """Get all expenses for a group"""
    try:
        expenses = get_group_expenses(int(group_id))
        return {"success": True, "expenses": expenses}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get expenses: {str(e)}"}
        )

@app.get("/api/split/groups/{group_id}/members")
async def get_members_for_group(group_id: str):
    """Get all members of a group"""
    try:
        members = get_group_members(int(group_id))
        return {"success": True, "members": members}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get members: {str(e)}"}
        )

@app.get("/api/split/balance/{user_id}/{group_id}")
async def get_balance(user_id: str, group_id: str):
    """Get user's balance in a group"""
    try:
        balance = get_user_balance_in_group(int(user_id), int(group_id))
        return {"success": True, "balance": balance}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get balance: {str(e)}"}
        )

@app.post("/api/split/mark-paid")
async def mark_paid(request: MarkPaidRequest):
    """Mark a share as paid (only creator)"""
    try:
        success = mark_share_as_paid(request.share_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to mark as paid: {str(e)}"}
        )

# Direct split expense endpoints (email-based system)
@app.post("/api/splits/create")
async def create_direct_split(request: CreateDirectSplitRequest):
    """
    Create a new split expense using member email addresses
    
    Flow:
    1. Validates that member_emails are provided
    2. Looks up user_id for each email (returns error for non-existent users)
    3. Creates SplitExpense parent record
    4. Creates equal SplitShare for each member (total_amount / member_count)
    5. All shares start with status="PENDING"
    6. Placeholder for email notifications
    
    Returns:
        - split_expense_id
        - shares_created (list of share details)
        - not_found_emails (emails that don't have accounts)
    """
    try:
        result = create_split_expense_direct(
            created_by_user_id=request.created_by_user_id,
            total_amount=request.total_amount,
            description=request.description,
            member_emails=request.member_emails
        )
        
        # Send notifications after database transaction completes
        if '_notif_data' in result:
            notif_data = result['_notif_data']
            creator_name = notif_data['creator_name']
            
            for user_id in notif_data['member_ids']:
                try:
                    create_notification(
                        user_id=user_id,
                        notif_type="split_created",
                        title="New Split Bill",
                        message=f"{creator_name} added you to a split: {notif_data['description']}. Your share: ${notif_data['share_amount']:.2f}",
                        related_id=notif_data['split_expense_id']
                    )
                except Exception as notif_err:
                    print(f"⚠️  Notification failed for user {user_id}: {str(notif_err)}")
            
            # Remove internal data before returning
            del result['_notif_data']
        
        return {
            "success": True,
            "split_expense_id": result['split_expense_id'],
            "total_amount": result['total_amount'],
            "description": result['description'],
            "share_amount": result['share_amount'],
            "member_count": result['member_count'],
            "shares_created": result['shares_created'],
            "not_found_emails": result['not_found_emails'],
            "message": f"Split created with {result['member_count']} members. Each owes ${result['share_amount']:.2f}"
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to create split: {str(e)}"}
        )

@app.get("/api/splits/me/{user_id}", response_model=UserSplitsResponse)
async def get_my_splits(user_id: str):
    """
    Get all split shares for the current user
    
    Returns splits where user is either:
    - The creator (created_by_user_id matches)
    - A member (has a share in the split)
    
    Each split includes:
    - share_id, split_expense_id
    - amount, status (PENDING/PAID/CONFIRMED)
    - creator details (name, email)
    - description
    - timestamps (created_at, paid_at, confirmed_at)
    - is_creator flag
    """
    try:
        splits = get_user_splits(int(user_id))
        
        return {
            "splits": splits,
            "count": len(splits)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get splits: {str(e)}"}
        )

@app.post("/api/splits/{split_share_id}/mark-paid")
async def mark_split_as_paid(split_share_id: int, request: MarkSplitPaidRequest):
    """
    Member marks their own split share as PAID
    
    Requirements:
    - Current user must be the owner of this share (user_id matches)
    - Share status must be "PENDING"
    
    Flow:
    - Updates status from PENDING → PAID
    - Sets paid_at timestamp
    - Notifies creator (placeholder)
    
    After this, creator can confirm the payment.
    """
    try:
        result = mark_split_share_paid(
            share_id=split_share_id,
            user_id=request.user_id
        )
        
        return {
            "success": True,
            "message": result['message'],
            "share": result['share']
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to mark as paid: {str(e)}"}
        )

@app.post("/api/splits/{split_share_id}/confirm")
async def confirm_split_payment(split_share_id: int, request: ConfirmSplitPaymentRequest):
    """
    Creator confirms a member's payment
    
    Requirements:
    - Current user must be the creator (created_by_user_id matches)
    - Share status must be "PAID"
    
    Flow:
    - Updates status from PAID → CONFIRMED
    - Sets confirmed_at timestamp
    - Notifies member (placeholder)
    
    This is the final step in the split payment flow.
    """
    try:
        result = confirm_split_share_payment(
            share_id=split_share_id,
            user_id=request.user_id
        )
        
        return {
            "success": True,
            "message": result['message'],
            "share": result['share']
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to confirm payment: {str(e)}"}
        )

@app.get("/api/splits/expense/{split_expense_id}")
async def get_split_expense_details(split_expense_id: int):
    """
    Get full details of a split expense including all shares and their statuses
    
    Useful for:
    - Creator viewing who has paid
    - Viewing complete split breakdown
    - Checking overall status
    
    Returns:
    - Split expense details
    - All shares with member info
    - Status counts (pending/paid/confirmed)
    - all_confirmed flag
    """
    try:
        summary = get_split_expense_summary(split_expense_id)
        
        if not summary:
            raise HTTPException(
                status_code=404,
                detail={"message": "Split expense not found"}
            )
        
        return {
            "success": True,
            "split_expense": summary
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get split expense: {str(e)}"}
        )

@app.get("/api/forecast/spending/{user_id}")
async def forecast_spending(user_id: str, days: int = 30):
    """
    Forecast future spending using Prophet ML
    Uses user's personalized model if available, otherwise trains on-the-fly
    """
    try:
        # Get historical expenses
        expenses = get_user_expenses(int(user_id))
        
        if len(expenses) < 7:
            return {
                "success": False,
                "message": "Need at least 7 days of expense data for accurate predictions",
                "forecast": []
            }
        
        # Prepare data for Prophet
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        
        # Aggregate by date
        daily_spending = df.groupby('date')['amount'].sum().reset_index()
        daily_spending.columns = ['ds', 'y']
        
        # Fill missing dates with 0
        date_range = pd.date_range(start=daily_spending['ds'].min(), end=daily_spending['ds'].max())
        daily_spending = daily_spending.set_index('ds').reindex(date_range, fill_value=0).reset_index()
        daily_spending.columns = ['ds', 'y']
        
        # Try to load user's personalized model
        model = None
        model_source = "trained_on_the_fly"
        user_model_data = get_user_model(int(user_id))
        
        if user_model_data and user_model_data['training_data_points'] >= 10:
            try:
                model = pickle.loads(user_model_data['model_data'])
                model_source = f"personalized_model_trained_{user_model_data['last_trained']}"
                print(f"✅ Using personalized model for user {user_id}")
            except Exception as e:
                print(f"⚠️ Failed to load personalized model: {e}")
        
        # Train new model if personalized one not available
        if model is None:
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=False,
                changepoint_prior_scale=0.05
            )
            model.fit(daily_spending)
            
            # Save this model for future use
            model_bytes = pickle.dumps(model)
            save_user_model(int(user_id), model_bytes, len(daily_spending))
            print(f"✅ Trained and saved new model for user {user_id}")
        
        # Make future predictions
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)
        
        # Get only future predictions
        future_forecast = forecast.tail(days)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
        future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)
        future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(lower=0)
        future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(lower=0)
        
        forecast_data = [
            {
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted': round(row['yhat'], 2),
                'lower': round(row['yhat_lower'], 2),
                'upper': round(row['yhat_upper'], 2)
            }
            for _, row in future_forecast.iterrows()
        ]
        
        # Calculate summary statistics
        total_predicted = round(future_forecast['yhat'].sum(), 2)
        daily_average = round(future_forecast['yhat'].mean(), 2)
        
        return {
            "success": True,
            "forecast": forecast_data,
            "summary": {
                "total_predicted": total_predicted,
                "daily_average": daily_average,
                "period_days": days,
                "confidence": "medium" if len(expenses) < 30 else "high",
                "model_source": model_source
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to generate forecast: {str(e)}"}
        )

@app.get("/api/forecast/category/{user_id}")
async def forecast_by_category(user_id: str, days: int = 30):
    """
    Forecast spending by category using Prophet ML
    """
    try:
        # Get historical expenses
        expenses = get_user_expenses(int(user_id))
        
        if len(expenses) < 7:
            return {
                "success": False,
                "message": "Need at least 7 days of expense data for accurate predictions",
                "forecasts": {}
            }
        
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        
        categories = df['category'].unique()
        category_forecasts = {}
        
        for category in categories:
            category_data = df[df['category'] == category]
            
            if len(category_data) < 3:
                continue
            
            # Aggregate by date for this category
            daily_spending = category_data.groupby('date')['amount'].sum().reset_index()
            daily_spending.columns = ['ds', 'y']
            
            # Fill missing dates with 0
            date_range = pd.date_range(start=daily_spending['ds'].min(), end=daily_spending['ds'].max())
            daily_spending = daily_spending.set_index('ds').reindex(date_range, fill_value=0).reset_index()
            daily_spending.columns = ['ds', 'y']
            
            try:
                # Train Prophet model
                model = Prophet(
                    daily_seasonality=False,
                    weekly_seasonality=True,
                    yearly_seasonality=False,
                    changepoint_prior_scale=0.05
                )
                model.fit(daily_spending)
                
                # Make predictions
                future = model.make_future_dataframe(periods=days)
                forecast = model.predict(future)
                
                # Calculate prediction
                future_forecast = forecast.tail(days)['yhat'].clip(lower=0)
                total_predicted = round(future_forecast.sum(), 2)
                
                category_forecasts[category] = {
                    'predicted_total': total_predicted,
                    'daily_average': round(future_forecast.mean(), 2),
                    'trend': 'increasing' if forecast['trend'].iloc[-1] > forecast['trend'].iloc[-days] else 'decreasing'
                }
            except Exception as e:
                print(f"Error forecasting {category}: {str(e)}")
                continue
        
        return {
            "success": True,
            "forecasts": category_forecasts,
            "period_days": days
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to generate category forecasts: {str(e)}"}
        )

@app.get("/api/insights/anomalies/{user_id}")
async def detect_anomalies(user_id: str):
    """
    Detect unusual spending patterns
    """
    try:
        expenses = get_user_expenses(int(user_id))
        
        if len(expenses) < 7:
            return {
                "success": False,
                "message": "Need more data to detect anomalies",
                "anomalies": []
            }
        
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        
        # Calculate daily spending
        daily_spending = df.groupby('date')['amount'].sum().reset_index()
        
        # Calculate statistics
        mean_spending = daily_spending['amount'].mean()
        std_spending = daily_spending['amount'].std()
        threshold = mean_spending + (2 * std_spending)
        
        # Find anomalies
        anomalies = daily_spending[daily_spending['amount'] > threshold]
        
        anomaly_data = [
            {
                'date': row['date'].strftime('%Y-%m-%d'),
                'amount': round(row['amount'], 2),
                'deviation': round(((row['amount'] - mean_spending) / mean_spending) * 100, 1),
                'severity': 'high' if row['amount'] > (mean_spending + 3 * std_spending) else 'medium'
            }
            for _, row in anomalies.iterrows()
        ]
        
        return {
            "success": True,
            "anomalies": anomaly_data,
            "baseline": {
                "average_daily": round(mean_spending, 2),
                "threshold": round(threshold, 2)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to detect anomalies: {str(e)}"}
        )

@app.get("/api/insights/trends/{user_id}")
async def analyze_trends(user_id: str):
    """
    Simple spending insights based on budget and actual spending
    """
    try:
        expenses = get_user_expenses(int(user_id))
        
        if len(expenses) < 7:
            return {
                "success": False,
                "message": "Need at least 1 week of data",
                "insights": []
            }
        
        # Get user's current budget
        current_period = datetime.now().strftime("%Y-%m")
        budget = get_user_budget(int(user_id), current_period)
        
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        
        insights = []
        
        # 1. Budget Status - Simple and clear
        if budget:
            total_spent = df['amount'].sum()
            budget_amount = budget['amount']
            remaining = budget_amount - total_spent
            percentage = (total_spent / budget_amount) * 100
            
            if percentage >= 90:
                insights.append({
                    'type': 'budget_alert',
                    'message': f'Budget Alert: {round(percentage)}% used',
                    'tip': f'You spent ₹{round(total_spent)} out of ₹{round(budget_amount)} budget. Only ₹{round(remaining)} left. Stop unnecessary spending!',
                    'savings_potential': 0
                })
            elif percentage >= 75:
                insights.append({
                    'type': 'budget_warning',
                    'message': f'Budget Status: {round(percentage)}% used',
                    'tip': f'You have ₹{round(remaining)} left out of ₹{round(budget_amount)}. Spend carefully for rest of the month!',
                    'savings_potential': 0
                })
            else:
                insights.append({
                    'type': 'budget_good',
                    'message': f'Good Job! Only {round(percentage)}% used',
                    'tip': f'You spent ₹{round(total_spent)} and have ₹{round(remaining)} left. Keep it up!',
                    'savings_potential': 0
                })
        
        # 2. Top Spending Category - Simple comparison
        category_spending = df.groupby('category')['amount'].sum().sort_values(ascending=False)
        total = category_spending.sum()
        
        if len(category_spending) > 0:
            top_category = category_spending.index[0]
            top_amount = category_spending.iloc[0]
            percentage = (top_amount / total) * 100
            
            insights.append({
                'type': 'top_category',
                'message': f'Highest Spending: {top_category}',
                'tip': f'You spent ₹{round(top_amount)} on {top_category}. This is {round(percentage)}% of all expenses. Try to reduce by ₹{round(top_amount * 0.1)}!',
                'savings_potential': round(top_amount * 0.1, 2)
            })
        
        # 3. Daily Average - Simple calculation
        days_count = (df['date'].max() - df['date'].min()).days + 1
        daily_avg = total / days_count
        
        if budget:
            daily_budget = budget_amount / 30
            if daily_avg > daily_budget:
                excess = daily_avg - daily_budget
                insights.append({
                    'type': 'daily_spending',
                    'message': f'Daily Average: ₹{round(daily_avg)}',
                    'tip': f'Your daily budget should be ₹{round(daily_budget)}. You are spending ₹{round(excess)} extra per day. Reduce small expenses!',
                    'savings_potential': round(excess * 30, 2)
                })
            else:
                insights.append({
                    'type': 'daily_good',
                    'message': f'Great! Daily Average: ₹{round(daily_avg)}',
                    'tip': f'Your daily spending is under control. Daily budget is ₹{round(daily_budget)}. Keep it up!',
                    'savings_potential': 0
                })
        
        # 4. This Week vs Last Week - Simple comparison
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        two_weeks_ago = today - timedelta(days=14)
        
        this_week = df[df['date'].dt.date >= week_ago]['amount'].sum()
        last_week = df[(df['date'].dt.date >= two_weeks_ago) & (df['date'].dt.date < week_ago)]['amount'].sum()
        
        if last_week > 0:
            if this_week > last_week:
                diff = this_week - last_week
                insights.append({
                    'type': 'week_increase',
                    'message': f'This Week: ₹{round(this_week)} (up from ₹{round(last_week)})',
                    'tip': f'You spent ₹{round(diff)} more this week! Try to match last week\'s spending next week.',
                    'savings_potential': round(diff, 2)
                })
            else:
                diff = last_week - this_week
                insights.append({
                    'type': 'week_decrease',
                    'message': f'Excellent! This Week: ₹{round(this_week)}',
                    'tip': f'You saved ₹{round(diff)} compared to last week! Keep this going!',
                    'savings_potential': 0
                })
        
        # Add a simple tip if we have less than 3 insights
        if len(insights) < 3:
            insights.append({
                'type': 'savings_tip',
                'message': 'Simple Savings Tip',
                'tip': 'Save 10% of your income every month. Start with small amounts - even ₹100/day = ₹3000/month!',
                'savings_potential': round(total * 0.1, 2)
            })
        
        return {
            "success": True,
            "insights": insights[:5],  # Show only top 5 insights
            "statistics": {
                'total_spent': round(total, 2),
                'days_tracked': days_count,
                'daily_average': round(daily_avg, 2)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get insights: {str(e)}"}
        )

@app.get("/api/model/status/{user_id}")
async def get_model_status(user_id: str):
    """
    Get the status of a user's personalized Prophet model
    """
    try:
        user_model = get_user_model(int(user_id))
        
        if user_model:
            return {
                "success": True,
                "has_model": True,
                "training_data_points": user_model['training_data_points'],
                "last_trained": user_model['last_trained'],
                "model_version": user_model['model_version']
            }
        else:
            return {
                "success": True,
                "has_model": False,
                "message": "No personalized model found. Upload CSV or add expenses to train one."
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to get model status: {str(e)}"}
        )

@app.post("/api/model/retrain/{user_id}")
async def retrain_model(user_id: str):
    """
    Retrain a user's Prophet model using their current expense data
    Useful when user has added significant new expenses
    """
    try:
        # Get all user expenses
        expenses = get_user_expenses(int(user_id))
        
        if len(expenses) < 10:
            return {
                "success": False,
                "message": "Need at least 10 expense records to train a model"
            }
        
        # Prepare data
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        daily_spending = df.groupby('date')['amount'].sum().reset_index()
        daily_spending.columns = ['ds', 'y']
        
        # Fill missing dates
        date_range = pd.date_range(start=daily_spending['ds'].min(), end=daily_spending['ds'].max())
        daily_spending = daily_spending.set_index('ds').reindex(date_range, fill_value=0).reset_index()
        daily_spending.columns = ['ds', 'y']
        
        # Train new Prophet model
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05
        )
        model.fit(daily_spending)
        
        # Save model
        model_bytes = pickle.dumps(model)
        success = save_user_model(int(user_id), model_bytes, len(daily_spending))
        
        if success:
            return {
                "success": True,
                "message": f"Model retrained successfully with {len(daily_spending)} data points",
                "training_data_points": len(daily_spending),
                "expenses_count": len(expenses)
            }
        else:
            raise Exception("Failed to save retrained model")
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to retrain model: {str(e)}"}
        )

@app.delete("/api/model/delete/{user_id}")
async def delete_model(user_id: str):
    """
    Delete a user's personalized model
    Model will be retrained on next forecast request
    """
    try:
        success = delete_user_model(int(user_id))
        
        if success:
            return {
                "success": True,
                "message": "Model deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": "No model found to delete"
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to delete model: {str(e)}"}
        )

# ===================== NOTIFICATIONS ENDPOINTS =====================

@app.get("/api/notifications/{user_id}")
async def get_notifications(user_id: str, unread_only: bool = False):
    """
    Get all notifications for a user.
    
    Query params:
    - unread_only: if True, return only unread notifications
    """
    try:
        notifications = get_user_notifications_list(int(user_id), unread_only)
        return {
            "success": True,
            "notifications": notifications,
            "count": len(notifications)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to fetch notifications: {str(e)}"}
        )

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_as_read(notification_id: int):
    """
    Mark a single notification as read.
    """
    try:
        success = mark_notification_read(notification_id)
        
        if success:
            return {
                "success": True,
                "message": "Notification marked as read"
            }
        else:
            return {
                "success": False,
                "message": "Notification not found"
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to mark notification as read: {str(e)}"}
        )

@app.post("/api/notifications/{user_id}/read-all")
async def mark_all_notifications_as_read(user_id: str):
    """
    Mark all notifications for a user as read.
    """
    try:
        count = mark_all_notifications_read(int(user_id))
        return {
            "success": True,
            "message": f"Marked {count} notification(s) as read",
            "count": count
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to mark notifications as read: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)