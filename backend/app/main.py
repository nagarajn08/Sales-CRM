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
from app.routers import superadmin
from app.routers import billing

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
app.include_router(superadmin.router)
app.include_router(billing.router)


def create_performance_indexes():
    """Add composite indexes that dramatically speed up dashboard and list queries."""
    from sqlalchemy import text
    is_pg = not settings.DATABASE_URL.startswith("sqlite")
    indexes = [
        # leads — cover the most common WHERE clauses
        "CREATE INDEX IF NOT EXISTS ix_leads_org_active       ON leads (organization_id, is_active)",
        "CREATE INDEX IF NOT EXISTS ix_leads_org_status       ON leads (organization_id, status)",
        "CREATE INDEX IF NOT EXISTS ix_leads_org_created      ON leads (organization_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_leads_org_updated      ON leads (organization_id, updated_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_leads_assigned_status  ON leads (assigned_to_id, status)",
        # partial index on followup (only non-null rows) — PG only
        *(["CREATE INDEX IF NOT EXISTS ix_leads_followup ON leads (next_followup_at) WHERE next_followup_at IS NOT NULL"] if is_pg else []),
        # lead_activities
        "CREATE INDEX IF NOT EXISTS ix_activities_lead_created  ON lead_activities (lead_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_activities_type_created  ON lead_activities (activity_type, created_at DESC)",
        # notifications
        "CREATE INDEX IF NOT EXISTS ix_notif_user_read ON notifications (user_id, is_read)",
    ]
    with engine.connect() as conn:
        for sql in indexes:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()


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
        add_col("leads", "last_comment", "TEXT")
        add_col("leads", "tags", "TEXT")
        add_col("leads", "deal_value", "DOUBLE PRECISION")
        add_col("leads", "score", "INTEGER DEFAULT 0")

        # user_sessions (created by SQLAlchemy metadata, no manual columns needed)

        # users
        add_col("users", "organization_id", "INTEGER")
        add_col("users", "is_owner", "BOOLEAN DEFAULT FALSE")
        add_col("users", "is_superadmin", "BOOLEAN DEFAULT FALSE")

        # app_settings
        add_col("app_settings", "organization_id", "INTEGER")

        # email_templates
        add_col("email_templates", "organization_id", "INTEGER")
        add_col("email_templates", "is_predefined", "BOOLEAN DEFAULT FALSE")


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
                is_superadmin=True,
            )
            db.add(admin)
            db.commit()
            print(f"Super admin created: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        else:
            # Ensure existing admin has superadmin flag and org assigned
            changed = False
            if not admin.organization_id:
                admin.organization_id = default_org.id
                admin.is_owner = True
                changed = True
            if not admin.is_superadmin:
                admin.is_superadmin = True
                changed = True
            if changed:
                db.commit()
                print(f"Updated admin: {admin.email} → superadmin=True")
        from app.services.template_seeder import seed_predefined_templates
        seed_predefined_templates(db, default_org.id)
        from app.services.billing_service import get_or_create_subscription
        get_or_create_subscription(db, default_org.id)
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
    create_performance_indexes()
    seed_admin()
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_notification_job, "interval", minutes=1)
    scheduler.start()


@app.get("/")
def root():
    return {"status": "ok", "app": "Sales CRM API", "version": "2.0.0"}
