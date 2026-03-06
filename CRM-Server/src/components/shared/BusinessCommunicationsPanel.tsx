"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, ChevronRight, ExternalLink, Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmailCompose } from "./EmailCompose";

interface PersonTab {
  person_id: number;
  full_name: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface BusinessContext {
  le_name?: string | null;
  lf_name?: string | null;
  city?: string | null;
  state_code?: string | null;
  license_type?: string | null;
}

interface CachedEmail {
  id: number;
  message_id: string;
  thread_id: string;
  from_address: string;
  to_addresses: string;
  subject: string | null;
  snippet: string | null;
  body_html: string | null;
  body_text: string | null;
  sent_at: string | null;
  is_sent: boolean;
  person?: { person_id: number; full_name: string | null } | null;
}

interface Thread {
  thread_id: string;
  latest: CachedEmail;
  messages: CachedEmail[];
}

function formatDate(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseToAddresses(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return [raw]; }
}

function ThreadRow({
  thread,
  gmailConnected,
}: {
  thread: Thread;
  gmailConnected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fullMessages, setFullMessages] = useState<CachedEmail[]>(thread.messages);

  async function loadFullThread() {
    if (fullMessages.some((m) => m.body_html || m.body_text)) return;
    const res = await fetch(
      `/api/gmail/messages?thread_id=${encodeURIComponent(thread.thread_id)}&limit=50`
    );
    const data = await res.json();
    if (data.data?.length > 0) setFullMessages(data.data);
  }

  function toggle() {
    if (!expanded) loadFullThread();
    setExpanded((e) => !e);
  }

  const latest = thread.latest;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
            latest.is_sent ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
          )}
        >
          {latest.is_sent ? "Me" : (latest.from_address[0] ?? "?").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {latest.subject ?? "(no subject)"}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(latest.sent_at)}</span>
          </div>
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {latest.is_sent
              ? `To: ${parseToAddresses(latest.to_addresses)[0] ?? "?"}`
              : latest.from_address}
          </div>
          {!expanded && (
            <div className="text-xs text-gray-400 truncate mt-0.5">{latest.snippet}</div>
          )}
        </div>
        <ChevronRight
          size={14}
          className={cn("text-gray-400 flex-shrink-0 transition-transform", expanded && "rotate-90")}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
          {fullMessages
            .slice()
            .sort((a, b) => new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime())
            .map((msg) => (
              <div key={msg.message_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {msg.is_sent
                      ? `From: me → ${parseToAddresses(msg.to_addresses).join(", ")}`
                      : `From: ${msg.from_address}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatDate(msg.sent_at)}</span>
                    {gmailConnected && (
                      <Link
                        href="/communications"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink size={9} />
                        View
                      </Link>
                    )}
                  </div>
                </div>
                <div className="px-3 py-2">
                  {msg.body_html ? (
                    <iframe
                      srcDoc={msg.body_html}
                      className="w-full border-0"
                      style={{ minHeight: 120 }}
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        if (iframe.contentDocument?.body) {
                          iframe.style.height = iframe.contentDocument.body.scrollHeight + "px";
                        }
                      }}
                    />
                  ) : (
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {msg.body_text ?? msg.snippet ?? "(no content)"}
                    </pre>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function BusinessCommunicationsPanel({
  businessId,
  businessName,
  businessEmail,
  people,
  businessContext,
}: {
  businessId: number;
  businessName: string;
  businessEmail: string | null | undefined;
  people: PersonTab[];
  businessContext?: BusinessContext;
}) {
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [activePersonId, setActivePersonId] = useState<number | "business">("business");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");

  useEffect(() => {
    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then((d) => setGmailConnected(d.connected));
  }, []);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/businesses/${businessId}/emails`);
    const data = await res.json();
    setThreads(data.threads ?? []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Filter threads by active person or show all
  const visibleThreads =
    activePersonId === "business"
      ? threads
      : threads.filter(
          (t) =>
            t.messages.some((m) => m.person?.person_id === activePersonId) ||
            t.latest.person?.person_id === activePersonId
        );

  const activePerson =
    activePersonId !== "business"
      ? people.find((p) => p.person_id === activePersonId)
      : null;

  function openCompose(to?: string) {
    setComposeTo(to ?? businessEmail ?? "");
    setComposeOpen(true);
  }

  if (gmailConnected === null) {
    return <div className="text-sm text-gray-400 py-4">Loading...</div>;
  }

  if (!gmailConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
          <Mail size={20} className="text-blue-500" />
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-800 text-sm">Connect Gmail to view emails</p>
          <p className="text-xs text-gray-500 mt-1">
            Link your Gmail account to track communications with this business.
          </p>
        </div>
        <a
          href="/api/gmail/auth"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Connect Gmail
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with person tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActivePersonId("business")}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activePersonId === "business"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            All
          </button>
          {people
            .filter((p) => p.email)
            .map((p) => (
              <button
                key={p.person_id}
                onClick={() => setActivePersonId(p.person_id)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activePersonId === p.person_id
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
              </button>
            ))}
        </div>
        <button
          onClick={() => openCompose(activePerson?.email ?? businessEmail ?? "")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        >
          <Send size={13} />
          Send Email
        </button>
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="text-sm text-gray-400 py-4">Loading communications...</div>
      ) : visibleThreads.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Mail size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No emails yet</p>
          <button
            onClick={() => openCompose()}
            className="mt-2 text-blue-500 hover:underline text-xs"
          >
            Send first email
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleThreads.map((thread) => (
            <ThreadRow key={thread.thread_id} thread={thread} gmailConnected={gmailConnected} />
          ))}
        </div>
      )}

      <EmailCompose
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => { setComposeOpen(false); fetchThreads(); }}
        defaultTo={composeTo}
        business={businessContext}
        person={activePerson ?? undefined}
      />
    </div>
  );
}
