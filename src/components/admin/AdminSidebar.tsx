"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  LineChart,
  Briefcase,
  Users,
  FileText,
  ScrollText,
  Shield,
  Megaphone,
  Search,
  Settings2,
  Menu,
  X,
  CreditCard,
  Package,
  Mail,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

type NavItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY: NavItem[] = [
  { href: "/admin", label: "Επισκόπηση", icon: LayoutDashboard },
  { href: "/admin/billing", label: "Χρέωση & έσοδα", icon: CreditCard },
  { href: "/admin/plans", label: "Πακέτα", icon: Package },
  { href: "/admin/economics", label: "Οικονομικά", icon: LineChart },
  { href: "/admin/search", label: "Καθολική αναζήτηση", icon: Search },
  { href: "/admin/businesses", label: "Επιχειρήσεις", icon: Briefcase },
  { href: "/admin/users", label: "Χρήστες", icon: Users },
  { href: "/admin/documents", label: "Παραστατικά", icon: FileText },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

const SECONDARY: NavItem[] = [
  { href: "/admin/announcements", label: "Ανακοινώσεις", icon: Megaphone },
  { href: "/admin/email", label: "Ρυθμίσεις email", icon: Mail },
  { href: "/admin/wrapp", label: "Ρυθμίσεις Wrapp", icon: Zap },
  { href: "/admin/system-settings", label: "Ρυθμίσεις πλατφόρμας", icon: Settings2 },
  { href: "/admin/admins", label: "Platform admins", icon: Shield },
];

/** Hamburger for admin topbar on mobile. */
export function AdminSidebarTrigger() {
  return (
    <button
      type="button"
      aria-label="Άνοιγμα μενού"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("admin:open-sidebar"))
      }
      className="grid h-12 w-12 place-items-center rounded-lg border-2 border-ink-300 bg-white text-ink-900 md:hidden"
    >
      <Menu size={20} />
    </button>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allHrefs = [...PRIMARY, ...SECONDARY].map((n) => n.href);
  const activeHref =
    allHrefs
      .filter(
        (h) =>
          pathname === h ||
          (h !== "/admin" && pathname.startsWith(h + "/")),
      )
      .sort((a, b) => b.length - a.length)[0] ?? null;

  useEffect(() => {
    function open() {
      setMobileOpen(true);
    }
    window.addEventListener("admin:open-sidebar", open);
    return () => window.removeEventListener("admin:open-sidebar", open);
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
            href="/admin"
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
            Platform
          </p>
          <ul className="space-y-1.5">
            {PRIMARY.map((item) => (
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
            {SECONDARY.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
              />
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-white/50">
          © {new Date().getFullYear()} timologion — Platform Admin
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
