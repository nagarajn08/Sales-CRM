from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import require_superadmin
from app.models.app_settings import AppSettings
from app.models.user import User

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "theme_mode": "light",
    "primary_color": "blue",
    "company_name": "Sales CRM",
    "accent_color": "indigo",
}


class SettingsPayload(BaseModel):
    settings: dict[str, str]


@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(AppSettings).all()
    result = {**DEFAULT_SETTINGS}
    for row in rows:
        result[row.key] = row.value
    return result


@router.put("/")
def update_settings(body: SettingsPayload, admin: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    for key, value in body.settings.items():
        row = db.query(AppSettings).filter(AppSettings.key == key).first()
        if row:
            row.value = value
        else:
            db.add(AppSettings(key=key, value=value))
    db.commit()
    return {"ok": True}
