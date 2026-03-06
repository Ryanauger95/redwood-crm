"""
enrich.py — AI-powered enrichment pipeline using Claude + web search.

For each pending agency in the database, this script:
  1. Fetches the agency name and its owners from the DB
  2. Sends a research prompt to Claude (claude-sonnet-4-6) with web_search enabled
  3. Parses the structured JSON response
  4. Updates the agencies table with enriched data

Usage:
    python scripts/enrich.py                  # enrich all pending SC agencies
    python scripts/enrich.py --limit 3        # enrich first 3 (pilot test)
    python scripts/enrich.py --dry-run        # print prompts without calling API
    python scripts/enrich.py --retry-failed   # re-enrich failed agencies
"""

import os
import sys
import json
import time
import argparse
import logging
from datetime import datetime, timezone

import anthropic
from typing import Optional
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from db import get_connection

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("enrichment.log"),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Claude client
# ---------------------------------------------------------------------------

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-6"
RATE_LIMIT_SECONDS = 65   # ~1 req/min — web search uses ~40-50k tokens per call


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a mergers & acquisitions research analyst specializing in the home healthcare industry.
Your job is to research home health agencies that are potential acquisition targets for a private buyer
seeking agencies with $3M+ annual profit.

Use web search to gather accurate information. Search for:
1. The agency directly (name + "South Carolina" + "home health")
2. The agency on CMS Care Compare (Medicare quality ratings)
3. Each individual owner by name + company
4. Any news, litigation, or notable events

CRITICAL OUTPUT RULES — YOU MUST FOLLOW THESE EXACTLY:
- After completing all your research, output ONLY the JSON object. Nothing else after the searches.
- Your final output after the searches must start with { and end with }
- Do NOT write any preamble, summary, or explanation in your final output
- Do NOT use markdown code fences (no ```json)
- Even if you find zero information, return the JSON with null values and a low fit score
- Use null for any field you cannot determine. Never omit a field
"""

RESEARCH_PROMPT_TEMPLATE = """Research this home health agency for acquisition analysis:

Agency Name: {agency_name}
Enrollment ID: {enrollment_id}
State: {state}

Owners:
{owner_list}

Return a JSON object with this EXACT structure:
{{
  "business_summary": "2-3 sentence description of the company, its history, and services offered",
  "website": "https://... or null",
  "phone": "phone number or null",
  "founded_year": 2005,
  "estimated_employees": 150,
  "estimated_locations": 3,
  "service_area": "counties or regions served in SC",
  "primary_payor_mix": "medicare",
  "payor_mix_notes": "Explanation of payor breakdown: Medicare X%, Medicaid Y%, private pay Z%",
  "estimated_annual_revenue": 8000000,
  "estimated_annual_profit": 1200000,
  "profit_margin_pct": 15.0,
  "accreditation": "CHAP",
  "cms_star_rating": 4.0,
  "cms_deficiencies": "Description of any CMS survey deficiencies, or null if none found",
  "acquisition_signals": "Any evidence owner is considering selling: age, broker listings, succession mentions",
  "pe_backed": false,
  "recent_news": "Any notable news, awards, press coverage, or null",
  "growth_signals": "Evidence of growth: job postings, new locations, expansions, or null",
  "red_flags": "Any concerning findings: lawsuits, complaints, regulatory issues, or null",
  "acquisition_fit_score": 7,
  "owners": [
    {{
      "owner_id": "the owner ID from input",
      "owner_background": "Professional background, career history",
      "other_businesses": "Other companies this person owns or has owned",
      "linkedin_url": "https://linkedin.com/in/... or null",
      "estimated_age": 58,
      "succession_signals": "Any signals this owner may be looking to exit or retire"
    }}
  ],
  "research_confidence": "high",
  "research_notes": "Any caveats or notes about data quality/availability"
}}

Acquisition fit score guidance (1-10):
- 10: Large Medicare-certified agency, $3M+ profit, independent owner showing exit signals, no red flags
- 7-9: Good size, profitable, Medicare-certified, some positive signals
- 4-6: Moderate size or payor mix concerns, limited info available
- 1-3: Small, primarily Medicaid/private duty, red flags, or PE-backed

Research thoroughly before estimating financials. For SC home health agencies:
- Medicare-certified agencies with 50+ employees typically generate $3M-$15M revenue
- Industry profit margins for well-run agencies: 10-20% EBITDA
- Private duty agencies tend to be smaller with lower margins
"""


def build_owner_list(owners: list) -> str:
    lines = []
    for o in owners:
        if o["owner_type"] == "I":
            name = f"{o['first_name']} {o['last_name']}".strip()
            lines.append(f"  - {name} (Individual, {o['ownership_pct'] or '?'}% ownership, role: {o['role_text']})")
        else:
            lines.append(f"  - {o['org_name']} (Organization, {o['ownership_pct'] or '?'}% ownership)")
    return "\n".join(lines) if lines else "  - No owner details available"


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> Optional[dict]:
    """Find and parse the outermost JSON object in a text string."""
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    end = -1
    in_string = False
    escape_next = False
    for idx in range(start, len(text)):
        ch = text[idx]
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = idx
                break

    if end == -1:
        return None

    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------------------
# Claude API call
# ---------------------------------------------------------------------------

def research_agency(agency: dict, owners: list, dry_run: bool = False) -> Optional[dict]:
    prompt = RESEARCH_PROMPT_TEMPLATE.format(
        agency_name=agency["organization_name"],
        enrollment_id=agency["enrollment_id"],
        state=agency["state"],
        owner_list=build_owner_list(owners),
    )

    if dry_run:
        log.info(f"[DRY RUN] Would research: {agency['organization_name']}")
        print("\n--- PROMPT ---")
        print(prompt)
        print("--- END PROMPT ---\n")
        return None

    log.info(f"Researching: {agency['organization_name']} ({agency['enrollment_id']})")

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=8096,
            system=SYSTEM_PROMPT,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract the last text block from the final response
        result_text = None
        for block in response.content:
            if block.type == "text":
                result_text = block.text  # last text block = final JSON output

        if not result_text:
            log.warning(f"No text response for {agency['organization_name']}")
            return None

        extracted = _extract_json(result_text)

        if extracted is None:
            log.error(f"Could not extract JSON for {agency['organization_name']}")
            log.error(f"stop_reason={response.stop_reason} snippet={repr(result_text[:200])}")
            return None

        return extracted

    except anthropic.RateLimitError:
        raise  # propagate to main loop for backoff retry
    except anthropic.APIError as e:
        log.error(f"API error for {agency['organization_name']}: {e}")
        raise


# ---------------------------------------------------------------------------
# Database updates
# ---------------------------------------------------------------------------

def update_business(cur, business_id: int, data: dict, raw_json: dict):
    cur.execute("""
        UPDATE businesses SET
            business_summary        = %(business_summary)s,
            website                 = %(website)s,
            phone                   = %(phone)s,
            founded_year            = %(founded_year)s,
            estimated_employees     = %(estimated_employees)s,
            estimated_locations     = %(estimated_locations)s,
            service_area            = %(service_area)s,
            primary_payor_mix       = %(primary_payor_mix)s,
            payor_mix_notes         = %(payor_mix_notes)s,
            estimated_annual_revenue= %(estimated_annual_revenue)s,
            estimated_annual_profit = %(estimated_annual_profit)s,
            profit_margin_pct       = %(profit_margin_pct)s,
            accreditation           = %(accreditation)s,
            cms_star_rating         = %(cms_star_rating)s,
            cms_deficiencies        = %(cms_deficiencies)s,
            acquisition_signals     = %(acquisition_signals)s,
            pe_backed               = %(pe_backed)s,
            recent_news             = %(recent_news)s,
            growth_signals          = %(growth_signals)s,
            red_flags               = %(red_flags)s,
            acquisition_fit_score   = %(acquisition_fit_score)s,
            enrichment_status       = 'completed',
            enrichment_date         = NOW(),
            enrichment_raw_json     = %(raw_json)s,
            updated_at              = NOW()
        WHERE business_id = %(business_id)s
    """, {
        "business_id": business_id,
        "business_summary": data.get("business_summary"),
        "website": data.get("website"),
        "phone": data.get("phone"),
        "founded_year": data.get("founded_year"),
        "estimated_employees": data.get("estimated_employees"),
        "estimated_locations": data.get("estimated_locations"),
        "service_area": data.get("service_area"),
        "primary_payor_mix": data.get("primary_payor_mix"),
        "payor_mix_notes": data.get("payor_mix_notes"),
        "estimated_annual_revenue": data.get("estimated_annual_revenue"),
        "estimated_annual_profit": data.get("estimated_annual_profit"),
        "profit_margin_pct": data.get("profit_margin_pct"),
        "accreditation": data.get("accreditation"),
        "cms_star_rating": data.get("cms_star_rating"),
        "cms_deficiencies": data.get("cms_deficiencies"),
        "acquisition_signals": data.get("acquisition_signals"),
        "pe_backed": data.get("pe_backed"),
        "recent_news": data.get("recent_news"),
        "growth_signals": data.get("growth_signals"),
        "red_flags": data.get("red_flags"),
        "acquisition_fit_score": data.get("acquisition_fit_score"),
        "raw_json": json.dumps(raw_json),
    })


def update_people_from_enrichment(cur, business_id: int, owner_data_list: list):
    for o in owner_data_list:
        full_name = o.get("owner_name") or o.get("full_name")
        if not full_name:
            continue
        # Match by full_name to people linked to this business
        cur.execute("""
            UPDATE people p SET
                owner_background   = %(owner_background)s,
                other_businesses   = %(other_businesses)s,
                linkedin_url       = %(linkedin_url)s,
                estimated_age      = %(estimated_age)s,
                succession_signals = %(succession_signals)s
            FROM business_people bp
            WHERE bp.person_id = p.person_id
              AND bp.business_id = %(business_id)s
              AND LOWER(p.full_name) = LOWER(%(full_name)s)
        """, {
            "business_id": business_id,
            "full_name": full_name,
            "owner_background": o.get("owner_background"),
            "other_businesses": o.get("other_businesses"),
            "linkedin_url": o.get("linkedin_url"),
            "estimated_age": o.get("estimated_age"),
            "succession_signals": o.get("succession_signals"),
        })


def mark_failed(cur, business_id: int, error: str):
    cur.execute("""
        UPDATE businesses SET
            enrichment_status = 'failed',
            enrichment_error  = %(error)s,
            enrichment_date   = NOW(),
            updated_at        = NOW()
        WHERE business_id = %(business_id)s
    """, {"business_id": business_id, "error": error})


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def get_pending_businesses(cur, retry_failed: bool = False, limit: Optional[int] = None, license_type: Optional[str] = None) -> list:
    statuses = ("'pending'", "'failed'") if retry_failed else ("'pending'",)
    type_filter = f"AND license_type = '{license_type}'" if license_type else ""
    sql = f"""
        SELECT business_id, le_name, lf_name, city, county
        FROM businesses
        WHERE enrichment_status IN ({', '.join(statuses)})
          {type_filter}
        ORDER BY le_name
    """
    if limit:
        sql += f" LIMIT {limit}"
    cur.execute(sql)
    return list(cur.fetchall())


def get_business_owners(cur, business_id: int) -> list:
    cur.execute("""
        SELECT p.person_id, p.first_name, p.last_name, p.full_name,
               bp.ownership_pct, bp.role_text, bp.is_private_equity
        FROM business_people bp
        JOIN people p ON p.person_id = bp.person_id
        WHERE bp.business_id = %(business_id)s
    """, {"business_id": business_id})
    return list(cur.fetchall())


LOCK_FILE = "/tmp/enrich_crm.lock"

def main():
    import fcntl
    lock_fd = open(LOCK_FILE, "w")
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log.error("Another enrichment process is already running. Exiting.")
        lock_fd.close()
        return

    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max businesses to enrich")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts, don't call API")
    parser.add_argument("--retry-failed", action="store_true", help="Re-enrich failed businesses")
    parser.add_argument("--type", default=None, choices=["HHA", "IHCP"], help="Filter by license type (default: all)")
    args = parser.parse_args()

    conn = get_connection()
    cur = conn.cursor()

    businesses = get_pending_businesses(cur, retry_failed=args.retry_failed, limit=args.limit, license_type=args.type)
    log.info(f"Found {len(businesses)} businesses to enrich")

    for i, biz in enumerate(businesses):
        business_id = biz["business_id"]
        name = biz["le_name"] or biz["lf_name"] or f"business_id={business_id}"
        log.info(f"[{i+1}/{len(businesses)}] {name}")

        owners = get_business_owners(cur, business_id)

        # Build agency dict compatible with research_agency()
        agency_dict = {
            "organization_name": name,
            "enrollment_id": str(business_id),
            "state": "SC",
        }
        owner_list = [dict(o) for o in owners]
        # Map fields to what build_owner_list() expects
        for o in owner_list:
            o.setdefault("owner_type", "I")
            o.setdefault("org_name", None)

        try:
            result = research_agency(agency_dict, owner_list, dry_run=args.dry_run)

            if result:
                update_business(cur, business_id, result, result)
                owner_data = result.get("owners", [])
                if owner_data:
                    update_people_from_enrichment(cur, business_id, owner_data)
                # Auto-seed pipeline stage so business appears in the CRM
                cur.execute("""
                    INSERT INTO pipeline_stages (business_id, stage)
                    VALUES (%(business_id)s, 'Prospect')
                    ON CONFLICT (business_id) DO NOTHING
                """, {"business_id": business_id})
                conn.commit()
                score = result.get("acquisition_fit_score", "?")
                profit = result.get("estimated_annual_profit")
                profit_str = f"${profit:,}" if profit else "unknown"
                log.info(f"  -> Score: {score}/10 | Est. profit: {profit_str} | Status: complete")

        except anthropic.RateLimitError:
            # Exponential backoff: wait 120s, 240s, 480s
            for wait in [120, 240, 480]:
                log.warning(f"  -> Rate limited, waiting {wait}s...")
                time.sleep(wait)
                try:
                    result = research_agency(agency_dict, owner_list, dry_run=args.dry_run)
                    break  # success
                except anthropic.RateLimitError:
                    result = None
                    continue
                except Exception as e2:
                    log.error(f"  -> FAILED after rate limit retry: {e2}")
                    result = None
                    break
            else:
                log.error(f"  -> Giving up after rate limit retries for {name}")
                result = None

            if result:
                update_business(cur, business_id, result, result)
                owner_data = result.get("owners", [])
                if owner_data:
                    update_people_from_enrichment(cur, business_id, owner_data)
                cur.execute("""
                    INSERT INTO pipeline_stages (business_id, stage)
                    VALUES (%(business_id)s, 'Prospect')
                    ON CONFLICT (business_id) DO NOTHING
                """, {"business_id": business_id})
                conn.commit()
                score = result.get("acquisition_fit_score", "?")
                log.info(f"  -> Score: {score}/10 | Status: complete (after rate limit retry)")
            elif result is None and name:
                mark_failed(cur, business_id, "rate_limit_exhausted")
                conn.commit()
        except Exception as e:
            log.error(f"  -> FAILED: {e}")
            mark_failed(cur, business_id, str(e))
            conn.commit()

        if not args.dry_run and i < len(businesses) - 1:
            log.info(f"  Waiting {RATE_LIMIT_SECONDS}s before next request...")
            time.sleep(RATE_LIMIT_SECONDS)

    cur.close()
    conn.close()
    log.info("Enrichment complete.")


if __name__ == "__main__":
    main()
