"""Tests for Wikipedia grounding service — fully offline via mocking."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.wiki_service import fetch_wiki_summary


def _make_mock_response(status: int, payload: dict):
    """Helper to create a mock httpx response."""
    mock = MagicMock()
    mock.status_code = status
    mock.json.return_value = payload
    return mock


PHOTOSYNTHESIS_PAYLOAD = {
    "title": "Photosynthesis",
    "extract": (
        "Photosynthesis is a process used by plants and other organisms "
        "to convert light energy into chemical energy. "
        "It is one of the most important biological processes on Earth. "
        "It produces oxygen as a byproduct."
    ),
    "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Photosynthesis"}},
    "thumbnail": {"source": "https://upload.wikimedia.org/wikipedia/commons/thumb/photo.jpg"},
}


@pytest.mark.asyncio
async def test_fetch_wiki_summary_success():
    mock_response = _make_mock_response(200, PHOTOSYNTHESIS_PAYLOAD)

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.services.wiki_service.httpx.AsyncClient", return_value=mock_client):
        result = await fetch_wiki_summary("photosynthesis")

    assert result["found"] is True
    assert result["title"] == "Photosynthesis"
    assert "Photosynthesis" in result["summary"]
    assert result["url"] == "https://en.wikipedia.org/wiki/Photosynthesis"
    assert result["thumbnail"] is not None


@pytest.mark.asyncio
async def test_fetch_wiki_summary_not_found():
    mock_response = _make_mock_response(404, {})

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.services.wiki_service.httpx.AsyncClient", return_value=mock_client):
        result = await fetch_wiki_summary("xyzzy_fake_concept")

    assert result["found"] is False
    assert "xyzzy_fake_concept" in result["title"].lower() or result["title"] == "xyzzy_fake_concept"


@pytest.mark.asyncio
async def test_fetch_wiki_summary_timeout():
    import httpx

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))

    with patch("app.services.wiki_service.httpx.AsyncClient", return_value=mock_client):
        result = await fetch_wiki_summary("volcano")

    # Graceful fallback — must not crash
    assert result["found"] is False
    assert "volcano" in result["summary"].lower() or result["summary"] != ""


@pytest.mark.asyncio
async def test_summary_trimmed_to_three_sentences():
    long_extract = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five."
    payload = {
        "title": "Test",
        "extract": long_extract,
        "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Test"}},
    }
    mock_response = _make_mock_response(200, payload)

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.services.wiki_service.httpx.AsyncClient", return_value=mock_client):
        result = await fetch_wiki_summary("test")

    # Only first 3 sentences should be in the summary
    assert "Sentence four" not in result["summary"]
    assert "Sentence five" not in result["summary"]
