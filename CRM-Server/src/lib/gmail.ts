import { google } from "googleapis";
import { prisma } from "./prisma";

export function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/gmail/callback`
  );
}

export function getAuthUrl(userId: number): string {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
    state: String(userId),
  });
}

export async function getAuthedClient(userId: number) {
  const account = await prisma.gmailAccount.findUnique({
    where: { user_id: userId },
  });
  if (!account) throw new Error("Gmail not connected");

  const client = makeOAuthClient();
  client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.token_expiry?.getTime(),
  });

  // Persist refreshed tokens automatically
  client.on("tokens", async (tokens) => {
    const data: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (tokens.access_token) data.access_token = tokens.access_token;
    if (tokens.expiry_date) data.token_expiry = new Date(tokens.expiry_date);
    await prisma.gmailAccount.update({
      where: { user_id: userId },
      data,
    });
  });

  return client;
}

// ─── Message parsing ────────────────────────────────────────────────────────

function getHeader(headers: { name: string; value: string }[], name: string) {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractBody(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: unknown[];
}): { text: string; html: string } {
  let text = "";
  let html = "";

  function walk(part: {
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  }) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      for (const sub of part.parts as typeof part[]) {
        walk(sub);
      }
    }
  }

  walk(payload);
  return { text, html };
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function syncMessages(userId: number, maxResults = 100) {
  const client = await getAuthedClient(userId);
  const gmail = google.gmail({ version: "v1", auth: client });

  const account = await prisma.gmailAccount.findUnique({
    where: { user_id: userId },
  });
  if (!account) return 0;

  // Fetch last N message IDs (inbox + sent)
  const [inboxRes, sentRes] = await Promise.all([
    gmail.users.messages.list({
      userId: "me",
      maxResults: Math.floor(maxResults / 2),
      labelIds: ["INBOX"],
    }),
    gmail.users.messages.list({
      userId: "me",
      maxResults: Math.floor(maxResults / 2),
      labelIds: ["SENT"],
    }),
  ]);

  const messageIds = new Set<string>();
  for (const msg of inboxRes.data.messages ?? []) {
    if (msg.id) messageIds.add(msg.id);
  }
  for (const msg of sentRes.data.messages ?? []) {
    if (msg.id) messageIds.add(msg.id);
  }

  // Look up businesses and people by email for auto-linking
  const [businesses, people] = await Promise.all([
    prisma.business.findMany({
      where: { email: { not: null } },
      select: { business_id: true, email: true },
    }),
    prisma.person.findMany({
      where: { email: { not: null } },
      select: { person_id: true, email: true },
    }),
  ]);

  const businessByEmail = new Map(
    businesses.map((b) => [b.email!.toLowerCase(), b.business_id])
  );
  const personByEmail = new Map(
    people.map((p) => [p.email!.toLowerCase(), p.person_id])
  );

  function findLinks(addresses: string[]) {
    let business_id: number | null = null;
    let person_id: number | null = null;
    for (const addr of addresses) {
      const lower = addr.toLowerCase();
      if (!business_id && businessByEmail.has(lower)) {
        business_id = businessByEmail.get(lower)!;
      }
      if (!person_id && personByEmail.has(lower)) {
        person_id = personByEmail.get(lower)!;
      }
    }
    return { business_id, person_id };
  }

  // Fetch full messages in batches of 10
  let synced = 0;
  const ids = Array.from(messageIds);

  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const results = await Promise.all(
      batch.map((id) =>
        gmail.users.messages.get({ userId: "me", id, format: "full" }).catch(() => null)
      )
    );

    for (const res of results) {
      if (!res?.data) continue;
      const msg = res.data;
      const headers = (msg.payload?.headers ?? []) as { name: string; value: string }[];
      const fromRaw = getHeader(headers, "from");
      const toRaw = getHeader(headers, "to");
      const subject = getHeader(headers, "subject");
      const dateStr = getHeader(headers, "date");

      const fromAddr = fromRaw.match(/<([^>]+)>/)?.[1] ?? fromRaw;
      const toAddrs = toRaw
        .split(",")
        .map((t) => t.match(/<([^>]+)>/)?.[1] ?? t.trim())
        .filter(Boolean);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { text, html } = extractBody((msg.payload ?? {}) as any);
      const isSent = (msg.labelIds ?? []).includes("SENT");

      const allAddresses = [fromAddr, ...toAddrs];
      const { business_id, person_id } = findLinks(allAddresses);

      await prisma.cachedEmail.upsert({
        where: { message_id: msg.id! },
        create: {
          message_id: msg.id!,
          thread_id: msg.threadId!,
          gmail_account_id: account.id,
          from_address: fromRaw,
          to_addresses: JSON.stringify(toAddrs),
          subject: subject || null,
          snippet: msg.snippet ?? null,
          body_text: text || null,
          body_html: html || null,
          sent_at: dateStr ? new Date(dateStr) : null,
          is_read: !(msg.labelIds ?? []).includes("UNREAD"),
          is_sent: isSent,
          business_id,
          person_id,
          synced_at: new Date(),
        },
        update: {
          snippet: msg.snippet ?? null,
          is_read: !(msg.labelIds ?? []).includes("UNREAD"),
          synced_at: new Date(),
        },
      });
      synced++;
    }
  }

  return synced;
}

// ─── Search (re-sync results matching Gmail query) ────────────────────────────

export async function searchAndSync(userId: number, query: string, maxResults = 20) {
  const client = await getAuthedClient(userId);
  const gmail = google.gmail({ version: "v1", auth: client });

  const account = await prisma.gmailAccount.findUnique({
    where: { user_id: userId },
  });
  if (!account) return;

  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const ids = (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);

  // Check which ones are already cached
  const existing = await prisma.cachedEmail.findMany({
    where: { message_id: { in: ids } },
    select: { message_id: true },
  });
  const existingIds = new Set(existing.map((e) => e.message_id));
  const missing = ids.filter((id) => !existingIds.has(id));

  if (missing.length === 0) return;

  // Sync missing ones (reuse main sync logic via a mini-run)
  const [businesses, people] = await Promise.all([
    prisma.business.findMany({ where: { email: { not: null } }, select: { business_id: true, email: true } }),
    prisma.person.findMany({ where: { email: { not: null } }, select: { person_id: true, email: true } }),
  ]);
  const businessByEmail = new Map(businesses.map((b) => [b.email!.toLowerCase(), b.business_id]));
  const personByEmail = new Map(people.map((p) => [p.email!.toLowerCase(), p.person_id]));

  for (const id of missing) {
    const msgRes = await gmail.users.messages.get({ userId: "me", id, format: "full" }).catch(() => null);
    if (!msgRes?.data) continue;
    const msg = msgRes.data;
    const headers = (msg.payload?.headers ?? []) as { name: string; value: string }[];
    const fromRaw = getHeader(headers, "from");
    const toRaw = getHeader(headers, "to");
    const subject = getHeader(headers, "subject");
    const dateStr = getHeader(headers, "date");
    const fromAddr = fromRaw.match(/<([^>]+)>/)?.[1] ?? fromRaw;
    const toAddrs = toRaw.split(",").map((t) => t.match(/<([^>]+)>/)?.[1] ?? t.trim()).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { text, html } = extractBody((msg.payload ?? {}) as any);
    const isSent = (msg.labelIds ?? []).includes("SENT");
    const allAddresses = [fromAddr, ...toAddrs];
    let business_id: number | null = null;
    let person_id: number | null = null;
    for (const addr of allAddresses) {
      const lower = addr.toLowerCase();
      if (!business_id && businessByEmail.has(lower)) business_id = businessByEmail.get(lower)!;
      if (!person_id && personByEmail.has(lower)) person_id = personByEmail.get(lower)!;
    }

    await prisma.cachedEmail.upsert({
      where: { message_id: msg.id! },
      create: {
        message_id: msg.id!,
        thread_id: msg.threadId!,
        gmail_account_id: account.id,
        from_address: fromRaw,
        to_addresses: JSON.stringify(toAddrs),
        subject: subject || null,
        snippet: msg.snippet ?? null,
        body_text: text || null,
        body_html: html || null,
        sent_at: dateStr ? new Date(dateStr) : null,
        is_read: !(msg.labelIds ?? []).includes("UNREAD"),
        is_sent: isSent,
        business_id,
        person_id,
        synced_at: new Date(),
      },
      update: { synced_at: new Date() },
    });
  }
}
