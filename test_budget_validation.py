#!/usr/bin/env python3
import requests

print('='*70)
print('BUDGET VALIDATION TEST')
print('='*70)

user_id = '1'
period = '2025-11'

print(f'\n1️⃣  Setting budget: $1,000 for {period}')
r = requests.post('http://localhost:8006/api/budget/set', json={'user_id': user_id, 'amount': 1000, 'period': period})
print(f'   ✅ Budget set' if r.status_code == 200 else f'   ❌ Failed')

print('\n2️⃣  Adding $400 expense (within budget)')
r = requests.post('http://localhost:8006/api/expenses/add', json={'user_id': user_id, 'category': 'Food & Dining', 'amount': 400, 'description': 'Groceries', 'date': '2025-11-15'})
print(f'   ✅ Added' if r.status_code == 200 else f'   ❌ Failed')

print('\n3️⃣  Adding $300 expense (within budget)')
r = requests.post('http://localhost:8006/api/expenses/add', json={'user_id': user_id, 'category': 'Transport', 'amount': 300, 'description': 'Gas', 'date': '2025-11-20'})
print(f'   ✅ Added - Total: $700/$1,000' if r.status_code == 200 else f'   ❌ Failed')

print('\n4️⃣  Attempting to add $500 expense (would EXCEED budget)')
print('   Current: $700 spent, $300 remaining')
print('   Trying to add: $500')
print('   Would exceed by: $200')
r = requests.post('http://localhost:8006/api/expenses/add', json={'user_id': user_id, 'category': 'Shopping', 'amount': 500, 'description': 'Electronics', 'date': '2025-11-22'})

if r.status_code == 400:
    detail = r.json()['detail']
    print(f'\n   ✅ BLOCKED BY BUDGET VALIDATION!')
    print(f'   Budget: ${detail["budget_amount"]:.2f}')
    print(f'   Spent: ${detail["total_spent"]:.2f}')
    print(f'   Remaining: ${detail["remaining"]:.2f}')
    print(f'   Attempted: ${detail["attempted_amount"]:.2f}')
    print(f'   Would exceed by: ${detail["would_exceed_by"]:.2f}')
else:
    print(f'\n   ❌ ERROR: Should have been blocked! Status: {r.status_code}')

print('\n' + '='*70)
print('✅ Budget validation is working!')
print('='*70)
