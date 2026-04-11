import sqlite3
import os
from api.config import sqlite_db_path, milestones_table_name, users_table_name

async def run_milestone_migration():
    print("Running milestone migration...")
    
    if not os.path.exists(sqlite_db_path):
        print(f"Database not found at {sqlite_db_path}")
        return

    conn = sqlite3.connect(sqlite_db_path)
    cursor = conn.cursor()

    try:
        # 1. Add unlock_cost to milestones table
        cursor.execute(f"PRAGMA table_info({milestones_table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "unlock_cost" not in columns:
            print(f"Adding unlock_cost to {milestones_table_name}...")
            cursor.execute(f"ALTER TABLE {milestones_table_name} ADD COLUMN unlock_cost INTEGER DEFAULT 0")
        
        if "difficulty" not in columns:
            print(f"Adding difficulty to {milestones_table_name}...")
            cursor.execute(f"ALTER TABLE {milestones_table_name} ADD COLUMN difficulty TEXT DEFAULT 'easy'")

        if "is_free" not in columns:
            print(f"Adding is_free to {milestones_table_name}...")
            cursor.execute(f"ALTER TABLE {milestones_table_name} ADD COLUMN is_free BOOLEAN DEFAULT 0")

        if "is_locked" not in columns:
            print(f"Adding is_locked to {milestones_table_name}...")
            cursor.execute(f"ALTER TABLE {milestones_table_name} ADD COLUMN is_locked BOOLEAN DEFAULT 0")

        # 2. Create user_unlocked_milestones table
        print("Creating user_unlocked_milestones table...")
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS user_unlocked_milestones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                milestone_id INTEGER NOT NULL,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, milestone_id),
                FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE,
                FOREIGN KEY (milestone_id) REFERENCES {milestones_table_name}(id) ON DELETE CASCADE
            )
        """)
        
        # 3. Add difficulty to tasks if missing (though it should be there)
        from api.config import tasks_table_name
        cursor.execute(f"PRAGMA table_info({tasks_table_name})")
        task_columns = [col[1] for col in cursor.fetchall()]
        if "difficulty" not in task_columns:
            print(f"Adding difficulty to {tasks_table_name}...")
            cursor.execute(f"ALTER TABLE {tasks_table_name} ADD COLUMN difficulty TEXT DEFAULT 'easy'")

        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_milestone_migration())
