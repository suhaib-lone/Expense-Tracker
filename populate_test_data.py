#!/usr/bin/env python3
"""
Populate test expenses for insights to work
"""
import requests
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:8006"
user_id = "1"

categories = [
    "Food & Dining",
    "Transport",
    "Bills & Utilities",
    "Shopping",
    "Entertainment",
    "Healthcare"
]

print("="*70)
print("POPULATING TEST EXPENSES FOR INSIGHTS")
print("="*70)

# Create expenses for the past 30 days
start_date = datetime.now() - timedelta(days=30)
expenses_added = 0

for i in range(30):
    date = start_date + timedelta(days=i)
    date_str = date.strftime('%Y-%m-%d')
    
    # Add 1-3 expenses per day
    num_expenses = random.randint(1, 3)
    
    for _ in range(num_expenses):
        category = random.choice(categories)
        amount = round(random.uniform(10, 150), 2)
        
        try:
            r = requests.post(f"{BASE_URL}/api/expenses/add", json={
                "user_id": user_id,
                "category": category,
                "amount": amount,
                "description": f"Test expense - {category}",
                "date": date_str
            })
            
            if r.status_code == 200:
                expenses_added += 1
                print(f"✅ {date_str}: ${amount:6.2f} - {category}")
            elif r.status_code == 400 and "budget_exceeded" in r.text:
                print(f"⚠️  {date_str}: ${amount:6.2f} - Budget exceeded, skipping")
            else:
                print(f"❌ {date_str}: Failed - {r.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")

print(f"\n✅ Added {expenses_added} test expenses")
print("="*70)

# Test insights endpoints
print("\nTesting Insights Endpoints:")
print("="*70)

print("\n1️⃣  Spending Forecast:")
r = requests.get(f"{BASE_URL}/api/forecast/spending/{user_id}?days=7")
if r.status_code == 200:
    data = r.json()
    print(f"   ✅ Success: {len(data.get('forecast', []))} days forecasted")
    print(f"   Total predicted: ${data['summary']['total_predicted']:.2f}")
else:
    print(f"   ❌ Failed: {r.json().get('message', 'Unknown error')}")

print("\n2️⃣  Anomaly Detection:")
r = requests.get(f"{BASE_URL}/api/insights/anomalies/{user_id}")
if r.status_code == 200:
    data = r.json()
    print(f"   ✅ Success: {len(data.get('anomalies', []))} anomalies detected")
else:
    print(f"   ❌ Failed: {r.json().get('message', 'Unknown error')}")

print("\n3️⃣  Trends Analysis:")
r = requests.get(f"{BASE_URL}/api/insights/trends/{user_id}")
if r.status_code == 200:
    data = r.json()
    print(f"   ✅ Success: {len(data.get('insights', []))} insights generated")
    for insight in data.get('insights', [])[:3]:
        print(f"      - {insight['message']}")
else:
    print(f"   ❌ Failed: {r.json().get('message', 'Unknown error')}")

print("\n" + "="*70)
