"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Repeat,
  Wallet,
  FileSpreadsheet,
  UtensilsCrossed,
  Users2,
  Users,
  Package,
  Building2,
  MapPin,
  Hash,
  Send,
  KeyRound,
  CreditCard,
  UserCog,
  UserCircle,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { t } from "@/lib/i18n";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const primary: NavItem[] = [
  { href: "/app", label: t.nav.dashboard, icon: LayoutDashboard },
  { href: "/app/documents", label: t.nav.documents, icon: FileText },
  { href: "/app/documents/statistics", label: "Στατιστικά", icon: BarChart3 },
  { href: "/app/documents/repeating", label: "Επαναλαμβανόμενα", icon: Repeat },
  { href: "/app/clients", label: t.nav.clients, icon: Users },
  { href: "/app/items", label: t.nav.items, icon: Package },
  { href: "/app/payments", label: "Πληρωμές", icon: Wallet },
  { href: "/app/pos", label: "POS", icon: UtensilsCrossed },
  { href: "/app/crm", label: "CRM", icon: Users2 },
  { href: "/app/reports", label: "Αναφορές λογιστή", icon: FileSpreadsheet },
];

const secondary: NavItem[] = [
  { href: "/app/settings/account", label: "Ο λογαριασμός μου", icon: UserCircle },
  { href: "/app/settings/business", label: t.nav.business, icon: Building2 },
  { href: "/app/settings/subscription", label: "Συνδρομή", icon: CreditCard },
  { href: "/app/settings/branches", label: "Υποκαταστήματα", icon: MapPin },
  { href: "/app/settings/billing-books", label: "Σειρές παραστατικών", icon: Hash },
  { href: "/app/settings/wrapp", label: "Ηλεκτρονική έκδοση", icon: Send },
  { href: "/app/settings/aade", label: "ΓΓΠΣ / Αναζήτηση ΑΦΜ", icon: KeyRound },
  { href: "/app/settings/users", label: t.nav.users, icon: UserCog },
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
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <Link
            href="/app"
            aria-label="timologion"
            className="inline-flex rounded-2xl bg-white p-3"
          >
            <Logo size="md" />
          </Link>
          <button
            type="button"
            aria-label="Κλείσιμο μενού"
            onClick={() => setMobileOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Πλατφόρμα
          </p>
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
            Ρυθμίσεις
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
