"""
Authentication Routes
=====================
POST /api/auth/register  — Create a new account
POST /api/auth/login     — Sign in & obtain JWT access token
GET  /api/auth/me        — Get logged-in user profile
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import (
    register_user,
    authenticate_user,
    create_access_token,
    require_user,
    get_current_user,
)

auth_router = APIRouter(prefix="/api/auth", tags=["authentication"])


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=4)
    display_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    username: str
    password: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@auth_router.post("/register", response_model=AuthTokenResponse)
async def register(body: UserRegisterRequest):
    user = register_user(body.username, body.password, body.display_name)
    token = create_access_token({"sub": user["username"], "user_id": user["id"]})
    return AuthTokenResponse(access_token=token, user=user)


@auth_router.post("/login", response_model=AuthTokenResponse)
async def login(body: UserLoginRequest):
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": user["username"], "user_id": user["id"]})
    return AuthTokenResponse(access_token=token, user=user)


@auth_router.get("/me")
async def get_me(user: dict = Depends(require_user)):
    return user
