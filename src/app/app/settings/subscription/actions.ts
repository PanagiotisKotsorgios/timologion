"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const changeSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["monthly", "yearly"]),
});

export type ChangePlanState = { error?: string; success?: string } | undefined;

export async function changePlanAction(
  _prev: ChangePlanState,
  formData: FormData,
): Promise<ChangePlanState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const parsed = changeSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const plan = await prisma.platformPlan.findFirst({
    where: { id: parsed.data.planId, active: true },
  });
  if (!plan) return { error: "Το πακέτο δεν είναι διαθέσιμο." };

  const now = new Date();
  const periodEnd = new Date(now);
  if (parsed.data.billingCycle === "monthly") {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.businessSubscription.updateMany({
      where: {
        businessId: ctx.businessId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      data: { status: "cancelled", cancelledAt: now },
    });
    await tx.businessSubscription.create({
      data: {
        businessId: ctx.businessId,
        planId: plan.id,
        billingCycle: parsed.data.billingCycle,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingAt: periodEnd,
      },
    });
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "tenant.subscription.change_plan",
    entityType: "BusinessSubscription",
    meta: { planId: plan.id, cycle: parsed.data.billingCycle },
  });

  revalidatePath("/app/settings/subscription");
  return { success: `Άλλαξες σε πακέτο ${plan.name}.` };
}

export async function cancelSubscriptionAction() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const now = new Date();
  await prisma.businessSubscription.updateMany({
    where: {
      businessId: ctx.businessId,
      status: { in: ["active", "trialing", "past_due"] },
    },
    data: { status: "cancelled", cancelledAt: now },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "tenant.subscription.cancel",
  });

  revalidatePath("/app/settings/subscription");
}
