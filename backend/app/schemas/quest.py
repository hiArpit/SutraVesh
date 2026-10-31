from typing import List, Optional
from pydantic import BaseModel, Field


class QuestLevel(BaseModel):
    level_number: int = Field(..., ge=1, le=15, description="Level index from 1 to 15")
    tier: int = Field(..., ge=1, le=5, description="Tier index from 1 to 5")
    tier_name: str = Field(..., description="Display name of learning tier")
    title: str = Field(..., description="Kid-friendly level title")
    description: str = Field(..., description="Brief instructions or fun premise")
    starting_seed: str = Field(..., description="Seed wonder object placed on canvas")
    target_wonder: Optional[str] = Field(default=None, description="Goal wonder, or None for open-ended Level 1-3")
    emoji: str = Field(..., description="Emoji for the starting wonder")
    target_emoji: Optional[str] = Field(default=None, description="Emoji for the goal wonder")
    required_hops: int = Field(default=1, ge=1, le=4, description="Target hops to solve")
    clues: List[str] = Field(default_factory=list, description="Kid-friendly hints to guide observation")
    stars_reward: int = Field(default=3, description="Stars awarded upon completion")


class QuestLevelResponse(BaseModel):
    levels: List[QuestLevel]
    total_levels: int


class StartLevelRequest(BaseModel):
    level_number: int = Field(..., ge=1, le=15)


class StartLevelResponse(BaseModel):
    session_id: str
    level_number: int
    title: str
    mode: str
    starting_seed: str
    quest_target: Optional[str]
    clues: List[str]
