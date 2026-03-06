import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { makeOAuthClient } from "@/lib/gmail";

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.crmUser.findUnique({ where: { email: session.user!.email! } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await prisma.gmailAccount.findUnique({ where: { user_id: user.id } });
  if (account) {
    // Attempt to revoke the token with Google
    try {
      const client = makeOAuthClient();
      client.setCredentials({ access_token: account.access_token });
      await client.revokeCredentials();
    } catch {
      // Best effort — still delete from DB
    }
    await prisma.gmailAccount.delete({ where: { user_id: user.id } });
  }

  return NextResponse.json({ success: true });
}
