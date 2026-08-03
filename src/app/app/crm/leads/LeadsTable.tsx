"use client";

import { useState, type ReactNode } from "react";
import { LeadDetailPopup, type LeadDetail } from "./LeadDetailPopup";

/**
 * Client wrapper around the leads table. Turns each row into a
 * clickable element that opens the LeadDetailPopup with the full
 * record. Clicks on interactive descendants (the status <select>,
 * links, buttons) don't trigger the popup — they keep their own
 * behavior.
 */
export function LeadsTable({
  leads,
  children,
}: {
  leads: LeadDetail[];
  children: (openLead: (l: LeadDetail) => void) => ReactNode;
}) {
  const [active, setActive] = useState<LeadDetail | null>(null);
  return (
    <>
      {children((l) => setActive(l))}
      {active && (
        <LeadDetailPopup lead={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}

/**
 * Row wrapper that fires the popup unless the click happened inside
 * an interactive descendant (status select / anchor / button). Kept
 * separate so the parent Server Component can still render <tr> cells
 * — this component just owns the click handler.
 */
export function LeadRow({
  lead,
  onOpen,
  children,
}: {
  lead: LeadDetail;
  onOpen: (l: LeadDetail) => void;
  children: ReactNode;
}) {
  return (
    <tr
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
        onOpen(lead);
      }}
    >
      {children}
    </tr>
  );
}
