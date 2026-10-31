"""
Authentication Routes
=====================
POST /api/auth/register  — Create a new account
POST /api/auth/login     — Sign in & obtain JWT access token
GET  /api/auth/me        — Get logged-in user profile
POST /api/auth/progress  — Save/sync user quest and score progress
GET  /api/auth/map       — Retrieve user's saved discovery map from MongoDB
POST /api/auth/map       — Save user's discovery map nodes and edges to MongoDB
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Any

from app.core.auth import (
    register_user,
    authenticate_user,
    create_access_token,
    require_user,
    get_current_user,
    update_user_progress,
    get_user_map,
    save_user_map,
)

auth_router = APIRouter(prefix="/api/auth", tags=["authentication"])


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=4)
    display_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UpdateProgressRequest(BaseModel):
    total_score: Optional[int] = None
    quests_completed: Optional[int] = None
    max_level: Optional[int] = None


class UserMapPayload(BaseModel):
    nodes: List[Any] = []
    edges: List[Any] = []


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@auth_router.post("/register", response_model=AuthTokenResponse)
async def register(body: UserRegisterRequest):
    user = await register_user(body.username, body.password, body.display_name)
    token = create_access_token({"sub": user["username"], "user_id": user["id"]})
    return AuthTokenResponse(access_token=token, user=user)


@auth_router.post("/login", response_model=AuthTokenResponse)
async def login(body: UserLoginRequest):
    user = await authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": user["username"], "user_id": user["id"]})
    return AuthTokenResponse(access_token=token, user=user)


@auth_router.get("/me")
async def get_me(user: dict = Depends(require_user)):
    return user


@auth_router.post("/progress")
async def save_progress(body: UpdateProgressRequest, user: dict = Depends(require_user)):
    updated = await update_user_progress(
        username=user["username"],
        total_score=body.total_score,
        quests_completed=body.quests_completed,
        max_level=body.max_level,
    )
    return updated


@auth_router.get("/map")
async def get_my_map(user: dict = Depends(require_user)):
    return await get_user_map(user["username"])


@auth_router.post("/map")
async def save_my_map(body: UserMapPayload, user: dict = Depends(require_user)):
    return await save_user_map(user["username"], body.nodes, body.edges)
