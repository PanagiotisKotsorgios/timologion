import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { FlagCreateForm } from "./FlagCreateForm";
import { FlagRolloutSelect } from "./FlagRolloutSelect";
import { deleteFlagAction } from "./actions";

export const dynamic = "force-dynamic";

const ROLLOUT_TONE: Record<
  string,
  "success" | "warning" | "muted"
> = { all: "success", beta: "warning", none: "muted" };

const ROLLOUT_LABEL: Record<string, string> = {
  all: "Ενεργό για όλους",
  beta: "Beta (μόνο overrides)",
  none: "Ανενεργό",
};

export default async function AdminFeatureFlagsPage() {
  await requireAdmin("super_admin");

  const [flags, businessCount] = await Promise.all([
    prisma.featureFlag.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { overrides: true } },
        overrides: {
          include: {
            business: {
              select: { id: true, legalName: true, vatNumber: true },
            },
          },
          take: 5,
        },
      },
    }),
    prisma.business.count(),
  ]);

  return (
    <>
      <PageHeader
        title="Feature flags"
        subtitle={`${flags.length} flags · ${businessCount} επιχειρήσεις συνολικά`}
      />

      <Alert tone="info" title="Πώς λειτουργεί">
        Rollout = <strong>all</strong> ενεργοποιεί το feature παντού.{" "}
        <strong>beta</strong> = μόνο για επιχειρήσεις που έχουν explicit
        override με <em>enabled=true</em>. <strong>none</strong> = γενικά
        απενεργοποιημένο. Οι per-business overrides υπερτερούν του global
        rollout — μπορείς να έχεις flag σε rollout=all αλλά να το
        απενεργοποιήσεις για συγκεκριμένη επιχείρηση.
      </Alert>

      <Card className="mt-6">
        <CardHeader
          title="Νέο flag"
          subtitle="Key = προγραμματιστικό αναγνωριστικό (κάτω-παύλα, όχι κενά)."
        />
        <CardBody>
          <FlagCreateForm />
        </CardBody>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title={`Ενεργά flags (${flags.length})`} />
        <div className="divide-y divide-ink-200">
          {flags.length === 0 && (
            <p className="p-8 text-center text-ink-500">
              Δεν έχουν οριστεί flags ακόμη.
            </p>
          )}
          {flags.map((f) => (
            <div key={f.key} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-black text-brand-900">
                    {f.key}
                  </p>
                  {f.description && (
                    <p className="mt-1 text-sm text-ink-700">
                      {f.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ROLLOUT_TONE[f.rollout]}>
                    {ROLLOUT_LABEL[f.rollout]}
                    {f.rollout === "all" && f.rolloutPct < 100
                      ? ` · ${f.rolloutPct}%`
                      : ""}
                  </Badge>
                  <FlagRolloutSelect
                    flagKey={f.key}
                    current={f.rollout}
                    currentPct={f.rolloutPct}
                  />
                  <form action={deleteFlagAction}>
                    <input type="hidden" name="key" value={f.key} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-red-700 hover:text-red-900"
                    >
                      Διαγραφή
                    </button>
                  </form>
                </div>
              </div>

              {f._count.overrides > 0 && (
                <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50/60 p-3 text-xs">
                  <p className="font-black uppercase tracking-widest text-ink-500">
                    Overrides ({f._count.overrides})
                  </p>
                  <ul className="mt-1 space-y-1">
                    {f.overrides.map((o) => (
                      <li
                        key={o.businessId}
                        className="flex items-center justify-between gap-2"
                      >
                        <a
                          href={`/admin/businesses/${o.businessId}`}
                          className="text-brand-800 hover:text-brand-900"
                        >
                          {o.business.legalName} · ΑΦΜ {o.business.vatNumber}
                        </a>
                        <Badge tone={o.enabled ? "success" : "muted"}>
                          {o.enabled ? "on" : "off"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  {f._count.overrides > 5 && (
                    <p className="mt-1 text-ink-500">
                      + ακόμη {f._count.overrides - 5} …
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
