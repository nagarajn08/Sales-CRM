from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.lead import Lead


def create_followup_notification(db: Session, lead: Lead) -> None:
    """Create a notification for the assigned user when a follow-up is due."""
    if not lead.assigned_to_id or not lead.next_followup_at:
        return
    notif = Notification(
        user_id=lead.assigned_to_id,
        lead_id=lead.id,
        message=f"Follow-up due for lead: {lead.name}",
        due_at=lead.next_followup_at,
    )
    db.add(notif)
    db.commit()


def trigger_due_notifications(db: Session) -> None:
    """Called by APScheduler — create notifications for overdue follow-ups."""
    now = datetime.utcnow()
    due_leads = db.query(Lead).filter(
        Lead.next_followup_at <= now,
        Lead.is_active == True,
        Lead.assigned_to_id.isnot(None),
    ).all()

    for lead in due_leads:
        # Avoid duplicate notifications
        existing = db.query(Notification).filter(
            Notification.lead_id == lead.id,
            Notification.due_at == lead.next_followup_at,
            Notification.is_read == False,
        ).first()
        if not existing:
            notif = Notification(
                user_id=lead.assigned_to_id,
                lead_id=lead.id,
                message=f"Follow-up due: {lead.name} ({lead.mobile or lead.email or ''})",
                due_at=lead.next_followup_at,
            )
            db.add(notif)
    db.commit()
