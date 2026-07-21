"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

// ─── Leads ──────────────────────────────────────────────────────────────

const leadSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  fullName: z.string().min(2).max(160),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(160).optional().or(z.literal("")),
  source: z.string().max(80).optional().or(z.literal("")),
  status: z.enum(["new", "contacted", "qualified", "disqualified", "converted"]),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

function nn(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

export async function saveLeadAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const parsed = leadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const data = {
    businessId: ctx.businessId,
    fullName: parsed.data.fullName,
    email: nn(parsed.data.email),
    phone: nn(parsed.data.phone),
    company: nn(parsed.data.company),
    source: nn(parsed.data.source),
    status: parsed.data.status,
    notes: nn(parsed.data.notes),
  };

  let lead: { id: string };
  if (parsed.data.id) {
    lead = await prisma.lead.update({
      where: { id: parsed.data.id },
      data,
      select: { id: true },
    });
  } else {
    lead = await prisma.lead.create({ data, select: { id: true } });
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: parsed.data.id ? "lead.update" : "lead.create",
    entityType: "Lead",
    entityId: lead.id,
  });

  revalidatePath("/app/crm/leads");
  return { ok: true, id: lead.id };
}

export async function updateLeadStatusAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["new", "contacted", "qualified", "disqualified", "converted"].includes(status))
    return;
  await prisma.lead.updateMany({
    where: { id, businessId: ctx.businessId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { status: status as any },
  });
  revalidatePath("/app/crm/leads");
}

export async function deleteLeadAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  await prisma.lead.deleteMany({ where: { id, businessId: ctx.businessId } });
  revalidatePath("/app/crm/leads");
}

// ─── Opportunities ──────────────────────────────────────────────────────

const opportunitySchema = z.object({
  id: z.string().optional().or(z.literal("")),
  title: z.string().min(2).max(200),
  leadId: z.string().optional().or(z.literal("")),
  stage: z.enum(["discovery", "proposal", "negotiation", "won", "lost"]),
  amount: z.coerce.number().min(0),
  probability: z.coerce.number().int().min(0).max(100),
  expectedCloseAt: z.string().optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export async function saveOpportunityAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const parsed = opportunitySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const data = {
    businessId: ctx.businessId,
    title: parsed.data.title,
    leadId: parsed.data.leadId || null,
    stage: parsed.data.stage,
    amount: parsed.data.amount,
    probability: parsed.data.probability,
    expectedCloseAt: parsed.data.expectedCloseAt
      ? new Date(parsed.data.expectedCloseAt)
      : null,
    notes: nn(parsed.data.notes),
  };

  let opp: { id: string };
  if (parsed.data.id) {
    opp = await prisma.opportunity.update({
      where: { id: parsed.data.id },
      data,
      select: { id: true },
    });
  } else {
    opp = await prisma.opportunity.create({ data, select: { id: true } });
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: parsed.data.id ? "opportunity.update" : "opportunity.create",
    entityType: "Opportunity",
    entityId: opp.id,
  });

  revalidatePath("/app/crm/pipeline");
  return { ok: true, id: opp.id };
}

export async function moveOpportunityStageAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!["discovery", "proposal", "negotiation", "won", "lost"].includes(stage))
    return;
  await prisma.opportunity.updateMany({
    where: { id, businessId: ctx.businessId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { stage: stage as any },
  });
  revalidatePath("/app/crm/pipeline");
}

export async function deleteOpportunityAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  await prisma.opportunity.deleteMany({
    where: { id, businessId: ctx.businessId },
  });
  revalidatePath("/app/crm/pipeline");
}

// ─── Tasks ──────────────────────────────────────────────────────────────

const taskSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
  reminderAt: z.string().optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
});

export async function saveTaskAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const parsed = taskSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const data = {
    businessId: ctx.businessId,
    title: parsed.data.title,
    description: nn(parsed.data.description),
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null,
    assigneeId: parsed.data.assigneeId || null,
    leadId: parsed.data.leadId || null,
    clientId: parsed.data.clientId || null,
  };

  let task: { id: string };
  if (parsed.data.id) {
    task = await prisma.crmTask.update({
      where: { id: parsed.data.id },
      data,
      select: { id: true },
    });
  } else {
    task = await prisma.crmTask.create({ data, select: { id: true } });
  }

  revalidatePath("/app/crm/tasks");
  return { ok: true, id: task.id };
}

export async function toggleTaskDoneAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  const task = await prisma.crmTask.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true, status: true },
  });
  if (!task) return;
  await prisma.crmTask.update({
    where: { id: task.id },
    data: { status: task.status === "done" ? "open" : "done" },
  });
  revalidatePath("/app/crm/tasks");
}

export async function deleteTaskAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  await prisma.crmTask.deleteMany({
    where: { id, businessId: ctx.businessId },
  });
  revalidatePath("/app/crm/tasks");
}
