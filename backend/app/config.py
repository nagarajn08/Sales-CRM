import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql://salescrm:salescrm123@localhost:5432/salescrm"
    # Must be set in .env — do NOT use a generated default in production
    SECRET_KEY: str = secrets.token_hex(32)
    FRONTEND_URL: str = "http://localhost:5173"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "Admin@123"
    ADMIN_NAME: str = "Administrator"

    # Razorpay (leave empty for demo/mock mode)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Twilio — WhatsApp/SMS follow-up reminders (leave empty to disable)
    # For WhatsApp: set TWILIO_FROM_NUMBER = "whatsapp:+14155238886"
    # For SMS: set TWILIO_FROM_NUMBER = "+1XXXXXXXXXX"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # Sentry — error tracking (leave empty to disable)
    SENTRY_DSN: str = ""


settings = Settings()

# ── Plan definitions ──────────────────────────────────────────────────────────
PLANS = {
    "free": {
        "name": "Free",
        "price": 0,
        "original_price": 0,
        "discount_pct": 0,
        "max_users": 1,
        "max_leads": 25,
        "razorpay_plan_id": "",
        "features": [
            "1 user",
            "25 leads",
            "Basic lead management",
            "Email templates (view only)",
            "Dashboard overview",
        ],
    },
    "pro": {
        "name": "Pro",
        "price": 3999,
        "original_price": 9999,
        "discount_pct": 60,
        "max_users": -1,   # unlimited
        "max_leads": -1,   # unlimited
        "razorpay_plan_id": "",
        "features": [
            "Unlimited users",
            "Unlimited leads",
            "Full lead management & pipeline",
            "Email sending (SMTP)",
            "WhatsApp click-to-chat",
            "Bulk actions & CSV export",
            "Call log & activity timeline",
            "Email templates (create & send)",
            "Dashboard with deal value charts",
            "Follow-up reminders & notifications",
            "Social media lead capture (webhooks)",
            "Team management",
            "Priority support",
        ],
    },
}
