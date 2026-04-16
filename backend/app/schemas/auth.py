from pydantic import BaseModel, EmailStr, field_validator
import re


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── OTP Schemas ────────────────────────────────────────────────────────────
class OTPRequestBody(BaseModel):
    email: EmailStr
    mobile: str

    @field_validator("mobile")
    @classmethod
    def mobile_format(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 7:
            raise ValueError("Mobile number is too short")
        return v


class OTPVerifyBody(BaseModel):
    email: EmailStr
    mobile: str
    email_otp: str
    mobile_otp: str


class OTPRequestResponse(BaseModel):
    detail: str
    email_sent: bool
    # Only populated in dev mode (no SMTP configured)
    dev_email_otp: str | None = None
    dev_mobile_otp: str | None = None


class OTPVerifyResponse(BaseModel):
    verification_token: str


# ── Signup Schemas ─────────────────────────────────────────────────────────
def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number")
    return v


class IndividualSignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    mobile: str
    verification_token: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password(v)


class CorporateSignupRequest(BaseModel):
    company_name: str
    admin_name: str
    email: EmailStr
    password: str
    mobile: str
    verification_token: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password(v)


# ── Forgot / Reset Password Schemas ───────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    detail: str
    email_sent: bool
    dev_otp: str | None = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password(v)
