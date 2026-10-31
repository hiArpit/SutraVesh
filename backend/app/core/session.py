"""
Persistent MongoDB & Local File Session Manager
===============================================
Stores active game sessions directly in MongoDB collection `sessions`
with automatic local disk backup and high-performance memory caching.
"""

import json
import os
import uuid
import asyncio
from typing import Optional
from app.schemas.graph import Node, Edge, PlayMode
from app.core.db import get_database

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")
os.makedirs(DATA_DIR, exist_ok=True)


class GameSession:
    def __init__(
        self,
        session_id: str,
        mode: PlayMode,
        seed_concept: str,
        quest_target: Optional[str] = None,
        total_points: int = 0,
        hops_taken: int = 0,
        hops_saved: int = 0,
        consecutive_established: int = 0,
        badges: list[str] = None,
        island_count: int = 0,
        completed: bool = False,
        current_node_id: Optional[str] = None,
        nodes: list[dict] = None,
        edges: list[dict] = None,
    ):
        self.session_id = session_id
        self.mode = mode
        self.quest_target = quest_target
        self.total_points = total_points
        self.hops_taken = hops_taken
        self.hops_saved = hops_saved
        self.consecutive_established = consecutive_established
        self.badges = badges or []
        self.island_count = island_count
        self.completed = completed
        self.current_node_id = current_node_id or seed_concept.lower().replace(" ", "_")

        self.nodes: list[Node] = [Node(**n) if isinstance(n, dict) else n for n in (nodes or [])]
        self.edges: list[Edge] = [Edge(**e) if isinstance(e, dict) else e for e in (edges or [])]

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "mode": self.mode,
            "quest_target": self.quest_target,
            "total_points": self.total_points,
            "hops_taken": self.hops_taken,
            "hops_saved": self.hops_saved,
            "consecutive_established": self.consecutive_established,
            "badges": self.badges,
            "island_count": self.island_count,
            "completed": self.completed,
            "current_node_id": self.current_node_id,
            "nodes": [n.model_dump() for n in self.nodes],
            "edges": [e.model_dump() for e in self.edges],
        }


def _load_all_sessions() -> dict[str, dict]:
    if not os.path.exists(SESSIONS_FILE):
        return {}
    try:
        with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_all_sessions(data: dict[str, dict]) -> None:
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


_SESSIONS_CACHE: dict[str, dict] = _load_all_sessions()


def _sync_to_mongo(session_data: dict) -> None:
    from app.core.db import is_mongo_available
    if not is_mongo_available():
        return
    db = get_database()
    if db is not None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(db["sessions"].update_one(
                {"session_id": session_data["session_id"]},
                {"$set": session_data},
                upsert=True
            ))
        except Exception:
            pass


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
    data = session.to_dict()
    _SESSIONS_CACHE[session_id] = data
    _save_all_sessions(_SESSIONS_CACHE)
    _sync_to_mongo(data)
    return session


def get_session(session_id: str) -> Optional[GameSession]:
    data = _SESSIONS_CACHE.get(session_id)
    if not data:
        return None
    return GameSession(
        session_id=data["session_id"],
        mode=data["mode"],
        seed_concept=data.get("current_node_id", "concept"),
        quest_target=data.get("quest_target"),
        total_points=data.get("total_points", 0),
        hops_taken=data.get("hops_taken", 0),
        hops_saved=data.get("hops_saved", 0),
        consecutive_established=data.get("consecutive_established", 0),
        badges=data.get("badges", []),
        island_count=data.get("island_count", 0),
        completed=data.get("completed", False),
        current_node_id=data.get("current_node_id"),
        nodes=data.get("nodes", []),
        edges=data.get("edges", []),
    )


def update_session(session: GameSession) -> None:
    data = session.to_dict()
    _SESSIONS_CACHE[session.session_id] = data
    _save_all_sessions(_SESSIONS_CACHE)
    _sync_to_mongo(data)


def delete_session(session_id: str) -> None:
    _SESSIONS_CACHE.pop(session_id, None)
    _save_all_sessions(_SESSIONS_CACHE)
    from app.core.db import is_mongo_available
    if is_mongo_available():
        db = get_database()
        if db is not None:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(db["sessions"].delete_one({"session_id": session_id}))
            except Exception:
                pass


def active_session_count() -> int:
    return len(_SESSIONS_CACHE)
