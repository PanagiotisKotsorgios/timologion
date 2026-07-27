import Link from "next/link";
import {
  ShoppingCart,
  Users2,
  FileSpreadsheet,
  CalendarClock,
  Sparkles,
  Check,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

type Plugin = {
  href: string;
  icon: LucideIcon;
  name: string;
  tagline: string;
  price: string;
  perks: string[];
  status: "included" | "available" | "coming_soon";
};

/**
 * Πρόσθετα — specialist modules that live off the main sidebar. Keeps the
 * default dashboard uncluttered for freelancers who only issue invoices,
 * while letting anyone who needs POS/CRM/accountant tooling turn it on with
 * a single click.
 *
 * Prices here are presentation-only for now; real gating will hook into the
 * PlatformPlan tiers already seeded via first-boot.
 */
const PLUGINS: Plugin[] = [
  {
    href: "/app/pos",
    icon: ShoppingCart,
    name: "POS & Ταμείο",
    tagline: "Γρήγορη πώληση, τραπέζια, θερμική εκτύπωση 80mm.",
    price: "9,90€ / μήνα",
    perks: [
      "Γρήγορη πώληση σε 1 κλικ",
      "Ανοιχτά τραπέζια & catering flow",
      "Θερμική εκτύπωση αποδείξεων",
    ],
    status: "available",
  },
  {
    href: "/app/crm",
    icon: Users2,
    name: "CRM",
    tagline: "Leads, ευκαιρίες με 5 στάδια pipeline, tasks με υπενθυμίσεις.",
    price: "7,90€ / μήνα",
    perks: [
      "Leads & pipeline ευκαιριών",
      "Εργασίες με ημερομηνία λήξης",
      "Ιστορικό επικοινωνίας ανά πελάτη",
    ],
    status: "available",
  },
  {
    href: "/app/reports",
    icon: FileSpreadsheet,
    name: "Αναφορές λογιστή",
    tagline: "Έσοδα, ΦΠΑ, ανεξόφλητα, εξαγωγή σε Excel/CSV.",
    price: "5,90€ / μήνα",
    perks: [
      "Μηνιαία σύνοψη εσόδων & ΦΠΑ",
      "Ανοικτά υπόλοιπα πελατών",
      "Εξαγωγές για τον λογιστή σου",
    ],
    status: "available",
  },
  {
    href: "#",
    icon: CalendarClock,
    name: "Ραντεβού & ημερολόγιο",
    tagline: "Κράτηση χρόνου, υπενθυμίσεις πελάτη — έρχεται.",
    price: "Έρχεται σύντομα",
    perks: [
      "Ημερολόγιο πολλαπλών χρηστών",
      "Υπηρεσίες συνδεδεμένες με τιμοκατάλογο",
      "Μετατροπή ραντεβού σε παραστατικό",
    ],
    status: "coming_soon",
  },
  {
    href: "#",
    icon: Sparkles,
    name: "AI βοηθός",
    tagline: "Έκδοση παραστατικού με φυσική γλώσσα.",
    price: "Έρχεται σύντομα",
    perks: [
      "«Εκδώσε τιμολόγιο 100€ στον Παπαδόπουλο»",
      "Αυτόματη κατηγοριοποίηση",
      "Έξυπνες προτάσεις τιμών",
    ],
    status: "coming_soon",
  },
];

export const dynamic = "force-dynamic";

export default function PluginsPage() {
  return (
    <>
      <PageHeader
        title="Πρόσθετα"
        subtitle="Ενεργοποίησε επιπλέον λειτουργίες όποτε τις χρειαστείς. Ο πίνακας ελέγχου παραμένει καθαρός."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLUGINS.map((p) => (
          <PluginCard key={p.name} plugin={p} />
        ))}
      </div>
    </>
  );
}

function PluginCard({ plugin }: { plugin: Plugin }) {
  const Icon = plugin.icon;
  const disabled = plugin.status === "coming_soon";
  return (
    <Card
      className={
        "flex h-full flex-col overflow-hidden transition-shadow hover:shadow-soft " +
        (disabled ? "opacity-70" : "")
      }
    >
      <div className="flex items-start justify-between px-6 pt-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-800">
          <Icon size={22} aria-hidden />
        </div>
        <StatusPill status={plugin.status} />
      </div>
      <CardBody className="flex flex-1 flex-col">
        <h3 className="text-xl font-extrabold text-brand-900">{plugin.name}</h3>
        <p className="mt-2 text-sm text-ink-700">{plugin.tagline}</p>

        <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-900">
          {plugin.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check
                size={16}
                strokeWidth={2.5}
                className="mt-0.5 shrink-0 text-emerald-600"
                aria-hidden
              />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-lg font-extrabold text-brand-900">{plugin.price}</p>
          {disabled ? (
            <span className="text-sm font-semibold text-ink-500">—</span>
          ) : (
            <Link
              href={plugin.href}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:bg-black"
            >
              {plugin.status === "included" ? "Άνοιγμα" : "Ενεργοποίηση"}
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function StatusPill({ status }: { status: Plugin["status"] }) {
  if (status === "included") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-900">
        Περιλαμβάνεται
      </span>
    );
  }
  if (status === "coming_soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-200 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-ink-700">
        Έρχεται
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-brand-900">
      Πρόσθετο
    </span>
  );
}
