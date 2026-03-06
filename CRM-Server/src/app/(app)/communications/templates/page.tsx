"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Save, X, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
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

interface TemplateFormProps {
  initial?: Partial<Template>;
  onSave: (data: { name: string; subject: string; body: string }) => Promise<void>;
  onCancel: () => void;
}

function TemplateForm({ initial, onSave, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertPlaceholder(key: string) {
    const el = bodyRef.current;
    if (!el) { setBody((b) => b + key); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newBody = body.slice(0, start) + key + body.slice(end);
    setBody(newBody);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + key.length;
      el.focus();
    }, 0);
  }

  async function handleSave() {
    if (!name || !subject || !body) return;
    setSaving(true);
    await onSave({ name, subject, body });
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Template Name
          </label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Initial Outreach"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Subject Line
          </label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Introduction — {{business_name}}"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Body
        </label>
        <textarea
          ref={bodyRef}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Hi {{first_name}},&#10;&#10;I'm reaching out about {{business_name}}..."
        />
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-2">Click to insert placeholder at cursor:</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => insertPlaceholder(p.key)}
              className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-2.5 py-1 rounded-md transition-colors font-mono"
            >
              {p.key}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={!name || !subject || !body || saving}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            !name || !subject || !body || saving
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          )}
        >
          <Save size={13} />
          {saving ? "Saving..." : "Save Template"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function fetchTemplates() {
    const res = await fetch("/api/email-templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function handleCreate(data: { name: string; subject: string; body: string }) {
    await fetch("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setCreating(false);
    fetchTemplates();
  }

  async function handleUpdate(id: number, data: { name: string; subject: string; body: string }) {
    await fetch(`/api/email-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingId(null);
    fetchTemplates();
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/communications"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Inbox
        </Link>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create reusable email templates with CRM field placeholders.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            New Template
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-5">
          <TemplateForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading templates...</div>
      ) : templates.length === 0 && !creating ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No templates yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-3 text-blue-600 hover:underline text-sm"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) =>
            editingId === t.id ? (
              <TemplateForm
                key={t.id}
                initial={t}
                onSave={(data) => handleUpdate(t.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate font-mono">{t.subject}</div>
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2 whitespace-pre-wrap">
                    {t.body}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(t.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
