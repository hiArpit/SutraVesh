"""
Tests for Groq AI service — fully mocked, no real API key needed.
Covers: vision success, reasoning verdicts, offline fallbacks, JSON parser.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.groq_service import (
    identify_concept_from_image,
    evaluate_hop,
    _parse_json_safe,
    _vision_offline_fallback,
    _reasoning_offline_fallback,
)


# ---------------------------------------------------------------------------
# Helper: build a mock Groq completion response
# ---------------------------------------------------------------------------
def _mock_completion(content: str):
    choice = MagicMock()
    choice.message.content = content
    completion = MagicMock()
    completion.choices = [choice]
    return completion


# ---------------------------------------------------------------------------
# Vision tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_vision_offline_when_no_api_key():
    with patch("app.services.groq_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = None
        result = await identify_concept_from_image(b"fake_image_bytes")
    assert result["fallback"] is True
    assert result["concept"] == "interesting object"


@pytest.mark.asyncio
async def test_vision_success():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"concept": "solar panel", "confidence": "high"}'
    )

    with patch("app.services.groq_service._get_client", return_value=mock_client):
        result = await identify_concept_from_image(b"fake_image_bytes")

    assert result["fallback"] is False
    assert result["concept"] == "solar panel"
    assert result["confidence"] == "high"


@pytest.mark.asyncio
async def test_vision_handles_markdown_wrapped_json():
    raw = '```json\n{"concept": "volcano", "confidence": "medium"}\n```'
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(raw)

    with patch("app.services.groq_service._get_client", return_value=mock_client):
        result = await identify_concept_from_image(b"fake_bytes")

    assert result["concept"] == "volcano"
    assert result["confidence"] == "medium"


# ---------------------------------------------------------------------------
# Reasoning / hop evaluation tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_hop_offline_when_no_api_key():
    with patch("app.services.groq_service._get_client", return_value=None):
        result = await evaluate_hop("sun", "photosynthesis", "sun gives energy to plants")
    assert result["fallback"] is True
    assert result["verdict"] == "association"


@pytest.mark.asyncio
async def test_hop_established_verdict():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"verdict": "established", "reason": "The sun powers photosynthesis!", "resonance_bridges": []}'
    )

    with patch("app.services.groq_service._get_client", return_value=mock_client):
        result = await evaluate_hop("sun", "photosynthesis", "sun gives energy to plants")

    assert result["verdict"] == "established"
    assert result["fallback"] is False
    assert "photosynthesis" in result["reason"].lower() or len(result["reason"]) > 0


@pytest.mark.asyncio
async def test_hop_rejected_verdict():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"verdict": "rejected", "reason": "These ideas don\'t connect yet!", "resonance_bridges": []}'
    )

    with patch("app.services.groq_service._get_client", return_value=mock_client):
        result = await evaluate_hop("chair", "black hole", "they are both round")

    assert result["verdict"] == "rejected"


@pytest.mark.asyncio
async def test_hop_world_mode_returns_bridges():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"verdict": "association", "reason": "Creative link!", "resonance_bridges": ["gravity", "energy", "orbit"]}'
    )

    with patch("app.services.groq_service._get_client", return_value=mock_client):
        result = await evaluate_hop("apple", "moon", "both fall down", mode="world")

    assert result["verdict"] == "association"
    assert "gravity" in result["resonance_bridges"]
    assert len(result["resonance_bridges"]) <= 3


# ---------------------------------------------------------------------------
# JSON parser tests
# ---------------------------------------------------------------------------
def test_parse_json_safe_plain():
    result = _parse_json_safe('{"verdict": "established"}')
    assert result["verdict"] == "established"


def test_parse_json_safe_with_markdown():
    result = _parse_json_safe('```json\n{"verdict": "association"}\n```')
    assert result["verdict"] == "association"


def test_parse_json_safe_malformed_returns_empty():
    result = _parse_json_safe("not json at all")
    assert result == {}


# ---------------------------------------------------------------------------
# Offline fallback structure tests
# ---------------------------------------------------------------------------
def test_vision_offline_fallback_structure():
    r = _vision_offline_fallback()
    assert "concept" in r and "fallback" in r and r["fallback"] is True


def test_reasoning_offline_fallback_structure():
    r = _reasoning_offline_fallback("water", "cloud")
    assert r["verdict"] == "association"
    assert "water" in r["reason"] or "cloud" in r["reason"]
    assert r["fallback"] is True
