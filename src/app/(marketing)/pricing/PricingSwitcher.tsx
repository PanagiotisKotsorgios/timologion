import {
  Check,
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
  Landmark,
} from "lucide-react";
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

      <HighVolumeSection tiers={highVolumeTiers} />
    </>
  );
}

// ─── High-volume section ────────────────────────────────────────────────
// Same visual language as the main TierCard grid above: white surface,
// brand-navy typography, emerald accent for the recommended tier. Reads
// as an "upgrade path" continuation, not a foreign dark section pasted
// in from another design.

/**
 * Compact volume label per tier — shown as a small badge on the card.
 * Enterprise flagged as the popular high-volume pick.
 */
const HIGH_VOLUME_META: Record<
  string,
  { volumeLabel: string; recommended?: boolean }
> = {
  pro: { volumeLabel: "200 χιλιάδες" },
  enterprise: { volumeLabel: "750 χιλιάδες", recommended: true },
  corporate: { volumeLabel: "4 εκατομμύρια" },
};

function HighVolumeSection({
  tiers,
}: {
  tiers: (typeof PRICING_TIERS)[number][];
}) {
  return (
    <section className="mt-20 rounded-3xl border-2 border-black/10 bg-white p-8 md:p-10">
      {/* Header row — same eyebrow/heading rhythm as the rest of pricing */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow inline-flex items-center gap-2 text-brand-900/70">
            <TrendingUp size={14} strokeWidth={2.5} aria-hidden />
            Μεγαλύτερος όγκος
          </p>
          <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-900 md:text-4xl">
            Πακέτα για επιχειρήσεις υψηλού όγκου
          </h3>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-black/60">
            Πάνω από 18.000 παραστατικά/έτος; Επίλεξε το επίπεδο που ταιριάζει
            στη ροή σου. Custom SLA και ειδικές ανάγκες — έλα να μιλήσουμε.
          </p>
        </div>
        <a
          href="/contact"
          className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-900 hover:text-white"
        >
          Επικοινωνία με πωλήσεις
          <ArrowRight size={15} strokeWidth={2.75} aria-hidden />
        </a>
      </div>

      {/* Tier cards */}
      <div className="mt-10 grid gap-5 md:grid-cols-3 lg:gap-6">
        {tiers.map((t) => (
          <HighVolumeCard key={t.code} tier={t} />
        ))}
      </div>

      {/* B2G add-on — white card, brand-100 border, emerald accent chip.
          Matches the "recommended" emerald marker used elsewhere in the
          pricing grid instead of introducing a new color. */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-black/10 bg-brand-50/50 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white ring-2 ring-inset ring-brand-900/10">
            <Landmark
              size={20}
              strokeWidth={2.5}
              className="text-brand-900"
              aria-hidden
            />
          </div>
          <div>
            <p className="text-sm font-black text-brand-900">
              B2G add-on{" "}
              <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-black/50">
                προαιρετικά
              </span>
            </p>
            <p className="mt-0.5 text-sm text-black/60">
              Για έκδοση παραστατικών προς το δημόσιο — προσθέσιμο σε
              οποιοδήποτε πακέτο.
            </p>
          </div>
        </div>
        <div className="inline-flex items-baseline gap-1 rounded-xl bg-white px-4 py-2.5 ring-2 ring-inset ring-brand-900/10">
          <Plus
            size={14}
            strokeWidth={3}
            className="self-center text-brand-900"
            aria-hidden
          />
          <span className="text-lg font-extrabold tabular-nums text-brand-900">
            {formatEur(B2G_ADDON_INCL_VAT)}
          </span>
          <span className="text-xs font-semibold text-black/50">/έτος</span>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-black/50">
        Όλες οι τιμές είναι ετήσιες και συμπεριλαμβάνουν ΦΠΑ 24%. Η αγορά
        του πακέτου ολοκληρώνεται μέσω του πιστοποιημένου παρόχου
        ηλεκτρονικής τιμολόγησης (Wrapp).
      </p>
    </section>
  );
}

function HighVolumeCard({ tier }: { tier: (typeof PRICING_TIERS)[number] }) {
  const meta = HIGH_VOLUME_META[tier.code] ?? { volumeLabel: "" };
  const featured = Boolean(meta.recommended);
  // Cost per 1,000 documents — a compelling proof-point for volume buyers
  // who instinctively compute the unit economics.
  const perThousand = (tier.retailInclVat / tier.docsPerYear) * 1000;

  return (
    <div
      className={
        "relative flex flex-col rounded-2xl p-6 transition-transform hover:-translate-y-0.5 " +
        (featured
          ? "bg-brand-900 text-white shadow-xl ring-4 ring-brand-900/10"
          : "border-2 border-black/10 bg-white text-black hover:border-brand-900/25")
      }
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-950 shadow">
          Δημοφιλέστερο
        </span>
      )}

      {/* Tier name + volume badge */}
      <div className="flex items-start justify-between gap-3">
        <p
          className={
            "text-[11px] font-black uppercase tracking-widest " +
            (featured ? "text-emerald-300" : "text-brand-900/70")
          }
        >
          {tier.name}
        </p>
        <span
          className={
            "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums " +
            (featured
              ? "bg-white/10 text-white/80"
              : "bg-brand-50 text-brand-900/80")
          }
        >
          {meta.volumeLabel}
        </span>
      </div>

      <p
        className={
          "mt-2 text-sm leading-relaxed " +
          (featured ? "text-white/75" : "text-black/60")
        }
      >
        {tier.tagline}
      </p>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <span
          className={
            "text-4xl font-extrabold tracking-tight lg:text-[42px] " +
            (featured ? "text-white" : "text-brand-900")
          }
        >
          {formatEur(tier.retailInclVat)}
        </span>
        <span
          className={
            "text-sm font-medium " + (featured ? "text-white/60" : "text-black/50")
          }
        >
          /έτος
        </span>
      </div>

      {/* Per-1,000 cost — the value proof-point, styled as a subtle chip */}
      <p
        className={
          "mt-3 inline-flex w-fit items-center rounded-md px-2 py-1 text-[11px] font-bold tabular-nums " +
          (featured
            ? "bg-white/10 text-white/80"
            : "bg-brand-50 text-brand-900")
        }
      >
        {formatEur(perThousand)} ανά 1.000 παραστατικά
      </p>

      {/* Feature list — same rhythm as the main TierCard */}
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check
              size={16}
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

      {/* Per-tier CTA — matches the main TierCard button treatment */}
      <a
        href="/register"
        className={
          "mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-transform hover:-translate-y-0.5 " +
          (featured
            ? "bg-white text-brand-900 hover:bg-emerald-100"
            : "bg-brand-900 text-white hover:bg-black")
        }
      >
        Ξεκίνα με {tier.name}
        <ArrowRight size={15} strokeWidth={2.75} aria-hidden />
      </a>
    </div>
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

