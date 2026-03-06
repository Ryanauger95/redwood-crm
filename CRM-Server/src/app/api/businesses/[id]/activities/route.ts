import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const businessId = parseInt(id);

  const activities = await prisma.activity.findMany({
    where: { business_id: businessId },
    orderBy: { created_at: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(activities);
}
