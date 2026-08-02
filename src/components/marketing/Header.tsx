"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  Rocket,
  Menu,
  X,
  Sparkles,
  Tag,
  BookOpen,
  MessageSquare,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Container } from "./Container";

const NAV: {
  href: string;
  label: string;
  desc: string;
  icon: typeof Sparkles;
}[] = [
  {
    href: "/features",
    label: "Χαρακτηριστικά",
    desc: "Παραστατικά, POS, CRM, αναφορές",
    icon: Sparkles,
  },
  {
    href: "/pricing",
    label: "Κόστος",
    desc: "Δωρεάν και επί πληρωμή πλάνα",
    icon: Tag,
  },
  {
    href: "/guides",
    label: "Οδηγίες",
    desc: "6 σύντομοι πρακτικοί οδηγοί",
    icon: BookOpen,
  },
  {
    href: "/contact",
    label: "Επικοινωνία",
    desc: "Στείλε μας μήνυμα",
    icon: MessageSquare,
  },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.08] bg-white/85 backdrop-blur-md">
      <Container>
        <div className="flex h-20 items-center justify-between gap-4 md:h-28 md:gap-10">
          <Link
            href="/"
            aria-label="timologion"
            className="inline-flex items-center"
          >
            <span className="hidden md:inline">
              <Logo size="xl" priority />
            </span>
            <span className="md:hidden">
              <Logo size="md" priority />
            </span>
          </Link>

          <nav className="hidden gap-10 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-[17px] font-semibold text-black transition-opacity hover:opacity-60"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/login"
              className="hidden h-14 items-center gap-2 rounded-full border-2 border-brand-900 bg-white px-6 text-[16px] font-semibold text-brand-900 transition-colors hover:bg-brand-900 hover:text-white md:inline-flex"
            >
              <LogIn size={18} aria-hidden />
              Σύνδεση
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-900 px-4 text-sm font-semibold text-white transition-all hover:bg-black hover:shadow-soft md:h-14 md:px-6 md:text-[16px]"
            >
              <Rocket size={16} className="md:hidden" aria-hidden />
              <Rocket size={18} className="hidden md:block" aria-hidden />
              Ξεκινήστε Δωρεάν
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full border-2 border-brand-900 bg-white text-brand-900 lg:hidden"
              aria-label="Άνοιγμα μενού"
              aria-expanded={open}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile drawer — full screen, centered content */}
      <div
        className={
          "fixed inset-0 z-[100] lg:hidden " +
          (open ? "pointer-events-auto" : "pointer-events-none")
        }
        aria-hidden={!open}
        style={{ display: open ? "block" : "none" }}
      >
        <div
          className="flex flex-col text-white"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: "100dvh",
            backgroundColor: "#0B1B3A",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <Link href="/" className="inline-flex rounded-xl bg-white p-2">
              <Logo size="md" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Κλείσιμο"
            >
              <X size={22} />
            </button>
          </div>

          {/* Scrollable body — centered content */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-8">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">
                Μενού
              </p>

              <ul className="mt-6 space-y-2.5">
                {NAV.map((n) => {
                  const Icon = n.icon;
                  const active =
                    pathname === n.href ||
                    (n.href !== "/" && pathname.startsWith(n.href + "/"));
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        className={
                          "group flex items-center gap-4 rounded-2xl border-2 px-4 py-4 transition-colors " +
                          (active
                            ? "border-white bg-white text-brand-900"
                            : "border-white/15 bg-white/5 text-white hover:border-white/40 hover:bg-white/10")
                        }
                      >
                        <span
                          className={
                            "grid h-11 w-11 shrink-0 place-items-center rounded-xl " +
                            (active ? "bg-brand-900 text-white" : "bg-white/10 text-white")
                          }
                        >
                          <Icon size={20} aria-hidden />
                        </span>
                        <span className="flex-1">
                          <span className="block text-base font-bold">
                            {n.label}
                          </span>
                          <span
                            className={
                              "block text-xs " +
                              (active ? "text-brand-800/70" : "text-white/60")
                            }
                          >
                            {n.desc}
                          </span>
                        </span>
                        <ArrowRight
                          size={16}
                          className={
                            active ? "text-brand-900" : "text-white/50"
                          }
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">
                  Λογαριασμός
                </p>
                <div className="mt-4 space-y-3">
                  <Link
                    href="/login"
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-white/40 bg-transparent text-base font-semibold text-white hover:bg-white/10"
                  >
                    <LogIn size={18} aria-hidden />
                    Σύνδεση
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-semibold text-brand-900 hover:bg-white/90"
                  >
                    <Rocket size={18} aria-hidden />
                    Ξεκίνα δωρεάν
                  </Link>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/60">
                <a
                  href="mailto:support@timologion.gr"
                  className="inline-flex items-center gap-1.5 hover:text-white"
                >
                  <Mail size={12} aria-hidden />
                  support@timologion.gr
                </a>
                <a
                  href="tel:+302631028971"
                  className="inline-flex items-center gap-1.5 hover:text-white"
                >
                  <Phone size={12} aria-hidden />
                  +30 2631 028971
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
