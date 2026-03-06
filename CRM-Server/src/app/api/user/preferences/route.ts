import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const key = req.nextUrl.searchParams.get("key");

  if (key) {
    const pref = await prisma.userPreference.findUnique({ where: { user_id_key: { user_id: userId, key } } });
    return NextResponse.json(pref?.value ?? {});
  }

  const prefs = await prisma.userPreference.findMany({ where: { user_id: userId } });
  const result: Record<string, unknown> = {};
  for (const p of prefs) result[p.key] = p.value;
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);
  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const pref = await prisma.userPreference.upsert({
    where: { user_id_key: { user_id: userId, key } },
    update: { value },
    create: { user_id: userId, key, value },
  });

  return NextResponse.json(pref.value);
}
