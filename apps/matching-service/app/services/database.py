import os
import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient

_postgres_pool = None
_mongo_client = None

async def init_db():
    global _postgres_pool, _mongo_client
    
    # Initialize PostgreSQL
    postgres_url = os.getenv("DATABASE_URL")
    if postgres_url:
        _postgres_pool = await asyncpg.create_pool(postgres_url)
    
    # Initialize MongoDB
    mongo_url = os.getenv("MONGODB_URI")
    if mongo_url:
        _mongo_client = AsyncIOMotorClient(mongo_url)

async def close_db():
    global _postgres_pool, _mongo_client
    
    if _postgres_pool:
        await _postgres_pool.close()
    
    if _mongo_client:
        _mongo_client.close()

async def get_postgres_pool():
    return _postgres_pool

def get_mongo_db():
    if _mongo_client:
        return _mongo_client.flexwork
    return None
