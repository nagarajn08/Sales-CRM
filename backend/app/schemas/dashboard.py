from pydantic import BaseModel
from app.schemas.lead import LeadRead


class UserStats(BaseModel):
    user_id: int
    user_name: str
    total_leads: int
    new: int
    call_back: int
    interested_call_back: int
    busy: int
    not_reachable: int
    not_interested: int
    converted: int
    overdue_followups: int


class SourceCount(BaseModel):
    source: str
    count: int


class StatusCount(BaseModel):
    status: str
    label: str
    count: int


class DashboardStats(BaseModel):
    # ── Core counts ───────────────────────────────
    total_leads: int
    active_leads: int
    converted_today: int
    converted_this_week: int
    overdue_followups: int
    new_leads_today: int
    new_leads_this_week: int
    not_interested_today: int

    # ── Follow-up pipeline ────────────────────────
    followups_due_today: int        # scheduled for today (past or future today)
    followups_overdue: int          # past due, not today
    followups_done_today: int       # status_changed activities done today
    activities_today: int           # all activity actions today

    # ── Breakdowns ────────────────────────────────
    leads_by_source_today: list[SourceCount]
    leads_by_source_all: list[SourceCount]
    status_breakdown: list[StatusCount]

    # ── Conversion ────────────────────────────────
    conversion_rate: float          # converted / total * 100

    # ── Lists ─────────────────────────────────────
    user_stats: list[UserStats]
    due_followups: list[LeadRead]   # overdue + due today, soonest first
