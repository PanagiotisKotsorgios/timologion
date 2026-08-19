"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { getWrappPartnerClient, WrappApiError } from "@/lib/wrapp/client";
import { SITE } from "@/lib/seo";

/**
 * Return a fresh Wrapp login URL for the current tenant so they can
 * manage plans / cancel / view invoices directly in the certified
 * provider's own portal.
 *
 * Billing is Wrapp's, not ours — we deliberately don't own the
 * plan-change / cancellation lifecycle. This action just mints a
 * time-limited signed-in link via the partner external_login endpoint
 * and hands it back to the client, which opens it in a new tab.
 *
 * Requires an active Wrapp connection with a stored email (i.e. the
 * tenant has completed onboarding at least once) — otherwise we can't
 * point Wrapp at the right account.
 */
export async function openWrappBillingPortalAction(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const [business, connection] = await Promise.all([
    prisma.business.findUnique({
      where: { id: ctx.businessId },
      select: {
        email: true,
        phone: true,
        legalName: true,
        vatNumber: true,
      },
    }),
    prisma.wrappConnection.findUnique({
      where: { businessId: ctx.businessId },
      select: { wrappEmail: true, status: true },
    }),
  ]);

  const email = connection?.wrappEmail?.trim() || business?.email?.trim();
  if (!email) {
    return {
      ok: false,
      error:
        "Λείπει το email του Wrapp λογαριασμού. Ολοκλήρωσε πρώτα την ενεργοποίηση.",
    };
  }

  const partner = await getWrappPartnerClient();
  if (!partner) {
    return {
      ok: false,
      error:
        "Ο λογαριασμός συνεργάτη δεν έχει ρυθμιστεί. Επικοινώνησε με την υποστήριξη.",
    };
  }

  const legalName = business?.legalName?.trim() ?? "";
  const vat = business?.vatNumber?.replace(/\D/g, "") ?? "";
  const phone = business?.phone?.trim() || "0000000000";

  try {
    const res = await partner.externalLogin({
      email,
      phone,
      name: legalName || undefined,
      vat: vat.length === 9 ? vat : undefined,
      partner_user_id: ctx.businessId,
      return_url: `${SITE.url}/app/settings/subscription`,
      webhook_endpoint: `${SITE.url}/api/wrapp/webhook`,
    });
    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "wrapp.billing_portal.open",
    });
    return { ok: true, url: res.login_url };
  } catch (err) {
    logger.error("wrapp.billing_portal.failed", err, {
      businessId: ctx.businessId,
    });
    if (err instanceof WrappApiError && err.httpStatus >= 500) {
      return {
        ok: false,
        error:
          "Ο πάροχος είναι προσωρινά μη διαθέσιμος. Δοκίμασε ξανά σε λίγο.",
      };
    }
    return {
      ok: false,
      error:
        "Δεν καταφέραμε να ανοίξουμε τη σελίδα διαχείρισης πακέτου στη Wrapp. Δοκίμασε ξανά σε λίγο.",
    };
  }
}
