"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BusinessRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const ROLES: BusinessRole[] = [
  "owner",
  "admin",
  "accountant",
  "sales",
  "staff",
  "readonly",
];

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES as [BusinessRole, ...BusinessRole[]]),
});

export type UserActionState = { error?: string; success?: string } | undefined;

export async function inviteMemberAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "member:invite");

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Μη έγκυρα στοιχεία." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user) {
    return {
      error:
        "Ο χρήστης δεν βρέθηκε. Ζήτησέ του να εγγραφεί πρώτα με αυτό το email και δοκίμασε ξανά.",
    };
  }

  try {
    await prisma.businessMember.create({
      data: {
        userId: user.id,
        businessId: ctx.businessId,
        role: parsed.data.role,
      },
    });
  } catch {
    return { error: "Ο χρήστης είναι ήδη μέλος της επιχείρησης." };
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "member.invite",
    entityType: "BusinessMember",
    entityId: user.id,
    meta: { role: parsed.data.role },
  });

  revalidatePath("/app/settings/users");
  return { success: `Ο χρήστης προστέθηκε ως ${parsed.data.role}.` };
}

const roleUpdateSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(ROLES as [BusinessRole, ...BusinessRole[]]),
});

export async function updateMemberRoleAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "member:update_role");

  const parsed = roleUpdateSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;

  const member = await prisma.businessMember.findFirst({
    where: { id: parsed.data.memberId, businessId: ctx.businessId },
  });
  if (!member) return;

  // Never let a non-owner change an owner's role, and never demote the last owner.
  if (member.role === "owner" && parsed.data.role !== "owner") {
    const ownerCount = await prisma.businessMember.count({
      where: { businessId: ctx.businessId, role: "owner" },
    });
    if (ownerCount <= 1) return;
  }

  await prisma.businessMember.update({
    where: { id: member.id },
    data: { role: parsed.data.role },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "member.update_role",
    entityType: "BusinessMember",
    entityId: member.id,
    meta: { from: member.role, to: parsed.data.role },
  });

  revalidatePath("/app/settings/users");
}
