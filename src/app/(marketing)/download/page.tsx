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
} from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Εγκατάσταση — Desktop & Mobile Εφαρμογή",
  description:
    "Λήψη της timologion desktop και mobile εφαρμογής. Πρόσβαση στην ηλεκτρονική τιμολόγηση από παντού, χωρίς browser.",
  path: "/download",
});

const PLATFORMS = [
  {
    name: "Windows",
    icon: Monitor,
    desc: "Windows 10 ή νεότερο (64-bit)",
    fileSize: "≈ 85 MB",
  },
  {
    name: "macOS",
    icon: Apple,
    desc: "macOS 12 (Monterey) ή νεότερο · Intel & Apple Silicon",
    fileSize: "≈ 92 MB",
  },
  {
    name: "iOS",
    icon: Smartphone,
    desc: "iPhone & iPad · iOS 16 ή νεότερο",
    fileSize: "App Store",
  },
  {
    name: "Android",
    icon: Smartphone,
    desc: "Android 10 ή νεότερο",
    fileSize: "Google Play",
  },
];

export default function DownloadPage() {
  return (
    <main className="bg-gradient-to-b from-brand-50/50 to-white pb-24 pt-16 md:pt-24">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-800">
            <Clock size={13} strokeWidth={2.5} />
            Έρχεται σύντομα
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-brand-900 md:text-5xl lg:text-6xl">
            Εγκατάσταση timologion σε desktop & κινητό
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

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 lg:gap-6">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.name}
                className="flex items-start gap-4 rounded-2xl border-2 border-ink-300 bg-white p-5 md:p-6"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
                  <Icon size={22} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-extrabold text-brand-900">
                      {p.name}
                    </p>
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-800">
                      Έρχεται σύντομα
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-700">{p.desc}</p>
                  <p className="mt-2 text-xs text-ink-500">{p.fileSize}</p>
                  <button
                    type="button"
                    disabled
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border-2 border-ink-300 bg-ink-100 px-4 text-sm font-bold text-ink-500"
                  >
                    <Download size={14} strokeWidth={2.5} aria-hidden />
                    Λήψη — μη διαθέσιμη ακόμη
                  </button>
                </div>
              </div>
            );
          })}
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
