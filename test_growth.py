import asyncio
import os
import sys

# Add the src directory to the path
sys.path.append(os.path.join(os.getcwd(), 'sensai-backend', 'src'))

from api.routes.growth import get_user_growth

async def test():
    try:
        print(await get_user_growth(1))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
