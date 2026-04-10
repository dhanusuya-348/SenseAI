import os
import sys
from dotenv import load_dotenv

# Add the current directory to sys.path to find 'api'
sys.path.append(os.getcwd())

def test_config():
    print("--- Environment Scan ---")
    
    # Check current directory
    print(f"Current Working Directory: {os.getcwd()}")
    
    # Path to api/.env
    env_path = os.path.join("api", ".env")
    print(f"Looking for .env at: {env_path}")
    
    if os.path.exists(env_path):
        print(f"Found .env. Loading...")
        load_dotenv(env_path, override=True)
    else:
        print(f"Warning: .env NOT FOUND at {env_path}")
        
    api_key = os.environ.get("OPENAI_API_KEY", "NOT SET")
    print(f"OPENAI_API_KEY starts with: {api_key[:10]}... (Total length: {len(api_key)})")
    
    if api_key == "NOT SET" or not api_key:
        print("ERROR: OpenAI API Key is missing from environment.")
        return

    print("\n--- Connectivity Test (Direct OpenAI) ---")
    import asyncio
    from openai import AsyncOpenAI
    
    async def try_direct():
        client = AsyncOpenAI(api_key=api_key)
        try:
            print("Attempting gpt-4o-mini request...")
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=5
            )
            print("SUCCESS: Received response from OpenAI.")
            print(f"Response: {response.choices[0].message.content}")
        except Exception as e:
            print(f"FAILED: Direct OpenAI call failed with: {type(e).__name__}: {str(e)}")

    print("\n--- Connectivity Test (Langfuse Wrapped) ---")
    from langfuse.openai import AsyncOpenAI as LangfuseAsyncOpenAI
    
    async def try_langfuse():
        # Langfuse typically uses environment variables for its own keys too
        client = LangfuseAsyncOpenAI(api_key=api_key)
        try:
            print("Attempting Langfuse-wrapped gpt-4o-mini request...")
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=5
            )
            print("SUCCESS: Received response via Langfuse wrapper.")
        except Exception as e:
            print(f"FAILED: Langfuse-wrapped call failed with: {type(e).__name__}: {str(e)}")

    async def run_all():
        await try_direct()
        await try_langfuse()
        
    asyncio.run(run_all())

if __name__ == "__main__":
    test_config()
