from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.lead import LeadStatus, LeadPriority, LeadSource
from app.schemas.user import UserSummary


class LeadCreate(BaseModel):
    name: str = Field(..., max_length=200)
    email: EmailStr | None = None
    mobile: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip()

    @field_validator("mobile", "whatsapp")
    @classmethod
    def digits_only(cls, v: str | None) -> str | None:
        if v is not None and v.strip() and not v.strip().lstrip("+").isdigit():
            raise ValueError("Must contain only digits")
        return v
    company: str | None = Field(None, max_length=200)
    notes: str | None = Field(None, max_length=5000)
    priority: LeadPriority = LeadPriority.WARM
    source: LeadSource = LeadSource.MANUAL
    assigned_to_id: int | None = None
    tags: str | None = Field(None, max_length=500)
    deal_value: float | None = Field(None, ge=0)


class LeadUpdate(BaseModel):
    web_id: str | None = None
    name: str | None = Field(None, max_length=200)
    email: str | None = None
    mobile: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    company: str | None = Field(None, max_length=200)
    notes: str | None = Field(None, max_length=5000)
    priority: LeadPriority | None = None
    tags: str | None = Field(None, max_length=500)
    deal_value: float | None = Field(None, ge=0)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip() if v else v


class LeadStatusUpdate(BaseModel):
    status: LeadStatus
    comment: str | None = Field(None, max_length=2000)
    next_followup_at: datetime | None = None


class LeadReassign(BaseModel):
    assigned_to_id: int


class BulkActionRequest(BaseModel):
    lead_ids: List[int]
    action: Literal["status", "reassign", "delete"]
    status: LeadStatus | None = None
    assigned_to_id: int | None = None


class CallLogRequest(BaseModel):
    call_type: Literal["inbound", "outbound"] = "outbound"
    duration_minutes: int | None = Field(None, ge=0, le=600)
    outcome: Literal["answered", "no_answer", "busy", "voicemail"] | None = None
    notes: str | None = Field(None, max_length=2000)


class LeadRead(BaseModel):
    id: int
    web_id: str | None
    name: str
    email: str | None
    mobile: str | None
    whatsapp: str | None
    company: str | None
    notes: str | None
    status: LeadStatus
    priority: LeadPriority
    source: LeadSource
    campaign_name: str | None = None
    tags: str | None = None
    deal_value: float | None = None
    score: int | None = None
    assigned_to: UserSummary | None
    created_by: UserSummary
    next_followup_at: datetime | None
    last_comment: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ActivityRead(BaseModel):
    id: int
    activity_type: str
    old_status: str | None
    new_status: str | None
    comment: str | None
    followup_date: datetime | None
    meta: str | None
    user: UserSummary
    created_at: datetime

    model_config = {"from_attributes": True}
