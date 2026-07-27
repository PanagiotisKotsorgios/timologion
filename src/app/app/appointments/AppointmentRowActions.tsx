"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Check,
  X as XIcon,
  FileText,
  Trash2,
  Edit3,
  UserX,
  Copy,
} from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import {
  updateAppointmentStatusAction,
  deleteAppointmentAction,
  convertAppointmentToDocumentAction,
  duplicateAppointmentAction,
} from "./actions";
import {
  NewAppointmentButton,
} from "./NewAppointmentButton";
import type { AppointmentInitial } from "./AppointmentForm";

type StaffOpt = { id: string; fullName: string };
type ClientOpt = { id: string; label: string };
type ItemOpt = {
  id: string;
  name: string;
  unit: string;
  defaultPrice: string;
  vatRate: string;
};

/**
 * Row-level menu — edit / status transitions / convert-to-invoice /
 * delete. Portal-free popover; positioned relative to the cell so it
 * moves with the row on window resize.
 */
export function AppointmentRowActions({
  appointment,
  staff,
  clients,
  items,
}: {
  appointment: {
    id: string;
    status: AppointmentStatus;
    convertedDocumentId: string | null;
    initial: AppointmentInitial;
  };
  staff: StaffOpt[];
  clients: ClientOpt[];
  items: ItemOpt[];
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pending, startTx] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function fireStatus(status: AppointmentStatus) {
    const fd = new FormData();
    fd.set("id", appointment.id);
    fd.set("status", status);
    startTx(async () => {
      await updateAppointmentStatusAction(fd);
      setOpen(false);
      router.refresh();
    });
  }

  function fireDelete() {
    if (!confirm("Διαγραφή του ραντεβού; Δεν αναιρείται.")) return;
    const fd = new FormData();
    fd.set("id", appointment.id);
    startTx(async () => {
      await deleteAppointmentAction(fd);
      setOpen(false);
      router.refresh();
    });
  }

  function fireConvert() {
    const fd = new FormData();
    fd.set("id", appointment.id);
    startTx(async () => {
      await convertAppointmentToDocumentAction(fd);
    });
  }

  function fireDuplicate(days: number) {
    const fd = new FormData();
    fd.set("id", appointment.id);
    fd.set("days", String(days));
    startTx(async () => {
      await duplicateAppointmentAction(fd);
      setOpen(false);
      router.refresh();
    });
  }

  const alreadyConverted = Boolean(appointment.convertedDocumentId);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label="Ενέργειες"
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border-2 border-ink-300 bg-white shadow-lg">
          <div className="border-b-2 border-ink-200 p-1.5">
            <NewAppointmentButton
              staff={staff}
              clients={clients}
              items={items}
              mode="edit"
              initial={appointment.initial}
              label="Επεξεργασία"
              small
            />
          </div>
          <div className="p-1.5">
            <MenuItem
              icon={FileText}
              disabled={pending || alreadyConverted}
              onClick={fireConvert}
            >
              {alreadyConverted
                ? "Έχει μετατραπεί σε παραστατικό"
                : "Έκδοση σε παραστατικό"}
            </MenuItem>
            <MenuItem
              icon={Check}
              disabled={pending || appointment.status === "completed"}
              onClick={() => fireStatus("completed")}
            >
              Σήμανση ολοκληρωμένου
            </MenuItem>
            <MenuItem
              icon={UserX}
              disabled={pending || appointment.status === "no_show"}
              onClick={() => fireStatus("no_show")}
            >
              No-show
            </MenuItem>
            <MenuItem
              icon={XIcon}
              disabled={pending || appointment.status === "cancelled"}
              onClick={() => fireStatus("cancelled")}
            >
              Ακύρωση
            </MenuItem>
          </div>
          <div className="border-t-2 border-ink-200 p-1.5">
            <MenuItem
              icon={Copy}
              disabled={pending}
              onClick={() => fireDuplicate(1)}
            >
              Αντιγραφή +1 μέρα
            </MenuItem>
            <MenuItem
              icon={Copy}
              disabled={pending}
              onClick={() => fireDuplicate(7)}
            >
              Αντιγραφή +1 εβδομάδα
            </MenuItem>
            <MenuItem
              icon={Copy}
              disabled={pending}
              onClick={() => fireDuplicate(30)}
            >
              Αντιγραφή +1 μήνα
            </MenuItem>
          </div>
          <div className="border-t-2 border-ink-200 p-1.5">
            <MenuItem icon={Trash2} onClick={fireDelete} danger disabled={pending}>
              Διαγραφή
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Edit3;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (danger
          ? "text-red-700 hover:bg-red-50"
          : "text-ink-900 hover:bg-brand-50")
      }
    >
      <Icon size={14} aria-hidden />
      <span>{children}</span>
    </button>
  );
}
