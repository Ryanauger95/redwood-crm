#!/usr/bin/env python3
"""
Create custom foreclosure fields in Freshsales.

Dry-run by default — shows exactly what will be created.
Pass --run to actually create the fields.

Usage:
  python create_foreclosure_fields.py          # preview
  python create_foreclosure_fields.py --run    # create for real
"""
import json
import sys
import urllib.request
import urllib.error

BASE_URL = "https://oneguardselfstorage.myfreshworks.com/crm/sales/api"
API_KEY = "mLvXuQ0-N9MaELyNrJFYiA"

DRY_RUN = "--run" not in sys.argv


# ---------------------------------------------------------------------------
# Fields to create
# ---------------------------------------------------------------------------

# Mortgage Info field group ID (from GET /settings/sales_accounts/fields?include=field_group)
MORTGAGE_INFO_GROUP_ID = "e7c8186a-c310-4dc6-89f1-3e4fcf2a68f9"

ACCOUNT_FIELDS = [
    # --- Foreclosure & Legal section (all placed in Mortgage Info group) ---
    {
        "label": "In Foreclosure",
        "type": "checkbox",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
        "_note": "Top-level flag — is this property currently in active foreclosure?",
    },
    {
        "label": "Foreclosure Case Number",
        "type": "text",
        "_note": "SC court case number, e.g. 2024CP1000298",
    },
    {
        "label": "Foreclosure Filed Date",
        "type": "date",
        "_note": "Date the foreclosure complaint was filed",
    },
    {
        "label": "Foreclosure Status",
        "type": "dropdown",
        "choices": [
            {"value": "Active"},
            {"value": "Dismissed"},
            {"value": "Judgment Entered"},
            {"value": "Completed - Sale"},
            {"value": "Completed - Other"},
        ],
        "_note": "Current status of the foreclosure case",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Foreclosure Plaintiff",
        "type": "text",
        "_note": "Lender / bank that filed (from parties where type = Plaintiff)",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Foreclosure Judgment Amount",
        "type": "number",
        "_note": "Dollar amount of judgment if one has been entered",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Foreclosure Sale Date",
        "type": "date",
        "_note": "Scheduled foreclosure auction/sale date if applicable",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Court Case URL",
        "type": "textarea",
        "_note": "Direct link to the case on the SC courts public index",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Tax Map / Parcel Number",
        "type": "text",
        "_note": "Parcel ID from court tax map tab — useful for deduplication",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Foreclosure Data Last Updated",
        "type": "date",
        "_note": "Timestamp of the last time the scraper refreshed this record",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Owner Mailing Address",
        "type": "textarea",
        "_note": "Owner address from court defendant record (may differ from facility address)",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
    {
        "label": "Owner Entity Type",
        "type": "dropdown",
        "choices": [
            {"value": "Individual"},
            {"value": "LLC"},
            {"value": "Corporation"},
            {"value": "Trust"},
            {"value": "Unknown"},
        ],
        "_note": "Legal entity type of the property owner",
        "field_group_id": MORTGAGE_INFO_GROUP_ID,
    },
]

CONTACT_FIELDS = [
    {
        "label": "In Active Foreclosure",
        "type": "checkbox",
        "_note": "Flag for owner contacts who are defendants in an active foreclosure",
    },
    {
        "label": "Associated Case Number",
        "type": "text",
        "_note": "Court case number linking this contact to a foreclosure filing",
    },
]


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def api_post(path: str, payload: dict) -> dict:
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Token token={API_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code}: {body}")


SCHEMA_FILE = "freshsales_schemas.json"
ENTITY_KEY_MAP = {
    "sales_accounts": "account_fields",
    "contacts": "contact_fields",
}

def get_existing_labels(entity: str) -> set:
    """Return set of existing field labels for the entity (to skip duplicates).
    Uses locally saved schema to avoid extra API calls during dry-run.
    Falls back to live API call if the schema file is missing.
    """
    import os
    if os.path.exists(SCHEMA_FILE):
        with open(SCHEMA_FILE) as f:
            d = json.load(f)
        schema_key = ENTITY_KEY_MAP.get(entity, "")
        return {field["label"] for field in d.get(schema_key, [])}

    # Fallback: fetch live
    url = f"{BASE_URL}/settings/{entity}/fields"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Token token={API_KEY}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        d = json.loads(resp.read())
    return {f["label"] for f in d.get("fields", [])}


def build_payload(field_def: dict) -> dict:
    """Strip internal _note key and wrap in 'field'."""
    payload = {k: v for k, v in field_def.items() if not k.startswith("_")}
    return {"field": payload}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def process_entity(entity_key: str, display_name: str, fields: list):
    print(f"\n{'='*60}")
    print(f"  {display_name}")
    print(f"  Endpoint: POST /settings/{entity_key}/fields")
    print(f"{'='*60}")

    existing = get_existing_labels(entity_key)

    created = 0
    skipped = 0

    for field_def in fields:
        label = field_def["label"]
        ftype = field_def["type"]
        note = field_def.get("_note", "")
        choices = field_def.get("choices", [])

        if label in existing:
            print(f"  [skip]    {label!r} — already exists")
            skipped += 1
            continue

        choices_str = ""
        if choices:
            choices_str = " [" + ", ".join(c["value"] for c in choices) + "]"

        if DRY_RUN:
            print(f"  [dry-run] {ftype:10}  {label}{choices_str}")
            if note:
                print(f"             → {note}")
        else:
            payload = build_payload(field_def)
            try:
                result = api_post(f"/settings/{entity_key}/fields", payload)
                new_field = result.get("field", {})
                print(f"  [created] {ftype:10}  {label}  (id={new_field.get('id')})")
                created += 1
            except Exception as e:
                print(f"  [error]   {label!r}: {e}")

    if DRY_RUN:
        print(f"\n  Would create: {len(fields) - skipped} fields  |  Already exist: {skipped}")
    else:
        print(f"\n  Created: {created}  |  Skipped (already exist): {skipped}")


def main():
    if DRY_RUN:
        print("DRY RUN — no changes will be made. Pass --run to create fields.")
    else:
        print("LIVE RUN — creating fields in Freshsales now.")

    process_entity("sales_accounts", "ACCOUNT (Facility) Fields", ACCOUNT_FIELDS)
    process_entity("contacts",       "CONTACT Fields",            CONTACT_FIELDS)

    if DRY_RUN:
        print("\nRe-run with --run to create these fields.")


if __name__ == "__main__":
    main()
