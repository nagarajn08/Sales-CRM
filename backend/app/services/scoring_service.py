from datetime import datetime
from sqlalchemy.orm import Session
from app.models.lead import Lead, LeadStatus
from app.models.lead_activity import LeadActivity


# ── Scoring weights ───────────────────────────────────────────────────────────

STATUS_SCORES = {
    LeadStatus.CONVERTED:             30,
    LeadStatus.INTERESTED_CALL_BACK:  25,
    LeadStatus.CALL_BACK:             20,
    LeadStatus.NEW:                   15,
    LeadStatus.BUSY:                  10,
    LeadStatus.NOT_REACHABLE:          5,
    LeadStatus.NOT_INTERESTED:         0,
}


def calculate_score(lead: Lead, activity_count: int) -> int:
    score = 0

    # 1. Status (max 30)
    score += STATUS_SCORES.get(lead.status, 0)

    # 2. Activity engagement (max 20) — each activity adds 2 pts, capped
    score += min(activity_count * 2, 20)

    # 3. Deal value (max 15)
    if lead.deal_value and lead.deal_value > 0:
        if lead.deal_value >= 500000:
            score += 15
        elif lead.deal_value >= 100000:
            score += 10
        elif lead.deal_value >= 10000:
            score += 7
        else:
            score += 4

    # 4. Follow-up scheduled (max 15)
    if lead.next_followup_at:
        now = datetime.utcnow()
        if lead.next_followup_at >= now:
            score += 15   # upcoming follow-up
        else:
            score += 5    # overdue but at least was tracked

    # 5. Recency — how recently the lead was created (max 20)
    if lead.created_at:
        age_days = (datetime.utcnow() - lead.created_at).days
        if age_days <= 1:
            score += 20
        elif age_days <= 7:
            score += 15
        elif age_days <= 30:
            score += 10
        elif age_days <= 90:
            score += 5

    return min(score, 100)


def recalculate_score(db: Session, lead: Lead) -> int:
    """Recalculate and save the score for a lead. Call after any lead mutation."""
    activity_count = db.query(LeadActivity).filter(LeadActivity.lead_id == lead.id).count()
    score = calculate_score(lead, activity_count)
    lead.score = score
    return score
