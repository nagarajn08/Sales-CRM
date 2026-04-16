import random
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.models.otp import OTPRecord
from app.config import settings

ALGORITHM = "HS256"
OTP_EXPIRE_MINUTES = 10
VERIFY_TOKEN_EXPIRE_MINUTES = 30


def _generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def create_otp_record(db: Session, email: str, mobile: str) -> dict:
    """Create (or replace) OTP records for email+mobile. Returns OTPs for dev mode."""
    # Invalidate previous records for this email
    db.query(OTPRecord).filter(OTPRecord.email == email).delete()
    db.flush()

    email_otp = _generate_otp()
    mobile_otp = _generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    record = OTPRecord(
        email=email,
        mobile=mobile,
        email_otp=email_otp,
        mobile_otp=mobile_otp,
        expires_at=expires,
    )
    db.add(record)
    db.commit()

    # Try to send email OTP via SMTP
    email_sent = _send_email_otp(email, email_otp)

    return {
        "email_sent": email_sent,
        # In dev mode (no SMTP configured) expose OTPs so developer can test
        "dev_email_otp": None if email_sent else email_otp,
        "dev_mobile_otp": mobile_otp,  # Always show mobile OTP (no SMS integration)
    }


def _send_email_otp(email: str, otp: str) -> bool:
    """Try to send OTP via SMTP. Returns True on success."""
    smtp_host = getattr(settings, "SMTP_HOST", None)
    smtp_port = getattr(settings, "SMTP_PORT", 587)
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_pass = getattr(settings, "SMTP_PASS", None)
    smtp_from = getattr(settings, "SMTP_FROM", smtp_user)

    if not smtp_host or not smtp_user:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your SalesCRM verification code"
        msg["From"] = smtp_from
        msg["To"] = email

        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px">Verify your email</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px">
            Enter this code to complete your SalesCRM registration.
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;
                      font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5">
            {otp}
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center">
            This code expires in {OTP_EXPIRE_MINUTES} minutes.
          </p>
        </div>"""

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, email, msg.as_string())
        return True
    except Exception:
        return False


def verify_otps(db: Session, email: str, mobile: str, email_otp: str, mobile_otp: str) -> bool:
    """Verify both OTPs. Returns True and marks them verified, or raises on failure."""
    record = (
        db.query(OTPRecord)
        .filter(OTPRecord.email == email, OTPRecord.mobile == mobile)
        .order_by(OTPRecord.created_at.desc())
        .first()
    )

    if not record:
        return False
    if datetime.utcnow() > record.expires_at:
        return False
    if record.email_otp != email_otp.strip():
        return False
    if record.mobile_otp != mobile_otp.strip():
        return False

    record.email_verified = True
    record.mobile_verified = True
    db.commit()
    return True


def create_password_reset_otp(db: Session, email: str) -> dict:
    """Generate and store a password-reset OTP for the given email."""
    db.query(OTPRecord).filter(OTPRecord.email == email, OTPRecord.mobile == "__reset__").delete()
    db.flush()

    otp = _generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    record = OTPRecord(
        email=email,
        mobile="__reset__",
        email_otp=otp,
        mobile_otp="000000",
        expires_at=expires,
    )
    db.add(record)
    db.commit()

    email_sent = _send_password_reset_email(email, otp)
    return {
        "email_sent": email_sent,
        "dev_otp": None if email_sent else otp,
    }


def verify_password_reset_otp(db: Session, email: str, otp: str) -> bool:
    """Verify a password-reset OTP. Returns True if valid."""
    record = (
        db.query(OTPRecord)
        .filter(OTPRecord.email == email, OTPRecord.mobile == "__reset__")
        .order_by(OTPRecord.created_at.desc())
        .first()
    )
    if not record:
        return False
    if datetime.utcnow() > record.expires_at:
        return False
    if record.email_otp != otp.strip():
        return False
    # Invalidate after successful verification
    db.delete(record)
    db.commit()
    return True


def _send_password_reset_email(email: str, otp: str) -> bool:
    """Send a password reset OTP email. Returns True on success."""
    smtp_host = getattr(settings, "SMTP_HOST", None)
    smtp_port = getattr(settings, "SMTP_PORT", 587)
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_pass = getattr(settings, "SMTP_PASS", None)
    smtp_from = getattr(settings, "SMTP_FROM", smtp_user)

    if not smtp_host or not smtp_user:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your SalesCRM password"
        msg["From"] = smtp_from
        msg["To"] = email

        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px">Reset your password</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px">
            Use this code to reset your SalesCRM password. It expires in {OTP_EXPIRE_MINUTES} minutes.
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;
                      font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5">
            {otp}
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>"""

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, email, msg.as_string())
        return True
    except Exception:
        return False


def create_verification_token(email: str, mobile: str) -> str:
    payload = {
        "email": email,
        "mobile": mobile,
        "type": "otp_verified",
        "exp": datetime.utcnow() + timedelta(minutes=VERIFY_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_verification_token(token: str) -> dict:
    """Decode and validate a verification token. Raises HTTPException on failure."""
    from fastapi import HTTPException
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "otp_verified":
            raise HTTPException(status_code=400, detail="Invalid verification token")
        return payload
    except JWTError:
        raise HTTPException(status_code=400, detail="Verification token expired or invalid")
