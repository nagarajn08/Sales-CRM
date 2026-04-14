from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.lead import Lead, LeadStatus
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardStats, UserStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime.combine(date.today(), datetime.min.time())

    org_base = db.query(Lead).filter(Lead.organization_id == current_user.organization_id)

    if current_user.role == UserRole.USER:
        base = org_base.filter(Lead.assigned_to_id == current_user.id)
    else:
        base = org_base

    total = base.count()
    active = base.filter(Lead.is_active == True).count()
    converted_today = base.filter(
        Lead.status == LeadStatus.CONVERTED, Lead.updated_at >= today_start
    ).count()
    new_today = base.filter(Lead.created_at >= today_start).count()
    overdue = base.filter(
        Lead.next_followup_at <= now,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
    ).count()

    due_leads = base.filter(
        Lead.next_followup_at <= now, Lead.is_active == True
    ).order_by(Lead.next_followup_at).limit(20).all()

    user_stats = []
    if current_user.role in (UserRole.ADMIN, UserRole.MANAGER):
        users = db.query(User).filter(
            User.organization_id == current_user.organization_id,
            User.role == UserRole.USER,
            User.is_active == True,
        ).all()
        for u in users:
            ub = org_base.filter(Lead.assigned_to_id == u.id)
            user_stats.append(UserStats(
                user_id=u.id, user_name=u.name,
                total_leads=ub.count(),
                new=ub.filter(Lead.status == LeadStatus.NEW).count(),
                call_back=ub.filter(Lead.status == LeadStatus.CALL_BACK).count(),
                busy=ub.filter(Lead.status == LeadStatus.BUSY).count(),
                not_reachable=ub.filter(Lead.status == LeadStatus.NOT_REACHABLE).count(),
                not_interested=ub.filter(Lead.status == LeadStatus.NOT_INTERESTED).count(),
                converted=ub.filter(Lead.status == LeadStatus.CONVERTED).count(),
                overdue_followups=ub.filter(Lead.next_followup_at <= now, Lead.is_active == True).count(),
            ))

    return DashboardStats(
        total_leads=total, active_leads=active,
        converted_today=converted_today, overdue_followups=overdue,
        new_leads_today=new_today, user_stats=user_stats,
        due_followups=due_leads,
    )
