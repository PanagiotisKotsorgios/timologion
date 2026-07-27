"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { Card, CardBody } from "@/components/ui/Card";
import { X } from "lucide-react";
import { colorForStaff } from "../staff-color";

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
  const today = new Date();
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

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
        <div className="grid grid-cols-7">
          {grid.map((d, idx) => {
            const inMonth = d.getMonth() === month;
            const isToday = isSameDay(d, today);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const items = dayMap.get(key) ?? [];
            const isWeekend = d.getDay() === 6 || d.getDay() === 0;

            return (
              <button
                type="button"
                key={idx}
                onClick={() => setSelectedIso(d.toISOString())}
                className={
                  "group relative flex min-h-[110px] flex-col items-stretch gap-1 border-b border-r border-ink-200 p-2 text-left transition-colors hover:bg-brand-50/40 " +
                  (inMonth ? "" : "bg-ink-50/60 text-ink-400 ") +
                  (isWeekend && inMonth ? "bg-ink-50/40 " : "")
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
                    return (
                      <span
                        key={a.id}
                        className={
                          "block truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 " +
                          c.bg +
                          " " +
                          c.text +
                          " ring-inset ring-black/5 " +
                          (cancelled ? "line-through opacity-60" : "")
                        }
                        title={`${formatTime(a.startAt)} — ${a.serviceName}${
                          a.clientName ? " · " + a.clientName : ""
                        }`}
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
