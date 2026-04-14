import secrets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
from app.database import Base, engine, SessionLocal
import app.models  # register all models
from app.routers import auth, users, leads, dashboard, templates, notifications
from app.routers import settings as settings_router
from app.routers import webhook

app = FastAPI(title="Sales CRM API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(leads.router)
app.include_router(dashboard.router)
app.include_router(templates.router)
app.include_router(notifications.router)
app.include_router(settings_router.router)
app.include_router(webhook.router)


def run_migrations():
    """Safely add any missing columns to existing tables."""
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        def add_col(table, col, col_type):
            if table not in tables:
                return
            existing = [c["name"] for c in inspector.get_columns(table)]
            if col not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()

        # leads
        add_col("leads", "web_id", "VARCHAR")
        add_col("leads", "organization_id", "INTEGER")
        add_col("leads", "campaign_name", "VARCHAR")

        # users
        add_col("users", "organization_id", "INTEGER")
        add_col("users", "is_owner", "BOOLEAN DEFAULT 0")

        # app_settings
        add_col("app_settings", "organization_id", "INTEGER")

        # email_templates
        add_col("email_templates", "organization_id", "INTEGER")


def seed_admin():
    from app.models.organization import Organization, OrgType
    from app.models.user import User, UserRole
    from app.services.auth_service import hash_password
    db = SessionLocal()
    try:
        # Check if a default org exists already
        default_org = db.query(Organization).first()
        if not default_org:
            default_org = Organization(
                name="SalesCRM Admin",
                type=OrgType.CORPORATE,
                webhook_token=secrets.token_urlsafe(24),
            )
            db.add(default_org)
            db.flush()

        # Create admin if no admin exists
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            admin = User(
                organization_id=default_org.id,
                email=settings.ADMIN_EMAIL,
                name=settings.ADMIN_NAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_owner=True,
            )
            db.add(admin)
            db.commit()
            print(f"Admin created: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        elif not admin.organization_id:
            # Existing admin without org — assign to default org
            admin.organization_id = default_org.id
            admin.is_owner = True
            db.commit()
            print(f"Assigned existing admin to org: {default_org.name}")
        else:
            db.commit()
    finally:
        db.close()


def run_notification_job():
    from app.services.notification_service import trigger_due_notifications
    db = SessionLocal()
    try:
        trigger_due_notifications(db)
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        run_migrations()
    except Exception as e:
        print(f"Migration warning: {e}")
    seed_admin()
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_notification_job, "interval", minutes=5)
    scheduler.start()


@app.get("/")
def root():
    return {"status": "ok", "app": "Sales CRM API", "version": "2.0.0"}
