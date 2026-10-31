"""
Quest Levels API Routes
=======================
Endpoints for querying the 15-level progressive quest catalog
and launching level-specific discovery sessions.
"""

from fastapi import APIRouter, HTTPException, Path

from app.schemas.quest import (
    QuestLevel,
    QuestLevelResponse,
    StartLevelRequest,
    StartLevelResponse,
)
from app.core.quests import get_all_quest_levels, get_quest_level
from app.core.session import create_session

quest_router = APIRouter(prefix="/api/quests", tags=["quests"])


@quest_router.get("/levels", response_model=QuestLevelResponse)
async def list_levels():
    """List all 15 curated progressive quest levels."""
    levels = get_all_quest_levels()
    return QuestLevelResponse(
        levels=levels,
        total_levels=len(levels),
    )


@quest_router.get("/levels/{level_number}", response_model=QuestLevel)
async def get_level(level_number: int = Path(..., ge=1, le=15)):
    """Fetch details, clues, and targets for a single level."""
    level = get_quest_level(level_number)
    if not level:
        raise HTTPException(status_code=404, detail="Quest level not found")
    return level


@quest_router.post("/start-level", response_model=StartLevelResponse)
async def start_level(body: StartLevelRequest):
    """
    Initialize a gameplay session for a curated quest level.
    Guarantees consistent, factually-grounded seed and target concepts.
    """
    level = get_quest_level(body.level_number)
    if not level:
        raise HTTPException(status_code=404, detail="Quest level not found")

    mode = "quest"
    session = create_session(
        mode=mode,
        seed_concept=level.starting_seed,
        quest_target=level.target_wonder,
    )

    return StartLevelResponse(
        session_id=session.session_id,
        level_number=level.level_number,
        title=level.title,
        mode=session.mode,
        starting_seed=level.starting_seed,
        quest_target=session.quest_target,
        clues=level.clues,
    )
