#!/usr/bin/env python3
"""
Import Freshsales Owners & Brokers into the people table,
then populate the person_property junction table.
"""

import csv
import os
import re
import sys
from datetime import datetime
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv(os.path.join(os.path.dirname(__file__), "../CRM-Server/.env.local"))

BACKUP_DIR = os.path.join(os.path.dirname(__file__), "../freshsales_backup")
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

# ── Helpers ──────────────────────────────────────────────────────────────────

def clean(val):
    if val is None:
        return None
    v = str(val).strip().replace("\xa0", " ")
    return v if v else None

def parse_int(val):
    v = clean(val)
    if not v:
        return None
    try:
        return int(re.sub(r"[^\d]", "", v.split(".")[0]))
    except (ValueError, IndexError):
        return None

def parse_datetime(val):
    v = clean(val)
    if not v:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S UTC", "%Y-%m-%dT%H:%M:%S%z", "%m/%d/%Y %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(v.replace(" UTC", "").strip(), fmt.replace(" UTC", ""))
        except ValueError:
            pass
    return None

def split_name(full, last):
    """Extract first name by stripping last name from full name."""
    full = clean(full) or ""
    last = clean(last) or ""
    if last and full.endswith(last):
        first = full[: -len(last)].strip()
    elif " " in full:
        parts = full.split(None, 1)
        first = parts[0]
    else:
        first = full
    return first or None

# ── Load owners into people ───────────────────────────────────────────────────

def load_owners(conn):
    path = os.path.join(BACKUP_DIR, "Owners _ brokers/Owners _ brokers.csv")
    print(f"Loading owners from {path}...")

    # Load existing freshsales_ids so we can skip duplicates
    with conn.cursor() as cur:
        cur.execute("SELECT freshsales_id FROM people WHERE freshsales_id IS NOT NULL")
        existing_fs_ids = {row[0] for row in cur.fetchall()}

    rows = []
    skipped = 0

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fs_id_str = clean(row.get("Id"))
            if not fs_id_str:
                skipped += 1
                continue
            try:
                fs_id = int(fs_id_str)
            except ValueError:
                skipped += 1
                continue

            if fs_id in existing_fs_ids:
                skipped += 1
                continue

            full_name = clean(row.get("Name"))
            last_name = clean(row.get("Last name"))
            first_name = split_name(full_name, last_name)

            # Phone: prefer Work, fallback Preferred Phone Number
            phone_raw = clean(row.get("Work")) or clean(row.get("Preferred Phone Number"))
            phone = re.sub(r"[^\d+]", "", phone_raw) if phone_raw else None
            if phone and len(phone) < 7:
                phone = None

            # Email: prefer Work email, fallback Emails field
            email = clean(row.get("Work email")) or clean(row.get("Emails"))
            if email and "," in email:
                email = email.split(",")[0].strip()

            rows.append((
                fs_id,
                first_name,
                last_name,
                full_name,
                clean(row.get("City")),
                clean(row.get("State")),
                clean(row.get("Zipcode")),
                email,
                phone,
                clean(row.get("Job title")),
                clean(row.get("Company Name")),
                clean(row.get("Contact Type")),
                clean(row.get("Asset Class")),
                clean(row.get("Market Focus")),
                clean(row.get("Relationship Status")),
                parse_int(row.get("Score")),
                clean(row.get("Lifecycle stage")),
                clean(row.get("Status")),
                clean(row.get("Skiptrace URL")),
                clean(row.get("LinkedIn")),
                "freshsales",
                parse_datetime(row.get("Created at")),
            ))

    print(f"  Parsed {len(rows)} owners ({skipped} skipped / already imported)")

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO people (
                freshsales_id, first_name, last_name, full_name,
                city, state_code, zip_code, email, phone,
                job_title, company_name, contact_type,
                asset_class, market_focus, relationship_status,
                lead_score, lifecycle_stage, contact_status,
                skiptrace_url, linkedin_url, source, created_at
            ) VALUES %s
            ON CONFLICT (freshsales_id) DO NOTHING
            """,
            rows,
            page_size=500,
        )
        conn.commit()

    print(f"  Inserted {len(rows)} people")
    return len(rows)


# ── Build person_property links ───────────────────────────────────────────────

def load_person_property(conn):
    path = os.path.join(BACKUP_DIR, "Facilities/Facility_owners _ brokers.csv")
    print(f"Loading person↔property links from {path}...")

    # Build maps: freshsales_contact_id → person_id, freshsales_account_id → property_id
    with conn.cursor() as cur:
        cur.execute("SELECT freshsales_id, person_id FROM people WHERE freshsales_id IS NOT NULL")
        person_by_fs = {row[0]: row[1] for row in cur.fetchall()}

        cur.execute("SELECT id FROM properties")
        valid_property_ids = {row[0] for row in cur.fetchall()}

    rows = []
    skipped = 0

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                fs_contact_id = int(clean(row.get("Contact id")) or "")
                fs_account_id = int(clean(row.get("Sales Account id")) or "")
            except (ValueError, TypeError):
                skipped += 1
                continue

            person_id = person_by_fs.get(fs_contact_id)
            if not person_id:
                skipped += 1
                continue

            if fs_account_id not in valid_property_ids:
                skipped += 1
                continue

            is_primary = clean(row.get("Is Primary", "")).lower() == "true"

            rows.append((person_id, fs_account_id, is_primary))

    print(f"  Parsed {len(rows)} links ({skipped} skipped)")

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO person_property (person_id, property_id, is_primary)
            VALUES %s
            ON CONFLICT (person_id, property_id) DO NOTHING
            """,
            rows,
            page_size=1000,
        )
        conn.commit()

    print(f"  Inserted {len(rows)} person↔property links")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Connecting to database...")
    conn = psycopg2.connect(DB_URL)
    print("Connected.\n")

    load_owners(conn)
    print()
    load_person_property(conn)

    # Summary
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM people")
        total_people = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM people WHERE source = 'freshsales'")
        fs_people = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM person_property")
        links = cur.fetchone()[0]
        cur.execute("""
            SELECT contact_type, COUNT(*) as cnt
            FROM people WHERE source = 'freshsales' AND contact_type IS NOT NULL
            GROUP BY contact_type ORDER BY cnt DESC
        """)
        types = cur.fetchall()
        cur.execute("""
            SELECT asset_class, COUNT(*) as cnt
            FROM people WHERE source = 'freshsales' AND asset_class IS NOT NULL
            GROUP BY asset_class ORDER BY cnt DESC LIMIT 8
        """)
        classes = cur.fetchall()

    print(f"\n{'─'*50}")
    print(f"Done!")
    print(f"  Total people in DB:     {total_people:,}")
    print(f"  Freshsales owners:      {fs_people:,}")
    print(f"  Person↔property links:  {links:,}")
    if types:
        print(f"\nContact types:")
        for t, c in types:
            print(f"  {t}: {c:,}")
    if classes:
        print(f"\nAsset class focus:")
        for a, c in classes:
            print(f"  {a}: {c:,}")

    conn.close()


if __name__ == "__main__":
    main()
