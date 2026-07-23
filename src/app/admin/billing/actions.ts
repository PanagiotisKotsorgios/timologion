"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";
import { getWrappClient, NotImplementedInPhase1 } from "@/lib/wrapp/client";

// ─── Plans ─────────────────────────────────────────────────────────────

const planSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  description: z.string().max(400).optional().or(z.literal("")),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  includedDocsMonth: z.coerce.number().int().min(0),
  features: z.string().max(4000).optional().or(z.literal("")),
  active: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).default(100),
});

export type PlanFormState = { error?: string } | undefined;

const o = (v?: string) => (v && v.length > 0 ? v : null);

export async function savePlanAction(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const ctx = await requireAdmin("super_admin");
  const parsed = planSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const data = {
    code: parsed.data.code.trim().toLowerCase(),
    name: parsed.data.name,
    description: o(parsed.data.description),
    priceMonthly: parsed.data.priceMonthly,
    priceYearly: parsed.data.priceYearly,
    includedDocsMonth: parsed.data.includedDocsMonth,
    features: o(parsed.data.features),
    active: parsed.data.active === "on",
    sortOrder: parsed.data.sortOrder,
  };

  try {
    if (parsed.data.id) {
      await prisma.platformPlan.update({
        where: { id: parsed.data.id },
        data,
      });
    } else {
      await prisma.platformPlan.create({ data });
    }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "Υπάρχει ήδη πακέτο με αυτόν τον κωδικό." };
    }
    throw err;
  }

  await logAudit({
    userId: ctx.userId,
    action: parsed.data.id ? "platform.plan.update" : "platform.plan.create",
    entityType: "PlatformPlan",
    entityId: parsed.data.id || undefined,
    meta: { code: data.code },
  });

  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function deletePlanAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const count = await prisma.businessSubscription.count({
    where: { planId: id, status: { in: ["active", "trialing", "past_due"] } },
  });
  if (count > 0) return; // Refuse when active subs still reference the plan.
  await prisma.platformPlan.delete({ where: { id } });
  await logAudit({
    userId: ctx.userId,
    action: "platform.plan.delete",
    entityType: "PlatformPlan",
    entityId: id,
  });
  revalidatePath("/admin/plans");
}

// ─── Subscriptions ─────────────────────────────────────────────────────

const subSchema = z.object({
  businessId: z.string().min(1),
  planId: z.string().min(1),
  billingCycle: z.enum(["monthly", "yearly"]),
  priceOverride: z.string().optional().or(z.literal("")),
});

export async function setSubscriptionAction(
  _prev: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = subSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const now = new Date();
  const currentPeriodEnd = new Date(now);
  if (parsed.data.billingCycle === "monthly") {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  } else {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  }

  const priceOverride =
    parsed.data.priceOverride && parsed.data.priceOverride.length > 0
      ? Number(parsed.data.priceOverride)
      : null;

  // Cancel existing active subs on this business, then insert the new one.
  await prisma.$transaction(async (tx) => {
    await tx.businessSubscription.updateMany({
      where: {
        businessId: parsed.data.businessId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      data: { status: "cancelled", cancelledAt: now },
    });
    await tx.businessSubscription.create({
      data: {
        businessId: parsed.data.businessId,
        planId: parsed.data.planId,
        billingCycle: parsed.data.billingCycle,
        status: "active",
        priceOverride,
        currentPeriodStart: now,
        currentPeriodEnd,
        nextBillingAt: currentPeriodEnd,
      },
    });
  });

  await logAudit({
    userId: ctx.userId,
    businessId: parsed.data.businessId,
    action: "platform.subscription.set",
    entityType: "Business",
    entityId: parsed.data.businessId,
    meta: { planId: parsed.data.planId, cycle: parsed.data.billingCycle },
  });

  revalidatePath(`/admin/businesses/${parsed.data.businessId}`);
  revalidatePath("/admin/billing");
  return { success: "Η συνδρομή ενημερώθηκε." };
}

export async function cancelSubscriptionAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const id = String(formData.get("subscriptionId") ?? "");
  if (!id) return;
  await prisma.businessSubscription.update({
    where: { id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  await logAudit({
    userId: ctx.userId,
    action: "platform.subscription.cancel",
    entityType: "BusinessSubscription",
    entityId: id,
  });
  revalidatePath(`/admin/businesses`);
  revalidatePath("/admin/billing");
}

// ─── Provider costs ────────────────────────────────────────────────────

const providerCostSchema = z.object({
  businessId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  netAmount: z.coerce.number().min(0),
  vatAmount: z.coerce.number().min(0),
  description: z.string().max(255).optional().or(z.literal("")),
});

export async function recordProviderCostAction(
  _prev: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const ctx = await requireAdmin("super_admin");
  const parsed = providerCostSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await prisma.providerCost.create({
    data: {
      businessId: parsed.data.businessId,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
      netAmount: parsed.data.netAmount,
      vatAmount: parsed.data.vatAmount,
      totalAmount: parsed.data.netAmount + parsed.data.vatAmount,
      description: o(parsed.data.description),
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: parsed.data.businessId,
    action: "platform.provider_cost.record",
    entityType: "ProviderCost",
    meta: { total: parsed.data.netAmount + parsed.data.vatAmount },
  });

  revalidatePath(`/admin/businesses/${parsed.data.businessId}`);
  revalidatePath("/admin/billing");
  return { success: "Το κόστος καταχωρήθηκε." };
}

// ─── Platform invoices to customers ────────────────────────────────────

const platformInvoiceSchema = z.object({
  businessId: z.string().min(1),
  subscriptionId: z.string().optional().or(z.literal("")),
  description: z.string().min(2).max(255),
  netAmount: z.coerce.number().min(0),
  vatAmount: z.coerce.number().min(0),
  providerCost: z.coerce.number().min(0).default(0),
  providerRebate: z.coerce.number().min(0).default(0),
  periodStart: z.string().optional().or(z.literal("")),
  periodEnd: z.string().optional().or(z.literal("")),
});

export type PlatformInvoiceFormState = { error?: string } | undefined;

export async function createPlatformInvoiceAction(
  _prev: PlatformInvoiceFormState,
  formData: FormData,
): Promise<PlatformInvoiceFormState> {
  const ctx = await requireAdmin("super_admin");
  const parsed = platformInvoiceSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const net = parsed.data.netAmount;
  const vat = parsed.data.vatAmount;
  const total = net + vat;
  const margin = total - parsed.data.providerCost + parsed.data.providerRebate;

  const invoice = await prisma.platformInvoice.create({
    data: {
      businessId: parsed.data.businessId,
      subscriptionId: parsed.data.subscriptionId || null,
      description: parsed.data.description,
      netAmount: net,
      vatAmount: vat,
      totalAmount: total,
      providerCost: parsed.data.providerCost,
      providerRebate: parsed.data.providerRebate,
      margin,
      periodStart: parsed.data.periodStart
        ? new Date(parsed.data.periodStart)
        : null,
      periodEnd: parsed.data.periodEnd
        ? new Date(parsed.data.periodEnd)
        : null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: parsed.data.businessId,
    action: "platform.invoice.draft",
    entityType: "PlatformInvoice",
    entityId: invoice.id,
    meta: { total, margin },
  });

  revalidatePath(`/admin/businesses/${parsed.data.businessId}`);
  revalidatePath("/admin/billing");
  redirect(`/admin/billing`);
}

/**
 * Issue a PlatformInvoice through the (stubbed) Wrapp client. Records MARK /
 * UID / invoice URL when successful. This uses the PLATFORM's provider account
 * — different flow from the tenant issuance endpoint.
 */
export async function issuePlatformInvoiceAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const inv = await prisma.platformInvoice.findUnique({
    where: { id },
    include: { business: true },
  });
  if (!inv) return;

  await prisma.platformInvoice.update({
    where: { id },
    data: { status: "sending" },
  });

  try {
    const netN = Number(inv.netAmount);
    const vatN = Number(inv.vatAmount);
    const totalN = Number(inv.totalAmount);
    const vatRate = netN > 0 ? Math.round((vatN / netN) * 100) : 0;

    const res = await getWrappClient().issueInvoice(inv.businessId, {
      invoice_type_code: "2.1",
      billing_book_id: inv.series ?? "PLATFORM",
      payment_method_type: 2,
      net_total_amount: netN,
      vat_total_amount: vatN,
      total_amount: totalN,
      payable_total_amount: totalN,
      counterpart: {
        name: inv.business.legalName,
        country_code: "GR",
        vat: inv.business.vatNumber,
      },
      invoice_lines: [
        {
          line_number: 1,
          name: inv.description.slice(0, 200),
          quantity: 1,
          quantity_type: 1,
          unit_price: netN,
          net_total_price: netN,
          vat_rate: vatRate,
          vat_total: vatN,
          subtotal: totalN,
          classification_category: "category1_3",
          classification_type: "E3_561_001",
        },
      ],
    });

    // Response shape can be issued/pending/error — narrow before use.
    const asObj = res as Record<string, unknown>;
    if (typeof asObj.id === "string") {
      await prisma.platformInvoice.update({
        where: { id },
        data: {
          status: "issued",
          issuedAt: new Date(),
          wrappInvoiceId: asObj.id,
          wrappInvoiceUrl:
            typeof asObj.wrapp_invoice_url === "string"
              ? asObj.wrapp_invoice_url
              : null,
          myDataMark:
            typeof asObj.my_data_mark === "string" ? asObj.my_data_mark : null,
          myDataUid:
            typeof asObj.my_data_uid === "string" ? asObj.my_data_uid : null,
        },
      });
    } else if (
      asObj.status === "pending" &&
      typeof asObj.invoice_id === "string"
    ) {
      await prisma.platformInvoice.update({
        where: { id },
        data: { status: "sending", wrappInvoiceId: asObj.invoice_id },
      });
    } else {
      throw new Error("Wrapp returned an error envelope for platform invoice.");
    }

    await logAudit({
      userId: ctx.userId,
      businessId: inv.businessId,
      action: "platform.invoice.issue.ok",
      entityType: "PlatformInvoice",
      entityId: id,
    });
  } catch (err) {
    const message =
      err instanceof NotImplementedInPhase1
        ? err.message
        : "Απροσδόκητο σφάλμα από τον πάροχο.";
    await prisma.platformInvoice.update({
      where: { id },
      data: { status: "failed" },
    });
    await logAudit({
      userId: ctx.userId,
      businessId: inv.businessId,
      action: "platform.invoice.issue.fail",
      entityType: "PlatformInvoice",
      entityId: id,
      meta: { message },
    });
  }

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/businesses/${inv.businessId}`);
}
