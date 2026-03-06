"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User, MapPin, Linkedin, ExternalLink, Check } from "lucide-react";
import { US_STATES } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";
import { StageBadge } from "@/components/shared/StageBadge";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { ActivityForm } from "@/components/shared/ActivityForm";
import { EmailCompose } from "@/components/shared/EmailCompose";
import { ActivityNotePanel } from "@/components/shared/ActivityNotePanel";
import { useToast } from "@/components/shared/Toast";

interface Activity {
  id: number;
  type: string;
  subject: string;
  body?: string | null;
  status: string;
  due_date?: string | null;
  completed_at?: string | null;
  created_at: string;
  user?: { name: string } | null;
}

interface BusinessPerson {
  id: number;
  role_text: string | null;
  ownership_pct: string | null;
  business: {
    business_id: number;
    le_name: string | null;
    lf_name: string | null;
    city: string | null;
    acquisition_fit_score: number | null;
    enrichment_status: string;
    pipelineStage: { stage: string } | null;
  };
}

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
  owner_background: string | null;
  other_businesses: string | null;
  succession_signals: string | null;
  in_active_foreclosure: boolean | null;
  associated_case_number: string | null;
  businessPeople: BusinessPerson[];
  activities: Activity[];
}

// Ghost input — transparent at rest, visible border on hover/focus
function GhostInput({
  value,
  placeholder,
  onSave,
  multiline = false,
  rows = 3,
  className = "",
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
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

export function ContactDetailClient({ person: initialPerson }: { person: Person }) {
  const { showToast, toastElement } = useToast();
  const [person, setPerson] = useState(initialPerson);
  const [activities, setActivities] = useState(initialPerson.activities);
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailThreads, setEmailThreads] = useState<
    { thread_id: string; latest: { subject: string | null; from_address: string; sent_at: string | null; is_sent: boolean; snippet: string | null }; messages: unknown[] }[]
  >([]);
  const [emailsLoading, setEmailsLoading] = useState(true);

  // Live field values
  const [fields, setFields] = useState({
    linkedin_url: initialPerson.linkedin_url || "",
    city: initialPerson.city || "",
    state_code: initialPerson.state_code || "",
    email: initialPerson.email || "",
    owner_background: initialPerson.owner_background || "",
    succession_signals: initialPerson.succession_signals || "",
    other_businesses: initialPerson.other_businesses || "",
    in_active_foreclosure: initialPerson.in_active_foreclosure != null ? String(initialPerson.in_active_foreclosure) : "false",
    associated_case_number: initialPerson.associated_case_number || "",
  });

  const saveField = useCallback(async (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    setPerson((prev) => ({ ...prev, [field]: value || null }));
    await fetch(`/api/contacts/${person.person_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    showToast("Saved");
  }, [person.person_id, showToast]);

  const refreshActivities = useCallback(async () => {
    const res = await fetch(`/api/contacts/${person.person_id}/activities`);
    const data = await res.json();
    setActivities(data);
  }, [person.person_id]);

  const addNote = async (text: string) => {
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_id: person.person_id, type: "note", subject: text, body: text, status: "completed" }),
    });
    await refreshActivities();
  };

  const refreshEmails = useCallback(async () => {
    setEmailsLoading(true);
    const res = await fetch(`/api/contacts/${person.person_id}/emails`);
    const data = await res.json();
    setEmailThreads(data.threads ?? []);
    setEmailsLoading(false);
  }, [person.person_id]);

  useEffect(() => { refreshEmails(); }, [refreshEmails]);

  const name = person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim() || "Unknown";

  return (
    <>
      {toastElement}
      <div className="p-8 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/contacts" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} />
            Back to Contacts
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-[18px] shadow-md shadow-blue-200">
            {name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1">
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {/* City + State — inline editable */}
              <div className="flex items-center gap-1">
                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                <GhostInput
                  value={fields.city}
                  placeholder="City"
                  onSave={(v) => saveField("city", v)}
                  className="w-28"
                />
                <span className="text-sm text-gray-400">,</span>
                <select
                  value={fields.state_code}
                  onChange={(e) => saveField("state_code", e.target.value)}
                  className="bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none rounded px-1 py-0.5 text-sm text-gray-600 transition-colors cursor-pointer w-20"
                >
                  <option value="">State</option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>{s.value}</option>
                  ))}
                </select>
              </div>
              {person.estimated_age && (
                <span className="text-sm text-gray-500">Age ~{person.estimated_age}</span>
              )}
              {/* Email — inline editable */}
              <GhostInput
                value={fields.email}
                placeholder="Email address"
                onSave={(v) => saveField("email", v)}
                className="w-52"
              />
              {/* LinkedIn — inline editable */}
              <div className="flex items-center gap-1">
                <Linkedin size={13} className="text-gray-400 flex-shrink-0" />
                <GhostInput
                  value={fields.linkedin_url}
                  placeholder="LinkedIn URL"
                  onSave={(v) => saveField("linkedin_url", v)}
                  className="w-52"
                />
                {fields.linkedin_url && (
                  <a href={fields.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 flex-shrink-0">
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">
            {/* Background — always editable */}
            <Card>
              <CardHeader><CardTitle>Background</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Owner Background</label>
                  <GhostInput
                    value={fields.owner_background}
                    placeholder="Owner background, history, personal details..."
                    onSave={(v) => saveField("owner_background", v)}
                    multiline
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Succession Signals</label>
                  <GhostInput
                    value={fields.succession_signals}
                    placeholder="Signs of interest in selling, retirement plans..."
                    onSave={(v) => saveField("succession_signals", v)}
                    multiline
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Other Businesses</label>
                  <GhostInput
                    value={fields.other_businesses}
                    placeholder="Other businesses this person is associated with..."
                    onSave={(v) => saveField("other_businesses", v)}
                    multiline
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">In Active Foreclosure</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fields.in_active_foreclosure === "true"}
                      onChange={(e) => saveField("in_active_foreclosure", String(e.target.checked))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">{fields.in_active_foreclosure === "true" ? "Yes" : "No"}</span>
                  </label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Associated Case Number</label>
                  <GhostInput
                    value={fields.associated_case_number}
                    placeholder="Court case number..."
                    onSave={(v) => saveField("associated_case_number", v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Associated Businesses */}
            <Card>
              <CardHeader>
                <CardTitle>Associated Businesses ({person.businessPeople.length})</CardTitle>
              </CardHeader>
              <div className="divide-y divide-gray-50">
                {person.businessPeople.map((bp) => (
                  <Link
                    key={bp.id}
                    href={`/accounts/${bp.business.business_id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#f8fafc] transition-colors group"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                        {bp.business.le_name || bp.business.lf_name}
                        <ExternalLink size={10} className="opacity-40" />
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {bp.role_text && <span className="text-[11px] text-gray-500">{bp.role_text}</span>}
                        {bp.ownership_pct && <span className="text-[11px] text-gray-500">{bp.ownership_pct}% ownership</span>}
                        {bp.business.city && <span className="text-[11px] text-gray-400">{bp.business.city}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <FitScoreBadge score={bp.business.acquisition_fit_score} size="sm" />
                      <StageBadge stage={bp.business.pipelineStage?.stage} />
                    </div>
                  </Link>
                ))}
                {person.businessPeople.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">No businesses linked</div>
                )}
              </div>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader><CardTitle>Activity ({activities.length})</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <ActivityForm personId={person.person_id} onSuccess={refreshActivities} />
                <ActivityTimeline activities={activities} onUpdate={refreshActivities} />
              </CardContent>
            </Card>

            {/* Communications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Communications ({emailThreads.length})</CardTitle>
                  {fields.email && (
                    <button
                      onClick={() => setComposeOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Send Email
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!fields.email ? (
                  <p className="text-sm text-gray-400 italic">
                    Add an email address above to track communications.
                  </p>
                ) : emailsLoading ? (
                  <p className="text-sm text-gray-400">Loading...</p>
                ) : emailThreads.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">No emails yet.</p>
                    <button onClick={() => setComposeOpen(true)} className="mt-2 text-blue-500 hover:underline text-xs">
                      Send first email
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emailThreads.map((thread) => (
                      <div key={thread.thread_id} className="border border-gray-200 rounded-xl px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {thread.latest.subject ?? "(no subject)"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {thread.latest.is_sent ? "Sent" : `From: ${thread.latest.from_address}`}
                            </p>
                            {thread.latest.snippet && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{thread.latest.snippet}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {thread.latest.sent_at
                              ? new Date(thread.latest.sent_at).toLocaleDateString([], { month: "short", day: "numeric" })
                              : ""}
                          </span>
                        </div>
                        {thread.messages.length > 1 && (
                          <p className="text-xs text-gray-400 mt-1">{thread.messages.length} messages in thread</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes sidebar */}
          <div className="col-span-1">
            <div className="sticky top-4">
              <ActivityNotePanel
                notes={activities.filter((a) => a.type === "note")}
                onAddNote={addNote}
              />
            </div>
          </div>
        </div>
      </div>

      <EmailCompose
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => { setComposeOpen(false); refreshEmails(); }}
        defaultTo={fields.email}
        person={{
          first_name: person.first_name,
          last_name: person.last_name,
          full_name: person.full_name,
          city: fields.city || person.city,
          email: fields.email || null,
        }}
      />
    </>
  );
}
