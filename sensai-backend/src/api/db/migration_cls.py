import asyncio
import sqlite3
import os
import sys

# Add the src directory to sys.path to allow importing from api
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from api.config import sqlite_db_path, users_table_name, tasks_table_name, courses_table_name
from api.utils.db import get_new_db_connection

async def run_cls_migration():
    print(f"Starting CLS migration on {sqlite_db_path}...")
    
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        
        # 1. Add credits to users
        print("Adding 'credits' to users table...")
        try:
            await cursor.execute(f"ALTER TABLE {users_table_name} ADD COLUMN credits INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            print("Column 'credits' already exists in users table.")

        # 2. Add difficulty to tasks
        print("Adding 'difficulty' to tasks table...")
        try:
            await cursor.execute(f"ALTER TABLE {tasks_table_name} ADD COLUMN difficulty TEXT DEFAULT 'easy'")
        except sqlite3.OperationalError:
            print("Column 'difficulty' already exists in tasks table.")

        # 3. Add unlock_cost to courses
        print("Adding 'unlock_cost' to courses table...")
        try:
            await cursor.execute(f"ALTER TABLE {courses_table_name} ADD COLUMN unlock_cost INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            print("Column 'unlock_cost' already exists in courses table.")

        # 4. Create user_unlocked_courses table
        print("Creating 'user_unlocked_courses' table...")
        user_unlocked_courses_table = "user_unlocked_courses"
        await cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {user_unlocked_courses_table} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, course_id),
                FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES {courses_table_name}(id) ON DELETE CASCADE
            )
        """)
        
        await conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_cls_migration())
