import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, get_refresh_token_payload
from app.models.organization import Organization, OrgType
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest, TokenResponse,
    IndividualSignupRequest, CorporateSignupRequest,
    OTPRequestBody, OTPVerifyBody, OTPRequestResponse, OTPVerifyResponse,
    ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest,
)
from app.schemas.user import UserRead
from app.services.auth_service import (
    create_access_token, create_refresh_token,
    hash_password, verify_password,
)
from app.services.otp_service import (
    create_otp_record, verify_otps,
    create_verification_token, decode_verification_token,
    create_password_reset_otp, verify_password_reset_otp,
    get_otp_config,
)
from app.config import settings
from app.services.template_seeder import seed_predefined_templates
from app.services.billing_service import get_or_create_subscription
from app.models.user_session import UserSession

router = APIRouter(prefix="/api/auth", tags=["auth"])
COOKIE = "refresh_token"
limiter = Limiter(key_func=get_remote_address)


def _set_cookie(response: Response, token: str):
    is_production = not settings.FRONTEND_URL.startswith("http://localhost")
    response.set_cookie(
        COOKIE, token, httponly=True, secure=is_production, samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/api/auth",
    )


def _tokens(user: User, response: Response) -> dict:
    pwd_ts = user.password_changed_at.isoformat() if user.password_changed_at else ""
    data = {"sub": str(user.id), "email": user.email, "role": user.role, "pwd_ts": pwd_ts}
    access = create_access_token(data)
    refresh = create_refresh_token(data)
    _set_cookie(response, refresh)
    return {"access_token": access, "token_type": "bearer"}


# ── Login ──────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(body: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    user.last_login = datetime.utcnow()
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else None)
    session = UserSession(user_id=user.id, organization_id=user.organization_id, ip_address=ip)
    db.add(session)
    db.commit()
    return _tokens(user, response)


# ── OTP: Public config ────────────────────────────────────────────────────
@router.get("/otp-config")
def otp_config_endpoint(db: Session = Depends(get_db)):
    return get_otp_config(db)


# ── OTP: Request ──────────────────────────────────────────────────────────
@router.post("/otp/request", response_model=OTPRequestResponse)
@limiter.limit("5/minute")
def otp_request(body: OTPRequestBody, request: Request, db: Session = Depends(get_db)):
    # Check if email already registered
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    result = create_otp_record(db, body.email, body.mobile)
    return OTPRequestResponse(
        detail="OTP sent. Check your email and mobile.",
        email_sent=result["email_sent"],
        email_otp_enabled=result["email_otp_enabled"],
        mobile_otp_enabled=result["mobile_otp_enabled"],
        dev_email_otp=result.get("dev_email_otp"),
        dev_mobile_otp=result.get("dev_mobile_otp"),
    )


# ── OTP: Verify ───────────────────────────────────────────────────────────
@router.post("/otp/verify", response_model=OTPVerifyResponse)
@limiter.limit("10/minute")
def otp_verify(body: OTPVerifyBody, request: Request, db: Session = Depends(get_db)):
    ok = verify_otps(db, body.email, body.mobile, body.email_otp, body.mobile_otp)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    token = create_verification_token(body.email, body.mobile)
    return OTPVerifyResponse(verification_token=token)


# ── Signup: Individual ────────────────────────────────────────────────────
@router.post("/signup/individual", response_model=TokenResponse, status_code=201)
def signup_individual(body: IndividualSignupRequest, response: Response, db: Session = Depends(get_db)):
    # Validate verification token
    claims = decode_verification_token(body.verification_token)
    if claims["email"] != body.email or claims["mobile"] != body.mobile:
        raise HTTPException(status_code=400, detail="Verification token does not match email/mobile")

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
    seed_predefined_templates(db, org.id)
    get_or_create_subscription(db, org.id)
    return _tokens(user, response)


# ── Signup: Corporate ─────────────────────────────────────────────────────
@router.post("/signup/corporate", response_model=TokenResponse, status_code=201)
def signup_corporate(body: CorporateSignupRequest, response: Response, db: Session = Depends(get_db)):
    # Validate verification token
    claims = decode_verification_token(body.verification_token)
    if claims["email"] != body.email or claims["mobile"] != body.mobile:
        raise HTTPException(status_code=400, detail="Verification token does not match email/mobile")

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
    seed_predefined_templates(db, org.id)
    get_or_create_subscription(db, org.id)
    return _tokens(user, response)


# ── Forgot Password ───────────────────────────────────────────────────────
@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("5/minute")
def forgot_password(body: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    # Always return success to avoid email enumeration
    if not user:
        return ForgotPasswordResponse(detail="If that email exists, an OTP has been sent.", email_sent=False)
    result = create_password_reset_otp(db, body.email)
    return ForgotPasswordResponse(
        detail="OTP sent to your email address.",
        email_sent=result["email_sent"],
        dev_otp=result.get("dev_otp"),
    )


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(body: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")
    if not verify_password_reset_otp(db, body.email, body.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    user.hashed_password = hash_password(body.new_password)
    user.password_changed_at = datetime.utcnow()
    # Invalidate all active sessions
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.logout_at.is_(None),
    ).update({"logout_at": datetime.utcnow()})
    db.commit()
    return {"detail": "Password reset successfully"}


# ── Token refresh / logout / me ───────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
def refresh(response: Response, payload: dict = Depends(get_refresh_token_payload), db: Session = Depends(get_db)):
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    # Reject tokens issued before a password change
    token_pwd_ts = payload.get("pwd_ts", "")
    current_pwd_ts = user.password_changed_at.isoformat() if user.password_changed_at else ""
    if token_pwd_ts != current_pwd_ts:
        raise HTTPException(status_code=401, detail="Session expired — please log in again")
    return _tokens(user, response)


@router.post("/logout")
def logout(response: Response, db: Session = Depends(get_db), payload: dict = Depends(get_refresh_token_payload)):
    try:
        user_id = int(payload["sub"])
        session = (
            db.query(UserSession)
            .filter(UserSession.user_id == user_id, UserSession.logout_at.is_(None))
            .order_by(UserSession.login_at.desc())
            .first()
        )
        if session:
            session.logout_at = datetime.utcnow()
            db.commit()
    except Exception:
        pass
    response.delete_cookie(COOKIE, path="/api/auth")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Mobile Auth ───────────────────────────────────────────────────────────────
from pydantic import BaseModel as _PydanticBaseModel

class MobileLoginRequest(_PydanticBaseModel):
    email: str
    password: str

class MobileTokenResponse(_PydanticBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class MobileRefreshRequest(_PydanticBaseModel):
    refresh_token: str

@router.post("/mobile/login", response_model=MobileTokenResponse)
@limiter.limit("10/minute")
def mobile_login(body: MobileLoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    user.last_login = datetime.utcnow()
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else None)
    session = UserSession(user_id=user.id, organization_id=user.organization_id, ip_address=ip)
    db.add(session)
    db.commit()
    pwd_ts = user.password_changed_at.isoformat() if user.password_changed_at else ""
    data = {"sub": str(user.id), "email": user.email, "role": user.role, "pwd_ts": pwd_ts}
    access = create_access_token(data)
    refresh = create_refresh_token(data)
    org = db.get(Organization, user.organization_id)
    return MobileTokenResponse(
        access_token=access,
        refresh_token=refresh,
        user={
            "id": user.id, "name": user.name, "email": user.email,
            "role": user.role, "is_superadmin": user.is_superadmin,
            "org_name": org.name if org else None,
            "org_type": org.type if org else None,
        }
    )

@router.post("/mobile/refresh")
@limiter.limit("30/minute")
def mobile_refresh(body: MobileRefreshRequest, request: Request, db: Session = Depends(get_db)):
    from app.services.auth_service import decode_token
    from jose import JWTError
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(payload["sub"])
        user = db.get(User, user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        data = {"sub": str(user.id), "email": user.email, "role": user.role,
                "pwd_ts": user.password_changed_at.isoformat() if user.password_changed_at else ""}
        return {"access_token": create_access_token(data), "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
