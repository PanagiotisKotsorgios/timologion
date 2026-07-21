import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { RecurringForm } from "../RecurringForm";

export const dynamic = "force-dynamic";

export default async function NewRecurringPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

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

  return (
    <>
      <PageHeader
        title="Νέο επαναλαμβανόμενο"
        subtitle="Δημιούργησε ένα πρότυπο που θα παράγει αυτόματα πρόχειρα."
        actions={
          <LinkButton
            href="/app/documents/repeating"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω στη λίστα
          </LinkButton>
        }
      />

      <RecurringForm
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
