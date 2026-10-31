"""
Session Manager
===============
In-memory store for active game sessions.
Each session tracks the full canvas state: nodes, edges,
current score, hop history, badges, mode, and quest target.

For a hackathon, in-memory is perfect.
A production build would swap this for Redis.
"""

import uuid
from typing import Optional
from app.schemas.graph import Node, Edge, PlayMode


class GameSession:
    def __init__(
        self,
        session_id: str,
        mode: PlayMode,
        seed_concept: str,
        quest_target: Optional[str] = None,
    ):
        self.session_id = session_id
        self.mode = mode
        self.quest_target = quest_target          # only used in quest mode

        # Canvas state
        self.nodes: list[Node] = []
        self.edges: list[Edge] = []

        # Scoring
        self.total_points: int = 0
        self.hops_taken: int = 0
        self.hops_saved: int = 0                  # established vs path length
        self.consecutive_established: int = 0     # for Einstein badge

        # Badges
        self.badges: list[str] = []

        # World-mode island tracking
        self.island_count: int = 0

        # Quest completion
        self.completed: bool = False
        self.current_node_id: str = seed_concept.lower().replace(" ", "_")

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "mode": self.mode,
            "quest_target": self.quest_target,
            "total_points": self.total_points,
            "hops_taken": self.hops_taken,
            "badges": self.badges,
            "node_count": len(self.nodes),
            "edge_count": len(self.edges),
            "completed": self.completed,
        }


# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------
_sessions: dict[str, GameSession] = {}


def create_session(
    mode: PlayMode,
    seed_concept: str,
    quest_target: Optional[str] = None,
) -> GameSession:
    session_id = str(uuid.uuid4())
    session = GameSession(
        session_id=session_id,
        mode=mode,
        seed_concept=seed_concept,
        quest_target=quest_target,
    )
    _sessions[session_id] = session
    return session


def get_session(session_id: str) -> Optional[GameSession]:
    return _sessions.get(session_id)


def update_session(session: GameSession) -> None:
    _sessions[session.session_id] = session


def delete_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def active_session_count() -> int:
    return len(_sessions)
