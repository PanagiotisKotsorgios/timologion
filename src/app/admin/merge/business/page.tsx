import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { MergeBusinessForm } from "./MergeBusinessForm";

export const dynamic = "force-dynamic";

export default async function AdminMergeBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ vat?: string }>;
}) {
  await requireAdmin("super_admin");
  const { vat } = await searchParams;
  if (!vat) notFound();

  const candidates = await prisma.business.findMany({
    where: { vatNumber: vat },
    include: {
      _count: {
        select: {
          members: true,
          documents: true,
          clients: true,
          items: true,
          expenses: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (candidates.length < 2) {
    return (
      <>
        <PageHeader
          title={`ΑΦΜ ${vat}`}
          subtitle="Δεν υπάρχει άλλο διπλότυπο"
          actions={
            <LinkButton href="/admin/merge" variant="secondary" icon={ArrowLeft}>
              Πίσω
            </LinkButton>
          }
        />
        <Alert tone="success">
          Δεν βρέθηκαν πλέον διπλότυπες εγγραφές για αυτό το ΑΦΜ.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`ΑΦΜ ${vat}`}
        subtitle={`${candidates.length} διπλότυπες εγγραφές — επίλεξε winner`}
        actions={
          <LinkButton href="/admin/merge" variant="secondary" icon={ArrowLeft}>
            Πίσω
          </LinkButton>
        }
      />

      <Alert tone="warning">
        Ο winner κρατά την ταυτότητά του (id). Οι υπόλοιποι διαγράφονται
        αφού μεταφερθούν όλες οι σχέσεις (documents, clients, items,
        expenses, members, subscriptions, feature flags, tags,
        πληρωμές, ραντεβού κ.λπ.). Δεν υπάρχει undo.
      </Alert>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {candidates.map((b) => (
          <Card key={b.id}>
            <CardHeader
              title={b.tradeName ?? b.legalName}
              subtitle={
                <span>
                  Δημιουργήθηκε {b.createdAt.toLocaleDateString("el-GR")} ·
                  ID {b.id.slice(-8)}
                </span>
              }
              action={
                b.suspendedAt && (
                  <Badge tone="danger">SUSPENDED</Badge>
                )
              }
            />
            <CardBody className="space-y-2 text-sm">
              <p>
                <strong>Legal:</strong> {b.legalName}
              </p>
              {b.tradeName && (
                <p>
                  <strong>Trade:</strong> {b.tradeName}
                </p>
              )}
              <p>
                <strong>Email:</strong> {b.email ?? "—"}
              </p>
              <p>
                <strong>Πόλη:</strong> {b.city ?? "—"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Μέλη" value={b._count.members} />
                <Stat label="Παραστ." value={b._count.documents} />
                <Stat label="Πελάτες" value={b._count.clients} />
                <Stat label="Είδη" value={b._count.items} />
                <Stat label="Έξοδα" value={b._count.expenses} />
              </div>
              <p className="mt-3">
                <Link
                  href={`/admin/businesses/${b.id}`}
                  className="text-xs font-bold text-brand-800 hover:text-brand-900"
                >
                  Δες πλήρη καρτέλα →
                </Link>
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Εκτέλεση merge" />
        <CardBody>
          <MergeBusinessForm
            candidates={candidates.map((b) => ({
              id: b.id,
              label: `${b.tradeName ?? b.legalName} · ${b._count.documents} παραστ. · ID ${b.id.slice(-8)}`,
            }))}
          />
        </CardBody>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className="text-lg font-black tabular-nums text-brand-900">
        {value.toLocaleString("el-GR")}
      </p>
    </div>
  );
}
