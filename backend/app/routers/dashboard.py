from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.lead import Lead, LeadStatus, LeadSource
from app.models.lead_activity import LeadActivity, ActivityType
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardStats, UserStats, SourceCount, StatusCount

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

STATUS_LABELS = {
    "new": "New",
    "call_back": "Call Back",
    "interested_call_back": "Interested - Call Back",
    "busy": "Busy",
    "not_reachable": "Not Reachable",
    "not_interested": "Not Interested",
    "converted": "Converted",
}


@router.get("/stats", response_model=DashboardStats)
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = today_start + timedelta(days=1)
    week_start = today_start - timedelta(days=today_start.weekday())  # Monday

    org_id = current_user.organization_id
    org_base = db.query(Lead).filter(Lead.organization_id == org_id)

    if current_user.role == UserRole.USER:
        base = org_base.filter(Lead.assigned_to_id == current_user.id)
    else:
        base = org_base

    # ── Core counts ───────────────────────────────────────────────────────
    total = base.count()
    active = base.filter(Lead.is_active == True).count()

    converted_today = base.filter(
        Lead.status == LeadStatus.CONVERTED,
        Lead.updated_at >= today_start,
    ).count()

    converted_this_week = base.filter(
        Lead.status == LeadStatus.CONVERTED,
        Lead.updated_at >= week_start,
    ).count()

    new_today = base.filter(Lead.created_at >= today_start).count()
    new_this_week = base.filter(Lead.created_at >= week_start).count()

    not_interested_today = base.filter(
        Lead.status == LeadStatus.NOT_INTERESTED,
        Lead.updated_at >= today_start,
    ).count()

    # ── Follow-up pipeline ────────────────────────────────────────────────
    # Overdue = past due (before today start), still active
    followups_overdue = base.filter(
        Lead.next_followup_at < today_start,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
    ).count()

    # Due today = scheduled within today's window, still active
    followups_due_today = base.filter(
        Lead.next_followup_at >= today_start,
        Lead.next_followup_at < today_end,
        Lead.is_active == True,
    ).count()

    # Activities today scoped to org leads
    lead_ids_subq = base.with_entities(Lead.id).subquery()
    activities_today_q = db.query(LeadActivity).filter(
        LeadActivity.lead_id.in_(lead_ids_subq),
        LeadActivity.created_at >= today_start,
    )
    activities_today = activities_today_q.count()

    # Followups done today = status_changed activities today
    followups_done_today = activities_today_q.filter(
        LeadActivity.activity_type == ActivityType.STATUS_CHANGED,
    ).count()

    # ── Source breakdown ──────────────────────────────────────────────────
    source_today: list[SourceCount] = []
    source_all: list[SourceCount] = []
    for src in LeadSource:
        cnt_today = base.filter(
            Lead.source == src,
            Lead.created_at >= today_start,
        ).count()
        cnt_all = base.filter(Lead.source == src).count()
        if cnt_today > 0:
            source_today.append(SourceCount(source=src.value, count=cnt_today))
        if cnt_all > 0:
            source_all.append(SourceCount(source=src.value, count=cnt_all))

    source_today.sort(key=lambda x: x.count, reverse=True)
    source_all.sort(key=lambda x: x.count, reverse=True)

    # ── Status breakdown (active leads) ──────────────────────────────────
    status_breakdown: list[StatusCount] = []
    for st in LeadStatus:
        cnt = base.filter(Lead.status == st, Lead.is_active == True).count()
        if cnt > 0:
            status_breakdown.append(StatusCount(
                status=st.value,
                label=STATUS_LABELS.get(st.value, st.value),
                count=cnt,
            ))

    # ── Conversion rate ───────────────────────────────────────────────────
    conversion_rate = round((converted_today / new_today * 100) if new_today else 0, 1)

    # ── Deal value pipeline ───────────────────────────────────────────────
    pipeline_value = db.query(func.coalesce(func.sum(Lead.deal_value), 0)).filter(
        Lead.organization_id == org_id,
        Lead.is_active == True,
        Lead.deal_value.isnot(None),
    ).scalar() or 0.0

    converted_value = db.query(func.coalesce(func.sum(Lead.deal_value), 0)).filter(
        Lead.organization_id == org_id,
        Lead.status == LeadStatus.CONVERTED,
        Lead.deal_value.isnot(None),
    ).scalar() or 0.0

    # ── Due follow-up leads (overdue + due today, soonest first) ─────────
    due_leads = base.filter(
        Lead.next_followup_at <= today_end,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
    ).order_by(Lead.next_followup_at).limit(20).all()

    # ── Team / user stats ─────────────────────────────────────────────────
    user_stats = []
    if current_user.role in (UserRole.ADMIN, UserRole.MANAGER):
        users = db.query(User).filter(
            User.organization_id == org_id,
            User.role == UserRole.USER,
            User.is_active == True,
        ).all()
        for u in users:
            ub = org_base.filter(Lead.assigned_to_id == u.id)
            user_stats.append(UserStats(
                user_id=u.id,
                user_name=u.name,
                total_leads=ub.count(),
                new=ub.filter(Lead.status == LeadStatus.NEW).count(),
                call_back=ub.filter(Lead.status == LeadStatus.CALL_BACK).count(),
                interested_call_back=ub.filter(Lead.status == LeadStatus.INTERESTED_CALL_BACK).count(),
                busy=ub.filter(Lead.status == LeadStatus.BUSY).count(),
                not_reachable=ub.filter(Lead.status == LeadStatus.NOT_REACHABLE).count(),
                not_interested=ub.filter(Lead.status == LeadStatus.NOT_INTERESTED).count(),
                converted=ub.filter(Lead.status == LeadStatus.CONVERTED).count(),
                overdue_followups=ub.filter(
                    Lead.next_followup_at < today_start,
                    Lead.next_followup_at.isnot(None),
                    Lead.is_active == True,
                ).count(),
            ))

    return DashboardStats(
        total_leads=total,
        active_leads=active,
        converted_today=converted_today,
        converted_this_week=converted_this_week,
        overdue_followups=followups_overdue + followups_due_today,  # kept for backwards compat
        new_leads_today=new_today,
        new_leads_this_week=new_this_week,
        not_interested_today=not_interested_today,
        followups_due_today=followups_due_today,
        followups_overdue=followups_overdue,
        followups_done_today=followups_done_today,
        activities_today=activities_today,
        leads_by_source_today=source_today,
        leads_by_source_all=source_all,
        status_breakdown=status_breakdown,
        conversion_rate=conversion_rate,
        pipeline_value=float(pipeline_value),
        converted_value=float(converted_value),
        user_stats=user_stats,
        due_followups=due_leads,
    )


@router.get("/trends")
def get_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Daily trend: new leads and conversions for the last N days."""
    org_id = current_user.organization_id
    today = date.today()
    result = []

    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        d_start = datetime.combine(d, datetime.min.time())
        d_end = d_start + timedelta(days=1)

        base = db.query(Lead).filter(Lead.organization_id == org_id)
        if current_user.role == UserRole.USER:
            base = base.filter(Lead.assigned_to_id == current_user.id)

        new_count = base.filter(
            Lead.created_at >= d_start,
            Lead.created_at < d_end,
        ).count()

        converted_count = base.filter(
            Lead.status == LeadStatus.CONVERTED,
            Lead.updated_at >= d_start,
            Lead.updated_at < d_end,
        ).count()

        result.append({
            "date": d.strftime("%d %b"),
            "new": new_count,
            "converted": converted_count,
        })

    return result
