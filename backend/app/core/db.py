"""
MongoDB Async Database Client
==============================
Connects via Motor to local MongoDB or cloud MongoDB Atlas.
Maintains collections for:
  - users
  - sessions
Includes failover check so if MongoDB isn't running locally,
the application uses disk persistence without crashing!
"""

import os
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None
_is_connected: bool = False


def get_db_client() -> Optional[AsyncIOMotorClient]:
    global _client
    if _client is None and settings.MONGODB_URL:
        try:
            _client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
            )
        except Exception:
            _client = None
    return _client


def get_database() -> Optional[AsyncIOMotorDatabase]:
    global _db
    client = get_db_client()
    if client is not None and _db is None:
        _db = client[settings.MONGODB_DB_NAME]
    return _db


async def check_mongo_connection() -> bool:
    """Test ping to MongoDB server."""
    global _is_connected
    client = get_db_client()
    if client is None:
        _is_connected = False
        return False
    try:
        await client.admin.command("ping")
        _is_connected = True
        return True
    except Exception:
        _is_connected = False
        return False


def is_mongo_available() -> bool:
    return _is_connected
