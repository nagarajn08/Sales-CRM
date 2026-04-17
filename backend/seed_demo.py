"""
Demo seed script — creates a demo organisation with:
  • 1 Admin  (admin@demo.com  / Demo@1234)
  • 4 Sales users
  • 120 leads spread across users, sources, statuses, priorities
  • Activities (calls, comments, status changes) on every lead
  • Follow-up dates: some overdue, some due today, some upcoming

Run from the backend/ directory:
    python seed_demo.py

Safe to run multiple times — skips creation if demo org already exists.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import random
from datetime import datetime, timedelta, date
from app.database import SessionLocal, engine, Base
from app.models import *            # ensures all models are registered
from app.models.organization import Organization, OrgType
from app.models.user import User, UserRole
from app.models.lead import Lead, LeadStatus, LeadSource, LeadPriority
from app.models.lead_activity import LeadActivity, ActivityType
from app.services.auth_service import hash_password

# ── Create all tables (idempotent) ─────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ── Guard: skip if demo org exists ─────────────────────────────────────────────
if db.query(Organization).filter(Organization.name == "Demo Corp").first():
    print("Demo org already exists - nothing to do.")
    db.close()
    sys.exit(0)

# ── 1. Organisation ────────────────────────────────────────────────────────────
org = Organization(name="Demo Corp", type=OrgType.CORPORATE)
db.add(org)
db.flush()

# ── 2. Users ───────────────────────────────────────────────────────────────────
USERS_DATA = [
    dict(name="Arjun Mehta",   email="admin@demo.com",  role=UserRole.ADMIN,   is_owner=True,  password="Demo@1234"),
    dict(name="Priya Nair",    email="priya@demo.com",  role=UserRole.USER,    is_owner=False, password="Demo@1234"),
    dict(name="Rohit Sharma",  email="rohit@demo.com",  role=UserRole.USER,    is_owner=False, password="Demo@1234"),
    dict(name="Sneha Iyer",    email="sneha@demo.com",  role=UserRole.USER,    is_owner=False, password="Demo@1234"),
    dict(name="Karan Patel",   email="karan@demo.com",  role=UserRole.USER,    is_owner=False, password="Demo@1234"),
]

users = []
for u in USERS_DATA:
    user = User(
        organization_id=org.id,
        name=u["name"],
        email=u["email"],
        hashed_password=hash_password(u["password"]),
        role=u["role"],
        is_owner=u["is_owner"],
        is_active=True,
    )
    db.add(user)
    users.append(user)
db.flush()

admin = users[0]
sales_users = users[1:]

# ── 3. Lead pool data ──────────────────────────────────────────────────────────
FIRST_NAMES = [
    "Rahul","Anita","Deepak","Kavya","Suresh","Meena","Vikram","Pooja",
    "Ajay","Divya","Nitin","Rekha","Sanjay","Geeta","Manish","Sunita",
    "Arun","Latha","Vinod","Nisha","Ramesh","Usha","Harish","Shobha",
    "Prakash","Anjali","Sachin","Smita","Rajesh","Hema","Girish","Leela",
    "Mohan","Radha","Sunil","Varsha","Kishore","Nalini","Vivek","Madhuri",
    "Ashok","Preeti","Santosh","Swati","Naresh","Padma","Dilip","Sheela",
    "Ganesh","Archana","Ravi","Savita","Subhash","Vandana","Praveen","Jaya",
    "Mahesh","Seema","Hemant","Chetna","Yogesh","Bharati","Tushar","Manasi",
]
LAST_NAMES = [
    "Sharma","Patel","Nair","Iyer","Singh","Verma","Gupta","Mehta",
    "Joshi","Reddy","Kumar","Shah","Chavan","Patil","Desai","Kulkarni",
    "Rao","Pillai","Menon","Kapoor","Malhotra","Sinha","Mishra","Pandey",
    "Trivedi","Bose","Das","Sen","Chakraborty","Mukherjee","Ghosh","Roy",
]
COMPANIES = [
    "Infosys Ltd","TCS","Wipro","HCL Technologies","Tech Mahindra",
    "Reliance Industries","HDFC Bank","ICICI Bank","Axis Bank","SBI",
    "Bajaj Auto","Maruti Suzuki","Tata Motors","Hero MotoCorp","TVS Motors",
    "Cipla","Sun Pharma","Dr. Reddy's","Lupin","Biocon",
    "Asian Paints","Berger Paints","Pidilite Industries","Havells","Crompton",
    "Zomato","Swiggy","PhonePe","Razorpay","Freshworks",
    "Nykaa","Meesho","Zepto","Blinkit","Dunzo",
    "Muthoot Finance","Manappuram","Shriram Finance","Chola Finance","IIFL",
    "Tanla Platforms","Nazara","IndiaMart","TradeIndia","JustDial",
    "Brigade Group","Prestige Estates","Sobha","Godrej Properties","DLF",
    None, None, None,  # some leads without company
]
SOURCES = list(LeadSource)
STATUSES = list(LeadStatus)
PRIORITIES = list(LeadPriority)
TAGS_POOL = [
    "enterprise","referral","hot","cold","follow-up","demo-done",
    "proposal-sent","negotiation","urgent","decision-maker",
    "budget-approved","long-term","q1-target","social","repeat",
]
NOTES_POOL = [
    "Interested in the pro plan, needs pricing details.",
    "Called twice, no answer. Try afternoon.",
    "Decision maker is away until next week.",
    "Very interested, wants a full demo.",
    "Budget approved by management.",
    "Referred by existing client Ramesh Patel.",
    "Needs to discuss with team before deciding.",
    "Price-sensitive, ask about EMI options.",
    "Looking to switch from competitor CRM.",
    "Has 50+ users, potential enterprise deal.",
    "Trial account created, follow up after 3 days.",
    "Requested a custom proposal.",
    "Meeting scheduled for next Tuesday.",
    "Has specific integration requirements.",
    "Happy with demo, moving to contract stage.",
    "Not reachable on mobile, try email.",
    "Busy season — call again in 2 weeks.",
    "Wants WhatsApp integration demo.",
    "Lead from Facebook campaign — high intent.",
    "Website inquiry, downloaded brochure.",
]
COMMENTS_POOL = [
    "Called, discussed pricing. Interested.",
    "Left voicemail. Awaiting callback.",
    "Sent follow-up email with brochure.",
    "Demo done. Positive feedback.",
    "Negotiating discount. Escalated to manager.",
    "Client asked for 1-week extension.",
    "Proposal sent via email.",
    "WhatsApp message sent with details.",
    "Follow-up call — still evaluating.",
    "Contract shared. Awaiting signature.",
    "Payment link sent.",
    "Onboarding scheduled for Monday.",
    "Churned — went with competitor.",
    "Re-engaged after 2 months.",
    "Increased deal size — added 10 more users.",
]

def random_date_past(days_back=90):
    return datetime.utcnow() - timedelta(days=random.randint(0, days_back), hours=random.randint(0, 23))

def random_followup():
    """Mix of overdue, today, and upcoming."""
    today = date.today()
    r = random.random()
    if r < 0.20:
        # overdue (1-14 days ago)
        d = today - timedelta(days=random.randint(1, 14))
    elif r < 0.40:
        # due today
        d = today
    elif r < 0.70:
        # upcoming (1-10 days)
        d = today + timedelta(days=random.randint(1, 10))
    else:
        return None
    return datetime.combine(d, datetime.min.time()) + timedelta(hours=random.randint(9, 18))

def random_tags():
    n = random.randint(0, 3)
    if n == 0:
        return None
    return ",".join(random.sample(TAGS_POOL, n))

# ── 4. Generate 120 leads ──────────────────────────────────────────────────────
print("Creating 120 leads...")
leads = []
for i in range(120):
    first = random.choice(FIRST_NAMES)
    last  = random.choice(LAST_NAMES)
    name  = f"{first} {last}"
    mobile= f"9{random.randint(100000000, 999999999)}"
    assigned = random.choice(sales_users)
    status = random.choice(STATUSES)
    created_at = random_date_past(90)

    lead = Lead(
        organization_id=org.id,
        name=name,
        email=f"{first.lower()}.{last.lower()}{random.randint(10,99)}@{'gmail' if random.random()<0.6 else 'yahoo'}.com",
        mobile=mobile,
        whatsapp=mobile if random.random() > 0.3 else None,
        company=random.choice(COMPANIES),
        source=random.choice(SOURCES),
        status=status,
        priority=random.choice(PRIORITIES),
        assigned_to_id=assigned.id,
        created_by_id=admin.id,
        deal_value=random.choice([
            None, None,
            5000, 10000, 15000, 25000, 50000, 75000,
            100000, 150000, 200000, 300000, 500000,
        ]) if random.random() > 0.3 else None,
        score=random.randint(10, 95),
        notes=random.choice(NOTES_POOL),
        tags=random_tags(),
        next_followup_at=random_followup() if status not in (LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED) else None,
        is_active=status not in (LeadStatus.NOT_INTERESTED,) or random.random() > 0.5,
        created_at=created_at,
        updated_at=created_at + timedelta(days=random.randint(0, 5)),
        last_comment=random.choice(COMMENTS_POOL),
    )
    db.add(lead)
    leads.append((lead, assigned))

db.flush()

# ── 5. Activities per lead ─────────────────────────────────────────────────────
print("Creating activities...")

def add_activity(lead, user, atype, comment=None, old_st=None, new_st=None, followup=None, at=None):
    act = LeadActivity(
        lead_id=lead.id,
        user_id=user.id,
        activity_type=atype,
        comment=comment,
        old_status=old_st,
        new_status=new_st,
        followup_date=followup,
        created_at=at or (lead.created_at + timedelta(hours=random.randint(1, 48))),
    )
    db.add(act)

today_start = datetime.combine(date.today(), datetime.min.time())

for lead, assigned in leads:
    # 1. Created activity
    add_activity(lead, admin, ActivityType.CREATED,
                 comment="Lead created", at=lead.created_at)

    # 2. 1-4 status change activities
    statuses_walked = [LeadStatus.NEW]
    current = LeadStatus.NEW
    steps = random.randint(1, 4)
    t = lead.created_at
    for _ in range(steps):
        new_st = random.choice(STATUSES)
        add_activity(lead, assigned, ActivityType.STATUS_CHANGED,
                     old_st=current.value, new_st=new_st.value,
                     at=t + timedelta(hours=random.randint(2, 72)))
        t += timedelta(hours=random.randint(2, 72))
        current = new_st

    # 3. 1-3 call logs
    for _ in range(random.randint(1, 3)):
        durations = [2, 5, 8, 12, 15, 20, 30]
        add_activity(lead, assigned, ActivityType.CALL_LOG,
                     comment=f"Call duration: {random.choice(durations)} min. {random.choice(COMMENTS_POOL)}",
                     at=lead.created_at + timedelta(days=random.randint(0, 10), hours=random.randint(9, 18)))

    # 4. 1-2 comments
    for _ in range(random.randint(1, 2)):
        add_activity(lead, assigned, ActivityType.COMMENT,
                     comment=random.choice(COMMENTS_POOL),
                     at=lead.created_at + timedelta(days=random.randint(1, 15)))

    # 5. Follow-up set (today's) — guarantees followups_done_today counts
    if random.random() > 0.4:
        add_activity(lead, assigned, ActivityType.STATUS_CHANGED,
                     old_st=LeadStatus.NEW.value,
                     new_st=random.choice([LeadStatus.CALL_BACK, LeadStatus.INTERESTED_CALL_BACK]).value,
                     at=today_start + timedelta(hours=random.randint(0, 10), minutes=random.randint(0, 59)))

    # 6. Follow-up scheduled activity
    if lead.next_followup_at:
        add_activity(lead, assigned, ActivityType.FOLLOWUP_SET,
                     comment=f"Follow-up scheduled for {lead.next_followup_at.strftime('%d %b %Y %H:%M')}",
                     followup=lead.next_followup_at,
                     at=lead.created_at + timedelta(hours=random.randint(1, 12)))

db.commit()

print("Demo data created successfully!")
print("  Organisation : Demo Corp")
print("  Admin login  : admin@demo.com  /  Demo@1234")
print("  Sales users  : priya@demo.com, rohit@demo.com, sneha@demo.com, karan@demo.com")
print("  Password     : Demo@1234  (same for all)")
print("  Leads        : 120")
print("  Activities   : ~600+")

db.close()
