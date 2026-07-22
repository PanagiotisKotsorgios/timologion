#!/usr/bin/env tsx
/**
 * Idempotent first-boot bootstrap for a fresh deploy.
 *
 * Runs on every container start (after `prisma migrate deploy`) but only does
 * work when the database is empty:
 *
 *   1. Seed default PlatformPlan rows (Free, Starter, Pro, Business).
 *   2. If INITIAL_ADMIN_EMAIL is set and no admin exists yet, create a
 *      super_admin user. The password is either INITIAL_ADMIN_PASSWORD or a
 *      randomly generated one printed to stdout so it appears in Coolify logs.
 *
 * Safe to re-run — every step first checks for existing state.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ARGON2 = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const DEFAULT_PLANS: Array<{
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  includedDocsMonth: number;
  features: string;
  sortOrder: number;
}> = [
  {
    code: "free",
    name: "Δωρεάν",
    description: "Για δοκιμή της πλατφόρμας.",
    priceMonthly: 0,
    priceYearly: 0,
    includedDocsMonth: 10,
    features:
      "Έως 10 παραστατικά/μήνα · 1 επιχείρηση · Βασική υποστήριξη email",
    sortOrder: 10,
  },
  {
    code: "starter",
    name: "Starter",
    description: "Για ελεύθερους επαγγελματίες.",
    priceMonthly: 9,
    priceYearly: 90,
    includedDocsMonth: 100,
    features:
      "Έως 100 παραστατικά/μήνα · 1 επιχείρηση · Πληρωμές & αναφορές ΦΠΑ · Προτεραιότητα υποστήριξης",
    sortOrder: 20,
  },
  {
    code: "pro",
    name: "Pro",
    description: "Για μικρές επιχειρήσεις που θέλουν περισσότερα.",
    priceMonthly: 19,
    priceYearly: 190,
    includedDocsMonth: 500,
    features:
      "Έως 500 παραστατικά/μήνα · 3 επιχειρήσεις · CRM · POS · Επαναλαμβανόμενα · Ζώνες τιμών",
    sortOrder: 30,
  },
  {
    code: "business",
    name: "Business",
    description: "Για ομάδες και εμπορικές επιχειρήσεις.",
    priceMonthly: 39,
    priceYearly: 390,
    includedDocsMonth: 0, // 0 = unlimited
    features:
      "Απεριόριστα παραστατικά · Απεριόριστες επιχειρήσεις · Πολλαπλοί χρήστες με ρόλους · Απόθεμα · Ολα τα modules",
    sortOrder: 40,
  },
];

async function seedPlans(): Promise<number> {
  const existing = await prisma.platformPlan.count();
  if (existing > 0) {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "first-boot.plans.skip",
        existing,
      }),
    );
    return 0;
  }
  await prisma.platformPlan.createMany({ data: DEFAULT_PLANS });
  console.log(
    JSON.stringify({
      level: "info",
      msg: "first-boot.plans.seeded",
      count: DEFAULT_PLANS.length,
    }),
  );
  return DEFAULT_PLANS.length;
}

function randomPassword(): string {
  // 24 random bytes → base64url → 32 characters. Strong enough to be a one-off
  // initial admin password that the user immediately rotates.
  return randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function seedAdmin(): Promise<void> {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;

  const anyAdmin = await prisma.user.findFirst({
    where: { platformRole: { not: null } },
    select: { id: true },
  });
  if (anyAdmin) {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "first-boot.admin.skip",
        reason: "another admin already exists",
      }),
    );
    return;
  }

  const password = process.env.INITIAL_ADMIN_PASSWORD?.trim() || randomPassword();
  const passwordHash = await hash(password, ARGON2);
  const fullName = process.env.INITIAL_ADMIN_NAME?.trim() || "Platform Admin";

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { platformRole: "super_admin" },
    });
    console.log(
      JSON.stringify({
        level: "info",
        msg: "first-boot.admin.promoted",
        email,
      }),
    );
    return;
  }

  await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      platformRole: "super_admin",
      emailVerifiedAt: new Date(),
    },
  });

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  timologion — INITIAL ADMIN CREATED                      ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  email:    ${email.padEnd(46)}║`);
  if (!process.env.INITIAL_ADMIN_PASSWORD) {
    console.log(`║  password: ${password.padEnd(46)}║`);
    console.log("║                                                          ║");
    console.log("║  ⚠  Copy this password NOW — it will not be shown again. ║");
    console.log("║     Then log in and change it from the Account settings. ║");
  } else {
    console.log("║  password: (set via INITIAL_ADMIN_PASSWORD env var)      ║");
  }
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
}

async function main() {
  console.log(
    JSON.stringify({ level: "info", msg: "first-boot.start" }),
  );

  try {
    await seedPlans();
    await seedAdmin();
    console.log(
      JSON.stringify({ level: "info", msg: "first-boot.done" }),
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "first-boot.failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    // Non-fatal: we still want the app to boot so the user can debug from UI.
  } finally {
    await prisma.$disconnect();
  }
}

main();
