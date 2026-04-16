from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.lead import Lead
from app.models.app_settings import AppSettings

# How many minutes BEFORE the follow-up time to fire the reminder
REMIND_BEFORE_MINUTES = 15


def create_followup_notification(db: Session, lead: Lead) -> None:
    """Create a notification when a follow-up is scheduled."""
    if not lead.assigned_to_id or not lead.next_followup_at:
        return
    notif = Notification(
        user_id=lead.assigned_to_id,
        lead_id=lead.id,
        message=f"Follow-up in {REMIND_BEFORE_MINUTES} min: {lead.name}",
        due_at=lead.next_followup_at,
    )
    db.add(notif)
    db.commit()


def _get_twilio_cfg(db: Session, org_id: int) -> dict:
    rows = db.query(AppSettings).filter(AppSettings.organization_id == org_id).all()
    cfg = {r.key: r.value for r in rows}
    return {
        "account_sid": cfg.get("twilio_account_sid", "").strip(),
        "auth_token": cfg.get("twilio_auth_token", "").strip(),
        "from_number": cfg.get("twilio_from_number", "").strip(),
    }


def _send_whatsapp_sms(twilio_cfg: dict, mobile: str, message: str) -> None:
    """Send WhatsApp/SMS via Twilio. Silently skips if not configured."""
    sid = twilio_cfg.get("account_sid", "")
    token = twilio_cfg.get("auth_token", "")
    from_number = twilio_cfg.get("from_number", "")

    if not sid or not token or not from_number:
        return

    try:
        from twilio.rest import Client  # type: ignore
        client = Client(sid, token)

        to_number = mobile.strip()
        if not to_number.startswith("+"):
            to_number = "+91" + to_number.lstrip("0")  # default India country code

        if from_number.startswith("whatsapp:"):
            client.messages.create(
                body=message,
                from_=from_number,
                to=f"whatsapp:{to_number}",
            )
        else:
            client.messages.create(
                body=message,
                from_=from_number,
                to=to_number,
            )
    except Exception as e:
        print(f"[Reminder] WhatsApp/SMS failed for {mobile}: {e}")


def trigger_due_notifications(db: Session) -> None:
    """
    Called by APScheduler every minute.
    Fires for leads whose follow-up is within the next REMIND_BEFORE_MINUTES minutes.
    Also sends WhatsApp/SMS to the assigned agent if Twilio is configured.
    """
    now = datetime.utcnow()
    remind_threshold = now + timedelta(minutes=REMIND_BEFORE_MINUTES)

    due_leads = db.query(Lead).filter(
        Lead.next_followup_at <= remind_threshold,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
        Lead.assigned_to_id.isnot(None),
    ).all()

    # Cache Twilio config per org to avoid repeated DB queries
    twilio_cache: dict[int, dict] = {}

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

        # WhatsApp / SMS to the assigned agent
        if lead.assigned_to and lead.assigned_to.mobile and lead.organization_id:
            org_id = lead.organization_id
            if org_id not in twilio_cache:
                twilio_cache[org_id] = _get_twilio_cfg(db, org_id)
            twilio_cfg = twilio_cache[org_id]

            if twilio_cfg.get("account_sid"):
                whatsapp_msg = (
                    f"SalesCRM Reminder\n"
                    f"Follow-up {'in ' + str(minutes_left) + ' min' if minutes_left > 0 else 'NOW (overdue)'}\n"
                    f"Lead: {lead.name}\n"
                    f"Mobile: {lead.mobile or '-'}\n"
                    f"Status: {lead.status.value.replace('_', ' ').title()}"
                )
                _send_whatsapp_sms(twilio_cfg, lead.assigned_to.mobile, whatsapp_msg)

    db.commit()
