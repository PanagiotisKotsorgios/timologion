"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { Card, CardBody } from "@/components/ui/Card";
import { X } from "lucide-react";
import { colorForStaff } from "../staff-color";
import { rescheduleAppointmentAction } from "../actions";

type CalendarAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  clientName: string | null;
  staffId: string | null;
  staffName: string | null;
  status: AppointmentStatus;
};

const DAY_NAMES = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Month grid — 6 rows × 7 columns. Includes leading/trailing days from
 * neighbouring months so the grid always fills. Clicking a chip opens
 * an inline day panel with the full appointment list for that day.
 */
export function MonthCalendar({
  year,
  month,
  appointments,
  staff,
}: {
  year: number;
  month: number;
  appointments: CalendarAppointment[];
  staff: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const today = new Date();
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    targetDay: Date | null;
  } | null>(null);
  const dragMoved = useRef(false);

  function onChipPointerDown(
    e: React.PointerEvent<HTMLElement>,
    item: CalendarAppointment,
  ) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragMoved.current = false;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    setDrag({ id: item.id, targetDay: null });

    function handleMove(ev: PointerEvent) {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      if (!dragMoved.current && Math.hypot(dx, dy) < 8) return;
      dragMoved.current = true;
      const grid = gridRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const col = Math.floor(
        ((ev.clientX - rect.left) / rect.width) * 7,
      );
      const rowHeight = rect.height / 6;
      const row = Math.floor((ev.clientY - rect.top) / rowHeight);
      if (col < 0 || col > 6 || row < 0 || row > 5) {
        setDrag((prev) => (prev ? { ...prev, targetDay: null } : prev));
        return;
      }
      const cellIndex = row * 7 + col;
      const targetDay = new Date(grid.dataset.gridStart ?? "");
      targetDay.setDate(targetDay.getDate() + cellIndex);
      setDrag((prev) => (prev ? { ...prev, targetDay } : prev));
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      target.releasePointerCapture(e.pointerId);
      setDrag((prev) => {
        if (!prev || !prev.targetDay || !dragMoved.current) return null;
        commitReschedule(item, prev.targetDay);
        return null;
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function commitReschedule(item: CalendarAppointment, targetDay: Date) {
    const origStart = new Date(item.startAt);
    const origEnd = new Date(item.endAt);
    // Preserve the time-of-day; only shift the date.
    const newStart = new Date(targetDay);
    newStart.setHours(
      origStart.getHours(),
      origStart.getMinutes(),
      origStart.getSeconds(),
      origStart.getMilliseconds(),
    );
    if (newStart.getTime() === origStart.getTime()) return;
    const duration = origEnd.getTime() - origStart.getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("startAt", newStart.toISOString());
    fd.set("endAt", newEnd.toISOString());
    rescheduleAppointmentAction(fd)
      .then(() => router.refresh())
      .catch(() => router.refresh());
  }

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    // Greek/EU convention — week starts Monday.
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - startOffset);

    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [year, month]);

  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarAppointment[]>();
    for (const a of appointments) {
      const d = new Date(a.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = m.get(key) ?? [];
      arr.push(a);
      m.set(key, arr);
    }
    return m;
  }, [appointments]);

  const staffMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of staff) m.set(s.id, s.fullName);
    return m;
  }, [staff]);

  const selectedDate = selectedIso ? new Date(selectedIso) : null;
  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    : null;
  const selectedItems = selectedKey ? (dayMap.get(selectedKey) ?? []) : [];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b-2 border-ink-300 bg-ink-50 text-xs font-black uppercase tracking-widest text-ink-500">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-3 py-3 text-center">
              {d}
            </div>
          ))}
        </div>
        <div
          ref={gridRef}
          className="grid grid-cols-7 select-none"
          data-grid-start={grid[0]?.toISOString()}
        >
          {grid.map((d, idx) => {
            const inMonth = d.getMonth() === month;
            const isToday = isSameDay(d, today);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const items = dayMap.get(key) ?? [];
            const isWeekend = d.getDay() === 6 || d.getDay() === 0;
            const isDropTarget =
              drag?.targetDay &&
              d.getFullYear() === drag.targetDay.getFullYear() &&
              d.getMonth() === drag.targetDay.getMonth() &&
              d.getDate() === drag.targetDay.getDate();

            return (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  if (dragMoved.current) return;
                  setSelectedIso(d.toISOString());
                }}
                className={
                  "group relative flex min-h-[110px] flex-col items-stretch gap-1 border-b border-r border-ink-200 p-2 text-left transition-colors hover:bg-brand-50/40 " +
                  (inMonth ? "" : "bg-ink-50/60 text-ink-400 ") +
                  (isWeekend && inMonth ? "bg-ink-50/40 " : "") +
                  (isDropTarget
                    ? "bg-brand-100 outline outline-2 outline-brand-900 "
                    : "")
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className={
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold " +
                      (isToday
                        ? "bg-brand-900 text-white"
                        : inMonth
                          ? "text-ink-900"
                          : "text-ink-400")
                    }
                  >
                    {d.getDate()}
                  </span>
                  {items.length > 3 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                      +{items.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  {items.slice(0, 3).map((a) => {
                    const c = colorForStaff(a.staffId);
                    const cancelled =
                      a.status === "cancelled" || a.status === "no_show";
                    const isDragging = drag?.id === a.id;
                    return (
                      <span
                        key={a.id}
                        onPointerDown={(e) => onChipPointerDown(e, a)}
                        className={
                          "block cursor-grab touch-none truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 " +
                          c.bg +
                          " " +
                          c.text +
                          " ring-inset ring-black/5 " +
                          (cancelled ? "line-through opacity-60 " : "") +
                          (isDragging ? "opacity-40" : "")
                        }
                        style={{ touchAction: "none" }}
                        title={`${formatTime(a.startAt)} — ${a.serviceName}${
                          a.clientName ? " · " + a.clientName : ""
                        } · Σύρε σε άλλη μέρα για επαναπρογραμματισμό`}
                      >
                        {formatTime(a.startAt)}{" "}
                        {a.clientName ?? a.serviceName}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDate && (
        <DayPanel
          date={selectedDate}
          items={selectedItems}
          staffMap={staffMap}
          onClose={() => setSelectedIso(null)}
        />
      )}
    </>
  );
}

function DayPanel({
  date,
  items,
  staffMap,
  onClose,
}: {
  date: Date;
  items: CalendarAppointment[];
  staffMap: Map<string, string>;
  onClose: () => void;
}) {
  const dateLabel = date.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ραντεβού για ${dateLabel}`}
      className="fixed inset-0 z-[95] flex items-end justify-center overflow-y-auto p-4 sm:items-center"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="fixed inset-0 bg-black/50"
      />
      <Card className="relative w-full max-w-xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-6 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
              Ραντεβού
            </p>
            <p className="mt-1 text-lg font-extrabold text-brand-900">
              {dateLabel}
            </p>
          </div>
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <CardBody className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">
              Δεν υπάρχουν ραντεβού για αυτή την ημέρα.
            </p>
          ) : (
            <ul className="divide-y-2 divide-ink-200">
              {items.map((a) => {
                const c = colorForStaff(a.staffId);
                const cancelled =
                  a.status === "cancelled" || a.status === "no_show";
                return (
                  <li key={a.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={
                          "inline-block h-3 w-3 shrink-0 translate-y-2 rounded-full " +
                          c.dot
                        }
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black uppercase tracking-widest text-ink-500">
                          {formatTime(a.startAt)} — {formatTime(a.endAt)}
                        </p>
                        <p
                          className={
                            "mt-1 text-base font-extrabold text-brand-900 " +
                            (cancelled ? "line-through opacity-70" : "")
                          }
                        >
                          {a.serviceName}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-700">
                          {a.clientName ?? "Χωρίς πελάτη"}
                          {a.staffId
                            ? " · " +
                              (staffMap.get(a.staffId) ??
                                a.staffName ??
                                "Ομάδα")
                            : ""}
                        </p>
                      </div>
                      <Link
                        href={`/app/appointments?q=${encodeURIComponent(a.serviceName)}`}
                        className="text-xs font-bold text-brand-800 underline underline-offset-4 hover:text-brand-900"
                      >
                        Άνοιγμα
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
