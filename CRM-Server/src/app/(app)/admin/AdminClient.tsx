"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, ClipboardList, Plus, X, Check, UserX } from "lucide-react";

interface CrmUserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  _count?: { activities: number; auditLogs: number };
}

interface AuditLogRow {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  field_name: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
  user: { name: string; email: string };
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminClient() {
  const [tab, setTab] = useState<"users" | "audit">("users");

  return (
    <div className="p-8 space-y-5">
      <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Admin</h1>

      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            tab === "users" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users size={14} /> Users
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            tab === "audit" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ClipboardList size={14} /> Audit Log
        </button>
      </div>

      {tab === "users" ? <UsersTab /> : <AuditTab />}
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<CrmUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeactivate = async (id: number) => {
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const handleReactivate = async (id: number) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-400">{users.length} users</p>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New User</>}
        </Button>
      </div>

      {showCreate && (
        <CreateUserForm onCreated={() => { setShowCreate(false); fetchUsers(); }} />
      )}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Created</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td></tr>
              ))
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-2.5 text-[13px] font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-2.5 text-[13px] text-gray-600">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    u.role === "admin" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-2.5">
                  {u.is_active ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                      <Check size={10} /> Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                      <UserX size={10} /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[13px] text-gray-400">{timeAgo(u.created_at)}</td>
                <td className="px-4 py-2.5 text-right">
                  {u.is_active ? (
                    <button
                      onClick={() => handleDeactivate(u.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(u.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, userRole: role }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create user");
      setSaving(false);
      return;
    }

    setSaving(false);
    onCreated();
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={saving} size="sm">Create User</Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Audit Tab ──────────────────────────────────────────────────────────────

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/audit?page=${page}&limit=30`);
    const data = await res.json();
    setLogs(data.data || []);
    setPages(data.pages || 1);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatValue = (v: unknown) => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-gray-400">{total} audit entries</p>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">When</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Entity</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Field</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm text-gray-400">No audit entries yet</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-2.5 text-[12px] text-gray-400 whitespace-nowrap">{timeAgo(log.created_at)}</td>
                <td className="px-4 py-2.5 text-[13px] text-gray-700">{log.user.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    log.action === "create" ? "bg-emerald-50 text-emerald-700"
                    : log.action === "delete" || log.action === "deactivate" ? "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>{log.action}</span>
                </td>
                <td className="px-4 py-2.5 text-[13px] text-gray-600">
                  {log.entity_type} #{log.entity_id}
                </td>
                <td className="px-4 py-2.5 text-[13px] text-gray-500">{log.field_name || "—"}</td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500 max-w-xs truncate">
                  {log.old_value ? (
                    <span><span className="text-red-400 line-through">{formatValue(log.old_value)}</span> → <span className="text-emerald-600">{formatValue(log.new_value)}</span></span>
                  ) : log.new_value ? (
                    <span className="text-emerald-600">{formatValue(log.new_value)}</span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-[13px] text-gray-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
