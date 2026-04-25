from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.subscription import Subscription, PlanName, SubStatus
from app.models.user import User
from app.models.lead import Lead
from app.config import PLANS, settings


def get_or_create_subscription(db: Session, org_id: int) -> Subscription:
    """Get subscription for org, creating a free one if none exists."""
    sub = db.query(Subscription).filter(Subscription.organization_id == org_id).first()
    if not sub:
        sub = Subscription(organization_id=org_id, plan=PlanName.FREE, status=SubStatus.ACTIVE)
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def get_plan_limits(plan: str) -> dict:
    return PLANS.get(plan, PLANS["free"])


def check_user_limit(db: Session, org_id: int, is_superadmin: bool = False):
    """Raise 403 if org has hit its user limit. Super admins are always unlimited."""
    if is_superadmin:
        return
    from app.models.organization import Organization
    org = db.get(Organization, org_id)
    # Org-level override set by super admin takes priority over plan limit
    if org and org.max_users is not None:
        max_users = org.max_users
    else:
        sub = get_or_create_subscription(db, org_id)
        max_users = get_plan_limits(sub.plan)["max_users"]
    if max_users == -1:
        return  # unlimited
    current = db.query(User).filter(
        User.organization_id == org_id,
        User.is_active == True,
    ).count()
    if current >= max_users:
        raise HTTPException(
            status_code=403,
            detail=f"User limit reached ({current}/{max_users}). Contact your platform admin to increase the limit.",
            headers={"X-Upgrade-Required": "true"},
        )


IMPORT_ROW_LIMITS = {
    "admin":   10_000,
    "manager": 10_000,
    "user":     1_000,
}


def check_import_row_limit(row_count: int, user_role: str = "user", is_superadmin: bool = False):
    """Raise 400 if a single import file exceeds the role-based row cap."""
    if is_superadmin:
        return
    max_rows = IMPORT_ROW_LIMITS.get(user_role, 1_000)
    if row_count > max_rows:
        raise HTTPException(
            status_code=400,
            detail=f"Import limit exceeded: your role allows up to {max_rows:,} rows per upload (file has {row_count:,}).",
        )


def check_lead_limit(db: Session, org_id: int, is_superadmin: bool = False):
    """Raise 403 if org has hit its plan-based lead limit."""
    if is_superadmin:
        return
    sub = get_or_create_subscription(db, org_id)
    limits = get_plan_limits(sub.plan)
    max_leads = limits["max_leads"]
    if max_leads == -1:
        return
    current = db.query(Lead).filter(Lead.organization_id == org_id).count()
    if current >= max_leads:
        raise HTTPException(
            status_code=403,
            detail=f"Lead limit reached ({current}/{max_leads}). Upgrade your plan to add more leads.",
            headers={"X-Upgrade-Required": "true"},
        )


def get_usage(db: Session, org_id: int) -> dict:
    from app.models.organization import Organization
    sub = get_or_create_subscription(db, org_id)
    limits = get_plan_limits(sub.plan)
    org = db.get(Organization, org_id)
    # Use org-level override if set, else fall back to plan limit
    max_users = org.max_users if (org and org.max_users is not None) else limits["max_users"]
    user_count = db.query(User).filter(User.organization_id == org_id, User.is_active == True).count()
    lead_count = db.query(Lead).filter(Lead.organization_id == org_id).count()
    return {
        "plan": sub.plan,
        "status": sub.status,
        "current_period_end": sub.current_period_end,
        "razorpay_subscription_id": sub.razorpay_subscription_id,
        "users": {"current": user_count, "max": max_users},
        "leads": {"current": lead_count, "max": limits["max_leads"]},
        "price": limits["price"],
        "features": limits["features"],
        "plan_name": limits["name"],
    }


# ── Razorpay helpers (mock when keys not configured) ─────────────────────────

def razorpay_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def create_razorpay_subscription(plan_key: str, customer_email: str, customer_name: str) -> dict:
    """Create a Razorpay subscription or return mock data in demo mode."""
    plan_cfg = PLANS.get(plan_key)
    if not plan_cfg:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if not razorpay_configured():
        # Demo mode — return fake subscription data
        return {
            "id": f"demo_sub_{plan_key}_{int(datetime.utcnow().timestamp())}",
            "status": "created",
            "demo": True,
        }

    import razorpay  # type: ignore
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    subscription = client.subscription.create({
        "plan_id": plan_cfg["razorpay_plan_id"],
        "customer_notify": 1,
        "quantity": 1,
        "total_count": 12,  # 12 months
        "notes": {
            "customer_email": customer_email,
            "customer_name": customer_name,
        },
    })
    return subscription


def activate_subscription(db: Session, org_id: int, plan: str, razorpay_sub_id: str):
    """Activate subscription after payment confirmation."""
    sub = get_or_create_subscription(db, org_id)
    sub.plan = PlanName(plan)
    sub.status = SubStatus.ACTIVE
    sub.razorpay_subscription_id = razorpay_sub_id
    sub.current_period_start = datetime.utcnow()
    sub.current_period_end = datetime.utcnow() + timedelta(days=30)
    db.commit()
    db.refresh(sub)
    return sub


def cancel_subscription(db: Session, org_id: int):
    """Cancel subscription and downgrade to free."""
    sub = get_or_create_subscription(db, org_id)
    sub.status = SubStatus.CANCELLED
    sub.plan = PlanName.FREE
    sub.razorpay_subscription_id = None
    sub.current_period_end = None
    db.commit()
