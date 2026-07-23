import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import {
  wrappInvoiceIssuedWebhook,
  wrappPosPaymentWebhook,
  wrappPdfWebhook,
} from "@/lib/wrapp/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wrapp webhook receiver. Handles three event types documented at
 * https://wrapp.ai/api/documentation.md#webhooks
 *
 *   issued-invoice       → { id, my_data_mark, my_data_uid, my_data_qr_url, ... }
 *   pos-payment          → { errors, invoice_id }
 *   invoice-pdf          → { invoice_id, download_url }
 *   thermal-print-pdf    → { invoice_id, download_url }
 *
 * Authenticity is verified via the X-Webhook-Secret header, which contains
 * the HMAC-SHA256 hex digest of the raw request body computed with the
 * tenant's api_key as the HMAC key. We look up the tenant by matching the
 * signature against every active tenant's api_key (small number, staging).
 * In production a `partner_user_id` header or query param would let us skip
 * the linear scan.
 */

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verify the request signature.
 *
 * Tenant-scoped events (issued-invoice, pos-payment, invoice-pdf,
 * thermal-print-pdf) are signed with the tenant's api_key. Partner-scoped
 * events (onboarding callback) are signed with the platform's Partners API
 * key. We try both and return which one matched so downstream handlers know
 * the scope of the verified event.
 */
async function verifySignature(
  rawBody: string,
  signature: string,
): Promise<
  | { scope: "platform"; businessId: null }
  | { scope: "partner"; businessId: null }
  | { scope: "tenant"; businessId: string }
  | null
> {
  if (!signature) return null;

  // Platform shared secret (optional override).
  if (env.WRAPP_WEBHOOK_SECRET) {
    const expected = createHmac("sha256", env.WRAPP_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    if (safeEqualHex(expected, signature)) {
      return { scope: "platform", businessId: null };
    }
  }

  // Partner-signed events (onboarding). Signed with our Partners API key.
  if (env.WRAPP_PARTNER_API_KEY) {
    const expected = createHmac("sha256", env.WRAPP_PARTNER_API_KEY)
      .update(rawBody)
      .digest("hex");
    if (safeEqualHex(expected, signature)) {
      return { scope: "partner", businessId: null };
    }
  }

  // Tenant-signed events. Linear scan over active connections.
  const rows = await prisma.wrappConnection.findMany({
    where: { encryptedApiKey: { not: null } },
    select: { businessId: true, encryptedApiKey: true },
  });
  for (const r of rows) {
    if (!r.encryptedApiKey) continue;
    const apiKey = decryptSecret(r.encryptedApiKey);
    if (!apiKey) continue;
    const expected = createHmac("sha256", apiKey).update(rawBody).digest("hex");
    if (safeEqualHex(expected, signature)) {
      return { scope: "tenant", businessId: r.businessId };
    }
  }

  // Staging fallback tenant.
  if (env.WRAPP_STAGING_TENANT_API_KEY) {
    const expected = createHmac("sha256", env.WRAPP_STAGING_TENANT_API_KEY)
      .update(rawBody)
      .digest("hex");
    if (safeEqualHex(expected, signature)) {
      return { scope: "tenant", businessId: "*" };
    }
  }
  return null;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = (req.headers.get("x-webhook-secret") ?? "").trim();
  const eventType = (req.headers.get("event-type") ?? "").trim();

  // In development, allow unsigned calls so integration testing is possible
  // before the Wrapp side has the webhook_endpoint fully configured.
  const allowUnsigned = env.NODE_ENV !== "production" && !signature;

  let verified: Awaited<ReturnType<typeof verifySignature>> = null;
  if (!allowUnsigned) {
    verified = await verifySignature(raw, signature);
    if (!verified) {
      logger.warn("wrapp.webhook.unauthorized", {
        action: eventType || "unknown",
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // ─── Partner-scoped events (onboarding callback) ─────────────────────
  // Wrapp posts { api_key, partner_user_id, email, wrapp_user_id, ... } after
  // successful external_login onboarding. We match `partner_user_id` (which
  // we set = businessId when we called external_login) and persist the
  // tenant's api_key so subsequent tenant-API calls can log in.
  const looksLikeOnboarding =
    typeof payload.api_key === "string" &&
    typeof payload.partner_user_id === "string";

  if (
    looksLikeOnboarding &&
    (allowUnsigned || verified?.scope === "partner" || verified?.scope === "platform")
  ) {
    const businessId = String(payload.partner_user_id);
    const apiKey = String(payload.api_key);
    const wrappUserId =
      typeof payload.wrapp_user_id === "string" ? payload.wrapp_user_id : null;
    const email =
      typeof payload.email === "string" ? payload.email : null;

    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (biz) {
      await prisma.wrappConnection.upsert({
        where: { businessId },
        create: {
          businessId,
          status: "active",
          hasPlan: true,
          canIssueInvoice: true,
          wrappUserId,
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
          wrappUserId,
          wrappEmail: email ?? undefined,
          encryptedApiKey: encryptSecret(apiKey),
          encryptedJwt: null,
          jwtExpiresAt: null,
          lastVerifiedAt: new Date(),
          lastError: null,
        },
      });
      await logAudit({
        businessId,
        action: "wrapp.onboarding.completed",
        meta: { wrappUserId, email },
      });
      logger.info("wrapp.onboarding.completed", { businessId });
      return NextResponse.json({ ok: true, activated: true });
    }
    logger.warn("wrapp.onboarding.unknown_business", {
      action: "wrapp.onboarding",
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const matched = verified?.scope === "tenant" ? verified : null;
  void matched; // referenced below only for logging context

  try {
    if (eventType === "issued-invoice") {
      const data = wrappInvoiceIssuedWebhook.parse(payload);
      const doc = await prisma.document.findFirst({
        where: { wrappInvoiceId: data.id },
        select: { id: true, businessId: true },
      });
      if (doc) {
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: data.cancelled_by_mark ? "cancelled" : "issued",
            myDataMark: data.my_data_mark ?? undefined,
            myDataUid: data.my_data_uid ?? undefined,
            myDataQrUrl: data.my_data_qr_url ?? undefined,
            wrappInvoiceUrl: data.wrapp_invoice_url ?? undefined,
            wrappInvoiceUrlEn: data.wrapp_invoice_url_en ?? undefined,
            lastWrappError: null,
          },
        });
        await logAudit({
          businessId: doc.businessId,
          action: "wrapp.webhook.issued",
          entityType: "Document",
          entityId: doc.id,
          meta: { mark: data.my_data_mark, cancelled: !!data.cancelled_by_mark },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (eventType === "pos-payment") {
      const data = wrappPosPaymentWebhook.parse(payload);
      const doc = await prisma.document.findFirst({
        where: { wrappInvoiceId: data.invoice_id },
        select: { id: true, businessId: true },
      });
      if (doc) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { lastWrappError: data.errors.slice(0, 500) },
        });
        await logAudit({
          businessId: doc.businessId,
          action: "wrapp.webhook.pos_error",
          entityType: "Document",
          entityId: doc.id,
          meta: { message: data.errors },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (eventType === "invoice-pdf" || eventType === "thermal-print-pdf") {
      const data = wrappPdfWebhook.parse(payload);
      logger.info("wrapp.webhook.pdf_ready", {
        action: eventType,
        entityId: data.invoice_id,
      });
      // We don't persist the URL — it's short-lived. The UI re-requests
      // generate_pdf / generate_thermal_pdf when the user clicks download.
      return NextResponse.json({ ok: true });
    }

    logger.warn("wrapp.webhook.unknown_event", { action: eventType });
    return NextResponse.json({ ok: true, ignored: true });
  } catch (err) {
    logger.error("wrapp.webhook.handler_failed", err, { action: eventType });
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "Wrapp webhook receiver. Use POST with Event-Type header.",
  });
}
