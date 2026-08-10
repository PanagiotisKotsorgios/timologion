"use client";

import { useEffect, useMemo, useState } from "react";
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
  Trash2,
  Webhook,
  AlertOctagon,
  HardDrive,
  Activity,
  ToggleLeft,
  TrendingUp,
  Brush,
  Send,
  Timer,
  Wrench,
  MailPlus,
  Gauge,
  LifeBuoy,
  FileBarChart,
  BookOpen,
  GitMerge,
  FlaskConical,
  Sprout,
  Bell,
  ChevronDown,
  Home,
  Building2,
  Radio,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

// Pinned to the top, never collapsed — the one thing every admin visits
// on every session. Everything else lives inside a group.
const PINNED: NavItem = {
  href: "/admin",
  label: "Επισκόπηση",
  icon: LayoutDashboard,
};

// Logical groupings. Order = importance-descending. Group icon is the
// affordance the admin scans first when the sidebar is collapsed; the
// label is a short 1-2 word Greek noun for skimmability.
const GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Παρακολούθηση",
    icon: Home,
    items: [
      { href: "/admin/health", label: "Υγεία συστήματος", icon: Activity },
      { href: "/admin/metrics", label: "Δείκτες / MRR", icon: TrendingUp },
      { href: "/admin/search", label: "Καθολική αναζήτηση", icon: Search },
    ],
  },
  {
    id: "tenants",
    label: "Τένταντες & χρήστες",
    icon: Building2,
    items: [
      { href: "/admin/businesses", label: "Επιχειρήσεις", icon: Briefcase },
      { href: "/admin/users", label: "Χρήστες", icon: Users },
      { href: "/admin/documents", label: "Παραστατικά", icon: FileText },
      { href: "/admin/merge", label: "Merge duplicates", icon: GitMerge },
      { href: "/admin/deletions", label: "Διαγραφές λογαριασμών", icon: Trash2 },
    ],
  },
  {
    id: "billing",
    label: "Οικονομικά",
    icon: CreditCard,
    items: [
      { href: "/admin/billing", label: "Χρέωση & έσοδα", icon: CreditCard },
      { href: "/admin/plans", label: "Πακέτα", icon: Package },
      { href: "/admin/economics", label: "Οικονομικά", icon: LineChart },
    ],
  },
  {
    id: "ops",
    label: "Λειτουργίες",
    icon: Wrench,
    items: [
      { href: "/admin/ops", label: "Operations", icon: Wrench },
      { href: "/admin/tickets", label: "Support tickets", icon: LifeBuoy },
      { href: "/admin/reports", label: "Αναφορές XLSX", icon: FileBarChart },
      { href: "/admin/cron", label: "Cron runs", icon: Timer },
      { href: "/admin/integrity", label: "Ακεραιότητα δεδομένων", icon: Brush },
      { href: "/admin/backups", label: "Backups βάσης", icon: HardDrive },
    ],
  },
  {
    id: "alerts",
    label: "Alerts & logs",
    icon: AlertOctagon,
    items: [
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/errors", label: "Σφάλματα εφαρμογής", icon: AlertOctagon },
      { href: "/admin/alerts", label: "Alert rules", icon: Bell },
    ],
  },
  {
    id: "comms",
    label: "Επικοινωνία",
    icon: Radio,
    items: [
      { href: "/admin/announcements", label: "Ανακοινώσεις", icon: Megaphone },
      { href: "/admin/broadcasts", label: "Broadcast email", icon: Send },
      { href: "/admin/email-templates", label: "Πρότυπα email", icon: MailPlus },
      { href: "/admin/email", label: "Ρυθμίσεις email", icon: Mail },
    ],
  },
  {
    id: "integrations",
    label: "Ενσωμάτωση",
    icon: Plug,
    items: [
      { href: "/admin/wrapp", label: "Ρυθμίσεις Wrapp", icon: Zap },
      { href: "/admin/webhooks", label: "Webhooks Wrapp", icon: Webhook },
    ],
  },
  {
    id: "rollout",
    label: "Rollout & δοκιμές",
    icon: FlaskConical,
    items: [
      { href: "/admin/feature-flags", label: "Feature flags", icon: ToggleLeft },
      { href: "/admin/experiments", label: "A/B experiments", icon: FlaskConical },
      { href: "/admin/seeder", label: "Test data seeder", icon: Sprout },
    ],
  },
  {
    id: "system",
    label: "Σύστημα & ασφάλεια",
    icon: ShieldCheck,
    items: [
      {
        href: "/admin/system-settings",
        label: "Ρυθμίσεις πλατφόρμας",
        icon: Settings2,
      },
      { href: "/admin/rate-limits", label: "Rate limits", icon: Gauge },
      { href: "/admin/admins", label: "Platform admins", icon: Shield },
      { href: "/admin/docs", label: "Runbook & Onboarding", icon: BookOpen },
    ],
  },
];

const OPEN_GROUPS_STORAGE_KEY = "timologion.admin.openGroups";

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

  // Which link is currently active — resolved by longest-prefix match so
  // /admin/businesses/xyz picks the "Επιχειρήσεις" row, not the /admin
  // pinned root.
  const activeHref = useMemo(() => {
    const allHrefs = [
      PINNED.href,
      ...GROUPS.flatMap((g) => g.items.map((i) => i.href)),
    ];
    return (
      allHrefs
        .filter(
          (h) =>
            pathname === h || (h !== "/admin" && pathname.startsWith(h + "/")),
        )
        .sort((a, b) => b.length - a.length)[0] ?? null
    );
  }, [pathname]);

  // Which group contains the active route — always kept open so the user
  // can see the sibling links of whatever page they landed on.
  const activeGroupId = useMemo(() => {
    if (!activeHref) return null;
    return (
      GROUPS.find((g) => g.items.some((i) => i.href === activeHref))?.id ?? null
    );
  }, [activeHref]);

  // Persisted open state — remembers what the admin had expanded across
  // sessions. Read once on mount, written on every toggle. If no state is
  // saved yet, start with only the active group open.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OPEN_GROUPS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setOpenGroups(new Set(parsed));
          setHydrated(true);
          return;
        }
      }
    } catch {
      /* localStorage unavailable — fall through to defaults */
    }
    setOpenGroups(new Set(activeGroupId ? [activeGroupId] : []));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open the group containing the active route on every navigation,
  // without collapsing anything the user had explicitly opened.
  useEffect(() => {
    if (!hydrated || !activeGroupId) return;
    setOpenGroups((prev) => {
      if (prev.has(activeGroupId)) return prev;
      const next = new Set(prev);
      next.add(activeGroupId);
      return next;
    });
  }, [activeGroupId, hydrated]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(
          OPEN_GROUPS_STORAGE_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        /* localStorage unavailable — in-memory update still applies */
      }
      return next;
    });
  }

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

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {/* Pinned dashboard link — never inside a collapsible group. */}
          <ul className="space-y-1">
            <NavLink
              item={PINNED}
              active={PINNED.href === activeHref}
              indent={false}
            />
          </ul>

          <p className="mt-6 mb-2 px-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
            Platform
          </p>

          <ul className="space-y-1">
            {GROUPS.map((group) => {
              const isOpen = openGroups.has(group.id);
              const groupHasActive = group.items.some(
                (i) => i.href === activeHref,
              );
              return (
                <li key={group.id}>
                  <GroupHeader
                    group={group}
                    open={isOpen}
                    hasActive={groupHasActive}
                    onToggle={() => toggleGroup(group.id)}
                  />
                  {isOpen && (
                    <ul className="mt-1 space-y-1 border-l border-white/10 pl-3">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.href}
                          item={item}
                          active={item.href === activeHref}
                          indent
                        />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-white/50">
          © {new Date().getFullYear()} timologion — Platform Admin
        </div>
      </aside>
    </>
  );
}

function GroupHeader({
  group,
  open,
  hasActive,
  onToggle,
}: {
  group: NavGroup;
  open: boolean;
  /** True when one of the group's items is the current route. */
  hasActive: boolean;
  onToggle: () => void;
}) {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={clsx(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-bold transition-colors",
        hasActive
          ? "text-white"
          : "text-white/80 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon
        size={18}
        strokeWidth={2}
        className={clsx(
          "shrink-0",
          hasActive ? "text-emerald-300" : "text-white/60",
        )}
        aria-hidden
      />
      <span className="flex-1 truncate">{group.label}</span>
      {hasActive && !open && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
        />
      )}
      <ChevronDown
        size={16}
        strokeWidth={2.5}
        className={clsx(
          "shrink-0 text-white/50 transition-transform duration-150",
          open && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

function NavLink({
  item,
  active,
  indent,
}: {
  item: NavItem;
  active: boolean;
  /** True when rendered inside an open group (adds smaller padding). */
  indent: boolean;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={clsx(
          "flex items-center gap-3 rounded-xl transition-colors",
          indent
            ? "px-3 py-2 text-[14px] font-medium"
            : "px-4 py-3 text-[16px] font-semibold",
          active
            ? "bg-white text-brand-900 shadow-card"
            : "text-white/85 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon
          size={indent ? 16 : 20}
          strokeWidth={2}
          className={clsx(
            "shrink-0",
            active ? "text-brand-800" : "text-white/60",
          )}
          aria-hidden
        />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}
