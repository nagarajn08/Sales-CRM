from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationRead(BaseModel):
    id: int
    message: str
    is_read: bool
    due_at: datetime | None
    lead_id: int | None
    created_at: datetime
    model_config = {"from_attributes": True}


def _due_filter(q):
    """Surface notifications due within the next 30 minutes (or with no due date)."""
    from datetime import timedelta
    notify_from = datetime.utcnow() + timedelta(minutes=30)
    return q.filter(
        (Notification.due_at == None) | (Notification.due_at <= notify_from)
    )


@router.get("/", response_model=list[NotificationRead])
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    q = _due_filter(q)
    return q.order_by(Notification.created_at.desc()).limit(50).all()


@router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    )
    q = _due_filter(q)
    return {"count": q.count()}


@router.put("/{notif_id}/read")
def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notif_id)
    if n and n.user_id == current_user.id:
        n.is_read = True
        db.commit()
    return {"ok": True}


@router.put("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}
