import enum
import secrets
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class OrgType(str, enum.Enum):
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(SQLEnum(OrgType), nullable=False)
    webhook_token = Column(String, unique=True, index=True, nullable=False,
                           default=lambda: secrets.token_urlsafe(24))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization")
    leads = relationship("Lead", back_populates="organization")
