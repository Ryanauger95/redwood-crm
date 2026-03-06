"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Send, Search, RefreshCw, Settings, Unlink, Building2, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailCompose } from "@/components/shared/EmailCompose";
import Link from "next/link";

interface CachedEmail {
  id: number;
  message_id: string;
  thread_id: string;
  from_address: string;
  to_addresses: string;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  sent_at: string | null;
  is_read: boolean;
  is_sent: boolean;
  business_id: number | null;
  person_id: number | null;
  business?: { business_id: number; le_name: string | null; lf_name: string | null } | null;
  person?: { person_id: number; full_name: string | null } | null;
}

type Folder = "inbox" | "sent";

function formatDate(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseToAddresses(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [raw];
  }
}

// ─── Thread panel ─────────────────────────────────────────────────────────────

function ThreadPanel({
  threadId,
  onReply,
}: {
  threadId: string;
  onReply: (threadId: string, to: string, subject: string) => void;
}) {
  const [messages, setMessages] = useState<CachedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/gmail/messages?thread_id=${encodeURIComponent(threadId)}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        const sorted = (d.data ?? []).sort(
          (a: CachedEmail, b: CachedEmail) =>
            new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime()
        );
        setMessages(sorted);
        if (sorted.length > 0) setExpandedId(sorted[sorted.length - 1].message_id);
      })
      .finally(() => setLoading(false));
  }, [threadId]);

  async function loadBody(msg: CachedEmail) {
    if (msg.body_html || msg.body_text) return;
    const res = await fetch(`/api/gmail/messages/${msg.message_id}`);
    const data = await res.json();
    setMessages((prev) =>
      prev.map((m) =>
        m.message_id === msg.message_id
          ? { ...m, body_html: data.body_html, body_text: data.body_text }
          : m
      )
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading thread...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No messages
      </div>
    );
  }

  const latest = messages[messages.length - 1];
  const toAddrs = parseToAddresses(latest.to_addresses);
  const replyTo = latest.is_sent ? toAddrs[0] ?? "" : latest.from_address;
  const replySubject = latest.subject
    ? latest.subject.startsWith("Re:")
      ? latest.subject
      : `Re: ${latest.subject}`
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Thread subject */}
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 text-base">
          {latest.subject ?? "(no subject)"}
        </h2>
        <div className="flex items-center gap-3 mt-1">
          {latest.business && (
            <Link
              href={`/accounts/${latest.business.business_id}`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Building2 size={11} />
              {latest.business.le_name ?? latest.business.lf_name}
            </Link>
          )}
          {latest.person && (
            <Link
              href={`/contacts/${latest.person.person_id}`}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <User size={11} />
              {latest.person.full_name}
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg) => {
          const isExpanded = expandedId === msg.message_id;
          return (
            <div
              key={msg.message_id}
              className="border border-gray-200 rounded-xl bg-white overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (!isExpanded) {
                    loadBody(msg);
                    setExpandedId(msg.message_id);
                  } else {
                    setExpandedId(null);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      msg.is_sent ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {msg.is_sent ? "Me" : (msg.from_address[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {msg.is_sent ? `To: ${parseToAddresses(msg.to_addresses).join(", ")}` : msg.from_address}
                    </div>
                    {!isExpanded && (
                      <div className="text-xs text-gray-500 truncate">{msg.snippet}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{formatDate(msg.sent_at)}</span>
                  <ChevronRight
                    size={14}
                    className={cn(
                      "text-gray-400 transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4">
                  {msg.body_html ? (
                    <iframe
                      srcDoc={msg.body_html}
                      className="w-full border-0"
                      style={{ minHeight: 300 }}
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        iframe.style.height =
                          iframe.contentDocument?.body.scrollHeight + "px";
                      }}
                    />
                  ) : (
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {msg.body_text ?? msg.snippet ?? "(no content)"}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply button */}
      <div className="px-5 py-3 border-t border-gray-200">
        <button
          onClick={() => onReply(threadId, replyTo, replySubject)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Mail size={14} />
          Reply
        </button>
      </div>
    </div>
  );
}

// ─── Main client ─────────────────────────────────────────────────────────────

export function CommunicationsClient() {
  const [status, setStatus] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<CachedEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeThreadId, setComposeThreadId] = useState<string | undefined>();

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/gmail/status");
    const data = await res.json();
    setStatus(data);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!status?.connected) return;
    const params = new URLSearchParams({
      folder,
      page: String(page),
      limit: "25",
      ...(search ? { q: search } : {}),
    });
    const res = await fetch(`/api/gmail/messages?${params}`);
    const data = await res.json();
    setMessages(data.data ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
  }, [status?.connected, folder, page, search]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/gmail/sync", { method: "POST" });
    setSyncing(false);
    fetchMessages();
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Gmail? Cached emails will remain.")) return;
    await fetch("/api/gmail/disconnect", { method: "DELETE" });
    fetchStatus();
  }

  function openReply(threadId: string, to: string, subject: string) {
    setComposeTo(to);
    setComposeSubject(subject);
    setComposeThreadId(threadId);
    setComposeOpen(true);
  }

  function openCompose() {
    setComposeTo("");
    setComposeSubject("");
    setComposeThreadId(undefined);
    setComposeOpen(true);
  }

  // ── Not connected ──
  if (status && !status.connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Gmail</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Connect your Gmail account to send emails, track communications, and automatically
            link messages to businesses and contacts in your CRM.
          </p>
          <a
            href="/api/gmail/auth"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Connect Gmail
          </a>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (!status) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  // ── Connected ──
  return (
    <div className="flex h-full bg-gray-50">
      {/* Left sidebar */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <button
            onClick={openCompose}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors shadow-sm"
          >
            <Send size={14} />
            Compose
          </button>
        </div>

        <nav className="px-2 py-3 space-y-0.5 flex-1">
          {(["inbox", "sent"] as Folder[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFolder(f); setPage(1); setSelectedThread(null); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                folder === f
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {f === "inbox" ? <Mail size={15} /> : <Send size={15} />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          <div className="pt-2 border-t border-gray-100 mt-2">
            <Link
              href="/communications/templates"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings size={15} />
              Templates
            </Link>
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-gray-100 text-xs text-gray-400 space-y-1">
          <div className="truncate font-medium text-gray-600">{status.email}</div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1 hover:text-gray-600 transition-colors"
            >
              <RefreshCw size={10} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync"}
            </button>
            <span>·</span>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 hover:text-red-500 transition-colors"
            >
              <Unlink size={10} />
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Search */}
        <div className="px-3 py-3 border-b border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
              setPage(1);
            }}
            className="relative"
          >
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search emails..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
              <Mail size={28} className="opacity-30" />
              <span>No emails</span>
              <button
                onClick={handleSync}
                className="text-blue-500 hover:underline text-xs mt-1"
              >
                Sync now
              </button>
            </div>
          ) : (
            messages.map((msg) => (
              <button
                key={msg.thread_id}
                onClick={() => setSelectedThread(msg.thread_id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                  selectedThread === msg.thread_id && "bg-blue-50 border-l-2 border-l-blue-500",
                  !msg.is_read && "font-semibold"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-gray-900 truncate">
                    {msg.is_sent
                      ? `To: ${parseToAddresses(msg.to_addresses)[0] ?? "?"}`
                      : msg.from_address.replace(/<.*>/, "").trim() || msg.from_address}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(msg.sent_at)}</span>
                </div>
                <div className="text-sm text-gray-700 truncate mt-0.5">
                  {msg.subject ?? "(no subject)"}
                </div>
                <div className="text-xs text-gray-400 truncate mt-0.5">{msg.snippet}</div>
                {(msg.business || msg.person) && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {msg.business && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                        <Building2 size={9} />
                        {msg.business.le_name ?? msg.business.lf_name}
                      </span>
                    )}
                    {msg.person && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                        <User size={9} />
                        {msg.person.full_name}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>{total} total</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="disabled:opacity-40 hover:text-gray-800"
              >
                ←
              </button>
              <span>{page}/{pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-40 hover:text-gray-800"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thread panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedThread ? (
          <ThreadPanel threadId={selectedThread} onReply={openReply} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Mail size={40} className="opacity-20" />
            <p className="text-sm">Select a conversation</p>
          </div>
        )}
      </div>

      <EmailCompose
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => { setComposeOpen(false); fetchMessages(); }}
        defaultTo={composeTo}
        defaultSubject={composeSubject}
        defaultThreadId={composeThreadId}
      />
    </div>
  );
}
