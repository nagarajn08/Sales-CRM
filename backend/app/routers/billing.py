import hashlib
import hmac
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.config import PLANS, settings
from app.services.billing_service import (
    get_usage, create_razorpay_subscription,
    activate_subscription, cancel_subscription,
    razorpay_configured, get_or_create_subscription,
)

router = APIRouter(prefix="/api/billing", tags=["billing"])


class UpgradeRequest(BaseModel):
    plan: str


class ActivateRequest(BaseModel):
    plan: str
    razorpay_subscription_id: str
    razorpay_payment_id: str | None = None
    razorpay_signature: str | None = None


# ── Current plan + usage ─────────────────────────────────────────────────────
@router.get("/")
def get_billing(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Super admins are platform operators — unlimited, no subscription needed
    if current_user.is_superadmin:
        from app.models.user import User as UserModel
        from app.models.lead import Lead
        user_count = db.query(UserModel).filter(UserModel.organization_id == current_user.organization_id).count()
        lead_count = db.query(Lead).filter(Lead.organization_id == current_user.organization_id).count()
        return {
            "plan": "platform",
            "plan_name": "Platform (Unlimited)",
            "status": "active",
            "price": 0,
            "users": {"current": user_count, "max": -1},
            "leads": {"current": lead_count, "max": -1},
            "features": ["Unlimited everything", "All tenants management", "Platform analytics"],
            "current_period_end": None,
            "plans": PLANS,
            "razorpay_key_id": settings.RAZORPAY_KEY_ID or None,
            "demo_mode": not razorpay_configured(),
            "is_platform_admin": True,
        }

    usage = get_usage(db, current_user.organization_id)
    return {
        **usage,
        "plans": PLANS,
        "razorpay_key_id": settings.RAZORPAY_KEY_ID or None,
        "demo_mode": not razorpay_configured(),
    }


# ── Initiate upgrade ─────────────────────────────────────────────────────────
@router.post("/upgrade")
def initiate_upgrade(
    body: UpgradeRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if current_user.is_superadmin:
        raise HTTPException(status_code=400, detail="Platform admin does not need a subscription.")
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if body.plan == "free":
        raise HTTPException(status_code=400, detail="Cannot upgrade to free plan. Use cancel instead.")

    subscription = create_razorpay_subscription(
        body.plan,
        current_user.email,
        current_user.name,
    )

    return {
        "subscription_id": subscription["id"],
        "plan": body.plan,
        "demo": subscription.get("demo", False),
        "razorpay_key_id": settings.RAZORPAY_KEY_ID or None,
    }


# ── Activate after payment ────────────────────────────────────────────────────
@router.post("/activate")
def activate(
    body: ActivateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Verify Razorpay signature — required when Razorpay is configured
    if razorpay_configured():
        if not body.razorpay_signature or not body.razorpay_payment_id:
            raise HTTPException(status_code=400, detail="Payment signature required")
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            f"{body.razorpay_payment_id}|{body.razorpay_subscription_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, body.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid payment signature")

    sub = activate_subscription(db, current_user.organization_id, body.plan, body.razorpay_subscription_id)
    return {"ok": True, "plan": sub.plan, "status": sub.status}


# ── Cancel subscription ───────────────────────────────────────────────────────
@router.post("/cancel")
def cancel(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    cancel_subscription(db, current_user.organization_id)
    return {"ok": True, "plan": "free"}


# ── Razorpay webhook (payment events) ────────────────────────────────────────
@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()

    # Signature verification: mandatory in production, skip only on localhost
    is_production = not settings.FRONTEND_URL.startswith("http://localhost")
    if is_production and not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    if settings.RAZORPAY_WEBHOOK_SECRET:
        sig = request.headers.get("X-Razorpay-Signature", "")
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(body)
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    razorpay_sub_id = entity.get("id")

    if not razorpay_sub_id:
        return {"ok": True}

    sub = db.query(__import__("app.models.subscription", fromlist=["Subscription"]).Subscription).filter_by(
        razorpay_subscription_id=razorpay_sub_id
    ).first()

    if not sub:
        return {"ok": True}

    from app.models.subscription import SubStatus, PlanName
    from datetime import datetime, timedelta

    if event == "subscription.activated":
        sub.status = SubStatus.ACTIVE
        sub.current_period_start = datetime.utcnow()
        sub.current_period_end = datetime.utcnow() + timedelta(days=30)
        db.commit()

    elif event in ("subscription.cancelled", "subscription.expired"):
        sub.status = SubStatus.CANCELLED
        sub.plan = PlanName.FREE
        db.commit()

    elif event == "subscription.charged":
        sub.current_period_start = datetime.utcnow()
        sub.current_period_end = datetime.utcnow() + timedelta(days=30)
        db.commit()

    return {"ok": True}
