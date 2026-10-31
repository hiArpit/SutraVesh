import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import hash_password, verify_password

client = TestClient(app)


def test_password_hashing():
    pwd = "secret_password_123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_register_and_login_flow():
    unique_user = f"user_{uuid.uuid4().hex[:8]}"
    pwd = "mypassword123"

    # 1. Register a test user
    reg_resp = client.post("/api/auth/register", json={
        "username": unique_user,
        "password": pwd,
        "display_name": "Test User",
    })
    assert reg_resp.status_code == 200

    # 2. Login with credentials
    login_resp = client.post("/api/auth/login", json={
        "username": unique_user,
        "password": pwd,
    })
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == unique_user
    token = data["access_token"]

    # 3. Access protected route with Bearer token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == unique_user

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

    # 5. Save and verify user-specific map
    test_nodes = [{"id": "book", "label": "Book"}, {"id": "pen", "label": "Pen"}]
    test_edges = [{"source": "book", "target": "pen", "relationship": "Used together"}]
    save_map_resp = client.post(
        "/api/auth/map",
        json={"nodes": test_nodes, "edges": test_edges},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert save_map_resp.status_code == 200

    get_map_resp = client.get(
        "/api/auth/map",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_map_resp.status_code == 200
    map_data = get_map_resp.json()
    assert len(map_data["nodes"]) == 2
    assert len(map_data["edges"]) == 1


def test_login_invalid_password_fails():
    unique_user = f"user_{uuid.uuid4().hex[:8]}"
    client.post("/api/auth/register", json={
        "username": unique_user,
        "password": "validpassword"
    })
    bad_resp = client.post("/api/auth/login", json={
        "username": unique_user,
        "password": "completelywrongpassword"
    })
    assert bad_resp.status_code == 401


def test_protected_route_without_token_fails():
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401

    map_resp = client.get("/api/auth/map")
    assert map_resp.status_code == 401
