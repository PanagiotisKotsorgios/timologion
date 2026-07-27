"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { MapPin, Video, Phone, User2 } from "lucide-react";
import { colorForStaff } from "../staff-color";

type DayAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  clientName: string | null;
  staffId: string | null;
  staffName: string | null;
  status: AppointmentStatus;
  locationType?: "in_person" | "online" | "phone" | null;
  locationDetail?: string | null;
};

// Bigger vertical breathing room than the week view — the whole grid
// only has one day column to fill so we can spend the height on
// readable blocks.
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 72;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_PX;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function minutesFromStart(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() - START_HOUR * 60;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function locationIcon(type?: string | null) {
  if (type === "online") return Video;
  if (type === "phone") return Phone;
  return MapPin;
}

/**
 * Single-day timeline. Same packing logic as WeekCalendar (sweep-line
 * to shard overlapping blocks), but with more breathing room and a
 * "now" line drawn across the current time when the viewed day is
 * today.
 */
export function DayCalendar({
  date,
  appointments,
}: {
  /** ISO string for the day being displayed. */
  date: string;
  appointments: DayAppointment[];
}) {
  const day = useMemo(() => new Date(date), [date]);
  const today = new Date();
  const isToday = isSameDay(day, today);

  const sorted = useMemo(
    () =>
      [...appointments].sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
    [appointments],
  );
  const packed = useMemo(() => packColumns(sorted), [sorted]);

  const hourLabels = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i,
  );

  // Position of the "now" marker (only rendered when viewing today
  // and the current time is inside the visible band).
  const nowOffset = (() => {
    if (!isToday) return null;
    const min = minutesFromStart(today);
    if (min < 0 || min > (END_HOUR - START_HOUR) * 60) return null;
    return (min / 60) * HOUR_PX;
  })();

  return (
    <Card className="overflow-hidden">
      <div
        className="grid border-b-2 border-ink-300 bg-ink-50"
        style={{ gridTemplateColumns: "72px 1fr" }}
      >
        <div />
        <div
          className={
            "px-4 py-3 " + (isToday ? "bg-brand-50" : "")
          }
        >
          <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
            {day.toLocaleDateString("el-GR", { weekday: "long" })}
          </p>
          <p
            className={
              "mt-0.5 text-2xl font-extrabold " +
              (isToday ? "text-brand-900" : "text-ink-900")
            }
          >
            {day.toLocaleDateString("el-GR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {appointments.length}{" "}
            {appointments.length === 1 ? "ραντεβού" : "ραντεβού"} · {" "}
            {appointments.filter((a) => a.status === "scheduled").length}{" "}
            προγραμματισμένα
          </p>
        </div>
      </div>

      <div
        className="relative grid"
        style={{
          gridTemplateColumns: "72px 1fr",
          height: GRID_HEIGHT,
        }}
      >
        <div className="relative border-r border-ink-200 bg-ink-50/40">
          {hourLabels.map((h, i) => (
            <div
              key={h}
              className="absolute w-full pr-2 text-right text-xs font-bold text-ink-500"
              style={{ top: i * HOUR_PX - 7 }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        <div className="relative">
          {hourLabels.map((_, i) => (
            <div
              key={i}
              className="absolute w-full border-b border-ink-100"
              style={{ top: i * HOUR_PX, height: HOUR_PX }}
            />
          ))}

          {nowOffset != null && (
            <div
              className="pointer-events-none absolute z-10 flex w-full items-center gap-1"
              style={{ top: nowOffset - 6 }}
              aria-label="Τώρα"
            >
              <span className="grid h-3 w-3 place-items-center rounded-full bg-red-600 ring-4 ring-red-600/20" />
              <span className="h-0.5 flex-1 bg-red-600" />
              <span className="mr-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                Τώρα
              </span>
            </div>
          )}

          {packed.map(({ item, col, totalCols }) => {
            const start = new Date(item.startAt);
            const end = new Date(item.endAt);
            const startMin = Math.max(0, minutesFromStart(start));
            const endMin = Math.min(
              (END_HOUR - START_HOUR) * 60,
              minutesFromStart(end),
            );
            if (endMin <= 0 || startMin >= endMin) return null;
            const top = (startMin / 60) * HOUR_PX;
            const height = ((endMin - startMin) / 60) * HOUR_PX;
            const c = colorForStaff(item.staffId);
            const cancelled =
              item.status === "cancelled" || item.status === "no_show";
            const widthPct = 100 / totalCols;
            const LocIcon = locationIcon(item.locationType);
            return (
              <Link
                key={item.id}
                href={`/app/appointments?q=${encodeURIComponent(item.serviceName)}`}
                className={
                  "absolute overflow-hidden rounded-xl border-l-4 px-3 py-2 shadow-sm ring-1 ring-inset ring-black/5 transition-shadow hover:shadow-md " +
                  c.bg +
                  " " +
                  c.text +
                  " " +
                  (cancelled ? "line-through opacity-60" : "")
                }
                style={{
                  top,
                  height: Math.max(height, 44),
                  left: `calc(${widthPct * col}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                }}
                title={`${formatTime(item.startAt)} — ${formatTime(item.endAt)} · ${item.serviceName}${item.clientName ? " · " + item.clientName : ""}`}
              >
                <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                  {formatTime(item.startAt)} — {formatTime(item.endAt)}
                </p>
                <p className="mt-0.5 text-base font-extrabold leading-tight">
                  {item.clientName ?? item.serviceName}
                </p>
                {item.clientName && (
                  <p className="mt-0.5 text-xs font-semibold opacity-90">
                    {item.serviceName}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold opacity-90">
                  {item.staffName && (
                    <span className="inline-flex items-center gap-1">
                      <User2 size={11} aria-hidden />
                      {item.staffName}
                    </span>
                  )}
                  {item.locationDetail && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <LocIcon size={11} aria-hidden />
                      <span className="truncate">{item.locationDetail}</span>
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/**
 * Same packer as WeekCalendar. Kept local so the two grids can evolve
 * independently — extracting it into a util would tie their layout
 * assumptions together for no real reuse win.
 */
function packColumns(
  items: DayAppointment[],
): { item: DayAppointment; col: number; totalCols: number }[] {
  const result: { item: DayAppointment; col: number }[] = [];
  const openEnds: number[] = [];

  for (const item of items) {
    const start = new Date(item.startAt).getTime();
    const end = new Date(item.endAt).getTime();
    let placed = false;
    for (let c = 0; c < openEnds.length; c++) {
      if (openEnds[c]! <= start) {
        openEnds[c] = end;
        result.push({ item, col: c });
        placed = true;
        break;
      }
    }
    if (!placed) {
      openEnds.push(end);
      result.push({ item, col: openEnds.length - 1 });
    }
  }

  return result.map(({ item, col }) => {
    const s = new Date(item.startAt).getTime();
    const e = new Date(item.endAt).getTime();
    const active = result.filter((r) => {
      const rs = new Date(r.item.startAt).getTime();
      const re = new Date(r.item.endAt).getTime();
      return rs < e && re > s;
    });
    const totalCols = Math.max(1, ...active.map((r) => r.col + 1));
    return { item, col, totalCols };
  });
}
