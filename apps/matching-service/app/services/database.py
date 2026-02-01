import os
import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient

_postgres_pool = None
_mongo_client = None

async def init_db():
    global _postgres_pool, _mongo_client
    
    # Initialize PostgreSQL (optional - skip if not available)
    postgres_url = os.getenv("DATABASE_URL")
    if postgres_url:
        try:
            _postgres_pool = await asyncpg.create_pool(postgres_url, command_timeout=5)
        except Exception as e:
            print(f"Warning: Failed to initialize PostgreSQL: {e}")
            _postgres_pool = None
    
    # Initialize MongoDB (optional - skip if not available)
    mongo_url = os.getenv("MONGODB_URI")
    if mongo_url:
        try:
            _mongo_client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        except Exception as e:
            print(f"Warning: Failed to initialize MongoDB: {e}")
            _mongo_client = None

async def close_db():
    global _postgres_pool, _mongo_client
    
    if _postgres_pool:
        await _postgres_pool.close()
    
    if _mongo_client:
        _mongo_client.close()

def get_postgres_pool():
    return _postgres_pool

def get_mongo_db():
    if _mongo_client:
        return _mongo_client.flexwork
    return None
