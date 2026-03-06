#!/usr/bin/env python3
"""
Import Freshsales backup data into the CRM database.
Loads: properties (Facilities.csv) + property_notes (Notes + Note_targetables)
"""

import csv
import os
import sys
import re
from datetime import datetime
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

# Load .env from CRM-Server directory
load_dotenv(os.path.join(os.path.dirname(__file__), "../CRM-Server/.env.local"))

BACKUP_DIR = os.path.join(os.path.dirname(__file__), "../freshsales_backup")

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

# ── Helpers ──────────────────────────────────────────────────────────────────

def clean(val):
    """Strip whitespace and return None for empty strings."""
    if val is None:
        return None
    v = str(val).strip()
    return v if v else None

def clean_phone(val):
    """Strip Freshsales phone quoting like '+14078463330'."""
    v = clean(val)
    if not v:
        return None
    return v.strip("'")

def parse_int(val):
    v = clean(val)
    if not v:
        return None
    try:
        # Remove commas and dollar signs
        return int(re.sub(r"[,$]", "", v).split(".")[0])
    except ValueError:
        return None

def parse_numeric(val):
    v = clean(val)
    if not v:
        return None
    try:
        return float(re.sub(r"[,$]", "", v))
    except ValueError:
        return None

def parse_date(val):
    v = clean(val)
    if not v:
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%y", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(v.split("T")[0].split(" ")[0], fmt).date()
        except ValueError:
            pass
    return None

def parse_datetime(val):
    v = clean(val)
    if not v:
        return None
    v = v.replace(" UTC", "").replace("Z", "+00:00").strip()
    for fmt in ("%m/%d/%Y %H:%M", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y"):
        try:
            return datetime.strptime(v, fmt)
        except ValueError:
            pass
    return None

# ── Load properties ───────────────────────────────────────────────────────────

def load_properties(conn):
    path = os.path.join(BACKUP_DIR, "Facilities/Facilities.csv")
    print(f"Loading properties from {path}...")

    rows = []
    skipped = 0

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            freshsales_id = clean(row.get("Id"))
            if not freshsales_id:
                skipped += 1
                continue
            try:
                fid = int(freshsales_id)
            except ValueError:
                skipped += 1
                continue

            rows.append((
                fid,
                clean(row.get("Name")),
                parse_int(row.get("Number of employees")),
                parse_numeric(row.get("Annual revenue")),
                clean(row.get("Website")),
                clean_phone(row.get("Business Phone") or row.get("Display phone")),
                clean(row.get("Address")),
                clean(row.get("City")),
                clean(row.get("State")),
                clean(row.get("Zipcode")),
                clean(row.get("Country")),
                clean(row.get("Industry type")),
                clean(row.get("Business type")),
                clean(row.get("Territory")),
                parse_int(row.get("Parent Facility id")),
                clean(row.get("Parent Facility")),
                clean(row.get("Sales owner")),
                parse_datetime(row.get("Created at")),
                parse_datetime(row.get("Updated at")),
                parse_datetime(row.get("Last contacted time")),
                parse_date(row.get("Last activity date")),
                clean(row.get("Relationship Status")),
                clean(row.get("Deal Stage")),
                clean(row.get("Asset Class")),
                clean(row.get("Deal Type")),
                clean(row.get("Property Size Estimate")),
                clean(row.get("County")),
                clean(row.get("Acccount ID") or row.get("Account ID")),
                clean(row.get("LLC URL")),
                clean(row.get("Google Url")),
                clean(row.get("Skiptrace URL")),
                clean(row.get("GIS Url")),
                clean(row.get("Letter Status")),
                parse_date(row.get("Last Contact Date")),
                parse_date(row.get("Next Contact Date")),
                clean(row.get("Communication Status")),
                clean(row.get("Motivation Level")),
                clean(row.get("County Activity")),
                clean(row.get("Reonomy Id")),
                clean(row.get("Ownership Type")),
                clean(row.get("Sale Timeline")),
                clean(row.get("Direct Mail Address")),
                clean(row.get("Owner Name")),
                clean(row.get("Mail Bounced Back")),
                clean(row.get("Data Status")),
                clean(row.get("Offer Made")),
                clean_phone(row.get("Owner Phone")),
                parse_int(row.get("Last Sale Year")),
                parse_date(row.get("Last Sale Date")),
                parse_numeric(row.get("Last Sale Amount")),
                parse_numeric(row.get("Last Sale Price Per Sqft")),
                clean(row.get("Last Sale Buyer")),
                parse_numeric(row.get("Tax Assessed Value")),
                clean(row.get("Mortgagee Name")),
                parse_numeric(row.get("Mortgage Amount")),
                parse_date(row.get("Mortgage Start Date")),
                parse_date(row.get("Mortgage Expiration Date")),
                clean(row.get("Listing URL")),
                parse_numeric(row.get("Asking Price")),
                parse_numeric(row.get("Asking Price / Sqft")),
                clean(row.get("Broker Names")),
                clean_phone(row.get("Broker Phone Number")),
                clean(row.get("Broker Company")),
                clean(row.get("Lease Rate")),
                clean(row.get("Lease Notes Text Area") or row.get("Lease Notes Text Field (Deprecated)")),
                clean(row.get("Lease Terms")),
                parse_date(row.get("Lease Start Date")),
                clean(row.get("Space Size")),
                clean(row.get("Length of Lease")),
                parse_date(row.get("Lease Expiration")),
                clean(row.get("Lease Data Type")),
                clean(row.get("Leasing Broker")),
                clean(row.get("Links to Original Data")),
                clean(row.get("Amenities")),
                clean(row.get("Tags")),
            ))

    print(f"  Parsed {len(rows)} properties ({skipped} skipped)")

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO properties (
                id, name, num_employees, annual_revenue,
                website, phone, address, city, state, zipcode, country,
                industry_type, business_type, territory,
                parent_id, parent_name, sales_owner,
                created_at, updated_at, last_contacted, last_activity_date,
                relationship_status, deal_stage, asset_class, deal_type,
                property_size_estimate, county, account_id, llc_url,
                google_url, skiptrace_url, gis_url, letter_status,
                last_contact_date, next_contact_date,
                communication_status, motivation_level, county_activity,
                reonomy_id, ownership_type, sale_timeline, direct_mail_address,
                owner_name, mail_bounced_back, data_status, offer_made, owner_phone,
                last_sale_year, last_sale_date, last_sale_amount,
                last_sale_price_per_sqft, last_sale_buyer,
                tax_assessed_value, mortgagee_name, mortgage_amount,
                mortgage_start_date, mortgage_expiration_date,
                listing_url, asking_price, asking_price_per_sqft,
                broker_names, broker_phone, broker_company,
                lease_rate, lease_notes, lease_terms, lease_start_date,
                space_size, length_of_lease, lease_expiration, lease_data_type,
                leasing_broker, links_to_original_data, amenities, tags
            ) VALUES %s
            ON CONFLICT (id) DO NOTHING
            """,
            rows,
            page_size=1000,
        )
        conn.commit()
    print(f"  Inserted {len(rows)} properties")


# ── Load notes ────────────────────────────────────────────────────────────────

def load_notes(conn):
    notes_path = os.path.join(BACKUP_DIR, "Notes/Notes.csv")
    targets_path = os.path.join(BACKUP_DIR, "Notes/Note_targetables.csv")

    print(f"Loading note→property links from {targets_path}...")
    # Build map: note_id → property_id (only SalesAccount links)
    note_to_property = {}
    with open(targets_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            note_id = clean(row.get("Note Id"))
            target_id = clean(row.get("Related to Id"))
            target_type = clean(row.get("Related to Type"))
            if note_id and target_id and target_type == "SalesAccount":
                note_to_property[note_id] = target_id

    print(f"  Found {len(note_to_property)} note→property links")

    # Load note rows that are linked to a property
    print(f"Loading notes from {notes_path}...")
    rows = []
    skipped = 0

    with open(notes_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            note_id = clean(row.get("Id"))
            if not note_id or note_id not in note_to_property:
                skipped += 1
                continue
            property_id_str = note_to_property[note_id]
            try:
                nid = int(note_id)
                pid = int(property_id_str)
            except ValueError:
                skipped += 1
                continue

            rows.append((
                nid,
                pid,
                clean(row.get("Description")),
                parse_datetime(row.get("Created at")),
                parse_datetime(row.get("Updated at")),
            ))

    print(f"  Parsed {len(rows)} notes ({skipped} skipped / not linked to a property)")

    # Insert in batches (property_id FK may not exist for all — use ON CONFLICT + ignore FK errors)
    with conn.cursor() as cur:
        # Get the set of property IDs that exist in DB
        cur.execute("SELECT id FROM properties")
        valid_ids = {row[0] for row in cur.fetchall()}

    valid_rows = [r for r in rows if r[1] in valid_ids]
    missing = len(rows) - len(valid_rows)
    if missing:
        print(f"  Skipping {missing} notes with no matching property in DB")

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO property_notes (id, property_id, description, created_at, updated_at)
            VALUES %s
            ON CONFLICT (id) DO NOTHING
            """,
            valid_rows,
            page_size=1000,
        )
        conn.commit()
    print(f"  Inserted {len(valid_rows)} notes")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"Connecting to database...")
    conn = psycopg2.connect(DB_URL)
    print("Connected.")

    load_properties(conn)
    load_notes(conn)

    # Summary
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM properties")
        props = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM property_notes")
        notes = cur.fetchone()[0]
        cur.execute("SELECT asset_class, COUNT(*) FROM properties WHERE asset_class IS NOT NULL GROUP BY asset_class ORDER BY COUNT(*) DESC LIMIT 10")
        classes = cur.fetchall()

    print(f"\n{'─'*50}")
    print(f"Done!")
    print(f"  Properties: {props:,}")
    print(f"  Notes:      {notes:,}")
    print(f"\nTop asset classes:")
    for ac, cnt in classes:
        print(f"  {ac}: {cnt:,}")

    conn.close()


if __name__ == "__main__":
    main()
