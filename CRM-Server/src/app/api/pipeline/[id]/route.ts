import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const businessId = parseInt(id);
  const body = await req.json();

  const result = await prisma.pipelineStage.upsert({
    where: { business_id: businessId },
    create: {
      business_id: businessId,
      stage: body.stage,
      assigned_to: body.assigned_to,
    },
    update: {
      stage: body.stage,
      assigned_to: body.assigned_to,
      updated_at: new Date(),
    },
  });

  return NextResponse.json(result);
}
