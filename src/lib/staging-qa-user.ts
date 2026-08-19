import "server-only";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Dedicated staging QA user + business, always available for the platform
 * admin to test the full user journey (register → onboarding → activate
 * Wrapp staging → issue test docs) without touching any real tenant data.
 *
 * Idempotent: `ensureStagingQaUser()` creates the account on first call
 * and returns the existing user thereafter. Called on demand from the
 * "Δοκιμή ως staging user" button in /admin/wrapp — no seed job to
 * schedule, no env var to set.
 *
 * The email is a fixed reserved address so it's easy to identify in
 * user lists and easy to purge if the admin wants to reset. Password
 * is set to a random value the first time we create the user; the
 * only way to log in is through the admin's one-click impersonation
 * flow anyway (which doesn't need the password).
 *
 * The seeded business uses ΑΦΜ 999999999 which is clearly not a real
 * VAT number — Wrapp staging accepts it. If anyone ever accidentally
 * routed this user's calls at production Wrapp, the 9-nines VAT would
 * be rejected before any real damage.
 */

export const STAGING_QA_EMAIL = "staging-qa@timologion.gr";
export const STAGING_QA_FULL_NAME = "Staging QA User";
export const STAGING_QA_BUSINESS_LEGAL_NAME = "STAGING TEST BUSINESS";
export const STAGING_QA_BUSINESS_VAT = "999999999";

const ARGON2 = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export type EnsuredStagingQa = {
  userId: string;
  businessId: string;
  /** True when the user (or its business) was just created by this call. */
  created: boolean;
};

export async function ensureStagingQaUser(): Promise<EnsuredStagingQa> {
  const existing = await prisma.user.findUnique({
    where: { email: STAGING_QA_EMAIL },
    include: {
      memberships: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: { business: { select: { id: true } } },
      },
    },
  });

  if (existing && existing.memberships[0]) {
    return {
      userId: existing.id,
      businessId: existing.memberships[0].business.id,
      created: false,
    };
  }

  // Either the user doesn't exist yet, or it exists without a
  // business (partial state — should be impossible in practice but
  // handle it so a broken row doesn't block admin testing).
  const passwordHash = await hash(
    randomBytes(24).toString("hex"),
    ARGON2,
  );

  // Wrap creation + backfill in a transaction so the user always
  // has a linked business by the time we return.
  const seeded = await prisma.$transaction(async (tx) => {
    const user = existing
      ? existing
      : await tx.user.create({
          data: {
            email: STAGING_QA_EMAIL,
            fullName: STAGING_QA_FULL_NAME,
            passwordHash,
            // OAuth providers vouch for email; this user was created
            // by an admin action, so we can safely mark it verified.
            emailVerifiedAt: new Date(),
          },
        });

    const business = await tx.business.create({
      data: {
        legalName: STAGING_QA_BUSINESS_LEGAL_NAME,
        tradeName: "Staging Test",
        vatNumber: STAGING_QA_BUSINESS_VAT,
        taxOffice: "ΔΟΥ ΤΕΣΤ",
        addressLine: "Οδός Δοκιμών 1",
        city: "Αθήνα",
        postalCode: "10000",
        email: STAGING_QA_EMAIL,
        phone: "2100000000",
        activity: "Λογισμικό — δοκιμή σε staging περιβάλλον",
        // Language stays Greek by default; matches the tenant's
        // default so the print/PDF flow looks natural.
      },
    });

    await tx.businessMember.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: "owner",
      },
    });

    return { userId: user.id, businessId: business.id };
  });

  return { userId: seeded.userId, businessId: seeded.businessId, created: true };
}
