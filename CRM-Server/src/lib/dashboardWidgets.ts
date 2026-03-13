import { prisma } from "@/lib/prisma";

export type WidgetType = "stat" | "list" | "chart";

export interface WidgetResult {
  query_key: string;
  name: string;
  description: string | null;
  category: string;
  type: WidgetType;
  data: unknown;
}

interface WidgetDef {
  type: WidgetType;
  fetch: (userId: number) => Promise<unknown>;
}

const widgetRegistry: Record<string, WidgetDef> = {
  my_assigned_businesses: {
    type: "stat",
    fetch: async (userId) => {
      const count = await prisma.business.count({ where: { assigned_user_id: userId } });
      return { value: count, label: "My Businesses" };
    },
  },
  my_assigned_properties: {
    type: "stat",
    fetch: async (userId) => {
      const count = await prisma.property.count({ where: { assigned_user_id: userId } });
      return { value: count, label: "My Properties" };
    },
  },
  my_open_tasks: {
    type: "stat",
    fetch: async (userId) => {
      const count = await prisma.activity.count({
        where: { user_id: userId, type: "task", status: "open" },
      });
      return { value: count, label: "Open Tasks" };
    },
  },
  overdue_tasks: {
    type: "stat",
    fetch: async (userId) => {
      const count = await prisma.activity.count({
        where: {
          user_id: userId,
          type: "task",
          status: "open",
          due_date: { lt: new Date() },
        },
      });
      return { value: count, label: "Overdue Tasks" };
    },
  },
  contacted_this_week: {
    type: "stat",
    fetch: async (userId) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const count = await prisma.activity.count({
        where: {
          user_id: userId,
          type: { in: ["call", "email"] },
          created_at: { gte: weekAgo },
        },
      });
      return { value: count, label: "Contacted This Week" };
    },
  },
  pipeline_summary: {
    type: "chart",
    fetch: async (userId) => {
      const stages = await prisma.pipelineStage.groupBy({
        by: ["stage"],
        _count: { stage: true },
        where: { business: { assigned_user_id: userId } },
      });
      const data = stages.map((s) => ({ stage: s.stage, count: s._count.stage }));
      return { items: data, label: "My Pipeline" };
    },
  },
  recent_activities: {
    type: "list",
    fetch: async (userId) => {
      const activities = await prisma.activity.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          created_at: true,
          business: { select: { business_id: true, le_name: true, lf_name: true } },
          person: { select: { person_id: true, full_name: true } },
        },
      });
      return { items: activities, label: "Recent Activities" };
    },
  },
  total_businesses: {
    type: "stat",
    fetch: async () => {
      const count = await prisma.business.count();
      return { value: count, label: "Total Businesses" };
    },
  },
  total_properties: {
    type: "stat",
    fetch: async () => {
      const count = await prisma.property.count();
      return { value: count, label: "Total Properties" };
    },
  },
  total_contacts: {
    type: "stat",
    fetch: async () => {
      const count = await prisma.person.count();
      return { value: count, label: "Total Contacts" };
    },
  },
  enrichment_progress: {
    type: "chart",
    fetch: async () => {
      const counts = await prisma.business.groupBy({
        by: ["enrichment_status"],
        _count: { enrichment_status: true },
      });
      const items = counts.map((c) => ({ status: c.enrichment_status, count: c._count.enrichment_status }));
      return { items, label: "Enrichment Progress" };
    },
  },
  full_pipeline_summary: {
    type: "chart",
    fetch: async () => {
      const stages = await prisma.pipelineStage.groupBy({
        by: ["stage"],
        _count: { stage: true },
      });
      const data = stages.map((s) => ({ stage: s.stage, count: s._count.stage }));
      return { items: data, label: "Pipeline Overview" };
    },
  },
};

export async function fetchWidgetData(
  queryKey: string,
  userId: number
): Promise<{ type: WidgetType; data: unknown } | null> {
  const def = widgetRegistry[queryKey];
  if (!def) return null;
  const data = await def.fetch(userId);
  return { type: def.type, data };
}

export function getWidgetType(queryKey: string): WidgetType {
  return widgetRegistry[queryKey]?.type ?? "stat";
}
