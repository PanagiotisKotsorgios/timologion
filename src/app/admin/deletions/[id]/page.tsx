import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDeletionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const row = await prisma.accountDeletionLog.findUnique({
    where: { id },
  });
  if (!row) notFound();

  let snapshot: Record<string, unknown> = {};
  try {
    snapshot = JSON.parse(row.snapshot) as Record<string, unknown>;
  } catch {
    // corrupt payload
  }

  return (
    <>
      <PageHeader
        title={row.userEmail}
        subtitle={`Διαγράφηκε ${date(row.createdAt)}${row.userFullName ? " · " + row.userFullName : ""}`}
      />

      <div className="mb-4 text-sm">
        <Link
          href="/admin/deletions"
          className="text-brand-800 hover:text-brand-900"
        >
          ← Πίσω στη λίστα
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Σύνοψη" />
          <CardBody className="space-y-3 p-6 md:p-8">
            <Row label="User ID (πριν τη διαγραφή)" value={row.userId} mono />
            <Row label="Email" value={row.userEmail} mono />
            <Row
              label="Ονοματεπώνυμο"
              value={row.userFullName ?? "—"}
            />
            <Row
              label="Επιχειρήσεις που διαγράφηκαν"
              value={String(row.businessesDeleted)}
            />
            <Row
              label="Παραστατικά (τη στιγμή της διαγραφής)"
              value={String(row.documentsRetained)}
            />
            <Row label="IP" value={row.ipAddress ?? "—"} mono />
            <Row
              label="User agent"
              value={row.userAgent ?? "—"}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Λόγος διαγραφής" />
          <CardBody className="p-6 md:p-8">
            {row.reason ? (
              <p className="whitespace-pre-wrap text-base text-ink-900">
                {row.reason}
              </p>
            ) : (
              <p className="text-sm text-ink-500">Δεν δόθηκε λόγος.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Snapshot" subtitle="Πλήρες JSON payload την ώρα της διαγραφής" />
        <CardBody className="p-4 md:p-6">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink-100 p-4 text-xs leading-relaxed">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-b-2 border-ink-200/60 pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p
        className={
          "mt-1 break-all text-base font-semibold text-ink-900 " +
          (mono ? "mono" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
