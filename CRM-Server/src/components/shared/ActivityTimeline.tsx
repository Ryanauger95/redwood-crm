"use client";

import { useState, useEffect, useRef } from "react";
import { formatDate } from "@/lib/utils";
import { Phone, Mail, FileText, CheckSquare, MessageSquare, Check, Pencil, Trash2, X, MoreHorizontal } from "lucide-react";

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

const typeIcons: Record<string, React.ReactNode> = {
  call: <Phone size={13} />,
  email: <Mail size={13} />,
  note: <FileText size={13} />,
  task: <CheckSquare size={13} />,
  sms: <MessageSquare size={13} />,
};

const typeColors: Record<string, string> = {
  call: "bg-blue-100 text-blue-600",
  email: "bg-purple-100 text-purple-600",
  note: "bg-gray-100 text-gray-600",
  task: "bg-green-100 text-green-600",
  sms: "bg-yellow-100 text-yellow-600",
};

const typeLabels: Record<string, string> = {
  call: "Call",
  email: "Email",
  note: "Note",
  task: "Task",
  sms: "SMS",
};

interface ActivityTimelineProps {
  activities: Activity[];
  onUpdate?: () => void;
}

export function ActivityTimeline({ activities, onUpdate }: ActivityTimelineProps) {
  const [localActivities, setLocalActivities] = useState(activities);
  const [completing, setCompleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Sync when parent updates
  useEffect(() => { setLocalActivities(activities); }, [activities]);

  const handleComplete = async (id: number) => {
    setCompleting(id);
    try {
      await fetch("/api/activities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "completed", completed_at: new Date().toISOString() }),
      });
      setLocalActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "completed", completed_at: new Date().toISOString() } : a))
      );
      onUpdate?.();
    } finally {
      setCompleting(null);
    }
  };

  const startEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setEditSubject(activity.subject);
    setEditBody(activity.body || "");
    setEditDueDate(activity.due_date ? activity.due_date.slice(0, 16) : "");
    setMenuOpen(null);
  };

  const saveEdit = async (id: number) => {
    setSavingEdit(true);
    try {
      await fetch("/api/activities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          subject: editSubject.trim(),
          body: editBody.trim() || null,
          due_date: editDueDate || null,
        }),
      });
      setLocalActivities((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, subject: editSubject.trim(), body: editBody.trim() || null, due_date: editDueDate || null }
            : a
        )
      );
      setEditingId(null);
      onUpdate?.();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setLocalActivities((prev) => prev.filter((a) => a.id !== id));
      onUpdate?.();
    } finally {
      setDeletingId(null);
      setMenuOpen(null);
    }
  };

  if (localActivities.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <FileText size={28} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No activities yet</p>
        <p className="text-xs mt-1">Log a call, email, or note above</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {localActivities.map((activity, i) => {
        const isTask = activity.type === "task";
        const isOpen = isTask && activity.status !== "completed";
        const isOverdue = isOpen && activity.due_date && new Date(activity.due_date) < new Date();
        const isEditing = editingId === activity.id;
        const isDeleting = deletingId === activity.id;

        return (
          <div
            key={activity.id}
            className={`group flex gap-3 px-2 py-3 rounded-lg transition-colors relative ${
              i % 2 === 0 ? "" : "bg-gray-50/60"
            } ${isOverdue ? "bg-red-50/40" : ""} hover:bg-blue-50/30`}
          >
            {/* Timeline icon */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${typeColors[activity.type] || "bg-gray-100 text-gray-600"}`}>
                {typeIcons[activity.type] || <FileText size={13} />}
              </div>
              {i < localActivities.length - 1 && (
                <div className="w-px flex-1 mt-1 bg-gray-200 min-h-3" />
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              {isEditing ? (
                /* Inline edit form */
                <div className="space-y-2">
                  <input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Subject"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Notes..."
                  />
                  {isTask && (
                    <input
                      type="datetime-local"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(activity.id)}
                      disabled={savingEdit || !editSubject.trim()}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal display */
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
                        {typeLabels[activity.type] || activity.type}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.subject}</p>
                      {isTask && (
                        <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          activity.status === "completed" ? "bg-green-100 text-green-700"
                          : isOverdue ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                        }`}>
                          {activity.status === "completed" ? "Done" : isOverdue ? "Overdue" : "Open"}
                        </span>
                      )}
                    </div>

                    {/* Actions menu */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">{formatDate(activity.created_at)}</span>
                      <div className="relative" ref={menuOpen === activity.id ? menuRef : null}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === activity.id ? null : activity.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpen === activity.id && (
                          <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-24">
                            <button
                              onClick={() => startEdit(activity)}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(activity.id)}
                              disabled={isDeleting}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={11} /> {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {activity.body && (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">
                      {activity.body}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {activity.user && (
                      <span className="text-xs text-gray-400">by <span className="font-medium text-gray-600">{activity.user.name}</span></span>
                    )}
                    {isTask && activity.due_date && (
                      <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                        Due {formatDate(activity.due_date)}
                      </span>
                    )}
                    {isOpen && (
                      <button
                        onClick={() => handleComplete(activity.id)}
                        disabled={completing === activity.id}
                        className="text-xs flex items-center gap-1 text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50 ml-auto"
                      >
                        <Check size={12} />
                        {completing === activity.id ? "Saving..." : "Mark complete"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
