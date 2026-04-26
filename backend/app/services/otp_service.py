import random
import smtplib
import threading
import urllib.request
import urllib.parse
import json as _json
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


def _get_platform_smtp(db: Session) -> dict:
    """Return SMTP config: .env takes priority, PlatformConfig is fallback."""
    if settings.SMTP_HOST and settings.SMTP_USER:
        return {
            "host": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "user": settings.SMTP_USER,
            "password": settings.SMTP_PASS,
            "from": settings.SMTP_FROM or settings.SMTP_USER,
        }
    # Fall back to platform-level config saved via the Settings page
    try:
        from app.models.platform_config import PlatformConfig
        rows = {r.key: r.value for r in db.query(PlatformConfig).all()}
        host = rows.get("smtp_host", "").strip()
        user = rows.get("smtp_user", "").strip()
        if host and user:
            return {
                "host": host,
                "port": int(rows.get("smtp_port", "587")),
                "user": user,
                "password": rows.get("smtp_password", ""),
                "from": rows.get("smtp_from", "") or user,
            }
    except Exception:
        pass
    return {}


def _send_smtp(smtp: dict, to: str, subject: str, html: str) -> bool:
    """Send an email using the provided smtp config dict. Returns True on success."""
    host = smtp.get("host", "")
    port = int(smtp.get("port", 587))
    user = smtp.get("user", "")
    password = smtp.get("password", "")
    sender = smtp.get("from", user)
    if not host or not user:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=5) as server:
                server.login(user, password)
                server.sendmail(sender, to, msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=5) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(user, password)
                server.sendmail(sender, to, msg.as_string())
        return True
    except Exception:
        return False


def _is_dev() -> bool:
    return settings.FRONTEND_URL.startswith("http://localhost")


def _get_otp_flags(db: Session) -> tuple[bool, bool]:
    """Return (email_otp_enabled, mobile_otp_enabled) from platform_config."""
    from app.models.platform_config import PlatformConfig
    rows = {r.key: r.value for r in db.query(PlatformConfig).filter(
        PlatformConfig.key.in_(["otp_email_enabled", "otp_mobile_enabled"])
    ).all()}
    email_on  = rows.get("otp_email_enabled",  "true").lower() != "false"
    mobile_on = rows.get("otp_mobile_enabled", "true").lower() != "false"
    return email_on, mobile_on


def get_otp_config(db: Session) -> dict:
    """Public-facing OTP config (which channels are required)."""
    email_on, mobile_on = _get_otp_flags(db)
    return {"email_otp_enabled": email_on, "mobile_otp_enabled": mobile_on}


def create_otp_record(db: Session, email: str, mobile: str) -> dict:
    """Create (or replace) OTP records for email+mobile. Returns OTPs only in dev mode."""
    email_on, mobile_on = _get_otp_flags(db)

    db.query(OTPRecord).filter(OTPRecord.email == email).delete()
    db.flush()

    email_otp  = _generate_otp() if email_on  else "000000"
    mobile_otp = _generate_otp() if mobile_on else "000000"
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    record = OTPRecord(
        email=email, mobile=mobile,
        email_otp=email_otp, mobile_otp=mobile_otp,
        expires_at=expires,
    )
    db.add(record)
    db.commit()

    smtp = _get_platform_smtp(db)
    smtp_configured = bool(smtp.get("host") and smtp.get("user"))

    # Send email in background so the API response is instant (no 5-15s SMTP timeout blocking)
    if email_on and smtp_configured:
        threading.Thread(
            target=_send_email_otp, args=(email, email_otp, dict(smtp)), daemon=True
        ).start()
        email_sent = True  # optimistic — background thread handles delivery
    else:
        email_sent = False

    mobile_sent = _send_mobile_otp(mobile, mobile_otp) if mobile_on else False

    dev = _is_dev()
    return {
        "email_sent":        email_sent,
        "smtp_configured":   smtp_configured,
        "email_otp_enabled":  email_on,
        "mobile_otp_enabled": mobile_on,
        "dev_email_otp":  email_otp  if dev and not email_sent  else None,
        "dev_mobile_otp": mobile_otp if dev and not mobile_sent else None,
    }


def _send_mobile_otp(mobile: str, otp: str) -> bool:
    """Send OTP via Fast2SMS WhatsApp channel. Returns True on success."""
    if not settings.FAST2SMS_API_KEY:
        return False
    # Fast2SMS expects 10-digit Indian number (strip +91 / 91 prefix)
    number = mobile.strip()
    if number.startswith("+91"):
        number = number[3:]
    elif number.startswith("91") and len(number) == 12:
        number = number[2:]
    try:
        payload = urllib.parse.urlencode({
            "message": f"Your TrackmyLead verification code is {otp}. Valid for {OTP_EXPIRE_MINUTES} minutes. Do not share this code.",
            "language": "english",
            "route": "q",          # Fast2SMS WhatsApp route
            "numbers": number,
        }).encode()
        req = urllib.request.Request(
            "https://www.fast2sms.com/dev/bulkV2",
            data=payload,
            headers={
                "authorization": settings.FAST2SMS_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = _json.loads(resp.read())
            return result.get("return", False) is True
    except Exception:
        return False


def _send_email_otp(email: str, otp: str, smtp: dict) -> bool:
    """Send OTP email using the provided smtp config dict."""
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px">Verify your email</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px">
        Enter this code to complete your TrackmyLead registration.
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;
                  font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5">
        {otp}
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center">
        This code expires in {OTP_EXPIRE_MINUTES} minutes.
      </p>
    </div>"""
    return _send_smtp(smtp, email, "Your TrackmyLead verification code", html)


MAX_OTP_ATTEMPTS = 5


def verify_otps(db: Session, email: str, mobile: str, email_otp: str, mobile_otp: str) -> bool:
    """Verify both OTPs. Returns True and marks them verified, or raises on failure."""
    email_on, mobile_on = _get_otp_flags(db)

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
    if record.failed_attempts >= MAX_OTP_ATTEMPTS:
        # Burn the record — attacker must restart the flow
        db.delete(record)
        db.commit()
        return False

    email_ok  = (not email_on)  or (record.email_otp  == email_otp.strip())
    mobile_ok = (not mobile_on) or (record.mobile_otp == mobile_otp.strip())

    if not email_ok or not mobile_ok:
        record.failed_attempts = (record.failed_attempts or 0) + 1
        db.commit()
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

    smtp = _get_platform_smtp(db)
    email_sent = _send_password_reset_email(email, otp, smtp)
    dev = _is_dev()
    return {
        "email_sent": email_sent,
        "dev_otp": otp if dev and not email_sent else None,
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


def _send_password_reset_email(email: str, otp: str, smtp: dict) -> bool:
    """Send a password reset OTP email using the provided smtp config dict."""
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px">Reset your password</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px">
        Use this code to reset your TrackmyLead password. It expires in {OTP_EXPIRE_MINUTES} minutes.
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;
                  font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5">
        {otp}
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>"""
    return _send_smtp(smtp, email, "Reset your TrackmyLead password", html)


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
