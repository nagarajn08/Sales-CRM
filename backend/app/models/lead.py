import enum
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CALL_BACK = "call_back"
    BUSY = "busy"
    NOT_REACHABLE = "not_reachable"
    NOT_INTERESTED = "not_interested"
    CONVERTED = "converted"


class LeadPriority(str, enum.Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


class LeadSource(str, enum.Enum):
    MANUAL = "manual"
    IMPORT = "import"
    WEBSITE = "website"
    REFERENCE = "reference"
    COLD_CALL = "cold_call"
    OTHER = "other"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    web_id = Column(String, nullable=True, index=True)  # External website/portal ID
    name = Column(String, nullable=False)
    email = Column(String, nullable=True, index=True)
    mobile = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    company = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    status = Column(SQLEnum(LeadStatus), default=LeadStatus.NEW, nullable=False)
    priority = Column(SQLEnum(LeadPriority), default=LeadPriority.WARM, nullable=False)
    source = Column(SQLEnum(LeadSource), default=LeadSource.MANUAL, nullable=False)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    next_followup_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_leads")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_leads")
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan", order_by="LeadActivity.created_at")
    notifications = relationship("Notification", back_populates="lead", cascade="all, delete-orphan")
