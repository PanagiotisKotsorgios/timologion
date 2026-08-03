import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

/**
 * Duplicate discovery. Groups businesses by ΑΦΜ and users by lower(email)
 * where the count > 1. Each row links out to a review page where the
 * admin picks the winner and merges the rest into it.
 */
export default async function AdminMergePage() {
  await requireAdmin("super_admin");

  const [dupeVats, dupeEmails] = await Promise.all([
    prisma.$queryRawUnsafe<
      Array<{ vatNumber: string; n: bigint }>
    >(
      `SELECT vatNumber, COUNT(*) AS n
       FROM businesses
       WHERE vatNumber != ''
       GROUP BY vatNumber
       HAVING n > 1
       ORDER BY n DESC, vatNumber ASC
       LIMIT 200`,
    ),
    prisma.$queryRawUnsafe<Array<{ email: string; n: bigint }>>(
      `SELECT LOWER(email) AS email, COUNT(*) AS n
       FROM users
       GROUP BY LOWER(email)
       HAVING n > 1
       ORDER BY n DESC, email ASC
       LIMIT 200`,
    ),
  ]);

  return (
    <>
      <PageHeader
        title="Merge duplicates"
        subtitle={`${dupeVats.length} ΑΦΜ conflicts · ${dupeEmails.length} email conflicts`}
      />

      <Alert tone="warning" title="Το merge είναι μη αναστρέψιμο">
        Όταν επιλέξεις έναν winner, όλες οι σχέσεις FK των υπόλοιπων εγγραφών
        μεταφέρονται στον winner και οι υπόλοιπες <strong>διαγράφονται</strong>.
        Πάντα κάνε backup πρώτα — δες <code className="mono text-xs">/admin/backups</code>.
      </Alert>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title={`Επιχειρήσεις με διπλό ΑΦΜ (${dupeVats.length})`} />
          <CardBody className="p-0">
            {dupeVats.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-500">
                Δεν υπάρχουν διπλότυπα ΑΦΜ.
              </p>
            ) : (
              <ul className="divide-y divide-ink-200">
                {dupeVats.map((r) => (
                  <li key={r.vatNumber}>
                    <Link
                      href={`/admin/merge/business?vat=${encodeURIComponent(r.vatNumber)}`}
                      className="flex items-center justify-between p-3 hover:bg-ink-100/60"
                    >
                      <span className="mono font-bold text-brand-900">
                        {r.vatNumber}
                      </span>
                      <Badge tone="danger">
                        {Number(r.n).toLocaleString("el-GR")} rows
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Users με διπλό email (${dupeEmails.length})`} />
          <CardBody className="p-0">
            {dupeEmails.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-500">
                Δεν υπάρχουν διπλότυπα emails.
              </p>
            ) : (
              <ul className="divide-y divide-ink-200">
                {dupeEmails.map((r) => (
                  <li key={r.email}>
                    <Link
                      href={`/admin/merge/user?email=${encodeURIComponent(r.email)}`}
                      className="flex items-center justify-between p-3 hover:bg-ink-100/60"
                    >
                      <span className="mono text-sm font-bold text-brand-900">
                        {r.email}
                      </span>
                      <Badge tone="danger">
                        {Number(r.n).toLocaleString("el-GR")} rows
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
