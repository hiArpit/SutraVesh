"""
Tests for 15-Level Progressive Quest System
==========================================
Validates quest catalog integrity, tier mappings, and API endpoints.
"""

from fastapi.testclient import TestClient
from app.main import app
from app.core.quests import get_all_quest_levels, get_quest_level


def test_quest_catalog_has_fifteen_levels():
    levels = get_all_quest_levels()
    assert len(levels) == 15
    for i, level in enumerate(levels, 1):
        assert level.level_number == i
        assert level.tier in [1, 2, 3, 4, 5]
        assert len(level.starting_seed) > 0
        assert len(level.clues) > 0


def test_quest_catalog_tiers_distribution():
    levels = get_all_quest_levels()
    tier_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for level in levels:
        tier_counts[level.tier] += 1
    assert tier_counts[1] == 3
    assert tier_counts[2] == 3
    assert tier_counts[3] == 3
    assert tier_counts[4] == 3
    assert tier_counts[5] == 3


def test_get_quest_level_lookup():
    lvl1 = get_quest_level(1)
    assert lvl1 is not None
    assert lvl1.starting_seed == "Flower"
    assert lvl1.target_wonder is None

    lvl4 = get_quest_level(4)
    assert lvl4 is not None
    assert lvl4.starting_seed == "Cow"
    assert lvl4.target_wonder == "Cheese"

    lvl15 = get_quest_level(15)
    assert lvl15 is not None
    assert lvl15.starting_seed == "Campfire"
    assert lvl15.target_wonder == "Night Stars"

    assert get_quest_level(999) is None


def test_list_levels_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/quests/levels")
        assert res.status_code == 200
        data = res.json()
        assert data["total_levels"] == 15
        assert len(data["levels"]) == 15
        assert data["levels"][0]["title"] == "Flower's Best Friend"


def test_get_single_level_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/quests/levels/4")
        assert res.status_code == 200
        data = res.json()
        assert data["level_number"] == 4
        assert data["starting_seed"] == "Cow"
        assert data["target_wonder"] == "Cheese"

        res_bad = client.get("/api/quests/levels/16")
        assert res_bad.status_code in (404, 422)


def test_start_level_endpoint():
    with TestClient(app) as client:
        res = client.post("/api/quests/start-level", json={"level_number": 4})
        assert res.status_code == 200
        data = res.json()
        assert data["session_id"] is not None
        assert data["mode"] == "quest"
        assert data["quest_target"] == "Cheese"
        assert data["starting_seed"] == "Cow"
        assert data["level_number"] == 4
