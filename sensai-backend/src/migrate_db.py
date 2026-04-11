import sqlite3
import os

db_path = "senseai.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check milestones table columns
    cursor.execute("PRAGMA table_info(milestones)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Current columns in milestones: {columns}")

    # Columns that might be missing based on course.py and main.py
    missing_columns = [
        ("is_locked", "INTEGER DEFAULT 0"),
        ("unlock_cost", "INTEGER DEFAULT 0"),
        ("is_free", "INTEGER DEFAULT 0"),
        ("difficulty", "TEXT")
    ]

    for col_name, col_def in missing_columns:
        if col_name not in columns:
            print(f"Adding column {col_name} to milestones...")
            try:
                cursor.execute(f"ALTER TABLE milestones ADD COLUMN {col_name} {col_def}")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
