"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { colorForStaff } from "../staff-color";
import { rescheduleAppointmentAction } from "../actions";

type WeekAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  clientName: string | null;
  staffId: string | null;
  staffName: string | null;
  status: AppointmentStatus;
};

const DAY_NAMES = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
const DAY_SHORT = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];

// Visible time band. 7:00 → 22:00 gives 15 hours which fits most working
// days without excessive scrolling. Appointments outside this band still
// render but get clamped so they don't spill off the grid.
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 56;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_PX;
// Snap drag-drop to 15-minute increments. Keeps the schedule tidy and
// matches how humans actually book slots.
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

/**
 * Week grid: 1 label column + 7 day columns, hours as horizontal rows.
 * Appointments render as absolute-positioned blocks inside their day
 * column, height = duration × pixels-per-minute.
 *
 * Overlapping blocks within the same day are auto-sharded into columns
 * so they don't stack on top of each other — nothing visually complex,
 * just a simple sweep-line pack that widens the block to fill any
 * un-shared time.
 */
export function WeekCalendar({
  weekStart,
  appointments,
}: {
  /** ISO date of the Monday for the week being displayed. */
  weekStart: string;
  appointments: WeekAppointment[];
}) {
  const router = useRouter();
  const today = new Date();
  const monday = useMemo(() => new Date(weekStart), [weekStart]);
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [monday]);

  const perDay = useMemo(() => {
    const map = new Map<string, WeekAppointment[]>();
    for (const a of appointments) {
      const d = new Date(a.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    // Sort each day chronologically so the shard packer runs in order.
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      );
    }
    return map;
  }, [appointments]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    duration: number;
    ghost: { dayIdx: number; startMin: number } | null;
  } | null>(null);
  const dragMoved = useRef(false);

  function onBlockPointerDown(
    e: React.PointerEvent<HTMLElement>,
    item: WeekAppointment,
  ) {
    // Skip when a modifier is held (user probably wants to open a link).
    if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragMoved.current = false;
    const duration =
      new Date(item.endAt).getTime() - new Date(item.startAt).getTime();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    setDrag({
      id: item.id,
      duration,
      ghost: null,
    });

    function handleMove(ev: PointerEvent) {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      if (!dragMoved.current && Math.hypot(dx, dy) < 6) return;
      dragMoved.current = true;
      const grid = gridRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      // 72px time rail on the left, 7 equal columns after.
      const colX = ev.clientX - rect.left - 72;
      const colWidth = (rect.width - 72) / 7;
      const dayIdx = Math.max(0, Math.min(6, Math.floor(colX / colWidth)));
      const y = ev.clientY - rect.top;
      const snappedPx = Math.round(y / SNAP_PX) * SNAP_PX;
      const startMin = Math.max(
        0,
        Math.min(
          (END_HOUR - START_HOUR) * 60 - SNAP_MINUTES,
          (snappedPx / HOUR_PX) * 60,
        ),
      );
      setDrag((prev) =>
        prev
          ? { ...prev, ghost: { dayIdx, startMin } }
          : prev,
      );
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      target.releasePointerCapture(e.pointerId);
      setDrag((prev) => {
        if (!prev || !prev.ghost || !dragMoved.current) return null;
        commitReschedule(item, prev.ghost.dayIdx, prev.ghost.startMin, prev.duration);
        return null;
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function commitReschedule(
    item: WeekAppointment,
    dayIdx: number,
    startMin: number,
    durationMs: number,
  ) {
    const target = new Date(monday);
    target.setDate(monday.getDate() + dayIdx);
    target.setHours(
      START_HOUR + Math.floor(startMin / 60),
      startMin % 60,
      0,
      0,
    );
    const endAt = new Date(target.getTime() + durationMs);

    // Optimistic: no state mutation needed, we let router.refresh()
    // pick up the DB change. But if the user drops to the same slot
    // we no-op instead of round-tripping.
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

  return (
    <Card className="overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: "72px repeat(7, 1fr)" }}>
        <div className="border-b-2 border-r border-ink-300 bg-ink-50" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          const isWeekend = i >= 5;
          return (
            <div
              key={i}
              className={
                "border-b-2 border-r border-ink-300 px-3 py-3 text-center " +
                (isToday
                  ? "bg-brand-50"
                  : isWeekend
                    ? "bg-ink-50/70"
                    : "bg-ink-50")
              }
            >
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
                {DAY_SHORT[i]}
              </p>
              <p
                className={
                  "mt-1 text-xl font-extrabold " +
                  (isToday ? "text-brand-900" : "text-ink-900")
                }
              >
                {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div
          ref={gridRef}
          className="relative grid select-none"
          style={{
            gridTemplateColumns: "72px repeat(7, minmax(140px, 1fr))",
            height: GRID_HEIGHT,
          }}
        >
          <div className="relative border-r border-ink-200">
            {hourLabels.map((h, i) => (
              <div
                key={h}
                className="absolute w-full pr-2 text-right text-[11px] font-bold text-ink-500"
                style={{ top: i * HOUR_PX - 6 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => {
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const dayItems = perDay.get(key) ?? [];
            const packed = packColumns(dayItems);
            const isWeekend = dayIdx >= 5;
            return (
              <div
                key={dayIdx}
                className={
                  "relative border-r border-ink-200 " +
                  (isWeekend ? "bg-ink-50/40" : "")
                }
              >
                {hourLabels.map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-b border-ink-100"
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  />
                ))}
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
                  const isDragging = drag?.id === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={`/app/appointments?q=${encodeURIComponent(
                        item.serviceName,
                      )}`}
                      onPointerDown={(e) => onBlockPointerDown(e, item)}
                      onClick={(e) => {
                        if (dragMoved.current) e.preventDefault();
                      }}
                      className={
                        "absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-inset ring-black/5 transition-shadow hover:shadow-md " +
                        c.bg +
                        " " +
                        c.text +
                        " " +
                        (cancelled ? "line-through opacity-60 " : "") +
                        (isDragging
                          ? "cursor-grabbing opacity-40 "
                          : "cursor-grab ")
                      }
                      style={{
                        top,
                        height: Math.max(height, 22),
                        left: `calc(${widthPct * col}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        touchAction: "none",
                      }}
                      title={`${formatTime(item.startAt)} — ${formatTime(
                        item.endAt,
                      )} · ${item.serviceName}${
                        item.clientName ? " · " + item.clientName : ""
                      } · Σύρε για επαναπρογραμματισμό`}
                    >
                      <p className="truncate text-[10px] font-black uppercase tracking-widest opacity-75">
                        {formatTime(item.startAt)}
                      </p>
                      <p className="truncate font-extrabold">
                        {item.clientName ?? item.serviceName}
                      </p>
                      {item.clientName && (
                        <p className="truncate text-[10px] opacity-80">
                          {item.serviceName}
                        </p>
                      )}
                    </Link>
                  );
                })}
                {drag?.ghost?.dayIdx === dayIdx && drag.id && (
                  <GhostBlock
                    startMin={drag.ghost.startMin}
                    durationMs={drag.duration}
                  />
                )}
              </div>
            );
          })}
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
  const height = Math.max(22, (durationMin / 60) * HOUR_PX);
  const hh = String(START_HOUR + Math.floor(startMin / 60)).padStart(2, "0");
  const mm = String(Math.round(startMin % 60)).padStart(2, "0");
  return (
    <div
      className="pointer-events-none absolute left-1 right-1 rounded-lg border-2 border-dashed border-brand-800 bg-brand-100/60 text-[11px] font-black text-brand-900"
      style={{ top, height }}
    >
      <p className="p-1">
        {hh}:{mm}
      </p>
    </div>
  );
}

/**
 * Sweep-line packing — assigns each item to the lowest-index column
 * that isn't currently occupied by another overlapping item. Returns
 * enough info for the renderer to compute width/left as a fraction of
 * the day column.
 */
function packColumns(
  items: WeekAppointment[],
): { item: WeekAppointment; col: number; totalCols: number }[] {
  const result: { item: WeekAppointment; col: number }[] = [];
  const openEnds: number[] = []; // per-column: end time of the current tenant

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

  // Compute totalCols per cluster of overlapping items so widths look
  // consistent within a group. Cheapest way: for each item, count how
  // many columns are "active" during its span.
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
