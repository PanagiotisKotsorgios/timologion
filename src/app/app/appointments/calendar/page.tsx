import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  List,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { NewAppointmentButton } from "../NewAppointmentButton";
import { MonthCalendar } from "./MonthCalendar";

export const dynamic = "force-dynamic";

const GREEK_MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

function clampMonth(y: number, m: number): { year: number; month: number } {
  const d = new Date(y, m, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export default async function AppointmentsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; staff?: string }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const params = await searchParams;
  const now = new Date();
  const rawYear = Number(params.y) || now.getFullYear();
  const rawMonth = params.m ? Number(params.m) - 1 : now.getMonth();
  const { year, month } = clampMonth(rawYear, rawMonth);
  const staffFilter = params.staff?.trim() ?? "";

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  // Also fetch the days that spill into the calendar grid from prev/next
  // months so chips render on those cells too.
  const rangeStart = new Date(monthStart);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(monthEnd);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const [appointments, members, todayCount, monthCount] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: ctx.businessId,
        startAt: { gte: rangeStart, lt: rangeEnd },
        ...(staffFilter ? { staffUserId: staffFilter } : {}),
      },
      orderBy: { startAt: "asc" },
      include: {
        staff: { select: { id: true, fullName: true } },
        client: { select: { id: true, legalName: true } },
      },
    }),
    prisma.businessMember.findMany({
      where: { businessId: ctx.businessId },
      include: { user: { select: { id: true, fullName: true } } },
    }),
    prisma.appointment.count({
      where: {
        businessId: ctx.businessId,
        startAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
        ...(staffFilter ? { staffUserId: staffFilter } : {}),
      },
    }),
    prisma.appointment.count({
      where: {
        businessId: ctx.businessId,
        startAt: { gte: monthStart, lt: monthEnd },
        ...(staffFilter ? { staffUserId: staffFilter } : {}),
      },
    }),
  ]);

  const staffOpts = members.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
  }));

  // Prefetch client + item options for the "Νέο ραντεβού" modal that lives
  // in the header. Small caps because these lists get very long — the form
  // has its own combo experience in a follow-up.
  const [clients, items] = await Promise.all([
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

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const paramsFor = (y: number, m: number) =>
    `?y=${y}&m=${m + 1}${staffFilter ? `&staff=${staffFilter}` : ""}`;

  return (
    <>
      <PageHeader
        title="Ημερολόγιο ραντεβού"
        subtitle={`${GREEK_MONTHS[month]} ${year} · ${monthCount} ραντεβού τον μήνα · ${todayCount} σήμερα`}
        actions={
          <>
            <LinkButton
              href="/app/appointments"
              variant="secondary"
              icon={List}
            >
              Λίστα
            </LinkButton>
            <NewAppointmentButton
              staff={staffOpts}
              clients={clientOpts}
              items={itemOpts}
            />
          </>
        }
      />

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <LinkButton
              href={
                `/app/appointments/calendar` +
                paramsFor(prev.getFullYear(), prev.getMonth())
              }
              variant="secondary"
              size="sm"
              icon={ArrowLeft}
            >
              {GREEK_MONTHS[prev.getMonth()]}
            </LinkButton>
            <span className="mx-2 text-xl font-extrabold text-brand-900">
              {GREEK_MONTHS[month]} {year}
            </span>
            <LinkButton
              href={
                `/app/appointments/calendar` +
                paramsFor(next.getFullYear(), next.getMonth())
              }
              variant="secondary"
              size="sm"
              iconRight={ArrowRight}
            >
              {GREEK_MONTHS[next.getMonth()]}
            </LinkButton>
            <Link
              href="/app/appointments/calendar"
              className="ml-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink-300 bg-white px-3 py-1.5 text-sm font-bold text-ink-900 hover:border-brand-900"
            >
              <CalendarDays size={14} aria-hidden />
              Σήμερα
            </Link>
          </div>
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="y" value={String(year)} />
            <input type="hidden" name="m" value={String(month + 1)} />
            <label htmlFor="staff" className="text-sm text-ink-700">
              Ανάθεση:
            </label>
            <select
              id="staff"
              name="staff"
              defaultValue={staffFilter}
              className="h-9 rounded-lg border-2 border-ink-300 bg-white px-2 pr-8 text-sm font-semibold text-ink-900 focus:border-brand-800 focus:outline-none"
            >
              <option value="">Όλοι</option>
              {staffOpts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-full bg-brand-900 px-4 text-sm font-bold text-white hover:bg-black"
            >
              Εφαρμογή
            </button>
          </form>
        </CardBody>
      </Card>

      <MonthCalendar
        year={year}
        month={month}
        appointments={appointments.map((a) => ({
          id: a.id,
          startAt: a.startAt.toISOString(),
          endAt: a.endAt.toISOString(),
          serviceName: a.serviceName,
          clientName: a.client?.legalName ?? null,
          staffId: a.staffUserId ?? null,
          staffName: a.staff?.fullName ?? null,
          status: a.status,
        }))}
        staff={staffOpts}
      />
    </>
  );
}
