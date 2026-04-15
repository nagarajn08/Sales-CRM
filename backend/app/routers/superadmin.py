"""
Platform super-admin endpoints.
Only accessible to users with is_superadmin=True (admin@salescrm.com).
"""
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import require_platform_admin
from app.models.lead import Lead, LeadStatus
from app.models.organization import Organization, OrgType
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/superadmin", tags=["superadmin"])


# ── Response schemas ──────────────────────────────────────────────────────

class OrgSummary(BaseModel):
    id: int
    name: str
    type: OrgType
    is_active: bool
    created_at: datetime
    owner_email: str | None
    owner_name: str | None
    user_count: int
    lead_count: int
    active_lead_count: int
    converted_count: int
    model_config = {"from_attributes": True}


class OrgDetail(OrgSummary):
    webhook_token: str
    users: list[dict]


class PlatformStats(BaseModel):
    total_orgs: int
    individual_orgs: int
    corporate_orgs: int
    total_users: int
    total_leads: int
    active_leads: int
    converted_today: int
    new_orgs_today: int


# ── Helpers ───────────────────────────────────────────────────────────────

def _build_org_summary(org: Organization, db: Session) -> OrgSummary:
    owner = db.query(User).filter(
        User.organization_id == org.id,
        User.is_owner == True,
    ).first()
    user_count = db.query(User).filter(User.organization_id == org.id).count()
    leads = db.query(Lead).filter(Lead.organization_id == org.id)
    lead_count = leads.count()
    active_lead_count = leads.filter(Lead.is_active == True).count()
    converted_count = leads.filter(Lead.status == LeadStatus.CONVERTED).count()
    return OrgSummary(
        id=org.id,
        name=org.name,
        type=org.type,
        is_active=org.is_active,
        created_at=org.created_at,
        owner_email=owner.email if owner else None,
        owner_name=owner.name if owner else None,
        user_count=user_count,
        lead_count=lead_count,
        active_lead_count=active_lead_count,
        converted_count=converted_count,
    )


# ── Routes ────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStats)
def platform_stats(
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    return PlatformStats(
        total_orgs=db.query(Organization).count(),
        individual_orgs=db.query(Organization).filter(Organization.type == OrgType.INDIVIDUAL).count(),
        corporate_orgs=db.query(Organization).filter(Organization.type == OrgType.CORPORATE).count(),
        total_users=db.query(User).filter(User.is_superadmin == False).count(),
        total_leads=db.query(Lead).count(),
        active_leads=db.query(Lead).filter(Lead.is_active == True).count(),
        converted_today=db.query(Lead).filter(
            Lead.status == LeadStatus.CONVERTED,
            Lead.updated_at >= today_start,
        ).count(),
        new_orgs_today=db.query(Organization).filter(Organization.created_at >= today_start).count(),
    )


@router.get("/orgs", response_model=list[OrgSummary])
def list_orgs(
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    return [_build_org_summary(org, db) for org in orgs]


@router.get("/orgs/{org_id}", response_model=OrgDetail)
def get_org(
    org_id: int,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    summary = _build_org_summary(org, db)
    users = db.query(User).filter(User.organization_id == org_id).all()
    return OrgDetail(
        **summary.model_dump(),
        webhook_token=org.webhook_token,
        users=[
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "is_owner": u.is_owner,
                "last_login": u.last_login,
                "created_at": u.created_at,
            }
            for u in users
        ],
    )


@router.patch("/orgs/{org_id}/toggle")
def toggle_org(
    org_id: int,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.is_active = not org.is_active
    db.commit()
    return {"id": org.id, "is_active": org.is_active}
