from pydantic import BaseModel
from app.schemas.lead import LeadRead


class UserStats(BaseModel):
    user_id: int
    user_name: str
    total_leads: int
    new: int
    call_back: int
    busy: int
    not_reachable: int
    not_interested: int
    converted: int
    overdue_followups: int


class DashboardStats(BaseModel):
    total_leads: int
    active_leads: int
    converted_today: int
    overdue_followups: int
    new_leads_today: int
    user_stats: list[UserStats]
    due_followups: list[LeadRead]
