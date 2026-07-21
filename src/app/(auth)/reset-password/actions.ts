"use server";

import { createHmac } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
  confirm: z.string().min(8),
});

export type ResetState = { error?: string } | undefined;

export async function completePasswordResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = schema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: "Ελέγξε τα πεδία — ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.",
    };
  }

  if (parsed.data.password !== parsed.data.confirm) {
    return { error: "Οι δύο κωδικοί δεν ταιριάζουν." };
  }

  const tokenHash = createHmac("sha256", env.SESSION_SECRET)
    .update(parsed.data.token)
    .digest("hex");

  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, suspendedAt: true } } },
  });

  if (
    !reset ||
    reset.usedAt ||
    reset.expiresAt.getTime() < Date.now() ||
    reset.user.suspendedAt
  ) {
    return {
      error:
        "Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει. Ζήτησε ξανά επαναφορά κωδικού.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all sessions on password change.
    prisma.session.deleteMany({ where: { userId: reset.userId } }),
    // Invalidate other outstanding reset tokens for this user.
    prisma.passwordReset.updateMany({
      where: {
        userId: reset.userId,
        usedAt: null,
        id: { not: reset.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  await logAudit({
    userId: reset.userId,
    action: "auth.password_reset.complete",
  });

  redirect("/login?reset=1");
}
