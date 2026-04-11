import asyncio
import sqlite3
import os
import sys

# Add the src directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "sensai-backend", "src"))

from api.config import sqlite_db_path, milestones_table_name
from api.utils.db import get_new_db_connection

async def check_schema():
    print(f"Checking schema for {milestones_table_name}...")
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(f"PRAGMA table_info({milestones_table_name})")
        columns = await cursor.fetchall()
        for col in columns:
            print(col)

if __name__ == "__main__":
    asyncio.run(check_schema())
