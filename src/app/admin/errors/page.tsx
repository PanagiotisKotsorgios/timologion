import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LinkButton } from "@/components/ui/Button";
import { AdminExportButton } from "@/components/admin/AdminExportButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

type SearchParams = {
  q?: string;
  level?: "warn" | "error";
  view?: "grouped" | "recent";
  page?: string;
  fingerprint?: string;
};

/**
 * In-app error dashboard. Two views:
 *   - "Grouped" (default): one row per fingerprint, latest first, with
 *     total count + most recent occurrence. This is what you want when
 *     scanning "what's broken this week".
 *   - "Recent": raw stream of individual events, useful for tracing a
 *     specific incident's cascade.
 *   - Drill-in: clicking a fingerprint filters to just its occurrences.
 */
export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin("super_admin", "support");

  const { q, level, view, page, fingerprint } = await searchParams;
  const search = q?.trim() ?? "";
  const currentView = view ?? (fingerprint ? "recent" : "grouped");
  const currentPage = Math.max(1, Number(page ?? "1") || 1);

  const where = {
    ...(level ? { level } : {}),
    ...(fingerprint ? { fingerprint } : {}),
    ...(search
      ? {
          OR: [
            { message: { contains: search } },
            { path: { contains: search } },
            { stack: { contains: search } },
          ],
        }
      : {}),
  };

  const [totalRaw, last24h, last7d, latestOverall] = await Promise.all([
    prisma.errorLog.count({ where }),
    prisma.errorLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.errorLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.errorLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Σφάλματα εφαρμογής"
        subtitle={
          latestOverall
            ? `Τελευταίο: ${latestOverall.createdAt.toLocaleString("el-GR")}`
            : "Δεν έχουν καταγραφεί σφάλματα ακόμη."
        }
        actions={<AdminExportButton entity="errors" params={{ level }} />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Τελευταίες 24 ώρες" value={last24h.toLocaleString("el-GR")} tone={last24h > 20 ? "danger" : "muted"} />
        <Stat label="Τελευταίες 7 ημέρες" value={last7d.toLocaleString("el-GR")} tone={last7d > 100 ? "warning" : "muted"} />
        <Stat label="Με τρέχοντα φίλτρα" value={totalRaw.toLocaleString("el-GR")} tone="muted" />
      </div>

      <form className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Αναζήτηση σε message / path / stack..."
        />
        {level && <input type="hidden" name="level" value={level} />}
        {view && <input type="hidden" name="view" value={view} />}
        {fingerprint && (
          <input type="hidden" name="fingerprint" value={fingerprint} />
        )}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip
          href={`/admin/errors?${qs({ q: search, view: "grouped" })}`}
          label="Ομαδοποιημένα"
          active={currentView === "grouped" && !fingerprint}
        />
        <Chip
          href={`/admin/errors?${qs({ q: search, view: "recent" })}`}
          label="Πρόσφατα (raw)"
          active={currentView === "recent" && !fingerprint}
        />
        <span className="mx-2 h-6 border-l border-ink-300" aria-hidden />
        <Chip
          href={`/admin/errors?${qs({ q: search })}`}
          label="Όλα"
          active={!level}
        />
        <Chip
          href={`/admin/errors?${qs({ q: search, level: "error" })}`}
          label="Σφάλματα"
          active={level === "error"}
        />
        <Chip
          href={`/admin/errors?${qs({ q: search, level: "warn" })}`}
          label="Προειδοποιήσεις"
          active={level === "warn"}
        />
        {fingerprint && (
          <>
            <span className="mx-2 h-6 border-l border-ink-300" aria-hidden />
            <Chip
              href={`/admin/errors?${qs({ q: search })}`}
              label={`← Καθαρισμός fingerprint`}
              active={false}
            />
          </>
        )}
      </div>

      {currentView === "grouped" && !fingerprint ? (
        <GroupedTable where={where} />
      ) : (
        <RecentTable where={where} page={currentPage} search={search} level={level} fingerprint={fingerprint} />
      )}
    </>
  );
}

// ─── Grouped view ──────────────────────────────────────────────────────
async function GroupedTable({ where }: { where: object }) {
  // Prisma doesn't support "max per group" natively, so we fetch the
  // fingerprint→count and then hydrate the latest sample per fingerprint
  // with a single findMany + in-memory dedupe on message+level.
  const groups = await prisma.errorLog.groupBy({
    by: ["fingerprint"],
    where,
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 100,
  });

  const samples = await prisma.errorLog.findMany({
    where: {
      ...where,
      fingerprint: { in: groups.map((g) => g.fingerprint) },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const sampleByFp = new Map<string, (typeof samples)[number]>();
  for (const s of samples) if (!sampleByFp.has(s.fingerprint)) sampleByFp.set(s.fingerprint, s);

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-2 text-left">Message</th>
              <th className="px-4 py-2 text-left">Level</th>
              <th className="px-4 py-2 text-right">Εμφανίσεις</th>
              <th className="px-4 py-2 text-left">Τελευταία</th>
              <th className="px-4 py-2 text-left">Path</th>
              <th className="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/60">
            {groups.map((g) => {
              const sample = sampleByFp.get(g.fingerprint);
              return (
                <tr key={g.fingerprint} className="hover:bg-ink-100/40">
                  <td className="px-4 py-2 font-medium text-ink-900 max-w-lg truncate" title={sample?.message ?? ""}>
                    {sample?.message ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={sample?.level === "error" ? "danger" : "warning"}>
                      {sample?.level ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">
                    {g._count._all.toLocaleString("el-GR")}
                  </td>
                  <td className="px-4 py-2 text-ink-500">
                    {g._max.createdAt?.toLocaleString("el-GR") ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-ink-700 max-w-xs truncate" title={sample?.path ?? ""}>
                    {sample?.path ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={`/admin/errors?fingerprint=${encodeURIComponent(g.fingerprint)}`}
                      className="text-xs font-bold text-brand-800 hover:text-brand-900"
                    >
                      Δες όλα →
                    </a>
                  </td>
                </tr>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink-500">
                  Δεν υπάρχουν σφάλματα με τα τρέχοντα φίλτρα.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Recent (raw) view ──────────────────────────────────────────────────
async function RecentTable({
  where,
  page,
  search,
  level,
  fingerprint,
}: {
  where: object;
  page: number;
  search: string;
  level?: "warn" | "error";
  fingerprint?: string;
}) {
  const [rows, total] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.errorLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Ημ/νία</th>
                <th className="px-4 py-2 text-left">Level</th>
                <th className="px-4 py-2 text-left">Message</th>
                <th className="px-4 py-2 text-left">Path</th>
                <th className="px-4 py-2 text-left">Business</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-ink-100/40">
                  <td className="px-4 py-2 whitespace-nowrap text-ink-500">
                    {r.createdAt.toLocaleString("el-GR")}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={r.level === "error" ? "danger" : "warning"}>
                      {r.level}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 max-w-lg">
                    <p className="font-medium text-ink-900 truncate" title={r.message}>
                      {r.message}
                    </p>
                    {r.stack && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] font-bold text-brand-800">
                          stack
                        </summary>
                        <pre className="mt-1 max-h-40 overflow-auto rounded border border-ink-200 bg-ink-50 p-2 text-[10px] leading-tight text-ink-800">
                          {r.stack}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-700 max-w-xs truncate" title={r.path ?? ""}>
                    {r.path ?? "—"}
                  </td>
                  <td className="px-4 py-2 mono text-xs text-ink-700">
                    {r.businessId ? (
                      <a
                        href={`/admin/businesses/${r.businessId}`}
                        className="text-brand-800 hover:text-brand-900"
                      >
                        {r.businessId.slice(-8)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-500">
                    Δεν βρέθηκαν εγγραφές.
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
            Σελίδα {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <LinkButton
                href={`/admin/errors?${qs({
                  q: search,
                  level,
                  view: "recent",
                  fingerprint,
                  page: String(page - 1),
                })}`}
                variant="secondary"
                size="sm"
              >
                Προηγούμενη
              </LinkButton>
            )}
            {page < totalPages && (
              <LinkButton
                href={`/admin/errors?${qs({
                  q: search,
                  level,
                  view: "recent",
                  fingerprint,
                  page: String(page + 1),
                })}`}
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

function qs(params: Record<string, string | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) s.set(k, v);
  }
  return s.toString();
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={
        "rounded-full border-2 px-3 py-1 text-xs font-bold " +
        (active
          ? "border-brand-800 bg-brand-700 text-white"
          : "border-ink-300 bg-white text-ink-800 hover:border-ink-500")
      }
    >
      {label}
    </a>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "warning" | "muted";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-300 bg-red-50 text-red-900"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-ink-300 bg-white text-ink-900";
  return (
    <Card className={`border-2 ${toneClass}`}>
      <CardBody className="p-4">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
          {label}
        </p>
        <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
      </CardBody>
    </Card>
  );
}
