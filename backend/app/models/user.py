import enum
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    mobile = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_owner = Column(Boolean, default=False)
    is_superadmin = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")

    @property
    def org_name(self) -> str | None:
        return self.organization.name if self.organization else None

    @property
    def org_type(self) -> str | None:
        return self.organization.type.value if self.organization else None
    assigned_leads = relationship("Lead", foreign_keys="Lead.assigned_to_id", back_populates="assigned_to")
    created_leads = relationship("Lead", foreign_keys="Lead.created_by_id", back_populates="created_by")
    activities = relationship("LeadActivity", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    email_templates = relationship("EmailTemplate", back_populates="user")
