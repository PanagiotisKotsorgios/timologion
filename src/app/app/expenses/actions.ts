"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "iris",
  "check",
  "credit",
  "other",
] as const;

function o(v: string | undefined | null): string | null {
  return v && v.length > 0 ? v : null;
}

// ─── Suppliers ─────────────────────────────────────────────────────────

const supplierSchema = z.object({
  vatNumber: z.string().max(20).optional().or(z.literal("")),
  legalName: z.string().min(2).max(160),
  tradeName: z.string().max(160).optional().or(z.literal("")),
  taxOffice: z.string().max(120).optional().or(z.literal("")),
  activity: z.string().max(200).optional().or(z.literal("")),
  addressLine: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  iban: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export type SupplierFormState = { error?: string } | undefined;

export async function createSupplierAction(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const parsed = supplierSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const supplier = await prisma.supplier.create({
    data: {
      businessId: ctx.businessId,
      vatNumber: o(parsed.data.vatNumber),
      legalName: parsed.data.legalName,
      tradeName: o(parsed.data.tradeName),
      taxOffice: o(parsed.data.taxOffice),
      activity: o(parsed.data.activity),
      addressLine: o(parsed.data.addressLine),
      city: o(parsed.data.city),
      postalCode: o(parsed.data.postalCode),
      email: o(parsed.data.email),
      phone: o(parsed.data.phone),
      iban: o(parsed.data.iban),
      notes: o(parsed.data.notes),
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "supplier.create",
    entityType: "Supplier",
    entityId: supplier.id,
  });

  revalidatePath("/app/expenses/suppliers");
  redirect(`/app/expenses/suppliers/${supplier.id}`);
}

export async function updateSupplierAction(
  supplierId: string,
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const parsed = supplierSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const res = await prisma.supplier.updateMany({
    where: { id: supplierId, businessId: ctx.businessId },
    data: {
      vatNumber: o(parsed.data.vatNumber),
      legalName: parsed.data.legalName,
      tradeName: o(parsed.data.tradeName),
      taxOffice: o(parsed.data.taxOffice),
      activity: o(parsed.data.activity),
      addressLine: o(parsed.data.addressLine),
      city: o(parsed.data.city),
      postalCode: o(parsed.data.postalCode),
      email: o(parsed.data.email),
      phone: o(parsed.data.phone),
      iban: o(parsed.data.iban),
      notes: o(parsed.data.notes),
    },
  });
  if (res.count === 0) return { error: "Ο προμηθευτής δεν βρέθηκε." };

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "supplier.update",
    entityType: "Supplier",
    entityId: supplierId,
  });

  revalidatePath(`/app/expenses/suppliers/${supplierId}`);
  revalidatePath("/app/expenses/suppliers");
  redirect(`/app/expenses/suppliers/${supplierId}`);
}

export async function deleteSupplierAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.supplier.deleteMany({
    where: { id, businessId: ctx.businessId },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "supplier.delete",
    entityType: "Supplier",
    entityId: id,
  });
  revalidatePath("/app/expenses/suppliers");
  redirect("/app/expenses/suppliers");
}

// ─── Expenses ──────────────────────────────────────────────────────────

const expenseSchema = z.object({
  supplierId: z.string().optional().or(z.literal("")),
  category: z.string().max(80).optional().or(z.literal("")),
  myDataType: z.string().max(40).optional().or(z.literal("")),
  reference: z.string().max(80).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  netAmount: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100),
  issueDate: z.string().min(1),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export type ExpenseFormState = { error?: string } | undefined;

function computeVatAndTotal(net: number, vatRate: number) {
  const vatAmount = Math.round(((net * vatRate) / 100) * 100) / 100;
  const total = Math.round((net + vatAmount) * 100) / 100;
  return { vatAmount, total };
}

async function recomputeExpenseStatus(
  tx: Prisma.TransactionClient,
  expenseId: string,
) {
  const expense = await tx.expense.findUnique({
    where: { id: expenseId },
    select: { totalAmount: true },
  });
  if (!expense) return;
  const agg = await tx.expensePayment.aggregate({
    where: { expenseId },
    _sum: { amount: true },
  });
  const paid = Number(agg._sum.amount ?? 0);
  const total = Number(expense.totalAmount);
  const paymentStatus =
    paid <= 0 ? "unpaid" : paid + 0.001 < total ? "partial" : "paid";
  await tx.expense.update({
    where: { id: expenseId },
    data: { paidAmount: paid, paymentStatus },
  });
}

export async function createExpenseAction(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const parsed = expenseSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const { vatAmount, total } = computeVatAndTotal(
    parsed.data.netAmount,
    parsed.data.vatRate,
  );

  const supplierId = parsed.data.supplierId || null;
  if (supplierId) {
    const sup = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId: ctx.businessId },
      select: { id: true },
    });
    if (!sup) return { error: "Ο προμηθευτής δεν βρέθηκε." };
  }

  const expense = await prisma.expense.create({
    data: {
      businessId: ctx.businessId,
      supplierId,
      category: o(parsed.data.category),
      myDataType: o(parsed.data.myDataType),
      reference: o(parsed.data.reference),
      description: o(parsed.data.description),
      netAmount: parsed.data.netAmount,
      vatRate: parsed.data.vatRate,
      vatAmount,
      totalAmount: total,
      issueDate: new Date(parsed.data.issueDate),
      notes: o(parsed.data.notes),
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "expense.create",
    entityType: "Expense",
    entityId: expense.id,
    meta: { total },
  });

  revalidatePath("/app/expenses");
  redirect(`/app/expenses/${expense.id}`);
}

export async function updateExpenseAction(
  expenseId: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const parsed = expenseSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const { vatAmount, total } = computeVatAndTotal(
    parsed.data.netAmount,
    parsed.data.vatRate,
  );

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!existing) return { error: "Το έξοδο δεν βρέθηκε." };

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expenseId },
      data: {
        supplierId: parsed.data.supplierId || null,
        category: o(parsed.data.category),
        myDataType: o(parsed.data.myDataType),
        reference: o(parsed.data.reference),
        description: o(parsed.data.description),
        netAmount: parsed.data.netAmount,
        vatRate: parsed.data.vatRate,
        vatAmount,
        totalAmount: total,
        issueDate: new Date(parsed.data.issueDate),
        notes: o(parsed.data.notes),
      },
    });
    await recomputeExpenseStatus(tx, expenseId);
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "expense.update",
    entityType: "Expense",
    entityId: expenseId,
  });

  revalidatePath("/app/expenses");
  revalidatePath(`/app/expenses/${expenseId}`);
  redirect(`/app/expenses/${expenseId}`);
}

export async function deleteExpenseAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.expense.deleteMany({
    where: { id, businessId: ctx.businessId },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "expense.delete",
    entityType: "Expense",
    entityId: id,
  });
  revalidatePath("/app/expenses");
  redirect("/app/expenses");
}

// ─── Expense payments ──────────────────────────────────────────────────

const expensePaymentSchema = z.object({
  expenseId: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().gt(0),
  method: z.enum(METHODS).default("bank_transfer"),
  reference: z.string().max(160).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  paidAt: z.string().optional().or(z.literal("")),
});

export type ExpensePaymentFormState = { error?: string } | undefined;

export async function recordExpensePaymentAction(
  _prev: ExpensePaymentFormState,
  formData: FormData,
): Promise<ExpensePaymentFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const parsed = expensePaymentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const expenseId = parsed.data.expenseId || null;
  let supplierId = parsed.data.supplierId || null;

  let exp: {
    id: string;
    supplierId: string | null;
  } | null = null;
  if (expenseId) {
    exp = await prisma.expense.findFirst({
      where: { id: expenseId, businessId: ctx.businessId },
      select: { id: true, supplierId: true },
    });
    if (!exp) return { error: "Το έξοδο δεν βρέθηκε." };
    if (!supplierId) supplierId = exp.supplierId;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.expensePayment.create({
      data: {
        businessId: ctx.businessId,
        expenseId,
        supplierId,
        amount: parsed.data.amount,
        method: parsed.data.method as PaymentMethod,
        reference: o(parsed.data.reference),
        notes: o(parsed.data.notes),
        paidAt: parsed.data.paidAt
          ? new Date(parsed.data.paidAt)
          : new Date(),
      },
    });
    if (exp) await recomputeExpenseStatus(tx, exp.id);
    return created;
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "expense_payment.record",
    entityType: "ExpensePayment",
    entityId: payment.id,
    meta: { amount: parsed.data.amount, method: parsed.data.method },
  });

  revalidatePath("/app/expenses");
  if (expenseId) revalidatePath(`/app/expenses/${expenseId}`);
  if (supplierId) revalidatePath(`/app/expenses/suppliers/${supplierId}`);
  return undefined;
}

export async function deleteExpensePaymentAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payment = await prisma.expensePayment.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true, expenseId: true, supplierId: true },
  });
  if (!payment) return;

  await prisma.$transaction(async (tx) => {
    await tx.expensePayment.delete({ where: { id: payment.id } });
    if (payment.expenseId) await recomputeExpenseStatus(tx, payment.expenseId);
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "expense_payment.delete",
    entityType: "ExpensePayment",
    entityId: id,
  });

  revalidatePath("/app/expenses");
  if (payment.expenseId) revalidatePath(`/app/expenses/${payment.expenseId}`);
}
