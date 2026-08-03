import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

type SearchParams = {
  q?: string;
  event?: string;
  outcome?: string;
  page?: string;
};

const OUTCOME_TONE: Record<
  string,
  "success" | "danger" | "warning" | "neutral" | "muted"
> = {
  issued: "success",
  pdf_ready: "success",
  pos_payment_ok: "success",
  onboarding_completed: "success",
  handler_error: "danger",
  bad_signature: "danger",
  unknown_event: "warning",
  no_tenant_match: "warning",
};

/**
 * Admin viewer for Wrapp webhook traffic. We only persist metadata
 * (event type, outcome, signature verification, payload keys) — never
 * the raw body, since it contains customer-side data. This page is the
 * "did we actually get event X for tenant Y?" answer during support
 * calls.
 */
export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin("super_admin", "support");

  const { q, event, outcome, page } = await searchParams;
  const search = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page ?? "1") || 1);

  const where = {
    ...(event ? { eventType: event } : {}),
    ...(outcome ? { outcome } : {}),
    ...(search
      ? {
          OR: [
            { partnerUserId: { contains: search } },
            { detail: { contains: search } },
            { payloadKeys: { contains: search } },
          ],
        }
      : {}),
  };

  const [rows, total, byEvent, byOutcome] = await Promise.all([
    prisma.wrappWebhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
    prisma.wrappWebhookLog.count({ where }),
    prisma.wrappWebhookLog.groupBy({
      by: ["eventType"],
      _count: { _all: true },
      orderBy: { _count: { eventType: "desc" } },
      take: 8,
    }),
    prisma.wrappWebhookLog.groupBy({
      by: ["outcome"],
      _count: { _all: true },
      orderBy: { _count: { outcome: "desc" } },
      take: 8,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const webhookUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/wrapp/webhook`;

  return (
    <>
      <PageHeader
        title="Webhooks Wrapp"
        subtitle={`${total.toLocaleString("el-GR")} events με τα τρέχοντα φίλτρα`}
      />

      <Card className="mb-4">
        <CardBody className="space-y-3 text-sm">
          <p className="text-ink-700">
            <strong>Endpoint:</strong>{" "}
            <code className="mono text-xs">{webhookUrl}</code>
          </p>
          <p className="text-ink-500">
            Καταγράφουμε μόνο metadata (event type, outcome, verification
            scope) — ποτέ το raw payload. Για replay πρέπει να ζητηθεί από
            τη Wrapp resend του συγκεκριμένου event.
          </p>
        </CardBody>
      </Card>

      <form className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε partner user id / detail / keys..."
        />
        {event && <input type="hidden" name="event" value={event} />}
        {outcome && <input type="hidden" name="outcome" value={outcome} />}
      </form>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <FacetCard
          title="Πιο συχνά events"
          items={byEvent.map((r) => ({
            label: r.eventType ?? "—",
            count: r._count._all,
            href: `/admin/webhooks?${new URLSearchParams({
              ...(r.eventType ? { event: r.eventType } : {}),
              ...(search ? { q: search } : {}),
              ...(outcome ? { outcome } : {}),
            })}`,
            active: event === r.eventType,
          }))}
          clearHref="/admin/webhooks"
        />
        <FacetCard
          title="Πιο συχνά outcomes"
          items={byOutcome.map((r) => ({
            label: r.outcome,
            count: r._count._all,
            href: `/admin/webhooks?${new URLSearchParams({
              outcome: r.outcome,
              ...(search ? { q: search } : {}),
              ...(event ? { event } : {}),
            })}`,
            active: outcome === r.outcome,
          }))}
          clearHref="/admin/webhooks"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Ημ/νία</th>
                <th className="px-4 py-2 text-left">Event</th>
                <th className="px-4 py-2 text-left">Outcome</th>
                <th className="px-4 py-2 text-left">Sig</th>
                <th className="px-4 py-2 text-left">Scope</th>
                <th className="px-4 py-2 text-left">Partner user</th>
                <th className="px-4 py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ink-100/40">
                  <td className="px-4 py-2 text-ink-500">
                    <time
                      dateTime={r.createdAt.toISOString()}
                      title={r.createdAt.toISOString()}
                    >
                      {r.createdAt.toLocaleString("el-GR")}
                    </time>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.eventType ?? <span className="text-ink-400">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={OUTCOME_TONE[r.outcome] ?? "neutral"}>
                      {r.outcome}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    {r.hasSignature ? (
                      <Badge tone="success">Ναι</Badge>
                    ) : (
                      <Badge tone="danger">Όχι</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-700">
                    {r.verificationScope ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ink-700">
                    {r.partnerUserId ?? "—"}
                  </td>
                  <td className="px-4 py-2 max-w-md truncate text-ink-700" title={r.detail ?? ""}>
                    {r.detail ?? "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-500">
                    Δεν βρέθηκαν webhooks με τα τρέχοντα φίλτρα.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Σελίδα {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <LinkButton
                href={buildUrl({
                  q: search,
                  event,
                  outcome,
                  page: currentPage - 1,
                })}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {currentPage < totalPages && (
              <LinkButton
                href={buildUrl({
                  q: search,
                  event,
                  outcome,
                  page: currentPage + 1,
                })}
                variant="secondary"
                size="sm"
              >
                Επόμενη
              </LinkButton>
            )}
          </div>
        </nav>
      )}
    </>
  );
}

function FacetCard({
  title,
  items,
  clearHref,
}: {
  title: string;
  items: { label: string; count: number; href: string; active: boolean }[];
  clearHref: string;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
          {title}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((it) => (
            <li key={it.label}>
              <a
                href={it.href}
                className={
                  "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-bold " +
                  (it.active
                    ? "border-brand-800 bg-brand-700 text-white"
                    : "border-ink-300 bg-white text-ink-800 hover:border-ink-500")
                }
              >
                <span className="mono">{it.label}</span>
                <span className="text-[10px] opacity-70">({it.count})</span>
              </a>
            </li>
          ))}
        </ul>
        <a
          href={clearHref}
          className="mt-2 inline-block text-[11px] font-bold text-brand-800 hover:text-brand-900"
        >
          Καθαρισμός φίλτρων ←
        </a>
      </CardBody>
    </Card>
  );
}

function buildUrl(params: {
  q: string;
  event?: string;
  outcome?: string;
  page: number;
}) {
  const s = new URLSearchParams();
  if (params.q) s.set("q", params.q);
  if (params.event) s.set("event", params.event);
  if (params.outcome) s.set("outcome", params.outcome);
  s.set("page", String(params.page));
  return `/admin/webhooks?${s.toString()}`;
}
