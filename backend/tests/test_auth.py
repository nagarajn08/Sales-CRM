"""Auth endpoint tests — login, me, logout, token validation."""
from tests.conftest import make_org, make_user, login


def test_login_success(client, db):
    org = make_org(db)
    make_user(db, org.id, email="login@test.com")
    resp = client.post("/api/auth/login", json={"email": "login@test.com", "password": "Test@1234"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"


def test_login_wrong_password(client, db):
    org = make_org(db)
    make_user(db, org.id, email="wp@test.com")
    resp = client.post("/api/auth/login", json={"email": "wp@test.com", "password": "wrongpassword"})
    assert resp.status_code == 401


def test_login_nonexistent_email(client, db):
    resp = client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "Test@1234"})
    assert resp.status_code == 401


def test_login_inactive_user(client, db):
    from app.models.user import UserRole
    org = make_org(db)
    user = make_user(db, org.id, email="inactive@test.com")
    user.is_active = False
    db.commit()
    resp = client.post("/api/auth/login", json={"email": "inactive@test.com", "password": "Test@1234"})
    assert resp.status_code == 403


def test_me_authenticated(admin_client):
    client, user, _ = admin_client
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == user.email
    assert resp.json()["role"] == "admin"


def test_me_unauthenticated(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_invalid_token(client):
    client.headers.update({"Authorization": "Bearer invalidtoken"})
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_logout(admin_client):
    client, _, _ = admin_client
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 200
    assert "detail" in resp.json()
