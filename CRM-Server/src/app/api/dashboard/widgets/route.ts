import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fetchWidgetData, getWidgetType } from "@/lib/dashboardWidgets";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string })?.id || "0");

  // Get user's widget config, or default widgets
  let userWidgets = await prisma.userDashboardWidget.findMany({
    where: { user_id: userId },
    orderBy: { sort_order: "asc" },
    include: { widget: true },
  });

  // If no user widgets configured, use defaults
  if (userWidgets.length === 0) {
    const defaults = await prisma.dashboardWidget.findMany({
      where: { is_default: true },
      orderBy: { id: "asc" },
    });
    // Auto-create user widget entries for defaults
    if (defaults.length > 0) {
      await prisma.userDashboardWidget.createMany({
        data: defaults.map((w, i) => ({
          user_id: userId,
          widget_id: w.id,
          sort_order: i,
          is_visible: true,
        })),
        skipDuplicates: true,
      });
      userWidgets = await prisma.userDashboardWidget.findMany({
        where: { user_id: userId },
        orderBy: { sort_order: "asc" },
        include: { widget: true },
      });
    }
  }

  // Fetch data for each visible widget
  const results = await Promise.all(
    userWidgets
      .filter((uw) => uw.is_visible)
      .map(async (uw) => {
        const result = await fetchWidgetData(uw.widget.query_key, userId);
        return {
          id: uw.id,
          widget_id: uw.widget_id,
          query_key: uw.widget.query_key,
          name: uw.widget.name,
          description: uw.widget.description,
          category: uw.widget.category,
          sort_order: uw.sort_order,
          is_visible: uw.is_visible,
          type: result?.type ?? getWidgetType(uw.widget.query_key),
          data: result?.data ?? null,
        };
      })
  );

  return NextResponse.json(results);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string })?.id || "0");
  const body = await req.json();

  // body.widgets: { widget_id, sort_order, is_visible }[]
  if (Array.isArray(body.widgets)) {
    for (const w of body.widgets) {
      await prisma.userDashboardWidget.upsert({
        where: { user_id_widget_id: { user_id: userId, widget_id: w.widget_id } },
        create: { user_id: userId, widget_id: w.widget_id, sort_order: w.sort_order, is_visible: w.is_visible },
        update: { sort_order: w.sort_order, is_visible: w.is_visible },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
