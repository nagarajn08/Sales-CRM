from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_superadmin
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.auth_service import hash_password
from app.services.billing_service import check_user_limit


class SessionRead(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    org_name: str | None
    login_at: datetime
    logout_at: datetime | None
    ip_address: str | None
    duration_minutes: int | None

    model_config = {"from_attributes": True}

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/sessions", response_model=list[SessionRead])
def list_sessions(
    limit: int = Query(200, le=500),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(UserSession).join(User, UserSession.user_id == User.id)
    if not admin.is_superadmin:
        q = q.filter(User.organization_id == admin.organization_id)
    q = q.order_by(UserSession.login_at.desc()).limit(limit)
    rows = q.all()
    result = []
    for s in rows:
        end = s.logout_at or datetime.utcnow()
        duration = int((end - s.login_at).total_seconds() / 60) if s.login_at else None
        result.append(SessionRead(
            id=s.id,
            user_id=s.user_id,
            user_name=s.user.name,
            user_email=s.user.email,
            org_name=s.user.org_name,
            login_at=s.login_at,
            logout_at=s.logout_at,
            ip_address=s.ip_address,
            duration_minutes=duration,
        ))
    return result


@router.get("/", response_model=list[UserRead])
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(User).filter(User.is_superadmin == False)
    if not admin.is_superadmin:
        q = q.filter(User.organization_id == admin.organization_id)
    return q.order_by(User.created_at.desc()).all()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, admin: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    check_user_limit(db, admin.organization_id, is_superadmin=admin.is_superadmin)
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        organization_id=admin.organization_id,
        email=body.email,
        name=body.name,
        mobile=body.mobile,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(user_id: int, body: UserUpdate, admin: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.mobile is not None:
        user.mobile = body.mobile
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.hashed_password = hash_password(body.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, admin: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_owner:
        raise HTTPException(status_code=400, detail="Cannot delete the organization owner")
    db.delete(user)
    db.commit()
