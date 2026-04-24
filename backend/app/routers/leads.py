import csv
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, or_, and_
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
import pandas as pd
from app.database import get_db
from app.dependencies import get_current_user, require_admin

limiter = Limiter(key_func=get_remote_address)
from app.models.lead import Lead, LeadSource, LeadStatus
from app.models.lead_activity import LeadActivity, ActivityType
from app.models.notification import Notification
from app.models.app_settings import AppSettings
from app.models.user import User, UserRole
from app.schemas.lead import ActivityRead, BulkActionRequest, CallLogRequest, LeadCreate, LeadRead, LeadReassign, LeadStatusUpdate, LeadUpdate
from app.services.billing_service import check_import_row_limit, check_lead_limit
from app.services.scoring_service import recalculate_score


class EmailSendRequest(BaseModel):
    subject: str
    body: str
    template_id: Optional[int] = None


router = APIRouter(prefix="/api/leads", tags=["leads"])

FOLLOWUP_REQUIRED = {LeadStatus.CALL_BACK, LeadStatus.INTERESTED_CALL_BACK, LeadStatus.BUSY, LeadStatus.NOT_REACHABLE}
TERMINAL_STATUSES = {LeadStatus.NOT_INTERESTED, LeadStatus.CONVERTED}


def _check_lead_access(lead: Lead, user: User):
    if user.is_superadmin:
        return  # superadmins can access any lead across all orgs
    if lead.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if user.role in (UserRole.ADMIN, UserRole.MANAGER):
        return
    if lead.assigned_to_id != user.id and lead.created_by_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")


def _log_activity(db: Session, lead_id: int, user_id: int, activity_type: ActivityType, **kwargs):
    activity = LeadActivity(lead_id=lead_id, user_id=user_id, activity_type=activity_type, **kwargs)
    db.add(activity)


def _build_lead_query(
    db: Session,
    current_user: User,
    status: Optional[LeadStatus] = None,
    priority: Optional[str] = None,
    source: Optional[LeadSource] = None,
    assigned_to_id: Optional[int] = None,
    search: Optional[str] = None,
    overdue: Optional[bool] = None,
    tag: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_inactive: bool = False,
):
    if current_user.is_superadmin:
        q = db.query(Lead)
    else:
        q = db.query(Lead).filter(Lead.organization_id == current_user.organization_id)
    if not include_inactive:
        q = q.filter(Lead.is_active == True)
    if not current_user.is_superadmin and current_user.role == UserRole.USER:
        q = q.filter(Lead.assigned_to_id == current_user.id)
    if status:
        q = q.filter(Lead.status == status)
    if priority:
        q = q.filter(Lead.priority == priority)
    if source:
        q = q.filter(Lead.source == source)
    if assigned_to_id:
        q = q.filter(Lead.assigned_to_id == assigned_to_id)
    if search:
        s = f"%{search.lower()}%"
        q = q.filter(
            func.lower(Lead.name).like(s) |
            func.lower(Lead.mobile).like(s) |
            func.lower(Lead.email).like(s) |
            func.lower(Lead.company).like(s) |
            func.lower(Lead.web_id).like(s)
        )
    if overdue:
        q = q.filter(Lead.next_followup_at <= datetime.utcnow(), Lead.next_followup_at.isnot(None))
    if tag:
        q = q.filter(func.lower(Lead.tags).like(f"%{tag.lower()}%"))
    if date_from:
        try:
            q = q.filter(Lead.created_at >= datetime.fromisoformat(date_from))
        except Exception:
            pass
    if date_to:
        try:
            q = q.filter(Lead.created_at <= datetime.fromisoformat(date_to + "T23:59:59"))
        except Exception:
            pass
    return q


@router.get("/")
def list_leads(
    status: Optional[LeadStatus] = None,
    priority: Optional[str] = None,
    source: Optional[LeadSource] = None,
    assigned_to_id: Optional[int] = None,
    search: Optional[str] = None,
    overdue: Optional[bool] = None,
    tag: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = _build_lead_query(db, current_user, status=status, priority=priority, source=source,
                          assigned_to_id=assigned_to_id, search=search, overdue=overdue,
                          tag=tag, date_from=date_from, date_to=date_to)
    total = q.count()
    ordered = q.order_by(Lead.next_followup_at.asc().nulls_last(), Lead.created_at.desc())
    items = ordered.offset(skip).limit(limit).all()
    from app.schemas.lead import LeadRead as LR
    data = [LR.model_validate(i).model_dump(mode="json") for i in items]
    return JSONResponse(content=data, headers={"X-Total-Count": str(total)})


@router.get("/followups")
def get_followups(
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns follow-up stats + lists for a given date (default today, UTC).
    date format: YYYY-MM-DD
    """
    from datetime import date as date_cls, time as time_cls

    try:
        target = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.utcnow().date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date, use YYYY-MM-DD")

    now        = datetime.utcnow()
    today      = now.date()
    day_start  = lambda d: datetime.combine(d, time_cls.min)
    day_end    = lambda d: datetime.combine(d, time_cls.max)

    def base_q():
        return _build_lead_query(db, current_user).filter(Lead.next_followup_at.isnot(None))

    # ── Stats (relative to selected target date) ──────────────────────────────
    overdue_count    = base_q().filter(Lead.next_followup_at < day_start(target)).count()
    due_today_count  = base_q().filter(
        Lead.next_followup_at >= day_start(target),
        Lead.next_followup_at <= day_end(target),
    ).count()
    upcoming_count   = base_q().filter(Lead.next_followup_at > day_end(target)).count()
    total_count      = overdue_count + due_today_count + upcoming_count

    # include_inactive=True so converted/not_interested leads (is_active=False) are included
    lead_ids = _build_lead_query(db, current_user, include_inactive=True).with_entities(Lead.id).subquery()
    # LeadActivity.created_at is stored as UTC (datetime.utcnow()).
    # next_followup_at is IST-naive. Shift activity window by IST offset so
    # "done on target date" means the IST calendar day, not the UTC day.
    from datetime import timedelta
    IST = timedelta(hours=5, minutes=30)
    act_start = day_start(target) - IST
    act_end   = day_end(target)   - IST
    # "Done" = meaningful action: tried (not_reachable/busy), closed (converted/not_interested),
    # or rescheduled WITH a comment (call_back/interested_call_back + comment = had conversation).
    # Pure reschedule without comment does not count.
    ALWAYS_DONE = ("not_reachable", "busy", "not_interested", "converted")
    RESCHEDULED = ("call_back", "interested_call_back")
    done_count = db.query(LeadActivity).filter(
        LeadActivity.lead_id.in_(lead_ids),
        LeadActivity.activity_type == ActivityType.STATUS_CHANGED,
        LeadActivity.created_at >= act_start,
        LeadActivity.created_at <= act_end,
        or_(
            LeadActivity.new_status.in_(ALWAYS_DONE),
            and_(
                LeadActivity.new_status.in_(RESCHEDULED),
                LeadActivity.comment.isnot(None),
                LeadActivity.comment != "",
            ),
        ),
    ).count()

    # ── Lists for target date ─────────────────────────────────────────────────
    if target == today:
        overdue_rows = (
            base_q()
            .filter(Lead.next_followup_at < day_start(today))
            .order_by(Lead.next_followup_at.asc())
            .limit(200).all()
        )
        scheduled_rows = (
            base_q()
            .filter(Lead.next_followup_at >= day_start(today), Lead.next_followup_at <= day_end(today))
            .order_by(Lead.next_followup_at.asc())
            .limit(200).all()
        )
    else:
        overdue_rows = []
        scheduled_rows = (
            base_q()
            .filter(Lead.next_followup_at >= day_start(target), Lead.next_followup_at <= day_end(target))
            .order_by(Lead.next_followup_at.asc())
            .limit(200).all()
        )

    def serialize(lead: Lead):
        return {
            "id":               lead.id,
            "web_id":           lead.web_id,
            "name":             lead.name,
            "mobile":           lead.mobile,
            "email":            lead.email,
            "company":          lead.company,
            "status":           lead.status.value,
            "priority":         lead.priority.value,
            "next_followup_at": lead.next_followup_at.isoformat() if lead.next_followup_at else None,
            "last_comment":     lead.last_comment,
            "deal_value":       lead.deal_value,
            "score":            lead.score,
            "assigned_to":      {"id": lead.assigned_to.id, "name": lead.assigned_to.name}
                                if lead.assigned_to else None,
        }

    return {
        "target_date": target.isoformat(),
        "is_today":    target == today,
        "stats": {
            "total":      total_count,
            "overdue":    overdue_count,
            "due_today":  due_today_count,
            "upcoming":   upcoming_count,
            "done":       done_count,
        },
        "overdue":    [serialize(l) for l in overdue_rows],
        "scheduled":  [serialize(l) for l in scheduled_rows],
    }


@router.get("/export")
def export_leads(
    status: Optional[LeadStatus] = None,
    priority: Optional[str] = None,
    source: Optional[LeadSource] = None,
    assigned_to_id: Optional[int] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = _build_lead_query(db, current_user, status=status, priority=priority, source=source,
                          assigned_to_id=assigned_to_id, search=search, tag=tag,
                          date_from=date_from, date_to=date_to)

    HEADERS = ["Web ID", "Name", "Mobile", "WhatsApp", "Email", "Company",
               "Status", "Priority", "Source", "Tags", "Assigned To",
               "Next Follow-up", "Last Comment", "Notes", "Created At"]

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(HEADERS)
        yield buf.getvalue()
        # Stream 500 rows at a time — never loads the full result into RAM
        for lead in q.order_by(Lead.created_at.desc()).yield_per(500):
            buf.seek(0); buf.truncate(0)
            writer.writerow([
                lead.web_id or "",
                lead.name,
                lead.mobile or "",
                lead.whatsapp or "",
                lead.email or "",
                lead.company or "",
                lead.status.value,
                lead.priority.value,
                lead.source.value,
                lead.tags or "",
                lead.assigned_to.name if lead.assigned_to else "",
                lead.next_followup_at.isoformat() if lead.next_followup_at else "",
                lead.last_comment or "",
                lead.notes or "",
                lead.created_at.isoformat(),
            ])
            yield buf.getvalue()

    filename = f"leads_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/bulk")
@limiter.limit("30/minute")
def bulk_action(
    request: Request,
    body: BulkActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Lead).filter(Lead.id.in_(body.lead_ids))
    if not current_user.is_superadmin:
        q = q.filter(Lead.organization_id == current_user.organization_id)
    leads = q.all()

    if not leads:
        raise HTTPException(status_code=404, detail="No leads found")

    # Check access for non-admin
    if current_user.role == UserRole.USER:
        for lead in leads:
            if lead.assigned_to_id != current_user.id and lead.created_by_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied to one or more leads")

    if body.action == "delete":
        if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER):
            raise HTTPException(status_code=403, detail="Only admins can bulk delete")
        for lead in leads:
            db.delete(lead)

    elif body.action == "status":
        if not body.status:
            raise HTTPException(status_code=400, detail="Status required")
        for lead in leads:
            old_status = lead.status
            lead.status = body.status
            if body.status in (LeadStatus.NOT_INTERESTED, LeadStatus.CONVERTED):
                lead.is_active = False
                lead.next_followup_at = None
            _log_activity(db, lead.id, current_user.id, ActivityType.STATUS_CHANGED,
                          old_status=old_status, new_status=body.status)

    elif body.action == "reassign":
        if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER):
            raise HTTPException(status_code=403, detail="Only admins can bulk reassign")
        if not body.assigned_to_id:
            raise HTTPException(status_code=400, detail="assigned_to_id required")
        new_user = db.get(User, body.assigned_to_id)
        if not new_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        if not current_user.is_superadmin and new_user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Target user not found")
        for lead in leads:
            old_name = lead.assigned_to.name if lead.assigned_to else "Unassigned"
            lead.assigned_to_id = body.assigned_to_id
            _log_activity(db, lead.id, current_user.id, ActivityType.REASSIGNED,
                          meta=f"Bulk reassign: {old_name} → {new_user.name}")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}")

    db.commit()
    return {"ok": True, "affected": len(leads)}


@router.post("/", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(body: LeadCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assigned_to_id = body.assigned_to_id
    if current_user.role == UserRole.USER:
        assigned_to_id = current_user.id
    # When superadmin assigns cross-org, put the lead in the assignee's org
    org_id = current_user.organization_id
    if current_user.is_superadmin and assigned_to_id:
        assignee = db.get(User, assigned_to_id)
        if assignee and assignee.organization_id:
            org_id = assignee.organization_id
    check_lead_limit(db, org_id, is_superadmin=current_user.is_superadmin)
    lead = Lead(
        organization_id=org_id,
        name=body.name, email=body.email, mobile=body.mobile, whatsapp=body.whatsapp,
        company=body.company, notes=body.notes, priority=body.priority, source=body.source,
        deal_value=body.deal_value, assigned_to_id=assigned_to_id, created_by_id=current_user.id,
    )
    db.add(lead)
    db.flush()
    lead.web_id = f"WEB-{lead.id:04d}"
    _log_activity(db, lead.id, current_user.id, ActivityType.CREATED, new_status=LeadStatus.NEW)
    recalculate_score(db, lead)
    db.commit()
    db.refresh(lead)
    return lead


def _normalize_columns(df) -> dict:
    """Return a mapping of CRM field -> actual dataframe column (case-insensitive, aliased)."""
    ALIASES = {
        "name":      ["name", "full name", "fullname", "contact name", "lead name", "customer name", "client name"],
        "mobile":    ["mobile", "phone", "phone number", "mobile number", "contact number", "cell", "cell phone"],
        "email":     ["email", "email address", "mail", "e-mail"],
        "company":   ["company", "company name", "organization", "organisation", "business", "firm"],
        "notes":     ["notes", "note", "remarks", "comment", "comments", "description"],
        "priority":  ["priority", "lead priority"],
        "source":    ["source", "lead source", "channel"],
    }
    col_map_lower = {c.strip().lower(): c for c in df.columns}
    result = {}
    for field, aliases in ALIASES.items():
        for alias in aliases:
            if alias in col_map_lower:
                result[field] = col_map_lower[alias]
                break
    return result


@router.post("/import", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def import_leads(
    request: Request,
    file: UploadFile = File(...),
    assigned_to_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = file.file.read()
    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file. Please upload a .csv or .xlsx file.")

    col = _normalize_columns(df)

    missing = []
    if "name" not in col:
        missing.append("Name")
    if "mobile" not in col:
        missing.append("Mobile")
    if "email" not in col:
        missing.append("Email")
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Wrong format: missing required column(s): {', '.join(missing)}. "
                   f"Expected columns: Name, Mobile, Email (required) + Company, Notes, Priority (optional)."
        )

    df = df.where(pd.notna(df), None)

    VALID_PRIORITIES = {"hot", "warm", "cold"}
    VALID_SOURCES = {"manual", "import", "website", "reference", "cold_call", "facebook", "instagram", "linkedin", "google_ads", "other"}

    check_import_row_limit(len(df), user_role=current_user.role.value, is_superadmin=current_user.is_superadmin)

    created = 0
    skipped = 0
    BATCH = 100  # flush every N rows instead of every row

    for idx, (_, row) in enumerate(df.iterrows()):
        name_val = row.get(col["name"])
        if not name_val or str(name_val).strip() == "":
            skipped += 1
            continue

        def get(field, _row=row):
            c = col.get(field)
            if not c:
                return None
            v = _row.get(c)
            return str(v).strip() if v else None

        raw_priority = (get("priority") or "warm").lower()
        priority = raw_priority if raw_priority in VALID_PRIORITIES else "warm"

        raw_source = (get("source") or "import").lower().replace(" ", "_")
        source = raw_source if raw_source in VALID_SOURCES else LeadSource.IMPORT

        lead = Lead(
            organization_id=current_user.organization_id,
            name=str(name_val).strip(),
            email=get("email"),
            mobile=get("mobile"),
            company=get("company"),
            notes=get("notes"),
            priority=priority,
            source=source,
            assigned_to_id=assigned_to_id,
            created_by_id=current_user.id,
        )
        db.add(lead)
        created += 1

        # Flush every BATCH rows to get IDs for web_id, then continue
        if created % BATCH == 0:
            db.flush()
            # Assign web_ids and activities for this batch
            for obj in db.new:
                if isinstance(obj, Lead) and obj.web_id is None:
                    obj.web_id = f"WEB-{obj.id:04d}"
                    recalculate_score(db, obj)
                    _log_activity(db, obj.id, current_user.id, ActivityType.IMPORTED)

    # Final flush for remaining rows
    db.flush()
    for obj in list(db.new):
        if isinstance(obj, Lead) and obj.web_id is None:
            obj.web_id = f"WEB-{obj.id:04d}"
            recalculate_score(db, obj)
            _log_activity(db, obj.id, current_user.id, ActivityType.IMPORTED)

    db.commit()
    return {"imported": created, "skipped": skipped}


@router.post("/auto-assign", status_code=status.HTTP_200_OK)
def auto_assign_leads(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    Distribute unassigned leads equally among active non-admin users.
    Respects the org's auto_assign_daily_limit setting (0 = disabled).
    Returns counts of assigned leads per user.
    """
    if not admin.organization_id:
        raise HTTPException(status_code=400, detail="No organization")

    # Read limit from org settings
    setting_row = db.query(AppSettings).filter(
        AppSettings.organization_id == admin.organization_id,
        AppSettings.key == "auto_assign_daily_limit",
    ).first()
    daily_limit = int(setting_row.value) if setting_row and setting_row.value.strip().isdigit() else 0
    if daily_limit <= 0:
        raise HTTPException(status_code=400, detail="Auto-assign is disabled. Set a daily limit > 0 in Settings.")

    # Active non-admin users in this org
    users = db.query(User).filter(
        User.organization_id == admin.organization_id,
        User.is_active == True,
        User.role == UserRole.USER,
    ).all()
    if not users:
        raise HTTPException(status_code=400, detail="No active users to assign leads to.")

    # Unassigned leads (not terminal)
    unassigned = db.query(Lead).filter(
        Lead.organization_id == admin.organization_id,
        Lead.assigned_to_id == None,
        Lead.status.notin_([LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED]),
    ).order_by(Lead.created_at).all()

    if not unassigned:
        return {"assigned": 0, "details": [], "message": "No unassigned leads found."}

    result: dict[int, int] = {u.id: 0 for u in users}
    assigned_total = 0

    for i, lead in enumerate(unassigned):
        user = users[i % len(users)]
        if result[user.id] >= daily_limit:
            # All users have hit their daily cap
            if all(v >= daily_limit for v in result.values()):
                break
            # Skip this user, find next with room
            for offset in range(1, len(users)):
                candidate = users[(i + offset) % len(users)]
                if result[candidate.id] < daily_limit:
                    user = candidate
                    break
            else:
                break

        lead.assigned_to_id = user.id
        _log_activity(db, lead.id, admin.id, ActivityType.REASSIGNED)
        result[user.id] += 1
        assigned_total += 1

    db.commit()

    user_map = {u.id: u.name for u in users}
    details = [{"user": user_map[uid], "assigned": count} for uid, count in result.items() if count > 0]
    return {"assigned": assigned_total, "details": details}


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
    recalculate_score(db, lead)
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

    # Strip timezone info — DB stores naive datetimes (TIMESTAMP WITHOUT TIME ZONE)
    followup_dt = body.next_followup_at.replace(tzinfo=None) if body.next_followup_at and body.next_followup_at.tzinfo else body.next_followup_at

    if body.status in TERMINAL_STATUSES:
        lead.is_active = False
        lead.next_followup_at = None
    else:
        lead.next_followup_at = followup_dt

    old_status = lead.status
    lead.status = body.status
    if body.comment:
        lead.last_comment = body.comment
    _log_activity(db, lead.id, current_user.id, ActivityType.STATUS_CHANGED,
                  old_status=old_status, new_status=body.status,
                  comment=body.comment, followup_date=followup_dt)

    if followup_dt and lead.assigned_to_id:
        db.add(Notification(
            user_id=lead.assigned_to_id, lead_id=lead.id,
            message=f"Follow-up due: {lead.name}", due_at=followup_dt,
        ))

    recalculate_score(db, lead)
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
    lead.last_comment = comment
    recalculate_score(db, lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/reassign", response_model=LeadRead)
def reassign_lead(lead_id: int, body: LeadReassign, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead or (not admin.is_superadmin and lead.organization_id != admin.organization_id):
        raise HTTPException(status_code=404, detail="Lead not found")
    new_user = db.get(User, body.assigned_to_id)
    if not new_user or (not admin.is_superadmin and new_user.organization_id != admin.organization_id):
        raise HTTPException(status_code=404, detail="Target user not found")
    old_name = lead.assigned_to.name if lead.assigned_to else "Unassigned"
    lead.assigned_to_id = body.assigned_to_id
    _log_activity(db, lead.id, admin.id, ActivityType.REASSIGNED,
                  meta=f"From: {old_name} → To: {new_user.name}")
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/{lead_id}/timeline", response_model=list[ActivityRead])
def get_timeline(lead_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)
    return sorted(lead.activities, key=lambda a: a.created_at, reverse=True)


@router.post("/{lead_id}/email", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
def send_email_to_lead(
    request: Request,
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

    rows = db.query(AppSettings).filter(
        AppSettings.organization_id == current_user.organization_id
    ).all()
    cfg = {r.key: r.value for r in rows}
    smtp_host = cfg.get("smtp_host", "")
    smtp_port = int(cfg.get("smtp_port", "587"))
    smtp_user = cfg.get("smtp_user", "")
    smtp_pass = cfg.get("smtp_password", "")
    smtp_from = cfg.get("smtp_from") or smtp_user

    if not smtp_host or not smtp_user:
        raise HTTPException(status_code=503, detail="SMTP not configured. Configure it in Settings.")

    try:
        msg = MIMEMultipart("alternative")
        # Strip newlines to prevent email header injection
        msg["Subject"] = body.subject.replace("\r", "").replace("\n", "")
        msg["From"] = smtp_from.replace("\r", "").replace("\n", "")
        msg["To"] = lead.email.replace("\r", "").replace("\n", "")
        msg.attach(MIMEText(body.body, "plain"))
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, lead.email, msg.as_string())
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to send email: {str(e)}")

    _log_activity(db, lead.id, current_user.id, ActivityType.EMAIL_SENT,
                  comment=f"Subject: {body.subject}")
    recalculate_score(db, lead)
    db.commit()
    return {"ok": True, "sent_to": lead.email}


@router.post("/{lead_id}/call", response_model=ActivityRead)
def log_call(lead_id: int, body: CallLogRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _check_lead_access(lead, current_user)

    meta_parts = [f"Type: {body.call_type}"]
    if body.duration_minutes:
        meta_parts.append(f"Duration: {body.duration_minutes} min")
    if body.outcome:
        meta_parts.append(f"Outcome: {body.outcome}")
    meta_str = " | ".join(meta_parts)

    activity = LeadActivity(
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type=ActivityType.CALL_LOG,
        comment=body.notes,
        meta=meta_str,
    )
    db.add(activity)
    recalculate_score(db, lead)
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead or lead.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
