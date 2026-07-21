"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Tier = {
  key: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number; // per-month equivalent when billed yearly
  yearlyTotal: number; // full-year price
  featured?: boolean;
  cta: string;
  ctaHref: string;
  features: { text: string; included: boolean }[];
  highlight?: string;
};

const TIERS: Tier[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "Για μονοπρόσωπες επιχειρήσεις και freelancers.",
    monthly: 8.9,
    yearly: 6.9,
    yearlyTotal: 82.8,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "25 παραστατικά/μήνα",
    features: [
      { text: "Έκδοση τιμολογίων & αποδείξεων μέσω myDATA", included: true },
      { text: "Πελατολόγιο με αναζήτηση ΑΦΜ (ΓΓΠΣ)", included: true },
      { text: "Είδη & υπηρεσίες", included: true },
      { text: "PDF, εκτύπωση & αποστολή email", included: true },
      { text: "Βασικές αναφορές εσόδων", included: true },
      { text: "1 χρήστης", included: true },
      { text: "Έξοδα & προμηθευτές", included: false },
      { text: "POS, CRM, ραντεβού", included: false },
    ],
  },
  {
    key: "business",
    name: "Business",
    tagline: "Για μικρές & μεσαίες επιχειρήσεις με ομάδα.",
    monthly: 19.9,
    yearly: 14.9,
    yearlyTotal: 178.8,
    featured: true,
    cta: "Ξεκίνα δωρεάν",
    ctaHref: "/register",
    highlight: "150 παραστατικά/μήνα",
    features: [
      { text: "Όλα του Starter", included: true },
      { text: "Έξοδα, προμηθευτές, αγορές", included: true },
      { text: "Εισπράξεις & πληρωμές", included: true },
      { text: "Επαναλαμβανόμενα παραστατικά", included: true },
      { text: "Προηγμένες αναφορές & εξαγωγές", included: true },
      { text: "Έως 5 χρήστες με ρόλους", included: true },
      { text: "Υποστήριξη προτεραιότητας", included: true },
      { text: "POS, CRM, ραντεβού", included: false },
    ],
  },
  {
    key: "advanced",
    name: "Advanced",
    tagline: "Για ώριμες επιχειρήσεις με POS/CRM.",
    monthly: 39.9,
    yearly: 29.9,
    yearlyTotal: 358.8,
    cta: "Επικοινώνησε μαζί μας",
    ctaHref: "/contact",
    highlight: "Απεριόριστα παραστατικά",
    features: [
      { text: "Όλα του Business", included: true },
      { text: "Γρήγορη πώληση & POS", included: true },
      { text: "Ραντεβού & ημερολόγιο", included: true },
      { text: "CRM & καμπάνιες", included: true },
      { text: "Απόθεμα & παραγγελίες", included: true },
      { text: "AI βοηθός & αυτοματισμοί", included: true },
      { text: "Απεριόριστοι χρήστες", included: true },
      { text: "Dedicated onboarding", included: true },
    ],
  },
];

const fmt = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PricingSwitcher() {
  const [yearly, setYearly] = useState(true);

  return (
    <>
      {/* Billing switch */}
      <div className="mx-auto mb-12 flex justify-center">
        <div className="inline-flex items-center rounded-full border-2 border-brand-900/20 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={
              "rounded-full px-6 py-2.5 text-sm font-bold transition-all md:px-8 md:text-base " +
              (yearly
                ? "text-brand-900/60 hover:text-brand-900"
                : "bg-brand-900 text-white shadow-md")
            }
          >
            Μηνιαία
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={
              "flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all md:px-8 md:text-base " +
              (yearly
                ? "bg-brand-900 text-white shadow-md"
                : "text-brand-900/60 hover:text-brand-900")
            }
          >
            Ετήσια
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider " +
                (yearly
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-emerald-100 text-emerald-800")
              }
            >
              −25%
            </span>
          </button>
        </div>
      </div>

      {/* Tier grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {TIERS.map((t) => {
          const priceLabel = yearly ? t.yearly : t.monthly;
          const savings = yearly
            ? ((t.monthly * 12 - t.yearlyTotal) / (t.monthly * 12)) * 100
            : 0;
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
                  Καλύτερη αξία
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
                  {fmt.format(priceLabel)}€
                </span>
                <span
                  className={
                    "text-sm font-medium " +
                    (isFeatured ? "text-white/60" : "text-black/50")
                  }
                >
                  /μήνα
                </span>
              </div>

              <p
                className={
                  "mt-1 text-xs " +
                  (isFeatured ? "text-white/60" : "text-black/50")
                }
              >
                {yearly
                  ? `Χρέωση ${fmt.format(t.yearlyTotal)}€ ετησίως`
                  : "Χωρίς δέσμευση"}
                {yearly && savings > 0 && (
                  <>
                    {" · "}
                    <span
                      className={
                        "font-bold " +
                        (isFeatured ? "text-emerald-300" : "text-emerald-700")
                      }
                    >
                      Κερδίζεις {Math.round(savings)}%
                    </span>
                  </>
                )}
              </p>

              {t.highlight && (
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
              )}

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
