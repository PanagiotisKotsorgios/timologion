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
import { SITE } from "@/lib/seo";
import { getWrappSettings } from "@/lib/wrapp/settings";
import { encryptSecret } from "@/lib/crypto";

/**
 * Ask the provider whether the current tenant is active. Wired to the stub
 * client for now — will do the real HTTP call once the provider integration
 * ships. Reads/writes the WrappConnection row for the current business.
 */
/**
 * Non-throwing activation status check.
 *
 * Returns the current connection status. Safe to call from a polling loop —
 * never throws, never redirects, degrades to whatever's in the DB.
 */
export async function checkActivationAction(): Promise<{
  active: boolean;
  pending: boolean;
  hasApiKey: boolean;
  lastError: string | null;
}> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const existing = await prisma.wrappConnection.findUnique({
    where: { businessId: ctx.businessId },
  });

  const hasApiKey = Boolean(existing?.encryptedApiKey);

  if (
    existing?.status === "active" &&
    existing.canIssueInvoice &&
    hasApiKey
  ) {
    await prisma.wrappConnection
      .update({
        where: { businessId: ctx.businessId },
        data: { lastVerifiedAt: new Date() },
      })
      .catch(() => undefined);
    revalidatePath("/app", "layout");
    return { active: true, pending: false, hasApiKey: true, lastError: null };
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

    revalidatePath("/app", "layout");
    return { active, pending: !active, hasApiKey, lastError: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("wrapp.status.check_failed", {
      businessId: ctx.businessId,
      error: message,
    });
    return {
      active: existing?.status === "active" && existing.canIssueInvoice,
      pending: existing?.status === "pending",
      hasApiKey,
      lastError: existing?.lastError ?? null,
    };
  }
}

/**
 * Escape hatch: paste the tenant api_key straight from Wrapp when the
 * webhook can't reach us (stale webhook_endpoint, DNS, etc.).
 */
export async function setWrappApiKeyManuallyAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (apiKey.length < 8) {
    return { ok: false, error: "Δώσε έγκυρο tenant api_key από τη Wrapp." };
  }
  if (!email) {
    return {
      ok: false,
      error:
        "Δώσε το email του λογαριασμού Wrapp (αυτό που ολοκλήρωσε το onboarding).",
    };
  }

  const { encryptSecret } = await import("@/lib/crypto");

  await prisma.wrappConnection.upsert({
    where: { businessId: ctx.businessId },
    create: {
      businessId: ctx.businessId,
      status: "active",
      hasPlan: true,
      canIssueInvoice: true,
      wrappEmail: email,
      encryptedApiKey: encryptSecret(apiKey),
      encryptedJwt: null,
      jwtExpiresAt: null,
      lastVerifiedAt: new Date(),
      lastError: null,
    },
    update: {
      status: "active",
      hasPlan: true,
      canIssueInvoice: true,
      wrappEmail: email,
      encryptedApiKey: encryptSecret(apiKey),
      encryptedJwt: null,
      jwtExpiresAt: null,
      lastVerifiedAt: new Date(),
      lastError: null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "wrapp.api_key.manual_set",
    meta: { email },
  });

  revalidatePath("/app", "layout");
  return { ok: true };
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
export async function startWrappActivationAction(
  input: { phone?: string } = {},
): Promise<
  | { ok: true; mode: "redirect"; loginUrl: string }
  | { ok: true; mode: "staging_activated" }
  | { ok: false; error: string; alreadyActive?: boolean }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const [business, existing, member, wrappSettings] = await Promise.all([
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
    getWrappSettings(),
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

  // ─── Staging shortcut ────────────────────────────────────────────────
  // In staging, the provider gave us shared tenant credentials that are
  // already fully onboarded on their side, so external_login just hits a
  // login screen and returns without any wizard. Detect this by presence
  // of both stagingTenantApiKey + stagingTenantEmail in the platform
  // settings, and short-circuit: mark the WrappConnection active using
  // those shared credentials. No redirect, no webhook needed.
  const stagingMode = Boolean(
    wrappSettings.stagingTenantApiKey?.trim() &&
      wrappSettings.stagingTenantEmail?.trim(),
  );
  logger.info("wrapp.activation.mode_check", {
    businessId: ctx.businessId,
    stagingMode,
    hasStagingKey: Boolean(wrappSettings.stagingTenantApiKey?.trim()),
    hasStagingEmail: Boolean(wrappSettings.stagingTenantEmail?.trim()),
    baseUrl: wrappSettings.baseUrl,
  });
  if (stagingMode) {
    await prisma.wrappConnection.upsert({
      where: { businessId: ctx.businessId },
      create: {
        businessId: ctx.businessId,
        status: "active",
        hasPlan: true,
        canIssueInvoice: true,
        wrappEmail: wrappSettings.stagingTenantEmail,
        encryptedApiKey: encryptSecret(wrappSettings.stagingTenantApiKey),
        encryptedJwt: null,
        jwtExpiresAt: null,
        lastVerifiedAt: new Date(),
        lastError: null,
      },
      update: {
        status: "active",
        hasPlan: true,
        canIssueInvoice: true,
        wrappEmail: wrappSettings.stagingTenantEmail,
        encryptedApiKey: encryptSecret(wrappSettings.stagingTenantApiKey),
        encryptedJwt: null,
        jwtExpiresAt: null,
        lastVerifiedAt: new Date(),
        lastError: null,
      },
    });

    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "wrapp.activation.staging_shortcut",
      meta: { email: wrappSettings.stagingTenantEmail },
    });
    logger.info("wrapp.activation.staging_shortcut", {
      businessId: ctx.businessId,
    });

    revalidatePath("/app", "layout");
    return { ok: true, mode: "staging_activated" };
  }

  // ─── Production flow ─────────────────────────────────────────────────

  const partner = await getWrappPartnerClient();
  if (!partner) {
    return {
      ok: false,
      error:
        "Ο λογαριασμός συνεργάτη δεν έχει ρυθμιστεί. Επικοινώνησε με την υποστήριξη.",
    };
  }

  // Prefer the phone the user just typed in the activation modal, then fall
  // back to whatever's already stored on the Business. If we got a new phone
  // and the Business record is empty, persist it so the user doesn't have to
  // re-enter it later.
  const providedPhone = input.phone?.trim() || null;
  const phone = providedPhone || business?.phone?.trim() || null;
  if (!phone) {
    return {
      ok: false,
      error:
        "Λείπει το τηλέφωνο της επιχείρησης — απαιτείται για την ενεργοποίηση.",
    };
  }
  if (providedPhone && !business?.phone && business) {
    await prisma.business.update({
      where: { id: business.id },
      data: { phone: providedPhone.slice(0, 30) },
    });
  }

  // SITE.url is the guarded production URL — never falls back to localhost,
  // which would silently break the provider's server-to-server webhook callback.
  const baseUrl = SITE.url;
  const returnUrl = `${baseUrl}/app/wrapp/return?bid=${ctx.businessId}`;
  // Wrapp POSTs the tenant api_key back here once onboarding completes.
  // Passed per call because Wrapp doesn't keep a partner-level webhook.
  const webhookEndpoint = `${baseUrl}/api/wrapp/webhook`;

  try {
    const res = await partner.externalLogin({
      email,
      phone,
      name: business?.legalName ?? undefined,
      vat: business?.vatNumber ?? undefined,
      partner_user_id: ctx.businessId,
      return_url: returnUrl,
      webhook_endpoint: webhookEndpoint,
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

    return { ok: true, mode: "redirect", loginUrl: res.login_url };
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
