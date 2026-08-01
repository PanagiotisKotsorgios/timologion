import { Check, Calendar, TrendingUp, Plus } from "lucide-react";
import { PRICING_TIERS, formatEur, B2G_ADDON_INCL_VAT } from "@/lib/pricing";

/**
 * Wrapp partner tier grid — annual billing only.
 * Prices come from src/lib/pricing.ts (single source of truth).
 *
 * Customer-facing UI shows ONLY the final retail price. The internal
 * Wrapp partner / markup breakdown stays in the catalog for admin
 * tooling but is intentionally not exposed here — the price the user
 * pays is the price we advertise, full stop.
 */

export function PricingSwitcher() {
  const mainTiers = PRICING_TIERS.slice(0, 3);
  const highVolumeTiers = PRICING_TIERS.slice(3);

  return (
    <>
      <div className="mx-auto mb-12 flex max-w-lg items-center justify-center gap-3 rounded-full border-2 border-brand-900/20 bg-white px-6 py-3 text-sm font-semibold text-brand-900 shadow-sm">
        <Calendar size={16} aria-hidden />
        <span>Ετήσια χρέωση — μηνιαία προγράμματα σύντομα</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {mainTiers.map((t) => (
          <TierCard key={t.code} tier={t} featured={t.featured} />
        ))}
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
          {highVolumeTiers.map((t) => (
            <div
              key={t.code}
              className="rounded-2xl border-2 border-black/10 bg-brand-50/40 p-6"
            >
              <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/70">
                {t.name}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-brand-900">
                  {formatEur(t.retailInclVat)}
                </span>
                <span className="text-sm text-black/50">/έτος</span>
              </div>
              <div className="mt-3 grid gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-900">
                <span>
                  {t.docsPerYear.toLocaleString("el-GR")} παραστατικά / έτος
                </span>
                <span className="text-brand-900/70">
                  {t.apiCallsPerYear.toLocaleString("el-GR")} API calls / έτος
                </span>
              </div>
              <p className="mt-3 text-sm text-black/60">{t.tagline}</p>
            </div>
          ))}
        </div>

        {/* B2G add-on note — pass-through from Wrapp, no timologion markup. */}
        <div className="mt-8 flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-brand-900/20 bg-brand-50/40 p-4 text-sm text-brand-900">
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          <span className="font-bold">B2G add-on (προαιρετικά)</span>
          <span className="text-black/70">
            Για έκδοση παραστατικών προς το δημόσιο:{" "}
            <strong className="tabular-nums">
              +{formatEur(B2G_ADDON_INCL_VAT)}/έτος
            </strong>{" "}
            σε οποιοδήποτε πακέτο.
          </span>
        </div>

        <p className="mt-6 text-xs text-black/50">
          Όλες οι τιμές είναι ετήσιες και συμπεριλαμβάνουν ΦΠΑ 24%. Η αγορά
          του πακέτου ολοκληρώνεται μέσω του πιστοποιημένου παρόχου
          ηλεκτρονικής τιμολόγησης (Wrapp).
        </p>
      </div>
    </>
  );
}

function TierCard({
  tier,
  featured,
}: {
  tier: (typeof PRICING_TIERS)[number];
  featured?: boolean;
}) {
  const perMonth = tier.retailInclVat / 12;
  return (
    <div
      className={
        "relative flex flex-col rounded-3xl p-7 md:p-8 " +
        (featured
          ? "bg-brand-900 text-white shadow-2xl ring-4 ring-brand-900/10"
          : "border-2 border-black/10 bg-white text-black")
      }
    >
      {featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-4 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-950 shadow">
          Προτεινόμενο
        </span>
      )}

      <p
        className={
          "text-[11px] font-black uppercase tracking-widest " +
          (featured ? "text-emerald-300" : "text-brand-900/70")
        }
      >
        {tier.name}
      </p>
      <p
        className={
          "mt-1.5 text-sm " + (featured ? "text-white/75" : "text-black/60")
        }
      >
        {tier.tagline}
      </p>

      <div className="mt-6 flex items-baseline gap-1.5">
        <span
          className={
            "text-5xl font-extrabold tracking-tightest lg:text-6xl " +
            (featured ? "text-white" : "text-brand-900")
          }
        >
          {formatEur(tier.retailInclVat)}
        </span>
        <span
          className={
            "text-sm font-medium " +
            (featured ? "text-white/60" : "text-black/50")
          }
        >
          /έτος
        </span>
      </div>

      <p
        className={
          "mt-1 text-xs " + (featured ? "text-white/60" : "text-black/50")
        }
      >
        Ισοδυναμεί με {formatEur(perMonth)} / μήνα · συμπ. ΦΠΑ 24%
      </p>

      <div
        className={
          "mt-5 rounded-xl px-4 py-3 text-center text-[13px] font-bold " +
          (featured ? "bg-white/10 text-white" : "bg-brand-50 text-brand-900")
        }
      >
        {tier.docsPerYear.toLocaleString("el-GR")} παραστατικά / έτος
      </div>

      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check
              size={17}
              strokeWidth={3}
              className={
                "mt-0.5 shrink-0 " +
                (featured ? "text-emerald-300" : "text-emerald-600")
              }
              aria-hidden
            />
            <span className={featured ? "text-white" : "text-black"}>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href="/register"
        className={
          "mt-7 inline-flex h-13 items-center justify-center rounded-full px-6 py-3 text-base font-bold transition-transform hover:-translate-y-0.5 " +
          (featured
            ? "bg-white text-brand-900 hover:bg-emerald-100"
            : "bg-brand-900 text-white hover:bg-black")
        }
      >
        Ξεκίνα δωρεάν
      </a>
    </div>
  );
}

