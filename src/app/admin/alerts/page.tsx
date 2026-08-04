import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { CreateRuleForm } from "./CreateRuleForm";
import { toggleRuleAction, deleteRuleAction } from "./actions";
import { evaluateMetric } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const METRIC_LABEL: Record<string, string> = {
  errors_1h: "Σφάλματα · 1 ώρα",
  errors_24h: "Σφάλματα · 24 ώρες",
  webhook_gap_hours: "Wrapp webhook gap (ώρες)",
  past_due_subs: "Past-due συνδρομές",
  backup_age_hours: "Ηλικία τελ. backup (ώρες)",
  active_sessions: "Ενεργές συνεδρίες",
  new_signups_24h: "Νέες εγγραφές · 24h",
  broken_documents: "Παραστ. χωρίς γραμμές",
};

const COMP_LABEL: Record<string, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
};

export default async function AdminAlertsPage() {
  await requireAdmin("super_admin");

  const [rules, firings] = await Promise.all([
    prisma.alertRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.alertFiring.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { rule: { select: { name: true } } },
    }),
  ]);

  // Compute current observed value per rule for a "would-fire-now?" indicator.
  const observedNow = new Map<string, number>();
  for (const r of rules) {
    observedNow.set(r.id, await evaluateMetric(r.metric));
  }

  return (
    <>
      <PageHeader
        title="Alert rules"
        subtitle="Threshold-based email alerts. Cron endpoint /api/cron/alerts τα εκτελεί."
      />

      <Alert tone="info">
        Πρόσθεσε cron κάθε 5 λεπτά που χτυπάει{" "}
        <code className="mono text-xs">POST /api/cron/alerts</code> με το{" "}
        <code className="mono text-xs">CRON_SECRET</code> ως Bearer. Κάθε
        alert στέλνει email και κρατά cooldown για N λεπτά ώστε να μη σε
        γεμίζει την ώρα ενός incident.
      </Alert>

      <Card className="mt-6">
        <CardHeader title="Νέος κανόνας" />
        <CardBody>
          <CreateRuleForm />
        </CardBody>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={`Κανόνες (${rules.length})`} />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Όνομα</th>
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Threshold</th>
                <th className="px-4 py-2 text-right">Τώρα</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-right">Cooldown</th>
                <th className="px-4 py-2 text-left">Κατάσταση</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {rules.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-ink-500">
                    Καμία σύνθηκη — πρόσθεσε την πρώτη πάνω.
                  </td>
                </tr>
              )}
              {rules.map((r) => {
                const val = observedNow.get(r.id) ?? 0;
                const wouldFire = compareUi(r.comparator, val, Number(r.threshold));
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium text-ink-900">
                      {r.name}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {METRIC_LABEL[r.metric] ?? r.metric}
                    </td>
                    <td className="px-4 py-2 text-right mono">
                      {COMP_LABEL[r.comparator]} {Number(r.threshold)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span
                        className={
                          wouldFire ? "font-bold text-red-700" : "text-ink-700"
                        }
                      >
                        {val.toFixed(val % 1 === 0 ? 0 : 2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-700">
                      {r.emailTo}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-xs">
                      {r.cooldownMin}m
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={r.enabled ? "success" : "muted"}>
                        {r.enabled ? "on" : "off"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={toggleRuleAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="text-xs font-bold text-brand-800 hover:text-brand-900"
                          >
                            {r.enabled ? "Disable" : "Enable"}
                          </button>
                        </form>
                        <form action={deleteRuleAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="text-xs font-bold text-red-700 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={`Ιστορικό firings (${firings.length})`} />
        <CardBody className="p-0">
          {firings.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-500">
              Καμία εκτέλεση κανόνα ακόμη.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Ημ/νία</th>
                  <th className="px-4 py-2 text-left">Rule</th>
                  <th className="px-4 py-2 text-left">Metric</th>
                  <th className="px-4 py-2 text-right">Observed</th>
                  <th className="px-4 py-2 text-right">Threshold</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {firings.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2 text-ink-500">
                      {f.createdAt.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 font-medium">{f.rule.name}</td>
                    <td className="px-4 py-2 text-xs">{f.metric}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold">
                      {Number(f.observed)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-500">
                      {Number(f.threshold)}
                    </td>
                    <td className="px-4 py-2 text-xs">{f.emailTo}</td>
                    <td className="px-4 py-2">
                      {f.sent ? (
                        <Badge tone="success">sent</Badge>
                      ) : (
                        <Badge tone="danger">failed</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function compareUi(comparator: string, observed: number, threshold: number): boolean {
  switch (comparator) {
    case "gt":
      return observed > threshold;
    case "gte":
      return observed >= threshold;
    case "lt":
      return observed < threshold;
    case "lte":
      return observed <= threshold;
    case "eq":
      return observed === threshold;
    default:
      return false;
  }
}
