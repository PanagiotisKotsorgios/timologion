import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { RecurringForm } from "../RecurringForm";

export const dynamic = "force-dynamic";

type LineDraft = {
  itemId?: string;
  description: string;
  quantity: number | string;
  unit: string;
  unitPrice: number | string;
  vatRate: number | string;
  discountPct: number | string;
};

export default async function EditRecurringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const { id } = await params;

  const rec = await prisma.recurringDocument.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!rec) return notFound();

  const [clients, books, branches, items] = await Promise.all([
    prisma.client.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true },
    }),
    prisma.billingBook.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { label: "asc" },
      select: { id: true, label: true, series: true },
    }),
    prisma.branch.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    }),
    prisma.item.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { name: "asc" },
      take: 500,
      select: {
        id: true,
        name: true,
        defaultPrice: true,
        vatRate: true,
        unit: true,
      },
    }),
  ]);

  const parsedLines = JSON.parse(rec.linesJson) as LineDraft[];

  return (
    <>
      <PageHeader
        title={rec.label}
        subtitle="Επεξεργασία επαναλαμβανόμενου προτύπου."
        actions={
          <LinkButton
            href="/app/documents/repeating"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω
          </LinkButton>
        }
      />

      <RecurringForm
        initial={{
          id: rec.id,
          clientId: rec.clientId,
          billingBookId: rec.billingBookId,
          branchId: rec.branchId,
          type: rec.type,
          label: rec.label,
          cadence: rec.cadence,
          nextRunAt: rec.nextRunAt.toISOString().slice(0, 10),
          paymentMethod: rec.paymentMethod,
          notes: rec.notes,
          status: rec.status,
          lines: parsedLines.map((l) => ({
            itemId: l.itemId,
            description: l.description,
            quantity: String(l.quantity),
            unit: l.unit,
            unitPrice: String(l.unitPrice),
            vatRate: String(l.vatRate),
            discountPct: String(l.discountPct ?? 0),
          })),
        }}
        clients={clients}
        books={books.map((b) => ({
          id: b.id,
          label: b.label ?? b.series,
          series: b.series,
        }))}
        branches={branches.map((b) => ({ id: b.id, name: b.label }))}
        items={items.map((i) => ({
          ...i,
          defaultPrice: i.defaultPrice.toString(),
          vatRate: Number(i.vatRate),
        }))}
      />
    </>
  );
}
