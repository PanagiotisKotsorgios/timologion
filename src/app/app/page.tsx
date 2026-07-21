import Link from "next/link";
import {
  FileText,
  Receipt,
  UserPlus,
  PackagePlus,
  Check,
  Rocket,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { t } from "@/lib/i18n";
import { money, date } from "@/lib/format";
import { checkDocumentQuota } from "@/lib/quota";

export default async function DashboardPage() {
  const ctx = await requireTenant();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    wrapp,
    monthCount,
    recentDocs,
    draftCount,
    unpaidAgg,
    clientCount,
    itemCount,
    quota,
  ] = await Promise.all([
    prisma.wrappConnection.findUnique({
      where: { businessId: ctx.businessId },
      select: { status: true, canIssueInvoice: true },
    }),
    prisma.document.count({
      where: {
        businessId: ctx.businessId,
        issueDate: { gte: monthStart },
        status: { in: ["issued", "sending"] },
      },
    }),
    prisma.document.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { legalName: true } } },
    }),
    prisma.document.count({
      where: { businessId: ctx.businessId, status: "draft" },
    }),
    prisma.document.aggregate({
      where: {
        businessId: ctx.businessId,
        status: "issued",
        paymentStatus: { in: ["unpaid", "partial"] },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.client.count({ where: { businessId: ctx.businessId } }),
    prisma.item.count({ where: { businessId: ctx.businessId } }),
    checkDocumentQuota(ctx.businessId),
  ]);

  const wrappStatus = wrapp?.status ?? "inactive";

  const totalDocsAll = monthCount + draftCount;
  const isNewUser = clientCount === 0 && itemCount === 0 && totalDocsAll === 0;

  const quotaLimit = quota.ok ? quota.limit : quota.limit;
  const quotaUsed = quota.ok ? quota.used : quota.used;

  return (
    <>
      <PageHeader
        title={`Καλωσόρισες, ${ctx.businessName}`}
        subtitle="Ξεκίνα με μια γρήγορη ενέργεια παρακάτω."
        actions={
          <>
            <LinkButton
              href="/app/documents/new?type=invoice"
              icon={FileText}
            >
              Νέο Τιμολόγιο
            </LinkButton>
            <LinkButton
              href="/app/documents/new?type=retail_receipt"
              variant="secondary"
              icon={Receipt}
            >
              Νέα Απόδειξη
            </LinkButton>
            <LinkButton href="/app/clients/new" variant="secondary" icon={UserPlus}>
              Νέος Πελάτης
            </LinkButton>
            <LinkButton
              href="/app/items/new"
              variant="secondary"
              icon={PackagePlus}
            >
              Νέα Υπηρεσία
            </LinkButton>
          </>
        }
      />

      {/* Activation warning is handled by the blocking ActivationGate modal in
          the app layout — no in-page banner needed here. */}

      {isNewUser && (
        <div className="mb-6">
          <WelcomeChecklist
            hasClients={clientCount > 0}
            hasItems={itemCount > 0}
            hasIssuedDoc={monthCount > 0}
            wrappActive={wrappStatus === "active"}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader title="Ηλεκτρονική έκδοση" subtitle="Κατάσταση σύνδεσης" />
          <CardBody>
            <WrappStatusBadge status={wrappStatus} />
            <p className="mt-3 text-xs text-ink-500">
              {t.brand.providerNote}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Εκδοθέντα αυτόν τον μήνα"
            subtitle={
              quotaLimit && quotaLimit > 0
                ? `Όριο πακέτου: ${quotaLimit}`
                : "Απεριόριστα"
            }
          />
          <CardBody>
            <div className="text-3xl font-semibold text-ink-900">
              {monthCount}
              {quotaLimit && quotaLimit > 0 && (
                <span className="ml-1 text-base font-normal text-ink-500">
                  / {quotaLimit}
                </span>
              )}
            </div>
            {quotaLimit && quotaLimit > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                <div
                  className={
                    "h-full " +
                    (quotaUsed / quotaLimit >= 0.9
                      ? "bg-red-600"
                      : quotaUsed / quotaLimit >= 0.7
                        ? "bg-amber-500"
                        : "bg-brand-700")
                  }
                  style={{
                    width: `${Math.min(100, Math.round((quotaUsed / quotaLimit) * 100))}%`,
                  }}
                />
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Ανεξόφλητα"
            subtitle={`${unpaidAgg._count ?? 0} παραστατικά`}
          />
          <CardBody>
            <div className="text-3xl font-semibold text-ink-900">
              {money(unpaidAgg._sum.totalAmount ?? 0)}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title="Πρόσφατα παραστατικά"
              action={
                <LinkButton
                  href="/app/documents"
                  variant="ghost"
                  size="sm"
                >
                  Όλα
                </LinkButton>
              }
            />
            <CardBody className="p-0">
              {recentDocs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Δεν υπάρχουν παραστατικά ακόμα."
                    description="Ξεκίνα με ένα πρόχειρο τιμολόγιο."
                    action={
                      <LinkButton href="/app/documents/new">
                        Νέο Παραστατικό
                      </LinkButton>
                    }
                  />
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ημ/νία</th>
                      <th>Πελάτης</th>
                      <th>Τύπος</th>
                      <th className="text-right">Σύνολο</th>
                      <th>Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDocs.map((d) => (
                      <tr
                        key={d.id}
                        onClick={(e) => {
                          const anchor =
                            e.currentTarget.querySelector<HTMLAnchorElement>(
                              "a[data-row-anchor]",
                            );
                          anchor?.click();
                        }}
                        className="cursor-pointer"
                      >
                        <td className="mono">
                          <Link
                            href={`/app/documents/${d.id}`}
                            data-row-anchor
                            className="font-semibold text-brand-800 hover:text-brand-900"
                          >
                            {date(d.issueDate)}
                          </Link>
                        </td>
                        <td>{d.client?.legalName ?? "—"}</td>
                        <td>{t.documents.types[d.type]}</td>
                        <td className="text-right font-semibold">
                          {money(d.totalAmount)}
                        </td>
                        <td>
                          <DocStatusBadge status={d.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Πρόχειρα" subtitle="Ανοιχτά προς επεξεργασία" />
          <CardBody>
            <div className="text-3xl font-semibold text-ink-900">
              {draftCount}
            </div>
            <LinkButton
              href="/app/documents?status=draft"
              variant="ghost"
              size="sm"
              className="mt-3"
            >
              Άνοιξε τα πρόχειρα →
            </LinkButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function WelcomeChecklist({
  hasClients,
  hasItems,
  hasIssuedDoc,
  wrappActive,
}: {
  hasClients: boolean;
  hasItems: boolean;
  hasIssuedDoc: boolean;
  wrappActive: boolean;
}) {
  const steps = [
    {
      done: true,
      title: "Δημιούργησες τον λογαριασμό σου",
      desc: "Ο λογαριασμός είναι έτοιμος.",
      href: null,
      cta: null,
    },
    {
      done: wrappActive,
      title: "Ενεργοποίηση ηλεκτρονικής έκδοσης",
      desc: "Σύνδεση με τον πάροχο για να εκδίδεις παραστατικά με MARK/UID/QR.",
      href: "/app/settings/wrapp",
      cta: "Ενεργοποίηση",
    },
    {
      done: hasClients,
      title: "Πρόσθεσε τον πρώτο σου πελάτη",
      desc: "Καταχώρησε πελάτη με ΑΦΜ ή αναζήτησε αυτόματα.",
      href: "/app/clients/new",
      cta: "Νέος πελάτης",
    },
    {
      done: hasItems,
      title: "Πρόσθεσε προϊόντα ή υπηρεσίες",
      desc: "Δημιούργησε τον κατάλογο ειδών σου με τιμές και ΦΠΑ.",
      href: "/app/items/new",
      cta: "Νέο είδος",
    },
    {
      done: hasIssuedDoc,
      title: "Εξέδωσε το πρώτο σου παραστατικό",
      desc: "Δημιούργησε τιμολόγιο ή απόδειξη σε τρία κλικ.",
      href: "/app/documents/new?type=invoice",
      cta: "Νέο παραστατικό",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <Card className="overflow-hidden">
      <div className="relative border-b-2 border-ink-200 bg-brand-900 px-6 py-6 text-white md:px-8 md:py-8">
        <div className="flex items-start gap-4">
          <span className="mt-1 shrink-0 rounded-2xl bg-white/10 p-3 text-white">
            <Rocket size={22} aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-200">
              Ξεκίνησες τώρα
            </p>
            <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">
              5 βήματα για να στείλεις το πρώτο σου παραστατικό
            </h2>
            <p className="mt-1 text-sm text-brand-100">
              {completed} από {steps.length} ολοκληρώθηκαν · {pct}%
            </p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <CardBody className="p-0">
        <ol className="divide-y-2 divide-ink-200">
          {steps.map((s, i) => {
            const isNext = s === nextStep;
            return (
              <li
                key={i}
                className={
                  "flex items-start gap-4 px-6 py-4 md:px-8 md:py-5 " +
                  (isNext ? "bg-brand-50" : "")
                }
              >
                <span
                  className={
                    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold " +
                    (s.done
                      ? "bg-emerald-100 text-emerald-800"
                      : isNext
                        ? "bg-brand-900 text-white"
                        : "bg-ink-200 text-ink-700")
                  }
                >
                  {s.done ? <Check size={16} /> : i + 1}
                </span>
                <div className="flex-1">
                  <p
                    className={
                      "text-base font-bold " +
                      (s.done ? "text-ink-500 line-through" : "text-brand-900")
                    }
                  >
                    {s.title}
                  </p>
                  {!s.done && (
                    <p className="mt-0.5 text-sm text-ink-700">{s.desc}</p>
                  )}
                </div>
                {!s.done && s.href && s.cta && (
                  <LinkButton
                    href={s.href}
                    size="sm"
                    variant={isNext ? "primary" : "secondary"}
                    icon={isNext ? Sparkles : undefined}
                  >
                    {s.cta}
                  </LinkButton>
                )}
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}

function WrappStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge tone="success">{t.wrapp.active}</Badge>;
    case "pending":
      return <Badge tone="warning">{t.wrapp.pending}</Badge>;
    case "error":
      return <Badge tone="danger">{t.wrapp.error}</Badge>;
    default:
      return <Badge tone="muted">{t.wrapp.inactive}</Badge>;
  }
}

function DocStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "issued":
      return <Badge tone="success">{t.status.issued}</Badge>;
    case "sending":
      return <Badge tone="brand">{t.status.sending}</Badge>;
    case "failed":
      return <Badge tone="danger">{t.status.failed}</Badge>;
    case "cancelled":
      return <Badge tone="muted">{t.status.cancelled}</Badge>;
    default:
      return <Badge>{t.status.draft}</Badge>;
  }
}
