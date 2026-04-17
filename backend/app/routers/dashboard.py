from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func, case, cast, Date
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
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end   = today_start + timedelta(days=1)
    week_start  = today_start - timedelta(days=today_start.weekday())

    org_id       = current_user.organization_id
    is_superadmin = current_user.is_superadmin

    # ── Base query scope ──────────────────────────────────────────────────
    if is_superadmin:
        org_base = db.query(Lead)
    else:
        org_base = db.query(Lead).filter(Lead.organization_id == org_id)

    if current_user.role == UserRole.USER:
        base = org_base.filter(Lead.assigned_to_id == current_user.id)
    else:
        base = org_base

    # ── 1. Core counts — single aggregate query ───────────────────────────
    agg = base.with_entities(
        func.count(Lead.id).label("total"),
        func.count(case((Lead.is_active == True, Lead.id))).label("active"),
        func.count(case((
            (Lead.status == LeadStatus.CONVERTED) & (Lead.updated_at >= today_start), Lead.id
        ))).label("converted_today"),
        func.count(case((
            (Lead.status == LeadStatus.CONVERTED) & (Lead.updated_at >= week_start), Lead.id
        ))).label("converted_week"),
        func.count(case((Lead.created_at >= today_start, Lead.id))).label("new_today"),
        func.count(case((Lead.created_at >= week_start, Lead.id))).label("new_week"),
        func.count(case((
            (Lead.status == LeadStatus.NOT_INTERESTED) & (Lead.updated_at >= today_start), Lead.id
        ))).label("not_interested_today"),
        func.count(case((
            (Lead.next_followup_at < today_start) &
            (Lead.next_followup_at != None) &
            (Lead.is_active == True), Lead.id
        ))).label("overdue"),
        func.count(case((
            (Lead.next_followup_at >= today_start) &
            (Lead.next_followup_at < today_end) &
            (Lead.is_active == True), Lead.id
        ))).label("due_today"),
    ).one()

    total               = agg.total
    active              = agg.active
    converted_today     = agg.converted_today
    converted_this_week = agg.converted_week
    new_today           = agg.new_today
    new_this_week       = agg.new_week
    not_interested_today = agg.not_interested_today
    followups_overdue   = agg.overdue
    followups_due_today = agg.due_today

    # ── 2. Activities today — single query with two counts ────────────────
    lead_ids_subq = base.with_entities(Lead.id).subquery()
    act_agg = db.query(
        func.count(LeadActivity.id).label("total"),
        func.count(case((
            LeadActivity.activity_type == ActivityType.STATUS_CHANGED, LeadActivity.id
        ))).label("status_changed"),
    ).filter(
        LeadActivity.lead_id.in_(lead_ids_subq),
        LeadActivity.created_at >= today_start,
    ).one()

    activities_today    = act_agg.total
    followups_done_today = act_agg.status_changed

    # ── 3. Source breakdown — 2 GROUP BY queries instead of 20 ───────────
    src_today_rows = (
        base.filter(Lead.created_at >= today_start)
        .with_entities(Lead.source, func.count(Lead.id))
        .group_by(Lead.source)
        .all()
    )
    src_all_rows = (
        base.with_entities(Lead.source, func.count(Lead.id))
        .group_by(Lead.source)
        .all()
    )
    source_today = sorted(
        [SourceCount(source=r[0].value, count=r[1]) for r in src_today_rows if r[1] > 0],
        key=lambda x: x.count, reverse=True
    )
    source_all = sorted(
        [SourceCount(source=r[0].value, count=r[1]) for r in src_all_rows if r[1] > 0],
        key=lambda x: x.count, reverse=True
    )

    # ── 4. Status breakdown — 1 GROUP BY query instead of 7 ──────────────
    status_rows = (
        base.filter(Lead.is_active == True)
        .with_entities(Lead.status, func.count(Lead.id))
        .group_by(Lead.status)
        .all()
    )
    status_map = {r[0]: r[1] for r in status_rows}
    status_breakdown = [
        StatusCount(status=st.value, label=STATUS_LABELS.get(st.value, st.value), count=cnt)
        for st in LeadStatus
        if (cnt := status_map.get(st, 0)) > 0
    ]

    # ── 5. Conversion rate ────────────────────────────────────────────────
    conversion_rate = round((converted_today / new_today * 100) if new_today else 0, 1)

    # ── 6. Deal value — 2 SUM queries ────────────────────────────────────
    val_base = db.query(Lead) if is_superadmin else db.query(Lead).filter(Lead.organization_id == org_id)
    pipeline_value = val_base.filter(
        Lead.is_active == True, Lead.deal_value.isnot(None),
    ).with_entities(func.coalesce(func.sum(Lead.deal_value), 0)).scalar() or 0.0

    converted_value = val_base.filter(
        Lead.status == LeadStatus.CONVERTED, Lead.deal_value.isnot(None),
    ).with_entities(func.coalesce(func.sum(Lead.deal_value), 0)).scalar() or 0.0

    # ── 7. Due follow-up leads ────────────────────────────────────────────
    due_leads = base.filter(
        Lead.next_followup_at <= today_end,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
    ).order_by(Lead.next_followup_at).limit(20).all()

    # ── 8. Team stats — 2 GROUP BY queries instead of N×8 ────────────────
    user_stats = []
    if current_user.role in (UserRole.ADMIN, UserRole.MANAGER):
        users = db.query(User).filter(
            User.organization_id == org_id,
            User.role == UserRole.USER,
            User.is_active == True,
        ).all()

        if users:
            uid_list = [u.id for u in users]

            # All status counts per user in one shot
            ustatus_rows = (
                org_base.filter(Lead.assigned_to_id.in_(uid_list))
                .with_entities(Lead.assigned_to_id, Lead.status, func.count(Lead.id))
                .group_by(Lead.assigned_to_id, Lead.status)
                .all()
            )
            # Overdue per user in one shot
            uoverdue_rows = (
                org_base.filter(
                    Lead.assigned_to_id.in_(uid_list),
                    Lead.next_followup_at < today_start,
                    Lead.next_followup_at.isnot(None),
                    Lead.is_active == True,
                )
                .with_entities(Lead.assigned_to_id, func.count(Lead.id))
                .group_by(Lead.assigned_to_id)
                .all()
            )

            # Build lookup dicts
            sc: dict[int, dict] = {u.id: {} for u in users}
            for uid, status, cnt in ustatus_rows:
                sc[uid][status] = cnt
            overdue_map = {uid: cnt for uid, cnt in uoverdue_rows}

            for u in users:
                counts = sc.get(u.id, {})
                user_stats.append(UserStats(
                    user_id=u.id,
                    user_name=u.name,
                    total_leads=sum(counts.values()),
                    new=counts.get(LeadStatus.NEW, 0),
                    call_back=counts.get(LeadStatus.CALL_BACK, 0),
                    interested_call_back=counts.get(LeadStatus.INTERESTED_CALL_BACK, 0),
                    busy=counts.get(LeadStatus.BUSY, 0),
                    not_reachable=counts.get(LeadStatus.NOT_REACHABLE, 0),
                    not_interested=counts.get(LeadStatus.NOT_INTERESTED, 0),
                    converted=counts.get(LeadStatus.CONVERTED, 0),
                    overdue_followups=overdue_map.get(u.id, 0),
                ))

    return DashboardStats(
        total_leads=total,
        active_leads=active,
        converted_today=converted_today,
        converted_this_week=converted_this_week,
        overdue_followups=followups_overdue + followups_due_today,
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
    """Daily trend: new leads and conversions for the last N days.
    Uses 2 GROUP BY queries instead of 2×N individual counts.
    """
    org_id    = current_user.organization_id
    today     = date.today()
    start_dt  = datetime.combine(today - timedelta(days=days - 1), datetime.min.time())

    base = db.query(Lead).filter(Lead.organization_id == org_id)
    if current_user.role == UserRole.USER:
        base = base.filter(Lead.assigned_to_id == current_user.id)

    # New leads grouped by date
    new_rows = (
        base.filter(Lead.created_at >= start_dt)
        .with_entities(cast(Lead.created_at, Date).label("d"), func.count(Lead.id))
        .group_by(cast(Lead.created_at, Date))
        .all()
    )
    # Converted leads grouped by updated_at date
    conv_rows = (
        base.filter(Lead.status == LeadStatus.CONVERTED, Lead.updated_at >= start_dt)
        .with_entities(cast(Lead.updated_at, Date).label("d"), func.count(Lead.id))
        .group_by(cast(Lead.updated_at, Date))
        .all()
    )

    new_map  = {r[0]: r[1] for r in new_rows}
    conv_map = {r[0]: r[1] for r in conv_rows}

    return [
        {
            "date": (today - timedelta(days=i)).strftime("%d %b"),
            "new": new_map.get(today - timedelta(days=i), 0),
            "converted": conv_map.get(today - timedelta(days=i), 0),
        }
        for i in range(days - 1, -1, -1)
    ]
