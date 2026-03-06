"""
import_csv.py — Load HHA CSV data into PostgreSQL.

Filters to a target state (default: SC) and populates:
  - agencies table (one row per enrollment ID)
  - owners table (one row per unique owner)
  - agency_owners junction table

Usage:
    python scripts/import_csv.py
    python scripts/import_csv.py --state TX
    python scripts/import_csv.py --csv /path/to/file.csv
"""

import csv
import sys
import os
import argparse
from datetime import datetime

# Allow running from project root
sys.path.insert(0, os.path.dirname(__file__))
from db import get_connection, create_schema


CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "HHA_All_Owners_2026.01.02.csv")


def parse_bool(val: str) -> bool:
    return val.strip() == "Y"


def parse_date(val: str):
    if not val.strip():
        return None
    for fmt in ("%m/%d/%y", "%m/%d/%Y"):
        try:
            return datetime.strptime(val.strip(), fmt).date()
        except ValueError:
            pass
    return None


def parse_pct(val: str):
    try:
        return float(val.strip())
    except (ValueError, AttributeError):
        return None


def load_csv(csv_path: str, target_state: str):
    agencies = {}     # enrollment_id -> dict
    owners = {}       # owner_id -> dict
    junctions = []    # list of agency-owner link dicts

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row["STATE - OWNER"].strip()
            if state != target_state:
                continue

            enrollment_id = row["ENROLLMENT ID"].strip()
            org_name = row["ORGANIZATION NAME"].strip()
            owner_id = row["ASSOCIATE ID - OWNER"].strip()

            # Upsert agency
            if enrollment_id not in agencies:
                agencies[enrollment_id] = {
                    "enrollment_id": enrollment_id,
                    "organization_name": org_name,
                    "state": target_state,
                }

            # Upsert owner
            if owner_id not in owners:
                owners[owner_id] = {
                    "owner_id": owner_id,
                    "first_name": row["FIRST NAME - OWNER"].strip(),
                    "last_name": row["LAST NAME - OWNER"].strip(),
                    "org_name": row["ORGANIZATION NAME - OWNER"].strip(),
                    "owner_type": row["TYPE - OWNER"].strip(),
                    "address_line1": row["ADDRESS LINE 1 - OWNER"].strip(),
                    "address_line2": row["ADDRESS LINE 2 - OWNER"].strip(),
                    "city": row["CITY - OWNER"].strip(),
                    "state": row["STATE - OWNER"].strip(),
                    "zip_code": row["ZIP CODE - OWNER"].strip(),
                }

            # Junction
            junctions.append({
                "enrollment_id": enrollment_id,
                "owner_id": owner_id,
                "ownership_pct": parse_pct(row["PERCENTAGE OWNERSHIP"]),
                "role_code": row["ROLE CODE - OWNER"].strip(),
                "role_text": row["ROLE TEXT - OWNER"].strip(),
                "association_date": parse_date(row["ASSOCIATION DATE - OWNER"]),
                "title": row["TITLE - OWNER"].strip(),
                "is_corporation": parse_bool(row["CORPORATION - OWNER"]),
                "is_llc": parse_bool(row["LLC - OWNER"]),
                "is_for_profit": parse_bool(row["FOR PROFIT - OWNER"]),
                "is_non_profit": parse_bool(row["NON PROFIT - OWNER"]),
                "is_private_equity": parse_bool(row["PRIVATE EQUITY COMPANY - OWNER"]),
                "is_holding_company": parse_bool(row["HOLDING COMPANY - OWNER"]),
            })

    return agencies, owners, junctions


def insert_agencies(cur, agencies: dict):
    for a in agencies.values():
        cur.execute("""
            INSERT INTO agencies (enrollment_id, organization_name, state)
            VALUES (%(enrollment_id)s, %(organization_name)s, %(state)s)
            ON CONFLICT (enrollment_id) DO UPDATE SET
                organization_name = EXCLUDED.organization_name,
                state = EXCLUDED.state,
                updated_at = NOW()
        """, a)
    print(f"  Agencies inserted/updated: {len(agencies)}")


def insert_owners(cur, owners: dict):
    for o in owners.values():
        cur.execute("""
            INSERT INTO owners (
                owner_id, first_name, last_name, org_name, owner_type,
                address_line1, address_line2, city, state, zip_code
            ) VALUES (
                %(owner_id)s, %(first_name)s, %(last_name)s, %(org_name)s, %(owner_type)s,
                %(address_line1)s, %(address_line2)s, %(city)s, %(state)s, %(zip_code)s
            )
            ON CONFLICT (owner_id) DO NOTHING
        """, o)
    print(f"  Owners inserted: {len(owners)}")


def insert_junctions(cur, junctions: list):
    inserted = 0
    for j in junctions:
        cur.execute("""
            INSERT INTO agency_owners (
                enrollment_id, owner_id, ownership_pct, role_code, role_text,
                association_date, title,
                is_corporation, is_llc, is_for_profit, is_non_profit,
                is_private_equity, is_holding_company
            ) VALUES (
                %(enrollment_id)s, %(owner_id)s, %(ownership_pct)s, %(role_code)s, %(role_text)s,
                %(association_date)s, %(title)s,
                %(is_corporation)s, %(is_llc)s, %(is_for_profit)s, %(is_non_profit)s,
                %(is_private_equity)s, %(is_holding_company)s
            )
            ON CONFLICT (enrollment_id, owner_id, role_code) DO NOTHING
        """, j)
        inserted += 1
    print(f"  Agency-owner links inserted: {inserted}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default="SC", help="State abbreviation to import (default: SC)")
    parser.add_argument("--csv", default=CSV_PATH, help="Path to CSV file")
    args = parser.parse_args()

    print(f"Creating schema...")
    create_schema()

    print(f"Loading CSV for state={args.state}...")
    agencies, owners, junctions = load_csv(args.csv, args.state)
    print(f"  Found {len(agencies)} unique agencies, {len(owners)} unique owners, {len(junctions)} links")

    print("Inserting into database...")
    conn = get_connection()
    cur = conn.cursor()
    insert_agencies(cur, agencies)
    insert_owners(cur, owners)
    insert_junctions(cur, junctions)
    conn.commit()
    cur.close()
    conn.close()

    print("Done.")


if __name__ == "__main__":
    main()
