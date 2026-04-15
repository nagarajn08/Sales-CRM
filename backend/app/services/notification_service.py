from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.lead import Lead

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


def trigger_due_notifications(db: Session) -> None:
    """
    Called by APScheduler every minute.
    Fires for leads whose follow-up is within the next REMIND_BEFORE_MINUTES minutes
    (or already overdue but not yet notified).
    """
    now = datetime.utcnow()
    remind_threshold = now + timedelta(minutes=REMIND_BEFORE_MINUTES)

    # Leads whose follow-up time is between (far past) and (now + reminder window)
    due_leads = db.query(Lead).filter(
        Lead.next_followup_at <= remind_threshold,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
        Lead.assigned_to_id.isnot(None),
    ).all()

    for lead in due_leads:
        # Avoid duplicate: skip if an unread notification already exists for this follow-up
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

        notif = Notification(
            user_id=lead.assigned_to_id,
            lead_id=lead.id,
            message=msg,
            due_at=lead.next_followup_at,
        )
        db.add(notif)

    db.commit()
