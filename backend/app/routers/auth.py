import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, get_refresh_token_payload
from app.models.organization import Organization, OrgType
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest, TokenResponse,
    IndividualSignupRequest, CorporateSignupRequest,
)
from app.schemas.user import UserRead
from app.services.auth_service import (
    create_access_token, create_refresh_token,
    hash_password, verify_password,
)
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
COOKIE = "refresh_token"


def _set_cookie(response: Response, token: str):
    response.set_cookie(
        COOKIE, token, httponly=True, secure=False, samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/api/auth",
    )


def _tokens(user: User, response: Response) -> dict:
    data = {"sub": str(user.id), "email": user.email, "role": user.role}
    access = create_access_token(data)
    refresh = create_refresh_token(data)
    _set_cookie(response, refresh)
    return {"access_token": access, "token_type": "bearer"}


# ── Login ──────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    user.last_login = datetime.utcnow()
    db.commit()
    return _tokens(user, response)


# ── Signup: Individual ────────────────────────────────────────────────────
@router.post("/signup/individual", response_model=TokenResponse, status_code=201)
def signup_individual(body: IndividualSignupRequest, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    org = Organization(
        name=body.name,
        type=OrgType.INDIVIDUAL,
        webhook_token=secrets.token_urlsafe(24),
    )
    db.add(org)
    db.flush()
    user = User(
        organization_id=org.id,
        email=body.email,
        name=body.name,
        mobile=body.mobile,
        hashed_password=hash_password(body.password),
        role=UserRole.ADMIN,
        is_owner=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _tokens(user, response)


# ── Signup: Corporate ─────────────────────────────────────────────────────
@router.post("/signup/corporate", response_model=TokenResponse, status_code=201)
def signup_corporate(body: CorporateSignupRequest, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    org = Organization(
        name=body.company_name,
        type=OrgType.CORPORATE,
        webhook_token=secrets.token_urlsafe(24),
    )
    db.add(org)
    db.flush()
    user = User(
        organization_id=org.id,
        email=body.email,
        name=body.admin_name,
        mobile=body.mobile,
        hashed_password=hash_password(body.password),
        role=UserRole.ADMIN,
        is_owner=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _tokens(user, response)


# ── Token refresh / logout / me ───────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
def refresh(response: Response, payload: dict = Depends(get_refresh_token_payload), db: Session = Depends(get_db)):
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return _tokens(user, response)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, path="/api/auth")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
