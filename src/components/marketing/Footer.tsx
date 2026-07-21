import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Container } from "./Container";
import { NewsletterForm } from "./NewsletterForm";

const COLUMNS = [
  {
    heading: "Προϊόν",
    links: [
      { href: "/features", label: "Χαρακτηριστικά" },
      { href: "/features#documents", label: "Παραστατικά" },
      { href: "/features#clients", label: "Πελατολόγιο" },
      { href: "/features#items", label: "Είδη & Υπηρεσίες" },
      { href: "/features#payments", label: "Πληρωμές" },
      { href: "/features#pos", label: "POS & Ταμείο" },
      { href: "/features#crm", label: "CRM" },
      { href: "/features#reports", label: "Αναφορές" },
      { href: "/pricing", label: "Κόστος" },
    ],
  },
  {
    heading: "Πόροι",
    links: [
      { href: "/guides", label: "Όλες οι οδηγίες" },
      { href: "/guides/start", label: "Ξεκίνησε σε 5 λεπτά" },
      { href: "/guides/activate", label: "Ενεργοποίηση παρόχου" },
      { href: "/guides/first-client", label: "Πρώτος πελάτης" },
      { href: "/guides/first-invoice", label: "Πρώτο τιμολόγιο" },
      { href: "/guides/mydata", label: "MARK, UID, QR" },
      { href: "/guides/errors", label: "Διαχείριση σφαλμάτων" },
    ],
  },
  {
    heading: "Εταιρεία",
    links: [
      { href: "/contact", label: "Επικοινωνία" },
      { href: "/pricing", label: "Δοκιμαστική περίοδος" },
      { href: "/register", label: "Δημιουργία λογαριασμού" },
      { href: "/login", label: "Σύνδεση" },
      { href: "/contact", label: "Συνεργασίες" },
    ],
  },
  {
    heading: "Νομικά",
    links: [
      { href: "/terms", label: "Όροι χρήσης" },
      { href: "/privacy", label: "Πολιτική απορρήτου" },
      { href: "/cookies", label: "Πολιτική Cookies" },
    ],
  },
];

const CONTACT = [
  { label: "Υποστήριξη", value: "support@timologion.gr" },
  { label: "Συνεργασίες", value: "partners@timologion.gr" },
  { label: "Νομικά / privacy", value: "privacy@timologion.gr" },
  { label: "Τηλέφωνο", value: "+30 2631 028971" },
  { label: "Ωράριο", value: "Δευτ – Παρ · 09:00–18:00 (EET)" },
];

export function MarketingFooter() {
  return (
    <footer className="bg-brand-900 text-white">
      {/* Top band: brand + newsletter */}
      <Container className="border-b border-white/10 py-14 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <span className="inline-flex rounded-2xl bg-white p-4 md:p-5">
              <Logo size="xl" />
            </span>
            <p className="mt-6 max-w-xl text-xl font-semibold leading-tight text-white md:mt-10 md:text-3xl">
              Ηλεκτρονική τιμολόγηση σχεδιασμένη για ελληνικές επιχειρήσεις.
            </p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/70 md:mt-6 md:text-lg">
              Πελατολόγιο, είδη, παραστατικά και αναφορές σε ένα καθαρό
              dashboard — από τη Θεσσαλονίκη έως την Αθήνα και κάθε γειτονιά
              στη μέση.
            </p>
          </div>

          <div className="lg:col-span-6 lg:pl-10">
            <p className="eyebrow text-white/50">Newsletter</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white md:mt-4 md:text-4xl">
              Μείνε στην εικόνα.
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/70 md:mt-4 md:text-base">
              Νέα, οδηγοί και ενημερώσεις για το timologion και τη
              φορολογική νομοθεσία — στο email σου.
            </p>
            <div className="mt-6 max-w-xl md:mt-8">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </Container>

      {/* Middle band: link columns */}
      <Container className="border-b border-white/10 py-12 md:py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="eyebrow text-white/60">{col.heading}</h3>
              <ul className="mt-4 space-y-2 text-sm md:mt-6 md:space-y-3 md:text-[15px]">
                {col.links.map((l) => (
                  <li key={`${l.href}::${l.label}`}>
                    <Link
                      href={l.href}
                      className="block py-1 text-white/85 transition-opacity hover:text-white hover:opacity-100"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      {/* Contact band */}
      <Container className="border-b border-white/10 py-10 md:py-16">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5 md:gap-10">
          {CONTACT.map((c) => (
            <div key={c.label}>
              <p className="eyebrow text-white/50">{c.label}</p>
              <p className="mt-2 break-words text-sm font-semibold text-white md:mt-3 md:text-[15px]">
                {c.value}
              </p>
            </div>
          ))}
        </div>
      </Container>

      {/* Trusted partner band */}
      <Container className="border-b border-white/10 py-10 md:py-12">
        <div className="grid gap-6 md:grid-cols-3 md:items-center md:gap-8">
          <div className="md:col-span-1">
            <p className="eyebrow text-white/50">Συνεργαζόμενος πάροχος</p>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck size={18} className="text-emerald-400" />
              Πιστοποιημένος πάροχος ηλεκτρονικής τιμολόγησης
              (ΥΠΑΗΕΣ)
            </p>
          </div>
          <div className="md:col-span-2">
            <a
              href="https://wrapp.ai"
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 px-5 py-4 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-white md:gap-4 md:px-8 md:py-5"
              aria-label="Wrapp — Πιστοποιημένος πάροχος"
            >
              <Image
                src="/wrapp-partner.png"
                alt="Wrapp"
                width={220}
                height={72}
                className="h-8 w-auto md:h-12"
              />
              <span className="text-xs font-semibold text-brand-900 md:text-sm">
                Πάροχος ηλεκτρονικής τιμολόγησης
                <br />
                <span className="text-brand-800/60">
                  ΥΠΑΗΕΣ — myDATA διαβίβαση & φοροσήμανση
                </span>
              </span>
            </a>
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/60">
              Συνεργαζόμαστε με τη Wrapp, πιστοποιημένο πάροχο ηλεκτρονικής
              τιμολόγησης (ΥΠΑΗΕΣ). Όλα τα παραστατικά σου φοροσημαίνονται
              και διαβιβάζονται στο myDATA μέσω της Wrapp, ενώ το timologion
              σου δίνει καθαρό dashboard, πελατολόγιο και οργάνωση.
            </p>
          </div>
        </div>
      </Container>

      {/* Social + system */}
      <Container className="border-b border-white/10 py-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <SocialLink href="https://x.com" label="X">
              <TwitterIcon />
            </SocialLink>
            <SocialLink href="https://linkedin.com" label="LinkedIn">
              <LinkedInIcon />
            </SocialLink>
            <SocialLink href="https://facebook.com" label="Facebook">
              <FacebookIcon />
            </SocialLink>
            <SocialLink href="https://instagram.com" label="Instagram">
              <InstagramIcon />
            </SocialLink>
            <SocialLink href="https://youtube.com" label="YouTube">
              <YouTubeIcon />
            </SocialLink>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-white/60">
            <span>Έκδοση 1.0</span>
            <span>Ελληνικά</span>
          </div>
        </div>
      </Container>

      {/* Bottom copyright */}
      <Container className="py-8">
        <div className="flex flex-col gap-3 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} timologion. Όλα τα δικαιώματα διατηρούνται.</p>
          <p className="max-w-2xl md:text-right">
            Η φοροσήμανση και η διαβίβαση στο myDATA πραγματοποιούνται από τον
            συνεργαζόμενο πάροχο ηλεκτρονικής τιμολόγησης.
          </p>
        </div>
      </Container>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white hover:text-white"
    >
      {children}
    </a>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21.5l-7.5 8.577L23 22h-6.828l-4.994-6.53L5.5 22H2.244l8.024-9.17L1.5 2h6.984l4.517 5.973L18.244 2Zm-2.4 18h1.923L7.28 4H5.24l10.604 16Z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.881 3.87 6 2.5 6S0 4.881 0 3.5 1.12 1 2.5 1s2.48 1.119 2.48 2.5ZM.5 8h4v14h-4V8Zm7.5 0h3.845v1.928h.056c.535-1.012 1.844-2.08 3.797-2.08C19.848 7.848 21 10.29 21 14.058V22h-4v-7.037c0-1.678-.03-3.836-2.34-3.836-2.34 0-2.7 1.826-2.7 3.71V22h-4V8Z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.7c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5v1.8h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.3 2.4.5.6.2 1.1.6 1.6 1.1s.9 1 1.1 1.6c.2.5.4 1.2.5 2.4.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.3 1.9-.5 2.4-.2.6-.6 1.1-1.1 1.6s-1 .9-1.6 1.1c-.5.2-1.2.4-2.4.5-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.3-2.4-.5-.6-.2-1.1-.6-1.6-1.1s-.9-1-1.1-1.6c-.2-.5-.4-1.2-.5-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.3-1.9.5-2.4.2-.6.6-1.1 1.1-1.6s1-.9 1.6-1.1c.5-.2 1.2-.4 2.4-.5C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8s-.6.8-.8 1.3c-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3s.8.6 1.3.8c.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8s.6-.8.8-1.3c.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3s-.8-.6-1.3-.8c-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm6.3-8.3a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}
