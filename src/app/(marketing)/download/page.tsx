import type { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  Apple,
  Monitor,
  Smartphone,
  Bell,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Εγκατάσταση — Desktop & Mobile Εφαρμογή",
  description:
    "Λήψη της timologion desktop και mobile εφαρμογής. Πρόσβαση στην ηλεκτρονική τιμολόγηση από παντού, χωρίς browser.",
  path: "/download",
});

type Platform = {
  name: string;
  icon: typeof Monitor;
  requirements: string[];
  storeLabel: string;
  accent: string;
  iconBg: string;
};

const PLATFORMS: Platform[] = [
  {
    name: "Windows",
    icon: Monitor,
    requirements: ["Windows 10 ή νεότερο", "Αρχιτεκτονική 64-bit", "≈ 85 MB"],
    storeLabel: "Native installer (.exe)",
    accent: "from-sky-500/20 to-transparent",
    iconBg: "bg-sky-100 text-sky-800",
  },
  {
    name: "macOS",
    icon: Apple,
    requirements: [
      "macOS 12 Monterey ή νεότερο",
      "Intel & Apple Silicon (universal)",
      "≈ 92 MB",
    ],
    storeLabel: "Native installer (.dmg)",
    accent: "from-slate-500/20 to-transparent",
    iconBg: "bg-slate-100 text-slate-800",
  },
  {
    name: "iOS",
    icon: Smartphone,
    requirements: ["iPhone & iPad", "iOS 16 ή νεότερο", "Optimized για iPad"],
    storeLabel: "Διαθέσιμο στο App Store",
    accent: "from-violet-500/20 to-transparent",
    iconBg: "bg-violet-100 text-violet-800",
  },
  {
    name: "Android",
    icon: Smartphone,
    requirements: [
      "Android 10 ή νεότερο",
      "Material You theming",
      "Widget οικονομικών",
    ],
    storeLabel: "Διαθέσιμο στο Google Play",
    accent: "from-emerald-500/20 to-transparent",
    iconBg: "bg-emerald-100 text-emerald-800",
  },
];

export default function DownloadPage() {
  return (
    <main className="bg-gradient-to-b from-brand-50/50 to-white pb-24 pt-16 md:pt-24">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-900 md:text-5xl lg:text-6xl">
            Εγκατάσταση timologion σε desktop &amp; κινητό
          </h1>
          <p className="mt-5 text-lg text-ink-700 md:text-xl">
            Στην τρέχουσα φάση, το timologion είναι πλήρως διαθέσιμο στον
            browser σου — χωρίς εγκατάσταση, χωρίς update. Οι native
            εφαρμογές για desktop και κινητό βρίσκονται σε εξέλιξη και θα
            κυκλοφορήσουν σύντομα.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-13 items-center gap-2 rounded-full bg-brand-900 px-6 py-3 text-base font-bold text-white hover:bg-black"
            >
              Δωρεάν χρήση στον browser
              <ArrowRight size={18} aria-hidden />
            </Link>
            <NotifyMeButton />
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-2 lg:gap-6">
          {PLATFORMS.map((p) => (
            <PlatformCard key={p.name} platform={p} />
          ))}
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
          <FeatureBadge
            icon={ShieldCheck}
            title="Ίδια ασφάλεια"
            desc="Οι εφαρμογές θα συνδέονται στους ίδιους servers με τα ίδια διαπιστευτήρια."
          />
          <FeatureBadge
            icon={Bell}
            title="Push notifications"
            desc="Ειδοποιήσεις για ληξιπρόθεσμα, νέες πληρωμές και ραντεβού."
          />
          <FeatureBadge
            icon={Clock}
            title="Offline drafts"
            desc="Δημιουργία πρόχειρων παραστατικών χωρίς σύνδεση, με συγχρονισμό όταν επιστρέψεις."
          />
        </div>

        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border-2 border-brand-900/10 bg-white p-6 text-center md:p-8">
          <p className="text-sm text-ink-700">
            Θέλεις να σε ενημερώσουμε μόλις κυκλοφορήσει η εφαρμογή;
          </p>
          <p className="mt-2 text-base font-semibold text-brand-900">
            Στείλε μας email στο{" "}
            <a
              href="mailto:support@timologion.gr?subject=Desktop app — ενημέρωση κυκλοφορίας"
              className="underline underline-offset-4 hover:text-black"
            >
              support@timologion.gr
            </a>{" "}
            με θέμα «Desktop app — ενημέρωση κυκλοφορίας».
          </p>
        </div>
      </Container>
    </main>
  );
}

function PlatformCard({ platform }: { platform: Platform }) {
  const Icon = platform.icon;
  return (
    <div className="group relative overflow-hidden rounded-3xl border-2 border-ink-300/70 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg md:p-7">
      {/* Subtle brand-tinted accent gradient in the top-right corner. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${platform.accent} blur-2xl`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${platform.iconBg}`}
        >
          <Icon size={26} strokeWidth={2} aria-hidden />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800">
          <Clock size={10} strokeWidth={3} aria-hidden />
          Έρχεται σύντομα
        </span>
      </div>

      <h2 className="relative mt-5 text-2xl font-extrabold text-brand-900">
        {platform.name}
      </h2>
      <p className="relative mt-1 text-sm font-semibold text-ink-700">
        {platform.storeLabel}
      </p>

      <ul className="relative mt-4 space-y-1.5">
        {platform.requirements.map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm text-ink-700">
            <CheckCircle2
              size={15}
              strokeWidth={2.5}
              className="mt-0.5 shrink-0 text-emerald-600"
              aria-hidden
            />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled
        className="relative mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink-300 bg-ink-100 px-4 text-sm font-bold text-ink-500"
      >
        <Download size={15} strokeWidth={2.5} aria-hidden />
        Μη διαθέσιμη ακόμη
      </button>
    </div>
  );
}

function FeatureBadge({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-ink-300/70 bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-800">
        <Icon size={18} aria-hidden />
      </div>
      <p className="mt-3 font-bold text-brand-900">{title}</p>
      <p className="mt-1 text-sm text-ink-700">{desc}</p>
    </div>
  );
}

function NotifyMeButton() {
  return (
    <a
      href="mailto:support@timologion.gr?subject=Desktop app — ενημέρωση κυκλοφορίας&body=Θα ήθελα να με ενημερώσετε όταν κυκλοφορήσει η desktop / mobile εφαρμογή του timologion."
      className="inline-flex h-13 items-center gap-2 rounded-full border-2 border-brand-900 bg-white px-6 py-3 text-base font-bold text-brand-900 hover:bg-brand-900 hover:text-white"
    >
      <Bell size={18} aria-hidden />
      Ενημέρωσέ με όταν κυκλοφορήσει
    </a>
  );
}
