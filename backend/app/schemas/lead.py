from datetime import datetime
from pydantic import BaseModel
from app.models.lead import LeadStatus, LeadPriority, LeadSource
from app.schemas.user import UserSummary


class LeadCreate(BaseModel):
    name: str
    email: str | None = None
    mobile: str | None = None
    whatsapp: str | None = None
    company: str | None = None
    notes: str | None = None
    priority: LeadPriority = LeadPriority.WARM
    source: LeadSource = LeadSource.MANUAL
    assigned_to_id: int | None = None


class LeadUpdate(BaseModel):
    web_id: str | None = None
    name: str | None = None
    email: str | None = None
    mobile: str | None = None
    whatsapp: str | None = None
    company: str | None = None
    notes: str | None = None
    priority: LeadPriority | None = None


class LeadStatusUpdate(BaseModel):
    status: LeadStatus
    comment: str | None = None
    next_followup_at: datetime | None = None


class LeadReassign(BaseModel):
    assigned_to_id: int


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
