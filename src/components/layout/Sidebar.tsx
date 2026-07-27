"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Wallet,
  Receipt,
  Puzzle,
  Settings,
  UserCircle,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Sidebar deliberately kept short — noob users get overwhelmed by long
 * left-rail menus. Specialist modules (POS, CRM, accountant reports,
 * statistics, recurring documents) live behind the "Πρόσθετα" gateway page
 * so the sidebar stays predictable regardless of package. Business config
 * (branches, series, provider, users, VAT search) is grouped under a single
 * "Ρυθμίσεις" hub instead of being spread across eight sidebar rows.
 */
const primary: NavItem[] = [
  { href: "/app", label: t.nav.dashboard, icon: LayoutDashboard },
  { href: "/app/documents", label: t.nav.documents, icon: FileText },
  { href: "/app/clients", label: t.nav.clients, icon: Users },
  { href: "/app/items", label: t.nav.items, icon: Package },
  { href: "/app/payments", label: "Πληρωμές", icon: Wallet },
  { href: "/app/expenses", label: "Έξοδα", icon: Receipt },
  { href: "/app/plugins", label: "Πρόσθετα", icon: Puzzle },
];

const secondary: NavItem[] = [
  { href: "/app/settings/account", label: "Ο λογαριασμός μου", icon: UserCircle },
  { href: "/app/settings", label: t.nav.settings, icon: Settings },
];

/** Hamburger rendered inside the topbar on mobile. */
export function SidebarTrigger() {
  return (
    <button
      type="button"
      aria-label="Άνοιγμα μενού"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("app:open-sidebar"))
      }
      className="grid h-12 w-12 place-items-center rounded-lg border-2 border-ink-300 bg-white text-ink-900 md:hidden"
    >
      <Menu size={20} />
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allHrefs = [...primary, ...secondary].map((n) => n.href);
  const activeHref =
    allHrefs
      .filter(
        (h) => pathname === h || (h !== "/app" && pathname.startsWith(h + "/")),
      )
      .sort((a, b) => b.length - a.length)[0] ?? null;

  useEffect(() => {
    function open() {
      setMobileOpen(true);
    }
    window.addEventListener("app:open-sidebar", open);
    return () => window.removeEventListener("app:open-sidebar", open);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden
        />
      )}

      <aside
        className={clsx(
          "flex w-72 shrink-0 flex-col bg-brand-900 text-white",
          "fixed inset-y-0 left-0 z-50 transition-transform",
          "md:sticky md:top-0 md:h-screen md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5 pr-3 md:pr-6">
          <Link
            href="/app"
            aria-label="timologion"
            className="inline-flex items-center"
          >
            {/* Sidebar-specific mark — do not reuse elsewhere. */}
            <Image
              src="/sidebar-logo.png"
              alt="timologion"
              width={260}
              height={80}
              priority
              className="h-20 w-auto rounded-xl"
            />
          </Link>
          <button
            type="button"
            aria-label="Κλείσιμο μενού"
            onClick={() => setMobileOpen(false)}
            className="ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-1.5">
            {primary.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
              />
            ))}
          </ul>

          <p className="mt-8 mb-3 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Λογαριασμός
          </p>
          <ul className="space-y-1.5">
            {secondary.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
              />
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-white/50">
          © {new Date().getFullYear()} timologion
        </div>
      </aside>
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={clsx(
          "flex items-center gap-3 rounded-xl px-4 py-3 text-[16px] font-semibold transition-colors",
          active
            ? "bg-white text-brand-900 shadow-card"
            : "text-white/90 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon
          size={20}
          strokeWidth={2}
          className={active ? "text-brand-800" : "text-white/70"}
          aria-hidden
        />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
