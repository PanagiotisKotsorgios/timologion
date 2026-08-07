import {
  Check,
  Calendar,
  TrendingUp,
  Plus,
  Rocket,
  Shield,
  Crown,
  Sparkles,
  ArrowRight,
  Landmark,
  Zap,
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
// Distinct look from the three main tiers so the eye reads it as an
// enterprise upgrade path, not a fourth pricing column. Dark hero with
// per-tier accent + volume badge + per-thousand cost chip + its own CTA.

const HIGH_VOLUME_META: Record<
  string,
  {
    icon: typeof Rocket;
    accent: "sky" | "amber" | "violet";
    /** Compact volume label — reads at a glance in the icon badge. */
    volumeLabel: string;
    recommended?: boolean;
  }
> = {
  pro: { icon: Rocket, accent: "sky", volumeLabel: "200K" },
  enterprise: {
    icon: Shield,
    accent: "amber",
    volumeLabel: "750K",
    recommended: true,
  },
  corporate: { icon: Crown, accent: "violet", volumeLabel: "4M" },
};

const ACCENT_CLASSES: Record<
  "sky" | "amber" | "violet",
  {
    // Halo behind the icon
    glow: string;
    // Icon tile background
    tile: string;
    // Icon color
    iconColor: string;
    // Divider under the price
    divider: string;
    // Volume badge fill + text
    volumeBadge: string;
    // Per-doc chip
    perDocChip: string;
    // CTA button
    cta: string;
    // Feature-check color
    check: string;
    // Card border on hover
    cardHover: string;
    // Recommended ring color
    ring: string;
  }
> = {
  sky: {
    glow: "bg-sky-500/20",
    tile: "bg-gradient-to-br from-sky-400 to-sky-600",
    iconColor: "text-white",
    divider: "bg-sky-400/20",
    volumeBadge: "bg-sky-500/15 text-sky-200 ring-1 ring-inset ring-sky-400/30",
    perDocChip: "bg-white/5 text-white/80 ring-1 ring-inset ring-white/10",
    cta: "bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/40",
    check: "text-sky-300",
    cardHover: "hover:border-sky-400/40",
    ring: "ring-sky-400/60",
  },
  amber: {
    glow: "bg-amber-500/25",
    tile: "bg-gradient-to-br from-amber-300 to-amber-500",
    iconColor: "text-amber-950",
    divider: "bg-amber-400/25",
    volumeBadge:
      "bg-amber-400/15 text-amber-100 ring-1 ring-inset ring-amber-300/40",
    perDocChip: "bg-white/5 text-white/80 ring-1 ring-inset ring-white/10",
    cta: "bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-amber-500/40",
    check: "text-amber-300",
    cardHover: "hover:border-amber-400/50",
    ring: "ring-amber-300/70",
  },
  violet: {
    glow: "bg-violet-500/25",
    tile: "bg-gradient-to-br from-violet-400 to-violet-600",
    iconColor: "text-white",
    divider: "bg-violet-400/25",
    volumeBadge:
      "bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/30",
    perDocChip: "bg-white/5 text-white/80 ring-1 ring-inset ring-white/10",
    cta: "bg-violet-500 text-white hover:bg-violet-400 shadow-violet-500/40",
    check: "text-violet-300",
    cardHover: "hover:border-violet-400/40",
    ring: "ring-violet-400/60",
  },
};

function HighVolumeSection({
  tiers,
}: {
  tiers: (typeof PRICING_TIERS)[number][];
}) {
  return (
    <section className="relative mt-20 overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-900 via-[#091426] to-black p-8 md:p-12">
      {/* Ambient background decor — subtle radial glows in the corners. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative">
        {/* Header row */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-200 ring-1 ring-inset ring-white/10">
              <TrendingUp size={12} strokeWidth={3} aria-hidden />
              Μεγαλύτερος όγκος
            </p>
            <h3 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Πακέτα για επιχειρήσεις{" "}
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-100 bg-clip-text text-transparent">
                υψηλού όγκου
              </span>
            </h3>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/70">
              Πάνω από 18.000 παραστατικά/έτος; Επίλεξε το επίπεδο που ταιριάζει
              στη ροή σου. Custom SLA και ειδικές ανάγκες — έλα να μιλήσουμε.
            </p>
          </div>
          <a
            href="/contact"
            className="group inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 text-sm font-bold text-white backdrop-blur transition-all hover:border-white/40 hover:bg-white/10"
          >
            <Sparkles size={15} strokeWidth={2.5} aria-hidden />
            Επικοινωνία με πωλήσεις
            <ArrowRight
              size={15}
              strokeWidth={2.5}
              className="transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </a>
        </div>

        {/* Tier cards */}
        <div className="mt-10 grid gap-5 md:grid-cols-3 lg:gap-6">
          {tiers.map((t) => (
            <HighVolumeCard key={t.code} tier={t} />
          ))}
        </div>

        {/* B2G add-on card — richer than the previous dashed strip. */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/30">
              <Landmark size={20} strokeWidth={2.5} className="text-emerald-300" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-black text-white">
                B2G add-on{" "}
                <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-white/50">
                  προαιρετικά
                </span>
              </p>
              <p className="mt-0.5 text-sm text-white/70">
                Για έκδοση παραστατικών προς το δημόσιο — προσθέσιμο σε
                οποιοδήποτε πακέτο.
              </p>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 rounded-xl bg-emerald-500/15 px-4 py-2.5 ring-1 ring-inset ring-emerald-400/30">
            <Plus size={14} strokeWidth={3} className="self-center text-emerald-300" aria-hidden />
            <span className="text-lg font-extrabold tabular-nums text-emerald-200">
              {formatEur(B2G_ADDON_INCL_VAT)}
            </span>
            <span className="text-xs font-semibold text-emerald-200/70">
              /έτος
            </span>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-white/50">
          Όλες οι τιμές είναι ετήσιες και συμπεριλαμβάνουν ΦΠΑ 24%. Η αγορά
          του πακέτου ολοκληρώνεται μέσω του πιστοποιημένου παρόχου
          ηλεκτρονικής τιμολόγησης (Wrapp).
        </p>
      </div>
    </section>
  );
}

function HighVolumeCard({ tier }: { tier: (typeof PRICING_TIERS)[number] }) {
  const meta = HIGH_VOLUME_META[tier.code] ?? {
    icon: Rocket,
    accent: "sky" as const,
    volumeLabel: "",
    recommended: false,
  };
  const a = ACCENT_CLASSES[meta.accent];
  const Icon = meta.icon;
  // Cost per 1,000 documents — a compelling proof-point for volume buyers
  // who instinctively compute the unit economics. Rounded to two decimals.
  const perThousand = (tier.retailInclVat / tier.docsPerYear) * 1000;

  return (
    <div
      className={
        "group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.07] " +
        a.cardHover +
        (meta.recommended
          ? " ring-2 ring-offset-4 ring-offset-transparent " + a.ring
          : "")
      }
    >
      {meta.recommended && (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-950 shadow-lg shadow-amber-500/30">
          <Zap size={11} strokeWidth={3} aria-hidden />
          Δημοφιλέστερο
        </span>
      )}

      {/* Icon + volume badge row */}
      <div className="flex items-start justify-between">
        <div className="relative">
          <div
            aria-hidden
            className={"absolute inset-0 rounded-2xl blur-xl " + a.glow}
          />
          <div
            className={
              "relative grid h-14 w-14 place-items-center rounded-2xl shadow-lg " +
              a.tile
            }
          >
            <Icon size={26} strokeWidth={2.5} className={a.iconColor} aria-hidden />
          </div>
        </div>
        <span
          className={
            "rounded-lg px-2.5 py-1 text-[11px] font-black tabular-nums " +
            a.volumeBadge
          }
        >
          {meta.volumeLabel} docs
        </span>
      </div>

      {/* Tier name */}
      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
        Επίπεδο
      </p>
      <h4 className="mt-1 text-2xl font-extrabold text-white">{tier.name}</h4>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {tier.tagline}
      </p>

      {/* Price */}
      <div className="mt-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold tracking-tight text-white lg:text-[42px]">
            {formatEur(tier.retailInclVat)}
          </span>
          <span className="text-sm font-medium text-white/50">/έτος</span>
        </div>
        <div className={"mt-3 h-px w-full " + a.divider} />
        <p
          className={
            "mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold tabular-nums " +
            a.perDocChip
          }
        >
          {formatEur(perThousand)} ανά 1.000 παραστατικά
        </p>
      </div>

      {/* Feature list */}
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check
              size={16}
              strokeWidth={3}
              className={"mt-0.5 shrink-0 " + a.check}
              aria-hidden
            />
            <span className="text-white/85">{f}</span>
          </li>
        ))}
      </ul>

      {/* Per-tier CTA — replaces the single global button, easier conversion */}
      <a
        href="/register"
        className={
          "mt-7 group/cta inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5 " +
          a.cta
        }
      >
        Ξεκίνα με {tier.name}
        <ArrowRight
          size={15}
          strokeWidth={2.75}
          className="transition-transform group-hover/cta:translate-x-0.5"
          aria-hidden
        />
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

