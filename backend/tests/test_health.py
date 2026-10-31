import pytest
from unittest.mock import patch, AsyncMock
from app.main import health_check


@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify health endpoint without live network or database calls."""
    with patch("app.main.check_mongo_connection", new_callable=AsyncMock) as mock_mongo:
        mock_mongo.return_value = False
        data = await health_check()
        assert data["status"] == "healthy"
        assert data["project"] == "SutraVesh"
        assert "quest" in data["modes"]
        assert "world" in data["modes"]
        assert data["mongo_connected"] is False
