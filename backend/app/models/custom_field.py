import enum
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from app.database import Base


class FieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    DROPDOWN = "dropdown"
    CHECKBOX = "checkbox"


class CustomFieldDef(Base):
    __tablename__ = "custom_field_defs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String, nullable=False)          # internal key, e.g. "budget_range"
    label = Column(String, nullable=False)          # display label, e.g. "Budget Range"
    field_type = Column(SQLEnum(FieldType), nullable=False, default=FieldType.TEXT)
    options = Column(Text, nullable=True)           # JSON array for dropdown: ["Option A","Option B"]
    required = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
