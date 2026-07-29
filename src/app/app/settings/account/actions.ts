"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import { getSession, destroySession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";
import { t } from "@/lib/i18n";

const changeNameSchema = z.object({
  fullName: z.string().min(2).max(120),
});

export async function updateFullNameAction(
  _prev: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const session = await getSession();
  if (!session) return { error: "Δεν είσαι συνδεδεμένος." };
  const parsed = changeNameSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
  });
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await prisma.user.update({
    where: { id: session.userId },
    data: { fullName: parsed.data.fullName },
  });
  await logAudit({ userId: session.userId, action: "user.name.update" });
  return { success: "Το ονοματεπώνυμο ενημερώθηκε." };
}

const SESSION_TIMEOUT_OPTIONS = [15, 30, 60, 120, 240, 480] as const;

const sessionTimeoutSchema = z.object({
  minutes: z.coerce
    .number()
    .refine((n) => (SESSION_TIMEOUT_OPTIONS as readonly number[]).includes(n), {
      message: "Μη έγκυρη επιλογή χρόνου.",
    }),
});

export async function updateSessionTimeoutAction(
  _prev: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const session = await getSession();
  if (!session) return { error: "Δεν είσαι συνδεδεμένος." };
  const parsed = sessionTimeoutSchema.safeParse({
    minutes: formData.get("minutes"),
  });
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await prisma.user.update({
    where: { id: session.userId },
    data: { sessionTimeoutMinutes: parsed.data.minutes },
  });
  await logAudit({
    userId: session.userId,
    action: "user.session_timeout.update",
    meta: { minutes: parsed.data.minutes },
  });
  return { success: "Ο χρόνος αυτόματης αποσύνδεσης ενημερώθηκε." };
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8, t.auth.passwordShort).max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: "Οι νέοι κωδικοί δεν συμφωνούν.",
    path: ["confirm"],
  });

export async function changePasswordAction(
  _prev: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const session = await getSession();
  if (!session) return { error: "Δεν είσαι συνδεδεμένος." };

  const parsed = changePasswordSchema.safeParse({
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) return { error: "Δεν βρέθηκε ο λογαριασμός." };

  const ok = await verifyPassword(user.passwordHash, parsed.data.current);
  if (!ok) return { error: "Ο τρέχων κωδικός είναι λανθασμένος." };

  const nextHash = await hashPassword(parsed.data.next);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: nextHash },
    }),
    // Kill every session except the current one — user has to sign back in on
    // other devices with the new password.
    prisma.session.deleteMany({
      where: { userId: session.userId, id: { not: session.sessionId } },
    }),
  ]);
  await logAudit({ userId: session.userId, action: "user.password.change" });
  return { success: "Ο κωδικός ενημερώθηκε. Οι άλλες συνεδρίες τερματίστηκαν." };
}

/** Terminate a specific session belonging to the current user. */
export async function revokeSessionAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const targetId = String(formData.get("sessionId") ?? "");
  if (!targetId || targetId === session.sessionId) return;

  await prisma.session.deleteMany({
    where: { id: targetId, userId: session.userId },
  });
  await logAudit({
    userId: session.userId,
    action: "user.session.revoke",
    entityType: "Session",
    entityId: targetId,
  });
}

/** Revoke every other session (keeps the current one). */
export async function revokeOtherSessionsAction() {
  const session = await getSession();
  if (!session) return;
  await prisma.session.deleteMany({
    where: {
      userId: session.userId,
      id: { not: session.sessionId },
    },
  });
  await logAudit({ userId: session.userId, action: "user.sessions.revoke_all" });
}

const deleteAccountSchema = z.object({
  confirm: z.literal("ΔΙΑΓΡΑΦΗ"),
  password: z.string().optional(),
  reason: z.string().max(2000).optional(),
  acknowledgeNoRefund: z.string().optional(),
  acknowledgeDataLoss: z.string().optional(),
});

export async function deleteAccountAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = deleteAccountSchema.safeParse({
    confirm: String(formData.get("confirm") ?? ""),
    password: String(formData.get("password") ?? ""),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
    acknowledgeNoRefund: String(formData.get("acknowledgeNoRefund") ?? ""),
    acknowledgeDataLoss: String(formData.get("acknowledgeDataLoss") ?? ""),
  });
  if (!parsed.success) {
    return { error: 'Πληκτρολόγησε "ΔΙΑΓΡΑΦΗ" για επιβεβαίωση.' };
  }
  if (parsed.data.acknowledgeNoRefund !== "on") {
    return {
      error:
        "Πρέπει να επιβεβαιώσεις ότι κατανοείς πως δεν επιστρέφεται η συνδρομή.",
    };
  }
  if (parsed.data.acknowledgeDataLoss !== "on") {
    return {
      error:
        "Πρέπει να επιβεβαιώσεις ότι κατανοείς πως τα δεδομένα σου θα διαγραφούν οριστικά.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      createdAt: true,
      memberships: {
        select: {
          businessId: true,
          role: true,
          business: {
            select: {
              id: true,
              legalName: true,
              tradeName: true,
              vatNumber: true,
              createdAt: true,
              _count: {
                select: {
                  documents: true,
                  clients: true,
                  members: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) redirect("/login");

  // Password check (if the user has one). Sole-owner check is now a
  // WARNING shown up-front on the form, not a hard block — the sole
  // owner CAN delete their account and the business gets cascade-
  // deleted with a snapshot taken first.
  if (user.passwordHash && parsed.data.password) {
    const ok = await verifyPassword(user.passwordHash, parsed.data.password);
    if (!ok) return { error: "Λάθος κωδικός." };
  } else if (user.passwordHash && !parsed.data.password) {
    return { error: "Επιβεβαίωσε τον κωδικό σου." };
  }

  // Identify businesses this user is the sole owner of — those will be
  // cascade-deleted along with the account.
  const soleOwnedBusinessIds: string[] = [];
  const soleOwnedBusinessSnapshot: unknown[] = [];
  let documentsRetained = 0;
  for (const m of user.memberships) {
    if (m.role !== "owner") continue;
    const otherOwners = await prisma.businessMember.count({
      where: {
        businessId: m.businessId,
        role: "owner",
        userId: { not: user.id },
      },
    });
    if (otherOwners === 0) {
      soleOwnedBusinessIds.push(m.businessId);
      soleOwnedBusinessSnapshot.push({
        id: m.business.id,
        legalName: m.business.legalName,
        tradeName: m.business.tradeName,
        vatNumber: m.business.vatNumber,
        createdAt: m.business.createdAt,
        documentCount: m.business._count.documents,
        clientCount: m.business._count.clients,
        memberCount: m.business._count.members,
      });
      documentsRetained += m.business._count.documents;
    }
  }

  const snapshot = {
    schemaVersion: 1,
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
    memberships: user.memberships.map((m) => ({
      businessId: m.businessId,
      role: m.role,
      businessName: m.business.tradeName ?? m.business.legalName,
      vatNumber: m.business.vatNumber,
    })),
    soleOwnedBusinesses: soleOwnedBusinessSnapshot,
    reason: parsed.data.reason ?? null,
    deletedAt: new Date().toISOString(),
  };

  await prisma.accountDeletionLog.create({
    data: {
      userId: user.id,
      userEmail: user.email,
      userFullName: user.fullName ?? null,
      reason: parsed.data.reason ?? null,
      businessesDeleted: soleOwnedBusinessIds.length,
      documentsRetained,
      snapshot: JSON.stringify(snapshot),
    },
  });

  // Cascade-delete sole-owned businesses first so foreign keys don't
  // block the user delete. Business.onDelete: Cascade handles the rest.
  if (soleOwnedBusinessIds.length > 0) {
    await prisma.business.deleteMany({
      where: { id: { in: soleOwnedBusinessIds } },
    });
  }

  await prisma.user.delete({ where: { id: user.id } });

  // Manual cookie kill because destroySession() needs the DB row we just wiped.
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  await logAudit({
    action: "user.delete",
    entityType: "User",
    entityId: user.id,
    meta: {
      businesses: soleOwnedBusinessIds.length,
      documentsRetained,
      reason: parsed.data.reason?.slice(0, 200) ?? null,
    },
  });
  redirect("/");
}

/** Sign out of the current session. Used by the "Sign out everywhere" button. */
export async function signOutAction() {
  await destroySession();
  redirect("/login");
}

/**
 * Helper for the sessions list — computes stable IDs of active sessions and a
 * best-guess label (browser/OS from UA). Kept here so the page stays pure JSX.
 */
export type SessionRow = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  current: boolean;
};

export async function listSessionsForCurrentUser(): Promise<SessionRow[]> {
  const session = await getSession();
  if (!session) return [];
  const rows = await prisma.session.findMany({
    where: { userId: session.userId },
    orderBy: { lastSeenAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    lastSeenAt: r.lastSeenAt ?? null,
    expiresAt: r.expiresAt,
    userAgent: r.userAgent,
    ipAddress: r.ipAddress,
    current: r.id === session.sessionId,
  }));
}

