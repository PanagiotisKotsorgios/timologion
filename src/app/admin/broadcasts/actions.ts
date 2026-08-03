"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  segment: z.enum([
    "all_users",
    "owners",
    "admins",
    "paying_owners",
    "free_users",
  ]),
  subject: z.string().min(2).max(200),
  bodyHtml: z.string().min(5).max(50_000),
  dryRun: z.union([z.literal("1"), z.literal("")]).optional(),
});

type Recipient = { email: string; name: string };

async function selectRecipients(segment: string): Promise<Recipient[]> {
  const baseWhere = {
    suspendedAt: null,
    emailVerifiedAt: { not: null },
  } as const;

  switch (segment) {
    case "all_users":
      return prisma.user
        .findMany({
          where: baseWhere,
          select: { email: true, fullName: true },
        })
        .then((rs) => rs.map((r) => ({ email: r.email, name: r.fullName })));
    case "owners": {
      const rows = await prisma.user.findMany({
        where: {
          ...baseWhere,
          memberships: { some: { role: "owner" } },
        },
        select: { email: true, fullName: true },
        distinct: ["id"],
      });
      return rows.map((r) => ({ email: r.email, name: r.fullName }));
    }
    case "admins":
      return prisma.user
        .findMany({
          where: { ...baseWhere, platformRole: { not: null } },
          select: { email: true, fullName: true },
        })
        .then((rs) => rs.map((r) => ({ email: r.email, name: r.fullName })));
    case "paying_owners": {
      const rows = await prisma.user.findMany({
        where: {
          ...baseWhere,
          memberships: {
            some: {
              role: "owner",
              business: {
                subscriptions: {
                  some: { status: { in: ["active", "trialing"] } },
                },
              },
            },
          },
        },
        select: { email: true, fullName: true },
        distinct: ["id"],
      });
      return rows.map((r) => ({ email: r.email, name: r.fullName }));
    }
    case "free_users": {
      const rows = await prisma.user.findMany({
        where: {
          ...baseWhere,
          memberships: {
            some: {
              business: {
                subscriptions: {
                  none: { status: { in: ["active", "trialing"] } },
                },
              },
            },
          },
        },
        select: { email: true, fullName: true },
        distinct: ["id"],
      });
      return rows.map((r) => ({ email: r.email, name: r.fullName }));
    }
    default:
      return [];
  }
}

export type BroadcastState =
  | { ok: true; recipients: number; sent: number; failed: number; dryRun: boolean }
  | { ok: false; error: string }
  | undefined;

export async function sendBroadcastAction(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  const ctx = await requireAdmin("super_admin");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const dryRun = parsed.data.dryRun === "1";
  const recipients = await selectRecipients(parsed.data.segment);
  const uniq = new Map(recipients.map((r) => [r.email.toLowerCase(), r]));
  const list = Array.from(uniq.values());

  let sent = 0;
  let failed = 0;

  if (!dryRun) {
    for (const rec of list) {
      try {
        const res = await sendEmail({
          to: rec,
          subject: parsed.data.subject,
          html: parsed.data.bodyHtml,
          text: htmlToPlain(parsed.data.bodyHtml),
          tags: ["broadcast", parsed.data.segment],
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }

  await prisma.broadcast.create({
    data: {
      senderId: ctx.userId,
      segment: parsed.data.segment,
      subject: parsed.data.subject.slice(0, 500),
      bodyHtml: parsed.data.bodyHtml.slice(0, 50_000),
      recipients: list.length,
      sent,
      failed,
      dryRun,
    },
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.broadcast.send",
    meta: {
      segment: parsed.data.segment,
      subject: parsed.data.subject,
      recipients: list.length,
      sent,
      failed,
      dryRun,
    },
  });

  revalidatePath("/admin/broadcasts");
  return {
    ok: true,
    recipients: list.length,
    sent,
    failed,
    dryRun,
  };
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
