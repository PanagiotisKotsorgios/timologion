"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getWrappClient } from "@/lib/wrapp/client";

/**
 * Phase 1: this action triggers a "verification" against the stubbed Wrapp
 * client and records the result on the WrappConnection row. In Phase 2 this
 * will call the real API and only mark the connection active if the returned
 * tenant details confirm plan + issue permission.
 */
export async function refreshWrappStatusAction() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const details = await getWrappClient().getTenantDetails(ctx.businessId);

  await prisma.wrappConnection.upsert({
    where: { businessId: ctx.businessId },
    create: {
      businessId: ctx.businessId,
      status: details.issue_invoice_status ? "active" : "inactive",
      hasPlan: details.has_plan,
      canIssueInvoice: details.issue_invoice_status,
      wrappUserId: details.wrapp_user_id,
      lastVerifiedAt: new Date(),
    },
    update: {
      status: details.issue_invoice_status ? "active" : "inactive",
      hasPlan: details.has_plan,
      canIssueInvoice: details.issue_invoice_status,
      wrappUserId: details.wrapp_user_id,
      lastVerifiedAt: new Date(),
      lastError: null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "wrapp.status.refresh",
  });

  revalidatePath("/app/settings/wrapp");
}
