import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CleanupButton } from "./CleanupButton";

export const dynamic = "force-dynamic";

/**
 * Data-hygiene dashboard. Every row runs a live count against a
 * potential integrity issue, plus optional "cleanup" action for the
 * ones that are safe to auto-fix.
 */
export default async function AdminIntegrityPage() {
  await requireAdmin("super_admin");

  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    expiredSessions,
    expiredResetTokens,
    consumedResetTokens,
    unverifiedOldUsers,
    stuckDrafts,
    docsWithoutLines,
    duplicateVatBusinesses,
    duplicateEmailUsers,
    orphanPosItems,
    oldWebhookLogs,
  ] = await Promise.all([
    prisma.session.count({ where: { expiresAt: { lt: now } } }),
    prisma.passwordReset.count({
      where: { usedAt: null, expiresAt: { lt: now } },
    }),
    prisma.passwordReset.count({
      where: { usedAt: { not: null }, createdAt: { lt: days90 } },
    }),
    prisma.user.count({
      where: { emailVerifiedAt: null, createdAt: { lt: days30 } },
    }),
    prisma.document.count({
      where: { status: "draft", createdAt: { lt: days90 } },
    }),
    prisma.document.count({
      where: { lines: { none: {} }, status: { not: "draft" } },
    }),
    // Same VAT number across different business rows = probable dupe.
    prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) - COUNT(DISTINCT vatNumber) AS n FROM businesses WHERE vatNumber != ''`,
    ),
    // Same email (case-insensitive) across different users.
    prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) - COUNT(DISTINCT LOWER(email)) AS n FROM users`,
    ),
    // PosTabItem rows whose parent tab was closed > 90 days ago — safe cleanup target.
    prisma.posTabItem.count({
      where: { tab: { status: "closed", closedAt: { lt: days90 } } },
    }),
    prisma.wrappWebhookLog.count({ where: { createdAt: { lt: days90 } } }),
  ]);

  const rows: IntegrityRow[] = [
    {
      key: "expired_sessions",
      label: "Ληγμένες συνεδρίες",
      count: expiredSessions,
      hint: "Session rows με expiresAt < now — safe να διαγραφούν.",
      danger: expiredSessions > 500,
      cleanup: true,
    },
    {
      key: "expired_reset_tokens",
      label: "Ληγμένα reset tokens",
      count: expiredResetTokens,
      hint: "PasswordReset rows χωρίς usedAt που έχουν λήξει.",
      danger: expiredResetTokens > 100,
      cleanup: true,
    },
    {
      key: "consumed_reset_tokens_old",
      label: "Χρησιμοποιημένα reset tokens > 90 ημέρες",
      count: consumedResetTokens,
      hint: "Ιστορικό δεν χρειάζεται πια — cascade-safe να πάει.",
      cleanup: true,
    },
    {
      key: "unverified_old_users",
      label: "Ανεπιβεβαίωτοι χρήστες > 30 ημέρες",
      count: unverifiedOldUsers,
      hint: "Δεν καθαρίζουμε αυτόματα — μπορεί να αναγεννηθεί το email.",
      danger: unverifiedOldUsers > 100,
    },
    {
      key: "stuck_drafts",
      label: "Πρόχειρα > 90 ημέρες",
      count: stuckDrafts,
      hint: "Παραστατικά draft χωρίς κίνηση για 3+ μήνες.",
      danger: stuckDrafts > 200,
    },
    {
      key: "docs_no_lines",
      label: "Παραστατικά χωρίς γραμμές",
      count: docsWithoutLines,
      hint: "Εκδοθέντα docs με 0 lines — data-loss ή σφάλμα.",
      danger: docsWithoutLines > 0,
    },
    {
      key: "dupe_vat",
      label: "Επιχειρήσεις με διπλό ΑΦΜ",
      count: Number(duplicateVatBusinesses[0]?.n ?? 0),
      hint: "Ίδιο ΑΦΜ σε 2+ business rows — πιθανή διπλοεγγραφή.",
      danger: Number(duplicateVatBusinesses[0]?.n ?? 0) > 0,
    },
    {
      key: "dupe_email",
      label: "Χρήστες με διπλό email",
      count: Number(duplicateEmailUsers[0]?.n ?? 0),
      hint: "Ίδιο email σε 2+ users (case-insensitive).",
      danger: Number(duplicateEmailUsers[0]?.n ?? 0) > 0,
    },
    {
      key: "orphan_pos_items",
      label: "Παλιά POS items (κλειστά τραπέζια > 90 μερ.)",
      count: orphanPosItems,
      hint: "Cart lines από κλειστά POS tabs — safe να πάνε.",
      cleanup: true,
    },
    {
      key: "old_webhook_logs",
      label: "Παλιά webhook logs > 90 ημέρες",
      count: oldWebhookLogs,
      hint: "WrappWebhookLog rows που έχουν χάσει τη χρησιμότητά τους.",
      cleanup: true,
    },
  ];

  const totalIssues = rows.filter((r) => r.count > 0).length;

  return (
    <>
      <PageHeader
        title="Ακεραιότητα δεδομένων"
        subtitle={`${totalIssues} από ${rows.length} probes έχουν rows προς επιθεώρηση.`}
      />

      <Card className="overflow-hidden">
        <CardHeader
          title="Probes"
          subtitle="Καθένα τρέχει live query στο DB κάθε φορά που ανοίγεις τη σελίδα."
        />
        <CardBody className="p-0">
          <ul className="divide-y divide-ink-200">
            {rows.map((r) => (
              <li key={r.key} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink-900">{r.label}</p>
                      <Badge
                        tone={
                          r.count === 0
                            ? "success"
                            : r.danger
                              ? "danger"
                              : "warning"
                        }
                      >
                        {r.count.toLocaleString("el-GR")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-600">{r.hint}</p>
                  </div>
                  {r.cleanup && r.count > 0 && (
                    <CleanupButton probeKey={r.key} count={r.count} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}

type IntegrityRow = {
  key: string;
  label: string;
  count: number;
  hint: string;
  danger?: boolean;
  cleanup?: boolean;
};
