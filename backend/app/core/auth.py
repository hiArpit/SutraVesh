"""
Authentication & JWT Security Utilities
=======================================
Password hashing with bcrypt & Token generation with PyJWT.
Primary storage is local MongoDB (database: sutravesh, collection: users),
with local users.json as automatic fault-tolerant backup.
"""

import os
import json
import uuid
import math
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.db import get_database

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
os.makedirs(DATA_DIR, exist_ok=True)

security = HTTPBearer(auto_error=False)


def _load_users_file() -> dict[str, dict]:
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_users_file(users: dict[str, dict]) -> None:
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
    except Exception:
        pass


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except (jwt.PyJWTError, Exception):
        return None


async def register_user(username: str, password: str, display_name: Optional[str] = None) -> dict:
    username_clean = username.strip().lower()

    # 1. Check MongoDB first
    try:
        db = get_database()
        if db is not None:
            existing = await db.users.find_one({"username": username_clean})
            if existing:
                raise HTTPException(status_code=400, detail="Username already registered")
    except HTTPException:
        raise
    except Exception:
        pass

    # 2. Check local file backup
    users = _load_users_file()
    if username_clean in users:
        raise HTTPException(status_code=400, detail="Username already registered")

    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "username": username_clean,
        "display_name": display_name or username.strip(),
        "password_hash": hash_password(password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_score": 0,
        "quests_completed": 0,
        "max_level": 1,
        "saved_nodes": [],
        "saved_edges": [],
        "captured_objects": [],
    }

    # Save to MongoDB
    try:
        db = get_database()
        if db is not None:
            await db.users.update_one(
                {"username": username_clean},
                {"$set": user_data},
                upsert=True
            )
    except Exception:
        pass

    # Save to backup file
    users[username_clean] = user_data
    _save_users_file(users)

    return {
        "id": user_id,
        "username": username_clean,
        "display_name": user_data["display_name"],
        "total_score": 0,
        "quests_completed": 0,
        "max_level": 1,
    }


async def authenticate_user(username: str, password: str) -> Optional[dict]:
    username_clean = username.strip().lower()
    user_doc = None

    # Check MongoDB first
    try:
        db = get_database()
        if db is not None:
            user_doc = await db.users.find_one({"username": username_clean})
    except Exception:
        pass

    # Fallback to local file if not found in MongoDB
    if not user_doc:
        users = _load_users_file()
        user_doc = users.get(username_clean)

    if not user_doc:
        return None

    if not verify_password(password, user_doc["password_hash"]):
        return None

    return {
        "id": user_doc["id"],
        "username": user_doc["username"],
        "display_name": user_doc["display_name"],
        "total_score": user_doc.get("total_score", 0),
        "quests_completed": user_doc.get("quests_completed", 0),
        "max_level": user_doc.get("max_level", 1),
    }


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token credentials",
        )
    username_clean = username.strip().lower()

    # Query MongoDB first
    user_doc = None
    try:
        db = get_database()
        if db is not None:
            user_doc = await db.users.find_one({"username": username_clean})
    except Exception:
        pass

    if not user_doc:
        users = _load_users_file()
        user_doc = users.get(username_clean)

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user_doc["id"],
        "username": user_doc["username"],
        "display_name": user_doc["display_name"],
        "total_score": user_doc.get("total_score", 0),
        "quests_completed": user_doc.get("quests_completed", 0),
        "max_level": user_doc.get("max_level", 1),
    }


def require_user(user: Optional[dict] = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def update_user_progress(
    username: str,
    total_score: Optional[int] = None,
    quests_completed: Optional[int] = None,
    max_level: Optional[int] = None,
) -> dict:
    username_clean = username.strip().lower()
    update_data: Dict[str, Any] = {}
    if total_score is not None:
        update_data["total_score"] = int(total_score)
    if quests_completed is not None:
        update_data["quests_completed"] = int(quests_completed)
    if max_level is not None:
        update_data["max_level"] = int(max_level)

    # Update MongoDB directly
    user_doc = None
    try:
        db = get_database()
        if db is not None:
            if update_data:
                await db.users.update_one(
                    {"username": username_clean},
                    {"$max": update_data}
                )
            user_doc = await db.users.find_one({"username": username_clean})
    except Exception:
        pass

    # Update local file backup
    users = _load_users_file()
    user = users.get(username_clean, {})
    if total_score is not None:
        user["total_score"] = max(user.get("total_score", 0), int(total_score))
    if quests_completed is not None:
        user["quests_completed"] = max(user.get("quests_completed", 0), int(quests_completed))
    if max_level is not None:
        user["max_level"] = max(user.get("max_level", 1), int(max_level))
    users[username_clean] = user
    _save_users_file(users)

    final_score = user_doc.get("total_score", user.get("total_score", 0)) if user_doc else user.get("total_score", 0)
    final_quests = user_doc.get("quests_completed", user.get("quests_completed", 0)) if user_doc else user.get("quests_completed", 0)
    final_level = user_doc.get("max_level", user.get("max_level", 1)) if user_doc else user.get("max_level", 1)

    return {
        "username": username_clean,
        "total_score": final_score,
        "quests_completed": final_quests,
        "max_level": final_level,
    }


async def get_user_map(username: str) -> dict:
    username_clean = username.strip().lower()

    # 1. Query MongoDB first
    try:
        db = get_database()
        if db is not None:
            doc = await db.users.find_one({"username": username_clean})
            if doc:
                return {
                    "nodes": doc.get("saved_nodes", []),
                    "edges": doc.get("saved_edges", []),
                    "captured_objects": doc.get("captured_objects", []),
                }
    except Exception:
        pass

    # 2. Fallback to users.json
    users = _load_users_file()
    user = users.get(username_clean)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "nodes": user.get("saved_nodes", []),
        "edges": user.get("saved_edges", []),
        "captured_objects": user.get("captured_objects", []),
    }


async def save_user_map(username: str, nodes: list, edges: list) -> dict:
    username_clean = username.strip().lower()

    # 1. Persist directly to MongoDB
    try:
        db = get_database()
        if db is not None:
            await db.users.update_one(
                {"username": username_clean},
                {"$set": {
                    "saved_nodes": nodes,
                    "saved_edges": edges,
                }},
                upsert=True
            )
    except Exception:
        pass

    # 2. Persist to backup users.json
    users = _load_users_file()
    if username_clean in users:
        users[username_clean]["saved_nodes"] = nodes
        users[username_clean]["saved_edges"] = edges
        _save_users_file(users)

    return {
        "nodes": nodes,
        "edges": edges,
    }


async def save_user_discovery(username: str, node: dict, edges: list, mode: str = "world") -> None:
    """
    Saves an object (node) and its respective relationships (edges) directly
    to the user's permanent document in MongoDB.
    Strict Separation: Discovery Map is reserved SOLELY for captured objects in World Mode!
    Quest Ladder levels (mode == 'quest') are goal-oriented puzzles and must NEVER write to saved_nodes or saved_edges!
    """
    if mode != "world":
        return
    username_clean = username.strip().lower()
    try:
        db = get_database()
        if db is None:
            return

        user_doc = await db.users.find_one({"username": username_clean})
        if not user_doc:
            return

        saved_nodes = user_doc.get("saved_nodes", [])
        saved_edges = user_doc.get("saved_edges", [])

        node_id = node.get("id")
        # Format as React Flow Node if raw Pydantic Node
        if "position" not in node:
            idx = len(saved_nodes)
            angle = (idx * 2 * math.pi) / 6
            radius = 180 + (idx // 6) * 90
            flow_node = {
                "id": node_id,
                "type": "bubble",
                "position": {
                    "x": 400 + radius * math.cos(angle),
                    "y": 300 + radius * math.sin(angle),
                },
                "data": {
                    "label": node.get("label"),
                    "category": node.get("category"),
                    "description": node.get("description"),
                    "what_is_it": node.get("what_is_it"),
                    "fun_fact": node.get("fun_fact"),
                    "try_this": node.get("try_this"),
                    "grade_level": node.get("grade_level"),
                    "image_url": node.get("image_url"),
                },
            }
        else:
            flow_node = node

        # Append node if not already present
        if not any(n.get("id") == node_id for n in saved_nodes):
            saved_nodes.append(flow_node)

        # Format and append respective relationships (edges)
        for e in edges:
            source = e.get("source")
            target = e.get("target")
            if source and target and not any(existing.get("source") == source and existing.get("target") == target for existing in saved_edges):
                flow_edge = {
                    "id": f"{source}-{target}",
                    "source": source,
                    "target": target,
                    "label": (e.get("relationship") or "")[:36],
                    "relationship": e.get("relationship", ""),
                    "connection_rule": e.get("connection_rule"),
                    "support": e.get("support", "association"),
                    "type": "smoothstep",
                    "animated": True,
                }
                saved_edges.append(flow_edge)

        # Update in MongoDB
        await db.users.update_one(
            {"username": username_clean},
            {
                "$set": {
                    "saved_nodes": saved_nodes,
                    "saved_edges": saved_edges,
                },
                "$push": {
                    "captured_objects": {
                        "object_id": node_id,
                        "label": node.get("label"),
                        "category": node.get("category"),
                        "mode": mode,
                        "relationships": [
                            {
                                "source": ed.get("source"),
                                "target": ed.get("target"),
                                "rule": ed.get("connection_rule"),
                                "relationship": ed.get("relationship"),
                            }
                            for ed in edges
                        ],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                }
            }
        )

        # Also backup to users.json
        users = _load_users_file()
        if username_clean in users:
            users[username_clean]["saved_nodes"] = saved_nodes
            users[username_clean]["saved_edges"] = saved_edges
            _save_users_file(users)
    except Exception as err:
        pass
