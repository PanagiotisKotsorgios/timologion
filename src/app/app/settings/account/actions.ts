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
});

export async function deleteAccountAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = deleteAccountSchema.safeParse({
    confirm: String(formData.get("confirm") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: 'Πληκτρολόγησε "ΔΙΑΓΡΑΦΗ" για επιβεβαίωση.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      passwordHash: true,
      memberships: {
        select: { businessId: true, role: true },
      },
    },
  });
  if (!user) redirect("/login");

  // If the user has a password, require it.
  if (user.passwordHash && parsed.data.password) {
    const ok = await verifyPassword(user.passwordHash, parsed.data.password);
    if (!ok) return { error: "Λάθος κωδικός." };
  } else if (user.passwordHash && !parsed.data.password) {
    return { error: "Επιβεβαίωσε τον κωδικό σου." };
  }

  // If the user is the sole owner of any business, block deletion. They must
  // first transfer ownership or delete the business explicitly.
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
      return {
        error:
          "Είσαι ο μοναδικός ιδιοκτήτης μιας επιχείρησης. Μετέφερε πρώτα την ιδιοκτησία ή διάγραψέ την πριν διαγράψεις τον λογαριασμό σου.",
      };
    }
  }

  await prisma.user.delete({ where: { id: user.id } });
  // Manual cookie kill because destroySession() needs the DB row we just wiped.
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  await logAudit({ action: "user.delete", entityType: "User", entityId: user.id });
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

