"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Phone, Mail, FileText, CheckSquare, MessageSquare } from "lucide-react";

const ACTIVITY_TYPES = [
  { value: "call", label: "📞 Call" },
  { value: "email", label: "✉️ Email" },
  { value: "note", label: "📝 Note" },
  { value: "task", label: "✅ Task" },
  { value: "sms", label: "💬 SMS" },
];

const TYPE_QUICK = [
  { value: "call", icon: Phone, label: "Call" },
  { value: "email", icon: Mail, label: "Email" },
  { value: "note", icon: FileText, label: "Note" },
  { value: "task", icon: CheckSquare, label: "Task" },
  { value: "sms", icon: MessageSquare, label: "SMS" },
];

const CALL_OUTCOMES = [
  "No answer — left voicemail",
  "Spoke with owner — interested",
  "Spoke with owner — not interested",
  "Wrong number",
  "Call back requested",
  "Gatekeeper answered",
];

interface ActivityFormProps {
  businessId?: number;
  personId?: number;
  defaultType?: string;
  onSuccess?: () => void;
}

export function ActivityForm({ businessId, personId, defaultType = "note", onSuccess }: ActivityFormProps) {
  const [type, setType] = useState(defaultType);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          person_id: personId,
          type,
          subject: subject.trim(),
          body: body.trim() || null,
          due_date: dueDate || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to log activity");

      setSubject("");
      setBody("");
      setDueDate("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const callOutlineClick = (outcome: string) => {
    setSubject(outcome);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Type quick-select buttons */}
      <div className="flex gap-1.5">
        {TYPE_QUICK.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              type === value
                ? value === "call" ? "bg-blue-100 text-blue-700 ring-1 ring-blue-400"
                  : value === "email" ? "bg-purple-100 text-purple-700 ring-1 ring-purple-400"
                  : value === "note" ? "bg-gray-200 text-gray-700 ring-1 ring-gray-400"
                  : value === "task" ? "bg-green-100 text-green-700 ring-1 ring-green-400"
                  : "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-400"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Call quick-fill buttons */}
      {type === "call" && (
        <div className="flex flex-wrap gap-1.5">
          {CALL_OUTCOMES.map((outcome) => (
            <button
              key={outcome}
              type="button"
              onClick={() => callOutlineClick(outcome)}
              className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              {outcome}
            </button>
          ))}
        </div>
      )}

      <Input
        placeholder={
          type === "call" ? "Call outcome / summary..."
          : type === "email" ? "Email subject..."
          : type === "task" ? "Task description..."
          : type === "sms" ? "SMS summary..."
          : "Note title..."
        }
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          type === "call" ? "Call notes — what was discussed, next steps..."
          : type === "email" ? "Email body or summary..."
          : type === "task" ? "Details, links, or instructions..."
          : type === "sms" ? "Message content..."
          : "Details..."
        }
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
      />

      {type === "task" && (
        <Input
          type="datetime-local"
          label="Due Date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600 font-medium">✓ Activity logged</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={loading} size="sm">
          Log {type === "call" ? "Call" : type === "email" ? "Email" : type === "task" ? "Task" : type === "sms" ? "SMS" : "Note"}
        </Button>
      </div>
    </form>
  );
}
