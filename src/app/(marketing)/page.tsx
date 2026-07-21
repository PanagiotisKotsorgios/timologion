import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/marketing/Container";

const BULLETS = [
  "Ρύθμιση σε 5 λεπτά",
  "Δωρεάν δοκιμή 14 ημερών",
  "Χωρίς κάρτα, χωρίς δέσμευση",
];

const STEPS = [
  {
    n: "01",
    title: "Δημιούργησε λογαριασμό",
    body: "Εγγραφή σε λίγα δευτερόλεπτα με ΑΦΜ και βασικά στοιχεία επιχείρησης.",
  },
  {
    n: "02",
    title: "Πρόσθεσε πελάτες και είδη",
    body: "Αναζήτηση με ΑΦΜ για αυτόματη συμπλήρωση. Κατάλογος υπηρεσιών και προϊόντων.",
  },
  {
    n: "03",
    title: "Εξέδωσε το πρώτο σου παραστατικό",
    body: "Τύπος, γραμμές, έκδοση. PDF, αποστολή email, οργάνωση.",
  },
];

const FEATURES = [
  { title: "Τιμολόγια & Αποδείξεις", body: "Πώληση, παροχή υπηρεσιών, λιανική, πιστωτικά." },
  { title: "Δελτία αποστολής", body: "Συνδεδεμένα με παραγγελίες και πελάτες." },
  { title: "Προσφορές & Προτιμολόγια", body: "Μετατροπή σε τιμολόγιο με ένα κλικ." },
  { title: "Επαναλαμβανόμενα παραστατικά", body: "Ρύθμισε μία φορά, εκδίδονται αυτόματα." },
  { title: "PDF & αποστολή email", body: "Στέλνεις το παραστατικό σε πελάτη ή λογιστή." },
  { title: "Αναφορές & εξαγωγές", body: "Έσοδα, ΦΠΑ, ανεξόφλητα σε Excel και CSV." },
  { title: "Ρόλοι & δικαιώματα", body: "Owner, admin, λογιστής, πωλητής, staff." },
  { title: "Πολλαπλές επιχειρήσεις", body: "Ένας λογαριασμός, όσες εταιρείες χρειάζεσαι." },
  { title: "Ασφάλεια & backups", body: "Argon2id, HTTPS, καθημερινά αντίγραφα ασφαλείας." },
];

const SECTORS = [
  {
    title: "Ελεύθεροι επαγγελματίες",
    body: "Γιατροί, μηχανικοί, σύμβουλοι, τεχνικοί.",
  },
  {
    title: "Μικρές επιχειρήσεις",
    body: "Εμπόριο, υπηρεσίες, e-shop.",
  },
  {
    title: "Λιανική & εστίαση",
    body: "Γρήγορη πώληση, POS, τραπέζια.",
  },
];

const STATS = [
  { v: "3", l: "κλικ έως το πρώτο σου παραστατικό" },
  { v: "24/7", l: "πρόσβαση από κινητό, tablet, desktop" },
  { v: "GR", l: "hosted, γραμμένο για την ελληνική αγορά" },
];

export default function LandingPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section
        className="relative"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(255,255,255,0.55) 0%, rgba(230,240,253,0.55) 50%, rgba(198,220,248,0.5) 100%), url(/screens/hero-bg.png)",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <Container className="relative pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="max-w-6xl">
            <p
              className="eyebrow text-brand-900/70 rise-in"
              style={{ animationDelay: "0.05s" }}
            >
              Ανοιχτή δοκιμή για επιχειρήσεις
            </p>
            <h1
              className="text-hero mt-6 text-brand-900 rise-in"
              style={{ animationDelay: "0.15s" }}
            >
              Ηλεκτρονική τιμολόγηση για την επιχείρησή σου.
            </h1>
            <p
              className="mt-8 max-w-3xl text-xl leading-relaxed text-black/70 md:text-2xl rise-in"
              style={{ animationDelay: "0.3s" }}
            >
              Απλή, καθαρή εφαρμογή τιμολόγησης που δουλεύει όπως δουλεύεις.
              Πελατολόγιο, είδη, παραστατικά και αναφορές σε ένα dashboard.
            </p>

            <div
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 rise-in"
              style={{ animationDelay: "0.45s" }}
            >
              <Link
                href="/register"
                className="inline-flex h-14 items-center justify-center rounded-full bg-brand-900 px-8 text-base font-semibold text-white transition-all hover:bg-black hover:shadow-soft sm:h-16 sm:px-10 sm:text-lg"
              >
                Ξεκίνα δωρεάν
              </Link>
              <Link
                href="/features"
                className="inline-flex h-14 items-center justify-center rounded-full border-2 border-brand-900 px-8 text-base font-semibold text-brand-900 transition-colors hover:bg-brand-900 hover:text-white sm:h-16 sm:px-10 sm:text-lg"
              >
                Δες τι μπορεί να κάνει
              </Link>
            </div>

            <ul
              className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-base text-black/60 rise-in"
              style={{ animationDelay: "0.6s" }}
            >
              {BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <CheckDot />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        className="relative border-t border-black/[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.86), rgba(255,255,255,0.86)), url(/screens/hero-illustration.png)",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <Container className="relative py-24 md:py-36">
          <p className="eyebrow text-brand-900/70">Πώς δουλεύει</p>
          <h2 className="text-display mt-6 max-w-3xl text-brand-900">
            Τρία βήματα από το τίποτα στο οργανωμένο.
          </h2>

          <div className="mt-20 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border-t-4 border-brand-900 bg-white/85 p-8 shadow-sm backdrop-blur"
              >
                <p className="text-6xl font-extrabold text-brand-900 md:text-7xl">
                  {s.n}
                </p>
                <h3 className="mt-8 text-2xl font-bold text-black md:text-3xl">
                  {s.title}
                </h3>
                <p className="mt-4 text-lg text-black/70">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── DOCUMENTS SHOWCASE ─── */}
      <section className="border-t border-black/[0.08] bg-brand-50/40">
        <Container className="py-24 md:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="eyebrow text-brand-900/70">Παραστατικά</p>
              <h2 className="text-display mt-6 text-brand-900">
                Όλα σου τα παραστατικά σε μια εικόνα.
              </h2>
              <p className="mt-6 text-lg text-black/70">
                Αναζήτηση, φίλτρα ανά τύπο και σειρά, ταξινόμηση, εξαγωγή —
                όλα με μια ματιά. Δεξί κλικ σε ένα παραστατικό για γρήγορες
                ενέργειες.
              </p>
              <ul className="mt-8 space-y-3 text-base text-black/80">
                <li className="flex items-center gap-3">
                  <CheckDot />
                  Αναζήτηση σε ΑΦΜ, πελάτη και σειρά
                </li>
                <li className="flex items-center gap-3">
                  <CheckDot />
                  Φίλτρα τύπου, κατάστασης και ημερομηνιών
                </li>
                <li className="flex items-center gap-3">
                  <CheckDot />
                  Έκδοση, εκτύπωση, αντιγραφή — από δεξί κλικ
                </li>
              </ul>
            </div>
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border-2 border-black/10 bg-white p-2 shadow-soft md:p-3">
                <Image
                  src="/screens/documents.jpg"
                  alt="Λίστα παραστατικών"
                  width={2400}
                  height={1440}
                  className="h-auto w-full rounded-xl"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── STATS SHOWCASE ─── */}
      <section className="bg-white">
        <Container className="py-24 md:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7 lg:order-1">
              <div className="relative overflow-hidden rounded-2xl border-2 border-black/10 bg-white p-2 shadow-soft md:p-3">
                <Image
                  src="/screens/statistics.jpg"
                  alt="Στατιστικά εσόδων"
                  width={2400}
                  height={1500}
                  className="h-auto w-full rounded-xl"
                />
              </div>
            </div>
            <div className="lg:col-span-5 lg:order-2">
              <p className="eyebrow text-brand-900/70">Στατιστικά</p>
              <h2 className="text-display mt-6 text-brand-900">
                Έσοδα σε πραγματικό χρόνο, ξεκάθαρα.
              </h2>
              <p className="mt-6 text-lg text-black/70">
                Έσοδα του μήνα, YTD, μέση αξία παραστατικού, top πελάτες, με
                interactive γραφήματα και ετήσια σύγκριση.
              </p>
              <ul className="mt-8 space-y-3 text-base text-black/80">
                <li className="flex items-center gap-3">
                  <CheckDot />
                  Interactive γραφήματα με hover tooltips
                </li>
                <li className="flex items-center gap-3">
                  <CheckDot />
                  Σύγκριση μηνών και ετών με σε πραγματικό χρόνο
                </li>
                <li className="flex items-center gap-3">
                  <CheckDot />
                  Top πελάτες με πραγματικά νούμερα
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="border-t border-black/[0.08] bg-white">
        <Container className="py-24 md:py-36">
          <p className="eyebrow text-brand-900/70">Χαρακτηριστικά</p>
          <h2 className="text-display mt-6 max-w-3xl text-brand-900">
            Όλα όσα χρειάζεσαι για την τιμολόγηση.
          </h2>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border-2 border-black/10 bg-white p-8 transition-all hover:border-brand-900 hover:shadow-soft"
              >
                <h3 className="text-2xl font-bold text-black">{f.title}</h3>
                <p className="mt-4 text-lg text-black/70">{f.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── SECTORS (NAVY BLOCK) ─── */}
      <section className="bg-brand-900 text-white">
        <Container className="py-24 md:py-36">
          <p className="eyebrow text-white/60">Για κάθε κλάδο</p>
          <h2 className="text-display mt-6 max-w-3xl">
            Ηλεκτρονική τιμολόγηση για όλα τα σχήματα επιχείρησης.
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {SECTORS.map((s) => (
              <div
                key={s.title}
                className="rounded-3xl border-2 border-white/15 p-10 transition-colors hover:border-white/40"
              >
                <h3 className="text-2xl font-bold md:text-3xl">{s.title}</h3>
                <p className="mt-4 text-lg text-white/70">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── STATS ─── */}
      <section className="border-b border-black/[0.08] bg-white">
        <Container className="grid gap-12 py-20 md:grid-cols-3 md:py-28">
          {STATS.map((s) => (
            <div key={s.l} className="border-t-2 border-brand-900 pt-8">
              <p className="text-7xl font-extrabold text-brand-900 md:text-8xl">
                {s.v}
              </p>
              <p className="mt-4 max-w-xs text-lg text-black/70">{s.l}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* ─── INVOICE EDITOR + CONFIG SHOWCASE ─── */}
      <section className="bg-brand-50/40 border-t border-black/[0.06]">
        <Container className="py-24 md:py-32">
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-900/70">Ρυθμίσεις</p>
            <h2 className="text-display mt-6 text-brand-900">
              Στημένο για επαγγελματίες, ρυθμισμένο σε λεπτά.
            </h2>
            <p className="mt-6 text-lg text-black/70">
              Δημιούργησε παραστατικά με έξυπνες προεπιλογές, όρισε σειρές
              και σύνδεσε τα διαπιστευτήρια ΓΓΠΣ για αυτόματη αναζήτηση ΑΦΜ.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 relative overflow-hidden rounded-2xl border-2 border-black/10 bg-white p-2 shadow-soft md:p-3">
              <Image
                src="/screens/invoice-editor.jpg"
                alt="Έκδοση παραστατικού"
                width={2400}
                height={1600}
                className="h-auto w-full rounded-xl"
              />
            </div>
            <div className="grid gap-6">
              <div className="relative overflow-hidden rounded-2xl border-2 border-black/10 bg-white p-2 shadow-soft md:p-3">
                <Image
                  src="/screens/billing-books.jpg"
                  alt="Σειρές παραστατικών"
                  width={2400}
                  height={1440}
                  className="h-auto w-full rounded-xl"
                />
              </div>
              <div className="relative overflow-hidden rounded-2xl border-2 border-black/10 bg-white p-2 shadow-soft md:p-3">
                <Image
                  src="/screens/aade.jpg"
                  alt="ΓΓΠΣ αναζήτηση ΑΦΜ"
                  width={2400}
                  height={1440}
                  className="h-auto w-full rounded-xl"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── CLOSING CTA ─── */}
      <section className="bg-white">
        <Container className="py-24 md:py-36">
          <div className="rounded-3xl bg-brand-900 px-8 py-20 text-white md:px-20 md:py-28">
            <div className="max-w-3xl">
              <p className="eyebrow text-white/60">Έτοιμος να ξεκινήσεις;</p>
              <h2 className="text-display mt-6">
                Το πρώτο σου παραστατικό απέχει ένα κλικ.
              </h2>
              <div className="mt-12 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex h-16 items-center rounded-full bg-white px-10 text-lg font-semibold text-brand-900 transition-transform hover:-translate-y-0.5"
                >
                  Ξεκίνα δωρεάν
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-16 items-center rounded-full border-2 border-white px-10 text-lg font-semibold text-white transition-colors hover:bg-white hover:text-brand-900"
                >
                  Δες κόστος
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function CheckDot() {
  return (
    <span
      aria-hidden
      className="grid h-6 w-6 place-items-center rounded-full bg-brand-900 text-white"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 10.5 3 3 7-7" />
      </svg>
    </span>
  );
}

