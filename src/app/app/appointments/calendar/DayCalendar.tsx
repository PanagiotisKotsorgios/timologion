"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { MapPin, Video, Phone, User2 } from "lucide-react";
import { colorForStaff } from "../staff-color";
import { rescheduleAppointmentAction } from "../actions";

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
const SNAP_MINUTES = 15;
const SNAP_PX = (SNAP_MINUTES / 60) * HOUR_PX;

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
  const router = useRouter();
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

  const dayColRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    duration: number;
    startMin: number | null;
  } | null>(null);
  const dragMoved = useRef(false);

  function onBlockPointerDown(
    e: React.PointerEvent<HTMLElement>,
    item: DayAppointment,
  ) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragMoved.current = false;
    const duration =
      new Date(item.endAt).getTime() - new Date(item.startAt).getTime();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    setDrag({ id: item.id, duration, startMin: null });

    function handleMove(ev: PointerEvent) {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      if (!dragMoved.current && Math.hypot(dx, dy) < 6) return;
      dragMoved.current = true;
      const grid = dayColRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const y = ev.clientY - rect.top;
      const snappedPx = Math.round(y / SNAP_PX) * SNAP_PX;
      const startMin = Math.max(
        0,
        Math.min(
          (END_HOUR - START_HOUR) * 60 - SNAP_MINUTES,
          (snappedPx / HOUR_PX) * 60,
        ),
      );
      setDrag((prev) => (prev ? { ...prev, startMin } : prev));
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      target.releasePointerCapture(e.pointerId);
      setDrag((prev) => {
        if (!prev || prev.startMin == null || !dragMoved.current) return null;
        commitReschedule(item, prev.startMin, prev.duration);
        return null;
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function commitReschedule(
    item: DayAppointment,
    startMin: number,
    durationMs: number,
  ) {
    const target = new Date(day);
    target.setHours(
      START_HOUR + Math.floor(startMin / 60),
      startMin % 60,
      0,
      0,
    );
    const endAt = new Date(target.getTime() + durationMs);
    const orig = new Date(item.startAt);
    if (orig.getTime() === target.getTime()) return;

    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("startAt", target.toISOString());
    fd.set("endAt", endAt.toISOString());
    rescheduleAppointmentAction(fd)
      .then(() => router.refresh())
      .catch(() => router.refresh());
  }

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

        <div ref={dayColRef} className="relative select-none" style={{ touchAction: "none" }}>
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
            const isDragging = drag?.id === item.id;
            return (
              <Link
                key={item.id}
                href={`/app/appointments?q=${encodeURIComponent(item.serviceName)}`}
                onPointerDown={(e) => onBlockPointerDown(e, item)}
                onClick={(e) => {
                  if (dragMoved.current) e.preventDefault();
                }}
                className={
                  "absolute overflow-hidden rounded-xl border-l-4 px-3 py-2 shadow-sm ring-1 ring-inset ring-black/5 transition-shadow hover:shadow-md " +
                  c.bg +
                  " " +
                  c.text +
                  " " +
                  (cancelled ? "line-through opacity-60 " : "") +
                  (isDragging ? "cursor-grabbing opacity-40 " : "cursor-grab ")
                }
                style={{
                  top,
                  height: Math.max(height, 44),
                  left: `calc(${widthPct * col}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                  touchAction: "none",
                }}
                title={`${formatTime(item.startAt)} — ${formatTime(item.endAt)} · ${item.serviceName}${item.clientName ? " · " + item.clientName : ""} · Σύρε για επαναπρογραμματισμό`}
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
          {drag?.startMin != null && (
            <GhostBlock
              startMin={drag.startMin}
              durationMs={drag.duration}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

function GhostBlock({
  startMin,
  durationMs,
}: {
  startMin: number;
  durationMs: number;
}) {
  const durationMin = durationMs / 60_000;
  const top = (startMin / 60) * HOUR_PX;
  const height = Math.max(44, (durationMin / 60) * HOUR_PX);
  const hh = String(START_HOUR + Math.floor(startMin / 60)).padStart(2, "0");
  const mm = String(Math.round(startMin % 60)).padStart(2, "0");
  return (
    <div
      className="pointer-events-none absolute left-1 right-1 rounded-xl border-2 border-dashed border-brand-800 bg-brand-100/70 text-brand-900 shadow-sm"
      style={{ top, height }}
    >
      <p className="p-2 text-xs font-black uppercase tracking-widest">
        Επαναπρογραμματισμός · {hh}:{mm}
      </p>
    </div>
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
