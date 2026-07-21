import Link from "next/link";
import { Search, Briefcase, Users, FileText, Hash } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/format";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const enough = term.length >= 2;

  const [businesses, users, documents] = enough
    ? await Promise.all([
        prisma.business.findMany({
          where: {
            OR: [
              { legalName: { contains: term } },
              { tradeName: { contains: term } },
              { vatNumber: { contains: term } },
              { email: { contains: term } },
            ],
          },
          take: 20,
          orderBy: { legalName: "asc" },
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            vatNumber: true,
            city: true,
            suspendedAt: true,
          },
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: term } },
              { fullName: { contains: term } },
            ],
          },
          take: 20,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            fullName: true,
            platformRole: true,
            suspendedAt: true,
          },
        }),
        prisma.document.findMany({
          where: {
            OR: [
              { id: { equals: term } },
              { series: { contains: term } },
              { wrappInvoiceId: { contains: term } },
              { myDataMark: { contains: term } },
              { client: { legalName: { contains: term } } },
            ],
          },
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            business: {
              select: { id: true, legalName: true, tradeName: true },
            },
            client: { select: { legalName: true } },
          },
        }),
      ])
    : [[], [], []];

  return (
    <>
      <PageHeader
        title="Καθολική αναζήτηση"
        subtitle="Αναζήτηση σε επιχειρήσεις, χρήστες και παραστατικά."
      />

      <form
        method="get"
        className="mb-8 rounded-2xl border-2 border-ink-300 bg-white p-4"
      >
        <Field label="Όρος" htmlFor="q">
          <div className="flex gap-2">
            <Input
              id="q"
              name="q"
              defaultValue={term}
              placeholder="π.χ. ΑΦΜ, email, όνομα, MARK, ID..."
            />
            <Button type="submit" icon={Search}>
              Αναζήτηση
            </Button>
          </div>
        </Field>
      </form>

      {!enough && (
        <Card>
          <CardBody className="p-12 text-center">
            <p className="text-base text-ink-700">
              Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες για να ξεκινήσει η
              αναζήτηση.
            </p>
          </CardBody>
        </Card>
      )}

      {enough && (
        <div className="space-y-6">
          <ResultsSection
            title="Επιχειρήσεις"
            icon={Briefcase}
            count={businesses.length}
          >
            {businesses.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y-2 divide-ink-300/60">
                {businesses.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {b.tradeName ?? b.legalName}
                      </Link>
                      <p className="text-sm text-ink-700">
                        ΑΦΜ {b.vatNumber}
                        {b.city ? ` · ${b.city}` : ""}
                      </p>
                    </div>
                    {b.suspendedAt && (
                      <Badge tone="danger">Ανασταλμένη</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ResultsSection>

          <ResultsSection title="Χρήστες" icon={Users} count={users.length}>
            {users.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y-2 divide-ink-300/60">
                {users.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-semibold text-brand-800 hover:text-brand-900"
                      >
                        {u.fullName || u.email}
                      </Link>
                      <p className="text-sm text-ink-700">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.platformRole && (
                        <Badge tone="warning">{u.platformRole}</Badge>
                      )}
                      {u.suspendedAt && (
                        <Badge tone="danger">Απαγορευμένος</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ResultsSection>

          <ResultsSection
            title="Παραστατικά"
            icon={FileText}
            count={documents.length}
          >
            {documents.length === 0 ? (
              <Empty />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Τύπος</th>
                      <th>Πελάτης</th>
                      <th>Επιχείρηση</th>
                      <th className="text-right">Σύνολο</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <Link
                            href={`/admin/businesses/${d.business.id}`}
                            className="font-semibold text-brand-800 hover:text-brand-900"
                          >
                            {t.documents.types[d.type]}
                          </Link>
                          {d.series && (
                            <div className="text-xs text-ink-500">
                              <Hash size={10} className="mr-1 inline" />
                              {d.series}
                              {d.number ? ` #${d.number}` : ""}
                            </div>
                          )}
                        </td>
                        <td>{d.client?.legalName ?? "—"}</td>
                        <td className="text-ink-700">
                          {d.business.tradeName ?? d.business.legalName}
                        </td>
                        <td className="text-right font-semibold">
                          {money(d.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ResultsSection>
        </div>
      )}
    </>
  );
}

function ResultsSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof Search;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Icon size={18} aria-hidden />
            {title}
          </span>
        }
        subtitle={`${count} αποτελέσματα`}
      />
      <CardBody className="p-0">{children}</CardBody>
    </Card>
  );
}

function Empty() {
  return (
    <p className="p-6 text-sm text-ink-700">
      Δεν βρέθηκαν αποτελέσματα.
    </p>
  );
}
