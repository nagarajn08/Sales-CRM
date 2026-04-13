from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
from app.database import Base, engine, SessionLocal
import app.models  # ensure all models are registered before create_all
from app.routers import auth, users, leads, dashboard, templates, notifications, settings as settings_router

app = FastAPI(title="Sales CRM API", version="1.0.0")

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


def seed_admin():
    from app.models.user import User, UserRole
    from app.services.auth_service import hash_password
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.role == UserRole.ADMIN).first():
            admin = User(
                email=settings.ADMIN_EMAIL,
                name=settings.ADMIN_NAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
            print(f"Admin created: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
    finally:
        db.close()


def run_notification_job():
    from app.services.notification_service import trigger_due_notifications
    db = SessionLocal()
    try:
        trigger_due_notifications(db)
    finally:
        db.close()


def run_migrations():
    """Add any missing columns to existing tables (safe to run repeatedly)."""
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)
        # leads table — add web_id if missing
        existing = [c["name"] for c in inspector.get_columns("leads")]
        if "web_id" not in existing:
            conn.execute(text("ALTER TABLE leads ADD COLUMN web_id VARCHAR"))
            conn.commit()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        run_migrations()
    except Exception:
        pass  # table may not exist yet on first run
    seed_admin()
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_notification_job, "interval", minutes=5)
    scheduler.start()


@app.get("/")
def root():
    return {"status": "ok", "app": "Sales CRM API"}
