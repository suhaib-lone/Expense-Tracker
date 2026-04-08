"""
Database models and operations for user management
Using SQLite with proper password hashing
"""

import sqlite3
import bcrypt
from typing import Optional, Dict, List
from datetime import datetime
import os
import pandas as pd
import time

# Database file path
DB_PATH = os.path.join(os.path.dirname(__file__), 'expense_tracker.db')

def get_db_connection(enable_wal=True):
    """Create and return a database connection with timeout"""
    conn = sqlite3.connect(DB_PATH, timeout=60.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    if enable_wal:
        try:
            conn.execute('PRAGMA journal_mode=WAL')  # Write-Ahead Logging for better concurrency
        except sqlite3.OperationalError:
            pass  # Skip if locked
    conn.execute('PRAGMA busy_timeout=60000')  # 60 second timeout
    return conn

def retry_on_lock(func, max_retries=5, delay=0.2):
    """Retry a database operation if it's locked"""
    last_error = None
    for attempt in range(max_retries):
        try:
            return func()
        except sqlite3.OperationalError as e:
            last_error = e
            if "database is locked" in str(e) and attempt < max_retries - 1:
                time.sleep(delay * (attempt + 1))
                continue
            raise
        except Exception as e:
            raise
    if last_error:
        raise last_error
    return None

def init_database():
    """Initialize the database with required tables"""
    conn = None
    try:
        conn = get_db_connection(enable_wal=False)  # Don't use WAL during init
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create budgets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                period TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create expenses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create user_models table for storing trained Prophet models
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                model_data BLOB NOT NULL,
                training_data_points INTEGER DEFAULT 0,
                last_trained TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                model_version TEXT DEFAULT '1.0',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_models_user ON user_models(user_id)')
        
        # Create split groups table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS split_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_by INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        ''')
        
        # Create split expenses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS split_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                description TEXT NOT NULL,
                paid_by INTEGER NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES split_groups(id),
                FOREIGN KEY (paid_by) REFERENCES users(id)
            )
        ''')
        
        # Create split members table (who's in which group)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS split_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                user_id INTEGER,
                name TEXT NOT NULL,
                phone TEXT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES split_groups(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create split shares table (who owes what)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS split_shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                is_paid BOOLEAN DEFAULT 0,
                paid_at TIMESTAMP,
                FOREIGN KEY (expense_id) REFERENCES split_expenses(id),
                FOREIGN KEY (member_id) REFERENCES split_members(id)
            )
        ''')
        
        # Create indexes for split tables
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_split_groups_creator ON split_groups(created_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_split_expenses_group ON split_expenses(group_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_split_members_group ON split_members(group_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_split_shares_expense ON split_shares(expense_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_split_shares_member ON split_shares(member_id)')
        
        # Create new direct split expense table (email-based splits)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS direct_split_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_by_user_id INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            )
        ''')
        
        # Create new direct split shares table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS direct_split_shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                split_expense_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID', 'CONFIRMED')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP,
                confirmed_at TIMESTAMP,
                FOREIGN KEY (split_expense_id) REFERENCES direct_split_expenses(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create indexes for new direct split tables
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_direct_split_expenses_creator ON direct_split_expenses(created_by_user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_direct_split_shares_expense ON direct_split_shares(split_expense_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_direct_split_shares_user ON direct_split_shares(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_direct_split_shares_status ON direct_split_shares(status)')
        
        # Create notifications table for in-app notifications
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                related_id INTEGER,
                is_read BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)')
    
        conn.commit()
        print(f"✅ Database initialized at: {DB_PATH}")
    except Exception as e:
        print(f"⚠️ Database initialization error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    return password_hash.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_user(name: str, email: str, password: str, phone: Optional[str] = None) -> Dict:
    """
    Create a new user in the database
    Returns user data if successful, raises exception if email exists
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            raise ValueError("Email already exists")
        
        # Hash the password
        password_hash = hash_password(password)
        
        # Insert new user
        cursor.execute('''
            INSERT INTO users (name, email, password_hash, phone)
            VALUES (?, ?, ?, ?)
        ''', (name, email, password_hash, phone))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        # Return user data (without password hash)
        return {
            'id': str(user_id),
            'name': name,
            'email': email,
            'phone': phone
        }
    
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """
    Authenticate a user by email and password
    Returns user data if successful, None if authentication fails
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user by email
        cursor.execute('''
            SELECT id, name, email, password_hash, phone 
            FROM users 
            WHERE email = ?
        ''', (email,))
        
        user = cursor.fetchone()
        
        if not user:
            return None
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            return None
        
        # Return user data (without password hash)
        return {
            'id': str(user['id']),
            'name': user['name'],
            'email': user['email'],
            'phone': user['phone']
        }
    
    finally:
        conn.close()

def get_user_by_id(user_id: int) -> Optional[Dict]:
    """Get user by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, name, email, phone, created_at
            FROM users 
            WHERE id = ?
        ''', (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            return None
        
        return {
            'id': str(user['id']),
            'name': user['name'],
            'email': user['email'],
            'phone': user['phone'],
            'created_at': user['created_at']
        }
    
    finally:
        conn.close()

def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, name, email, phone, created_at
            FROM users 
            WHERE email = ?
        ''', (email,))
        
        user = cursor.fetchone()
        
        if not user:
            return None
        
        return {
            'id': str(user['id']),
            'name': user['name'],
            'email': user['email'],
            'phone': user['phone'],
            'created_at': user['created_at']
        }
    
    finally:
        conn.close()

# Budget functions
def create_budget(user_id: int, amount: float, period: str) -> Dict:
    """Create or update user budget"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO budgets (user_id, amount, period)
            VALUES (?, ?, ?)
        ''', (user_id, amount, period))
        
        budget_id = cursor.lastrowid
        conn.commit()
        
        return {
            'id': budget_id,
            'user_id': user_id,
            'amount': amount,
            'period': period
        }
    finally:
        conn.close()

def get_user_budget(user_id: int, period: str) -> Optional[Dict]:
    """Get user's budget for a specific period"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, user_id, amount, period, created_at
            FROM budgets 
            WHERE user_id = ? AND period = ?
            ORDER BY created_at DESC
            LIMIT 1
        ''', (user_id, period))
        
        budget = cursor.fetchone()
        if not budget:
            return None
        
        return {
            'id': budget['id'],
            'user_id': budget['user_id'],
            'amount': budget['amount'],
            'period': budget['period'],
            'created_at': budget['created_at']
        }
    finally:
        conn.close()

# Expense functions
def create_expense(user_id: int, category: str, amount: float, description: str, date: str) -> Dict:
    """Create a new expense with retry logic"""
    max_retries = 3
    retry_delay = 0.5
    
    for attempt in range(max_retries):
        conn = None
        try:
            # Small delay between attempts
            if attempt > 0:
                time.sleep(retry_delay * attempt)
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Start immediate transaction
            conn.execute('BEGIN IMMEDIATE')
            
            cursor.execute('''
                INSERT INTO expenses (user_id, category, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, category, amount, description, date))
            
            expense_id = cursor.lastrowid
            conn.commit()
            
            return {
                'id': expense_id,
                'user_id': user_id,
                'category': category,
                'amount': amount,
                'description': description,
                'date': date
            }
        except sqlite3.OperationalError as e:
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            if "database is locked" in str(e) and attempt < max_retries - 1:
                print(f"⚠️ Database locked, retry {attempt + 1}/{max_retries}")
                continue
            print(f"❌ Error creating expense: {str(e)}")
            raise Exception(f"Failed to create expense after {attempt + 1} attempts: {str(e)}")
        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            print(f"❌ Error creating expense: {str(e)}")
            raise Exception(f"Failed to create expense: {str(e)}")
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    raise Exception("Failed to create expense: maximum retries exceeded")

def get_user_expenses(user_id: int, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get user's expenses, optionally filtered by date range"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if start_date and end_date:
            cursor.execute('''
                SELECT id, user_id, category, amount, description, date, created_at
                FROM expenses 
                WHERE user_id = ? AND date BETWEEN ? AND ?
                ORDER BY date DESC
            ''', (user_id, start_date, end_date))
        else:
            cursor.execute('''
                SELECT id, user_id, category, amount, description, date, created_at
                FROM expenses 
                WHERE user_id = ?
                ORDER BY date DESC
            ''', (user_id,))
        
        expenses = cursor.fetchall()
        
        return [{
            'id': exp['id'],
            'user_id': exp['user_id'],
            'category': exp['category'],
            'amount': exp['amount'],
            'description': exp['description'],
            'date': exp['date'],
            'created_at': exp['created_at']
        } for exp in expenses]
    finally:
        conn.close()

def get_expense_stats(user_id: int) -> Dict:
    """Get expense statistics for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Today's spending
        cursor.execute('''
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE user_id = ? AND date = DATE('now')
        ''', (user_id,))
        today = cursor.fetchone()['total']
        
        # This week's spending
        cursor.execute('''
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE user_id = ? AND date >= DATE('now', '-7 days')
        ''', (user_id,))
        week = cursor.fetchone()['total']
        
        # This month's spending
        cursor.execute('''
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE user_id = ? AND date >= DATE('now', 'start of month')
        ''', (user_id,))
        month = cursor.fetchone()['total']
        
        # Largest purchase
        cursor.execute('''
            SELECT COALESCE(MAX(amount), 0) as max
            FROM expenses
            WHERE user_id = ?
        ''', (user_id,))
        largest = cursor.fetchone()['max']
        
        # Get latest budget creation time for current month
        current_period = pd.Timestamp.now().strftime('%Y-%m')
        cursor.execute('''
            SELECT created_at
            FROM budgets
            WHERE user_id = ? AND period = ?
            ORDER BY created_at DESC
            LIMIT 1
        ''', (user_id, current_period))
        budget_row = cursor.fetchone()
        
        # Spending since budget was set (for current period)
        since_budget = 0
        if budget_row:
            budget_created = budget_row['created_at']
            cursor.execute('''
                SELECT COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE user_id = ? AND created_at >= ?
            ''', (user_id, budget_created))
            since_budget = cursor.fetchone()['total']
        
        # Category-wise spending (since budget was set if budget exists, otherwise all time)
        if budget_row:
            budget_created = budget_row['created_at']
            cursor.execute('''
                SELECT category, SUM(amount) as total
                FROM expenses
                WHERE user_id = ? AND created_at >= ?
                GROUP BY category
            ''', (user_id, budget_created))
        else:
            cursor.execute('''
                SELECT category, SUM(amount) as total
                FROM expenses
                WHERE user_id = ?
                GROUP BY category
            ''', (user_id,))
        
        by_category = {row['category']: row['total'] for row in cursor.fetchall()}
        
        return {
            'today': today,
            'week': week,
            'month': month,
            'largest': largest,
            'since_budget': since_budget,
            'by_category': by_category
        }
    finally:
        conn.close()

# Split expense functions
def create_split_group(name: str, description: str, created_by: int, members: List[Dict]) -> Dict:
    """Create a new split group with members"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create group
        cursor.execute('''
            INSERT INTO split_groups (name, description, created_by)
            VALUES (?, ?, ?)
        ''', (name, description, created_by))
        
        group_id = cursor.lastrowid
        
        # Add members
        for member in members:
            cursor.execute('''
                INSERT INTO split_members (group_id, user_id, name, phone)
                VALUES (?, ?, ?, ?)
            ''', (group_id, member.get('user_id'), member['name'], member.get('phone')))
        
        conn.commit()
        
        return {
            'id': group_id,
            'name': name,
            'description': description,
            'created_by': created_by
        }
    finally:
        conn.close()

def get_user_split_groups(user_id: int) -> List[Dict]:
    """Get all split groups user is part of"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT DISTINCT g.id, g.name, g.description, g.created_by, g.created_at,
                   u.name as creator_name
            FROM split_groups g
            JOIN users u ON g.created_by = u.id
            LEFT JOIN split_members m ON g.id = m.group_id
            WHERE g.created_by = ? OR m.user_id = ?
            ORDER BY g.created_at DESC
        ''', (user_id, user_id))
        
        groups = []
        for row in cursor.fetchall():
            groups.append({
                'id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'created_by': row['created_by'],
                'creator_name': row['creator_name'],
                'created_at': row['created_at']
            })
        
        return groups
    finally:
        conn.close()

def create_split_expense(group_id: int, amount: float, description: str, paid_by: int, date: str, member_ids: List[int]) -> Dict:
    """Create a split expense and calculate shares"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create expense
        cursor.execute('''
            INSERT INTO split_expenses (group_id, amount, description, paid_by, date)
            VALUES (?, ?, ?, ?, ?)
        ''', (group_id, amount, description, paid_by, date))
        
        expense_id = cursor.lastrowid
        
        # Calculate equal split
        share_amount = amount / len(member_ids)
        
        # Get the member_id of the user who paid
        cursor.execute('''
            SELECT id FROM split_members
            WHERE group_id = ? AND user_id = ?
        ''', (group_id, paid_by))
        
        paid_by_member_row = cursor.fetchone()
        paid_by_member_id = paid_by_member_row['id'] if paid_by_member_row else None
        
        # Create shares for each member
        for member_id in member_ids:
            # If this member is the one who paid, mark as paid
            is_paid = 1 if member_id == paid_by_member_id else 0
            cursor.execute('''
                INSERT INTO split_shares (expense_id, member_id, amount, is_paid)
                VALUES (?, ?, ?, ?)
            ''', (expense_id, member_id, share_amount, is_paid))
        
        conn.commit()
        
        return {
            'id': expense_id,
            'group_id': group_id,
            'amount': amount,
            'description': description,
            'paid_by': paid_by,
            'date': date
        }
    finally:
        conn.close()

def get_group_expenses(group_id: int) -> List[Dict]:
    """Get all expenses for a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT e.id, e.amount, e.description, e.paid_by, e.date, e.created_at,
                   u.name as paid_by_name
            FROM split_expenses e
            JOIN users u ON e.paid_by = u.id
            WHERE e.group_id = ?
            ORDER BY e.date DESC
        ''', (group_id,))
        
        expenses = []
        for row in cursor.fetchall():
            expenses.append({
                'id': row['id'],
                'amount': row['amount'],
                'description': row['description'],
                'paid_by': row['paid_by'],
                'paid_by_name': row['paid_by_name'],
                'date': row['date'],
                'created_at': row['created_at']
            })
        
        return expenses
    finally:
        conn.close()

def get_group_members(group_id: int) -> List[Dict]:
    """Get all members of a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, user_id, name, phone
            FROM split_members
            WHERE group_id = ?
        ''', (group_id,))
        
        members = []
        for row in cursor.fetchall():
            members.append({
                'id': row['id'],
                'user_id': row['user_id'],
                'name': row['name'],
                'phone': row['phone']
            })
        
        return members
    finally:
        conn.close()

def get_user_balance_in_group(user_id: int, group_id: int) -> Dict:
    """Calculate what user owes or is owed in a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get member_id for this user in this group
        cursor.execute('''
            SELECT id FROM split_members
            WHERE group_id = ? AND user_id = ?
        ''', (group_id, user_id))
        
        member_row = cursor.fetchone()
        if not member_row:
            return {'owes': 0, 'owed': 0, 'shares': []}
        
        member_id = member_row['id']
        
        # Get all unpaid shares for this member
        cursor.execute('''
            SELECT s.id, s.amount, s.is_paid, e.description, e.paid_by, e.date,
                   u.name as paid_by_name
            FROM split_shares s
            JOIN split_expenses e ON s.expense_id = e.id
            JOIN users u ON e.paid_by = u.id
            WHERE s.member_id = ? AND e.group_id = ?
        ''', (member_id, group_id))
        
        shares = []
        total_owes = 0
        
        for row in cursor.fetchall():
            share_info = {
                'id': row['id'],
                'amount': row['amount'],
                'is_paid': bool(row['is_paid']),
                'description': row['description'],
                'paid_by': row['paid_by'],
                'paid_by_name': row['paid_by_name'],
                'date': row['date']
            }
            shares.append(share_info)
            
            if not row['is_paid'] and row['paid_by'] != user_id:
                total_owes += row['amount']
        
        # Calculate how much others owe this user
        cursor.execute('''
            SELECT SUM(s.amount) as total_owed
            FROM split_shares s
            JOIN split_expenses e ON s.expense_id = e.id
            WHERE e.paid_by = ? AND e.group_id = ? AND s.is_paid = 0
              AND s.member_id != (SELECT id FROM split_members WHERE user_id = ? AND group_id = ?)
        ''', (user_id, group_id, user_id, group_id))
        
        owed_row = cursor.fetchone()
        total_owed = owed_row['total_owed'] if owed_row['total_owed'] else 0
        
        return {
            'owes': total_owes,
            'owed': total_owed,
            'shares': shares
        }
    finally:
        conn.close()

def mark_share_as_paid(share_id: int) -> bool:
    """Mark a share as paid (only creator can do this)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE split_shares
            SET is_paid = 1, paid_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (share_id,))
        
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def get_user_notifications(user_id: int) -> Dict:
    """Get all pending split payment notifications for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all groups user is part of
        cursor.execute('''
            SELECT DISTINCT g.id, g.name
            FROM split_groups g
            LEFT JOIN split_members m ON g.id = m.group_id
            WHERE g.created_by = ? OR m.user_id = ?
        ''', (user_id, user_id))
        
        groups = cursor.fetchall()
        notifications = []
        total_owed = 0
        total_to_receive = 0
        
        for group in groups:
            group_id = group['id']
            group_name = group['name']
            
            # Get member_id for this user
            cursor.execute('''
                SELECT id FROM split_members
                WHERE group_id = ? AND user_id = ?
            ''', (group_id, user_id))
            
            member_row = cursor.fetchone()
            if not member_row:
                continue
                
            member_id = member_row['id']
            
            # Get unpaid shares this user owes
            cursor.execute('''
                SELECT s.id, s.amount, e.description, e.paid_by, u.name as paid_by_name
                FROM split_shares s
                JOIN split_expenses e ON s.expense_id = e.id
                JOIN users u ON e.paid_by = u.id
                WHERE s.member_id = ? AND s.is_paid = 0 AND e.paid_by != ?
            ''', (member_id, user_id))
            
            owes = cursor.fetchall()
            for owe in owes:
                notifications.append({
                    'type': 'owes',
                    'group_name': group_name,
                    'amount': owe['amount'],
                    'description': owe['description'],
                    'to_user': owe['paid_by_name'],
                    'share_id': owe['id']
                })
                total_owed += owe['amount']
            
            # Get unpaid shares others owe this user
            cursor.execute('''
                SELECT s.amount, e.description, m.name as member_name
                FROM split_shares s
                JOIN split_expenses e ON s.expense_id = e.id
                JOIN split_members m ON s.member_id = m.id
                WHERE e.paid_by = ? AND e.group_id = ? AND s.is_paid = 0
                  AND s.member_id != ?
            ''', (user_id, group_id, member_id))
            
            to_receive = cursor.fetchall()
            for receive in to_receive:
                notifications.append({
                    'type': 'to_receive',
                    'group_name': group_name,
                    'amount': receive['amount'],
                    'description': receive['description'],
                    'from_user': receive['member_name']
                })
                total_to_receive += receive['amount']
        
        return {
            'notifications': notifications,
            'total_owed': total_owed,
            'total_to_receive': total_to_receive,
            'count': len(notifications)
        }
    finally:
        conn.close()

def save_user_model(user_id: int, model_data: bytes, data_points: int) -> bool:
    """Save or update a user's trained Prophet model"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO user_models (user_id, model_data, training_data_points, last_trained)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) 
            DO UPDATE SET 
                model_data = excluded.model_data,
                training_data_points = excluded.training_data_points,
                last_trained = CURRENT_TIMESTAMP
        ''', (user_id, model_data, data_points))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Error saving model for user {user_id}: {e}")
        return False
    finally:
        conn.close()

def get_user_model(user_id: int) -> Optional[Dict]:
    """Get a user's trained Prophet model"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT model_data, training_data_points, last_trained, model_version
            FROM user_models
            WHERE user_id = ?
        ''', (user_id,))
        
        row = cursor.fetchone()
        if row:
            return {
                'model_data': row['model_data'],
                'training_data_points': row['training_data_points'],
                'last_trained': row['last_trained'],
                'model_version': row['model_version']
            }
        return None
    finally:
        conn.close()

def delete_user_model(user_id: int) -> bool:
    """Delete a user's trained model (useful when retraining from scratch)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM user_models WHERE user_id = ?', (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

# Direct split expense functions (email-based, simplified system)
def create_split_expense_direct(created_by_user_id: int, total_amount: float, description: str, member_emails: List[str]) -> Dict:
    """
    Create a direct split expense using member email addresses
    
    Args:
        created_by_user_id: User ID of the creator
        total_amount: Total amount to split
        description: Description of the expense
        member_emails: List of email addresses to include in split (including or excluding creator)
    
    Returns:
        Dict with split_expense_id, shares created, and any errors for non-existent users
    
    Raises:
        ValueError: If no valid members found
    """
    # Validate that member_emails is not empty
    if not member_emails:
        raise ValueError("member_emails list cannot be empty")
    
    # Simple approach: Create split with all emails, only create shares for existing users
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get creator email and name
        cursor.execute('SELECT email, name FROM users WHERE id = ?', (created_by_user_id,))
        creator_row = cursor.fetchone()
        if not creator_row:
            raise ValueError("Creator user not found")
        creator_email = creator_row['email']
        creator_name = creator_row['name']
        
        # Ensure creator is in the list
        all_emails = list(member_emails) if creator_email in member_emails else list(member_emails) + [creator_email]
        
        # Calculate share amount
        share_amount = total_amount / len(all_emails)
        
        # Create the split expense
        cursor.execute('''
            INSERT INTO direct_split_expenses (created_by_user_id, total_amount, description)
            VALUES (?, ?, ?)
        ''', (created_by_user_id, total_amount, description))
        
        split_expense_id = cursor.lastrowid
        
        # Find which emails have accounts (within same transaction)
        placeholders = ','.join('?' * len(all_emails))
        cursor.execute(f'SELECT id, email FROM users WHERE email IN ({placeholders})', all_emails)
        
        email_to_id = {row['email']: int(row['id']) for row in cursor.fetchall()}
        not_found_emails = [e for e in all_emails if e not in email_to_id]
        member_user_ids = list(email_to_id.values())
        
        # Create shares for users that exist
        shares_created = []
        for email, user_id in email_to_id.items():
            cursor.execute('''
                INSERT INTO direct_split_shares (split_expense_id, user_id, amount, status)
                VALUES (?, ?, ?, 'PENDING')
            ''', (split_expense_id, user_id, share_amount))
            
            share_id = cursor.lastrowid
            shares_created.append({
                'share_id': share_id,
                'user_id': user_id,
                'amount': share_amount,
                'status': 'PENDING'
            })
        
        # Commit the transaction
        conn.commit()
        
        # Store data for notifications (send after connection close)
        notif_data = {
            'member_ids': [uid for uid in member_user_ids if uid != created_by_user_id],
            'creator_name': creator_name,
            'share_amount': share_amount,
            'description': description,
            'split_expense_id': split_expense_id,
            'created_by_user_id': created_by_user_id
        }
        
        result = {
            'split_expense_id': split_expense_id,
            'total_amount': total_amount,
            'description': description,
            'created_by_user_id': created_by_user_id,
            'shares_created': shares_created,
            'not_found_emails': not_found_emails,
            'share_amount': share_amount,
            'member_count': len(member_user_ids),
            '_notif_data': notif_data
        }
        
        return result
    
    except ValueError as e:
        if conn:
            conn.rollback()
        raise e
    except Exception as e:
        if conn:
            conn.rollback()
        raise Exception(f"Failed to create split expense: {str(e)}")
    finally:
        if conn:
            conn.close()

def get_user_splits(user_id: int) -> List[Dict]:
    """
    Get all split shares for a user (both as creator and member)
    
    Returns list of splits with full details including creator info
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ds.id as share_id,
                ds.split_expense_id,
                ds.amount,
                ds.status,
                ds.created_at,
                ds.paid_at,
                ds.confirmed_at,
                dse.total_amount,
                dse.description,
                dse.created_by_user_id,
                creator.name as creator_name,
                creator.email as creator_email
            FROM direct_split_shares ds
            JOIN direct_split_expenses dse ON ds.split_expense_id = dse.id
            JOIN users creator ON dse.created_by_user_id = creator.id
            WHERE ds.user_id = ?
            ORDER BY ds.created_at DESC
        ''', (user_id,))
        
        splits = []
        for row in cursor.fetchall():
            splits.append({
                'share_id': row['share_id'],
                'split_expense_id': row['split_expense_id'],
                'amount': row['amount'],
                'status': row['status'],
                'created_at': row['created_at'],
                'paid_at': row['paid_at'],
                'confirmed_at': row['confirmed_at'],
                'total_amount': row['total_amount'],
                'description': row['description'],
                'created_by_user_id': row['created_by_user_id'],
                'creator_name': row['creator_name'],
                'creator_email': row['creator_email'],
                'is_creator': row['created_by_user_id'] == user_id
            })
        
        return splits
    
    finally:
        conn.close()

def get_split_share_by_id(share_id: int) -> Optional[Dict]:
    """Get a specific split share by ID with full details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                ds.id as share_id,
                ds.split_expense_id,
                ds.user_id,
                ds.amount,
                ds.status,
                ds.created_at,
                ds.paid_at,
                ds.confirmed_at,
                dse.total_amount,
                dse.description,
                dse.created_by_user_id,
                creator.name as creator_name,
                creator.email as creator_email,
                member.name as member_name,
                member.email as member_email
            FROM direct_split_shares ds
            JOIN direct_split_expenses dse ON ds.split_expense_id = dse.id
            JOIN users creator ON dse.created_by_user_id = creator.id
            JOIN users member ON ds.user_id = member.id
            WHERE ds.id = ?
        ''', (share_id,))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        return {
            'share_id': row['share_id'],
            'split_expense_id': row['split_expense_id'],
            'user_id': row['user_id'],
            'amount': row['amount'],
            'status': row['status'],
            'created_at': row['created_at'],
            'paid_at': row['paid_at'],
            'confirmed_at': row['confirmed_at'],
            'total_amount': row['total_amount'],
            'description': row['description'],
            'created_by_user_id': row['created_by_user_id'],
            'creator_name': row['creator_name'],
            'creator_email': row['creator_email'],
            'member_name': row['member_name'],
            'member_email': row['member_email']
        }
    
    finally:
        conn.close()

def mark_split_share_paid(share_id: int, user_id: int) -> Dict:
    """
    Mark a split share as PAID (member marks their own share as paid)
    
    Args:
        share_id: ID of the split share
        user_id: ID of the user marking as paid (must be the share owner)
    
    Returns:
        Dict with success status and updated share
    
    Raises:
        ValueError: If share not found, user not authorized, or invalid status
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get the share details
        share = get_split_share_by_id(share_id)
        if not share:
            raise ValueError(f"Split share {share_id} not found")
        
        # Verify user owns this share
        if share['user_id'] != user_id:
            raise ValueError("You can only mark your own shares as paid")
        
        # Verify current status is PENDING
        if share['status'] != 'PENDING':
            raise ValueError(f"Can only mark PENDING shares as paid. Current status: {share['status']}")
        
        # Update status to PAID
        cursor.execute('''
            UPDATE direct_split_shares
            SET status = 'PAID', paid_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (share_id,))
        
        conn.commit()
        
        # Get updated share
        updated_share = get_split_share_by_id(share_id)
        
        # Notify creator that payment was marked
        member = get_user_by_id(user_id)
        member_name = member['name'] if member else share['member_email']
        
        create_notification(
            user_id=share['created_by_user_id'],
            notif_type="split_paid",
            title="Payment Marked as Paid",
            message=f"{member_name} marked their payment as paid for split: {share['description']}. Amount: ${share['amount']:.2f}",
            related_id=share['split_expense_id']
        )
        
        return {
            'success': True,
            'message': 'Share marked as paid',
            'share': updated_share
        }
    
    except ValueError as e:
        conn.rollback()
        raise e
    except Exception as e:
        conn.rollback()
        raise Exception(f"Failed to mark share as paid: {str(e)}")
    finally:
        conn.close()

def confirm_split_share_payment(share_id: int, user_id: int) -> Dict:
    """
    Confirm a split share payment (creator confirms member's payment)
    
    Args:
        share_id: ID of the split share
        user_id: ID of the user confirming (must be the creator)
    
    Returns:
        Dict with success status and updated share
    
    Raises:
        ValueError: If share not found, user not authorized, or invalid status
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get the share details
        share = get_split_share_by_id(share_id)
        if not share:
            raise ValueError(f"Split share {share_id} not found")
        
        # Verify user is the creator
        if share['created_by_user_id'] != user_id:
            raise ValueError("Only the split creator can confirm payments")
        
        # Verify current status is PAID
        if share['status'] != 'PAID':
            raise ValueError(f"Can only confirm PAID shares. Current status: {share['status']}")
        
        # Update status to CONFIRMED
        cursor.execute('''
            UPDATE direct_split_shares
            SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (share_id,))
        
        conn.commit()
        
        # Get updated share
        updated_share = get_split_share_by_id(share_id)
        
        # Notify member that payment was confirmed
        creator = get_user_by_id(user_id)
        creator_name = creator['name'] if creator else share['creator_email']
        
        create_notification(
            user_id=share['user_id'],
            notif_type="split_confirmed",
            title="Payment Confirmed",
            message=f"{creator_name} confirmed your payment for split: {share['description']}. Amount: ${share['amount']:.2f}",
            related_id=share['split_expense_id']
        )
        
        return {
            'success': True,
            'message': 'Payment confirmed',
            'share': updated_share
        }
    
    except ValueError as e:
        conn.rollback()
        raise e
    except Exception as e:
        conn.rollback()
        raise Exception(f"Failed to confirm payment: {str(e)}")
    finally:
        conn.close()

def get_split_expense_summary(split_expense_id: int) -> Dict:
    """Get summary of a split expense including all shares and their statuses"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get split expense details
        cursor.execute('''
            SELECT 
                dse.id,
                dse.total_amount,
                dse.description,
                dse.created_by_user_id,
                dse.created_at,
                creator.name as creator_name,
                creator.email as creator_email
            FROM direct_split_expenses dse
            JOIN users creator ON dse.created_by_user_id = creator.id
            WHERE dse.id = ?
        ''', (split_expense_id,))
        
        expense_row = cursor.fetchone()
        if not expense_row:
            return None
        
        # Get all shares for this expense
        cursor.execute('''
            SELECT 
                ds.id as share_id,
                ds.user_id,
                ds.amount,
                ds.status,
                ds.created_at,
                ds.paid_at,
                ds.confirmed_at,
                u.name as member_name,
                u.email as member_email
            FROM direct_split_shares ds
            JOIN users u ON ds.user_id = u.id
            WHERE ds.split_expense_id = ?
            ORDER BY ds.created_at
        ''', (split_expense_id,))
        
        shares = []
        status_counts = {'PENDING': 0, 'PAID': 0, 'CONFIRMED': 0}
        
        for row in cursor.fetchall():
            status_counts[row['status']] += 1
            shares.append({
                'share_id': row['share_id'],
                'user_id': row['user_id'],
                'member_name': row['member_name'],
                'member_email': row['member_email'],
                'amount': row['amount'],
                'status': row['status'],
                'created_at': row['created_at'],
                'paid_at': row['paid_at'],
                'confirmed_at': row['confirmed_at']
            })
        
        return {
            'split_expense_id': expense_row['id'],
            'total_amount': expense_row['total_amount'],
            'description': expense_row['description'],
            'created_by_user_id': expense_row['created_by_user_id'],
            'creator_name': expense_row['creator_name'],
            'creator_email': expense_row['creator_email'],
            'created_at': expense_row['created_at'],
            'shares': shares,
            'share_count': len(shares),
            'status_counts': status_counts,
            'all_confirmed': status_counts['CONFIRMED'] == len(shares)
        }
    
    finally:
        conn.close()

# ============================================================================
# NOTIFICATION FUNCTIONS
# ============================================================================

def create_notification(user_id: int, notif_type: str, title: str, message: str, related_id: Optional[int] = None) -> Optional[int]:
    """Create a new in-app notification for a user"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO notifications (user_id, type, title, message, related_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, notif_type, title, message, related_id))
        
        notification_id = cursor.lastrowid
        conn.commit()
        return notification_id
    except Exception as e:
        print(f"⚠️ Failed to create notification: {str(e)}")
        if conn:
            try:
                conn.rollback()
            except:
                pass
        return None
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

def get_user_notifications_list(user_id: int, unread_only: bool = False) -> List[Dict]:
    """Get all notifications for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if unread_only:
            cursor.execute('''
                SELECT * FROM notifications
                WHERE user_id = ? AND is_read = 0
                ORDER BY created_at DESC
            ''', (user_id,))
        else:
            cursor.execute('''
                SELECT * FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            ''', (user_id,))
        
        notifications = []
        for row in cursor.fetchall():
            notifications.append({
                'id': row['id'],
                'type': row['type'],
                'title': row['title'],
                'message': row['message'],
                'related_id': row['related_id'],
                'is_read': row['is_read'],
                'created_at': row['created_at']
            })
        
        return notifications
    finally:
        conn.close()

def mark_notification_read(notification_id: int) -> bool:
    """Mark a notification as read"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE notifications
            SET is_read = 1
            WHERE id = ?
        ''', (notification_id,))
        
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def mark_all_notifications_read(user_id: int) -> int:
    """Mark all notifications as read for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ? AND is_read = 0
        ''', (user_id,))
        
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()

# Initialize database when module is imported
init_database()
