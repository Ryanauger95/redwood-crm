"use client";

import { useState, useEffect } from "react";
import { X, Send, ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
}

interface BusinessContext {
  le_name?: string | null;
  lf_name?: string | null;
  city?: string | null;
  state_code?: string | null;
  license_type?: string | null;
  phone?: string | null;
}

interface PersonContext {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  city?: string | null;
  email?: string | null;
}

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultThreadId?: string;
  business?: BusinessContext;
  person?: PersonContext;
}

const PLACEHOLDERS = [
  { key: "{{first_name}}", label: "First Name" },
  { key: "{{last_name}}", label: "Last Name" },
  { key: "{{full_name}}", label: "Full Name" },
  { key: "{{business_name}}", label: "Business Name" },
  { key: "{{city}}", label: "City" },
  { key: "{{state}}", label: "State" },
  { key: "{{license_type}}", label: "License Type" },
  { key: "{{my_name}}", label: "My Name" },
];

function resolvePlaceholders(
  text: string,
  person?: PersonContext,
  business?: BusinessContext,
  myName?: string
): string {
  return text
    .replace(/\{\{first_name\}\}/g, person?.first_name ?? "")
    .replace(/\{\{last_name\}\}/g, person?.last_name ?? "")
    .replace(/\{\{full_name\}\}/g, person?.full_name ?? "")
    .replace(/\{\{business_name\}\}/g, business?.le_name ?? business?.lf_name ?? "")
    .replace(/\{\{city\}\}/g, person?.city ?? business?.city ?? "")
    .replace(/\{\{state\}\}/g, business?.state_code ?? "")
    .replace(/\{\{license_type\}\}/g, business?.license_type ?? "")
    .replace(/\{\{my_name\}\}/g, myName ?? "");
}

export function EmailCompose({
  isOpen,
  onClose,
  onSent,
  defaultTo = "",
  defaultSubject = "",
  defaultThreadId,
  business,
  person,
}: EmailComposeProps) {
  const { data: session } = useSession();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody("");
      setError("");
      setSuccess(false);
    }
  }, [isOpen, defaultTo, defaultSubject]);

  useEffect(() => {
    fetch("/api/email-templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  const myName = session?.user?.name ?? "";

  function applyTemplate(t: Template) {
    setSubject(resolvePlaceholders(t.subject, person, business, myName));
    setBody(resolvePlaceholders(t.body, person, business, myName));
    setTemplateOpen(false);
  }

  function insertPlaceholder(key: string) {
    setBody((prev) => prev + key);
  }

  async function handleSend() {
    if (!to.trim() || !subject.trim()) {
      setError("To and Subject are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          text: body,
          thread_id: defaultThreadId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Send failed");
        return;
      }
      setSuccess(true);
      onSent?.();
      setTimeout(onClose, 1000);
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div
        className="pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
        style={{ width: 560, maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <span className="font-semibold text-sm text-gray-800">
            {defaultThreadId ? "Reply" : "New Email"}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* To */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              autoComplete="nope"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              autoComplete="nope"
            />
          </div>

          {/* Template picker */}
          {templates.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setTemplateOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Use template <ChevronDown size={12} />
              </button>
              {templateOpen && (
                <div className="absolute top-6 left-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[220px]">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-800">{t.name}</div>
                      <div className="text-xs text-gray-500 truncate">{t.subject}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</label>
            <textarea
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
            />
          </div>

          {/* Placeholder chips */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Insert placeholder:</p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => insertPlaceholder(p.key)}
                  className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-2 py-1 rounded-md transition-colors font-mono"
                >
                  {p.key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm">
            {error && <span className="text-red-500">{error}</span>}
            {success && <span className="text-green-600">Sent!</span>}
          </div>
          <button
            onClick={handleSend}
            disabled={sending || success}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              sending || success
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <Send size={14} />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
