"""
db.py — Shared database connection and schema management.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5433)),
        dbname=os.getenv("DB_NAME", "homevale_crm"),
        user=os.getenv("DB_USER", "homevale"),
        password=os.getenv("DB_PASSWORD", "homevale_pass"),
        sslmode=os.getenv("DB_SSLMODE", "prefer"),
        cursor_factory=RealDictCursor,
    )


def create_schema():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS agencies (
            -- Raw fields from CMS enrollment data
            enrollment_id           TEXT PRIMARY KEY,
            organization_name       TEXT NOT NULL,
            state                   TEXT,

            -- Enriched: Business overview
            business_summary        TEXT,
            website                 TEXT,
            founded_year            INTEGER,
            phone                   TEXT,

            -- Enriched: Scale
            estimated_employees     INTEGER,
            estimated_locations     INTEGER,
            service_area            TEXT,

            -- Enriched: Payor mix
            primary_payor_mix       TEXT,   -- 'medicare' | 'medicaid' | 'private_duty' | 'mixed'
            payor_mix_notes         TEXT,

            -- Enriched: Financials (estimates)
            estimated_annual_revenue    BIGINT,
            estimated_annual_profit     BIGINT,
            profit_margin_pct           NUMERIC(5,2),

            -- Enriched: Quality & compliance
            accreditation           TEXT,   -- CHAP | ACHC | Joint Commission | None
            cms_star_rating         NUMERIC(2,1),
            cms_deficiencies        TEXT,

            -- Enriched: M&A signals
            acquisition_signals     TEXT,
            pe_backed               BOOLEAN,
            recent_news             TEXT,
            growth_signals          TEXT,
            red_flags               TEXT,
            acquisition_fit_score   INTEGER,  -- 1-10; AI-generated fit score

            -- Pipeline tracking
            enrichment_status       TEXT NOT NULL DEFAULT 'pending',  -- pending | complete | failed
            enrichment_date         TIMESTAMPTZ,
            enrichment_raw_json     JSONB,
            enrichment_error        TEXT,

            created_at              TIMESTAMPTZ DEFAULT NOW(),
            updated_at              TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS owners (
            owner_id                TEXT PRIMARY KEY,  -- ASSOCIATE ID - OWNER
            first_name              TEXT,
            last_name               TEXT,
            org_name                TEXT,             -- if organizational owner
            owner_type              TEXT,             -- 'I' (individual) | 'O' (organization)
            address_line1           TEXT,
            address_line2           TEXT,
            city                    TEXT,
            state                   TEXT,
            zip_code                TEXT,

            -- Enriched
            owner_background        TEXT,
            other_businesses        TEXT,
            linkedin_url            TEXT,
            estimated_age           INTEGER,
            succession_signals      TEXT,

            -- Pipeline tracking
            owner_enrichment_status TEXT NOT NULL DEFAULT 'pending',
            owner_enrichment_date   TIMESTAMPTZ,

            created_at              TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS agency_owners (
            id                  SERIAL PRIMARY KEY,
            enrollment_id       TEXT REFERENCES agencies(enrollment_id) ON DELETE CASCADE,
            owner_id            TEXT REFERENCES owners(owner_id) ON DELETE CASCADE,
            ownership_pct       NUMERIC(5,2),
            role_code           TEXT,
            role_text           TEXT,
            association_date    DATE,
            title               TEXT,
            -- Owner entity type flags
            is_corporation      BOOLEAN DEFAULT FALSE,
            is_llc              BOOLEAN DEFAULT FALSE,
            is_for_profit       BOOLEAN DEFAULT FALSE,
            is_non_profit       BOOLEAN DEFAULT FALSE,
            is_private_equity   BOOLEAN DEFAULT FALSE,
            is_holding_company  BOOLEAN DEFAULT FALSE,
            UNIQUE(enrollment_id, owner_id, role_code)
        );
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_agencies_enrichment_status
            ON agencies(enrichment_status);
        CREATE INDEX IF NOT EXISTS idx_agency_owners_enrollment
            ON agency_owners(enrollment_id);
        CREATE INDEX IF NOT EXISTS idx_agency_owners_owner
            ON agency_owners(owner_id);
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("Schema created successfully.")


def create_new_schema():
    """
    Creates the new businesses / people / business_people tables.
    Leaves the legacy agencies / owners / agency_owners tables untouched.
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS businesses (
            business_id             SERIAL PRIMARY KEY,

            -- Identity / licensing (from SC state file)
            le_name                 TEXT,          -- legal entity name
            lf_name                 TEXT,          -- licensed facility / trading name
            address                 TEXT,
            city                    TEXT,
            zip_code                TEXT,
            county                  TEXT,
            phone                   TEXT,
            email                   TEXT,
            license_number          TEXT,          -- e.g. "HHA-0151" or "IHCP-0058"
            license_expires         DATE,
            license_type            TEXT,          -- 'HHA' | 'IHCP'
            business_type           TEXT,          -- e.g. "Limited Liability"

            -- Services offered (Y/N from SC state file)
            services_nursing        BOOLEAN,
            services_pt             BOOLEAN,
            services_ot             BOOLEAN,
            services_speech         BOOLEAN,
            services_aide           BOOLEAN,
            services_social         BOOLEAN,

            -- CMS / Medicare data (matched from HHA_Agencies_CMS.csv)
            ccn                     TEXT,          -- CMS Certification Number
            cms_star_rating         NUMERIC(2,1),
            cms_ownership_type      TEXT,
            cms_certification_date  DATE,
            medicare_certified      BOOLEAN NOT NULL DEFAULT FALSE,

            -- Ownership link (matched from HHA_All_Owners file)
            enrollment_id           TEXT,

            -- AI enrichment — business overview
            business_summary        TEXT,
            website                 TEXT,
            founded_year            INTEGER,
            estimated_employees     INTEGER,
            estimated_locations     INTEGER,
            service_area            TEXT,
            primary_payor_mix       TEXT,
            payor_mix_notes         TEXT,
            estimated_annual_revenue BIGINT,
            estimated_annual_profit BIGINT,
            profit_margin_pct       NUMERIC(5,2),
            accreditation           TEXT,
            cms_deficiencies        TEXT,
            acquisition_signals     TEXT,
            pe_backed               BOOLEAN,
            recent_news             TEXT,
            growth_signals          TEXT,
            red_flags               TEXT,
            acquisition_fit_score   INTEGER,
            enrichment_status       TEXT NOT NULL DEFAULT 'pending',
            enrichment_date         TIMESTAMP,
            enrichment_raw_json     JSONB,
            enrichment_error        TEXT,

            created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS people (
            person_id               SERIAL PRIMARY KEY,
            first_name              TEXT,
            last_name               TEXT,
            full_name               TEXT,
            owner_associate_id      TEXT UNIQUE,
            address                 TEXT,
            city                    TEXT,
            state_code              TEXT,
            zip_code                TEXT,
            -- AI enrichment
            owner_background        TEXT,
            other_businesses        TEXT,
            linkedin_url            TEXT,
            estimated_age           INTEGER,
            succession_signals      TEXT,
            created_at              TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS business_people (
            id              SERIAL PRIMARY KEY,
            business_id     INTEGER NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
            person_id       INTEGER NOT NULL REFERENCES people(person_id) ON DELETE CASCADE,
            ownership_pct   NUMERIC(6,2),
            role_text       TEXT,
            association_date DATE,
            is_private_equity BOOLEAN,
            source          TEXT,
            UNIQUE(business_id, person_id, role_text)
        );
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_businesses_le_name
            ON businesses(le_name);
        CREATE INDEX IF NOT EXISTS idx_businesses_enrichment_status
            ON businesses(enrichment_status);
        CREATE INDEX IF NOT EXISTS idx_business_people_business
            ON business_people(business_id);
        CREATE INDEX IF NOT EXISTS idx_business_people_person
            ON business_people(person_id);
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("New schema (businesses / people / business_people) created successfully.")


if __name__ == "__main__":
    create_schema()
