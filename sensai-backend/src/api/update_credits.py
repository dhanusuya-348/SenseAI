import sqlite3
import sys

sys.path.append('d:/Apps/My Projects/HyperVerge/SenseAI/sensai-backend/src')
from api.config import sqlite_db_path

conn = sqlite3.connect(sqlite_db_path)
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0")
except Exception as e:
    print(e)
cursor.execute("UPDATE users SET credits = 1000")
conn.commit()
conn.close()
print("Added credits column and set credits to 1000 for all users")
