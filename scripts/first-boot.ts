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

/**
 * Plans mirror the provider's (Wrapp) partner tiers 1:1 — same yearly document
 * cap, same annual price (VAT-inclusive), no monthly billing option (provider
 * doesn't offer monthly). The `includedDocsMonth` column now stores the
 * ANNUAL cap (schema keeps the historical name; quota logic counts against
 * the subscription period, not a calendar month). `priceMonthly` is left at 0
 * to signal "not offered monthly".
 *
 * B2G (Business-to-Government) is a +€37.20/year add-on quoted separately by
 * the provider and is not part of any base tier.
 */
const DEFAULT_PLANS: Array<{
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  includedDocsMonth: number; // stores annual cap; see note above
  features: string;
  sortOrder: number;
}> = [
  {
    code: "basic",
    name: "Basic",
    description: "Χαμηλού όγκου έκδοση παραστατικών — ιδανικό σημείο εκκίνησης.",
    priceMonthly: 0,
    priceYearly: 35.96,
    includedDocsMonth: 1500,
    features:
      "1.500 παραστατικά/έτος · Ηλεκτρονική τιμολόγηση myDATA · Πελατολόγιο & αναζήτηση ΑΦΜ · Email υποστήριξη",
    sortOrder: 10,
  },
  {
    code: "growth",
    name: "Growth",
    description: "Για μικρές επιχειρήσεις με σταθερή ροή εκδόσεων.",
    priceMonthly: 0,
    priceYearly: 122.76,
    includedDocsMonth: 6000,
    features:
      "6.000 παραστατικά/έτος · Επαναλαμβανόμενα παραστατικά · Πληρωμές & εισπράξεις · Προηγμένες αναφορές · Email υποστήριξη",
    sortOrder: 20,
  },
  {
    code: "scale",
    name: "Scale",
    description: "Για ώριμες επιχειρήσεις με ομάδα και μεγαλύτερο όγκο.",
    priceMonthly: 0,
    priceYearly: 209.56,
    includedDocsMonth: 18000,
    features:
      "18.000 παραστατικά/έτος · POS & CRM · Απόθεμα ειδών · Έως 5 χρήστες με ρόλους · Υποστήριξη προτεραιότητας",
    sortOrder: 30,
  },
  {
    code: "pro",
    name: "Pro",
    description: "Για επιχειρήσεις υψηλού όγκου συναλλαγών.",
    priceMonthly: 0,
    priceYearly: 296.36,
    includedDocsMonth: 200000,
    features:
      "200.000 παραστατικά/έτος · Απεριόριστοι χρήστες · Όλες οι λειτουργίες Scale · Υποστήριξη προτεραιότητας",
    sortOrder: 40,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Για επιχειρήσεις μεγάλης κλίμακας.",
    priceMonthly: 0,
    priceYearly: 680.76,
    includedDocsMonth: 750000,
    features:
      "750.000 παραστατικά/έτος · Όλες οι λειτουργίες Pro · SLA · Dedicated account manager",
    sortOrder: 50,
  },
  {
    code: "corporate",
    name: "Corporate",
    description: "Για πολύ μεγάλες επιχειρήσεις και ομίλους.",
    priceMonthly: 0,
    priceYearly: 2478.76,
    includedDocsMonth: 4000000,
    features:
      "4.000.000 παραστατικά/έτος · Custom SLA · Priority engineering support",
    sortOrder: 60,
  },
];

/**
 * Idempotent plan seed. Upserts by `code` so existing deployments pick up
 * price/quota changes on the next redeploy. Old plans that no longer exist
 * in the canonical list are deactivated (not deleted, because live
 * BusinessSubscription rows may still reference them).
 */
async function seedPlans(): Promise<number> {
  for (const plan of DEFAULT_PLANS) {
    await prisma.platformPlan.upsert({
      where: { code: plan.code },
      create: { ...plan, active: true },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        includedDocsMonth: plan.includedDocsMonth,
        features: plan.features,
        sortOrder: plan.sortOrder,
        active: true,
      },
    });
  }

  const canonicalCodes = DEFAULT_PLANS.map((p) => p.code);
  const deactivated = await prisma.platformPlan.updateMany({
    where: { code: { notIn: canonicalCodes }, active: true },
    data: { active: false },
  });

  console.log(
    JSON.stringify({
      level: "info",
      msg: "first-boot.plans.upserted",
      upserted: DEFAULT_PLANS.length,
      deactivated: deactivated.count,
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
