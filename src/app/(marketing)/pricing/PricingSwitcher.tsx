import { Check, Calendar, TrendingUp } from "lucide-react";

/**
 * Wrapp tier grid — annual billing only, prices mirrored from
 * scripts/first-boot.ts so the marketing surface can't drift from the
 * actual provider catalogue.
 *
 * Layout: three headline tiers (Basic / Growth / Scale) cover 95% of the
 * SMB market and get full cards. The three high-volume tiers (Pro /
 * Enterprise / Corporate) sit below in a compact strip because at that
 * scale customers talk to us before signing up.
 */

type Tier = {
  key: string;
  name: string;
  tagline: string;
  yearlyTotal: number;
  perMonth: number;
  featured?: boolean;
  cta: string;
  ctaHref: string;
  features: { text: string; included: boolean }[];
  highlight: string;
};

const TIERS: Tier[] = [
  {
    key: "basic",
    name: "Basic",
    tagline:
      "Ιδανικό σημείο εκκίνησης — freelancers και μικρές επιχειρήσεις.",
    yearlyTotal: 35.96,
    perMonth: 3.0,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "1.500 παραστατικά / έτος",
    features: [
      { text: "Ηλεκτρονική τιμολόγηση myDATA", included: true },
      { text: "Πελατολόγιο με αναζήτηση ΑΦΜ (ΓΓΠΣ)", included: true },
      { text: "Είδη & υπηρεσίες", included: true },
      { text: "PDF, εκτύπωση & αποστολή email", included: true },
      { text: "1 χρήστης", included: true },
      { text: "Email υποστήριξη", included: true },
    ],
  },
  {
    key: "growth",
    name: "Growth",
    tagline: "Για μικρές επιχειρήσεις με σταθερή ροή εκδόσεων.",
    yearlyTotal: 122.76,
    perMonth: 10.23,
    featured: true,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "6.000 παραστατικά / έτος",
    features: [
      { text: "Όλα του Basic", included: true },
      { text: "Εισπράξεις & πληρωμές", included: true },
      { text: "Επαναλαμβανόμενα παραστατικά", included: true },
      { text: "Προηγμένες αναφορές & εξαγωγές", included: true },
      { text: "Ραντεβού & ημερολόγιο", included: true },
      { text: "Ταχύτερη υποστήριξη", included: true },
    ],
  },
  {
    key: "scale",
    name: "Scale",
    tagline: "Για ώριμες επιχειρήσεις με ομάδα και μεγαλύτερο όγκο.",
    yearlyTotal: 209.56,
    perMonth: 17.46,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "18.000 παραστατικά / έτος",
    features: [
      { text: "Όλα του Growth", included: true },
      { text: "POS & Ταμείο", included: true },
      { text: "CRM (leads, ευκαιρίες, tasks)", included: true },
      { text: "Απόθεμα ειδών & προϊόντων", included: true },
      { text: "Έως 5 χρήστες με ρόλους", included: true },
      { text: "Υποστήριξη προτεραιότητας", included: true },
    ],
  },
];

const HIGH_VOLUME_TIERS: {
  key: string;
  name: string;
  yearlyTotal: number;
  docsPerYear: string;
  tagline: string;
}[] = [
  {
    key: "pro",
    name: "Pro",
    yearlyTotal: 296.36,
    docsPerYear: "200.000",
    tagline:
      "Απεριόριστοι χρήστες · Όλες οι λειτουργίες Scale · Υποστήριξη προτεραιότητας",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    yearlyTotal: 680.76,
    docsPerYear: "750.000",
    tagline: "SLA · Dedicated account manager · Όλες οι λειτουργίες Pro",
  },
  {
    key: "corporate",
    name: "Corporate",
    yearlyTotal: 2478.76,
    docsPerYear: "4.000.000",
    tagline: "Custom SLA · Priority engineering support",
  },
];

const fmt = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PricingSwitcher() {
  return (
    <>
      <div className="mx-auto mb-12 flex max-w-lg items-center justify-center gap-3 rounded-full border-2 border-brand-900/20 bg-white px-6 py-3 text-sm font-semibold text-brand-900 shadow-sm">
        <Calendar size={16} aria-hidden />
        <span>Ετήσια χρέωση — μηνιαία προγράμματα σύντομα</span>
      </div>

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

      <div className="mt-14 rounded-3xl border-2 border-black/10 bg-white p-8 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow inline-flex items-center gap-2 text-brand-900/70">
              <TrendingUp size={14} aria-hidden />
              Μεγαλύτερος όγκος
            </p>
            <h3 className="mt-3 text-3xl font-extrabold text-brand-900">
              Πακέτα για επιχειρήσεις υψηλού όγκου
            </h3>
            <p className="mt-2 max-w-xl text-base text-black/60">
              Αν εκδίδεις πάνω από 18.000 παραστατικά/έτος, επίλεξε ένα από
              τα παρακάτω επίπεδα. Για custom SLA και ειδικές ανάγκες,
              επικοινώνησε μαζί μας.
            </p>
          </div>
          <a
            href="/contact"
            className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-brand-900 px-5 text-sm font-bold text-brand-900 hover:bg-brand-900 hover:text-white"
          >
            Επικοινωνία με πωλήσεις
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {HIGH_VOLUME_TIERS.map((t) => (
            <div
              key={t.key}
              className="rounded-2xl border-2 border-black/10 bg-brand-50/40 p-6"
            >
              <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/70">
                {t.name}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-brand-900">
                  {fmt.format(t.yearlyTotal)}€
                </span>
                <span className="text-sm text-black/50">/έτος</span>
              </div>
              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-900">
                {t.docsPerYear} παραστατικά / έτος
              </p>
              <p className="mt-3 text-sm text-black/60">{t.tagline}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
