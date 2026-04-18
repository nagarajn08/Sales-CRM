"""User management tests — list, create, deactivate, role checks."""
from tests.conftest import make_org, make_user, login
from app.models.user import UserRole


def test_admin_can_list_users(admin_client, db):
    client, user, org = admin_client
    make_user(db, org.id, email="member@test.com", role=UserRole.USER)
    resp = client.get("/api/users/")
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert user.email in emails
    assert "member@test.com" in emails


def test_regular_user_cannot_list_users(client, db):
    org = make_org(db, name="User Org")
    make_user(db, org.id, email="regularuser@test.com", role=UserRole.USER)
    token = login(client, email="regularuser@test.com")
    client.headers.update({"Authorization": f"Bearer {token}"})
    resp = client.get("/api/users/")
    assert resp.status_code == 403


def test_admin_can_create_user(admin_client):
    client, _, _ = admin_client
    resp = client.post("/api/users/", json={
        "name": "New Member",
        "email": "newmember@test.com",
        "password": "Member@1234",
        "role": "user",
    })
    assert resp.status_code == 201
    assert resp.json()["email"] == "newmember@test.com"
    assert resp.json()["role"] == "user"


def test_duplicate_email_rejected(admin_client, db):
    client, user, org = admin_client
    make_user(db, org.id, email="dup@test.com", role=UserRole.USER)
    resp = client.post("/api/users/", json={
        "name": "Duplicate",
        "email": "dup@test.com",
        "password": "Dup@1234",
        "role": "user",
    })
    assert resp.status_code == 409


def test_admin_can_deactivate_user(admin_client, db):
    client, _, org = admin_client
    member = make_user(db, org.id, email="deactivate@test.com", role=UserRole.USER)
    resp = client.put(f"/api/users/{member.id}", json={"is_active": False})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


def test_users_scoped_to_org(client, db):
    """Admin of org A cannot see org B's users."""
    org_a = make_org(db, name="Org A")
    org_b = make_org(db, name="Org B")
    make_user(db, org_a.id, email="admina@test.com", role=UserRole.ADMIN)
    make_user(db, org_b.id, email="adminb@test.com", role=UserRole.ADMIN)

    token = login(client, email="admina@test.com")
    client.headers.update({"Authorization": f"Bearer {token}"})

    resp = client.get("/api/users/")
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert "admina@test.com" in emails
    assert "adminb@test.com" not in emails


def test_unauthenticated_cannot_access_users(client):
    resp = client.get("/api/users/")
    assert resp.status_code == 401
