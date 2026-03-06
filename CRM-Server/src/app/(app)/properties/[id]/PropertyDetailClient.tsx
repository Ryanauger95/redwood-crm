"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Globe, MapPin, ExternalLink,
  Check, User, FileText, DollarSign, Building2, Link2,
  Trash2, Pencil, X, Settings2, GripVertical, ListOrdered,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PROPERTY_DEAL_STAGE_OPTIONS,
  PROPERTY_ASSET_CLASS_OPTIONS,
  PROPERTY_DEAL_TYPE_OPTIONS,
  PROPERTY_RELATIONSHIP_STATUS_OPTIONS,
  PROPERTY_MOTIVATION_LEVEL_OPTIONS,
  PROPERTY_SALE_TIMELINE_OPTIONS,
  PROPERTY_OWNERSHIP_TYPE_OPTIONS,
  PROPERTY_LETTER_STATUS_OPTIONS,
  PROPERTY_COMMUNICATION_STATUS_OPTIONS,
  PROPERTY_LEASE_DATA_TYPE_OPTIONS,
} from "@/lib/fieldOptions";
import { useToast } from "@/components/shared/Toast";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Person {
  person_id: number; full_name: string | null; first_name: string | null;
  last_name: string | null; email: string | null; phone: string | null;
  city: string | null; state_code: string | null; contact_type: string | null;
  job_title: string | null; company_name: string | null;
}
interface PersonLink {
  id: number; person_id: number; property_id: string; is_primary: boolean; person: Person;
}
interface Note {
  id: string; property_id: string; description: string | null;
  created_at: string | null; updated_at: string | null;
  user_id: number | null; user: { name: string } | null;
}
interface Property {
  id: string; name: string | null; num_employees: number | null;
  annual_revenue: string | null; website: string | null; phone: string | null;
  address: string | null; city: string | null; state: string | null;
  zipcode: string | null; country: string | null; industry_type: string | null;
  business_type: string | null; territory: string | null; parent_id: string | null;
  parent_name: string | null; sales_owner: string | null; created_at: string | null;
  updated_at: string | null; last_contacted: string | null; last_activity_date: string | null;
  relationship_status: string | null; deal_stage: string | null; asset_class: string | null;
  deal_type: string | null; property_size_estimate: string | null; county: string | null;
  account_id: string | null; llc_url: string | null; google_url: string | null;
  skiptrace_url: string | null; gis_url: string | null; letter_status: string | null;
  last_contact_date: string | null; next_contact_date: string | null;
  communication_status: string | null; motivation_level: string | null;
  county_activity: string | null; reonomy_id: string | null; ownership_type: string | null;
  sale_timeline: string | null; direct_mail_address: string | null; owner_name: string | null;
  mail_bounced_back: string | null; data_status: string | null; offer_made: string | null;
  owner_phone: string | null; last_sale_year: number | null; last_sale_date: string | null;
  last_sale_amount: string | null; last_sale_price_per_sqft: string | null;
  last_sale_buyer: string | null; tax_assessed_value: string | null;
  mortgagee_name: string | null; mortgage_amount: string | null;
  mortgage_start_date: string | null; mortgage_expiration_date: string | null;
  listing_url: string | null; asking_price: string | null; asking_price_per_sqft: string | null;
  broker_names: string | null; broker_phone: string | null; broker_company: string | null;
  lease_rate: string | null; lease_notes: string | null; lease_terms: string | null;
  lease_start_date: string | null; space_size: string | null; length_of_lease: string | null;
  lease_expiration: string | null; lease_data_type: string | null; leasing_broker: string | null;
  links_to_original_data: string | null; amenities: string | null; tags: string | null;
  in_foreclosure: boolean | null; foreclosure_case_number: string | null;
  foreclosure_filed_date: string | null; foreclosure_status: string | null;
  foreclosure_plaintiff: string | null; foreclosure_judgment_amount: string | null;
  foreclosure_sale_date: string | null; court_case_url: string | null;
  tax_map_parcel_number: string | null; foreclosure_data_last_updated: string | null;
  owner_mailing_address: string | null; owner_entity_type: string | null;
  notes: Note[]; personLinks: PersonLink[];
}
interface FieldDef {
  key: string; label: string; type?: string;
  isUrl?: boolean; isAddress?: boolean; isPhone?: boolean; multiline?: boolean;
  isBoolean?: boolean; isSelect?: boolean; options?: string[];
}

// ─── Section & Field Definitions ──────────────────────────────────────────────

export const SECTION_META: { key: string; title: string; icon?: React.ReactNode }[] = [
  { key: "basic_information",   title: "Basic Information",   icon: <Building2 size={14} className="text-blue-500" /> },
  { key: "sale_information",    title: "Sale Information",    icon: <DollarSign size={14} className="text-green-600" /> },
  { key: "mortgage_information",title: "Mortgage Information",icon: <DollarSign size={14} className="text-blue-600" /> },
  { key: "foreclosure",         title: "Foreclosure",         icon: <DollarSign size={14} className="text-red-500" /> },
  { key: "lease_information",   title: "Lease Information" },
  { key: "research_links",      title: "Research Links",      icon: <Link2 size={14} className="text-gray-500" /> },
  { key: "crm_status",          title: "CRM Status" },
  { key: "owner_contact",       title: "Owner & Contact",     icon: <User size={13} /> },
  { key: "broker",              title: "Broker" },
];

const SECTION_FIELDS: Record<string, FieldDef[]> = {
  basic_information: [
    { key: "address", label: "Address", isAddress: true },
    { key: "city", label: "City" },
    { key: "state", label: "State", isSelect: true, options: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"] },
    { key: "zipcode", label: "ZIP Code" },
    { key: "county", label: "County" },
    { key: "territory", label: "Territory" },
    { key: "property_size_estimate", label: "Size Estimate" },
    { key: "industry_type", label: "Industry Type" },
    { key: "business_type", label: "Business Type" },
    { key: "asset_class", label: "Asset Class", isSelect: true, options: [...PROPERTY_ASSET_CLASS_OPTIONS] },
    { key: "deal_type", label: "Deal Type", isSelect: true, options: [...PROPERTY_DEAL_TYPE_OPTIONS] },
    { key: "num_employees", label: "Employees", type: "number" },
    { key: "annual_revenue", label: "Annual Revenue", type: "number" },
    { key: "website", label: "Website", isUrl: true },
    { key: "phone", label: "Phone", isPhone: true },
    { key: "sales_owner", label: "Sales Owner", isSelect: true, options: [] }, // populated dynamically from crmUsers
    { key: "reonomy_id", label: "Reonomy ID" },
    { key: "tax_map_parcel_number", label: "Parcel Number" },
  ],
  sale_information: [
    { key: "last_sale_year", label: "Sale Year", type: "number" },
    { key: "last_sale_date", label: "Sale Date", type: "date" },
    { key: "last_sale_amount", label: "Sale Amount", type: "number" },
    { key: "last_sale_price_per_sqft", label: "Price / Sqft", type: "number" },
    { key: "last_sale_buyer", label: "Buyer" },
    { key: "tax_assessed_value", label: "Tax Assessed", type: "number" },
    { key: "asking_price", label: "Asking Price", type: "number" },
    { key: "asking_price_per_sqft", label: "Asking / Sqft", type: "number" },
    { key: "listing_url", label: "Listing URL", isUrl: true },
  ],
  mortgage_information: [
    { key: "mortgagee_name", label: "Mortgagee" },
    { key: "mortgage_amount", label: "Mortgage Amount", type: "number" },
    { key: "mortgage_start_date", label: "Start Date", type: "date" },
    { key: "mortgage_expiration_date", label: "Expiration Date", type: "date" },
  ],
  foreclosure: [
    { key: "in_foreclosure", label: "In Foreclosure", isBoolean: true },
    { key: "foreclosure_status", label: "Status" },
    { key: "foreclosure_case_number", label: "Case Number" },
    { key: "foreclosure_filed_date", label: "Filed Date", type: "date" },
    { key: "foreclosure_plaintiff", label: "Plaintiff" },
    { key: "foreclosure_judgment_amount", label: "Judgment Amount", type: "number" },
    { key: "foreclosure_sale_date", label: "Sale Date", type: "date" },
    { key: "court_case_url", label: "Court Case URL", isUrl: true },
    { key: "foreclosure_data_last_updated", label: "Last Updated", type: "date" },
  ],
  lease_information: [
    { key: "lease_rate", label: "Lease Rate" },
    { key: "lease_terms", label: "Lease Terms" },
    { key: "space_size", label: "Space Size" },
    { key: "length_of_lease", label: "Length of Lease" },
    { key: "lease_start_date", label: "Start Date", type: "date" },
    { key: "lease_expiration", label: "Expiration", type: "date" },
    { key: "lease_data_type", label: "Data Type", isSelect: true, options: [...PROPERTY_LEASE_DATA_TYPE_OPTIONS] },
    { key: "leasing_broker", label: "Leasing Broker" },
    { key: "lease_notes", label: "Lease Notes", multiline: true },
  ],
  research_links: [
    { key: "llc_url", label: "LLC URL", isUrl: true },
    { key: "google_url", label: "Google", isUrl: true },
    { key: "skiptrace_url", label: "Skiptrace", isUrl: true },
    { key: "gis_url", label: "GIS", isUrl: true },
    { key: "links_to_original_data", label: "Original Data", isUrl: true },
  ],
  crm_status: [
    { key: "relationship_status", label: "Relationship", isSelect: true, options: [...PROPERTY_RELATIONSHIP_STATUS_OPTIONS] },
    { key: "communication_status", label: "Communication", isSelect: true, options: [...PROPERTY_COMMUNICATION_STATUS_OPTIONS] },
    { key: "motivation_level", label: "Motivation", isSelect: true, options: [...PROPERTY_MOTIVATION_LEVEL_OPTIONS] },
    { key: "sale_timeline", label: "Sale Timeline", isSelect: true, options: [...PROPERTY_SALE_TIMELINE_OPTIONS] },
    { key: "offer_made", label: "Offer Made" },
    { key: "letter_status", label: "Letter Status", isSelect: true, options: [...PROPERTY_LETTER_STATUS_OPTIONS] },
    { key: "data_status", label: "Data Status" },
    { key: "last_contact_date", label: "Last Contact", type: "date" },
    { key: "next_contact_date", label: "Next Contact", type: "date" },
    { key: "county_activity", label: "County Activity" },
  ],
  owner_contact: [
    { key: "owner_name", label: "Owner Name" },
    { key: "owner_phone", label: "Owner Phone", isPhone: true },
    { key: "ownership_type", label: "Ownership Type", isSelect: true, options: [...PROPERTY_OWNERSHIP_TYPE_OPTIONS] },
    { key: "owner_entity_type", label: "Entity Type", isSelect: true, options: [...PROPERTY_OWNERSHIP_TYPE_OPTIONS] },
    { key: "owner_mailing_address", label: "Mailing Address", isAddress: true },
    { key: "direct_mail_address", label: "Direct Mail", isAddress: true },
    { key: "mail_bounced_back", label: "Mail Bounced" },
  ],
  broker: [
    { key: "broker_names", label: "Broker Name" },
    { key: "broker_phone", label: "Broker Phone", isPhone: true },
    { key: "broker_company", label: "Broker Company" },
  ],
};

const SECTION_SUBHEADINGS: Record<string, { afterKey: string; label: string }[]> = {
  sale_information: [
    { afterKey: "last_sale_year", label: "Last Sale" },
    { afterKey: "tax_assessed_value", label: "Current Valuation" },
  ],
};

const DEFAULT_SECTION_ORDER = SECTION_META.map((s) => s.key);

// ─── GhostSelect ─────────────────────────────────────────────────────────────

function GhostSelect({
  value, options, onSave, placeholder = "—",
}: {
  value: string; options: string[]; onSave: (v: string) => void; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value)}
      className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-sm text-gray-900 transition-colors cursor-pointer appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── GhostInput ───────────────────────────────────────────────────────────────

function GhostInput({
  value, placeholder, onSave, type = "text", multiline = false,
}: {
  value: string; placeholder: string; onSave: (v: string) => void;
  type?: string; multiline?: boolean;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  const base = "w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-sm text-gray-900 placeholder-gray-300 transition-colors";
  if (multiline) {
    return (
      <textarea value={local} onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onSave(local); }}
        placeholder={placeholder} rows={3} autoComplete="nope" className={`${base} resize-none`} />
    );
  }
  return (
    <input type={type} value={local} onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setLocal(value);
      }}
      placeholder={placeholder} autoComplete="nope" className={base} />
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function Field({ def, value, allFields, onSave, onSaveBoolean, selectOptions }: {
  def: FieldDef; value: string;
  allFields: Record<string, string>;
  onSave: (field: string, v: string) => void;
  onSaveBoolean: (field: string, v: boolean | null) => void;
  selectOptions?: Record<string, string[]>;
}) {
  let labelHref: string | null = null;
  if (def.isUrl && value) labelHref = value;
  if (def.isPhone && value) labelHref = `tel:${value}`;
  if (def.isAddress && value) {
    const parts = [value];
    if (def.key === "address") {
      if (allFields.city) parts.push(allFields.city);
      if (allFields.state) parts.push(allFields.state);
      if (allFields.zipcode) parts.push(allFields.zipcode);
    }
    labelHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
  }

  const labelEl = labelHref ? (
    <a href={labelHref} target={def.isPhone ? undefined : "_blank"} rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-700 text-xs w-36 flex-shrink-0 pt-1 leading-tight hover:underline">
      {def.label}
    </a>
  ) : (
    <span className="text-gray-400 text-xs w-36 flex-shrink-0 pt-1 leading-tight">{def.label}</span>
  );

  if (def.isBoolean) {
    const checked = value === "true";
    return (
      <div className="flex items-center gap-2 py-0.5">
        <span className="text-gray-400 text-xs w-36 flex-shrink-0 leading-tight">{def.label}</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onSaveBoolean(def.key, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">{checked ? "Yes" : "No"}</span>
        </label>
      </div>
    );
  }

  if (def.isSelect) {
    const opts = selectOptions?.[def.key] ?? def.options ?? [];
    return (
      <div className="flex items-center gap-2 py-0.5">
        {labelEl}
        <div className="flex-1 min-w-0">
          <GhostSelect value={value} options={opts} onSave={(v) => onSave(def.key, v)} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${def.multiline ? "items-start" : "items-center"} gap-2 py-0.5`}>
      {labelEl}
      <div className="flex-1 min-w-0">
        <GhostInput value={value} placeholder="—" onSave={(v) => onSave(def.key, v)}
          type={def.type} multiline={def.multiline} />
      </div>
    </div>
  );
}

// ─── Field Picker Popover ─────────────────────────────────────────────────────

function FieldPicker({ sectionKey, allFields, hiddenFields, onChange }: {
  sectionKey: string; allFields: FieldDef[];
  hiddenFields: string[]; onChange: (sectionKey: string, hidden: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    // Stop propagation so the document mousedown handler doesn't fire
    e.stopPropagation();
    const next = hiddenFields.includes(key)
      ? hiddenFields.filter((k) => k !== key)
      : [...hiddenFields, key];
    onChange(sectionKey, next);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className="p-1 text-gray-300 hover:text-gray-500 rounded transition-colors" title="Show / hide fields">
        <Settings2 size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52"
          onMouseDown={(e) => e.stopPropagation()}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Show / Hide Fields</p>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {allFields.map((f) => {
              const visible = !hiddenFields.includes(f.key);
              return (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <input type="checkbox" checked={visible}
                    onChange={(e) => toggle(e, f.key)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className={`text-sm ${visible ? "text-gray-700" : "text-gray-400"}`}>{f.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
// Defined OUTSIDE PropertyDetailClient so React doesn't remount it on re-renders

function SectionCard({ sectionKey, title, icon, hiddenFields, onUpdateHidden, allFields, onSaveField, onSaveBoolean, selectOptions }: {
  sectionKey: string; title: string; icon?: React.ReactNode;
  hiddenFields: string[]; onUpdateHidden: (sectionKey: string, hidden: string[]) => void;
  allFields: Record<string, string>; onSaveField: (field: string, v: string) => void;
  onSaveBoolean: (field: string, v: boolean | null) => void;
  selectOptions?: Record<string, string[]>;
}) {
  const defs = SECTION_FIELDS[sectionKey] ?? [];
  const subheadings = SECTION_SUBHEADINGS[sectionKey] ?? [];
  const visible = defs.filter((f) => !hiddenFields.includes(f.key));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
          <FieldPicker sectionKey={sectionKey} allFields={defs}
            hiddenFields={hiddenFields} onChange={onUpdateHidden} />
        </div>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {visible.map((def) => {
          const sub = subheadings.find((s) => s.afterKey === def.key);
          return (
            <div key={def.key}>
              {sub && (
                <div className="pt-2 pb-1 mt-1 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{sub.label}</p>
                </div>
              )}
              <Field def={def} value={allFields[def.key] ?? ""} allFields={allFields}
                onSave={onSaveField} onSaveBoolean={onSaveBoolean} selectOptions={selectOptions} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Section Order Popover ────────────────────────────────────────────────────

function SectionOrderPicker({ order, onChange }: {
  order: string[]; onChange: (order: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const ordered = order
    .map((k) => SECTION_META.find((s) => s.key === k))
    .filter(Boolean) as typeof SECTION_META;

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setOverIndex(i);
  };

  const handleDrop = (e: React.DragEvent, dropI: number) => {
    e.preventDefault();
    const fromI = dragIndex.current;
    if (fromI === null || fromI === dropI) { setOverIndex(null); return; }
    const next = [...order];
    const [removed] = next.splice(fromI, 1);
    next.splice(dropI, 0, removed);
    onChange(next);
    dragIndex.current = null;
    setOverIndex(null);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
      >
        <ListOrdered size={13} /> Section Order
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Drag to Reorder</p>
          <div className="space-y-1">
            {ordered.map((s, i) => (
              <div
                key={s.key}
                draggable
                onDragStart={() => { dragIndex.current = i; }}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={() => { dragIndex.current = null; setOverIndex(null); }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing select-none transition-colors ${
                  overIndex === i && dragIndex.current !== i
                    ? "bg-blue-50 border border-blue-300"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <GripVertical size={13} className="text-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-700">{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FIELD_VIS_KEY = "field_visibility_properties";
const SECTION_ORDER_KEY = "section_order_properties";

const TABS = ["Overview", "Contacts"] as const;
type Tab = typeof TABS[number];

export function PropertyDetailClient({ property }: { property: Property }) {
  const router = useRouter();
  const { showToast, toastElement } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [notes, setNotes] = useState<Note[]>(property.notes);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const newNoteRef = useRef<HTMLTextAreaElement>(null);

  const [hiddenFields, setHiddenFields] = useState<Record<string, string[]>>({});
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [crmUsers, setCrmUsers] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((users: { name: string }[]) => {
      setCrmUsers(users.map((u) => u.name).filter(Boolean));
    }).catch(() => {});
  }, []);

  // Load preferences
  useEffect(() => {
    Promise.all([
      fetch(`/api/user/preferences?key=${FIELD_VIS_KEY}`).then((r) => r.json()),
      fetch(`/api/user/preferences?key=${SECTION_ORDER_KEY}`).then((r) => r.json()),
    ]).then(([vis, order]) => {
      if (vis && typeof vis === "object" && !Array.isArray(vis)) setHiddenFields(vis);
      if (Array.isArray(order) && order.length > 0) setSectionOrder(order);
    }).catch(() => {});
  }, []);

  const updateHiddenFields = useCallback(async (sectionKey: string, hidden: string[]) => {
    setHiddenFields((prev) => {
      const next = { ...prev, [sectionKey]: hidden };
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: FIELD_VIS_KEY, value: next }),
      });
      return next;
    });
  }, []);

  const updateSectionOrder = useCallback(async (order: string[]) => {
    setSectionOrder(order);
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: SECTION_ORDER_KEY, value: order }),
    });
  }, []);

  const [fields, setFields] = useState({
    deal_stage: property.deal_stage || "Not Contacted",
    relationship_status: property.relationship_status || "",
    communication_status: property.communication_status || "",
    motivation_level: property.motivation_level || "",
    sale_timeline: property.sale_timeline || "",
    offer_made: property.offer_made || "",
    data_status: property.data_status || "",
    letter_status: property.letter_status || "",
    last_contact_date: property.last_contact_date || "",
    next_contact_date: property.next_contact_date || "",
    county_activity: property.county_activity || "",
    owner_name: property.owner_name || "",
    owner_phone: property.owner_phone || "",
    ownership_type: property.ownership_type || "",
    direct_mail_address: property.direct_mail_address || "",
    mail_bounced_back: property.mail_bounced_back || "",
    broker_names: property.broker_names || "",
    broker_phone: property.broker_phone || "",
    broker_company: property.broker_company || "",
    address: property.address || "",
    city: property.city || "",
    state: property.state || "",
    zipcode: property.zipcode || "",
    county: property.county || "",
    territory: property.territory || "",
    property_size_estimate: property.property_size_estimate || "",
    industry_type: property.industry_type || "",
    business_type: property.business_type || "",
    sales_owner: property.sales_owner || "",
    website: property.website || "",
    phone: property.phone || "",
    num_employees: property.num_employees != null ? String(property.num_employees) : "",
    annual_revenue: property.annual_revenue || "",
    reonomy_id: property.reonomy_id || "",
    last_sale_year: property.last_sale_year != null ? String(property.last_sale_year) : "",
    last_sale_date: property.last_sale_date || "",
    last_sale_amount: property.last_sale_amount || "",
    last_sale_price_per_sqft: property.last_sale_price_per_sqft || "",
    last_sale_buyer: property.last_sale_buyer || "",
    tax_assessed_value: property.tax_assessed_value || "",
    asking_price: property.asking_price || "",
    asking_price_per_sqft: property.asking_price_per_sqft || "",
    listing_url: property.listing_url || "",
    mortgagee_name: property.mortgagee_name || "",
    mortgage_amount: property.mortgage_amount || "",
    mortgage_start_date: property.mortgage_start_date || "",
    mortgage_expiration_date: property.mortgage_expiration_date || "",
    lease_rate: property.lease_rate || "",
    lease_terms: property.lease_terms || "",
    space_size: property.space_size || "",
    length_of_lease: property.length_of_lease || "",
    lease_start_date: property.lease_start_date || "",
    lease_expiration: property.lease_expiration || "",
    lease_data_type: property.lease_data_type || "",
    leasing_broker: property.leasing_broker || "",
    lease_notes: property.lease_notes || "",
    llc_url: property.llc_url || "",
    google_url: property.google_url || "",
    skiptrace_url: property.skiptrace_url || "",
    gis_url: property.gis_url || "",
    links_to_original_data: property.links_to_original_data || "",
    // Foreclosure
    in_foreclosure: property.in_foreclosure != null ? String(property.in_foreclosure) : "false",
    foreclosure_case_number: property.foreclosure_case_number || "",
    foreclosure_filed_date: property.foreclosure_filed_date || "",
    foreclosure_status: property.foreclosure_status || "",
    foreclosure_plaintiff: property.foreclosure_plaintiff || "",
    foreclosure_judgment_amount: property.foreclosure_judgment_amount || "",
    foreclosure_sale_date: property.foreclosure_sale_date || "",
    court_case_url: property.court_case_url || "",
    tax_map_parcel_number: property.tax_map_parcel_number || "",
    foreclosure_data_last_updated: property.foreclosure_data_last_updated || "",
    owner_mailing_address: property.owner_mailing_address || "",
    owner_entity_type: property.owner_entity_type || "",
  });

  const saveField = useCallback(async (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    const res = await fetch(`/api/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      showToast("Saved");
    }
  }, [property.id, showToast]);

  const saveBoolean = useCallback(async (field: string, value: boolean | null) => {
    setFields((prev) => ({ ...prev, [field]: value == null ? "" : String(value) }));
    const res = await fetch(`/api/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      showToast("Saved");
    }
  }, [property.id, showToast]);

  const addNote = async () => {
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/properties/${property.id}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newNoteText }),
      });
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewNoteText("");
    } finally { setAddingNote(false); }
  };

  const saveNoteEdit = async (noteId: string) => {
    if (!editingNoteText.trim()) return;
    const res = await fetch(`/api/properties/${property.id}/notes/${noteId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editingNoteText }),
    });
    const updated = await res.json();
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, ...updated } : n));
    setEditingNoteId(null);
  };

  const deleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      await fetch(`/api/properties/${property.id}/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } finally { setDeletingNoteId(null); }
  };

  const name = property.name || "Unnamed Property";
  const location = [property.city, property.state, property.zipcode].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([property.address, location].filter(Boolean).join(", "))}`;

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {toastElement}

      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight mb-1.5">{name}</h2>
            {property.asset_class && (
              <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {property.asset_class}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Deal Stage</p>
            <select value={fields.deal_stage} onChange={(e) => saveField("deal_stage", e.target.value)}
              className="w-full border border-gray-200 hover:border-gray-300 focus:border-blue-400 focus:outline-none rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white transition-colors cursor-pointer">
              {PROPERTY_DEAL_STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(property.address || location) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Location</p>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 flex items-start gap-1.5 hover:underline">
                <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                <span>
                  {property.address && <span className="block">{property.address}</span>}
                  {location}
                  {property.county && <span className="block text-blue-400">{property.county} County</span>}
                </span>
              </a>
            </div>
          )}

          {/* Owner & Contact */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owner &amp; Contact</p>
            <div className="space-y-3">
              <div>
                <GhostInput
                  value={fields.owner_name}
                  placeholder="Owner name"
                  onSave={(v) => saveField("owner_name", v)}
                />
                <p className="text-[10px] text-gray-400 px-1.5 mt-0.5">Owner Name</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <GhostInput
                    value={fields.owner_phone}
                    placeholder="Phone number"
                    onSave={(v) => saveField("owner_phone", v)}
                  />
                  {fields.owner_phone && (
                    <a href={`tel:${fields.owner_phone}`} className="text-blue-500 flex-shrink-0">
                      <Phone size={12} />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 px-1.5 mt-0.5">Owner Phone</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0 sticky top-0 z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {property.asset_class && (
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {property.asset_class}
                  </span>
                )}
                {location && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1 hover:underline">
                    <MapPin size={12} /> {location}
                  </a>
                )}
                {property.deal_type && <span className="text-xs text-gray-500">{property.deal_type}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {fields.phone && (
                <a href={`tel:${fields.phone}`}>
                  <Button variant="outline" size="sm"><Phone size={14} /> Call</Button>
                </a>
              )}
              {fields.website && (
                <a href={fields.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><Globe size={14} /> Website</Button>
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-0">
            {TABS.map((tab) => {
              const count = tab === "Contacts" ? property.personLinks.length : null;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}>
                  {tab}
                  {count !== null && count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {activeTab === "Overview" && (
            <>
              {/* Section order toolbar */}
              <div className="flex justify-end">
                <SectionOrderPicker order={sectionOrder} onChange={updateSectionOrder} />
              </div>

              {sectionOrder.map((key) => {
                const meta = SECTION_META.find((s) => s.key === key);
                if (!meta) return null;
                return (
                  <SectionCard
                    key={key}
                    sectionKey={key}
                    title={meta.title}
                    icon={meta.icon}
                    hiddenFields={hiddenFields[key] ?? []}
                    onUpdateHidden={updateHiddenFields}
                    allFields={fields}
                    onSaveField={saveField}
                    onSaveBoolean={saveBoolean}
                    selectOptions={{ sales_owner: crmUsers }}
                  />
                );
              })}
            </>
          )}

          {activeTab === "Contacts" && (
            <div className="max-w-2xl space-y-3">
              {property.personLinks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <User size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No contacts linked to this property</p>
                </div>
              ) : (
                property.personLinks.map((pl) => (
                  <Card key={pl.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/contacts/${pl.person.person_id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1">
                            {pl.person.full_name || `${pl.person.first_name || ""} ${pl.person.last_name || ""}`.trim() || "Unknown"}
                            <ExternalLink size={11} className="opacity-40" />
                          </Link>
                          {pl.is_primary && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Primary</span>
                          )}
                        </div>
                        {pl.person.job_title && (
                          <p className="text-xs text-gray-500">{pl.person.job_title}{pl.person.company_name ? ` · ${pl.person.company_name}` : ""}</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          {pl.person.phone && (
                            <a href={`tel:${pl.person.phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Phone size={11} /> {pl.person.phone}
                            </a>
                          )}
                          {pl.person.email && (
                            <a href={`mailto:${pl.person.email}`} className="text-xs text-blue-600 hover:underline">{pl.person.email}</a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes Panel */}
      <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h3>
          <span className="text-xs text-gray-400">{notes.length}</span>
        </div>
        <div className="px-3 py-3 border-b border-gray-100">
          <textarea ref={newNoteRef} value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
            placeholder="Add a note... (⌘+Enter)" rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="flex justify-end mt-1.5">
            <Button size="sm" onClick={addNote} disabled={addingNote || !newNoteText.trim()}>
              {addingNote ? "Saving..." : "Add"}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={20} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">No notes yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notes.map((note) => (
                <div key={note.id} className="px-4 py-3">
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <textarea value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)}
                        rows={4} autoFocus
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingNoteId(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                          <X size={14} />
                        </button>
                        <button onClick={() => saveNoteEdit(note.id)} className="p-1 text-green-600 hover:text-green-700 rounded">
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {note.description || <span className="text-gray-400 italic">Empty note</span>}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-gray-400">
                          {note.created_at ? new Date(note.created_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "numeric", minute: "2-digit",
                          }) : "Unknown date"}
                          {note.user?.name ? ` · ${note.user.name}` : ""}
                        </p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.description || ""); }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteNote(note.id)} disabled={deletingNoteId === note.id}
                            className="p-1 text-gray-400 hover:text-red-500 rounded disabled:opacity-40">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
