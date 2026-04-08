#!/usr/bin/env python3
"""
Test script to demonstrate strict per-user model + budget logic

This script tests:
1. Budget allocation WITHOUT a model (should fail with 404)
2. CSV upload to train a model
3. Budget allocation WITH a model (should succeed with forecast-based allocation)
4. Predictions endpoint (should work after model is trained)
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8006"

def print_separator():
    print("\n" + "="*80 + "\n")

def test_budget_without_model(user_id: str):
    """Test that budget allocation fails when no model exists"""
    print("TEST 1: Budget allocation WITHOUT trained model (should FAIL)")
    print_separator()
    
    url = f"{BASE_URL}/api/budget/distribute"
    payload = {
        "user_id": user_id,
        "budget_amount": 10000,
        "period": "2025-12",
        "use_forecast": True
    }
    
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 404:
        print("\n✅ CORRECT: Budget allocation blocked without model!")
    else:
        print("\n❌ ERROR: Budget allocation should have failed!")
    
    return response.status_code == 404

def test_predictions_without_model(user_id: str):
    """Test that predictions fail when no model exists"""
    print("TEST 2: Predictions WITHOUT trained model (should FAIL)")
    print_separator()
    
    url = f"{BASE_URL}/api/predictions/{user_id}"
    
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 404:
        print("\n✅ CORRECT: Predictions blocked without model!")
    else:
        print("\n❌ ERROR: Predictions should have failed!")
    
    return response.status_code == 404

def test_csv_upload(user_id: str, csv_path: str):
    """Test CSV upload and model training"""
    print("TEST 3: Upload CSV and train model")
    print_separator()
    
    url = f"{BASE_URL}/upload_csv?user_id={user_id}"
    
    try:
        with open(csv_path, 'rb') as f:
            files = {'file': ('expenses.csv', f, 'text/csv')}
            response = requests.post(url, files=files)
        
        print(f"Status Code: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200 and result.get('model_saved'):
            print(f"\n✅ SUCCESS: Model trained with {result.get('training_data_points')} data points")
            return True
        else:
            print("\n❌ ERROR: Model training failed!")
            return False
    except FileNotFoundError:
        print(f"\n❌ ERROR: CSV file not found: {csv_path}")
        print("Please provide a valid CSV file path")
        return False

def test_budget_with_model(user_id: str):
    """Test that budget allocation succeeds with trained model"""
    print("TEST 4: Budget allocation WITH trained model (should SUCCEED)")
    print_separator()
    
    url = f"{BASE_URL}/api/budget/distribute"
    payload = {
        "user_id": user_id,
        "budget_amount": 10000,
        "period": "2025-12",
        "use_forecast": True,
        "preferences": {
            "savings_percent": 15.0
        }
    }
    
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS: Budget allocated using forecast!")
        print(f"Total allocated: ${sum(a['amount'] for a in result['allocations']):.2f}")
        return True
    else:
        print("\n❌ ERROR: Budget allocation failed!")
        return False

def test_predictions_with_model(user_id: str):
    """Test that predictions work with trained model"""
    print("TEST 5: Predictions WITH trained model (should SUCCEED)")
    print_separator()
    
    url = f"{BASE_URL}/api/predictions/{user_id}?days=7"
    
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    result = response.json()
    
    if response.status_code == 200:
        print(f"Generated {len(result['predictions'])} predictions")
        print(f"First 3 predictions:")
        for pred in result['predictions'][:3]:
            print(f"  {pred['ds']}: ${pred['yhat']:.2f}")
        print("\n✅ SUCCESS: Predictions generated!")
        return True
    else:
        print(f"Response: {json.dumps(result, indent=2)}")
        print("\n❌ ERROR: Predictions failed!")
        return False

def main():
    print("\n" + "="*80)
    print("PER-USER MODEL + BUDGET LOGIC TEST SUITE")
    print("="*80)
    
    # Configuration
    user_id = "999"  # Test user ID
    csv_path = "../data/expenses.csv"  # Adjust path as needed
    
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
    if len(sys.argv) > 2:
        csv_path = sys.argv[2]
    
    print(f"\nConfiguration:")
    print(f"  User ID: {user_id}")
    print(f"  CSV Path: {csv_path}")
    print(f"  API Base URL: {BASE_URL}")
    
    # Run tests
    results = []
    
    # Phase 1: No model (should fail)
    print("\n\nPHASE 1: Testing WITHOUT trained model")
    print("="*80)
    results.append(("Budget without model fails", test_budget_without_model(user_id)))
    results.append(("Predictions without model fails", test_predictions_without_model(user_id)))
    
    # Phase 2: Train model
    print("\n\nPHASE 2: Train model by uploading CSV")
    print("="*80)
    model_trained = test_csv_upload(user_id, csv_path)
    results.append(("CSV upload and model training", model_trained))
    
    if not model_trained:
        print("\n❌ Cannot continue tests without trained model")
        print_results(results)
        return 1
    
    # Phase 3: With model (should succeed)
    print("\n\nPHASE 3: Testing WITH trained model")
    print("="*80)
    results.append(("Budget with model succeeds", test_budget_with_model(user_id)))
    results.append(("Predictions with model succeeds", test_predictions_with_model(user_id)))
    
    # Print summary
    print_results(results)
    
    # Return exit code
    if all(result for _, result in results):
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED")
        return 1

def print_results(results):
    print("\n\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    print("="*80)

if __name__ == "__main__":
    exit(main())
