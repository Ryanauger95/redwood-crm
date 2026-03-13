import { prisma } from "@/lib/prisma";

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  fieldName,
  oldValue,
  newValue,
}: {
  userId: number;
  action: string;
  entityType: string;
  entityId: string | number;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        field_name: fieldName ?? null,
        old_value: oldValue !== undefined ? (oldValue as object) : undefined,
        new_value: newValue !== undefined ? (newValue as object) : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
