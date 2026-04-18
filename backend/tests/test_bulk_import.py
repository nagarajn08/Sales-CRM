"""Tests for bulk actions, CSV import, and dashboard stats."""
import io
import csv
from tests.conftest import make_org, make_user, make_lead, login
from app.models.user import UserRole


# ── Bulk actions ──────────────────────────────────────────────────────────────

def test_bulk_status_change(admin_client, db):
    client, user, org = admin_client
    l1 = make_lead(db, org.id, user.id, name="Bulk Lead 1", mobile="9000000001")
    l2 = make_lead(db, org.id, user.id, name="Bulk Lead 2", mobile="9000000002")
    resp = client.post("/api/leads/bulk", json={
        "lead_ids": [l1.id, l2.id],
        "action": "status",
        "status": "converted",
    })
    assert resp.status_code == 200
    assert resp.json()["affected"] == 2


def test_bulk_delete(admin_client, db):
    client, user, org = admin_client
    l1 = make_lead(db, org.id, user.id, name="Del Lead 1", mobile="9100000001")
    l2 = make_lead(db, org.id, user.id, name="Del Lead 2", mobile="9100000002")
    resp = client.post("/api/leads/bulk", json={
        "lead_ids": [l1.id, l2.id],
        "action": "delete",
    })
    assert resp.status_code == 200
    assert resp.json()["affected"] == 2
    # Confirm soft-deleted
    resp = client.get(f"/api/leads/{l1.id}")
    assert resp.status_code == 404


def test_bulk_reassign(admin_client, db):
    client, user, org = admin_client
    other = make_user(db, org.id, email="reassign_target@test.com", role=UserRole.USER)
    lead = make_lead(db, org.id, user.id, name="Reassign Lead", mobile="9200000001")
    resp = client.post("/api/leads/bulk", json={
        "lead_ids": [lead.id],
        "action": "reassign",
        "assigned_to_id": other.id,
    })
    assert resp.status_code == 200
    assert resp.json()["affected"] == 1


def test_bulk_invalid_action_rejected(admin_client):
    client, _, _ = admin_client
    resp = client.post("/api/leads/bulk", json={
        "lead_ids": [1],
        "action": "hack",
    })
    assert resp.status_code == 422


def test_bulk_non_admin_cannot_delete(client, db):
    org = make_org(db, name="Bulk Org")
    admin = make_user(db, org.id, email="badmin@test.com", role=UserRole.ADMIN)
    regular = make_user(db, org.id, email="buser@test.com", role=UserRole.USER)
    lead = make_lead(db, org.id, admin.id, name="Protected Lead", mobile="9300000001")
    lead.assigned_to_id = regular.id
    db.commit()

    token = login(client, email="buser@test.com")
    client.headers.update({"Authorization": f"Bearer {token}"})
    resp = client.post("/api/leads/bulk", json={"lead_ids": [lead.id], "action": "delete"})
    assert resp.status_code == 403


# ── CSV Import ─────────────────────────────────────────────────────────────────

def _make_csv(rows: list[dict]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode()


def test_import_csv(admin_client):
    client, _, _ = admin_client
    data = _make_csv([
        {"name": "Import One", "mobile": "9400000001", "email": "imp1@test.com", "status": "new"},
        {"name": "Import Two", "mobile": "9400000002", "email": "imp2@test.com", "status": "converted"},
    ])
    resp = client.post(
        "/api/leads/import",
        files={"file": ("leads.csv", data, "text/csv")},
    )
    assert resp.status_code == 201
    assert resp.json()["imported"] == 2
    assert resp.json()["skipped"] == 0


def test_import_skips_nameless_rows(admin_client):
    client, _, _ = admin_client
    data = _make_csv([
        {"name": "Valid Lead", "mobile": "9500000001"},
        {"name": "",           "mobile": "9500000002"},
    ])
    resp = client.post(
        "/api/leads/import",
        files={"file": ("leads.csv", data, "text/csv")},
    )
    assert resp.status_code == 201
    assert resp.json()["imported"] == 1
    assert resp.json()["skipped"] == 1


def test_import_rejects_non_csv(admin_client):
    client, _, _ = admin_client
    resp = client.post(
        "/api/leads/import",
        files={"file": ("leads.txt", b"not a csv", "text/plain")},
    )
    assert resp.status_code == 400


# ── Dashboard ─────────────────────────────────────────────────────────────────

def test_dashboard_stats(admin_client, db):
    client, user, org = admin_client
    make_lead(db, org.id, user.id, name="D Lead 1", mobile="9600000001")
    make_lead(db, org.id, user.id, name="D Lead 2", mobile="9600000002")
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_leads" in data
    assert data["total_leads"] >= 2
    assert "converted_leads" in data
    assert "followups_today" in data


def test_dashboard_trends(admin_client):
    client, _, _ = admin_client
    resp = client.get("/api/dashboard/trends", params={"days": 7})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_dashboard_requires_auth(client):
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 401


# ── OTP flow ──────────────────────────────────────────────────────────────────

def test_otp_request_new_email(client, db):
    """OTP request succeeds for an unregistered email."""
    resp = client.post("/api/auth/otp/request", json={
        "email": "newotp@test.com",
        "mobile": "9700000001",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "dev_email_otp" in data or data["email_sent"] is True or data["email_sent"] is False


def test_otp_request_duplicate_email_rejected(client, db):
    """OTP request fails if email is already registered."""
    org = make_org(db, name="OTP Org")
    make_user(db, org.id, email="exists@test.com")
    resp = client.post("/api/auth/otp/request", json={
        "email": "exists@test.com",
        "mobile": "9800000001",
    })
    assert resp.status_code == 409


def test_otp_verify_invalid_otp(client):
    """Wrong OTP is rejected."""
    resp = client.post("/api/auth/otp/verify", json={
        "email": "badotp@test.com",
        "mobile": "9900000001",
        "email_otp": "000000",
        "mobile_otp": "000000",
    })
    assert resp.status_code == 400


def test_password_reset_flow(client, db):
    """Full forgot-password → reset flow using dev OTP."""
    org = make_org(db, name="Reset Org")
    make_user(db, org.id, email="resetme@test.com")

    # Step 1: request OTP
    resp = client.post("/api/auth/forgot-password", json={"email": "resetme@test.com"})
    assert resp.status_code == 200
    dev_otp = resp.json().get("dev_otp")
    if not dev_otp:
        return  # SMTP configured — skip OTP extraction in test

    # Step 2: reset with OTP
    resp = client.post("/api/auth/reset-password", json={
        "email": "resetme@test.com",
        "otp": dev_otp,
        "new_password": "NewPass@9999",
    })
    assert resp.status_code == 200

    # Step 3: old password should no longer work
    resp = client.post("/api/auth/login", json={"email": "resetme@test.com", "password": "Test@1234"})
    assert resp.status_code == 401

    # Step 4: new password works
    resp = client.post("/api/auth/login", json={"email": "resetme@test.com", "password": "NewPass@9999"})
    assert resp.status_code == 200
