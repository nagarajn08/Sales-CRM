from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database import Base


class PlatformConfig(Base):
    """Platform-level key-value config (not tied to any org). Used for pricing overrides etc."""
    __tablename__ = "platform_config"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
