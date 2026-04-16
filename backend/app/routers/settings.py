import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user, require_superadmin
from app.models.app_settings import AppSettings
from app.models.organization import Organization
from app.models.user import User

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "company_name": "Sales CRM",
    "followup_reminder_hours": "1",
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
    admin: User = Depends(require_superadmin),
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
    base_url = "http://localhost:8000"  # will be replaced by actual server URL in prod
    return {
        "webhook_token": org.webhook_token,
        "webhook_url": f"{base_url}/api/webhooks/{org.webhook_token}/leads",
        "verify_token": "salescrm_webhook_verify",
        "org_name": org.name,
        "org_type": org.type,
    }


@router.post("/webhook/regenerate")
def regenerate_webhook(admin: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    if not admin.organization_id:
        raise HTTPException(status_code=400, detail="No organization associated")
    org = db.get(Organization, admin.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.webhook_token = secrets.token_urlsafe(24)
    db.commit()
    db.refresh(org)
    base_url = "http://localhost:8000"
    return {
        "webhook_token": org.webhook_token,
        "webhook_url": f"{base_url}/api/webhooks/{org.webhook_token}/leads",
    }
