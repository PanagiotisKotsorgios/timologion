import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { env } from "@/lib/env";
import { RefreshButton } from "./RefreshButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Probe = {
  label: string;
  ok: boolean;
  detail: string;
  latencyMs?: number;
  hint?: string;
};

/**
 * Live system-health snapshot. Every render actually runs the probes
 * (no caching) so hitting refresh gives an up-to-the-second view.
 * Nothing here writes — all probes are read-only.
 */
export default async function AdminHealthPage() {
  await requireAdmin("super_admin", "support");

  const [
    dbProbe,
    sessionsCount,
    activeSessionsCount,
    recentErrorCount,
    lastBackup,
    lastWebhook,
    wrappSample,
    stuckDrafts,
    expiredTokens,
    workerStats,
  ] = await Promise.all([
    probeDb(),
    prisma.session.count(),
    prisma.session.count({
      where: { expiresAt: { gt: new Date() } },
    }),
    prisma.errorLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        level: "error",
      },
    }),
    prisma.backupRun.findFirst({
      where: { status: "success" },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.wrappWebhookLog.findFirst({
      orderBy: { createdAt: "desc" },
    }),
    probeWrapp(),
    prisma.document.count({
      where: {
        status: "draft",
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.passwordReset.count({
      where: { usedAt: null, expiresAt: { lt: new Date() } },
    }),
    probeWorkers(),
  ]);

  const now = new Date();
  const backupAgeHours = lastBackup?.finishedAt
    ? (now.getTime() - lastBackup.finishedAt.getTime()) / 3_600_000
    : null;
  const webhookAgeHours = lastWebhook?.createdAt
    ? (now.getTime() - lastWebhook.createdAt.getTime()) / 3_600_000
    : null;

  const probes: Probe[] = [
    dbProbe,
    {
      label: "Wrapp API",
      ok: wrappSample.ok,
      detail: wrappSample.detail,
      latencyMs: wrappSample.latencyMs,
      hint: !wrappSample.ok
        ? "Δες αν λείπει partner key ή αν το base URL δείχνει staging."
        : undefined,
    },
    {
      label: "Σφάλματα τελευταίας 1 ώρας",
      ok: recentErrorCount < 25,
      detail: `${recentErrorCount} events`,
      hint:
        recentErrorCount >= 25
          ? "Πάνω από το κατώφλι — δες /admin/errors."
          : undefined,
    },
    {
      label: "Backup βάσης",
      ok: backupAgeHours !== null && backupAgeHours < 30,
      detail: lastBackup?.finishedAt
        ? `${backupAgeHours!.toFixed(1)}h πριν`
        : "Δεν έχει τρέξει επιτυχώς ποτέ.",
      hint:
        backupAgeHours === null
          ? "Ρύθμισε τα BACKUP_S3_* env και βάλε cron."
          : backupAgeHours >= 30
            ? "Το τελευταίο επιτυχημένο backup είναι πάνω από 30 ώρες πριν."
            : undefined,
    },
    {
      label: "Wrapp webhooks",
      ok: webhookAgeHours !== null && webhookAgeHours < 48,
      detail: lastWebhook?.createdAt
        ? `${webhookAgeHours!.toFixed(1)}h πριν · ${lastWebhook.eventType ?? "—"}`
        : "Δεν έχουμε λάβει webhook.",
      hint:
        webhookAgeHours === null
          ? "Ή δεν έχει γίνει έκδοση παραστατικού ή λείπει config στη Wrapp."
          : webhookAgeHours >= 48
            ? "Δεν έχουμε λάβει webhook τις τελευταίες 48h — πιθανό πρόβλημα σύνδεσης."
            : undefined,
    },
    {
      label: "Ενεργές συνεδρίες",
      ok: true,
      detail: `${activeSessionsCount} · σύνολο σε πίνακα: ${sessionsCount}`,
      hint:
        sessionsCount - activeSessionsCount > 500
          ? "Πολλές expired sessions — trigger cleanup cron."
          : undefined,
    },
    {
      label: "Ενδιάμεσα πρόχειρα > 30 ημέρες",
      ok: stuckDrafts < 100,
      detail: `${stuckDrafts} drafts`,
      hint:
        stuckDrafts >= 100
          ? "Ενημέρωσε ή διάγραψε τα stuck drafts."
          : undefined,
    },
    {
      label: "Ληγμένα reset tokens",
      ok: expiredTokens < 500,
      detail: `${expiredTokens} tokens`,
      hint:
        expiredTokens >= 500
          ? "Cleanup cron δεν τρέχει ή είναι stale."
          : undefined,
    },
    workerStats,
  ];

  const okCount = probes.filter((p) => p.ok).length;
  const totalCount = probes.length;

  return (
    <>
      <PageHeader
        title="Υγεία συστήματος"
        subtitle={`${okCount}/${totalCount} probes OK · Snapshot ${now.toLocaleString("el-GR")}`}
        actions={<RefreshButton />}
      />

      <Card className="mb-6">
        <CardBody className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
          <BigStat
            label="Βάση"
            value={dbProbe.ok ? "OK" : "Σφάλμα"}
            hint={dbProbe.latencyMs ? `${dbProbe.latencyMs}ms` : ""}
            tone={dbProbe.ok ? "success" : "danger"}
          />
          <BigStat
            label="Wrapp API"
            value={wrappSample.ok ? "OK" : "Σφάλμα"}
            hint={wrappSample.latencyMs ? `${wrappSample.latencyMs}ms` : ""}
            tone={wrappSample.ok ? "success" : "danger"}
          />
          <BigStat
            label="Ενεργές συνεδρίες"
            value={activeSessionsCount.toLocaleString("el-GR")}
            hint=""
            tone="muted"
          />
          <BigStat
            label="Σφάλματα 1h"
            value={recentErrorCount.toLocaleString("el-GR")}
            hint=""
            tone={recentErrorCount >= 25 ? "danger" : "muted"}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Probes"
          subtitle="Κάθε probe τρέχει live κάθε φορά που ανοίγεις τη σελίδα."
        />
        <CardBody className="divide-y divide-ink-200 p-0">
          {probes.map((p, i) => (
            <ProbeRow key={i} probe={p} />
          ))}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Περιβάλλον" />
        <CardBody className="space-y-2 text-sm p-6">
          <Row
            label="Wrapp base URL"
            value={env.WRAPP_API_BASE_URL}
            warn={env.WRAPP_API_BASE_URL.includes("staging")}
          />
          <Row label="App base URL" value={env.APP_BASE_URL} />
          <Row
            label="Backup target"
            value={
              env.BACKUP_S3_BUCKET
                ? `${env.BACKUP_S3_ENDPOINT}/${env.BACKUP_S3_BUCKET}`
                : "—"
            }
            warn={!env.BACKUP_S3_BUCKET}
          />
          <Row label="Node env" value={env.NODE_ENV} />
        </CardBody>
      </Card>
    </>
  );
}

// ─── Probes ─────────────────────────────────────────────────────────────
async function probeDb(): Promise<Probe> {
  const t0 = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return {
      label: "Βάση δεδομένων",
      ok: true,
      detail: "SELECT 1 OK",
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    return {
      label: "Βάση δεδομένων",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - t0,
    };
  }
}

async function probeWrapp(): Promise<{
  ok: boolean;
  detail: string;
  latencyMs: number;
}> {
  const t0 = Date.now();
  const partnerKey =
    env.WRAPP_PARTNER_API_KEY || env.WRAPP_API_KEY || "";
  if (!partnerKey) {
    return {
      ok: false,
      detail: "Δεν έχει ρυθμιστεί partner API key.",
      latencyMs: 0,
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    // Cheapest read on the platform: HEAD/GET the base URL. Wrapp returns
    // 401/403 without a tenant token which still confirms reachability.
    const res = await fetch(env.WRAPP_API_BASE_URL, {
      method: "GET",
      signal: controller.signal,
      headers: { "X-PARTNER-API-KEY": partnerKey },
    });
    clearTimeout(timer);
    // Any non-5xx response means the server is reachable and processing.
    const reachable = res.status < 500;
    return {
      ok: reachable,
      detail: `HTTP ${res.status}`,
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - t0,
    };
  }
}

async function probeWorkers(): Promise<Probe> {
  // Snapshot how much work is queued in the recurring / low-stock cron
  // sinks. All queues in this app are DB-backed so this is a simple
  // count against the source tables.
  const [recurringDue, remindersDue] = await Promise.all([
    prisma.recurringDocument.count({
      where: { status: "active", nextRunAt: { lte: new Date() } },
    }),
    prisma.appointment.count({
      where: {
        startAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        reminderSentAt: null,
      },
    }).catch(() => 0),
  ]);
  const backlog = recurringDue + remindersDue;
  return {
    label: "Ουρές background job",
    ok: backlog < 200,
    detail: `${recurringDue} recurring · ${remindersDue} reminders`,
    hint:
      backlog >= 200
        ? "Backlog μεγαλύτερο του κατωφλίου — έλεγξε τα cron endpoints."
        : undefined,
  };
}

// ─── UI ─────────────────────────────────────────────────────────────────
function ProbeRow({ probe }: { probe: Probe }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">{probe.label}</p>
        <p className="mt-0.5 text-sm text-ink-700">{probe.detail}</p>
        {probe.hint && (
          <p className="mt-1 text-xs italic text-amber-800">{probe.hint}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {typeof probe.latencyMs === "number" && (
          <span className="mono text-xs text-ink-500">
            {probe.latencyMs}ms
          </span>
        )}
        <Badge tone={probe.ok ? "success" : "danger"}>
          {probe.ok ? "OK" : "Σφάλμα"}
        </Badge>
      </div>
    </div>
  );
}

function BigStat({
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
  const toneCls =
    tone === "success"
      ? "text-emerald-800"
      : tone === "danger"
        ? "text-red-800"
        : "text-brand-900";
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-black tabular-nums ${toneCls}`}>
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-ink-500 tabular-nums">{hint}</p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-200/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-ink-700">{label}</span>
      <span
        className={
          "mono text-sm " + (warn ? "text-amber-800 font-bold" : "text-ink-900")
        }
      >
        {value}
      </span>
    </div>
  );
}
