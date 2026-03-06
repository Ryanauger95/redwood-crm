import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });
  if (!user) return NextResponse.json({ connected: false, email: null });

  const account = await prisma.gmailAccount.findUnique({ where: { user_id: user.id } });

  return NextResponse.json({
    connected: !!account,
    email: account?.gmail_email ?? null,
  });
}
