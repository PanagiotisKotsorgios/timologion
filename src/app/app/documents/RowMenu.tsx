"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  MoreVertical,
  Eye,
  Printer,
  Copy,
  FileMinus,
  Trash2,
  Send,
  ExternalLink,
} from "lucide-react";

/**
 * Quick-actions menu for a document row. Opens via ⋮ button OR right-click
 * anywhere on the row. Hides automatically on outside click / Esc / scroll.
 */
export function DocumentRowMenu({
  id,
  status,
  wrappInvoiceUrl,
  onDuplicate,
  onCreditNote,
  onIssue,
  onDelete,
}: {
  id: string;
  status: string;
  wrappInvoiceUrl?: string | null;
  onDuplicate?: () => void;
  onCreditNote?: () => void;
  onIssue?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | globalThis.MouseEvent) {
      if (!menuRef.current || !btnRef.current) return;
      const target = e.target as Node;
      if (!menuRef.current.contains(target) && !btnRef.current.contains(target))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown as never);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown as never);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const isDraft = status === "draft";
  const isIssued = status === "issued";

  function openFromButton(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.right, y: rect.bottom + 6 });
    setOpen(true);
  }

  function openFromContext(e: MouseEvent) {
    e.preventDefault();
    setAnchor({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }

  // Expose the context-menu handler through a data attribute so the parent
  // row can wire onContextMenu={handler} — see index.tsx.
  useEffect(() => {
    if (!btnRef.current) return;
    const tr = btnRef.current.closest("tr");
    if (!tr) return;
    const handler = (e: Event) => openFromContext(e as unknown as MouseEvent);
    tr.addEventListener("contextmenu", handler);
    return () => tr.removeEventListener("contextmenu", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openFromButton}
        aria-label="Ενέργειες"
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-700 hover:bg-ink-100 hover:text-ink-900"
      >
        <MoreVertical size={16} />
      </button>

      {open && anchor && (
        <div
          ref={menuRef}
          role="menu"
          style={{ left: anchor.x, top: anchor.y }}
          className="fixed z-50 w-[220px] -translate-x-full overflow-hidden rounded-xl border-2 border-ink-300 bg-white py-1 shadow-xl"
        >
          <MenuLink href={`/app/documents/${id}`} icon={Eye}>
            Άνοιγμα
          </MenuLink>
          <MenuLink href={`/app/documents/${id}/print`} icon={Printer}>
            Εκτύπωση
          </MenuLink>
          {isDraft && onIssue && (
            <MenuButton
              icon={Send}
              onClick={() => {
                setOpen(false);
                onIssue();
              }}
            >
              Επίσημη έκδοση
            </MenuButton>
          )}
          {onDuplicate && (
            <MenuButton
              icon={Copy}
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
            >
              Αντιγραφή σε πρόχειρο
            </MenuButton>
          )}
          {isIssued && onCreditNote && (
            <MenuButton
              icon={FileMinus}
              onClick={() => {
                setOpen(false);
                onCreditNote();
              }}
            >
              Έκδοση πιστωτικού
            </MenuButton>
          )}
          {wrappInvoiceUrl && (
            <MenuLink href={wrappInvoiceUrl} external icon={ExternalLink}>
              Δημόσιος σύνδεσμος
            </MenuLink>
          )}
          {isDraft && onDelete && (
            <>
              <div className="my-1 border-t border-ink-300/60" />
              <MenuButton
                icon={Trash2}
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                danger
              >
                Διαγραφή πρόχειρου
              </MenuButton>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  external,
}: {
  href: string;
  icon: typeof Eye;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external)
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100"
      >
        <Icon size={15} aria-hidden />
        {children}
      </a>
    );
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100"
    >
      <Icon size={15} aria-hidden />
      {children}
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  onClick,
  children,
  danger,
}: {
  icon: typeof Eye;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-ink-100 " +
        (danger ? "text-red-700 hover:bg-red-50" : "text-ink-900")
      }
    >
      <Icon size={15} aria-hidden />
      {children}
    </button>
  );
}
