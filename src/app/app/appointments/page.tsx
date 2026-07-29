import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import {
  CalendarDays,
  Search,
  Users2,
  Clock3,
  Bell,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Field } from "@/components/ui/Input";
import { Pagination, resolvePageSize } from "@/components/ui/Pagination";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { money } from "@/lib/format";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { NewAppointmentButton } from "./NewAppointmentButton";
import { AppointmentRowActions } from "./AppointmentRowActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  staff?: string;
  status?: AppointmentStatus;
  client?: string;
  from?: string;
  to?: string;
  page?: string;
  size?: string;
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Προγραμματισμένο",
  completed: "Ολοκληρωμένο",
  cancelled: "Ακυρωμένο",
  no_show: "No-show",
};

const nfDateTime = new Intl.DateTimeFormat("el-GR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const nfDate = new Intl.DateTimeFormat("el-GR", { dateStyle: "medium" });

function formatDuration(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (mins < 60) return `${mins} λεπτά`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (rest === 0) return `${hours}ω`;
  return `${hours}ω ${rest}λ`;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const staffFilter = params.staff?.trim() ?? "";
  const clientFilter = params.client?.trim() ?? "";
  const status = params.status;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = resolvePageSize(params.size);

  const dateFilter: Prisma.DateTimeFilter | undefined =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
        }
      : undefined;

  const where: Prisma.AppointmentWhereInput = {
    businessId: ctx.businessId,
    ...(staffFilter ? { staffUserId: staffFilter } : {}),
    ...(clientFilter ? { clientId: clientFilter } : {}),
    ...(status ? { status } : {}),
    ...(dateFilter ? { startAt: dateFilter } : {}),
    ...(search
      ? {
          OR: [
            { serviceName: { contains: search } },
            { notes: { contains: search } },
            { client: { legalName: { contains: search } } },
          ],
        }
      : {}),
  };

  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const next24 = new Date();
  next24.setHours(next24.getHours() + 24);

  const [
    rows,
    total,
    monthTotal,
    todayCount,
    upcoming24,
    staff,
    clients,
    items,
  ] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startAt: "desc" },
        take: pageSize,
        skip: (currentPage - 1) * pageSize,
        include: {
          staff: { select: { id: true, fullName: true } },
          client: { select: { id: true, legalName: true } },
          item: { select: { id: true, name: true, unit: true } },
        },
      }),
      prisma.appointment.count({ where }),
      prisma.appointment.count({
        where: {
          businessId: ctx.businessId,
          startAt: { gte: firstOfMonth },
        },
      }),
      prisma.appointment.count({
        where: {
          businessId: ctx.businessId,
          startAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.appointment.count({
        where: {
          businessId: ctx.businessId,
          startAt: { gte: new Date(), lte: next24 },
          status: "scheduled",
        },
      }),
      prisma.businessMember.findMany({
        where: { businessId: ctx.businessId },
        include: { user: { select: { id: true, fullName: true } } },
      }),
      prisma.client.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { legalName: "asc" },
        select: { id: true, legalName: true, tradeName: true },
        take: 500,
      }),
      prisma.item.findMany({
        where: { businessId: ctx.businessId, active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          unit: true,
          defaultPrice: true,
          vatRate: true,
        },
        take: 500,
      }),
    ]);

  const staffOpts = staff.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
  }));
  const clientOpts = clients.map((c) => ({
    id: c.id,
    label: c.tradeName ?? c.legalName,
  }));
  const itemOpts = items.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    defaultPrice: i.defaultPrice.toString(),
    vatRate: i.vatRate.toString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const baseQuery = {
    q: search,
    staff: staffFilter,
    client: clientFilter,
    status: status ?? "",
    from,
    to,
  };

  return (
    <>
      <PageHeader
        title="Ραντεβού"
        subtitle="Κρατήσεις χρόνου, ομάδα, μετατροπή σε παραστατικό."
        actions={
          <>
            <LinkButton
              href="/app/appointments/calendar"
              variant="secondary"
              icon={CalendarDays}
            >
              Ημερολόγιο
            </LinkButton>
            <ExportMenu baseUrl="/api/export/appointments" />
            <NewAppointmentButton
              staff={staffOpts}
              clients={clientOpts}
              items={itemOpts}
            />
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<CalendarDays size={22} />}
          label="Σήμερα"
          value={todayCount.toLocaleString("el-GR")}
          hint="ραντεβού σήμερα"
        />
        <StatCard
          icon={<Bell size={22} />}
          label="Επόμενες 24 ώρες"
          value={upcoming24.toLocaleString("el-GR")}
          hint="προγραμματισμένα"
        />
        <StatCard
          icon={<Clock3 size={22} />}
          label="Τρέχων μήνας"
          value={monthTotal.toLocaleString("el-GR")}
          hint="ραντεβού από 1η"
        />
        <StatCard
          icon={<Users2 size={22} />}
          label="Ομάδα"
          value={staffOpts.length.toLocaleString("el-GR")}
          hint={
            staffOpts.length === 1 ? "μέλος διαθέσιμο" : "μέλη διαθέσιμα"
          }
        />
      </div>

      <FilterBar
        search={search}
        staff={staffFilter}
        client={clientFilter}
        status={status}
        from={from}
        to={to}
        staffOpts={staffOpts}
        clientOpts={clientOpts}
      />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Δεν βρέθηκαν ραντεβού."
              description={
                search || staffFilter || status || from || to
                  ? "Δοκίμασε να καθαρίσεις τα φίλτρα."
                  : "Πρόσθεσε το πρώτο ραντεβού για να ξεκινήσεις."
              }
              action={
                <NewAppointmentButton
                  staff={staffOpts}
                  clients={clientOpts}
                  items={itemOpts}
                />
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ημ/νία & ώρα</th>
                  <th>Πελάτης</th>
                  <th>Υπηρεσία</th>
                  <th>Ανάθεση</th>
                  <th className="text-right">Αξία</th>
                  <th>Κατάσταση</th>
                  <th className="text-right" />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const price =
                    a.priceOverride != null
                      ? Number(a.priceOverride)
                      : 0;
                  const initial = {
                    id: a.id,
                    staffUserId: a.staffUserId ?? "",
                    clientId: a.clientId ?? "",
                    itemId: a.itemId ?? "",
                    serviceName: a.serviceName,
                    startAt: a.startAt,
                    endAt: a.endAt,
                    locationType: a.locationType,
                    locationDetail: a.locationDetail,
                    reminderMinutesBefore: a.reminderMinutesBefore,
                    priceOverride: a.priceOverride
                      ? Number(a.priceOverride)
                      : null,
                    vatRate: a.vatRate ? Number(a.vatRate) : null,
                    notes: a.notes,
                  };
                  return (
                    <tr key={a.id}>
                      <td className="mono">
                        <div className="text-sm font-semibold text-ink-900">
                          {nfDateTime.format(a.startAt)}
                        </div>
                        <div className="text-xs text-ink-500">
                          {formatDuration(a.startAt, a.endAt)}
                        </div>
                      </td>
                      <td>
                        {a.client ? (
                          <Link
                            href={`/app/clients/${a.client.id}`}
                            className="font-semibold text-brand-800 hover:text-brand-900"
                          >
                            {a.client.legalName}
                          </Link>
                        ) : (
                          <span className="text-ink-500">—</span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-ink-900">
                          {a.serviceName}
                        </div>
                        {a.item && (
                          <div className="text-xs text-ink-500">
                            από κατάλογο · {a.item.name}
                          </div>
                        )}
                      </td>
                      <td className="text-sm text-ink-700">
                        {a.staff?.fullName ?? "—"}
                      </td>
                      <td className="text-right font-semibold">
                        {money(price)}
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                        {a.convertedDocumentId && (
                          <div className="mt-1">
                            <Link
                              href={`/app/documents/${a.convertedDocumentId}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-800 underline underline-offset-4 hover:text-brand-900"
                            >
                              Παραστατικό
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <AppointmentRowActions
                          appointment={{
                            id: a.id,
                            status: a.status,
                            convertedDocumentId: a.convertedDocumentId,
                            initial,
                          }}
                          staff={staffOpts}
                          clients={clientOpts}
                          items={itemOpts}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={total}
        pageSize={pageSize}
        buildHref={(p) =>
          "/app/appointments?" +
          new URLSearchParams({
            ...baseQuery,
            size: String(pageSize),
            page: String(p),
          }).toString()
        }
        sizeHref={(s) =>
          "/app/appointments?" +
          new URLSearchParams({
            ...baseQuery,
            size: String(s),
            page: "1",
          }).toString()
        }
      />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-900">
              {value}
            </p>
            <p className="mt-1 text-sm text-ink-700">{hint}</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-800">
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  if (status === "completed")
    return <Badge tone="success">{STATUS_LABEL[status]}</Badge>;
  if (status === "cancelled")
    return <Badge tone="muted">{STATUS_LABEL[status]}</Badge>;
  if (status === "no_show")
    return <Badge tone="danger">{STATUS_LABEL[status]}</Badge>;
  return <Badge tone="brand">{STATUS_LABEL[status]}</Badge>;
}

function FilterBar({
  search,
  staff,
  client,
  status,
  from,
  to,
  staffOpts,
  clientOpts,
}: {
  search: string;
  staff: string;
  client: string;
  status?: AppointmentStatus;
  from: string;
  to: string;
  staffOpts: { id: string; fullName: string }[];
  clientOpts: { id: string; label: string }[];
}) {
  return (
    <form
      method="get"
      className="mb-5 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 md:grid-cols-12"
    >
      <Field label="Αναζήτηση" htmlFor="q" className="md:col-span-4">
        <Input
          id="q"
          name="q"
          defaultValue={search}
          placeholder="Πελάτης, υπηρεσία, σημείωση..."
        />
      </Field>
      <Field label="Ανάθεση" htmlFor="staff" className="md:col-span-3">
        <Select id="staff" name="staff" defaultValue={staff}>
          <option value="">Όλοι</option>
          {staffOpts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Κατάσταση" htmlFor="status" className="md:col-span-2">
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Όλες</option>
          <option value="scheduled">Προγραμματισμένα</option>
          <option value="completed">Ολοκληρωμένα</option>
          <option value="cancelled">Ακυρωμένα</option>
          <option value="no_show">No-show</option>
        </Select>
      </Field>
      <Field label="Πελάτης" htmlFor="client" className="md:col-span-3">
        <Select id="client" name="client" defaultValue={client}>
          <option value="">Όλοι</option>
          {clientOpts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Από" htmlFor="from" className="md:col-span-3">
        <Input id="from" name="from" type="date" defaultValue={from} />
      </Field>
      <Field label="Έως" htmlFor="to" className="md:col-span-3">
        <Input id="to" name="to" type="date" defaultValue={to} />
      </Field>
      <div className="md:col-span-6 md:self-end">
        <Field label=" " htmlFor="submit">
          <Button type="submit" size="md" className="w-full" icon={Search}>
            Εφαρμογή φίλτρων
          </Button>
        </Field>
      </div>
    </form>
  );
}
