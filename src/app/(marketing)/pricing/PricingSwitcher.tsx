import { Check, Calendar } from "lucide-react";

/**
 * Annual-only pricing grid. The upstream provider (Wrapp) currently sells
 * annual packages only, so we mirror that model instead of showing a monthly
 * toggle that we couldn't actually honor. Document limits are also aligned
 * to real Wrapp tier boundaries — every tier maps 1:1 to a package we can
 * actually provision.
 */

type Tier = {
  key: string;
  name: string;
  tagline: string;
  yearlyTotal: number; // full-year price
  perMonth: number; // display-only, yearlyTotal / 12
  featured?: boolean;
  cta: string;
  ctaHref: string;
  features: { text: string; included: boolean }[];
  highlight: string;
};

const TIERS: Tier[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "Για μονοπρόσωπες επιχειρήσεις και freelancers.",
    yearlyTotal: 82.8,
    perMonth: 6.9,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "1.500 παραστατικά / έτος",
    features: [
      { text: "Έκδοση τιμολογίων & αποδείξεων μέσω myDATA", included: true },
      { text: "Πελατολόγιο με αναζήτηση ΑΦΜ (ΓΓΠΣ)", included: true },
      { text: "Είδη & υπηρεσίες", included: true },
      { text: "PDF, εκτύπωση & αποστολή email", included: true },
      { text: "Βασικές αναφορές εσόδων", included: true },
      { text: "1 χρήστης", included: true },
      { text: "Επαναλαμβανόμενα παραστατικά", included: false },
      { text: "POS & CRM", included: false },
    ],
  },
  {
    key: "business",
    name: "Business",
    tagline: "Για μικρές & μεσαίες επιχειρήσεις με ομάδα.",
    yearlyTotal: 178.8,
    perMonth: 14.9,
    featured: true,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "6.000 παραστατικά / έτος",
    features: [
      { text: "Όλα του Starter", included: true },
      { text: "Εισπράξεις & πληρωμές", included: true },
      { text: "Επαναλαμβανόμενα παραστατικά", included: true },
      { text: "Προηγμένες αναφορές & εξαγωγές", included: true },
      { text: "Έως 5 χρήστες με ρόλους", included: true },
      { text: "Email υποστήριξη", included: true },
      { text: "POS & CRM", included: false },
    ],
  },
  {
    key: "advanced",
    name: "Advanced",
    tagline: "Για ώριμες επιχειρήσεις με POS/CRM.",
    yearlyTotal: 358.8,
    perMonth: 29.9,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "18.000 παραστατικά / έτος",
    features: [
      { text: "Όλα του Business", included: true },
      { text: "Γρήγορη πώληση & POS", included: true },
      { text: "CRM: leads, ευκαιρίες, tasks", included: true },
      { text: "Απόθεμα ειδών & προϊόντων", included: true },
      { text: "Απεριόριστοι χρήστες", included: true },
      { text: "Υποστήριξη με προτεραιότητα", included: true },
    ],
  },
];

const fmt = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PricingSwitcher() {
  return (
    <>
      {/* Billing model note (annual only until upstream supports monthly) */}
      <div className="mx-auto mb-12 flex max-w-lg items-center justify-center gap-3 rounded-full border-2 border-brand-900/20 bg-white px-6 py-3 text-sm font-semibold text-brand-900 shadow-sm">
        <Calendar size={16} aria-hidden />
        <span>Ετήσια χρέωση — μηνιαία προγράμματα σύντομα</span>
      </div>

      {/* Tier grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {TIERS.map((t) => {
          const isFeatured = t.featured;
          return (
            <div
              key={t.key}
              className={
                "relative flex flex-col rounded-3xl p-7 md:p-8 " +
                (isFeatured
                  ? "bg-brand-900 text-white shadow-2xl ring-4 ring-brand-900/10"
                  : "border-2 border-black/10 bg-white text-black")
              }
            >
              {isFeatured && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-4 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-950 shadow">
                  Προτεινόμενο
                </span>
              )}

              <p
                className={
                  "text-[11px] font-black uppercase tracking-widest " +
                  (isFeatured ? "text-emerald-300" : "text-brand-900/70")
                }
              >
                {t.name}
              </p>
              <p
                className={
                  "mt-1.5 text-sm " +
                  (isFeatured ? "text-white/75" : "text-black/60")
                }
              >
                {t.tagline}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span
                  className={
                    "text-5xl font-extrabold tracking-tightest lg:text-6xl " +
                    (isFeatured ? "text-white" : "text-brand-900")
                  }
                >
                  {fmt.format(t.yearlyTotal)}€
                </span>
                <span
                  className={
                    "text-sm font-medium " +
                    (isFeatured ? "text-white/60" : "text-black/50")
                  }
                >
                  /έτος
                </span>
              </div>

              <p
                className={
                  "mt-1 text-xs " +
                  (isFeatured ? "text-white/60" : "text-black/50")
                }
              >
                Ισοδυναμεί με {fmt.format(t.perMonth)}€ / μήνα
              </p>

              <div
                className={
                  "mt-5 rounded-xl px-4 py-3 text-center text-[13px] font-bold " +
                  (isFeatured
                    ? "bg-white/10 text-white"
                    : "bg-brand-50 text-brand-900")
                }
              >
                {t.highlight}
              </div>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    {f.included ? (
                      <Check
                        size={17}
                        strokeWidth={3}
                        className={
                          "mt-0.5 shrink-0 " +
                          (isFeatured ? "text-emerald-300" : "text-emerald-600")
                        }
                        aria-hidden
                      />
                    ) : (
                      <span
                        className={
                          "mt-2 h-0.5 w-3 shrink-0 rounded " +
                          (isFeatured ? "bg-white/30" : "bg-black/25")
                        }
                        aria-hidden
                      />
                    )}
                    <span
                      className={
                        f.included
                          ? isFeatured
                            ? "text-white"
                            : "text-black"
                          : isFeatured
                            ? "text-white/40 line-through"
                            : "text-black/35 line-through"
                      }
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={t.ctaHref}
                className={
                  "mt-7 inline-flex h-13 items-center justify-center rounded-full px-6 py-3 text-base font-bold transition-transform hover:-translate-y-0.5 " +
                  (isFeatured
                    ? "bg-white text-brand-900 hover:bg-emerald-100"
                    : "bg-brand-900 text-white hover:bg-black")
                }
              >
                {t.cta}
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
}
