# Homevale CRM — Architecture & Project Plan

## Purpose
AI-powered acquisition research tool for a home healthcare company owner seeking to buy
another HHA generating $3M+ annual profit. Starts with South Carolina (39 agencies).

---

## Current Status: Phase 1 Complete — BLOCKED on API Auth
- All scripts built and tested
- Docker PostgreSQL running, schema created, 39 SC agencies imported
- **BLOCKER:** Claude API does not support OAuth CLI tokens (`sk-ant-oat01-...`).
  The `/v1/messages` endpoint requires a standard API key (`sk-ant-api03-...`).
- **Resolution options (pick one):**
  1. User generates an API key at console.anthropic.com → API Keys
  2. Swap enrichment engine to Perplexity or OpenAI
  3. Run enrichment interactively through Claude Code CLI (no API key needed, uses subscription)

---

## System Overview

```
HHA_All_Owners_2026.01.02.csv
        │
        ▼
scripts/import_csv.py          ← DONE, already ran for SC
        │
        ▼
PostgreSQL (Docker, port 5433) ← RUNNING, 39 agencies loaded
  ├── agencies table
  ├── owners table
  └── agency_owners table
        │
        ▼
scripts/enrich.py              ← BUILT, blocked on auth
        │
        ▼
  Enriched DB (acquisition targets with scores)
```

---

## Database

- **Container:** `homevale-crm-db` (Docker)
- **Port:** 5433
- **DB:** `homevale_crm` | **User:** `homevale` | **Pass:** `homevale_pass`
- **Connection:** `psql -h localhost -p 5433 -U homevale -d homevale_crm`

### Tables

| Table | Rows | Purpose |
|---|---|---|
| `agencies` | 39 | One row per CMS enrollment ID. Raw + enriched fields. |
| `owners` | 27 | One row per unique owner. |
| `agency_owners` | 93 | Junction: ownership %, role, entity type flags |

### Key Enriched Fields (agencies — all currently NULL/pending)
- `business_summary`, `website`, `founded_year`, `phone`
- `estimated_employees`, `estimated_locations`, `service_area`
- `primary_payor_mix` (medicare/medicaid/private_duty/mixed), `payor_mix_notes`
- `estimated_annual_revenue`, `estimated_annual_profit`, `profit_margin_pct`
- `accreditation` (CHAP/ACHC/Joint Commission/None)
- `cms_star_rating` (1-5), `cms_deficiencies`
- `acquisition_signals`, `pe_backed`, `red_flags`, `growth_signals`, `recent_news`
- `acquisition_fit_score` (1-10, AI-generated — KEY FIELD for buyer)
- `enrichment_status` (pending/complete/failed), `enrichment_raw_json` (JSONB)

---

## File Map

```
/Users/molty/Repos/Homevale-crm/
├── ARCHITECTURE.md              ← this file
├── docker-compose.yml           ← PostgreSQL on port 5433
├── .env                         ← ANTHROPIC_AUTH_TOKEN + DB creds (gitignored)
├── .gitignore
├── requirements.txt             ← anthropic, psycopg2-binary, python-dotenv
├── HHA_All_Owners_2026.01.02.csv ← source data (102k rows, 11,660 agencies)
├── enrichment.log               ← output log from enrich.py runs
└── scripts/
    ├── db.py                    ← get_connection() + create_schema()
    ├── import_csv.py            ← CSV → PostgreSQL (--state SC by default)
    └── enrich.py                ← Claude AI enrichment pipeline
```

---

## Scripts Reference

### `scripts/import_csv.py`
```bash
python3 scripts/import_csv.py              # SC (default)
python3 scripts/import_csv.py --state TX   # other state
```

### `scripts/enrich.py`
```bash
python3 scripts/enrich.py --limit 3        # pilot: 3 agencies
python3 scripts/enrich.py --dry-run        # preview prompts only
python3 scripts/enrich.py                  # all pending
python3 scripts/enrich.py --retry-failed   # re-run failures
```
Rate-limited: 1 request / 12 seconds. Logs to `enrichment.log`.
Uses `ANTHROPIC_AUTH_TOKEN` from `.env` (currently failing — see BLOCKER above).

---

## Enrichment Prompt Strategy
Claude is given: agency name, state, owner names/roles.
Claude uses web_search tool to find and synthesize:
- Business overview, website, phone, founding year
- Employee count, locations, service area
- Payor mix (Medicare vs Medicaid vs private duty)
- Estimated revenue and profit
- CMS star rating and deficiencies
- Owner background, LinkedIn, succession signals
- PE backing, red flags, acquisition signals
- **acquisition_fit_score 1-10** (10 = $3M+ profit, Medicare-certified, independent owner ready to sell)

---

## Roadmap

### Phase 1 — Data Enrichment (CURRENT — blocked on auth)
- [x] PostgreSQL schema
- [x] CSV import (SC)
- [x] enrich.py script
- [ ] Resolve API auth → run enrichment on 39 SC agencies
- [ ] Review fit scores, validate quality

### Phase 2 — CRM Web UI
- FastAPI backend + React frontend (or simple Flask + Jinja if speed preferred)
- List view: all agencies sorted by acquisition_fit_score
- Detail view: full enriched profile per agency
- Status tracking: Not Contacted / Contacted / Interested / LOI / Closed

### Phase 3 — Outreach Tracking
- Log calls/emails per agency
- Notes field
- Next follow-up date

### Phase 4 — Deal Pipeline
- Kanban: Prospect → Contacted → NDA → Diligence → LOI → Closed
- Financial modeling fields (asking price, EBITDA multiple, etc.)

### Phase 5 — Expand States
- Run import_csv.py + enrich.py for additional target states
