import asyncio
import sqlite3
import os
import sys

# Add the src directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "sensai-backend", "src"))

from api.config import sqlite_db_path, milestones_table_name
from api.utils.db import get_new_db_connection

async def run_migration():
    print(f"Adding 'is_locked' to {milestones_table_name} table...")
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        try:
            await cursor.execute(f"ALTER TABLE {milestones_table_name} ADD COLUMN is_locked BOOLEAN DEFAULT 0")
            print("Column 'is_locked' added successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("Column 'is_locked' already exists.")
            else:
                print(f"Error adding column: {e}")
        
        # Also ensure user_unlocked_milestones table exists as it's used in course.py
        print("Creating 'user_unlocked_milestones' table...")
        await cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_unlocked_milestones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                milestone_id INTEGER NOT NULL,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, milestone_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
            )
        """)
        print("Table 'user_unlocked_milestones' verified/created.")
        
        await conn.commit()
    print("Migration completed.")

if __name__ == "__main__":
    asyncio.run(run_migration())
