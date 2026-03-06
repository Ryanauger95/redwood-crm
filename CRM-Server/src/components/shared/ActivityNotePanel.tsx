"use client";

import { useState, useEffect } from "react";
import { FileText, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityNote {
  id: number;
  type: string;
  subject: string;
  body?: string | null;
  created_at: string;
  user?: { name: string } | null;
}

interface Props {
  notes: ActivityNote[];
  onAddNote: (text: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function ActivityNotePanel({ notes: initialNotes, onAddNote, onRefresh }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Keep notes in sync when parent refreshes
  useEffect(() => { setNotes(initialNotes); }, [initialNotes]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setAdding(true);
    try {
      await onAddNote(text);
      setText("");
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editText }),
      });
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...updated } : n));
      setEditingId(null);
      await onRefresh?.();
    } catch {
      // keep editing state on error
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/activities/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      await onRefresh?.();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h3>
        <span className="text-xs text-gray-400">{notes.length}</span>
      </div>

      {/* Add note */}
      <div className="px-3 py-3 border-b border-gray-100">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
          placeholder="Add a note... (⌘+Enter)"
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-end mt-1.5">
          <Button size="sm" onClick={handleAdd} disabled={adding || !text.trim()}>
            {adding ? "Saving..." : "Add"}
          </Button>
        </div>
      </div>

      {/* Notes list */}
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
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      autoFocus
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="p-1 text-green-600 hover:text-green-700 rounded transition-colors"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {note.body || note.subject}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })}
                        {note.user?.name ? ` · ${note.user.name}` : ""}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingId(note.id); setEditText(note.body || note.subject); }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
                          title="Delete"
                        >
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
  );
}
