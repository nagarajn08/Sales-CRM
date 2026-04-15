import enum
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ActivityType(str, enum.Enum):
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    COMMENT = "comment"
    REASSIGNED = "reassigned"
    FOLLOWUP_SET = "followup_set"
    EMAIL_SENT = "email_sent"
    IMPORTED = "imported"
    CALL_LOG = "call_log"


class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    activity_type = Column(SQLEnum(ActivityType), nullable=False)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    followup_date = Column(DateTime, nullable=True)
    meta = Column(String, nullable=True)  # JSON string for extra info

    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="activities")
    user = relationship("User", back_populates="activities")
