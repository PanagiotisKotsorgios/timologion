import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EntityNotes } from "@/components/admin/EntityNotes";
import { money, date } from "@/lib/format";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      business: {
        select: { id: true, legalName: true, tradeName: true, vatNumber: true },
      },
      client: {
        select: {
          id: true,
          legalName: true,
          vatNumber: true,
          taxOffice: true,
          city: true,
          email: true,
        },
      },
      lines: { orderBy: { ordinal: "asc" } },
      correlatedDocument: {
        select: { id: true, series: true, number: true, myDataMark: true },
      },
    },
  });
  if (!doc) notFound();

  return (
    <>
      <PageHeader
        title={`${t.documents.types[doc.type]}${doc.series && doc.number ? ` · ${doc.series} #${doc.number}` : ""}`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <StatusBadge status={doc.status} />
            <span className="text-xs text-ink-500">
              {date(doc.issueDate)} · ID {doc.id.slice(-8)}
            </span>
          </span>
        }
        actions={
          <LinkButton
            href="/admin/documents"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω στη λίστα
          </LinkButton>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader title="Στοιχεία παραστατικού" />
          <CardBody className="grid gap-4 p-6 sm:grid-cols-2">
            <Info label="Επιχείρηση">
              <Link
                href={`/admin/businesses/${doc.business.id}`}
                className="text-brand-800 hover:text-brand-900"
              >
                {doc.business.legalName}
              </Link>
              <p className="mono text-xs text-ink-500">
                ΑΦΜ {doc.business.vatNumber}
              </p>
            </Info>
            <Info label="Πελάτης">
              {doc.client ? (
                <>
                  <p>{doc.client.legalName}</p>
                  {doc.client.vatNumber && (
                    <p className="mono text-xs text-ink-500">
                      ΑΦΜ {doc.client.vatNumber}
                    </p>
                  )}
                </>
              ) : (
                "—"
              )}
            </Info>
            <Info label="Ημ/νία έκδοσης">{date(doc.issueDate)}</Info>
            <Info label="Τρόπος πληρωμής">{doc.paymentMethod ?? "—"}</Info>
            <Info label="Κατάσταση πληρωμής">{doc.paymentStatus}</Info>
            <Info label="Σειρά / Αριθμός">
              {doc.series && doc.number
                ? `${doc.series} #${doc.number}`
                : "—"}
            </Info>
            {doc.correlatedDocument && (
              <Info label="Συσχετιζόμενο">
                <Link
                  href={`/admin/documents/${doc.correlatedDocument.id}`}
                  className="text-brand-800 hover:text-brand-900"
                >
                  {doc.correlatedDocument.series} #
                  {doc.correlatedDocument.number}
                </Link>
              </Info>
            )}
            {doc.notes && (
              <Info label="Σημειώσεις" wide>
                <p className="whitespace-pre-wrap text-sm text-ink-900">
                  {doc.notes}
                </p>
              </Info>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="myDATA / Wrapp" />
          <CardBody className="space-y-3 p-6 text-sm">
            <Info label="MARK">
              <span className="mono">{doc.myDataMark ?? "—"}</span>
            </Info>
            <Info label="UID">
              <span className="mono text-xs break-all">
                {doc.myDataUid ?? "—"}
              </span>
            </Info>
            <Info label="Wrapp invoice ID">
              <span className="mono text-xs break-all">
                {doc.wrappInvoiceId ?? "—"}
              </span>
            </Info>
            {doc.wrappInvoiceUrl && (
              <a
                href={doc.wrappInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-brand-800 bg-brand-700 px-3 text-xs font-bold text-white hover:bg-brand-800"
              >
                <ExternalLink size={11} strokeWidth={2.5} aria-hidden />
                Άνοιγμα στο Wrapp
              </a>
            )}
            {doc.lastWrappPayload && (
              <details className="rounded-lg border border-ink-300 bg-ink-50 p-2 text-xs">
                <summary className="cursor-pointer font-bold text-ink-700">
                  Wrapp payload
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto break-all whitespace-pre-wrap text-[10px] text-ink-800">
                  {doc.lastWrappPayload}
                </pre>
              </details>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={`Γραμμές (${doc.lines.length})`} />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Περιγραφή</th>
                  <th className="px-4 py-2 text-right">Ποσότητα</th>
                  <th className="px-4 py-2 text-right">Τιμή μονάδας</th>
                  <th className="px-4 py-2 text-right">ΦΠΑ %</th>
                  <th className="px-4 py-2 text-right">Καθαρή</th>
                  <th className="px-4 py-2 text-right">Σύνολο</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {doc.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 tabular-nums text-ink-500">
                      {l.ordinal + 1}
                    </td>
                    <td className="px-4 py-2 text-ink-900">{l.description}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {Number(l.quantity)} {l.unit}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {money(l.unitPrice)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {Number(l.vatRate)}%
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {money(l.netAmount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold">
                      {money(l.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-ink-500">
                    Καθαρή αξία
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {money(doc.netTotalAmount)}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-ink-500">
                    ΦΠΑ
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {money(doc.vatTotalAmount)}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right font-bold text-ink-900">
                    Σύνολο
                  </td>
                  <td />
                  <td className="px-4 py-2 text-right tabular-nums font-black text-brand-900">
                    {money(doc.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6">
        <EntityNotes
          entityType="Document"
          entityId={doc.id}
          title="Σημειώσεις admin"
        />
      </div>
    </>
  );
}

function Info({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <div className="mt-1 text-sm text-ink-900">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      tone={
        status === "issued"
          ? "success"
          : status === "failed"
            ? "danger"
            : status === "sending"
              ? "warning"
              : "muted"
      }
    >
      {t.status[status as keyof typeof t.status] ?? status}
    </Badge>
  );
}
