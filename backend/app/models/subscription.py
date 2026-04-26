import enum
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class PlanName(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    BUSINESS = "business"


class SubStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=False, index=True, unique=True)
    plan = Column(SQLEnum(PlanName), default=PlanName.FREE, nullable=False)
    status = Column(SQLEnum(SubStatus), default=SubStatus.ACTIVE, nullable=False)
    razorpay_subscription_id = Column(String, nullable=True, unique=True)
    razorpay_customer_id = Column(String, nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    leads_created = Column(Integer, default=0, nullable=False)  # total ever created; used for quota enforcement
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
