"use client";

import { updateTicketAction } from "./actions";

/**
 * Three tiny inline forms, one per attribute. Every change auto-submits
 * on select-change so the admin doesn't have to hunt for a save button.
 */
export function TicketControls({
  ticketId,
  currentStatus,
  currentPriority,
  currentAssignee,
  currentCategory,
  admins,
  selfId,
}: {
  ticketId: string;
  currentStatus: string;
  currentPriority: number;
  currentAssignee: string | null;
  currentCategory: string;
  admins: { id: string; label: string }[];
  selfId: string;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <Row label="Κατάσταση">
        <form action={updateTicketAction}>
          <input type="hidden" name="ticketId" value={ticketId} />
          <select
            name="status"
            defaultValue={currentStatus}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-full rounded-md border-2 border-ink-300 bg-white px-2 py-1 text-xs"
          >
            <option value="open">open</option>
            <option value="waiting_support">waiting_support</option>
            <option value="waiting_customer">waiting_customer</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
        </form>
      </Row>
      <Row label="Priority">
        <form action={updateTicketAction}>
          <input type="hidden" name="ticketId" value={ticketId} />
          <select
            name="priority"
            defaultValue={String(currentPriority)}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-full rounded-md border-2 border-ink-300 bg-white px-2 py-1 text-xs"
          >
            <option value="1">1 · URGENT</option>
            <option value="2">2 · HIGH</option>
            <option value="3">3 · NORMAL</option>
            <option value="4">4 · LOW</option>
            <option value="5">5 · LOWEST</option>
          </select>
        </form>
      </Row>
      <Row label="Ανάθεση">
        <form action={updateTicketAction}>
          <input type="hidden" name="ticketId" value={ticketId} />
          <select
            name="assignedToId"
            defaultValue={currentAssignee ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-full rounded-md border-2 border-ink-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">Χωρίς owner</option>
            <option value={selfId}>Ανάθεση σε εμένα</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </form>
      </Row>
      <Row label="Κατηγορία">
        <form action={updateTicketAction}>
          <input type="hidden" name="ticketId" value={ticketId} />
          <select
            name="category"
            defaultValue={currentCategory}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-full rounded-md border-2 border-ink-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">—</option>
            <option value="billing">billing</option>
            <option value="bug">bug</option>
            <option value="feature">feature</option>
            <option value="wrapp">wrapp</option>
            <option value="general">general</option>
          </select>
        </form>
      </Row>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
