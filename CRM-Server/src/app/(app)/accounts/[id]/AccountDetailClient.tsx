"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Star, User,
  AlertTriangle, TrendingUp, CheckCircle, ExternalLink,
  Building2, Copy, Check, Plus, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { ActivityForm } from "@/components/shared/ActivityForm";
import { BusinessCommunicationsPanel } from "@/components/shared/BusinessCommunicationsPanel";
import { ActivityNotePanel } from "@/components/shared/ActivityNotePanel";
import { useToast } from "@/components/shared/Toast";
import { formatCurrency, formatDate, PIPELINE_STAGES, US_STATES } from "@/lib/utils";
import { LICENSE_TYPE_OPTIONS, PRIMARY_PAYOR_MIX_OPTIONS } from "@/lib/fieldOptions";

interface Person {
  person_id: number;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  state_code: string | null;
  email: string | null;
  estimated_age: number | null;
  linkedin_url: string | null;
  succession_signals: string | null;
}

interface BusinessPerson {
  id: number;
  person_id: number;
  role_text: string | null;
  ownership_pct: string | null;
  is_private_equity: boolean | null;
  person: Person;
}

interface Activity {
  id: number;
  type: string;
  subject: string;
  body: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  user: { name: string; email: string } | null;
}

interface Business {
  business_id: number;
  le_name: string | null;
  lf_name: string | null;
  address: string | null;
  city: string | null;
  state_code: string | null;
  county: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_type: string | null;
  license_number: string | null;
  license_expires: string | null;
  business_type: string | null;
  medicare_certified: boolean;
  ccn: string | null;
  cms_star_rating: string | null;
  cms_ownership_type: string | null;
  cms_certification_date: string | null;
  enrichment_status: string;
  enrichment_date: string | null;
  acquisition_fit_score: number | null;
  estimated_annual_profit: string | null;
  estimated_annual_revenue: string | null;
  profit_margin_pct: string | null;
  business_summary: string | null;
  founded_year: number | null;
  estimated_employees: number | null;
  estimated_locations: number | null;
  service_area: string | null;
  primary_payor_mix: string | null;
  payor_mix_notes: string | null;
  accreditation: string | null;
  cms_deficiencies: string | null;
  acquisition_signals: string | null;
  pe_backed: boolean | null;
  recent_news: string | null;
  growth_signals: string | null;
  red_flags: string | null;
  services_nursing: boolean | null;
  services_pt: boolean | null;
  services_ot: boolean | null;
  services_speech: boolean | null;
  services_aide: boolean | null;
  services_social: boolean | null;
  stage: string;
  businessPeople: BusinessPerson[];
  activities: Activity[];
  tags: { id: number; tag: string }[];
}

const TABS = ["Overview", "Activity", "Tasks", "Communications"] as const;
type Tab = typeof TABS[number];

const TAB_DEFAULT_TYPE: Record<Tab, string> = {
  Overview: "note",
  Activity: "note",
  Tasks: "task",
  Communications: "note",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 transition-colors ml-1 flex-shrink-0">
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
}

function StarRating({ rating }: { rating: string | null }) {
  if (!rating) return null;
  const r = parseFloat(rating);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= Math.round(r) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
      ))}
      <span className="text-sm font-medium text-gray-700 ml-1">{rating}</span>
    </div>
  );
}

// Ghost input — looks like text at rest, becomes an input on hover/focus
function GhostInput({
  value,
  placeholder,
  onSave,
  type = "text",
  multiline = false,
  rows = 3,
  className = "",
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  type?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  const baseClass = `w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-sm text-gray-900 placeholder-gray-300 transition-colors ${className}`;
  if (multiline) {
    return (
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onSave(local); }}
        placeholder={placeholder}
        rows={rows}
        autoComplete="nope"
        className={`${baseClass} resize-none`}
      />
    );
  }
  return (
    <input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setLocal(value);
      }}
      placeholder={placeholder}
      autoComplete="nope"
      className={baseClass}
    />
  );
}

export function AccountDetailClient({ business: initialBusiness }: { business: Business }) {
  const router = useRouter();
  const { showToast, toastElement } = useToast();
  const [business, setBusiness] = useState(initialBusiness);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [activities, setActivities] = useState(business.activities);
  const [stage, setStage] = useState(business.stage || "Prospect");
  const [stageLoading, setStageLoading] = useState(false);
  const [tags, setTags] = useState(business.tags);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  // Live contact field values
  const [fields, setFields] = useState({
    phone: business.phone || "",
    email: business.email || "",
    website: business.website || "",
    address: business.address || "",
    city: business.city || "",
    zip_code: business.zip_code || "",
    county: business.county || "",
    state_code: business.state_code || "",
    license_type: business.license_type || "",
    pe_backed: business.pe_backed == null ? "" : business.pe_backed ? "true" : "false",
    primary_payor_mix: business.primary_payor_mix || "",
    business_summary: business.business_summary || "",
    service_area: business.service_area || "",
  });

  const saveField = useCallback(async (field: string, value: string) => {
    const body: Record<string, unknown> = field === "pe_backed"
      ? { pe_backed: value === "true" ? true : value === "false" ? false : null }
      : { [field]: value };
    setFields((prev) => ({ ...prev, [field]: value }));
    setBusiness((prev) => ({ ...prev, [field]: value || null }));
    await fetch(`/api/businesses/${business.business_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    showToast("Saved");
  }, [business.business_id, showToast]);

  const handleStageChange = async (newStage: string) => {
    setStage(newStage);
    setStageLoading(true);
    try {
      await fetch(`/api/pipeline/${business.business_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      showToast("Stage updated");
    } finally {
      setStageLoading(false);
    }
  };

  const refreshActivities = useCallback(async () => {
    const res = await fetch(`/api/businesses/${business.business_id}/activities`);
    const data = await res.json();
    setActivities(data);
  }, [business.business_id]);

  const addTag = async () => {
    if (!newTag.trim()) return;
    setAddingTag(true);
    try {
      const res = await fetch(`/api/businesses/${business.business_id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: newTag.trim() }),
      });
      const created = await res.json();
      setTags((prev) => [...prev, created]);
      setNewTag("");
    } finally {
      setAddingTag(false);
    }
  };

  const removeTag = async (tagId: number) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    await fetch(`/api/businesses/${business.business_id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
  };

  const services = [
    business.services_nursing && "Nursing",
    business.services_pt && "Physical Therapy",
    business.services_ot && "Occupational Therapy",
    business.services_speech && "Speech Therapy",
    business.services_aide && "Home Health Aide",
    business.services_social && "Social Work",
  ].filter(Boolean) as string[];

  const noteActivities = activities.filter((a) => a.type === "note");

  const addNote = async (text: string) => {
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: business.business_id, type: "note", subject: text, body: text, status: "completed" }),
    });
    await refreshActivities();
  };

  const filteredActivities =
    activeTab === "Tasks"
      ? activities.filter((a) => a.type === "task")
      : activities;

  const openTaskCount = activities.filter(
    (a) => a.type === "task" && a.status !== "completed"
  ).length;

  const name = business.le_name || business.lf_name || "Unknown Business";
  const isEnriched = business.enrichment_status === "completed";

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {toastElement}

      {/* Left Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Name + Score */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h2 className="text-[13px] font-bold text-gray-900 leading-tight">{name}</h2>
              {isEnriched && <FitScoreBadge score={business.acquisition_fit_score} size="sm" />}
            </div>
            {business.city && (
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <MapPin size={10} /> {business.city}, SC
              </p>
            )}
            {!isEnriched && (
              <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">
                Not yet enriched
              </span>
            )}
          </div>

          {/* Pipeline Stage */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pipeline Stage</p>
            <div className="relative">
              <Select
                value={stage}
                onChange={(e) => handleStageChange(e.target.value)}
                options={PIPELINE_STAGES.map((s) => ({ value: s, label: s }))}
                className="text-sm"
              />
              {stageLoading && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Key Facts */}
          {isEnriched && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Financials (Est.)</p>
              {business.estimated_annual_profit && (
                <div className="bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-600">Annual Profit</p>
                  <p className="text-base font-bold text-emerald-800">{formatCurrency(Number(business.estimated_annual_profit))}</p>
                </div>
              )}
              <div className="space-y-1.5">
                {business.estimated_annual_revenue && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Revenue</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(Number(business.estimated_annual_revenue))}</span>
                  </div>
                )}
                {business.profit_margin_pct && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Margin</span>
                    <span className="font-semibold text-gray-900">{business.profit_margin_pct}%</span>
                  </div>
                )}
                {business.estimated_employees && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Employees</span>
                    <span className="font-semibold text-gray-900">~{business.estimated_employees}</span>
                  </div>
                )}
                {business.founded_year && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Founded</span>
                    <span className="font-semibold text-gray-900">{business.founded_year}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {business.medicare_certified && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={10} /> Medicare
              </span>
            )}
            {business.license_type && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{business.license_type}</span>
            )}
            {business.pe_backed === true && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">PE Backed</span>
            )}
            {business.pe_backed === false && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Independent</span>
            )}
            {business.cms_star_rating && (
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                {business.cms_star_rating} stars
              </span>
            )}
          </div>

          {/* Contact Info — always editable */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</p>
            {(
              [
                { key: "phone" as const, label: "Phone", icon: fields.phone ? <a href={`tel:${fields.phone}`} className="text-blue-600 flex-shrink-0"><Phone size={12} /></a> : null },
                { key: "email" as const, label: "Email", icon: fields.email ? <a href={`mailto:${fields.email}`} className="text-blue-600 flex-shrink-0"><Mail size={12} /></a> : null },
                { key: "website" as const, label: "Website", icon: fields.website ? <a href={fields.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 flex-shrink-0"><Globe size={12} /></a> : null },
                { key: "address" as const, label: "Address", icon: null },
                { key: "city" as const, label: "City", icon: null },
                { key: "county" as const, label: "County", icon: null },
                { key: "zip_code" as const, label: "ZIP", icon: null },
              ] as const
            ).map(({ key, label, icon }) => (
              <div key={key}>
                <label className="text-xs text-gray-400">{label}</label>
                <div className="flex items-center gap-1">
                  <GhostInput
                    value={fields[key]}
                    placeholder={label + "..."}
                    onSave={(v) => saveField(key, v)}
                  />
                  {icon}
                  {fields[key] && key !== "address" && key !== "city" && key !== "county" && key !== "zip_code" && (
                    <CopyButton text={fields[key]} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* State */}
          <div>
            <label className="text-xs text-gray-400">State</label>
            <select
              value={fields.state_code}
              onChange={(e) => saveField("state_code", e.target.value)}
              className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-[13px] text-gray-900 transition-colors cursor-pointer"
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Business Details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Business Details</p>
            <div>
              <label className="text-xs text-gray-400">License Type</label>
              <select
                value={fields.license_type}
                onChange={(e) => saveField("license_type", e.target.value)}
                className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-[13px] text-gray-900 transition-colors cursor-pointer"
              >
                <option value="">—</option>
                {LICENSE_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">PE Backed</label>
              <select
                value={fields.pe_backed}
                onChange={(e) => saveField("pe_backed", e.target.value)}
                className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-[13px] text-gray-900 transition-colors cursor-pointer"
              >
                <option value="">Unknown</option>
                <option value="false">Independent</option>
                <option value="true">PE Backed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Payor Mix</label>
              <select
                value={fields.primary_payor_mix}
                onChange={(e) => saveField("primary_payor_mix", e.target.value)}
                className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1.5 py-0.5 text-[13px] text-gray-900 transition-colors cursor-pointer"
              >
                <option value="">—</option>
                {PRIMARY_PAYOR_MIX_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Owners */}
          {business.businessPeople.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owners</p>
              <div className="space-y-2.5">
                {business.businessPeople.map((bp) => {
                  const personName = bp.person.full_name || `${bp.person.first_name || ""} ${bp.person.last_name || ""}`.trim() || "Unknown";
                  const initials = personName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={bp.id} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-white">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/contacts/${bp.person_id}`}
                          className="text-[12px] font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-0.5"
                        >
                          {personName}
                          <ExternalLink size={9} className="opacity-40 flex-shrink-0" />
                        </Link>
                        {bp.role_text && <p className="text-[11px] text-gray-400 leading-tight">{bp.role_text}</p>}
                        {bp.ownership_pct && (
                          <p className="text-[10px] text-gray-400">{bp.ownership_pct}%</p>
                        )}
                        {bp.person.succession_signals && (
                          <p className="text-[11px] text-emerald-600 leading-tight mt-0.5">{bp.person.succession_signals}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Services</p>
              <div className="flex flex-wrap gap-1">
                {services.map((s) => (
                  <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map((t) => (
                <span key={t.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1">
                  {t.tag}
                  <button onClick={() => removeTag(t.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="Add tag..."
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={addTag}
                disabled={addingTag || !newTag.trim()}
                className="text-blue-600 hover:text-blue-700 disabled:opacity-40 p-1"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* License */}
          {(business.license_number || business.license_expires) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">License</p>
              {business.license_number && (
                <p className="text-xs text-gray-700 font-medium">{business.license_number}</p>
              )}
              {business.license_expires && (
                <p className="text-xs text-gray-500 mt-0.5">Expires {formatDate(business.license_expires)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0 sticky top-0 z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">{name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StageBadge stage={stage} />
                {business.county && (
                  <span className="text-[12px] text-gray-400">{business.county} County</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {fields.phone && (
                <a href={`tel:${fields.phone}`}>
                  <Button variant="outline" size="sm"><Phone size={14} /> Call</Button>
                </a>
              )}
              {fields.email && (
                <a href={`mailto:${fields.email}`}>
                  <Button variant="outline" size="sm"><Mail size={14} /> Email</Button>
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
              const count =
                tab === "Tasks" ? activities.filter((a) => a.type === "task").length
                : tab === "Activity" ? activities.length
                : null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-[13px] border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600 font-semibold"
                      : "border-transparent text-gray-500 font-medium hover:text-gray-800 hover:border-gray-200"
                  }`}
                >
                  {tab}
                  {count !== null && count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      tab === "Tasks" && openTaskCount > 0 ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "bg-gray-100 text-gray-500"
                    }`}>
                      {tab === "Tasks" ? openTaskCount || count : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {activeTab === "Overview" && (
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-2 space-y-5">
                {/* Business Summary — always editable */}
                <Card>
                  <CardHeader>
                    <CardTitle>Business Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <GhostInput
                        value={fields.business_summary}
                        placeholder="Business summary, notes, context..."
                        onSave={(v) => saveField("business_summary", v)}
                        multiline
                        rows={5}
                      />
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Service Area</label>
                        <GhostInput
                          value={fields.service_area}
                          placeholder="Geographic service area..."
                          onSave={(v) => saveField("service_area", v)}
                        />
                      </div>
                    </div>
                    {business.enrichment_date && (
                      <p className="text-xs text-gray-400 mt-3">
                        AI-researched {formatDate(business.enrichment_date)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Financials */}
                {(business.estimated_annual_revenue || business.estimated_annual_profit || business.primary_payor_mix) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-green-600" />
                        Financial Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {business.estimated_annual_revenue && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Est. Revenue</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(Number(business.estimated_annual_revenue))}</p>
                          </div>
                        )}
                        {business.estimated_annual_profit && (
                          <div className="bg-emerald-50 rounded-lg p-3">
                            <p className="text-xs text-emerald-600 mb-1">Est. Profit</p>
                            <p className="text-lg font-bold text-emerald-800">{formatCurrency(Number(business.estimated_annual_profit))}</p>
                          </div>
                        )}
                        {business.profit_margin_pct && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Margin</p>
                            <p className="text-lg font-bold text-gray-900">{business.profit_margin_pct}%</p>
                          </div>
                        )}
                      </div>
                      {business.primary_payor_mix && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payor Mix</p>
                          <p className="text-sm font-medium text-gray-700 capitalize">{business.primary_payor_mix}</p>
                          {business.payor_mix_notes && (
                            <p className="text-xs text-gray-500 mt-1">{business.payor_mix_notes}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Acquisition Signals */}
                {(business.acquisition_signals || business.growth_signals || business.red_flags) && (
                  <Card>
                    <CardHeader><CardTitle>Acquisition Analysis</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {business.acquisition_signals && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Acquisition Signals</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{business.acquisition_signals}</p>
                        </div>
                      )}
                      {business.growth_signals && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Growth Signals</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{business.growth_signals}</p>
                        </div>
                      )}
                      {business.red_flags && (
                        <div className="bg-red-50 rounded-lg p-3.5">
                          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <AlertTriangle size={12} /> Red Flags
                          </p>
                          <p className="text-sm text-red-800 leading-relaxed">{business.red_flags}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {business.recent_news && (
                  <Card>
                    <CardHeader><CardTitle>Recent News & Press</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 leading-relaxed">{business.recent_news}</p>
                    </CardContent>
                  </Card>
                )}

                {(business.ccn || business.cms_star_rating || business.cms_deficiencies || business.cms_certification_date) && (
                  <Card>
                    <CardHeader><CardTitle>CMS / Medicare Info</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {business.ccn && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">CCN</p>
                            <p className="text-sm font-medium text-gray-900">{business.ccn}</p>
                          </div>
                        )}
                        {business.cms_star_rating && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Star Rating</p>
                            <StarRating rating={business.cms_star_rating} />
                          </div>
                        )}
                        {business.cms_certification_date && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Certified Since</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(business.cms_certification_date)}</p>
                          </div>
                        )}
                        {business.cms_ownership_type && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Ownership Type</p>
                            <p className="text-sm font-medium text-gray-900">{business.cms_ownership_type}</p>
                          </div>
                        )}
                      </div>
                      {business.cms_deficiencies && (
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Survey Deficiencies</p>
                          <p className="text-sm text-amber-900">{business.cms_deficiencies}</p>
                        </div>
                      )}
                      {business.accreditation && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Accreditation</p>
                          <p className="text-sm font-medium text-gray-900">{business.accreditation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User size={13} />
                      Owners ({business.businessPeople.length})
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-gray-50">
                    {business.businessPeople.map((bp) => {
                      const personName = bp.person.full_name || `${bp.person.first_name || ""} ${bp.person.last_name || ""}`.trim() || "Unknown";
                      const initials = personName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                      <div key={bp.id} className="px-4 py-3 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-white">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                        <Link
                          href={`/contacts/${bp.person_id}`}
                          className="text-[13px] font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                          {personName}
                          <ExternalLink size={9} className="opacity-40" />
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {bp.role_text && <span className="text-[11px] text-gray-500">{bp.role_text}</span>}
                          {bp.ownership_pct && (
                            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {bp.ownership_pct}%
                            </span>
                          )}
                          {bp.is_private_equity && (
                            <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">PE</span>
                          )}
                        </div>
                        {bp.person.city && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{bp.person.city}, {bp.person.state_code || "SC"}</p>
                        )}
                        {bp.person.estimated_age && (
                          <p className="text-[11px] text-gray-400">Age ~{bp.person.estimated_age}</p>
                        )}
                        {bp.person.succession_signals && (
                          <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">{bp.person.succession_signals}</p>
                        )}
                        </div>
                      </div>
                    );
                    })}
                    {business.businessPeople.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No owners found</div>
                    )}
                  </div>
                </Card>

                {fields.service_area && (
                  <Card>
                    <CardHeader><CardTitle>Service Area</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{fields.service_area}</p>
                    </CardContent>
                  </Card>
                )}

                {(business.estimated_employees || business.estimated_locations) && (
                  <Card>
                    <CardHeader><CardTitle>Scale</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {business.estimated_employees && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Employees</span>
                          <span className="font-medium text-gray-900">~{business.estimated_employees}</span>
                        </div>
                      )}
                      {business.estimated_locations && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Locations</span>
                          <span className="font-medium text-gray-900">{business.estimated_locations}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === "Communications" && (
            <BusinessCommunicationsPanel
              businessId={business.business_id}
              businessName={business.le_name ?? business.lf_name ?? ""}
              businessEmail={fields.email || business.email}
              people={business.businessPeople.map((bp) => ({
                person_id: bp.person.person_id,
                full_name: bp.person.full_name,
                email: (bp.person as { email?: string | null }).email ?? null,
                first_name: bp.person.first_name,
                last_name: bp.person.last_name,
              }))}
              businessContext={{
                le_name: business.le_name,
                lf_name: business.lf_name,
                city: business.city,
                state_code: business.state_code,
                license_type: business.license_type,
              }}
            />
          )}

          {(activeTab === "Activity" || activeTab === "Tasks") && (
            <div className="max-w-2xl space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Log {activeTab === "Tasks" ? "Task" : "Activity"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityForm
                    businessId={business.business_id}
                    defaultType={TAB_DEFAULT_TYPE[activeTab]}
                    onSuccess={refreshActivities}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {activeTab === "Activity" ? "All Activities" : "Tasks"}
                    <span className="ml-2 text-gray-400 font-normal">({filteredActivities.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <ActivityTimeline activities={filteredActivities} onUpdate={refreshActivities} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Right Notes Panel */}
      <ActivityNotePanel notes={noteActivities} onAddNote={addNote} onRefresh={refreshActivities} />
    </div>
  );
}
