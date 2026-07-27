import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Calendar,
  List,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { NewAppointmentButton } from "../NewAppointmentButton";
import { MonthCalendar } from "./MonthCalendar";
import { WeekCalendar } from "./WeekCalendar";

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

const GREEK_MONTHS_SHORT = [
  "Ιαν",
  "Φεβ",
  "Μάρ",
  "Απρ",
  "Μάι",
  "Ιούν",
  "Ιούλ",
  "Αύγ",
  "Σεπ",
  "Οκτ",
  "Νοέ",
  "Δεκ",
];

type ViewMode = "month" | "week";

function mondayOf(d: Date): Date {
  const day = d.getDay();
  const offset = (day + 6) % 7; // 0 for Monday, 6 for Sunday
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - offset);
  return monday;
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function AppointmentsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    y?: string;
    m?: string;
    d?: string;
    view?: string;
    staff?: string;
  }>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const params = await searchParams;
  const view: ViewMode = params.view === "week" ? "week" : "month";
  const now = new Date();
  const staffFilter = params.staff?.trim() ?? "";

  // Compute the visible range based on the view.
  let rangeStart: Date;
  let rangeEnd: Date;
  let month = now.getMonth();
  let year = now.getFullYear();
  let weekMonday = mondayOf(now);

  if (view === "week") {
    const anchor = params.d ? new Date(params.d) : now;
    weekMonday = mondayOf(anchor);
    rangeStart = new Date(weekMonday);
    rangeEnd = new Date(weekMonday);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
    year = weekMonday.getFullYear();
    month = weekMonday.getMonth();
  } else {
    const rawYear = Number(params.y) || now.getFullYear();
    const rawMonth = params.m ? Number(params.m) - 1 : now.getMonth();
    const anchor = new Date(rawYear, rawMonth, 1);
    year = anchor.getFullYear();
    month = anchor.getMonth();
    // Include spill days so cells from prev/next months still render chips.
    rangeStart = new Date(year, month, 1);
    rangeStart.setDate(rangeStart.getDate() - 7);
    rangeEnd = new Date(year, month + 1, 1);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
  }

  const [appointments, members, todayCount] = await Promise.all([
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
  ]);

  const staffOpts = members.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
  }));

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

  // Nav helpers
  const staffParam = staffFilter ? `&staff=${staffFilter}` : "";
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekSunday.getDate() + 6);

  let headerLabel: string;
  let prevHref: string;
  let nextHref: string;
  let todayHref: string;

  if (view === "week") {
    // "3–9 Μαρ 2026" — trim year if both ends are same year.
    const startMon = GREEK_MONTHS_SHORT[weekMonday.getMonth()];
    const endMon = GREEK_MONTHS_SHORT[weekSunday.getMonth()];
    const startY = weekMonday.getFullYear();
    const endY = weekSunday.getFullYear();
    if (startY === endY && startMon === endMon) {
      headerLabel = `${weekMonday.getDate()}–${weekSunday.getDate()} ${startMon} ${startY}`;
    } else if (startY === endY) {
      headerLabel = `${weekMonday.getDate()} ${startMon} – ${weekSunday.getDate()} ${endMon} ${startY}`;
    } else {
      headerLabel = `${weekMonday.getDate()} ${startMon} ${startY} – ${weekSunday.getDate()} ${endMon} ${endY}`;
    }
    const prev = new Date(weekMonday);
    prev.setDate(prev.getDate() - 7);
    const next = new Date(weekMonday);
    next.setDate(next.getDate() + 7);
    prevHref = `/app/appointments/calendar?view=week&d=${toDateInput(prev)}${staffParam}`;
    nextHref = `/app/appointments/calendar?view=week&d=${toDateInput(next)}${staffParam}`;
    todayHref = `/app/appointments/calendar?view=week${staffParam ? "&staff=" + staffFilter : ""}`;
  } else {
    headerLabel = `${GREEK_MONTHS[month]} ${year}`;
    const prev = new Date(year, month - 1, 1);
    const next = new Date(year, month + 1, 1);
    prevHref = `/app/appointments/calendar?y=${prev.getFullYear()}&m=${prev.getMonth() + 1}${staffParam}`;
    nextHref = `/app/appointments/calendar?y=${next.getFullYear()}&m=${next.getMonth() + 1}${staffParam}`;
    todayHref = `/app/appointments/calendar${staffParam ? "?staff=" + staffFilter : ""}`;
  }

  const visibleCount = appointments.filter((a) => {
    if (view === "week") {
      return a.startAt >= weekMonday && a.startAt < new Date(weekMonday.getTime() + 7 * 86_400_000);
    }
    return a.startAt.getMonth() === month && a.startAt.getFullYear() === year;
  }).length;

  return (
    <>
      <PageHeader
        title="Ημερολόγιο ραντεβού"
        subtitle={`${headerLabel} · ${visibleCount} ${view === "week" ? "ραντεβού την εβδομάδα" : "ραντεβού τον μήνα"} · ${todayCount} σήμερα`}
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
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle
              view={view}
              weekHref={`/app/appointments/calendar?view=week&d=${toDateInput(weekMonday)}${staffParam}`}
              monthHref={`/app/appointments/calendar?y=${year}&m=${month + 1}${staffParam}`}
            />
            <div className="mx-2 h-6 w-px bg-ink-300" />
            <LinkButton
              href={prevHref}
              variant="secondary"
              size="sm"
              icon={ArrowLeft}
            >
              Προηγ.
            </LinkButton>
            <span className="mx-2 text-xl font-extrabold text-brand-900">
              {headerLabel}
            </span>
            <LinkButton
              href={nextHref}
              variant="secondary"
              size="sm"
              iconRight={ArrowRight}
            >
              Επόμ.
            </LinkButton>
            <Link
              href={todayHref}
              className="ml-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink-300 bg-white px-3 py-1.5 text-sm font-bold text-ink-900 hover:border-brand-900"
            >
              <CalendarDays size={14} aria-hidden />
              Σήμερα
            </Link>
          </div>
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="view" value={view} />
            {view === "week" ? (
              <input type="hidden" name="d" value={toDateInput(weekMonday)} />
            ) : (
              <>
                <input type="hidden" name="y" value={String(year)} />
                <input type="hidden" name="m" value={String(month + 1)} />
              </>
            )}
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

      {view === "week" ? (
        <WeekCalendar
          weekStart={weekMonday.toISOString()}
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
        />
      ) : (
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
      )}
    </>
  );
}

function ViewToggle({
  view,
  monthHref,
  weekHref,
}: {
  view: ViewMode;
  monthHref: string;
  weekHref: string;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border-2 border-ink-300 bg-white">
      <ToggleLink
        href={weekHref}
        active={view === "week"}
        icon={<CalendarRange size={14} aria-hidden />}
      >
        Εβδομάδα
      </ToggleLink>
      <ToggleLink
        href={monthHref}
        active={view === "month"}
        icon={<Calendar size={14} aria-hidden />}
      >
        Μήνας
      </ToggleLink>
    </div>
  );
}

function ToggleLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={
        "inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold transition-colors " +
        (active
          ? "bg-brand-900 text-white"
          : "text-ink-700 hover:bg-ink-100")
      }
    >
      {icon}
      {children}
    </Link>
  );
}
