import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { env } from "@/lib/env";
import { RunBackupButton } from "./RunBackupButton";

export const dynamic = "force-dynamic";

function formatBytes(bytes: bigint | number): string {
  const b = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

/**
 * Admin view over BackupRun history. Not editable — the record is
 * append-only from the cron endpoint. This page's main job is to
 * answer "did the last backup succeed and when?" at a glance.
 */
export default async function AdminBackupsPage() {
  await requireAdmin("super_admin");

  const [runs, lastSuccess, lastFail] = await Promise.all([
    prisma.backupRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    prisma.backupRun.findFirst({
      where: { status: "success" },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.backupRun.findFirst({
      where: { status: "failed" },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const configured =
    !!env.BACKUP_S3_ENDPOINT &&
    !!env.BACKUP_S3_BUCKET &&
    !!env.BACKUP_S3_ACCESS_KEY_ID &&
    !!env.BACKUP_S3_SECRET_ACCESS_KEY;

  return (
    <>
      <PageHeader
        title="Backups βάσης"
        subtitle="Ιστορικό εκτελέσεων του mysqldump → S3 pipeline."
        actions={<AdminExportButton entity="backups" />}
      />

      {!configured && (
        <Alert tone="warning" title="Δεν έχει ρυθμιστεί προορισμός backup">
          Πριν ενεργοποιήσεις το cron πρέπει να ορίσεις τα{" "}
          <code className="mono text-xs">BACKUP_S3_*</code> env vars (endpoint,
          bucket, access key, secret). Δες <em>docs/BACKUP.md</em> στο repo
          για οδηγίες Backblaze / R2 / Wasabi / MinIO.
        </Alert>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <StatusCard
          label="Τελευταία επιτυχία"
          value={
            lastSuccess?.finishedAt
              ? lastSuccess.finishedAt.toLocaleString("el-GR")
              : "—"
          }
          hint={lastSuccess ? formatBytes(lastSuccess.bytes) : ""}
          tone={lastSuccess ? "success" : "muted"}
        />
        <StatusCard
          label="Τελευταία αποτυχία"
          value={
            lastFail?.startedAt
              ? lastFail.startedAt.toLocaleString("el-GR")
              : "—"
          }
          hint={lastFail?.error?.slice(0, 80) ?? ""}
          tone={lastFail ? "danger" : "muted"}
        />
        <StatusCard
          label="Προορισμός"
          value={env.BACKUP_S3_BUCKET || "(δεν έχει οριστεί)"}
          hint={env.BACKUP_S3_ENDPOINT || ""}
          tone={configured ? "success" : "muted"}
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Χειροκίνητη εκτέλεση"
          subtitle="Δοκιμαστικό run τώρα — τρέχει με τα ίδια credentials που θα χρησιμοποιήσει το cron."
          action={<RunBackupButton disabled={!configured} />}
        />
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={`Ιστορικό (${runs.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Ξεκίνησε</th>
                <th className="px-4 py-2 text-left">Ολοκληρώθηκε</th>
                <th className="px-4 py-2 text-left">Κατάσταση</th>
                <th className="px-4 py-2 text-right">Μέγεθος</th>
                <th className="px-4 py-2 text-right">Διάρκεια</th>
                <th className="px-4 py-2 text-left">Προορισμός</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {runs.map((r) => (
                <tr key={r.id} className="align-top hover:bg-ink-100/40">
                  <td className="px-4 py-2 whitespace-nowrap text-ink-500">
                    {r.startedAt.toLocaleString("el-GR")}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-ink-500">
                    {r.finishedAt?.toLocaleString("el-GR") ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      tone={
                        r.status === "success"
                          ? "success"
                          : r.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {r.status}
                    </Badge>
                    {r.error && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] font-bold text-red-800">
                          error
                        </summary>
                        <pre className="mt-1 max-h-32 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-[10px] text-red-900">
                          {r.error}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.status === "success" ? formatBytes(r.bytes) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink-700">
                    {r.durationMs > 0 ? formatDuration(r.durationMs) : "—"}
                  </td>
                  <td className="px-4 py-2 mono text-xs text-ink-700 max-w-md truncate" title={r.target}>
                    {r.target}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-500">
                    Δεν έχει τρέξει κανένα backup ακόμη.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function StatusCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "success" | "danger" | "muted";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50"
      : tone === "danger"
        ? "border-red-300 bg-red-50"
        : "border-ink-300 bg-white";
  return (
    <Card className={`border-2 ${cls}`}>
      <CardBody className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
          {label}
        </p>
        <p className="mt-1 text-lg font-black text-ink-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-600 truncate">{hint}</p>}
      </CardBody>
    </Card>
  );
}
