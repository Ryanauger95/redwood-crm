import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string })?.id || "0");
  const body = await req.json();
  const { entity, ids, allFilters, field, value } = body;

  if (!entity || !field) {
    return NextResponse.json({ error: "Missing entity or field" }, { status: 400 });
  }

  try {
    if (entity === "businesses") {
      const businessIds = ids ? ids.map((id: number) => id) : [];

      if (field === "stage") {
        // Bulk stage update via pipeline_stages table
        for (const bizId of businessIds) {
          await prisma.pipelineStage.upsert({
            where: { business_id: bizId },
            create: { business_id: bizId, stage: value },
            update: { stage: value, updated_at: new Date() },
          });
          if (userId) {
            await logAudit({ userId, action: "bulk_update", entityType: "business", entityId: bizId, fieldName: "stage", newValue: value });
          }
        }
      } else if (field === "assigned_user_id") {
        const assignId = value ? parseInt(value) : null;
        await prisma.business.updateMany({
          where: { business_id: { in: businessIds } },
          data: { assigned_user_id: assignId, updated_at: new Date() },
        });
        for (const bizId of businessIds) {
          if (userId) await logAudit({ userId, action: "bulk_update", entityType: "business", entityId: bizId, fieldName: "assigned_user_id", newValue: value });
        }
      } else {
        await prisma.business.updateMany({
          where: { business_id: { in: businessIds } },
          data: { [field]: value || null, updated_at: new Date() },
        });
      }
    } else if (entity === "properties") {
      const propIds = ids ? ids.map((id: string) => BigInt(id)) : [];
      if (field === "assigned_user_id") {
        const assignId = value ? parseInt(value) : null;
        await prisma.property.updateMany({
          where: { id: { in: propIds } },
          data: { assigned_user_id: assignId, updated_at: new Date() },
        });
      } else {
        await prisma.property.updateMany({
          where: { id: { in: propIds } },
          data: { [field]: value || null, updated_at: new Date() },
        });
      }
    } else if (entity === "contacts") {
      const personIds = ids ? ids.map((id: number) => id) : [];
      await prisma.person.updateMany({
        where: { person_id: { in: personIds } },
        data: { [field]: value || null },
      });
    }

    return NextResponse.json({ success: true, count: ids?.length || 0 });
  } catch (err) {
    console.error("Bulk update error:", err);
    return NextResponse.json({ error: "Bulk update failed" }, { status: 500 });
  }
}
