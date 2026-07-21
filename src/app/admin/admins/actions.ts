"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PlatformRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const ROLES: PlatformRole[] = ["super_admin", "support", "analyst"];

const promoteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES as [PlatformRole, ...PlatformRole[]]),
});

export type AdminActionState =
  | { error?: string; success?: string }
  | undefined;

export async function promoteAdminAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const ctx = await requireAdmin("super_admin");

  const parsed = promoteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Μη έγκυρα στοιχεία." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, platformRole: true },
  });

  if (!user) {
    return {
      error:
        "Ο χρήστης δεν βρέθηκε. Ζήτησέ του να εγγραφεί πρώτα με αυτό το email.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { platformRole: parsed.data.role },
  });

  await logAudit({
    userId: ctx.userId,
    action: "platform.admin.promote",
    entityType: "User",
    entityId: user.id,
    meta: { from: user.platformRole, to: parsed.data.role },
  });

  revalidatePath("/admin/admins");
  return { success: `Ο χρήστης ${user.email} ορίστηκε ως ${parsed.data.role}.` };
}

export async function demoteAdminAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === ctx.userId) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, platformRole: true },
  });
  if (!target || !target.platformRole) return;

  if (target.platformRole === "super_admin") {
    const supers = await prisma.user.count({
      where: { platformRole: "super_admin" },
    });
    if (supers <= 1) return; // never remove the last super_admin
  }

  await prisma.user.update({
    where: { id: userId },
    data: { platformRole: null },
  });

  await logAudit({
    userId: ctx.userId,
    action: "platform.admin.demote",
    entityType: "User",
    entityId: userId,
    meta: { from: target.platformRole },
  });

  revalidatePath("/admin/admins");
}
