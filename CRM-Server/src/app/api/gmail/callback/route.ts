import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeOAuthClient } from "@/lib/gmail";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId

  if (!code || !state) {
    return NextResponse.redirect(new URL("/communications?error=oauth_failed", req.url));
  }

  const userId = parseInt(state);
  if (isNaN(userId)) {
    return NextResponse.redirect(new URL("/communications?error=oauth_failed", req.url));
  }

  try {
    const client = makeOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get Gmail address
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();

    await prisma.gmailAccount.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        gmail_email: userInfo.email!,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      update: {
        gmail_email: userInfo.email!,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token ?? undefined,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        updated_at: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/communications?connected=1", req.url));
  } catch {
    return NextResponse.redirect(new URL("/communications?error=oauth_failed", req.url));
  }
}
