"""
Public webhook endpoints — no auth required.
Each organization has a unique webhook_token.

Supported formats:
  Generic:   { name, email, phone/mobile, company, source, campaign_name, notes }
  Meta:      { field_data: [{name, values}...] }
  LinkedIn:  { firstName, lastName, emailAddress, phoneNumber }
  Google:    { lead_id, user_column_data: [{column_id, string_value}...] }

Verification (Meta): GET /api/webhooks/{token}?hub.mode=subscribe&hub.challenge=...
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.lead import Lead, LeadSource
from app.models.lead_activity import LeadActivity, ActivityType
from app.models.organization import Organization
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
limiter = Limiter(key_func=get_remote_address)

VERIFY_TOKEN = "trackmylead_webhook_verify"  # constant — tell users to use this in Meta


def _get_org(token: str, db: Session) -> Organization:
    org = db.query(Organization).filter(
        Organization.webhook_token == token,
        Organization.is_active == True,
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Invalid webhook token")
    return org


def _get_org_admin(org: Organization, db: Session) -> User:
    """Return the org owner/admin to use as created_by for webhook leads."""
    admin = db.query(User).filter(
        User.organization_id == org.id,
        User.role == UserRole.ADMIN,
        User.is_active == True,
    ).first()
    if not admin:
        raise HTTPException(status_code=503, detail="No active admin in organization")
    return admin


def _parse_meta(payload: dict) -> dict:
    """Parse Meta Lead Ads field_data format."""
    mapping = {
        "full_name": "name", "first_name": "_first", "last_name": "_last",
        "email": "email", "phone_number": "mobile", "company_name": "company",
    }
    result: dict = {}
    for item in payload.get("field_data", []):
        field = item.get("name", "").lower()
        value = (item.get("values") or [None])[0]
        if field in mapping:
            result[mapping[field]] = value
    if "_first" in result or "_last" in result:
        result["name"] = f"{result.pop('_first', '')} {result.pop('_last', '')}".strip()
    result["source"] = LeadSource.FACEBOOK
    result["campaign_name"] = payload.get("campaign_name") or payload.get("ad_name")
    return result


def _parse_linkedin(payload: dict) -> dict:
    """Parse LinkedIn Lead Gen Forms format."""
    first = payload.get("firstName", "")
    last = payload.get("lastName", "")
    return {
        "name": f"{first} {last}".strip() or payload.get("name", "Unknown"),
        "email": payload.get("emailAddress") or payload.get("email"),
        "mobile": payload.get("phoneNumber") or payload.get("phone"),
        "company": payload.get("company"),
        "source": LeadSource.LINKEDIN,
        "campaign_name": payload.get("campaignName"),
    }


def _parse_google(payload: dict) -> dict:
    """Parse Google Ads lead form format."""
    col_map = {}
    for col in payload.get("user_column_data", []):
        col_map[col.get("column_id", "").lower()] = col.get("string_value")
    return {
        "name": col_map.get("full_name") or col_map.get("name", "Unknown"),
        "email": col_map.get("email"),
        "mobile": col_map.get("phone_number") or col_map.get("phone"),
        "company": col_map.get("company_name") or col_map.get("company"),
        "source": LeadSource.GOOGLE_ADS,
        "campaign_name": payload.get("google_key"),
    }


def _parse_generic(payload: dict) -> dict:
    """Parse our generic / any other platform format."""
    source_raw = (payload.get("source") or "").lower()
    source_map = {
        "facebook": LeadSource.FACEBOOK,
        "instagram": LeadSource.INSTAGRAM,
        "linkedin": LeadSource.LINKEDIN,
        "google": LeadSource.GOOGLE_ADS,
        "google_ads": LeadSource.GOOGLE_ADS,
        "website": LeadSource.WEBSITE,
    }
    source = source_map.get(source_raw, LeadSource.OTHER)
    return {
        "name": payload.get("name") or payload.get("full_name") or "Unknown",
        "email": payload.get("email"),
        "mobile": payload.get("mobile") or payload.get("phone") or payload.get("phone_number"),
        "company": payload.get("company") or payload.get("company_name"),
        "notes": payload.get("notes") or payload.get("message"),
        "source": source,
        "campaign_name": payload.get("campaign_name") or payload.get("campaign"),
    }


def _normalize(payload: dict) -> dict:
    """Auto-detect format and normalize to our lead schema."""
    if "field_data" in payload:
        return _parse_meta(payload)
    if "firstName" in payload or "emailAddress" in payload:
        return _parse_linkedin(payload)
    if "user_column_data" in payload:
        return _parse_google(payload)
    return _parse_generic(payload)


# ── Meta webhook verification (GET) ───────────────────────────────────────
@router.get("/{webhook_token}")
def verify_webhook(
    webhook_token: str,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    db: Session = Depends(get_db),
):
    _get_org(webhook_token, db)  # ensure token is valid
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return int(hub_challenge) if hub_challenge else {"ok": True}
    return {"ok": True, "status": "webhook active"}


# ── Receive lead (POST) ────────────────────────────────────────────────────
@router.post("/{webhook_token}/leads", status_code=201)
@limiter.limit("60/minute")
def receive_lead(
    webhook_token: str,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
):
    org = _get_org(webhook_token, db)
    admin = _get_org_admin(org, db)
    data = _normalize(payload)

    if not data.get("name") or data["name"] == "Unknown" and not data.get("email"):
        raise HTTPException(status_code=400, detail="Lead must have at least a name or email")

    lead = Lead(
        organization_id=org.id,
        name=data.get("name", "Unknown"),
        email=data.get("email"),
        mobile=data.get("mobile"),
        company=data.get("company"),
        notes=data.get("notes"),
        source=data.get("source", LeadSource.OTHER),
        campaign_name=data.get("campaign_name"),
        created_by_id=admin.id,
        assigned_to_id=admin.id,
    )
    db.add(lead)
    db.flush()
    lead.web_id = f"WEB-{lead.id:04d}"
    activity = LeadActivity(
        lead_id=lead.id,
        user_id=admin.id,
        activity_type=ActivityType.CREATED,
        new_status="new",
        meta=f"Via webhook — source: {lead.source}",
    )
    db.add(activity)
    db.commit()
    db.refresh(lead)
    return {"ok": True, "lead_id": lead.id, "web_id": lead.web_id}
