"""
gui.py — Streamlit UI for exploring the Homevale CRM database.

Run with:
    /Users/molty/Library/Python/3.9/bin/streamlit run scripts/gui.py
"""

import os
import sys
import pandas as pd
import streamlit as st

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.db import get_connection
from dotenv import load_dotenv
load_dotenv()

st.set_page_config(page_title="Homevale CRM", layout="wide", page_icon="🏥")

# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------
def _plain_conn():
    """Connection without RealDictCursor — needed for pd.read_sql."""
    import psycopg2
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5433)),
        dbname=os.getenv("DB_NAME", "homevale_crm"),
        user=os.getenv("DB_USER", "homevale"),
        password=os.getenv("DB_PASSWORD", "homevale_pass"),
    )


@st.cache_data(ttl=30)
def query(sql, params=None):
    conn = _plain_conn()
    try:
        df = pd.read_sql(sql, conn, params=params)
    finally:
        conn.close()
    return df


def run_sql(sql):
    """Run arbitrary SQL (no caching, supports writes)."""
    conn = _plain_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        try:
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description] if cur.description else []
            return pd.DataFrame(rows, columns=cols), None
        except Exception:
            return pd.DataFrame(), None
    except Exception as e:
        conn.rollback()
        return pd.DataFrame(), str(e)
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Sidebar nav
# ---------------------------------------------------------------------------
st.sidebar.title("🏥 Homevale CRM")
page = st.sidebar.radio(
    "Navigate",
    ["📊 Dashboard", "🏢 Businesses", "👤 People", "🔗 Ownership", "💻 SQL Query"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def fmt_money(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return "—"
    return f"${int(val):,}"

def fmt_val(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return "—"
    return str(val)

def score_color(score):
    if score is None:
        return "gray"
    if score >= 8:
        return "green"
    if score >= 5:
        return "orange"
    return "red"

def show_business_detail(biz_id):
    row = query("SELECT * FROM businesses WHERE business_id = %s", (int(biz_id),))
    if row.empty:
        st.warning("Not found.")
        return
    b = row.iloc[0]

    # ── Hero: name + summary ──────────────────────────────────────────────
    st.markdown(f"## {b['le_name'] or b['lf_name']}")
    if b.get('lf_name') and b['lf_name'] != b['le_name']:
        st.caption(f"Trading as: **{b['lf_name']}**")

    if b.get('business_summary') and fmt_val(b['business_summary']) != "—":
        st.info(b['business_summary'])
    else:
        st.info("No summary yet — enrichment pending or not available.")

    # ── Score + key stats bar ─────────────────────────────────────────────
    score = b.get('acquisition_fit_score')
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Fit Score", f"{score}/10" if score else "—")
    c2.metric("Est. Annual Profit", fmt_money(b.get('estimated_annual_profit')))
    c3.metric("Est. Annual Revenue", fmt_money(b.get('estimated_annual_revenue')))
    c4.metric("CMS Star Rating", fmt_val(b.get('cms_star_rating')))
    c5.metric("Profit Margin", f"{b['profit_margin_pct']}%" if b.get('profit_margin_pct') else "—")

    st.divider()

    # ── Two-column layout ─────────────────────────────────────────────────
    left, right = st.columns(2)

    with left:
        st.subheader("Business Info")
        info = {
            "City": b.get('city'),
            "County": b.get('county'),
            "Address": b.get('address'),
            "Phone": b.get('phone'),
            "Website": b.get('website'),
            "Founded": b.get('founded_year'),
            "Business Type": b.get('business_type'),
            "License": b.get('license_number'),
            "License Expires": b.get('license_expires'),
            "License Type": b.get('license_type'),
            "Medicare Certified": "Yes" if b.get('medicare_certified') else "No",
            "Accreditation": b.get('accreditation'),
            "Employees (est.)": b.get('estimated_employees'),
            "Locations (est.)": b.get('estimated_locations'),
            "Service Area": b.get('service_area'),
        }
        for k, v in info.items():
            if v and fmt_val(v) != "—":
                st.markdown(f"**{k}:** {v}")

        st.subheader("Payor Mix")
        st.markdown(f"**Primary:** {fmt_val(b.get('primary_payor_mix')).title()}")
        if b.get('payor_mix_notes') and fmt_val(b['payor_mix_notes']) != "—":
            st.markdown(b['payor_mix_notes'])

    with right:
        st.subheader("M&A Signals")
        pe = b.get('pe_backed')
        if pe is True:
            st.error("⚠️ PE-Backed — harder to acquire")
        elif pe is False:
            st.success("✅ Not PE-Backed — independent owner")

        def signal_block(label, val):
            v = fmt_val(val)
            if v != "—":
                st.markdown(f"**{label}**")
                st.markdown(v)

        signal_block("Acquisition Signals", b.get('acquisition_signals'))
        signal_block("Growth Signals", b.get('growth_signals'))
        signal_block("Recent News", b.get('recent_news'))

        if b.get('red_flags') and fmt_val(b['red_flags']) != "—":
            st.subheader("🚩 Red Flags")
            st.warning(b['red_flags'])

        st.subheader("CMS / Quality")
        cms_info = {
            "CCN": b.get('ccn'),
            "Ownership Type": b.get('cms_ownership_type'),
            "Certification Date": b.get('cms_certification_date'),
            "Deficiencies": b.get('cms_deficiencies'),
        }
        for k, v in cms_info.items():
            if v and fmt_val(v) != "—":
                st.markdown(f"**{k}:** {v}")

    # ── Owners ────────────────────────────────────────────────────────────
    st.divider()
    st.subheader("Owners")
    owners = query("""
        SELECT p.full_name, p.city, p.state_code,
               bp.ownership_pct, bp.role_text, bp.association_date, bp.is_private_equity,
               p.owner_background, p.succession_signals, p.linkedin_url, p.estimated_age
        FROM business_people bp
        JOIN people p ON p.person_id = bp.person_id
        WHERE bp.business_id = %s
        ORDER BY bp.ownership_pct DESC NULLS LAST
    """, (int(biz_id),))

    if owners.empty:
        st.info("No owners linked.")
    else:
        for _, o in owners.iterrows():
            pct = f"{o['ownership_pct']:.0f}%" if o.get('ownership_pct') else "?"
            with st.expander(f"{o['full_name']} — {pct} — {o.get('role_text', '')}"):
                oc1, oc2 = st.columns(2)
                with oc1:
                    if o.get('owner_background') and fmt_val(o['owner_background']) != "—":
                        st.markdown(f"**Background:** {o['owner_background']}")
                    if o.get('estimated_age') and fmt_val(o['estimated_age']) != "—":
                        st.markdown(f"**Estimated Age:** {o['estimated_age']}")
                    if o.get('city'):
                        st.markdown(f"**Location:** {o['city']}, {o.get('state_code','')}")
                    if o.get('linkedin_url') and fmt_val(o['linkedin_url']) != "—":
                        st.markdown(f"**LinkedIn:** {o['linkedin_url']}")
                with oc2:
                    if o.get('succession_signals') and fmt_val(o['succession_signals']) != "—":
                        st.markdown(f"**Succession Signals:** {o['succession_signals']}")
                    if o.get('is_private_equity'):
                        st.error("PE-affiliated")

    # ── Enrichment meta ───────────────────────────────────────────────────
    with st.expander("Enrichment metadata"):
        st.markdown(f"**Status:** {b.get('enrichment_status')}  |  **Date:** {fmt_val(b.get('enrichment_date'))}")
        if b.get('enrichment_error'):
            st.error(b['enrichment_error'])


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
if page == "📊 Dashboard":
    st.title("📊 Dashboard")

    counts = query("""
        SELECT
            COUNT(*) FILTER (WHERE license_type = 'HHA')           AS hha_count,
            COUNT(*) FILTER (WHERE license_type = 'IHCP')          AS ihcp_count,
            COUNT(*) FILTER (WHERE medicare_certified)             AS medicare_count,
            COUNT(*) FILTER (WHERE enrichment_status = 'complete') AS enriched_count,
            COUNT(*) FILTER (WHERE enrichment_status = 'pending')  AS pending_count,
            COUNT(*) FILTER (WHERE enrichment_status = 'failed')   AS failed_count
        FROM businesses
    """)
    people_count = query("SELECT COUNT(*) AS n FROM people").iloc[0]["n"]

    r = counts.iloc[0]
    total = int(r["enriched_count"]) + int(r["pending_count"]) + int(r["failed_count"])
    enriched = int(r["enriched_count"])

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("HHA Agencies",       int(r["hha_count"]))
    c2.metric("IHCP Businesses",    int(r["ihcp_count"]))
    c3.metric("Medicare Certified", int(r["medicare_count"]))
    c4.metric("AI Enriched",        enriched)
    c5.metric("Pending",            int(r["pending_count"]))
    c6.metric("People Indexed",     int(people_count))

    if total > 0:
        st.progress(enriched / total, text=f"Enrichment progress: {enriched}/{total} ({enriched*100//total}%)")

    st.divider()

    # Top acquisition targets
    st.subheader("🏆 Top Acquisition Targets")
    top = query("""
        SELECT
            business_id,
            COALESCE(le_name, lf_name) AS name,
            city,
            license_type,
            acquisition_fit_score      AS score,
            estimated_annual_profit    AS est_profit,
            estimated_annual_revenue   AS est_revenue,
            profit_margin_pct          AS margin,
            cms_star_rating            AS stars,
            medicare_certified         AS medicare,
            pe_backed,
            primary_payor_mix          AS payor_mix,
            business_summary
        FROM businesses
        WHERE enrichment_status = 'complete'
          AND acquisition_fit_score IS NOT NULL
        ORDER BY acquisition_fit_score DESC
        LIMIT 20
    """)

    if top.empty:
        st.info("No enriched businesses yet — enrichment is running in the background.")
    else:
        selected = st.dataframe(
            top.drop(columns=["business_id", "business_summary"]),
            use_container_width=True,
            height=350,
            on_select="rerun",
            selection_mode="single-row",
        )
        sel_rows = selected.selection.rows if selected and hasattr(selected, 'selection') else []
        if sel_rows:
            biz_id = int(top.iloc[sel_rows[0]]["business_id"])
            st.divider()
            show_business_detail(biz_id)

    st.divider()
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Payor Mix Breakdown")
        payor = query("""
            SELECT primary_payor_mix, COUNT(*) AS count
            FROM businesses
            WHERE primary_payor_mix IS NOT NULL
            GROUP BY primary_payor_mix ORDER BY count DESC
        """)
        if not payor.empty:
            st.dataframe(payor, use_container_width=True)

    with col2:
        st.subheader("Fit Score Distribution")
        scores = query("""
            SELECT acquisition_fit_score AS score, COUNT(*) AS count
            FROM businesses
            WHERE acquisition_fit_score IS NOT NULL
            GROUP BY acquisition_fit_score ORDER BY score DESC
        """)
        if not scores.empty:
            st.dataframe(scores, use_container_width=True)

# ---------------------------------------------------------------------------
# Businesses
# ---------------------------------------------------------------------------
elif page == "🏢 Businesses":
    st.title("🏢 Businesses")

    with st.expander("Filters", expanded=True):
        fc1, fc2, fc3, fc4, fc5 = st.columns(5)
        lic_type    = fc1.selectbox("License Type", ["All", "HHA", "IHCP"])
        medicare    = fc2.selectbox("Medicare", ["All", "Yes", "No"])
        enriched    = fc3.selectbox("Enriched", ["All", "Yes", "No", "Failed"])
        city_filter = fc4.text_input("City")
        name_filter = fc5.text_input("Name")

    where = ["1=1"]
    if lic_type != "All":
        where.append(f"license_type = '{lic_type}'")
    if medicare == "Yes":
        where.append("medicare_certified = TRUE")
    elif medicare == "No":
        where.append("medicare_certified = FALSE")
    if enriched == "Yes":
        where.append("enrichment_status = 'complete'")
    elif enriched == "No":
        where.append("enrichment_status = 'pending'")
    elif enriched == "Failed":
        where.append("enrichment_status = 'failed'")
    if city_filter:
        where.append(f"LOWER(city) LIKE LOWER('%{city_filter}%')")
    if name_filter:
        where.append(f"(LOWER(le_name) LIKE LOWER('%{name_filter}%') OR LOWER(lf_name) LIKE LOWER('%{name_filter}%'))")

    df = query(f"""
        SELECT
            business_id,
            COALESCE(le_name, lf_name)  AS name,
            city, county, license_type,
            medicare_certified          AS medicare,
            cms_star_rating             AS stars,
            acquisition_fit_score       AS score,
            estimated_annual_profit     AS est_profit,
            primary_payor_mix           AS payor_mix,
            pe_backed,
            enrichment_status           AS status
        FROM businesses
        WHERE {" AND ".join(where)}
        ORDER BY acquisition_fit_score DESC NULLS LAST, name
    """)

    st.caption(f"**{len(df)} businesses** — click a row to view full detail")

    selected = st.dataframe(
        df.drop(columns=["business_id"]),
        use_container_width=True,
        height=400,
        on_select="rerun",
        selection_mode="single-row",
    )

    sel_rows = selected.selection.rows if selected and hasattr(selected, 'selection') else []
    if sel_rows:
        biz_id = int(df.iloc[sel_rows[0]]["business_id"])
        st.divider()
        show_business_detail(biz_id)

# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------
elif page == "👤 People":
    st.title("People")

    name_search = st.text_input("Search by name")

    if name_search:
        df = query("""
            SELECT p.person_id, p.full_name, p.city, p.state_code, p.zip_code,
                   COUNT(bp.id) AS businesses_owned
            FROM people p
            LEFT JOIN business_people bp ON bp.person_id = p.person_id
            WHERE LOWER(p.full_name) LIKE LOWER(%s)
            GROUP BY p.person_id, p.full_name, p.city, p.state_code, p.zip_code
            ORDER BY businesses_owned DESC
        """, (f"%{name_search}%",))
    else:
        df = query("""
            SELECT p.person_id, p.full_name, p.city, p.state_code, p.zip_code,
                   COUNT(bp.id) AS businesses_owned
            FROM people p
            LEFT JOIN business_people bp ON bp.person_id = p.person_id
            GROUP BY p.person_id, p.full_name, p.city, p.state_code, p.zip_code
            ORDER BY businesses_owned DESC
            LIMIT 200
        """)
        st.caption("Showing top 200 by businesses owned. Use search to filter.")

    st.write(f"**{len(df)} people**")
    st.dataframe(df, use_container_width=True, height=400)

    st.divider()
    st.subheader("Person Detail")
    pid = st.number_input("Enter person_id", min_value=1, step=1)
    if st.button("Load Person"):
        p_detail = query("SELECT * FROM people WHERE person_id = %s", (int(pid),))
        if p_detail.empty:
            st.warning("Not found.")
        else:
            st.json(p_detail.iloc[0].to_dict())
            st.subheader("Businesses owned")
            biz = query("""
                SELECT b.business_id, b.le_name, b.lf_name, b.city,
                       b.license_type, b.medicare_certified, b.cms_star_rating,
                       bp.ownership_pct, bp.role_text
                FROM business_people bp
                JOIN businesses b ON b.business_id = bp.business_id
                WHERE bp.person_id = %s
                ORDER BY bp.ownership_pct DESC NULLS LAST
            """, (int(pid),))
            st.dataframe(biz, use_container_width=True)

# ---------------------------------------------------------------------------
# Ownership
# ---------------------------------------------------------------------------
elif page == "🔗 Ownership":
    st.title("Ownership Links")

    st.subheader("Multi-business owners")
    multi = query("""
        SELECT p.full_name, p.city, p.state_code,
               COUNT(DISTINCT bp.business_id) AS num_businesses,
               STRING_AGG(DISTINCT b.le_name, ', ' ORDER BY b.le_name) AS businesses
        FROM people p
        JOIN business_people bp ON bp.person_id = p.person_id
        JOIN businesses b ON b.business_id = bp.business_id
        GROUP BY p.person_id, p.full_name, p.city, p.state_code
        HAVING COUNT(DISTINCT bp.business_id) > 1
        ORDER BY num_businesses DESC
        LIMIT 100
    """)
    st.write(f"**{len(multi)} people own 2+ businesses**")
    st.dataframe(multi, use_container_width=True, height=400)

    st.divider()
    st.subheader("Private Equity linked businesses")
    pe = query("""
        SELECT DISTINCT b.le_name, b.lf_name, b.city, b.license_type,
               b.medicare_certified, b.cms_star_rating
        FROM business_people bp
        JOIN businesses b ON b.business_id = bp.business_id
        WHERE bp.is_private_equity = TRUE
        ORDER BY b.le_name
    """)
    if pe.empty:
        st.info("No PE-linked businesses found.")
    else:
        st.dataframe(pe, use_container_width=True)

# ---------------------------------------------------------------------------
# SQL Query
# ---------------------------------------------------------------------------
elif page == "💻 SQL Query":
    st.title("SQL Query")
    st.caption("Run any SQL against the database. SELECT queries show results; INSERT/UPDATE/DELETE run and report affected rows.")

    default_sql = """SELECT
    b.le_name,
    b.city,
    b.license_type,
    b.medicare_certified,
    b.cms_star_rating,
    COUNT(bp.id) AS owner_count
FROM businesses b
LEFT JOIN business_people bp ON bp.business_id = b.business_id
GROUP BY b.business_id, b.le_name, b.city, b.license_type, b.medicare_certified, b.cms_star_rating
ORDER BY owner_count DESC
LIMIT 20;"""

    sql_input = st.text_area("SQL", value=default_sql, height=200)

    if st.button("▶ Run", type="primary"):
        if sql_input.strip():
            result, error = run_sql(sql_input.strip())
            if error:
                st.error(f"Error: {error}")
            elif result.empty:
                st.success("Query executed successfully (no rows returned).")
            else:
                st.success(f"{len(result)} rows returned")
                st.dataframe(result, use_container_width=True, height=500)
                csv = result.to_csv(index=False)
                st.download_button("⬇ Download CSV", csv, "query_results.csv", "text/csv")

    st.divider()
    st.subheader("Useful queries")
    examples = {
        "All SC HHA agencies with star ratings": """SELECT le_name, lf_name, city, cms_star_rating, medicare_certified
FROM businesses
WHERE license_type = 'HHA' AND cms_star_rating IS NOT NULL
ORDER BY cms_star_rating DESC;""",
        "Businesses with the most owners": """SELECT b.le_name, b.city, COUNT(bp.id) AS owners
FROM businesses b
JOIN business_people bp ON bp.business_id = b.business_id
GROUP BY b.business_id, b.le_name, b.city
ORDER BY owners DESC LIMIT 20;""",
        "People who own HHA agencies": """SELECT p.full_name, p.city, p.state_code, b.le_name, bp.ownership_pct, bp.role_text
FROM people p
JOIN business_people bp ON bp.person_id = p.person_id
JOIN businesses b ON b.business_id = bp.business_id
WHERE b.license_type = 'HHA'
ORDER BY p.full_name;""",
        "Enriched agencies ranked by fit score": """SELECT le_name, city, acquisition_fit_score,
       estimated_annual_profit, cms_star_rating, enrichment_status
FROM businesses
WHERE enrichment_status = 'complete'
ORDER BY acquisition_fit_score DESC NULLS LAST;""",
        "Non-Medicare HHA agencies (independent targets)": """SELECT le_name, lf_name, city, county, business_type, license_expires
FROM businesses
WHERE license_type = 'HHA' AND medicare_certified = FALSE
ORDER BY city;""",
    }
    for label, sql in examples.items():
        with st.expander(label):
            st.code(sql, language="sql")
            if st.button(f"Run: {label}", key=label):
                result, error = run_sql(sql)
                if error:
                    st.error(error)
                else:
                    st.dataframe(result, use_container_width=True)
