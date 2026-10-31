"""
Tests for Phase 3: Session Manager, Hop Engine, and API Routes.

All Groq and Wikipedia calls are mocked — zero network needed.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.core.session import (
    create_session, get_session, update_session,
    delete_session, active_session_count, GameSession
)
from app.services.hop_engine import process_hop, _evaluate_badges, _infer_category
from app.schemas.graph import HopRequest


# ============================================================
# SECTION A: Session Manager Tests
# ============================================================

def test_create_session_quest():
    s = create_session("quest", "sun", quest_target="photosynthesis")
    assert s.session_id is not None
    assert s.mode == "quest"
    assert s.quest_target == "photosynthesis"
    assert s.total_points == 0
    assert s.hops_taken == 0


def test_create_session_world():
    s = create_session("world", "volcano")
    assert s.mode == "world"
    assert s.quest_target is None


def test_get_session_returns_correct_session():
    s = create_session("quest", "water", "cloud")
    fetched = get_session(s.session_id)
    assert fetched is not None
    assert fetched.session_id == s.session_id


def test_get_session_missing_returns_none():
    assert get_session("nonexistent-id-xyz") is None


def test_delete_session():
    s = create_session("world", "robot")
    sid = s.session_id
    delete_session(sid)
    assert get_session(sid) is None


def test_session_to_dict_structure():
    s = create_session("quest", "leaf", "tree")
    d = s.to_dict()
    assert "session_id" in d
    assert "mode" in d
    assert "total_points" in d
    assert "completed" in d


def test_active_session_count_increases():
    before = active_session_count()
    create_session("world", "lightning")
    assert active_session_count() == before + 1


# ============================================================
# SECTION B: Category Inference
# ============================================================

@pytest.mark.parametrize("concept,expected", [
    ("photosynthesis", "biology"),
    ("black hole",     "astronomy"),
    ("gravity",        "physics"),
    ("water molecule", "chemistry"),
    ("robot",          "technology"),
    ("pizza",          "general"),
])
def test_infer_category(concept, expected):
    assert _infer_category(concept) == expected


# ============================================================
# SECTION C: Badge Evaluator
# ============================================================

def test_first_hop_badge():
    s = create_session("quest", "sun", "photosynthesis")
    s.hops_taken = 1
    badges = _evaluate_badges(s, "established", 0, "quest")
    assert "First Hop!" in badges


def test_chain_master_badge():
    s = create_session("quest", "sun", "photosynthesis")
    s.hops_taken = 5
    badges = _evaluate_badges(s, "association", 0, "quest")
    assert "Chain Master" in badges


def test_einstein_badge_after_3_consecutive():
    s = create_session("quest", "sun", "photosynthesis")
    s.consecutive_established = 3
    s.hops_taken = 3
    badges = _evaluate_badges(s, "established", 0, "quest")
    assert "Einstein Mode" in badges


def test_bridge_builder_badge_in_world_mode():
    s = create_session("world", "apple")
    s.hops_taken = 1
    badges = _evaluate_badges(s, "association", 2, "world")
    assert "Bridge Builder" in badges


def test_no_duplicate_badges():
    s = create_session("quest", "sun", "photosynthesis")
    s.hops_taken = 1
    _evaluate_badges(s, "established", 0, "quest")
    _evaluate_badges(s, "established", 0, "quest")  # second call
    assert s.badges.count("first_hop") == 1


# ============================================================
# SECTION D: Hop Engine — process_hop (fully mocked)
# ============================================================

WIKI_SUN = {
    "found": True,
    "title": "Sun",
    "summary": "The Sun provides energy to Earth.",
    "url": "https://en.wikipedia.org/wiki/Sun",
    "thumbnail": None,
}


def _mock_hop_result(verdict="established"):
    return {
        "verdict": verdict,
        "reason": "Great link!",
        "resonance_bridges": [],
        "evidence_urls": ["https://en.wikipedia.org/wiki/Sun"],
        "fallback": False,
    }


@pytest.mark.asyncio
async def test_process_hop_rejected_by_guardrails():
    s = create_session("quest", "sun", "photosynthesis")
    req = HopRequest(
        session_id=s.session_id,
        mode="quest",
        explanation="kill",
    )
    result = await process_hop(req)
    assert result.valid is False
    assert result.verdict == "rejected"


@pytest.mark.asyncio
async def test_process_hop_invalid_session():
    req = HopRequest(
        session_id="bad-session-id",
        mode="quest",
        explanation="sun gives energy",
    )
    result = await process_hop(req)
    assert result.valid is False
    assert "Session not found" in result.reason


@pytest.mark.asyncio
async def test_process_hop_established_scores_correctly():
    s = create_session("quest", "sun", "photosynthesis")
    req = HopRequest(
        session_id=s.session_id,
        mode="quest",
        explanation="sun gives energy to plants",
        source_node_id="sun",
    )

    with patch("app.services.hop_engine.evaluate_hop", AsyncMock(return_value=_mock_hop_result("established"))), \
         patch("app.services.hop_engine.fetch_wiki_summary", AsyncMock(return_value=WIKI_SUN)):
        result = await process_hop(req)

    assert result.valid is True
    assert result.verdict == "established"
    assert result.points_awarded == 50
    assert result.total_points == 50


@pytest.mark.asyncio
async def test_process_hop_association_scores_correctly():
    s = create_session("quest", "volcano", "lava")
    req = HopRequest(
        session_id=s.session_id,
        mode="quest",
        explanation="volcano makes lava",
        source_node_id="volcano",
    )

    with patch("app.services.hop_engine.evaluate_hop", AsyncMock(return_value=_mock_hop_result("association"))), \
         patch("app.services.hop_engine.fetch_wiki_summary", AsyncMock(return_value=WIKI_SUN)):
        result = await process_hop(req)

    assert result.valid is True
    assert result.points_awarded == 30


@pytest.mark.asyncio
async def test_process_hop_rejected_scores_zero():
    s = create_session("quest", "chair", "black hole")
    req = HopRequest(
        session_id=s.session_id,
        mode="quest",
        explanation="chairs orbit stars",
        source_node_id="chair",
    )

    with patch("app.services.hop_engine.evaluate_hop", AsyncMock(return_value=_mock_hop_result("rejected"))), \
         patch("app.services.hop_engine.fetch_wiki_summary", AsyncMock(return_value=WIKI_SUN)):
        result = await process_hop(req)

    assert result.valid is False
    assert result.points_awarded == 0
    assert result.total_points == 0


@pytest.mark.asyncio
async def test_process_hop_world_mode_resonance_bonus():
    s = create_session("world", "apple")
    req = HopRequest(
        session_id=s.session_id,
        mode="world",
        explanation="apple falls like the moon",
        source_node_id="apple",
    )

    world_result = {
        "verdict": "association",
        "reason": "Creative!",
        "resonance_bridges": ["gravity", "orbit"],
        "evidence_urls": [],
        "fallback": False,
    }

    with patch("app.services.hop_engine.evaluate_hop", AsyncMock(return_value=world_result)), \
         patch("app.services.hop_engine.fetch_wiki_summary", AsyncMock(return_value=WIKI_SUN)):
        result = await process_hop(req)

    # 30 (association) + 2 * 15 (resonance) = 60
    assert result.points_awarded == 60
    assert result.resonance_count == 2
    assert result.resonance_points == 30


@pytest.mark.asyncio
async def test_process_hop_quest_completion():
    s = create_session("quest", "sun", "photosynthesis")
    req = HopRequest(
        session_id=s.session_id,
        mode="quest",
        explanation="sun directly powers photosynthesis",
        source_node_id="sun",
        target_node_id="photosynthesis",
    )

    # Return the target concept as the new concept
    hop_res = {**_mock_hop_result("established"), "evidence_urls": []}
    wiki_photo = {**WIKI_SUN, "title": "Photosynthesis"}

    with patch("app.services.hop_engine.evaluate_hop", AsyncMock(return_value=hop_res)), \
         patch("app.services.hop_engine.fetch_wiki_summary", AsyncMock(return_value=wiki_photo)):
        # Manually set explanation to match target
        req.explanation = "photosynthesis"
        result = await process_hop(req)

    # Quest should complete since new concept == target
    assert result.completed is True
    assert result.eureka_graph is not None


@pytest.mark.asyncio
async def test_process_hop_builds_node_and_edge():
    s = create_session("quest", "sun", "oxygen")
    req = HopRequest(
        session_id=s.session_id,
        mode="quest",
        explanation="sun powers plants",
        source_node_id="sun",
    )

    with patch("app.services.hop_engine.evaluate_hop", AsyncMock(return_value=_mock_hop_result("established"))), \
         patch("app.services.hop_engine.fetch_wiki_summary", AsyncMock(return_value=WIKI_SUN)):
        result = await process_hop(req)

    assert result.new_node is not None
    assert len(result.new_edges) >= 1
    assert result.new_edges[0].source == "sun"


# ============================================================
# SECTION E: API Route Tests
# ============================================================

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_session_endpoint():
    response = client.post("/api/session", json={
        "mode": "quest",
        "seed_concept": "photosynthesis",
        "quest_target": "oxygen"
    })
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["mode"] == "quest"


def test_create_session_quest_without_target_fails():
    response = client.post("/api/session", json={
        "mode": "quest",
        "seed_concept": "sun",
    })
    assert response.status_code == 400


def test_create_session_unsafe_concept_rejected():
    response = client.post("/api/session", json={
        "mode": "world",
        "seed_concept": "bomb",
    })
    assert response.status_code == 400


def test_get_session_not_found():
    response = client.get("/api/session/nonexistent-xyz-123")
    assert response.status_code == 404


def test_get_session_after_create():
    create_resp = client.post("/api/session", json={
        "mode": "world",
        "seed_concept": "robot",
    })
    sid = create_resp.json()["session_id"]
    get_resp = client.get(f"/api/session/{sid}")
    assert get_resp.status_code == 200
    assert get_resp.json()["session_id"] == sid


@pytest.mark.asyncio
async def test_hop_unrelated_concept_in_quest_mode_is_rejected():
    s = create_session("quest", "water")
    req = HopRequest(
        session_id=s.session_id,
        mode="quest",
        explanation="charging phone",
        source_node_id="water",
        target_node_id="charger",
    )
    result = await process_hop(req)
    assert result.valid is False
    assert result.verdict == "rejected"
    assert result.points_awarded == 0
    assert "doesn't connect" in result.reason or "does not connect" in result.reason
