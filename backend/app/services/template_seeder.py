from sqlalchemy.orm import Session

PREDEFINED_TEMPLATES = [
    {
        "name": "Call Back Follow-up",
        "subject": "Following up on our call — {{name}}",
        "body": (
            "Hi {{name}},\n\n"
            "Thank you for your time earlier. As discussed, I wanted to follow up and check if you had any questions or needed more information about our offering.\n\n"
            "Please let me know a convenient time for a call and I'll make sure to connect with you.\n\n"
            "Looking forward to speaking with you.\n\n"
            "Best regards"
        ),
    },
    {
        "name": "Busy — Will Reach Back",
        "subject": "Sorry to catch you at a bad time — {{name}}",
        "body": (
            "Hi {{name}},\n\n"
            "I understand you were busy when we last tried to connect. I wanted to reach out again and see if now is a better time.\n\n"
            "We have some exciting updates that I believe could be valuable for {{company}}. I'd love to share them with you at your convenience.\n\n"
            "Please reply with a time that works best for you.\n\n"
            "Best regards"
        ),
    },
    {
        "name": "Not Reachable — Check-in",
        "subject": "Tried reaching you — {{name}}",
        "body": (
            "Hi {{name}},\n\n"
            "I've tried reaching out a couple of times but haven't been able to connect. I hope everything is going well.\n\n"
            "I'd love to share how we can help {{company}} and explore if there's a fit. Please let me know the best way and time to reach you.\n\n"
            "Looking forward to connecting.\n\n"
            "Best regards"
        ),
    },
    {
        "name": "Interested — Next Steps",
        "subject": "Excited to move forward with you — {{name}}",
        "body": (
            "Hi {{name}},\n\n"
            "Thank you for expressing interest! I'm glad our conversation was helpful.\n\n"
            "As a next step, I'd like to schedule a detailed walkthrough and discuss how we can tailor our solution for {{company}}.\n\n"
            "Could you please share your availability for a 30-minute call this week? I'll send a calendar invite right away.\n\n"
            "Excited to work with you!\n\n"
            "Best regards"
        ),
    },
]


def seed_predefined_templates(db: Session, org_id: int):
    """Seed predefined email templates for an org if not already seeded."""
    from app.models.email_template import EmailTemplate
    existing = db.query(EmailTemplate).filter(
        EmailTemplate.organization_id == org_id,
        EmailTemplate.is_predefined == True,
    ).count()
    if existing:
        return
    for t in PREDEFINED_TEMPLATES:
        db.add(EmailTemplate(
            organization_id=org_id,
            user_id=None,
            name=t["name"],
            subject=t["subject"],
            body=t["body"],
            is_global=True,
            is_predefined=True,
        ))
    db.commit()
