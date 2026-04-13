from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.lead import Lead, LeadStatus
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardStats, UserStats
from app.schemas.lead import LeadRead

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime.combine(date.today(), datetime.min.time())

    def count(q):
        return q.count()

    if current_user.role == UserRole.USER:
        base = db.query(Lead).filter(Lead.assigned_to_id == current_user.id)
    else:
        base = db.query(Lead)

    total = count(base)
    active = count(base.filter(Lead.is_active == True))
    converted_today = count(base.filter(Lead.status == LeadStatus.CONVERTED, Lead.updated_at >= today_start))
    new_today = count(base.filter(Lead.created_at >= today_start))
    overdue = count(base.filter(Lead.next_followup_at <= now, Lead.next_followup_at.isnot(None), Lead.is_active == True))

    due_leads = base.filter(Lead.next_followup_at <= now, Lead.is_active == True).order_by(Lead.next_followup_at).limit(20).all()

    user_stats = []
    if current_user.role in (UserRole.ADMIN, UserRole.MANAGER):
        from app.models.user import User as UserModel
        users = db.query(UserModel).filter(UserModel.role == UserRole.USER, UserModel.is_active == True).all()
        for u in users:
            ub = db.query(Lead).filter(Lead.assigned_to_id == u.id)
            user_stats.append(UserStats(
                user_id=u.id, user_name=u.name,
                total_leads=count(ub),
                new=count(ub.filter(Lead.status == LeadStatus.NEW)),
                call_back=count(ub.filter(Lead.status == LeadStatus.CALL_BACK)),
                busy=count(ub.filter(Lead.status == LeadStatus.BUSY)),
                not_reachable=count(ub.filter(Lead.status == LeadStatus.NOT_REACHABLE)),
                not_interested=count(ub.filter(Lead.status == LeadStatus.NOT_INTERESTED)),
                converted=count(ub.filter(Lead.status == LeadStatus.CONVERTED)),
                overdue_followups=count(ub.filter(Lead.next_followup_at <= now, Lead.is_active == True)),
            ))

    return DashboardStats(
        total_leads=total, active_leads=active,
        converted_today=converted_today, overdue_followups=overdue,
        new_leads_today=new_today, user_stats=user_stats,
        due_followups=due_leads,
    )
