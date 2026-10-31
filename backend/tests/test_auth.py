"""
Tests for JWT Authentication System
====================================
Validates register, login, password security, invalid tokens, /api/auth/me, and progress persistence.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import hash_password, verify_password, decode_access_token

client = TestClient(app)


def test_password_hashing():
    pw = "supersecret123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrongpw", hashed) is False


def test_register_and_login_flow():
    # 1. Register
    reg_resp = client.post("/api/auth/register", json={
        "username": "arpit_tester",
        "password": "mypassword456",
        "display_name": "Arpit Tester"
    })
    # If user already exists in test runs, check status
    if reg_resp.status_code == 400:
        pass
    else:
        assert reg_resp.status_code == 200
        data = reg_resp.json()
        assert "access_token" in data
        assert data["user"]["username"] == "arpit_tester"

    # 2. Login
    login_resp = client.post("/api/auth/login", json={
        "username": "arpit_tester",
        "password": "mypassword456"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    token = login_data["access_token"]
    assert token is not None

    # 3. Access Protected /me with Bearer token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "arpit_tester"

    # 4. Save and verify user-specific progress
    prog_resp = client.post(
        "/api/auth/progress",
        json={"total_score": 125, "max_level": 3},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert prog_resp.status_code == 200
    prog_data = prog_resp.json()
    assert prog_data["total_score"] >= 125
    assert prog_data["max_level"] >= 3


def test_login_invalid_password_fails():
    client.post("/api/auth/register", json={
        "username": "unique_user_99",
        "password": "validpassword"
    })
    bad_resp = client.post("/api/auth/login", json={
        "username": "unique_user_99",
        "password": "completelywrongpassword"
    })
    assert bad_resp.status_code == 401


def test_protected_route_without_token_fails():
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
