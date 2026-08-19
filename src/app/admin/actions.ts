"use server";

import { randomBytes, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { formatZodError } from "@/lib/zod-el";

// ─── Businesses ────────────────────────────────────────────────────────

const businessSuspendSchema = z.object({
  businessId: z.string().min(1),
  reason: z.string().max(255).optional().or(z.literal("")),
});

export async function suspendBusinessAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = businessSuspendSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return;

  await prisma.business.update({
    where: { id: parsed.data.businessId },
    data: {
      suspendedAt: new Date(),
      suspendedReason: parsed.data.reason || "Χωρίς αιτιολογία",
    },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: parsed.data.businessId,
    action: "platform.business.suspend",
    entityType: "Business",
    entityId: parsed.data.businessId,
    meta: { reason: parsed.data.reason },
  });
  revalidatePath(`/admin/businesses/${parsed.data.businessId}`);
  revalidatePath("/admin/businesses");
}

export async function unsuspendBusinessAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const id = String(formData.get("businessId") ?? "");
  if (!id) return;
  await prisma.business.update({
    where: { id },
    data: { suspendedAt: null, suspendedReason: null },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: id,
    action: "platform.business.unsuspend",
    entityType: "Business",
    entityId: id,
  });
  revalidatePath(`/admin/businesses/${id}`);
  revalidatePath("/admin/businesses");
}

// ─── Users ─────────────────────────────────────────────────────────────

const userSuspendSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(255).optional().or(z.literal("")),
});

export async function banUserAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = userSuspendSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return;
  if (parsed.data.userId === ctx.userId) return;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.data.userId },
      data: {
        suspendedAt: new Date(),
        suspendedReason: parsed.data.reason || "Χωρίς αιτιολογία",
      },
    });
    // Invalidate all sessions so the user is immediately signed out.
    await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
  });

  await logAudit({
    userId: ctx.userId,
    action: "platform.user.ban",
    entityType: "User",
    entityId: parsed.data.userId,
    meta: { reason: parsed.data.reason },
  });
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/admin/users");
}

export async function unbanUserAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const id = String(formData.get("userId") ?? "");
  if (!id) return;
  await prisma.user.update({
    where: { id },
    data: { suspendedAt: null, suspendedReason: null },
  });
  await logAudit({
    userId: ctx.userId,
    action: "platform.user.unban",
    entityType: "User",
    entityId: id,
  });
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/users");
}

/**
 * Permanently delete a user + their sole-owned businesses so the
 * email can be used to re-register from scratch. Distinct from ban:
 *   - ban keeps the row (soft delete via suspendedAt) so audit trails
 *     stay intact and the email is still "used".
 *   - purge wipes the user entirely, which cascades to sessions,
 *     oauthAccounts, businessMembers, and any Business rows this
 *     user was the last owner of (via businessMember cascade delete
 *     + our sole-owned business detection).
 *
 * Super-admin only — support can suspend/unsuspend but not purge.
 * Snapshot written to accountDeletionLog first so we can audit who
 * deleted whom and why. Guarded against self-delete (would kick you
 * out of admin) and against deleting the last super_admin (would
 * lock the platform out of its own admin panel).
 */
const userPurgeSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(255).optional().or(z.literal("")),
});

export async function purgeUserAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const parsed = userPurgeSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return;
  const { userId, reason } = parsed.data;

  // Guard against self-delete and against removing the last
  // super_admin — either would lock the platform's admin panel.
  if (userId === ctx.userId) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          business: {
            select: {
              id: true,
              legalName: true,
              vatNumber: true,
              tradeName: true,
            },
          },
        },
      },
    },
  });
  if (!target) return;

  if (target.platformRole === "super_admin") {
    const otherSuperAdmins = await prisma.user.count({
      where: {
        platformRole: "super_admin",
        id: { not: userId },
      },
    });
    if (otherSuperAdmins === 0) return;
  }

  // Sole-owned businesses = businesses where this user is the only
  // member (or the only owner). We delete those; multi-member
  // businesses lose one member but the business itself survives.
  const soleOwnedIds: string[] = [];
  for (const m of target.memberships) {
    const otherMembers = await prisma.businessMember.count({
      where: {
        businessId: m.businessId,
        userId: { not: userId },
      },
    });
    if (otherMembers === 0) {
      soleOwnedIds.push(m.businessId);
    }
  }

  const snapshot = {
    schemaVersion: 1,
    userId: target.id,
    email: target.email,
    fullName: target.fullName,
    createdAt: target.createdAt,
    memberships: target.memberships.map((m) => ({
      businessId: m.businessId,
      role: m.role,
      businessName: m.business.tradeName ?? m.business.legalName,
      vatNumber: m.business.vatNumber,
    })),
    soleOwnedBusinesses: target.memberships
      .filter((m) => soleOwnedIds.includes(m.businessId))
      .map((m) => ({
        id: m.businessId,
        legalName: m.business.legalName,
        vatNumber: m.business.vatNumber,
      })),
    reason: reason || null,
    deletedByAdminId: ctx.userId,
    deletedAt: new Date().toISOString(),
  };

  await prisma.accountDeletionLog.create({
    data: {
      userId: target.id,
      userEmail: target.email,
      userFullName: target.fullName ?? null,
      reason: reason || `Admin purge by ${ctx.email}`,
      businessesDeleted: soleOwnedIds.length,
      documentsRetained: 0,
      snapshot: JSON.stringify(snapshot),
    },
  });

  if (soleOwnedIds.length > 0) {
    await prisma.business.deleteMany({
      where: { id: { in: soleOwnedIds } },
    });
  }
  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    userId: ctx.userId,
    action: "platform.user.purge",
    entityType: "User",
    entityId: userId,
    meta: {
      email: target.email,
      soleOwnedBusinesses: soleOwnedIds.length,
      reason: reason || null,
    },
  });

  redirect("/admin/users?purged=1");
}

// ─── Impersonate ───────────────────────────────────────────────────────

/**
 * Super admin swaps into the target user's session. The current admin session
 * is preserved so /admin/impersonate/stop restores it. Direct cookie writes so
 * we don't reach into the auth internal API.
 */
export async function impersonateUserAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const targetId = String(formData.get("userId") ?? "");
  if (!targetId || targetId === ctx.userId) return;

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, suspendedAt: true },
  });
  if (!target || target.suspendedAt) return;

  // Create a session for the target user.
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 4); // 4h impersonation window

  await prisma.session.create({
    data: {
      userId: target.id,
      tokenHash,
      expiresAt,
      userAgent: `impersonation:by:${ctx.userId}`,
    },
  });

  await logAudit({
    userId: ctx.userId,
    action: "platform.user.impersonate.start",
    entityType: "User",
    entityId: target.id,
    meta: { email: target.email },
  });

  const jar = await cookies();
  // Stash the admin's own cookie so we can restore it later.
  const currentAdminCookie = jar.get(SESSION_COOKIE)?.value;
  if (currentAdminCookie) {
    jar.set("etl_admin_return", currentAdminCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
  }
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  redirect("/app");
}

export async function stopImpersonationAction() {
  const jar = await cookies();
  const returnTo = jar.get("etl_admin_return")?.value;
  if (returnTo) {
    jar.set(SESSION_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
    });
    jar.delete("etl_admin_return");
    await logAudit({
      action: "platform.user.impersonate.stop",
    });
  }
  redirect("/admin");
}
