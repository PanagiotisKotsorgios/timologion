import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { SITE } from "@/lib/seo";

/**
 * Diagnostic endpoint for the "activation gate keeps showing after Wrapp
 * onboarding" class of problems. Auth-gated — returns data only for the
 * caller's active business. No secrets exposed.
 *
 * Shows:
 *   - Current WrappConnection state (status, hasApiKey, lastError, timestamps)
 *   - Expected webhook URL and partner_user_id we'd send on activation
 *   - Last 30 webhook attempts, filtered to this business where possible
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireTenant();

  const [conn, recentLogs, allLogs] = await Promise.all([
    prisma.wrappConnection.findUnique({
      where: { businessId: ctx.businessId },
      select: {
        status: true,
        hasPlan: true,
        canIssueInvoice: true,
        wrappEmail: true,
        wrappUserId: true,
        encryptedApiKey: true,
        webhookEndpoint: true,
        lastVerifiedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.wrappWebhookLog.findMany({
      where: { partnerUserId: ctx.businessId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.wrappWebhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const baseUrl = SITE.url;

  return NextResponse.json(
    {
      businessId: ctx.businessId,
      businessName: ctx.businessName,
      appBaseUrl: baseUrl,
      nodeEnv: env.NODE_ENV,
      expectedWebhookUrl: `${baseUrl}/api/wrapp/webhook`,
      expectedReturnUrl: `${baseUrl}/app/wrapp/return?bid=${ctx.businessId}`,
      partnerUserIdSentToWrapp: ctx.businessId,

      wrappConnection: conn
        ? {
            status: conn.status,
            hasApiKey: !!conn.encryptedApiKey,
            canIssueInvoice: conn.canIssueInvoice,
            hasPlan: conn.hasPlan,
            wrappEmail: conn.wrappEmail,
            wrappUserId: conn.wrappUserId,
            webhookEndpoint: conn.webhookEndpoint,
            lastVerifiedAt: conn.lastVerifiedAt,
            lastError: conn.lastError,
            createdAt: conn.createdAt,
            updatedAt: conn.updatedAt,
          }
        : null,

      webhookHitsForThisBusiness: recentLogs.map((l) => ({
        at: l.createdAt,
        eventType: l.eventType,
        hasSignature: l.hasSignature,
        verificationScope: l.verificationScope,
        partnerUserId: l.partnerUserId,
        businessMatched: l.businessMatched,
        outcome: l.outcome,
        detail: l.detail,
        payloadKeys: l.payloadKeys,
      })),

      recentWebhookHitsGlobal: allLogs.map((l) => ({
        at: l.createdAt,
        eventType: l.eventType,
        hasSignature: l.hasSignature,
        verificationScope: l.verificationScope,
        partnerUserId: l.partnerUserId,
        businessMatched: l.businessMatched,
        outcome: l.outcome,
      })),

      hint: [
        "If webhookHitsForThisBusiness is empty: Wrapp never called our webhook. Check that expectedWebhookUrl is publicly reachable and that Wrapp received it during onboarding.",
        "If a hit exists with outcome=onboarding_unknown_business: Wrapp sent a partner_user_id that does not match our Business.id — check the value logged in detail vs businessId above.",
        "If a hit exists with outcome=unauthorized: signature missing and roundtrip verification failed — the api_key Wrapp sent is not valid.",
        "If wrappConnection.status is 'active' but the gate still shows: check activation-actions.ts — checkActivationAction requires status=active AND canIssueInvoice AND hasApiKey.",
      ],
    },
    { headers: { "cache-control": "no-store" } },
  );
}
