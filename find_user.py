import asyncio
import os
import sys

# Add the src directory to the path
sys.path.append(os.path.join(os.getcwd(), 'sensai-backend', 'src'))

from api.db.user import get_user_by_email

async def find():
    user = await get_user_by_email('mohanapriya7114@gmail.com')
    if user:
        print(f"ID: {user['id']}, Credits: {user.get('credits', 0)}")
    else:
        print("User not found")

if __name__ == "__main__":
    asyncio.run(find())
