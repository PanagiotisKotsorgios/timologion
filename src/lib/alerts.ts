import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";

/**
 * Compute the current value of a metric. Keep the switch flat so
 * adding a metric = one enum entry in the schema + one branch here.
 */
export async function evaluateMetric(metric: string): Promise<number> {
  const now = new Date();
  switch (metric) {
    case "errors_1h":
      return prisma.errorLog.count({
        where: {
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
          level: "error",
        },
      });
    case "errors_24h":
      return prisma.errorLog.count({
        where: {
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          level: "error",
        },
      });
    case "webhook_gap_hours": {
      const last = await prisma.wrappWebhookLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (!last) return 999;
      return (now.getTime() - last.createdAt.getTime()) / 3_600_000;
    }
    case "past_due_subs":
      return prisma.businessSubscription.count({
        where: { status: "past_due" },
      });
    case "backup_age_hours": {
      const last = await prisma.backupRun.findFirst({
        where: { status: "success" },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true },
      });
      if (!last?.finishedAt) return 9999;
      return (now.getTime() - last.finishedAt.getTime()) / 3_600_000;
    }
    case "active_sessions":
      return prisma.session.count({ where: { expiresAt: { gt: now } } });
    case "new_signups_24h":
      return prisma.user.count({
        where: {
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
    case "broken_documents":
      return prisma.document.count({
        where: {
          status: { not: "draft" },
          lines: { none: {} },
        },
      });
    default:
      return 0;
  }
}

function compare(comparator: string, observed: number, threshold: number): boolean {
  switch (comparator) {
    case "gt":
      return observed > threshold;
    case "gte":
      return observed >= threshold;
    case "lt":
      return observed < threshold;
    case "lte":
      return observed <= threshold;
    case "eq":
      return observed === threshold;
    default:
      return false;
  }
}

/**
 * Evaluate every enabled rule. For each rule that triggers AND is
 * outside its cooldown window, insert an AlertFiring row + send an
 * email. Called by the /api/cron/alerts endpoint.
 */
export async function evaluateAlertRules(): Promise<{
  evaluated: number;
  fired: number;
}> {
  const rules = await prisma.alertRule.findMany({
    where: { enabled: true },
  });
  const now = new Date();
  let fired = 0;

  for (const r of rules) {
    const observed = await evaluateMetric(r.metric);
    const triggers = compare(r.comparator, observed, Number(r.threshold));
    if (!triggers) continue;

    if (r.lastFiredAt) {
      const ageMs = now.getTime() - r.lastFiredAt.getTime();
      if (ageMs < r.cooldownMin * 60 * 1000) continue;
    }

    const firing = await prisma.alertFiring.create({
      data: {
        ruleId: r.id,
        metric: r.metric,
        observed,
        threshold: r.threshold,
        emailTo: r.emailTo,
      },
    });

    const link = `${env.APP_BASE_URL.replace(/\/$/, "")}/admin/alerts`;
    const sent = await sendEmail({
      to: { email: r.emailTo, name: "Admin" },
      subject: `[ALERT] ${r.name} — ${r.metric} ${r.comparator} ${r.threshold}`,
      html: `<p>Rule <strong>${escapeHtml(r.name)}</strong> triggered.</p>
             <ul>
               <li>Metric: <code>${r.metric}</code></li>
               <li>Observed: <strong>${observed}</strong></li>
               <li>Threshold: <strong>${Number(r.threshold)}</strong> (${r.comparator})</li>
             </ul>
             <p><a href="${link}">Open admin panel</a></p>`,
      text: `Rule ${r.name} triggered. ${r.metric} ${r.comparator} ${Number(r.threshold)} (observed ${observed}).`,
      tags: ["alert"],
    }).catch(() => ({ ok: false as const }));

    if (sent.ok) {
      await prisma.alertFiring.update({
        where: { id: firing.id },
        data: { sent: true },
      });
    }

    await prisma.alertRule.update({
      where: { id: r.id },
      data: { lastFiredAt: new Date() },
    });

    fired += 1;
  }

  return { evaluated: rules.length, fired };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
