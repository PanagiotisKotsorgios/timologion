import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";
import { withCronLog } from "@/lib/cron-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fires open CRM tasks that are due today or overdue as notifications.
 * Runs once a day. Idempotent-ish: won't re-notify a task in the same day
 * because we filter by `notifiedAt IS NULL OR notifiedAt < today`.
 */
export async function GET(req: Request) {
  const unauth = authorizeCron(req);
  if (unauth) return unauth;
  const wrapped = await withCronLog("reminders", () => runReminders());
  if (!wrapped.ok) {
    return NextResponse.json({ ok: false, error: wrapped.error }, { status: 500 });
  }
  return NextResponse.json(wrapped.result);
}

async function runReminders() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tasks = await prisma.crmTask.findMany({
    where: {
      status: "open",
      OR: [{ dueAt: { lte: now } }, { reminderAt: { lte: now } }],
    },
    select: {
      id: true,
      businessId: true,
      assigneeId: true,
      title: true,
      dueAt: true,
    },
    take: 500,
  });

  let created = 0;
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const alreadyNotifiedToday = await prisma.notification.count({
      where: {
        userId: t.assigneeId,
        entityType: "CrmTask",
        entityId: t.id,
        createdAt: { gte: startOfToday },
      },
    });
    if (alreadyNotifiedToday > 0) continue;

    const overdue = t.dueAt && t.dueAt.getTime() < now.getTime();
    await prisma.notification.create({
      data: {
        userId: t.assigneeId,
        businessId: t.businessId,
        entityType: "CrmTask",
        entityId: t.id,
        tone: overdue ? "warning" : "info",
        title: overdue ? "Ξεπερασμένο task" : "Task προς εκτέλεση",
        body: t.title.slice(0, 240),
        href: "/app/crm/tasks",
      },
    });
    created += 1;
  }

  return {
    result: { ok: true, tasks: tasks.length, notifications: created },
    itemsDone: created,
  };
}
