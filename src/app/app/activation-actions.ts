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
 * Ask Wrapp (via partner embedded_check_user) whether this tenant
 * already has an active subscription upstream. Used by the activation
 * gate to auto-suggest the manual-api-key flow when a user comes back
 * from Wrapp that told them "you already have an account" — Wrapp
 * doesn't re-fire the USER-CREATED webhook in that case, so we can't
 * receive the api_key automatically. Suggesting manual paste with a
 * "we found your account upstream" hint lifts the confusion.
 *
 * Returns { known: false } if Wrapp doesn't recognize our
 * partner_user_id (fresh tenant, or wrong id — either way no useful
 * signal), and { known: true, active } otherwise.
 */
export async function checkWrappSubscriptionStatusAction(): Promise<
  | { known: false }
  | { known: true; active: boolean; email: string }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  try {
    const partner = await getWrappPartnerClient();
    if (!partner) return { known: false };
    const res = await partner.embeddedCheckUser(ctx.businessId);
    if (!res.found) return { known: false };
    return {
      known: true,
      active: res.activeSubscription,
      email: res.user,
    };
  } catch (err) {
    logger.warn("wrapp.check_user.failed", {
      businessId: ctx.businessId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { known: false };
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
  | { ok: false; error: string; alreadyActive?: boolean }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

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

  // Always go through Wrapp's external_login — that's the actual onboarding
  // flow both in staging (Stripe test card + dummy taxis) and in production
  // (real Stripe + real declaration). No shortcut, no shared tenant reuse.

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
  // Wrapp production validates ΑΦΜ + legal name server-side and 500's
  // on missing/malformed values instead of a clean 4xx (learned the
  // hard way in the first production activation attempt). Pre-validate
  // here so the user gets a specific, actionable error pointing at the
  // exact field to fix — instead of a raw "500 Internal Server Error"
  // dump in the activation modal.
  const legalName = business?.legalName?.trim() ?? "";
  const vat = business?.vatNumber?.replace(/\D/g, "") ?? "";
  if (!legalName) {
    return {
      ok: false,
      error:
        "Λείπει η νόμιμη επωνυμία της επιχείρησης. Συμπλήρωσέ την από Ρυθμίσεις → Επιχείρηση πριν την ενεργοποίηση.",
    };
  }
  if (vat.length !== 9) {
    return {
      ok: false,
      error:
        "Το ΑΦΜ της επιχείρησης πρέπει να είναι ακριβώς 9 ψηφία. Διόρθωσέ το από Ρυθμίσεις → Επιχείρηση.",
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
      // Send the sanitized values (trimmed name, digits-only 9-char vat)
      // — never the raw DB field which could carry spaces / dashes / etc.
      // that Wrapp production's validator rejects with a 500.
      name: legalName,
      vat,
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
    // Log the full technical detail for /admin/errors (status, url,
    // response body slice) but NEVER return that string to the user —
    // the previous version dumped the raw HTTP response into the modal
    // ("Partner external_login failed [500 Internal Server Error]…"),
    // which read as broken. Users get a friendly Greek message
    // categorized by HTTP status instead.
    logger.error("wrapp.activation.external_login_failed", err, {
      businessId: ctx.businessId,
    });
    return {
      ok: false,
      error: friendlyExternalLoginError(err),
    };
  }
}

/**
 * Turn a Wrapp external_login exception into a Greek message a real
 * tenant can act on. Category buckets:
 *
 *   401/403  → wrong or missing partner API key (admin config bug)
 *   422/400  → Wrapp rejected the payload (bad ΑΦΜ / bad email / etc)
 *   429      → rate limited
 *   500/502/503/504 → Wrapp is temporarily broken; retry
 *   network  → our container couldn't reach Wrapp at all
 *   other    → generic retry hint
 */
function friendlyExternalLoginError(err: unknown): string {
  if (err instanceof WrappApiError) {
    const s = err.httpStatus;
    if (s === 401 || s === 403) {
      return "Οι ρυθμίσεις σύνδεσης με τον πάροχο δεν είναι σωστές. Επικοινώνησε με την υποστήριξη — δεν είναι δικό σου πρόβλημα.";
    }
    if (s === 400 || s === 422) {
      return "Ο πάροχος απέρριψε τα στοιχεία που στείλαμε. Βεβαιώσου ότι έχεις συμπληρώσει σωστά ΑΦΜ (9 ψηφία), email και τηλέφωνο και δοκίμασε ξανά.";
    }
    if (s === 429) {
      return "Πολλές προσπάθειες σε σύντομο χρόνο. Περίμενε 1–2 λεπτά και δοκίμασε ξανά.";
    }
    if (s >= 500 && s <= 599) {
      return "Ο πάροχος είναι προσωρινά μη διαθέσιμος. Δοκίμασε ξανά σε λίγα λεπτά — αν επιμένει, επικοινώνησε με την υποστήριξη.";
    }
    if (err.code === "wrapp.partner.external_login_network_error") {
      return "Δεν καταφέραμε να επικοινωνήσουμε με τον πάροχο (δικτυακό σφάλμα). Δοκίμασε ξανά σε λίγο.";
    }
  }
  return "Αποτυχία επικοινωνίας με τον πάροχο. Δοκίμασε ξανά σε λίγο — αν επιμένει, επικοινώνησε με την υποστήριξη.";
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
