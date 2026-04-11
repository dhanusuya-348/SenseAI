import sqlite3
import os

db_path = '../db/db.sqlite'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", [t[0] for t in tables])

# Check users table schema
cursor.execute("PRAGMA table_info(users)")
schema = cursor.fetchall()
print("\nUsers table schema:")
for col in schema:
    print(col)

# Check user count
cursor.execute("SELECT COUNT(*) FROM users")
count = cursor.fetchone()[0]
print(f"\nUser count: {count}")

if count > 0:
    cursor.execute("SELECT id, email FROM users")
    users = cursor.fetchall()
    print("Users:", users)

conn.close()
