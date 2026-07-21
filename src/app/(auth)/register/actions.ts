"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { t } from "@/lib/i18n";
import { formatZodError } from "@/lib/zod-el";
import { consume, LIMITS, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { welcomeTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { sendVerificationEmail } from "@/lib/auth/email-verify";

const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8, t.auth.passwordShort).max(200),
});

export type RegisterState = { error?: string } | undefined;

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const hdrs = await headers();
  const rl = consume(
    `register:${clientIp(hdrs)}`,
    LIMITS.register.capacity,
    LIMITS.register.refillMs,
  );
  if (!rl.ok) {
    return {
      error: `Πάρα πολλές προσπάθειες εγγραφής. Δοκίμασε ξανά σε ${rl.retryAfter} δευτερόλεπτα.`,
    };
  }

  const parsed = registerSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        passwordHash,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: t.auth.emailInUse };
    }
    throw err;
  }

  await createSession(user.id);
  await logAudit({ userId: user.id, action: "auth.register" });

  // Fire-and-forget welcome + verification emails; don't block on delivery.
  const { subject, html, text } = welcomeTemplate({
    name: user.fullName,
    appUrl: env.APP_BASE_URL,
  });
  sendEmail({
    to: { email: user.email, name: user.fullName },
    subject,
    html,
    text,
    tags: ["welcome"],
  }).catch(() => undefined);
  sendVerificationEmail({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
  }).catch(() => undefined);

  redirect("/app/onboarding");
}
