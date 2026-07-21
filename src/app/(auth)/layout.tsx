import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

// Single centered auth surface: white bg, one card, big logo above.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black antialiased">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10 md:px-8 md:py-14">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="timologion" className="shrink-0">
            <span className="hidden md:inline">
              <Logo size="xl" priority />
            </span>
            <span className="md:hidden">
              <Logo size="md" priority />
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-brand-900 bg-white px-3 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-900 hover:text-white sm:h-12 sm:gap-2 sm:px-5 sm:text-base"
            aria-label="Αρχική"
          >
            <ArrowLeft size={16} aria-hidden />
            <span className="hidden sm:inline">Αρχική</span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8 md:py-16">
          <div className="rounded-3xl border-2 border-black/10 bg-white p-5 shadow-soft sm:p-8 md:p-14">
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-black/50 md:mt-8 md:text-sm">
            Η φοροσήμανση και η διαβίβαση στο myDATA πραγματοποιούνται από τον
            συνεργαζόμενο πάροχο ηλεκτρονικής τιμολόγησης.
          </p>
        </div>
      </div>
    </div>
  );
}
