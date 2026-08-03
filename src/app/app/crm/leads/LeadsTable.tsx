"use client";

import { useState } from "react";
import { date } from "@/lib/format";
import { LeadStatusSelect } from "../LeadStatusSelect";
import { LeadDetailPopup, type LeadDetail } from "./LeadDetailPopup";

const STATUS_LABEL: Record<string, string> = {
  new: "Νέος",
  contacted: "Επαφή",
  qualified: "Κατάλληλος",
  disqualified: "Απορρίφθηκε",
  converted: "Πελάτης",
};

const STATUS_TONE: Record<
  string,
  "brand" | "success" | "muted" | "warning" | "neutral"
> = {
  new: "brand",
  contacted: "warning",
  qualified: "success",
  disqualified: "muted",
  converted: "success",
};

/**
 * Full leads table, rendered client-side so row clicks can open the
 * detail popup. We used to accept a `children` render-function from
 * the Server Component parent, but React Server Components can't
 * serialize function props — hence the 500. Now the table owns its
 * own row markup and the parent just passes plain data.
 */
export function LeadsTable({ leads }: { leads: LeadDetail[] }) {
  const [active, setActive] = useState<LeadDetail | null>(null);

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Ονοματεπώνυμο</th>
            <th>Εταιρεία</th>
            <th>Επικοινωνία</th>
            <th>Πηγή</th>
            <th>Κατάσταση</th>
            <th>Ημ/νία</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr
              key={l.id}
              className="cursor-pointer transition-colors hover:bg-brand-50/60"
              onClick={(e) => {
                const target = e.target as HTMLElement | null;
                if (
                  target?.closest(
                    'a, button, input, select, textarea, [role="menu"], [role="button"], [role="menuitem"]',
                  )
                ) {
                  return;
                }
                setActive(l);
              }}
            >
              <td>
                <p className="font-semibold text-brand-900">{l.fullName}</p>
                {l.notes && (
                  <p className="text-xs text-ink-500 line-clamp-1">
                    {l.notes}
                  </p>
                )}
              </td>
              <td>{l.company ?? "—"}</td>
              <td className="text-sm">
                {l.email && <div>{l.email}</div>}
                {l.phone && <div>{l.phone}</div>}
                {!l.email && !l.phone && "—"}
              </td>
              <td>{l.source ?? "—"}</td>
              <td>
                <LeadStatusSelect
                  id={l.id}
                  current={l.status}
                  label={STATUS_LABEL[l.status] ?? l.status}
                  tone={STATUS_TONE[l.status] ?? "neutral"}
                />
              </td>
              <td className="mono text-xs">{date(new Date(l.createdAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {active && (
        <LeadDetailPopup lead={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}
