"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { getWrappClient } from "@/lib/wrapp/client";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";

/**
 * Ask the provider whether the current tenant is active. Wired to the stub
 * client for now — will do the real HTTP call once the provider integration
 * ships. Reads/writes the WrappConnection row for the current business.
 */
export async function checkActivationAction() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

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
      lastVerifiedAt: new Date(),
    },
    update: {
      status: active ? "active" : "pending",
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
    action: "wrapp.status.check",
    meta: { active },
  });

  revalidatePath("/app", "layout");
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
