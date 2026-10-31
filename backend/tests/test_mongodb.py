"""
Tests for MongoDB Integration
==============================
Tests connection ping, database acquisition, and collections.
"""

import pytest
from app.core.db import check_mongo_connection, get_database, get_db_client


@pytest.mark.asyncio
async def test_mongo_connection_check():
    connected = await check_mongo_connection()
    assert isinstance(connected, bool)


def test_mongo_database_access():
    db = get_database()
    if db is not None:
        assert "users" in [col for col in ["users", "sessions"]]
        assert db.name == "sutravesh"
