"""Lead CRUD, access control, and multi-tenant isolation tests."""
import secrets
from tests.conftest import make_org, make_user, make_lead, login
from app.models.user import UserRole


def test_create_lead(admin_client):
    client, user, org = admin_client
    resp = client.post("/api/leads/", json={"name": "John Doe", "mobile": "9876543210"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "John Doe"
    assert data["mobile"] == "9876543210"
    assert data["status"] == "new"


def test_create_lead_name_required(admin_client):
    client, _, _ = admin_client
    resp = client.post("/api/leads/", json={"mobile": "9876543210"})
    assert resp.status_code == 422


def test_create_lead_invalid_email(admin_client):
    client, _, _ = admin_client
    resp = client.post("/api/leads/", json={"name": "Bad Email", "email": "notanemail"})
    assert resp.status_code == 422


def test_list_leads_empty(admin_client):
    client, _, _ = admin_client
    resp = client.get("/api/leads/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_leads(admin_client, db):
    client, user, org = admin_client
    make_lead(db, org.id, user.id, name="Lead One")
    make_lead(db, org.id, user.id, name="Lead Two")
    resp = client.get("/api/leads/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_lead_by_id(admin_client, db):
    client, user, org = admin_client
    lead = make_lead(db, org.id, user.id, name="Specific Lead")
    resp = client.get(f"/api/leads/{lead.id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Specific Lead"


def test_get_lead_not_found(admin_client):
    client, _, _ = admin_client
    resp = client.get("/api/leads/999999")
    assert resp.status_code == 404


def test_update_lead(admin_client, db):
    client, user, org = admin_client
    lead = make_lead(db, org.id, user.id)
    resp = client.put(f"/api/leads/{lead.id}", json={"name": "Updated Name", "company": "Acme"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"
    assert resp.json()["company"] == "Acme"


def test_delete_lead(admin_client, db):
    client, user, org = admin_client
    lead = make_lead(db, org.id, user.id)
    resp = client.delete(f"/api/leads/{lead.id}")
    assert resp.status_code == 204
    # Confirm it's gone (soft-deleted)
    resp = client.get(f"/api/leads/{lead.id}")
    assert resp.status_code == 404


def test_lead_requires_auth(client):
    resp = client.get("/api/leads/")
    assert resp.status_code == 401


# ── Multi-tenant isolation ────────────────────────────────────────────────────

def test_cannot_access_other_org_lead(client, db):
    """Org A user cannot read Org B's lead."""
    org_a = make_org(db, name="Org A")
    org_b = make_org(db, name="Org B")
    user_a = make_user(db, org_a.id, email="a@test.com")
    user_b = make_user(db, org_b.id, email="b@test.com")
    lead_b = make_lead(db, org_b.id, user_b.id, name="Org B Secret Lead")

    token_a = login(client, email="a@test.com")
    client.headers.update({"Authorization": f"Bearer {token_a}"})

    resp = client.get(f"/api/leads/{lead_b.id}")
    assert resp.status_code == 403


def test_list_leads_scoped_to_org(client, db):
    """List endpoint only returns leads from the authenticated user's org."""
    org_a = make_org(db, name="Org A")
    org_b = make_org(db, name="Org B")
    user_a = make_user(db, org_a.id, email="lista@test.com")
    user_b = make_user(db, org_b.id, email="listb@test.com")

    make_lead(db, org_a.id, user_a.id, name="Org A Lead")
    make_lead(db, org_b.id, user_b.id, name="Org B Lead")

    token_a = login(client, email="lista@test.com")
    client.headers.update({"Authorization": f"Bearer {token_a}"})

    resp = client.get("/api/leads/")
    assert resp.status_code == 200
    names = [l["name"] for l in resp.json()]
    assert "Org A Lead" in names
    assert "Org B Lead" not in names


# ── Role-based access ─────────────────────────────────────────────────────────

def test_regular_user_only_sees_assigned_leads(client, db):
    """UserRole.USER only sees leads assigned to them."""
    org = make_org(db, name="Role Org")
    admin = make_user(db, org.id, email="roleadmin@test.com", role=UserRole.ADMIN)
    regular = make_user(db, org.id, email="roleuser@test.com", role=UserRole.USER)

    lead_assigned = make_lead(db, org.id, admin.id, name="Assigned Lead")
    lead_assigned.assigned_to_id = regular.id
    lead_unassigned = make_lead(db, org.id, admin.id, name="Unassigned Lead")
    db.commit()

    token = login(client, email="roleuser@test.com")
    client.headers.update({"Authorization": f"Bearer {token}"})

    resp = client.get("/api/leads/")
    assert resp.status_code == 200
    names = [l["name"] for l in resp.json()]
    assert "Assigned Lead" in names
    assert "Unassigned Lead" not in names


# ── Plan limits ───────────────────────────────────────────────────────────────

def test_free_plan_lead_limit(client, db):
    """Free plan blocks creating the 26th lead."""
    org = make_org(db, name="Free Org", plan="free")
    user = make_user(db, org.id, email="free@test.com")

    # Create 25 leads directly
    for i in range(25):
        make_lead(db, org.id, user.id, name=f"Lead {i}", mobile=f"98765{i:05d}")

    token = login(client, email="free@test.com")
    client.headers.update({"Authorization": f"Bearer {token}"})

    resp = client.post("/api/leads/", json={"name": "One Too Many", "mobile": "9000000001"})
    assert resp.status_code == 403
