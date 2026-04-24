from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise ValueError()
        user_id = int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """Platform-level super admin only (admin@trackmylead.in)."""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user


def get_refresh_token_payload(refresh_token: str | None = Cookie(default=None)) -> dict:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError()
        return payload
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
