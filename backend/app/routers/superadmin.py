"""
Platform super-admin endpoints.
Only accessible to users with is_superadmin=True (admin@trackmylead.in).
"""
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.dependencies import require_platform_admin
from app.models.lead import Lead, LeadStatus
from app.models.organization import Organization, OrgType
from app.models.user import User, UserRole
from app.models.platform_config import PlatformConfig
from app.config import PLANS
from app.services.auth_service import hash_password

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


class OrgCreate(BaseModel):
    name: str
    type: OrgType


class SuperAdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    mobile: str | None = None
    role: UserRole = UserRole.USER
    organization_id: int | None = None
    is_owner: bool = False


class UserPatch(BaseModel):
    role: UserRole | None = None
    organization_id: int | None = None
    is_active: bool | None = None


class UserSummary(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    is_owner: bool
    organization_id: int | None
    org_name: str | None
    last_login: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


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


@router.post("/orgs", response_model=OrgSummary, status_code=status.HTTP_201_CREATED)
def create_org(
    body: OrgCreate,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    org = Organization(name=body.name.strip(), type=body.type)
    db.add(org)
    db.commit()
    db.refresh(org)
    return _build_org_summary(org, db)


@router.post("/users", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def create_user(
    body: SuperAdminUserCreate,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.organization_id:
        org = db.get(Organization, body.organization_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
    user = User(
        name=body.name.strip(),
        email=body.email.lower().strip(),
        hashed_password=hash_password(body.password),
        mobile=body.mobile,
        role=body.role,
        organization_id=body.organization_id,
        is_owner=body.is_owner,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    org = db.get(Organization, user.organization_id) if user.organization_id else None
    return UserSummary(
        id=user.id, name=user.name, email=user.email, role=user.role,
        is_active=user.is_active, is_owner=user.is_owner,
        organization_id=user.organization_id,
        org_name=org.name if org else None,
        last_login=user.last_login, created_at=user.created_at,
    )


@router.get("/users", response_model=list[UserSummary])
def list_users(
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.is_superadmin == False).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        org = db.get(Organization, u.organization_id) if u.organization_id else None
        result.append(UserSummary(
            id=u.id, name=u.name, email=u.email, role=u.role,
            is_active=u.is_active, is_owner=u.is_owner,
            organization_id=u.organization_id,
            org_name=org.name if org else None,
            last_login=u.last_login, created_at=u.created_at,
        ))
    return result


@router.patch("/users/{user_id}", response_model=UserSummary)
def patch_user(
    user_id: int,
    body: UserPatch,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user or user.is_superadmin:
        raise HTTPException(status_code=404, detail="User not found")
    if body.role is not None:
        user.role = body.role
    if body.organization_id is not None:
        org = db.get(Organization, body.organization_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        user.organization_id = body.organization_id
    if body.is_active is not None:
        user.is_active = body.is_active
    db.commit()
    db.refresh(user)
    org = db.get(Organization, user.organization_id) if user.organization_id else None
    return UserSummary(
        id=user.id, name=user.name, email=user.email, role=user.role,
        is_active=user.is_active, is_owner=user.is_owner,
        organization_id=user.organization_id,
        org_name=org.name if org else None,
        last_login=user.last_login, created_at=user.created_at,
    )


# ── Plan Pricing ──────────────────────────────────────────────────────────────

class PlanPricingUpdate(BaseModel):
    plan: str
    price: int
    original_price: int
    discount_pct: int


def _get_cfg(db: Session) -> dict:
    return {r.key: r.value for r in db.query(PlatformConfig).all()}


def _set_cfg(db: Session, key: str, value: str):
    row = db.get(PlatformConfig, key)
    if row:
        row.value = value
    else:
        db.add(PlatformConfig(key=key, value=value))


@router.get("/plan-pricing")
def get_plan_pricing(
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    cfg = _get_cfg(db)
    result = {}
    for plan_key, defaults in PLANS.items():
        result[plan_key] = {
            "price":          int(cfg.get(f"{plan_key}_price",          defaults["price"])),
            "original_price": int(cfg.get(f"{plan_key}_original_price", defaults["original_price"])),
            "discount_pct":   int(cfg.get(f"{plan_key}_discount_pct",   defaults["discount_pct"])),
            "name":           defaults["name"],
        }
    return result


@router.put("/plan-pricing")
def update_plan_pricing(
    body: PlanPricingUpdate,
    _: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan key")
    if body.price < 0 or body.original_price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")
    if not (0 <= body.discount_pct <= 100):
        raise HTTPException(status_code=400, detail="Discount must be 0-100")

    _set_cfg(db, f"{body.plan}_price",          str(body.price))
    _set_cfg(db, f"{body.plan}_original_price",  str(body.original_price))
    _set_cfg(db, f"{body.plan}_discount_pct",    str(body.discount_pct))
    db.commit()
    return {"ok": True, "plan": body.plan, "price": body.price,
            "original_price": body.original_price, "discount_pct": body.discount_pct}
