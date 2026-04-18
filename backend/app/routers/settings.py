import secrets
import smtplib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.config import settings as app_settings
from app.models.app_settings import AppSettings
from app.models.organization import Organization
from app.models.user import User

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "company_name": "Sales CRM",
    "followup_reminder_hours": "1",
    "twilio_account_sid": "",
    "twilio_auth_token": "",
    "twilio_from_number": "",
}


class SettingsPayload(BaseModel):
    settings: dict[str, str]


@router.get("/")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(AppSettings).filter(
        AppSettings.organization_id == current_user.organization_id
    ).all()
    result = {**DEFAULT_SETTINGS}
    for row in rows:
        result[row.key] = row.value
    return result


@router.put("/")
def update_settings(
    body: SettingsPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    for key, value in body.settings.items():
        row = db.query(AppSettings).filter(
            AppSettings.organization_id == admin.organization_id,
            AppSettings.key == key,
        ).first()
        if row:
            row.value = value
        else:
            db.add(AppSettings(organization_id=admin.organization_id, key=key, value=value))
    db.commit()
    return {"ok": True}


@router.get("/webhook")
def get_webhook_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="No organization associated")
    org = db.get(Organization, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    base_url = app_settings.BACKEND_URL.rstrip("/")
    return {
        "webhook_token": org.webhook_token,
        "webhook_url": f"{base_url}/api/webhooks/{org.webhook_token}/leads",
        "verify_token": "salescrm_webhook_verify",
        "org_name": org.name,
        "org_type": org.type,
    }


class OrgNamePayload(BaseModel):
    name: str


@router.patch("/org-name")
def update_org_name(
    body: OrgNamePayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organization name cannot be empty")
    if not admin.organization_id:
        raise HTTPException(status_code=400, detail="No organization associated")
    org = db.get(Organization, admin.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.name = name
    db.commit()
    return {"ok": True, "name": org.name}


@router.post("/smtp-test")
def test_smtp(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Verify SMTP connection using stored settings without sending an email."""
    rows = db.query(AppSettings).filter(AppSettings.organization_id == admin.organization_id).all()
    s = {r.key: r.value for r in rows}
    host = s.get("smtp_host", "").strip()
    port_str = s.get("smtp_port", "587").strip()
    user = s.get("smtp_user", "").strip()
    password = s.get("smtp_password", "").strip()
    if not host:
        raise HTTPException(status_code=400, detail="SMTP host is not configured")
    try:
        port = int(port_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid SMTP port")
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()
        if user and password:
            server.login(user, password)
        server.quit()
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="Authentication failed — check username and password")
    except smtplib.SMTPConnectError:
        raise HTTPException(status_code=400, detail=f"Could not connect to {host}:{port}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP error: {str(e)}")
    return {"ok": True, "detail": f"Connected to {host}:{port} successfully"}


@router.post("/webhook/regenerate")
def regenerate_webhook(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not admin.organization_id:
        raise HTTPException(status_code=400, detail="No organization associated")
    org = db.get(Organization, admin.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.webhook_token = secrets.token_urlsafe(24)
    db.commit()
    db.refresh(org)
    base_url = app_settings.BACKEND_URL.rstrip("/")
    return {
        "webhook_token": org.webhook_token,
        "webhook_url": f"{base_url}/api/webhooks/{org.webhook_token}/leads",
    }
