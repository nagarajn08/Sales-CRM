import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.lead import Lead
from app.models.app_settings import AppSettings

# How many minutes BEFORE the follow-up time to fire the reminder
REMIND_BEFORE_MINUTES = 15



def _get_fast2sms_key(db: Session, org_id: int) -> str:
    row = db.query(AppSettings).filter(
        AppSettings.organization_id == org_id,
        AppSettings.key == "fast2sms_api_key",
    ).first()
    return (row.value or "").strip() if row else ""


def _send_whatsapp(api_key: str, mobile: str, message: str) -> None:
    """Send WhatsApp message via Fast2SMS route=q. Silently skips if not configured."""
    if not api_key:
        return
    number = mobile.strip()
    if number.startswith("+91"):
        number = number[3:]
    elif number.startswith("91") and len(number) == 12:
        number = number[2:]
    try:
        payload = urllib.parse.urlencode({
            "message": message,
            "language": "english",
            "route": "q",
            "numbers": number,
        }).encode()
        req = urllib.request.Request(
            "https://www.fast2sms.com/dev/bulkV2",
            data=payload,
            headers={
                "authorization": api_key,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"[Reminder] WhatsApp failed for {mobile}: {e}")


def trigger_due_notifications(db: Session) -> None:
    """
    Called by APScheduler every minute.
    Fires for leads whose follow-up is within the next REMIND_BEFORE_MINUTES minutes.
    Also sends WhatsApp to the assigned agent via Fast2SMS if configured.
    """
    now = datetime.utcnow()
    remind_threshold = now + timedelta(minutes=REMIND_BEFORE_MINUTES)

    due_leads = db.query(Lead).filter(
        Lead.next_followup_at <= remind_threshold,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
        Lead.assigned_to_id.isnot(None),
    ).all()

    # Cache Fast2SMS key per org to avoid repeated DB queries
    f2s_cache: dict[int, str] = {}

    for lead in due_leads:
        # Avoid duplicate: skip if a notification already exists for this follow-up
        existing = db.query(Notification).filter(
            Notification.lead_id == lead.id,
            Notification.due_at == lead.next_followup_at,
        ).first()
        if existing:
            continue

        minutes_left = int((lead.next_followup_at - now).total_seconds() / 60)
        if minutes_left > 0:
            msg = f"Follow-up in {minutes_left} min: {lead.name} ({lead.mobile or lead.email or ''})"
        else:
            msg = f"Follow-up overdue: {lead.name} ({lead.mobile or lead.email or ''})"

        # In-app notification
        notif = Notification(
            user_id=lead.assigned_to_id,
            lead_id=lead.id,
            message=msg,
            due_at=lead.next_followup_at,
        )
        db.add(notif)
        db.flush()

        # WhatsApp to the assigned agent via Fast2SMS
        if lead.assigned_to and lead.assigned_to.mobile and lead.organization_id:
            org_id = lead.organization_id
            if org_id not in f2s_cache:
                f2s_cache[org_id] = _get_fast2sms_key(db, org_id)
            api_key = f2s_cache[org_id]

            if api_key:
                whatsapp_msg = (
                    f"TrackmyLead Reminder\n"
                    f"Follow-up {'in ' + str(minutes_left) + ' min' if minutes_left > 0 else 'NOW (overdue)'}\n"
                    f"Lead: {lead.name}\n"
                    f"Mobile: {lead.mobile or '-'}\n"
                    f"Status: {lead.status.value.replace('_', ' ').title()}"
                )
                _send_whatsapp(api_key, lead.assigned_to.mobile, whatsapp_msg)

    db.commit()
