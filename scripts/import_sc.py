"""
import_sc.py — Load SC home health agencies into the new schema.

Steps:
  1. Create schema (businesses / people / business_people tables)
  2. Load SC state HHA file → businesses
  3. Load CMS file (SC only) → fuzzy-match → update businesses with CMS fields
  4. Load HHA owners file → fuzzy-match org names → insert people + business_people
"""

import csv
import os
import re
import sys
import logging
from datetime import datetime, date
from difflib import SequenceMatcher
from typing import Optional, List, Dict, Any, Tuple

from dotenv import load_dotenv

load_dotenv()

# Ensure project root is on sys.path so we can import db
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from scripts.db import get_connection, create_new_schema

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SC_STATE_FILE = os.path.join(
    BASE, "hhc_data", "South Carolina Data", "SC Home Health Agencies 2026-01-01.csv"
)
SC_IHCP_FILE = os.path.join(
    BASE, "hhc_data", "South Carolina Data", "SC In Home Care List 2026-01-01.csv"
)
CMS_FILE = os.path.join(BASE, "cur_data", "HHA_Agencies_CMS.csv")
OWNERS_FILE = os.path.join(BASE, "hhc_data", "HHA_All_Owners_2026.01.02.csv")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------
_STRIP_SUFFIXES = re.compile(
    r"\b(LLC|L\.L\.C|INC|INCORPORATED|CORP|CORPORATION|CO|LTD|LP|LLP|PC|PLLC|"
    r"HOME\s+HEALTH|HOME\s+CARE|HEALTH\s+CARE|HEALTHCARE|SERVICES|AGENCY|"
    r"GROUP|SOLUTIONS|ASSOCIATES|NETWORK|PARTNERS|MANAGEMENT|SYSTEMS)\b",
    re.IGNORECASE,
)
_PUNCT = re.compile(r"[^A-Z0-9\s]")
_WS = re.compile(r"\s+")


def normalise(name: Optional[str]) -> str:
    if not name:
        return ""
    n = name.upper()
    n = _PUNCT.sub(" ", n)
    n = _STRIP_SUFFIXES.sub(" ", n)
    n = _WS.sub(" ", n).strip()
    return n


def similarity(a: str, b: str) -> float:
    na, nb = normalise(a), normalise(b)
    if not na or not nb:
        return 0.0
    return SequenceMatcher(None, na, nb).ratio()


MATCH_THRESHOLD = 0.80


def best_match(
    query: str, candidates: List[Tuple[int, str, str]]
) -> Optional[Tuple[int, float]]:
    """
    candidates: list of (business_id, le_name, lf_name)
    Returns (business_id, score) for the best match >= MATCH_THRESHOLD, else None.
    """
    best_id = None
    best_score = 0.0
    for biz_id, le, lf in candidates:
        s = max(similarity(query, le), similarity(query, lf))
        if s > best_score:
            best_score = s
            best_id = biz_id
    if best_score >= MATCH_THRESHOLD:
        return (best_id, best_score)
    return None


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------
def parse_license(raw: str) -> Tuple[Optional[str], Optional[date]]:
    """
    'HHA-0151 / 04/30/2026' → ('HHA-0151', date(2026, 4, 30))
    """
    if not raw:
        return None, None
    parts = [p.strip() for p in raw.split("/")]
    lic_num = parts[0] if parts else None
    exp_date = None
    if len(parts) >= 3:
        # date is parts[1]/parts[2] after splitting on /
        # raw e.g. "HHA-0151 / 04/30/2026" → split('/')  = ['HHA-0151 ', ' 04', '30', '2026']
        pass
    # Re-parse: split on ' / ' first
    m = re.match(r"^(\S+)\s*/\s*(\d{1,2}/\d{1,2}/\d{4})$", raw.strip())
    if m:
        lic_num = m.group(1)
        try:
            exp_date = datetime.strptime(m.group(2), "%m/%d/%Y").date()
        except ValueError:
            pass
    return lic_num, exp_date


def parse_business_type(county_bustype: str) -> str:
    """
    'Lexington / Limited Liability' → 'Limited Liability'
    """
    if not county_bustype:
        return ""
    parts = county_bustype.split("/", 1)
    return parts[1].strip() if len(parts) == 2 else county_bustype.strip()


def parse_county(county_bustype: str) -> str:
    if not county_bustype:
        return ""
    return county_bustype.split("/", 1)[0].strip()


def yn(val: str) -> Optional[bool]:
    if val.strip().upper() == "Y":
        return True
    if val.strip().upper() == "N":
        return False
    return None


def parse_date(val: str, fmt: str = "%m/%d/%Y") -> Optional[date]:
    if not val or not val.strip():
        return None
    try:
        return datetime.strptime(val.strip(), fmt).date()
    except ValueError:
        return None


def parse_numeric(val: str) -> Optional[float]:
    try:
        return float(val.strip())
    except (ValueError, AttributeError):
        return None


# ---------------------------------------------------------------------------
# Step 1: Load SC state file → businesses
# ---------------------------------------------------------------------------
def load_sc_state(conn) -> int:
    log.info("Step 1 — Loading SC state HHA file: %s", SC_STATE_FILE)
    inserted = 0
    with open(SC_STATE_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        cur = conn.cursor()
        for row in reader:
            lic_num, lic_exp = parse_license(row.get("LICENSE_EXPIRES", ""))
            btype = parse_business_type(row.get("COUNTY_BUSTYPE", ""))
            county = parse_county(row.get("COUNTY_BUSTYPE", ""))

            cur.execute(
                """
                INSERT INTO businesses (
                    le_name, lf_name,
                    address, city, zip_code, county,
                    phone, email,
                    license_number, license_expires, license_type,
                    business_type,
                    services_nursing, services_pt, services_ot,
                    services_speech, services_aide, services_social
                ) VALUES (
                    %s, %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s,
                    %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT DO NOTHING
                RETURNING business_id
                """,
                (
                    row.get("LE_NAME", "").strip() or None,
                    row.get("LF_NAME", "").strip() or None,
                    row.get("LF_STREET_ADDR1", "").strip() or None,
                    row.get("LF_STREET_CITY", "").strip() or None,
                    row.get("LF_STREET_ZIP", "").strip() or None,
                    county or None,
                    row.get("LLF_BUSINESS_PHONE", "").strip() or None,
                    row.get("LF_EMAIL", "").strip() or None,
                    lic_num,
                    lic_exp,
                    "HHA",
                    btype or None,
                    None,  # SC file has no explicit nursing column
                    yn(row.get("HH_PHYSICAL_THERAPY_IND", "")),
                    yn(row.get("HH_OCCUPATIONAL_THERAPY_IND", "")),
                    yn(row.get("HH_SPEECH_THERAPY_IND", "")),
                    yn(row.get("HH_HOME_HEALTH_AIDE_IND", "")),
                    yn(row.get("HH_MEDICAL_SOCIAL_SERVICES_IND", "")),
                ),
            )
            if cur.fetchone():
                inserted += 1

        conn.commit()
        cur.close()

    log.info("  Inserted %d businesses.", inserted)
    return inserted


# ---------------------------------------------------------------------------
# Step 2: CMS match → update businesses
# ---------------------------------------------------------------------------
def load_cms(conn) -> int:
    log.info("Step 2 — Matching CMS file (SC rows) to businesses …")

    # Fetch all businesses for matching
    cur = conn.cursor()
    cur.execute("SELECT business_id, le_name, lf_name FROM businesses")
    candidates: List[Tuple[int, str, str]] = [
        (r["business_id"], r["le_name"] or "", r["lf_name"] or "")
        for r in cur.fetchall()
    ]

    matched = 0
    with open(CMS_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("State", "").strip() != "SC":
                continue
            provider_name = row.get("Provider Name", "").strip()
            result = best_match(provider_name, candidates)
            if not result:
                log.debug("  No CMS match for: %s", provider_name)
                continue

            biz_id, score = result
            ccn = row.get("CMS Certification Number (CCN)", "").strip() or None
            star_raw = row.get("Quality of patient care star rating", "").strip()
            star = parse_numeric(star_raw)
            ownership = row.get("Type of Ownership", "").strip() or None
            cert_date = parse_date(row.get("Certification Date", "").strip())

            cur.execute(
                """
                UPDATE businesses SET
                    ccn = %s,
                    cms_star_rating = %s,
                    cms_ownership_type = %s,
                    cms_certification_date = %s,
                    medicare_certified = TRUE,
                    updated_at = NOW()
                WHERE business_id = %s
                """,
                (ccn, star, ownership, cert_date, biz_id),
            )
            log.info(
                "  CMS matched  [%.2f]  %-45s  →  business_id=%d  CCN=%s",
                score,
                provider_name[:45],
                biz_id,
                ccn,
            )
            matched += 1

    conn.commit()
    cur.close()
    log.info("  CMS matched %d businesses.", matched)
    return matched


# ---------------------------------------------------------------------------
# Step 3: Owners file → people + business_people
# ---------------------------------------------------------------------------
def load_owners(conn) -> Tuple[int, int]:
    log.info("Step 3 — Loading HHA owners file and linking to businesses …")

    cur = conn.cursor()
    cur.execute("SELECT business_id, le_name, lf_name FROM businesses")
    candidates: List[Tuple[int, str, str]] = [
        (r["business_id"], r["le_name"] or "", r["lf_name"] or "")
        for r in cur.fetchall()
    ]

    # Build a name → business_id cache to avoid re-matching identical org names
    org_match_cache: Dict[str, Optional[int]] = {}

    people_inserted = 0
    links_inserted = 0

    with open(OWNERS_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only individual owners
            if row.get("TYPE - OWNER", "").strip() != "I":
                continue

            org_name = row.get("ORGANIZATION NAME", "").strip()
            if not org_name:
                continue

            # Resolve org → business
            if org_name not in org_match_cache:
                result = best_match(org_name, candidates)
                if result:
                    biz_id, score = result
                    log.info(
                        "  Owner match  [%.2f]  %-50s  →  business_id=%d",
                        score,
                        org_name[:50],
                        biz_id,
                    )
                    org_match_cache[org_name] = biz_id
                    # Stamp enrollment_id on the business if not already set
                    enrollment_id = row.get("ENROLLMENT ID", "").strip() or None
                    if enrollment_id:
                        cur.execute(
                            """
                            UPDATE businesses
                            SET enrollment_id = COALESCE(enrollment_id, %s), updated_at = NOW()
                            WHERE business_id = %s
                            """,
                            (enrollment_id, biz_id),
                        )
                else:
                    log.debug("  No owner match for org: %s", org_name)
                    org_match_cache[org_name] = None

            biz_id = org_match_cache[org_name]
            if biz_id is None:
                continue

            # Upsert person
            assoc_id = row.get("ASSOCIATE ID - OWNER", "").strip() or None
            first = row.get("FIRST NAME - OWNER", "").strip() or None
            last = row.get("LAST NAME - OWNER", "").strip() or None
            full = " ".join(filter(None, [first, last])) or None
            addr = row.get("ADDRESS LINE 1 - OWNER", "").strip() or None
            city = row.get("CITY - OWNER", "").strip() or None
            state_code = row.get("STATE - OWNER", "").strip() or None
            zip_code = row.get("ZIP CODE - OWNER", "").strip() or None

            if assoc_id:
                cur.execute(
                    """
                    INSERT INTO people (
                        owner_associate_id, first_name, last_name, full_name,
                        address, city, state_code, zip_code
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (owner_associate_id) DO UPDATE SET
                        first_name  = EXCLUDED.first_name,
                        last_name   = EXCLUDED.last_name,
                        full_name   = EXCLUDED.full_name,
                        address     = COALESCE(EXCLUDED.address, people.address),
                        city        = COALESCE(EXCLUDED.city, people.city),
                        state_code  = COALESCE(EXCLUDED.state_code, people.state_code),
                        zip_code    = COALESCE(EXCLUDED.zip_code, people.zip_code)
                    RETURNING person_id, (xmax = 0) AS was_inserted
                    """,
                    (assoc_id, first, last, full, addr, city, state_code, zip_code),
                )
                person_row = cur.fetchone()
                person_id = person_row["person_id"]
                if person_row["was_inserted"]:
                    people_inserted += 1
            else:
                # No unique ID — insert without conflict guard
                cur.execute(
                    """
                    INSERT INTO people (
                        first_name, last_name, full_name,
                        address, city, state_code, zip_code
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING person_id
                    """,
                    (first, last, full, addr, city, state_code, zip_code),
                )
                person_id = cur.fetchone()["person_id"]
                people_inserted += 1

            # Insert business_people link
            role_text = row.get("ROLE TEXT - OWNER", "").strip() or None
            assoc_date = parse_date(row.get("ASSOCIATION DATE - OWNER", ""))
            pct_raw = row.get("PERCENTAGE OWNERSHIP", "").strip()
            pct = parse_numeric(pct_raw)
            is_pe = row.get("PRIVATE EQUITY COMPANY - OWNER", "").strip() == "Y"

            try:
                cur.execute(
                    """
                    INSERT INTO business_people (
                        business_id, person_id,
                        ownership_pct, role_text, association_date,
                        is_private_equity, source
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (business_id, person_id, role_text) DO NOTHING
                    RETURNING id
                    """,
                    (biz_id, person_id, pct, role_text, assoc_date, is_pe, "HHA_owners_file"),
                )
                if cur.fetchone():
                    links_inserted += 1
            except Exception as e:
                log.warning("  Could not insert business_people link: %s", e)
                conn.rollback()

    conn.commit()
    cur.close()
    log.info("  People inserted/updated: %d", people_inserted)
    log.info("  Business-people links created: %d", links_inserted)
    return people_inserted, links_inserted


# ---------------------------------------------------------------------------
# Step 1b: Load SC in-home care file → businesses
# ---------------------------------------------------------------------------
def sv(row, key):
    """Safe string value — returns stripped string or None."""
    v = row.get(key)
    return (v.strip() or None) if v else None


def load_sc_ihcp(conn) -> int:
    log.info("Step 1b — Loading SC In Home Care file: %s", SC_IHCP_FILE)
    inserted = 0
    with open(SC_IHCP_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        cur = conn.cursor()
        for row in reader:
            lic_num, lic_exp = parse_license(sv(row, "LICENSE_EXPIRES") or "")
            btype = parse_business_type(sv(row, "COUNTY_BUSTYPE") or "")
            county = parse_county(sv(row, "COUNTY_BUSTYPE") or "")

            cur.execute(
                """
                INSERT INTO businesses (
                    le_name, lf_name,
                    address, city, zip_code, county,
                    phone, email,
                    license_number, license_expires, license_type,
                    business_type
                ) VALUES (
                    %s, %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s
                )
                ON CONFLICT DO NOTHING
                RETURNING business_id
                """,
                (
                    sv(row, "LE_NAME"),
                    sv(row, "LF_NAME"),
                    sv(row, "LF_STREET_ADDR1"),
                    sv(row, "LF_STREET_CITY"),
                    sv(row, "LF_STREET_ZIP"),
                    county or None,
                    sv(row, "LLF_BUSINESS_PHONE"),
                    sv(row, "LF_EMAIL"),
                    lic_num,
                    lic_exp,
                    "IHCP",
                    btype or None,
                ),
            )
            if cur.fetchone():
                inserted += 1

        conn.commit()
        cur.close()

    log.info("  Inserted %d IHCP businesses.", inserted)
    return inserted


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    log.info("=== import_sc.py starting ===")

    log.info("Creating new schema if not already present …")
    create_new_schema()

    conn = get_connection()
    try:
        load_sc_state(conn)
        load_sc_ihcp(conn)
        load_cms(conn)
        load_owners(conn)
    finally:
        conn.close()

    # Final summary from DB
    conn2 = get_connection()
    cur2 = conn2.cursor()
    cur2.execute("SELECT COUNT(*) AS n FROM businesses WHERE license_type = 'HHA'")
    db_hha = cur2.fetchone()["n"]
    cur2.execute("SELECT COUNT(*) AS n FROM businesses WHERE license_type = 'IHCP'")
    db_ihcp = cur2.fetchone()["n"]
    cur2.execute("SELECT COUNT(*) AS n FROM businesses WHERE medicare_certified = TRUE")
    db_cms = cur2.fetchone()["n"]
    cur2.execute("SELECT COUNT(*) AS n FROM people")
    db_people = cur2.fetchone()["n"]
    cur2.execute("SELECT COUNT(*) AS n FROM business_people")
    db_links = cur2.fetchone()["n"]
    cur2.close()
    conn2.close()

    print()
    print("=" * 55)
    print("  IMPORT SUMMARY")
    print("=" * 55)
    print(f"  HHA businesses (state file)  : {db_hha}")
    print(f"  IHCP businesses (in-home)    : {db_ihcp}")
    print(f"  Matched to CMS (medicare)    : {db_cms}")
    print(f"  People imported              : {db_people}")
    print(f"  Business-people links        : {db_links}")
    print("=" * 55)


if __name__ == "__main__":
    main()
