"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { getWrappClient, getWrappPartnerClient } from "@/lib/wrapp/client";
import { WrappApiError } from "@/lib/wrapp/http-client";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

/**
 * Ask the provider whether the current tenant is active. Wired to the stub
 * client for now — will do the real HTTP call once the provider integration
 * ships. Reads/writes the WrappConnection row for the current business.
 */
export async function checkActivationAction() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const existing = await prisma.wrappConnection.findUnique({
    where: { businessId: ctx.businessId },
  });

  // If the webhook has already flipped the connection to active, no need to
  // hit Wrapp again — just refresh the "last verified" timestamp.
  if (
    existing?.status === "active" &&
    existing.canIssueInvoice &&
    existing.encryptedApiKey
  ) {
    await prisma.wrappConnection.update({
      where: { businessId: ctx.businessId },
      data: { lastVerifiedAt: new Date() },
    });
    revalidatePath("/app", "layout");
    return;
  }

  try {
    const details = await getWrappClient().getTenantDetails(ctx.businessId);
    const active = details.issue_invoice_status && details.has_plan;

    await prisma.wrappConnection.upsert({
      where: { businessId: ctx.businessId },
      create: {
        businessId: ctx.businessId,
        status: active ? "active" : "pending",
        hasPlan: details.has_plan,
        canIssueInvoice: details.issue_invoice_status,
        wrappUserId: details.wrapp_user_id,
        wrappEmail: details.email ?? null,
        lastVerifiedAt: new Date(),
      },
      update: {
        status: active ? "active" : "pending",
        hasPlan: details.has_plan,
        canIssueInvoice: details.issue_invoice_status,
        wrappUserId: details.wrapp_user_id,
        wrappEmail: details.email ?? undefined,
        lastVerifiedAt: new Date(),
        lastError: null,
      },
    });

    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "wrapp.status.check",
      meta: { active },
    });
  } catch (err) {
    // Missing credentials or transient failure — record and keep the current
    // status. Don't throw; the return-page and gate handle the visible state.
    logger.warn("wrapp.status.check_failed", {
      businessId: ctx.businessId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  revalidatePath("/app", "layout");
}

/**
 * Start the Wrapp onboarding flow. Calls the Partners API `external_login`
 * endpoint with the current tenant's email + our business id (echoed back
 * in the webhook), gets a signed login_url, and returns it so the UI can
 * navigate there. If the tenant is already active, returns null so the UI
 * closes the gate.
 *
 * If Wrapp partner credentials aren't configured (env WRAPP_PARTNER_API_KEY
 * missing), returns a helpful Greek error instead of redirecting to the
 * public partner info page — the previous behavior was misleading.
 */
export async function startWrappActivationAction(): Promise<
  { ok: true; loginUrl: string } | { ok: false; error: string; alreadyActive?: boolean }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const partner = await getWrappPartnerClient();
  if (!partner) {
    return {
      ok: false,
      error:
        "Ο λογαριασμός συνεργάτη δεν έχει ρυθμιστεί. Επικοινώνησε με την υποστήριξη.",
    };
  }

  const [business, existing, member] = await Promise.all([
    prisma.business.findUnique({
      where: { id: ctx.businessId },
      select: {
        id: true,
        email: true,
        phone: true,
        legalName: true,
        vatNumber: true,
      },
    }),
    prisma.wrappConnection.findUnique({
      where: { businessId: ctx.businessId },
    }),
    prisma.businessMember.findFirst({
      where: { businessId: ctx.businessId, role: { in: ["owner", "admin"] } },
      include: { user: { select: { email: true, fullName: true } } },
    }),
  ]);

  if (existing?.status === "active" && existing.canIssueInvoice) {
    return { ok: false, alreadyActive: true, error: "Η υπηρεσία είναι ήδη ενεργή." };
  }

  const email =
    business?.email?.trim() ||
    member?.user.email?.trim() ||
    null;
  if (!email) {
    return {
      ok: false,
      error:
        "Δεν βρέθηκε έγκυρο email για την επιχείρηση. Συμπλήρωσε τα στοιχεία επικοινωνίας από Ρυθμίσεις → Επιχείρηση πρώτα.",
    };
  }

  const phone = business?.phone?.trim() || null;
  if (!phone) {
    return {
      ok: false,
      error:
        "Λείπει το τηλέφωνο της επιχείρησης — η Wrapp το απαιτεί για την ενεργοποίηση. Συμπλήρωσέ το από Ρυθμίσεις → Επιχείρηση και δοκίμασε ξανά.",
    };
  }

  const returnUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/app/wrapp/return?bid=${ctx.businessId}`;

  try {
    const res = await partner.externalLogin({
      email,
      phone,
      name: business?.legalName ?? undefined,
      vat: business?.vatNumber ?? undefined,
      partner_user_id: ctx.businessId,
      return_url: returnUrl,
    });

    await prisma.wrappConnection.upsert({
      where: { businessId: ctx.businessId },
      create: {
        businessId: ctx.businessId,
        status: "pending",
        wrappEmail: email,
        lastVerifiedAt: new Date(),
      },
      update: {
        status: "pending",
        wrappEmail: email,
        lastError: null,
        lastVerifiedAt: new Date(),
      },
    });

    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "wrapp.activation.start",
      meta: { email },
    });

    return { ok: true, loginUrl: res.login_url };
  } catch (err) {
    logger.error("wrapp.activation.external_login_failed", err, {
      businessId: ctx.businessId,
    });
    const message =
      err instanceof WrappApiError
        ? err.message
        : "Αποτυχία επικοινωνίας με τον πάροχο. Δοκίμασε ξανά σε λίγο.";
    return { ok: false, error: message };
  }
}

/**
 * Dev-only shortcut for testing: flips the WrappConnection to active without a
 * real provider round-trip. Gated to non-production so it can never ship to
 * paying customers. Once the real integration lands, remove this action.
 */
export async function devSimulateActivationAction() {
  if (env.NODE_ENV === "production") {
    throw new Error("Simulated activation is disabled in production.");
  }

  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  await prisma.wrappConnection.upsert({
    where: { businessId: ctx.businessId },
    create: {
      businessId: ctx.businessId,
      status: "active",
      hasPlan: true,
      canIssueInvoice: true,
      wrappUserId: "dev-simulated",
      lastVerifiedAt: new Date(),
    },
    update: {
      status: "active",
      hasPlan: true,
      canIssueInvoice: true,
      wrappUserId: "dev-simulated",
      lastVerifiedAt: new Date(),
      lastError: null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "wrapp.dev.simulate_active",
  });

  revalidatePath("/app", "layout");
}
