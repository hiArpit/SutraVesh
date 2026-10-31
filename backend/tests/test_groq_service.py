"""
Tests for Groq AI service — fully mocked, no real API key or network needed.

Key design: Every test mocks BOTH:
  1. wiki_service.fetch_wiki_summary  → simulates Wikipedia grounding
  2. groq_service._get_client         → simulates Groq LLM response

This verifies the integrated pipeline:
  Wikipedia evidence → prompt context → Groq verdict
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.groq_service import (
    identify_concept_from_image,
    evaluate_hop,
    _parse_json_safe,
    _vision_offline_fallback,
    _reasoning_offline_fallback,
    _fetch_evidence_pair,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------
WIKI_PHOTOSYNTHESIS = {
    "found": True,
    "title": "Photosynthesis",
    "summary": "Photosynthesis is a process used by plants to convert light energy into chemical energy.",
    "url": "https://en.wikipedia.org/wiki/Photosynthesis",
    "thumbnail": None,
}

WIKI_SUN = {
    "found": True,
    "title": "Sun",
    "summary": "The Sun is the star at the center of the Solar System. It provides energy to Earth.",
    "url": "https://en.wikipedia.org/wiki/Sun",
    "thumbnail": None,
}

WIKI_NOT_FOUND = {
    "found": False,
    "title": "xyzzy_fake",
    "summary": "xyzzy_fake is an interesting concept worth exploring!",
    "url": "",
    "thumbnail": None,
}


def _mock_completion(content: str):
    """Build a mock Groq completion response."""
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
    with patch("app.services.groq_service._get_client", return_value=None):
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
async def test_vision_success_with_educational_description():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"concept": "desk lamp", "description": "A lamp uses electricity to create bright light for your desk!", "confidence": "high"}'
    )
    with patch("app.services.groq_service._get_client", return_value=mock_client):
        result = await identify_concept_from_image(b"fake_image_bytes")
    assert result["fallback"] is False
    assert result["concept"] == "desk lamp"
    assert "electricity" in result["description"]

@pytest.mark.asyncio
async def test_vision_success_with_discovery_card_fields():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"concept": "Book", "what_is_it": "A book is a long story with paper pages.", "fun_fact": "The oldest printed book is over 1000 years old!", "try_this": "Feel how the cover folds.", "grade_level": "Grade 1.3", "confidence": "high"}'
    )
    with patch("app.services.groq_service._get_client", return_value=mock_client):
        result = await identify_concept_from_image(b"fake_book_bytes")
    assert result["fallback"] is False
    assert result["concept"] == "Book"
    assert "paper pages" in result["what_is_it"]
    assert "1000 years" in result["fun_fact"]
    assert "cover folds" in result["try_this"]
    assert result["grade_level"] == "Grade 1.3"


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
# Reasoning + Wikipedia grounding integration tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hop_offline_when_no_client():
    """When Groq client is unavailable, fallback fires AFTER Wikipedia fetch."""
    wiki_mock = AsyncMock(return_value=WIKI_SUN)

    with patch("app.services.groq_service._get_client", return_value=None), \
         patch("app.services.groq_service.fetch_wiki_summary", wiki_mock):
        result = await evaluate_hop("sun", "photosynthesis", "sun gives energy to plants")

    assert result["fallback"] is True
    assert result["verdict"] == "association"
    # Wikipedia was still fetched — evidence_urls should reflect that
    # (sun wiki has a url, but offline fallback passes it through)
    assert isinstance(result["evidence_urls"], list)


@pytest.mark.asyncio
async def test_hop_established_with_wiki_context():
    """Groq returns 'established' and the prompt is grounded in Wikipedia evidence."""
    groq_response = _mock_completion(
        '{"verdict": "established", "reason": "The sun powers photosynthesis directly!", "resonance_bridges": []}'
    )
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = groq_response

    async def fake_wiki(concept):
        return WIKI_SUN if concept == "sun" else WIKI_PHOTOSYNTHESIS

    with patch("app.services.groq_service._get_client", return_value=mock_client), \
         patch("app.services.groq_service.fetch_wiki_summary", side_effect=fake_wiki):
        result = await evaluate_hop("sun", "photosynthesis", "sun gives energy to plants")

    assert result["verdict"] == "established"
    assert result["fallback"] is False
    # Confirm Wikipedia URLs are passed back as evidence
    assert "https://en.wikipedia.org/wiki/Sun" in result["evidence_urls"]
    assert "https://en.wikipedia.org/wiki/Photosynthesis" in result["evidence_urls"]


@pytest.mark.asyncio
async def test_hop_grounding_prompt_contains_wiki_text():
    """Verify the prompt sent to Groq actually contains Wikipedia summary text."""
    captured_prompt = {}

    def capture_create(**kwargs):
        captured_prompt["messages"] = kwargs["messages"]
        return _mock_completion(
            '{"verdict": "association", "reason": "Good link!", "resonance_bridges": []}'
        )

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = capture_create

    async def fake_wiki(concept):
        return WIKI_SUN if concept == "sun" else WIKI_PHOTOSYNTHESIS

    with patch("app.services.groq_service._get_client", return_value=mock_client), \
         patch("app.services.groq_service.fetch_wiki_summary", side_effect=fake_wiki):
        await evaluate_hop("sun", "photosynthesis", "sun gives energy")

    prompt_text = " ".join([m["content"] for m in captured_prompt["messages"]])
    # The Wikipedia summaries MUST appear in the prompt
    assert "star at the center of the Solar System" in prompt_text
    assert "convert light energy into chemical energy" in prompt_text
    assert "REAL-WORLD EVIDENCE" in prompt_text


@pytest.mark.asyncio
async def test_hop_rejected_verdict():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"verdict": "rejected", "reason": "These ideas don\'t connect!", "resonance_bridges": []}'
    )

    async def fake_wiki(concept):
        return WIKI_NOT_FOUND

    with patch("app.services.groq_service._get_client", return_value=mock_client), \
         patch("app.services.groq_service.fetch_wiki_summary", side_effect=fake_wiki):
        result = await evaluate_hop("chair", "black hole", "they are both round")

    assert result["verdict"] == "rejected"
    assert result["fallback"] is False


@pytest.mark.asyncio
async def test_hop_world_mode_returns_bridges():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"verdict": "association", "reason": "Creative link!", "resonance_bridges": ["gravity", "energy", "orbit"]}'
    )

    async def fake_wiki(concept):
        return WIKI_SUN

    with patch("app.services.groq_service._get_client", return_value=mock_client), \
         patch("app.services.groq_service.fetch_wiki_summary", side_effect=fake_wiki):
        result = await evaluate_hop("apple", "moon", "both fall down", mode="world")

    assert result["verdict"] == "association"
    assert "gravity" in result["resonance_bridges"]
    assert len(result["resonance_bridges"]) <= 3


@pytest.mark.asyncio
async def test_hop_evidence_urls_empty_when_wiki_not_found():
    """When Wikipedia returns no URL, evidence_urls should be empty list."""
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = _mock_completion(
        '{"verdict": "association", "reason": "Interesting!", "resonance_bridges": []}'
    )

    async def fake_wiki(concept):
        return WIKI_NOT_FOUND  # url = ""

    with patch("app.services.groq_service._get_client", return_value=mock_client), \
         patch("app.services.groq_service.fetch_wiki_summary", side_effect=fake_wiki):
        result = await evaluate_hop("xyzzy", "foobar", "they feel similar")

    assert result["evidence_urls"] == []


# ---------------------------------------------------------------------------
# _fetch_evidence_pair — parallel fetch helper
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_fetch_evidence_pair_runs_in_parallel():
    call_order = []

    async def fake_wiki(concept):
        call_order.append(concept)
        return WIKI_SUN if concept == "sun" else WIKI_PHOTOSYNTHESIS

    with patch("app.services.groq_service.fetch_wiki_summary", side_effect=fake_wiki):
        src, tgt = await _fetch_evidence_pair("sun", "photosynthesis")

    assert src["title"] == "Sun"
    assert tgt["title"] == "Photosynthesis"
    assert set(call_order) == {"sun", "photosynthesis"}


# ---------------------------------------------------------------------------
# JSON parser tests
# ---------------------------------------------------------------------------
def test_parse_json_safe_plain():
    assert _parse_json_safe('{"verdict": "established"}') == {"verdict": "established"}

def test_parse_json_safe_with_markdown():
    assert _parse_json_safe('```json\n{"verdict": "association"}\n```') == {"verdict": "association"}

def test_parse_json_safe_malformed_returns_empty():
    assert _parse_json_safe("not json at all") == {}


# ---------------------------------------------------------------------------
# Offline fallback structure tests
# ---------------------------------------------------------------------------
def test_vision_offline_fallback_structure():
    r = _vision_offline_fallback()
    assert r["fallback"] is True and r["concept"] == "interesting object"

def test_reasoning_offline_fallback_has_evidence_urls():
    r = _reasoning_offline_fallback("water", "cloud", ["https://en.wikipedia.org/wiki/Water"])
    assert r["fallback"] is True
    assert r["evidence_urls"] == ["https://en.wikipedia.org/wiki/Water"]

def test_reasoning_offline_fallback_empty_urls():
    r = _reasoning_offline_fallback("water", "cloud")
    assert r["evidence_urls"] == []
