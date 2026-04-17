"""
Stress test — measures real query performance at scale.

Progressively inserts leads (1K → 5K → 10K → 50K → 100K) and
benchmarks every critical query at each milestone.

Run from backend/:
    python stress_test.py

Cleans up all test data when done.
"""

import sys, os, time, random, threading, statistics
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, date, timedelta
from sqlalchemy import func, case, cast, Date, text
from app.database import SessionLocal, engine
from app.models.lead import Lead, LeadStatus, LeadSource, LeadPriority
from app.models.lead_activity import LeadActivity, ActivityType
from app.models.user import User, UserRole
from app.models.organization import Organization, OrgType
from app.services.auth_service import hash_password

# ── Config ────────────────────────────────────────────────────────────────────
MILESTONES   = [1_000, 5_000, 10_000, 50_000, 100_000]
TEST_ORG_NAME = "__stress_test__"
BATCH_SIZE   = 500   # rows per bulk insert batch

# ── Helpers ───────────────────────────────────────────────────────────────────
def timer(fn):
    t = time.perf_counter()
    result = fn()
    return (time.perf_counter() - t) * 1000, result

def fmt(ms):
    if ms < 1:    return f"{ms*1000:.0f}µs"
    if ms < 1000: return f"{ms:.1f}ms"
    return f"{ms/1000:.2f}s"

def sep(title=""):
    print(f"\n{'-'*60}")
    if title: print(f"  {title}")

# ── Setup test org + user ─────────────────────────────────────────────────────
db = SessionLocal()

# Clean up any previous test run
old = db.query(Organization).filter(Organization.name == TEST_ORG_NAME).first()
if old:
    print("Cleaning up previous test data...")
    db.query(LeadActivity).filter(
        LeadActivity.lead_id.in_(
            db.query(Lead.id).filter(Lead.organization_id == old.id)
        )
    ).delete(synchronize_session=False)
    db.query(Lead).filter(Lead.organization_id == old.id).delete()
    db.query(User).filter(User.organization_id == old.id).delete()
    db.delete(old)
    db.commit()
    print("Done.\n")

org = Organization(name=TEST_ORG_NAME, type=OrgType.CORPORATE)
db.add(org)
db.flush()

# 1 admin + 10 sales users
admin = User(organization_id=org.id, name="Test Admin", email="__stress_admin@test.com",
             hashed_password=hash_password("x"), role=UserRole.ADMIN, is_active=True)
db.add(admin)
db.flush()

sales = []
for i in range(10):
    u = User(organization_id=org.id, name=f"Sales {i+1}",
             email=f"__stress_user{i+1}@test.com",
             hashed_password=hash_password("x"),
             role=UserRole.USER, is_active=True)
    db.add(u)
    sales.append(u)
db.flush()
db.commit()

print(f"Test org created: id={org.id}, 11 users")
org_id   = org.id
admin_id = admin.id
user_ids = [u.id for u in sales]

# ── Data generators ───────────────────────────────────────────────────────────
STATUSES   = list(LeadStatus)
SOURCES    = list(LeadSource)
PRIORITIES = list(LeadPriority)
TODAY = datetime.combine(date.today(), datetime.min.time())

def make_leads(n, offset=0):
    today = date.today()
    rows = []
    for i in range(n):
        idx = offset + i
        created = TODAY - timedelta(days=random.randint(0, 180),
                                    hours=random.randint(0, 23))
        status = random.choice(STATUSES)
        followup = None
        if status not in (LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED):
            r = random.random()
            if r < 0.2:
                followup = TODAY - timedelta(days=random.randint(1, 10))
            elif r < 0.5:
                followup = TODAY + timedelta(days=random.randint(0, 14))

        rows.append(dict(
            organization_id=org_id,
            name=f"Lead {idx}",
            email=f"lead{idx}@test.com",
            mobile=f"9{idx:09d}"[:10],
            status=status,
            priority=random.choice(PRIORITIES),
            source=random.choice(SOURCES),
            assigned_to_id=random.choice(user_ids),
            created_by_id=admin_id,
            deal_value=random.choice([None, 5000, 10000, 25000, 50000, 100000]),
            score=random.randint(5, 95),
            next_followup_at=followup,
            is_active=status not in (LeadStatus.NOT_INTERESTED,),
            created_at=created,
            updated_at=created + timedelta(days=random.randint(0, 5)),
        ))
    return rows

def make_activities(lead_ids):
    rows = []
    for lid in lead_ids:
        n = random.randint(2, 6)
        for _ in range(n):
            rows.append(dict(
                lead_id=lid,
                user_id=random.choice(user_ids),
                activity_type=random.choice(list(ActivityType)),
                created_at=TODAY - timedelta(days=random.randint(0, 30),
                                             hours=random.randint(0, 23)),
            ))
    return rows

# ── Benchmark queries ─────────────────────────────────────────────────────────
def run_benchmarks(label):
    db2 = SessionLocal()
    base = db2.query(Lead).filter(Lead.organization_id == org_id)
    today_start = TODAY
    today_end   = today_start + timedelta(days=1)
    week_start  = today_start - timedelta(days=today_start.weekday())
    results = {}

    # 1. Dashboard aggregate (the big one)
    ms, _ = timer(lambda: base.with_entities(
        func.count(Lead.id),
        func.count(case((Lead.is_active == True, Lead.id))),
        func.count(case(((Lead.status == LeadStatus.CONVERTED) & (Lead.updated_at >= today_start), Lead.id))),
        func.count(case((Lead.created_at >= today_start, Lead.id))),
        func.count(case(((Lead.next_followup_at < today_start) & (Lead.next_followup_at != None) & (Lead.is_active == True), Lead.id))),
        func.count(case(((Lead.next_followup_at >= today_start) & (Lead.next_followup_at < today_end) & (Lead.is_active == True), Lead.id))),
    ).one())
    results["dashboard_agg"] = ms

    # 2. Status breakdown GROUP BY
    ms, _ = timer(lambda: base.filter(Lead.is_active == True)
                  .with_entities(Lead.status, func.count(Lead.id))
                  .group_by(Lead.status).all())
    results["status_group_by"] = ms

    # 3. Source breakdown GROUP BY
    ms, _ = timer(lambda: base.with_entities(Lead.source, func.count(Lead.id))
                  .group_by(Lead.source).all())
    results["source_group_by"] = ms

    # 4. Team stats GROUP BY
    ms, _ = timer(lambda: base.filter(Lead.assigned_to_id.in_(user_ids))
                  .with_entities(Lead.assigned_to_id, Lead.status, func.count(Lead.id))
                  .group_by(Lead.assigned_to_id, Lead.status).all())
    results["team_stats"] = ms

    # 5. Paginated list (most common query)
    ms, _ = timer(lambda: base.filter(Lead.is_active == True)
                  .order_by(Lead.next_followup_at.asc().nulls_last(), Lead.created_at.desc())
                  .offset(0).limit(50).all())
    results["paginated_list"] = ms

    # 6. Text search (worst case — ILIKE with leading %)
    ms, _ = timer(lambda: base.filter(Lead.name.ilike("%lead 5%")).limit(50).all())
    results["text_search"] = ms

    # 7. Activities today subquery
    lead_ids_subq = base.with_entities(Lead.id).subquery()
    ms, _ = timer(lambda: db2.query(
        func.count(LeadActivity.id),
        func.count(case((LeadActivity.activity_type == ActivityType.STATUS_CHANGED, LeadActivity.id))),
    ).filter(
        LeadActivity.lead_id.in_(lead_ids_subq),
        LeadActivity.created_at >= today_start,
    ).one())
    results["activities_today"] = ms

    # 8. Trends (2 GROUP BY queries)
    start_dt = today_start - timedelta(days=29)
    ms, _ = timer(lambda: (
        base.filter(Lead.created_at >= start_dt)
        .with_entities(cast(Lead.created_at, Date), func.count(Lead.id))
        .group_by(cast(Lead.created_at, Date)).all(),
        base.filter(Lead.status == LeadStatus.CONVERTED, Lead.updated_at >= start_dt)
        .with_entities(cast(Lead.updated_at, Date), func.count(Lead.id))
        .group_by(cast(Lead.updated_at, Date)).all(),
    ))
    results["trends_30d"] = ms

    # 9. Overdue followups (uses partial index)
    ms, _ = timer(lambda: base.filter(
        Lead.next_followup_at < today_start,
        Lead.next_followup_at.isnot(None),
        Lead.is_active == True,
    ).count())
    results["overdue_count"] = ms

    # 10. Pipeline value SUM
    ms, _ = timer(lambda: base.filter(Lead.is_active == True, Lead.deal_value.isnot(None))
                  .with_entities(func.sum(Lead.deal_value)).scalar())
    results["pipeline_sum"] = ms

    db2.close()
    return results

# ── Concurrent user simulation ─────────────────────────────────────────────────
def concurrent_test(n_threads=20):
    times = []
    errors = [0]

    def worker():
        try:
            dbc = SessionLocal()
            t = time.perf_counter()
            dbc.query(Lead).filter(
                Lead.organization_id == org_id, Lead.is_active == True
            ).with_entities(func.count(Lead.id)).scalar()
            times.append((time.perf_counter() - t) * 1000)
            dbc.close()
        except Exception:
            errors[0] += 1

    threads = [threading.Thread(target=worker) for _ in range(n_threads)]
    for t in threads: t.start()
    for t in threads: t.join()

    if times:
        return {
            "threads": n_threads,
            "success": len(times),
            "errors": errors[0],
            "avg_ms": statistics.mean(times),
            "p95_ms": sorted(times)[int(len(times)*0.95)],
            "max_ms": max(times),
        }
    return None

# ── Main loop ──────────────────────────────────────────────────────────────────
total_inserted = 0
all_results = {}

for milestone in MILESTONES:
    to_insert = milestone - total_inserted
    sep(f"Inserting {to_insert:,} leads -> total {milestone:,}")

    # Bulk insert leads in batches
    t_insert = time.perf_counter()
    new_lead_ids = []
    inserted_this_round = 0

    for batch_start in range(0, to_insert, BATCH_SIZE):
        batch_n = min(BATCH_SIZE, to_insert - batch_start)
        rows = make_leads(batch_n, offset=total_inserted + batch_start)
        result = engine.execute(text(
            "INSERT INTO leads (organization_id,name,email,mobile,status,priority,source,"
            "assigned_to_id,created_by_id,deal_value,score,next_followup_at,is_active,"
            "created_at,updated_at) VALUES "
            "(:organization_id,:name,:email,:mobile,:status,:priority,:source,"
            ":assigned_to_id,:created_by_id,:deal_value,:score,:next_followup_at,:is_active,"
            ":created_at,:updated_at) RETURNING id"
        ), rows) if False else None

        # Use SQLAlchemy core bulk insert
        with engine.begin() as conn:
            conn.execute(Lead.__table__.insert(), rows)
        inserted_this_round += batch_n

    # Get the IDs of leads we just inserted (last N)
    with SessionLocal() as s:
        new_lead_ids = [r[0] for r in s.execute(
            text(f"SELECT id FROM leads WHERE organization_id = {org_id} ORDER BY id DESC LIMIT {to_insert}")
        ).fetchall()]

    # Bulk insert activities
    act_rows = make_activities(new_lead_ids[:min(len(new_lead_ids), 5000)])
    for batch_start in range(0, len(act_rows), BATCH_SIZE * 5):
        batch = act_rows[batch_start:batch_start + BATCH_SIZE * 5]
        with engine.begin() as conn:
            conn.execute(LeadActivity.__table__.insert(), batch)

    total_inserted = milestone
    insert_time = (time.perf_counter() - t_insert) * 1000

    # Count actual rows
    with SessionLocal() as s:
        actual_leads = s.query(Lead).filter(Lead.organization_id == org_id).count()
        actual_acts  = s.execute(text(
            f"SELECT COUNT(*) FROM lead_activities la "
            f"JOIN leads l ON la.lead_id = l.id "
            f"WHERE l.organization_id = {org_id}"
        )).scalar()

    print(f"  Inserted in {fmt(insert_time)} | Leads: {actual_leads:,} | Activities: {actual_acts:,}")

    # Run benchmarks
    print(f"  Benchmarking...")
    res = run_benchmarks(str(milestone))
    all_results[milestone] = res

    print(f"  {'Query':<28} {'Time':>10}")
    print(f"  {'-'*40}")
    for k, v in res.items():
        flag = " !!" if v > 500 else (" ok" if v < 100 else "")
        print(f"  {k:<28} {fmt(v):>10}{flag}")

# ── Concurrent test at 100K ────────────────────────────────────────────────────
sep("Concurrent user simulation (at 100K leads)")
for n in [5, 10, 20, 50]:
    r = concurrent_test(n)
    if r:
        print(f"  {r['threads']:>3} threads | avg {fmt(r['avg_ms'])} | p95 {fmt(r['p95_ms'])} | max {fmt(r['max_ms'])} | errors {r['errors']}")

# ── Summary table ──────────────────────────────────────────────────────────────
sep("SUMMARY — Query times at scale (ms)")
queries = list(next(iter(all_results.values())).keys())
header = f"{'Query':<28}" + "".join(f"{m/1000:.0f}K".rjust(9) for m in MILESTONES)
print(f"  {header}")
print(f"  {'-'*72}")
for q in queries:
    row = f"  {q:<28}"
    for m in MILESTONES:
        v = all_results[m][q]
        row += f"{fmt(v):>9}"
    print(row)

# ── Cleanup ────────────────────────────────────────────────────────────────────
sep("Cleaning up test data...")
with engine.begin() as conn:
    conn.execute(text(
        f"DELETE FROM lead_activities WHERE lead_id IN "
        f"(SELECT id FROM leads WHERE organization_id = {org_id})"
    ))
    conn.execute(text(f"DELETE FROM leads WHERE organization_id = {org_id}"))
    conn.execute(text(f"DELETE FROM users WHERE organization_id = {org_id}"))
    conn.execute(text(f"DELETE FROM organizations WHERE id = {org_id}"))
print("Test data removed. Database is clean.")
