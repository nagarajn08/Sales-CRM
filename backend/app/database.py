from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL — proper connection pool
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=10,          # keep 10 persistent connections
        max_overflow=20,       # allow 20 extra under load
        pool_pre_ping=True,    # auto-reconnect if a connection drops
        pool_recycle=1800,     # recycle connections every 30 min
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
