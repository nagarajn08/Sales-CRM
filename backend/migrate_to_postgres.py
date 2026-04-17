"""
Migrates all data from the SQLite database to PostgreSQL.

Run ONCE after PostgreSQL is set up and the DATABASE_URL in .env
has been changed to the PostgreSQL connection string.

Usage:
    # 1. Keep .env pointing to PostgreSQL (new DB, empty)
    # 2. Run this script — it reads from salescrm.db and writes to Postgres
    python migrate_to_postgres.py

Safe to re-run: skips tables that already have rows.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

SQLITE_URL  = "sqlite:///./salescrm.db"
POSTGRES_URL = None  # auto-read from .env

# ── Load Postgres URL from .env ────────────────────────────────────────────────
from app.config import settings
POSTGRES_URL = settings.DATABASE_URL

if POSTGRES_URL.startswith("sqlite"):
    print("ERROR: DATABASE_URL in .env is still pointing to SQLite.")
    print("Change it to PostgreSQL first, then run this script.")
    sys.exit(1)

print(f"Source : {SQLITE_URL}")
print(f"Target : {POSTGRES_URL}")
print()

# ── Engines ───────────────────────────────────────────────────────────────────
sqlite_engine  = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
postgres_engine = create_engine(POSTGRES_URL, pool_pre_ping=True)

# ── Create all tables in Postgres first ───────────────────────────────────────
from app.database import Base
import app.models  # register all models
Base.metadata.create_all(bind=postgres_engine)
print("Schema created in PostgreSQL.")

# ── Table migration order (respect FK constraints) ────────────────────────────
TABLE_ORDER = [
    "organizations",
    "users",
    "subscriptions",
    "app_settings",
    "email_templates",
    "leads",
    "lead_activities",
    "notifications",
    "user_sessions",
    "otp_records",
    "custom_field_defs",
]

sqlite_insp  = inspect(sqlite_engine)
sqlite_tables = sqlite_insp.get_table_names()

pg_insp = inspect(postgres_engine)

def get_bool_cols(table):
    """Return set of column names that are boolean type in PostgreSQL."""
    cols = pg_insp.get_columns(table)
    return {c["name"] for c in cols if str(c["type"]).upper() in ("BOOLEAN", "BOOL")}

def cast_row(row, bool_cols):
    """Convert SQLite 0/1 integers to Python booleans for boolean columns."""
    d = dict(row)
    for col in bool_cols:
        if col in d and d[col] is not None:
            d[col] = bool(d[col])
    return d

pg_tables = inspect(postgres_engine).get_table_names()

with sqlite_engine.connect() as src, postgres_engine.connect() as dst:
    for table in TABLE_ORDER:
        if table not in sqlite_tables:
            print(f"  skip {table} (not in SQLite)")
            continue
        if table not in pg_tables:
            print(f"  skip {table} (not in PostgreSQL schema)")
            continue

        # Check if Postgres table already has data
        count_pg = dst.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        if count_pg > 0:
            print(f"  skip {table} (already has {count_pg} rows in Postgres)")
            continue

        rows = src.execute(text(f"SELECT * FROM {table}")).mappings().all()
        if not rows:
            print(f"  skip {table} (0 rows in SQLite)")
            continue

        bool_cols = get_bool_cols(table)
        # Only use columns that exist in PostgreSQL (drops obsolete SQLite-only cols)
        pg_cols = {c["name"] for c in pg_insp.get_columns(table)}
        cols = [c for c in rows[0].keys() if c in pg_cols]
        placeholders = ", ".join(f":{c}" for c in cols)
        col_list = ", ".join(cols)
        insert_sql = text(f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})")

        batch = [{k: v for k, v in cast_row(r, bool_cols).items() if k in pg_cols} for r in rows]
        dst.execute(insert_sql, batch)
        dst.commit()
        print(f"  migrated {table}: {len(batch)} rows")

    # ── Reset sequences so new inserts get correct IDs ────────────────────────
    print()
    print("Resetting PostgreSQL sequences...")
    pg_insp = inspect(postgres_engine)
    for table in TABLE_ORDER:
        if table not in sqlite_tables or table not in pg_tables:
            continue
        # Find integer primary key column
        pk_cols = [c for c in pg_insp.get_columns(table) if c.get("autoincrement")]
        if not pk_cols:
            # fallback: look for column named 'id'
            pk_cols = [c for c in pg_insp.get_columns(table) if c["name"] == "id"]
        if not pk_cols:
            continue
        pk = pk_cols[0]["name"]
        try:
            dst.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table}', '{pk}'), "
                f"COALESCE((SELECT MAX({pk}) FROM {table}), 0) + 1, false)"
            ))
            dst.commit()
            print(f"  reset sequence for {table}.{pk}")
        except Exception as e:
            dst.rollback()
            print(f"  sequence reset skipped for {table}: {e}")

print()
print("Migration complete!")
print("Your PostgreSQL database now has all the data from SQLite.")
print("You can now start the backend — it will use PostgreSQL.")
