import asyncio
import os
import sys

# Add the src directory to the path
sys.path.append(os.path.join(os.getcwd(), 'sensai-backend', 'src'))

from api.utils.db import get_new_db_connection
from api.config import users_table_name

async def update():
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await cursor.execute(
            f"UPDATE {users_table_name} SET credits = 5001 WHERE email = ?",
            ('mohanapriya7114@gmail.com',)
        )
        await conn.commit()
        print("Updated credits for mohanapriya7114@gmail.com to 5001")

if __name__ == "__main__":
    asyncio.run(update())
