import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
  Users,
  Check,
  X,
  Infinity as InfinityIcon,
  FileText,
  UserRound,
  Search,
  Receipt,
  Repeat,
  ShoppingCart,
  Megaphone,
  CalendarClock,
  Sparkles,
  Headphones,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { PricingSwitcher } from "./PricingSwitcher";

export const metadata: Metadata = {
  title: "Κόστος · timologion",
  description:
    "Απλά, διάφανα πακέτα για ελεύθερους επαγγελματίες και μικρές επιχειρήσεις.",
};

const REASSURANCES = [
  { icon: CheckCircle2, text: "Χωρίς κάρτα για εγγραφή" },
  { icon: Zap, text: "Ενεργοποίηση σε λεπτά" },
  { icon: ShieldCheck, text: "GDPR & Argon2id ασφάλεια" },
  { icon: Users, text: "Ακύρωση οποιαδήποτε στιγμή" },
];

type CellValue = boolean | string | "infinity";

const COMPARE_GROUPS: {
  title: string;
  icon: LucideIcon;
  rows: {
    icon: LucideIcon;
    label: string;
    tooltip?: string;
    starter: CellValue;
    business: CellValue;
    advanced: CellValue;
  }[];
}[] = [
  {
    title: "Βασικές λειτουργίες",
    icon: FileText,
    rows: [
      {
        icon: FileText,
        label: "Παραστατικά ανά μήνα",
        starter: "25",
        business: "150",
        advanced: "infinity",
      },
      {
        icon: UserRound,
        label: "Χρήστες με πρόσβαση",
        starter: "1",
        business: "5",
        advanced: "infinity",
      },
      {
        icon: Search,
        label: "Πελατολόγιο με αναζήτηση ΑΦΜ",
        tooltip: "Αυτόματη συμπλήρωση από ΓΓΠΣ",
        starter: true,
        business: true,
        advanced: true,
      },
    ],
  },
  {
    title: "Οικονομικά & αγορές",
    icon: Receipt,
    rows: [
      {
        icon: Receipt,
        label: "Έξοδα & προμηθευτές",
        starter: false,
        business: true,
        advanced: true,
      },
      {
        icon: Repeat,
        label: "Επαναλαμβανόμενα παραστατικά",
        starter: false,
        business: true,
        advanced: true,
      },
    ],
  },
  {
    title: "POS & CRM",
    icon: ShoppingCart,
    rows: [
      {
        icon: ShoppingCart,
        label: "POS & Ταμείο",
        starter: false,
        business: false,
        advanced: true,
      },
      {
        icon: Megaphone,
        label: "CRM & Καμπάνιες",
        starter: false,
        business: false,
        advanced: true,
      },
      {
        icon: CalendarClock,
        label: "Ραντεβού & ημερολόγιο",
        starter: false,
        business: false,
        advanced: true,
      },
      {
        icon: Sparkles,
        label: "AI βοηθός",
        starter: false,
        business: false,
        advanced: true,
      },
    ],
  },
  {
    title: "Υποστήριξη",
    icon: Headphones,
    rows: [
      {
        icon: Headphones,
        label: "Επίπεδο υποστήριξης",
        starter: "Email",
        business: "Email + chat",
        advanced: "Dedicated",
      },
    ],
  },
];

const FAQ = [
  {
    q: "Χρειάζομαι κάρτα για να ξεκινήσω;",
    a: "Όχι. Η δοκιμαστική περίοδος είναι δωρεάν 14 ημέρες, χωρίς να δώσεις στοιχεία πληρωμής.",
  },
  {
    q: "Πόσο κερδίζω με ετήσια χρέωση;",
    a: "Στην ετήσια χρέωση κερδίζεις έως 25% σε σχέση με τη μηνιαία, και κλειδώνεις την τιμή για όλο το έτος.",
  },
  {
    q: "Μπορώ να αλλάξω πακέτο αργότερα;",
    a: "Ναι, αναβάθμιση ή υποβάθμιση οποιαδήποτε στιγμή. Τα δεδομένα σου παραμένουν διαθέσιμα και κάνουμε αναλογική χρέωση.",
  },
  {
    q: "Τι γίνεται αν ξεπεράσω το όριο παραστατικών;",
    a: "Θα σε ενημερώσουμε πριν φτάσεις το όριο. Μπορείς να αναβαθμίσεις πακέτο ή να αγοράσεις επιπλέον παραστατικά à la carte.",
  },
  {
    q: "Πώς γίνεται η έκδοση και η διαβίβαση στο myDATA;",
    a: "Η φοροσήμανση και η διαβίβαση γίνονται από τον συνεργαζόμενο πάροχο ηλεκτρονικής τιμολόγησης, με τον οποίο υπογράφεις σύμβαση μία φορά κατά την ενεργοποίηση.",
  },
  {
    q: "Έχει επιπλέον χρέωση ο πάροχος;",
    a: "Ο πάροχος έχει δικό του πλάνο και εξοφλείται απευθείας. Δεν συμπεριλαμβάνεται στα πακέτα του timologion.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-900 text-white">
        <Container className="py-20 md:py-28">
          <p className="eyebrow text-white/60">Κόστος</p>
          <h1 className="text-hero mt-6 max-w-4xl">
            Απλή τιμολόγηση. Δίκαιη τιμή.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70 md:text-xl">
            Επίλεξε το πακέτο που ταιριάζει στη φάση της επιχείρησής σου. Ξεκίνα
            δωρεάν, χωρίς κάρτα, και άλλαξε όποτε θέλεις. Οι τιμές δεν
            συμπεριλαμβάνουν ΦΠΑ.
          </p>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {REASSURANCES.map((r) => {
              const Icon = r.icon;
              return (
                <li
                  key={r.text}
                  className="flex items-center gap-2 text-sm font-medium text-white/80"
                >
                  <Icon size={16} className="text-emerald-300" aria-hidden />
                  {r.text}
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Pricing */}
      <section className="bg-white">
        <Container className="py-16 md:py-24">
          <PricingSwitcher />

          <p className="mx-auto mt-12 max-w-3xl text-center text-sm text-black/50">
            Η φοροσήμανση και η διαβίβαση στο myDATA πραγματοποιούνται από τον
            συνεργαζόμενο πάροχο. Η συνδρομή του τιμολογείται ξεχωριστά και
            εξοφλείται απευθείας στον πάροχο.
          </p>
        </Container>
      </section>

      {/* Comparison */}
      <section className="border-y border-black/[0.06] bg-gradient-to-b from-brand-50/50 to-white">
        <Container className="py-20 md:py-28">
          <p className="eyebrow text-center text-brand-900/70">
            Λεπτομερής σύγκριση
          </p>
          <h2 className="text-display mt-4 text-center text-brand-900">
            Τι περιλαμβάνει κάθε πακέτο.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-black/60">
            Δες αναλυτικά τι υποστηρίζει κάθε επίπεδο. Επίλεξε αυτό που ταιριάζει
            στη φάση της επιχείρησής σου.
          </p>

          <div className="mt-14 overflow-x-auto rounded-3xl border-2 border-black/[0.08] bg-white shadow-soft">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-white">
                  <th className="sticky left-0 z-10 min-w-[280px] bg-white px-6 py-6 text-left align-bottom">
                    <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/60">
                      Λειτουργία
                    </p>
                  </th>
                  <ThHead name="Starter" />
                  <ThHead
                    name="Business"
                    featured
                    badge={{ icon: Star, label: "Καλύτερη αξία" }}
                  />
                  <ThHead name="Advanced" />
                </tr>
              </thead>
              <tbody>
                {COMPARE_GROUPS.map((group, gi) => {
                  const GroupIcon = group.icon;
                  return (
                    <Fragment key={`grp-${gi}`}>
                      <tr className="bg-brand-50/60">
                        <td
                          colSpan={4}
                          className="sticky left-0 px-6 py-3 text-left"
                        >
                          <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-900">
                            <GroupIcon size={14} aria-hidden />
                            {group.title}
                          </span>
                        </td>
                      </tr>
                      {group.rows.map((row) => {
                        const RowIcon = row.icon;
                        return (
                          <tr
                            key={row.label}
                            className="group border-t border-black/[0.05] transition-colors hover:bg-brand-50/40"
                          >
                            <td
                              className="sticky left-0 z-10 min-w-[280px] bg-white px-6 py-4 text-left group-hover:bg-brand-50/60"
                              title={row.tooltip}
                            >
                              <span className="flex items-center gap-3">
                                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-900">
                                  <RowIcon size={15} aria-hidden />
                                </span>
                                <span className="text-[15px] font-semibold text-brand-900">
                                  {row.label}
                                </span>
                              </span>
                            </td>
                            <TdCell value={row.starter} />
                            <TdCell value={row.business} featured />
                            <TdCell value={row.advanced} />
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}

                {/* CTA row */}
                <tr className="border-t-2 border-black/10 bg-gradient-to-b from-white to-brand-50/40">
                  <td className="sticky left-0 bg-white px-6 py-6 font-semibold text-brand-900">
                    Ξεκίνα σήμερα
                  </td>
                  <TdCta href="/register" label="Δωρεάν" />
                  <TdCta href="/register" label="Ξεκίνα δωρεάν" featured />
                  <TdCta href="/contact" label="Επικοινωνία" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-black/60">
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" aria-hidden />
              Περιλαμβάνεται
            </span>
            <span className="inline-flex items-center gap-1.5">
              <X size={14} className="text-black/40" aria-hidden />
              Δεν περιλαμβάνεται
            </span>
            <span className="inline-flex items-center gap-1.5">
              <InfinityIcon
                size={14}
                className="text-brand-900"
                aria-hidden
              />
              Απεριόριστα
            </span>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-black/[0.08] bg-white">
        <Container className="py-24 md:py-32">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow text-brand-900/70">Απορίες</p>
              <h2 className="text-display mt-4 text-brand-900">
                Πριν κάνεις εγγραφή.
              </h2>
              <p className="mt-6 text-lg text-black/70">
                Δεν βλέπεις την απάντηση που ψάχνεις;{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
                >
                  Ρώτησέ μας
                </Link>{" "}
                — απαντάμε εντός μιας εργάσιμης.
              </p>
            </div>
            <dl className="lg:col-span-8 space-y-6">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border-2 border-black/10 bg-white p-6 open:border-brand-900/30 open:bg-brand-50/30"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-6 text-lg font-bold text-brand-900 md:text-xl">
                    <span>{f.q}</span>
                    <span
                      aria-hidden
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-brand-900/20 text-brand-900 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-base text-black/70">
                    {f.a}
                  </p>
                </details>
              ))}
            </dl>
          </div>
        </Container>
      </section>
    </>
  );
}

// ─── Comparison-table helpers ─────────────────────────────────────────

function ThHead({
  name,
  featured,
  badge,
}: {
  name: string;
  featured?: boolean;
  badge?: { icon: LucideIcon; label: string };
}) {
  const BadgeIcon = badge?.icon;
  return (
    <th
      className={
        "relative px-6 py-6 text-center align-bottom " +
        (featured ? "bg-brand-900" : "bg-white")
      }
    >
      {badge && BadgeIcon && featured && (
        <span className="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-emerald-400 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-950 shadow">
          <BadgeIcon size={11} strokeWidth={3} aria-hidden />
          {badge.label}
        </span>
      )}
      <p
        className={
          "mt-3 text-lg font-extrabold " +
          (featured ? "text-white" : "text-brand-900")
        }
      >
        {name}
      </p>
    </th>
  );
}

function TdCell({
  value,
  featured,
}: {
  value: CellValue;
  featured?: boolean;
}) {
  const bg = featured
    ? "bg-brand-900/[0.03] group-hover:bg-brand-900/[0.06]"
    : "";
  return (
    <td className={"px-6 py-4 text-center align-middle " + bg}>
      {renderValue(value, !!featured)}
    </td>
  );
}

function renderValue(value: CellValue, featured: boolean) {
  if (value === true)
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check size={16} strokeWidth={3} aria-hidden />
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        <X size={16} strokeWidth={2.5} aria-hidden />
      </span>
    );
  if (value === "infinity")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1 text-white">
        <InfinityIcon size={16} strokeWidth={2.5} aria-hidden />
        <span className="text-xs font-black uppercase tracking-widest">
          Απεριόριστα
        </span>
      </span>
    );
  return (
    <span
      className={
        "text-sm font-semibold " +
        (featured ? "text-brand-900" : "text-black/80")
      }
    >
      {value}
    </span>
  );
}

function TdCta({
  href,
  label,
  featured,
}: {
  href: string;
  label: string;
  featured?: boolean;
}) {
  return (
    <td
      className={
        "px-4 py-6 text-center align-middle " +
        (featured ? "bg-brand-900/[0.03]" : "")
      }
    >
      <Link
        href={href}
        className={
          "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold transition-transform hover:-translate-y-0.5 " +
          (featured
            ? "bg-brand-900 text-white hover:bg-black"
            : "border-2 border-brand-900 text-brand-900 hover:bg-brand-900 hover:text-white")
        }
      >
        {label}
      </Link>
    </td>
  );
}
