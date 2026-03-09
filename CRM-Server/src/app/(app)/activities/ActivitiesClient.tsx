"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Phone, Mail, FileText, CheckSquare, MessageSquare, Activity as ActivityIcon, X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Activity {
  id: number;
  type: string;
  subject: string;
  body: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  business: { business_id: number; le_name: string | null; lf_name: string | null } | null;
  person: { person_id: number; full_name: string | null } | null;
  user: { name: string } | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  note: <FileText size={14} />,
  task: <CheckSquare size={14} />,
  sms: <MessageSquare size={14} />,
};

const typeColors: Record<string, string> = {
  call:  "bg-blue-50 text-blue-600",
  email: "bg-violet-50 text-violet-600",
  note:  "bg-amber-50 text-amber-600",
  task:  "bg-emerald-50 text-emerald-600",
  sms:   "bg-pink-50 text-pink-600",
};

const TYPE_FILTER_OPTIONS = [
  { value: "call", label: "Calls" },
  { value: "email", label: "Emails" },
  { value: "note", label: "Notes" },
  { value: "task", label: "Tasks" },
  { value: "sms", label: "SMS" },
];

const TASK_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];

export default function ActivitiesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);

  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "30");
      const res = await fetch(`/api/activities?${params}`);
      const data = await res.json();
      setActivities(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [type, status, page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`/activities?${params}`);
  };

  const handleComplete = async (id: number) => {
    setCompleting(id);
    try {
      await fetch("/api/activities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "completed", completed_at: new Date().toISOString() }),
      });
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "completed" } : a))
      );
    } finally {
      setCompleting(null);
    }
  };

  const hasFilters = !!(type || status);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Activities</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          {loading ? "Loading..." : `${total.toLocaleString()} ${hasFilters ? "matching" : "total"} activities`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={type}
          onChange={(e) => updateParam("type", e.target.value)}
          options={TYPE_FILTER_OPTIONS}
          placeholder="All types"
          className="w-36"
        />
        {type === "task" && (
          <Select
            value={status}
            onChange={(e) => updateParam("status", e.target.value)}
            options={TASK_STATUS_OPTIONS}
            placeholder="Any status"
            className="w-36"
          />
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => router.push("/activities")} className="flex items-center gap-1">
            <X size={13} /> Clear
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                </div>
                <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ActivityIcon size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activities found</p>
            <p className="text-xs mt-1">Log calls, emails, and notes from account pages.</p>
            {hasFilters && (
              <button onClick={() => router.push("/activities")} className="text-xs text-blue-600 hover:underline mt-2">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activities.map((act) => {
              const isTask = act.type === "task";
              const isOpen = isTask && act.status !== "completed";
              const isOverdue = isOpen && act.due_date && new Date(act.due_date) < new Date();

              return (
                <div key={act.id} className={`flex items-start gap-4 px-6 py-3.5 hover:bg-blue-50 transition-colors ${isOverdue ? "bg-red-50/20" : ""}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${typeColors[act.type] || "bg-gray-50 text-gray-500"}`}>
                    {typeIcons[act.type] || <ActivityIcon size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{act.subject}</p>
                        {isTask && (
                          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            act.status === "completed" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : isOverdue ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          }`}>
                            {act.status === "completed" ? "Done" : isOverdue ? "Overdue" : "Open"}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">{formatDate(act.created_at)}</span>
                    </div>
                    {act.body && (
                      <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{act.body}</p>
                    )}
                    <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                      {act.business && (
                        <Link href={`/accounts/${act.business.business_id}`} className="text-[12px] text-blue-600 hover:underline font-medium">
                          {act.business.le_name || act.business.lf_name}
                        </Link>
                      )}
                      {act.person && (
                        <>
                          {act.business && <span className="text-gray-300 text-[11px]">·</span>}
                          <Link href={`/contacts/${act.person.person_id}`} className="text-[12px] text-blue-600 hover:underline">
                            {act.person.full_name}
                          </Link>
                        </>
                      )}
                      {act.user && (
                        <span className="text-[11px] text-gray-400">by {act.user.name}</span>
                      )}
                      {isTask && act.due_date && (
                        <span className={`text-[11px] ${isOverdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                          Due {formatDate(act.due_date)}
                        </span>
                      )}
                      {isOpen && (
                        <button
                          onClick={() => handleComplete(act.id)}
                          disabled={completing === act.id}
                          className="text-[12px] text-emerald-600 hover:text-emerald-700 font-semibold disabled:opacity-50 ml-auto"
                        >
                          {completing === act.id ? "Saving…" : <><Check size={11} className="inline mr-0.5" />Mark complete</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-[#f8fafc]">
            <p className="text-[13px] text-gray-400">Page {page} of {pages} · {total.toLocaleString()} results</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => updateParam("page", String(page - 1))} disabled={page <= 1}>
                ← Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => updateParam("page", String(page + 1))} disabled={page >= pages}>
                Next →
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
