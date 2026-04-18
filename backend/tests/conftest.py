import secrets
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Disable rate limiting in all tests
from slowapi import Limiter
_no_limit = lambda *a, **kw: (lambda f: f)
patch.object(Limiter, "limit", _no_limit).start()

from app.database import Base, get_db
from app.main import app
from app.models.organization import Organization, OrgType
from app.models.user import User, UserRole
from app.models.lead import Lead
from app.models.subscription import Subscription, PlanName, SubStatus
from app.services.auth_service import hash_password

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(create_tables):
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db

    mock_scheduler = MagicMock()
    with patch("app.main.run_migrations"), \
         patch("app.main.create_performance_indexes"), \
         patch("app.main.seed_admin"), \
         patch("app.main.BackgroundScheduler", return_value=mock_scheduler):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c

    app.dependency_overrides.clear()


def make_org(db, name="Test Org", plan="pro"):
    org = Organization(
        name=name,
        type=OrgType.CORPORATE,
        webhook_token=secrets.token_urlsafe(24),
    )
    db.add(org)
    db.flush()
    sub = Subscription(organization_id=org.id, plan=PlanName(plan), status=SubStatus.ACTIVE)
    db.add(sub)
    db.flush()
    return org


def make_user(db, org_id, email="admin@test.com", password="Test@1234", role=UserRole.ADMIN):
    user = User(
        organization_id=org_id,
        email=email,
        name="Test User",
        hashed_password=hash_password(password),
        role=role,
        is_owner=(role == UserRole.ADMIN),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_lead(db, org_id, user_id, name="Test Lead", mobile="9876543210"):
    lead = Lead(
        organization_id=org_id,
        name=name,
        mobile=mobile,
        status="new",
        priority="warm",
        source="manual",
        created_by_id=user_id,
        is_active=True,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def login(client, email="admin@test.com", password="Test@1234"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def admin_client(client, db):
    org = make_org(db)
    user = make_user(db, org.id)
    token = login(client)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client, user, org
