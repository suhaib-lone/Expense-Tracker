#!/usr/bin/env python3
"""
Clear all user data but keep user accounts
This script deletes:
- All expenses
- All budgets
- All split expenses and related data
- All trained models
- All notifications
But KEEPS:
- User accounts (users table)
"""

import sqlite3
import os
import sys

DB_PATH = 'expense_tracker.db'
MODELS_DIR = '../models'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def count_rows(cursor, table):
    cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
    return cursor.fetchone()['count']

def clear_user_data():
    """Clear all user data but keep user accounts"""
    
    print("\n" + "="*70)
    print("CLEAR USER DATA (Keep User Accounts)")
    print("="*70)
    print(f"\nDatabase: {DB_PATH}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Show counts before deletion
    print("\n📊 Current Data:")
    print("-"*70)
    
    tables_to_clear = [
        'expenses',
        'budgets', 
        'user_models',
        'split_expenses',
        'split_shares',
        'split_groups',
        'split_group_members',
        'group_expenses',
        'group_expense_shares',
        'notifications'
    ]
    
    counts = {}
    for table in tables_to_clear:
        try:
            count = count_rows(cursor, table)
            counts[table] = count
            print(f"   {table:30s}: {count:5d} rows")
        except sqlite3.OperationalError:
            counts[table] = 0
            print(f"   {table:30s}: Table not found")
    
    users_count = count_rows(cursor, 'users')
    print(f"\n   {'users (WILL BE KEPT)':30s}: {users_count:5d} rows")
    
    # Confirmation
    print("\n⚠️  WARNING: This will DELETE all user data but KEEP user accounts!")
    print("-"*70)
    response = input("\nType 'YES' to confirm deletion: ")
    
    if response != 'YES':
        print("\n❌ Operation cancelled.")
        conn.close()
        return
    
    print("\n🔄 Clearing data...")
    print("-"*70)
    
    # Delete data from each table
    deleted = {}
    for table in tables_to_clear:
        try:
            cursor.execute(f"DELETE FROM {table}")
            deleted[table] = counts[table]
            print(f"   ✅ Cleared {counts[table]} rows from '{table}'")
        except sqlite3.OperationalError as e:
            print(f"   ⚠️  Could not clear '{table}': {e}")
    
    # Reset auto-increment counters
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ({})".format(
        ','.join('?' * len(tables_to_clear))
    ), tables_to_clear)
    
    conn.commit()
    print("\n   ✅ Reset auto-increment counters")
    
    # Delete model files
    print("\n🗑️  Deleting model files...")
    print("-"*70)
    
    models_deleted = 0
    if os.path.exists(MODELS_DIR):
        for filename in os.listdir(MODELS_DIR):
            if filename.endswith('_prophet_model.pkl'):
                filepath = os.path.join(MODELS_DIR, filename)
                try:
                    size = os.path.getsize(filepath)
                    os.remove(filepath)
                    models_deleted += 1
                    print(f"   ✅ Deleted {filename} ({size/1024:.1f} KB)")
                except Exception as e:
                    print(f"   ⚠️  Could not delete {filename}: {e}")
    else:
        print(f"   ⚠️  Models directory not found: {MODELS_DIR}")
    
    if models_deleted == 0:
        print("   ℹ️  No model files found")
    
    conn.close()
    
    # Verify deletion
    print("\n✅ VERIFICATION:")
    print("-"*70)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    for table in tables_to_clear:
        try:
            count = count_rows(cursor, table)
            print(f"   {table:30s}: {count:5d} rows (should be 0)")
        except:
            pass
    
    users_count_after = count_rows(cursor, 'users')
    print(f"\n   {'users (KEPT)':30s}: {users_count_after:5d} rows")
    
    conn.close()
    
    print("\n" + "="*70)
    print("✅ DATA CLEARED SUCCESSFULLY!")
    print(f"   - Deleted data from {len(deleted)} tables")
    print(f"   - Deleted {models_deleted} model files")
    print(f"   - Kept {users_count_after} user accounts")
    print("="*70 + "\n")

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"\n❌ Error: Database file not found: {DB_PATH}")
        print("   Please run this script from the Prophet_ directory\n")
        sys.exit(1)
    
    try:
        clear_user_data()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
