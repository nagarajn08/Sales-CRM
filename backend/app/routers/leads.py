import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import pandas as pd
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.lead import Lead, LeadSource, LeadStatus
from app.models.lead_activity import LeadActivity, ActivityType
from app.models.notification import Notification
from app.models.app_settings import AppSettings
from app.models.user import User, UserRole
from app.schemas.lead import ActivityRead, LeadCreate, LeadRead, LeadReassign, LeadStatusUpdate, LeadUpdate


class EmailSendRequest(BaseModel):
    subject: str
    body: str
    template_id: Optional[int] = None

router = APIRouter(prefix="/api/leads", tags=["leads"])

# Statuses that require a follow-up date
FOLLOWUP_REQUIRED = {LeadStatus.CALL_BACK, LeadStatus.BUSY, LeadStatus.NOT_REACHABLE}
# Statuses that end the journey
TERMINAL_STATUSES = {LeadStatus.NOT_INTERESTED, LeadStatus.CONVERTED}


def _check_lead_access(lead: Lead, user: User):
    if user.role in (UserRole.ADMIN, UserRole.MANAGER):
        return
    if lead.assigned_to_id != user.id and lead.created_by_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")


def _log_activity(db: Session, lead_id: int, user_id: int, activity_type: ActivityType, **kwargs):
    activity = LeadActivity(lead_id=lead_id, user_id=user_id, activity_type=activity_type, **kwargs)
    db.add(activity)


@router.get("/", response_model=list[LeadRead])
def list_leads(
    status: Optional[LeadStatus] = None,
    priority: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    search: Optional[str] = None,
    overdue: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Lead).filter(Lead.is_active == True)
    if current_user.role == UserRole.USER:
        q = q.filter(Lead.assigned_to_id == current_user.id)
    if status:
        q = q.filter(Lead.status == status)
    if priority:
        q = q.filter(Lead.priority == priority)
    if assigned_to_id:
        q = q.filter(Lead.assigned_to_id == assigned_to_id)
    if search:
        q = q.filter(
            Lead.name.ilike(f"%{search}%") |
            Lead.mobile.ilike(f"%{search}%") |
            Lead.email.ilike(f"%{search}%") |
            Lead.company.ilike(f"%{search}%")
        )
    if overdue:
        q = q.filter(Lead.next_followup_at <= datetime.utcnow(), Lead.next_followup_at.isnot(None))
    return q.order_by(Lead.next_followup_at.asc().nullslast(), Lead.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(body: LeadCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assigned_to_id = body.assigned_to_id
    if current_user.role == UserRole.USER:
        assigned_to_id = current_user.id
    lead = Lead(
        name=body.name, email=body.email, mobile=body.mobile, whatsapp=body.whatsapp,
        company=body.company, notes=body.notes, priority=body.priority, source=body.source,
        assigned_to_id=assigned_to_id, created_by_id=current_user.id,
    )
    db.add(lead)
    db.flush()
    _log_activity(db, lead.id, current_user.id, ActivityType.CREATED, new_status=LeadStatus.NEW)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_leads(
    file: UploadFile = File(...),
    assigned_to_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = file.file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file format")

    required = ["name"]
    for col in required:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required column: '{col}'")

    df = df.where(pd.notna(df), None)
    created = 0
    skipped = 0
    for _, row in df.iterrows():
        if not row.get("name"):
            skipped += 1
            continue
        lead = Lead(
            name=str(row["name"]),
            email=str(row["email"]) if row.get("email") else None,
            mobile=str(row["mobile"]) if row.get("mobile") else None,
            whatsapp=str(row["whatsapp"]) if row.get("whatsapp") else None,
            company=str(row["company"]) if row.get("company") else None,
            notes=str(row["notes"]) if row.get("notes") else None,
            source=LeadSource.IMPORT,
            assigned_to_id=assigned_to_id,
            created_by_id=current_user.id,
        )
        db.add(lead)
        db.flush()
        _log_activity(db, lead.id, current_user.id, ActivityType.IMPORTED)
        created += 1
    db.commit()
    return {"imported": created, "skipped": skipped}


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)
    return lead


@router.put("/{lead_id}", response_model=LeadRead)
def update_lead(lead_id: int, body: LeadUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/status", response_model=LeadRead)
def update_status(lead_id: int, body: LeadStatusUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)

    if body.status in FOLLOWUP_REQUIRED and not body.next_followup_at:
        raise HTTPException(status_code=400, detail=f"Follow-up date required for status '{body.status}'")

    if body.status == LeadStatus.NOT_INTERESTED:
        lead.is_active = False
        lead.next_followup_at = None
    elif body.status == LeadStatus.CONVERTED:
        lead.is_active = False
        lead.next_followup_at = None
    else:
        lead.next_followup_at = body.next_followup_at

    old_status = lead.status
    lead.status = body.status

    _log_activity(db, lead.id, current_user.id, ActivityType.STATUS_CHANGED,
                  old_status=old_status, new_status=body.status,
                  comment=body.comment, followup_date=body.next_followup_at)

    # Create follow-up notification
    if body.next_followup_at and lead.assigned_to_id:
        notif = Notification(
            user_id=lead.assigned_to_id, lead_id=lead.id,
            message=f"Follow-up due: {lead.name}", due_at=body.next_followup_at,
        )
        db.add(notif)

    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/comment", response_model=LeadRead)
def add_comment(lead_id: int, comment: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)
    _log_activity(db, lead.id, current_user.id, ActivityType.COMMENT, comment=comment)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/reassign", response_model=LeadRead)
def reassign_lead(lead_id: int, body: LeadReassign, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    new_user = db.get(User, body.assigned_to_id)
    if not new_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    old_user_name = lead.assigned_to.name if lead.assigned_to else "Unassigned"
    lead.assigned_to_id = body.assigned_to_id
    _log_activity(db, lead.id, admin.id, ActivityType.REASSIGNED,
                  meta=f"From: {old_user_name} → To: {new_user.name}")
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/{lead_id}/timeline", response_model=list[ActivityRead])
def get_timeline(lead_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)
    return lead.activities


@router.post("/{lead_id}/email", status_code=status.HTTP_200_OK)
def send_email_to_lead(
    lead_id: int,
    body: EmailSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)
    if not lead.email:
        raise HTTPException(status_code=400, detail="Lead has no email address")

    # Read SMTP settings from DB
    rows = db.query(AppSettings).all()
    cfg = {r.key: r.value for r in rows}
    smtp_host = cfg.get("smtp_host", "")
    smtp_port = int(cfg.get("smtp_port", "587"))
    smtp_user = cfg.get("smtp_user", "")
    smtp_pass = cfg.get("smtp_password", "")
    smtp_from = cfg.get("smtp_from") or smtp_user

    if not smtp_host or not smtp_user:
        raise HTTPException(
            status_code=503,
            detail="SMTP is not configured. Please set SMTP settings in the Settings page."
        )

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = body.subject
        msg["From"] = smtp_from
        msg["To"] = lead.email
        msg.attach(MIMEText(body.body, "plain"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, lead.email, msg.as_string())
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to send email: {str(e)}")

    # Log the email send
    _log_activity(
        db, lead.id, current_user.id, ActivityType.EMAIL_SENT,
        comment=f"Subject: {body.subject}"
    )
    db.commit()
    return {"ok": True, "sent_to": lead.email}


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
