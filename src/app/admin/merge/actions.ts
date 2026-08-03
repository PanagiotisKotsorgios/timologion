"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const businessSchema = z.object({
  winnerId: z.string().min(1),
  loserIds: z.string().min(1),
  confirm: z.literal("MERGE"),
});

/**
 * Merge duplicate businesses. For each loser we reassign every FK
 * pointing at businessId to the winner, then delete the loser row.
 * Everything runs in one transaction so a mid-merge failure rolls
 * back cleanly.
 *
 * The list of tables touched below mirrors every `businessId` FK in
 * schema.prisma. Adding a new business-scoped table = adding one
 * updateMany line here.
 */
export async function mergeBusinessesAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin("super_admin");
  const parsed = businessSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect("/admin/merge?err=confirm");
  }

  const winnerId = parsed.data.winnerId;
  const loserIds = parsed.data.loserIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== winnerId);
  if (loserIds.length === 0) {
    redirect("/admin/merge?err=no_losers");
  }

  const winner = await prisma.business.findUnique({
    where: { id: winnerId },
    select: { id: true, vatNumber: true },
  });
  if (!winner) {
    redirect("/admin/merge?err=no_winner");
  }

  const losers = await prisma.business.findMany({
    where: { id: { in: loserIds } },
    select: { id: true, vatNumber: true },
  });
  if (losers.some((l) => l.vatNumber !== winner.vatNumber)) {
    redirect("/admin/merge?err=vat_mismatch");
  }

  // For each loser, reassign then delete. Do it inside a single tx.
  await prisma.$transaction(async (tx) => {
    for (const loserId of loserIds) {
      const w = { where: { businessId: loserId }, data: { businessId: winnerId } };
      await tx.document.updateMany(w);
      await tx.client.updateMany(w);
      await tx.item.updateMany(w);
      await tx.auditLog.updateMany(w);
      await tx.branch.updateMany(w);
      await tx.billingBook.updateMany(w);
      await tx.businessSubscription.updateMany(w);
      await tx.platformInvoice.updateMany(w);
      await tx.providerCost.updateMany(w);
      await tx.payment.updateMany(w);
      await tx.recurringDocument.updateMany(w);
      await tx.tag.updateMany(w);
      await tx.posTable.updateMany(w);
      await tx.posTab.updateMany(w);
      await tx.lead.updateMany(w);
      await tx.opportunity.updateMany(w);
      await tx.crmTask.updateMany(w);
      await tx.supplier.updateMany(w);
      await tx.expense.updateMany(w);
      await tx.expensePayment.updateMany(w);
      await tx.pluginActivation.updateMany(w);
      await tx.appointment.updateMany(w);
      await tx.supportTicket.updateMany(w);
      // Notifications reference businessId nullable — keep them.
      await tx.notification.updateMany(w);

      // BusinessMember: unique on (businessId, userId). Delete winner-side
      // conflicts before reassigning so we don't hit a unique violation.
      const loserMembers = await tx.businessMember.findMany({
        where: { businessId: loserId },
        select: { userId: true },
      });
      for (const m of loserMembers) {
        const existing = await tx.businessMember.findFirst({
          where: { businessId: winnerId, userId: m.userId },
        });
        if (existing) {
          await tx.businessMember.delete({
            where: { id: (await tx.businessMember.findFirstOrThrow({
              where: { businessId: loserId, userId: m.userId },
            })).id },
          });
        }
      }
      await tx.businessMember.updateMany({
        where: { businessId: loserId },
        data: { businessId: winnerId },
      });

      // Same pattern for other business-unique tables:
      // WrappConnection (unique on businessId) — keep winner's; delete loser's.
      await tx.wrappConnection.deleteMany({ where: { businessId: loserId } });

      // Feature flag overrides — unique on (businessId, flagKey). Prefer
      // winner's existing override.
      const loserFlags = await tx.businessFeatureFlag.findMany({
        where: { businessId: loserId },
        select: { flagKey: true },
      });
      for (const f of loserFlags) {
        const existing = await tx.businessFeatureFlag.findUnique({
          where: {
            businessId_flagKey: { businessId: winnerId, flagKey: f.flagKey },
          },
        });
        if (existing) {
          await tx.businessFeatureFlag.delete({
            where: {
              businessId_flagKey: { businessId: loserId, flagKey: f.flagKey },
            },
          });
        }
      }
      await tx.businessFeatureFlag.updateMany({
        where: { businessId: loserId },
        data: { businessId: winnerId },
      });

      // Rate-limit overrides similarly.
      const loserRl = await tx.rateLimitOverride.findMany({
        where: { businessId: loserId },
        select: { action: true },
      });
      for (const r of loserRl) {
        const existing = await tx.rateLimitOverride.findUnique({
          where: {
            businessId_action: { businessId: winnerId, action: r.action },
          },
        });
        if (existing) {
          await tx.rateLimitOverride.delete({
            where: {
              businessId_action: { businessId: loserId, action: r.action },
            },
          });
        }
      }
      await tx.rateLimitOverride.updateMany({
        where: { businessId: loserId },
        data: { businessId: winnerId },
      });

      await tx.platformAnnouncement.updateMany({
        where: { businessId: loserId },
        data: { businessId: winnerId },
      });

      // Finally drop the loser row.
      await tx.business.delete({ where: { id: loserId } });
    }
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.business.merge",
    entityType: "Business",
    entityId: winnerId,
    meta: { winnerId, loserIds, vat: winner.vatNumber },
  });

  revalidatePath("/admin/merge");
  revalidatePath("/admin/businesses");
  revalidatePath(`/admin/businesses/${winnerId}`);
  redirect(`/admin/businesses/${winnerId}?merged=1`);
}

const userSchema = z.object({
  winnerId: z.string().min(1),
  loserIds: z.string().min(1),
  confirm: z.literal("MERGE"),
});

/**
 * Merge duplicate users. Reassigns memberships (with dedupe) + audit
 * logs + sessions + notifications + support tickets, deletes the
 * losers.
 */
export async function mergeUsersAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin("super_admin");
  const parsed = userSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect("/admin/merge?err=confirm");
  }

  const winnerId = parsed.data.winnerId;
  const loserIds = parsed.data.loserIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== winnerId);
  if (loserIds.length === 0) {
    redirect("/admin/merge?err=no_losers");
  }
  if (loserIds.includes(ctx.userId)) {
    redirect("/admin/merge?err=self_delete");
  }

  await prisma.$transaction(async (tx) => {
    for (const loserId of loserIds) {
      // BusinessMember unique (businessId, userId): dedupe before reassign.
      const loserMembers = await tx.businessMember.findMany({
        where: { userId: loserId },
        select: { businessId: true, id: true },
      });
      for (const m of loserMembers) {
        const dupe = await tx.businessMember.findFirst({
          where: { userId: winnerId, businessId: m.businessId },
        });
        if (dupe) {
          await tx.businessMember.delete({ where: { id: m.id } });
        }
      }
      await tx.businessMember.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      });

      await tx.session.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      });
      await tx.notification.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      });
      await tx.auditLog.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      });
      await tx.passwordReset.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      });
      await tx.supportTicket.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      });
      await tx.supportMessage.updateMany({
        where: { senderId: loserId },
        data: { senderId: winnerId },
      });

      // OAuth accounts unique on (provider, providerAccountId). If loser
      // has a Google account and winner already has one, just drop the
      // loser's to avoid the unique violation.
      const loserOauth = await tx.oAuthAccount.findMany({
        where: { userId: loserId },
      });
      for (const a of loserOauth) {
        const dupe = await tx.oAuthAccount.findFirst({
          where: { userId: winnerId, provider: a.provider },
        });
        if (dupe) {
          await tx.oAuthAccount.delete({ where: { id: a.id } });
        } else {
          await tx.oAuthAccount.update({
            where: { id: a.id },
            data: { userId: winnerId },
          });
        }
      }

      await tx.user.delete({ where: { id: loserId } });
    }
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.user.merge",
    entityType: "User",
    entityId: winnerId,
    meta: { winnerId, loserIds },
  });

  revalidatePath("/admin/merge");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${winnerId}`);
  redirect(`/admin/users/${winnerId}?merged=1`);
}
