from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class UserSession(Base):
    __tablename__ = "user_sessions"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, nullable=True, index=True)
    login_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    logout_at      = Column(DateTime, nullable=True)
    ip_address     = Column(String, nullable=True)

    user = relationship("User", back_populates="sessions")
