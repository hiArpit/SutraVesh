"""
Authentication & JWT Security Utilities
=======================================
Password hashing with bcrypt & Token generation with PyJWT.
Supports live MongoDB storage with automatic local fallback.
"""

import os
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.db import get_database, is_mongo_available

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


def register_user(username: str, password: str, display_name: Optional[str] = None) -> dict:
    users = _load_users_file()
    username_clean = username.strip().lower()

    # Check existence
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
    }

    # Save to file backup
    users[username_clean] = user_data
    _save_users_file(users)

    # Save to MongoDB asynchronously in background if available
    db = get_database()
    if db is not None:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(db["users"].update_one(
                    {"username": username_clean},
                    {"$set": user_data},
                    upsert=True
                ))
        except Exception:
            pass

    return {
        "id": user_id,
        "username": username_clean,
        "display_name": user_data["display_name"],
    }


def authenticate_user(username: str, password: str) -> Optional[dict]:
    users = _load_users_file()
    username_clean = username.strip().lower()
    user = users.get(username_clean)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
    }


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
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
    users = _load_users_file()
    user = users.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "total_score": user.get("total_score", 0),
        "quests_completed": user.get("quests_completed", 0),
    }


def require_user(user: Optional[dict] = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
