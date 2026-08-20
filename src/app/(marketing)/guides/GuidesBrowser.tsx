"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search, X } from "lucide-react";
import type { Guide, GuideCategory } from "./content";

/**
 * Client-side browser for /guides. Ships the full guide list
 * (~13 rows × short strings — a few KB) so filtering happens
 * without a round-trip on every keystroke. Every guide is
 * server-rendered inside the initial DOM so search-engine crawlers
 * still see the full catalogue for indexing.
 *
 * Features:
 *   · Live keyword search — matches title, intro, category, keywords
 *     as you type. Case + accent-insensitive.
 *   · Category chips — one-click filter to a single section.
 *   · Result count that updates in real time.
 *   · Empty state pointing at /contact when nothing matches.
 */
export function GuidesBrowser({ guides }: { guides: Guide[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GuideCategory | null>(
    null,
  );

  const categories = useMemo(() => {
    const seen = new Map<GuideCategory, number>();
    for (const g of guides) {
      seen.set(g.category, (seen.get(g.category) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }, [guides]);

  const filtered = useMemo(() => {
    const q = normalise(query);
    return guides.filter((g) => {
      if (activeCategory && g.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = normalise(
        [
          g.title,
          g.intro,
          g.category,
          (g.keywords ?? []).join(" "),
          g.sections.map((s) => `${s.heading} ${s.body}`).join(" "),
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [guides, query, activeCategory]);

  return (
    <>
      {/* Search + category filter row */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/40">
            <Search size={20} strokeWidth={2.25} aria-hidden />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση σε 13 οδηγούς — π.χ. τιμολόγιο, πιστωτικό, POS, myDATA…"
            aria-label="Αναζήτηση οδηγών"
            className="h-14 w-full rounded-2xl border-2 border-black/10 bg-white pl-12 pr-12 text-base font-medium text-black shadow-sm placeholder:font-normal placeholder:text-black/40 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Καθαρισμός αναζήτησης"
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-black/50 hover:bg-black/5 hover:text-black"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip
            label={`Όλα (${guides.length})`}
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {categories.map(({ category, count }) => (
            <FilterChip
              key={category}
              label={`${category} (${count})`}
              active={activeCategory === category}
              onClick={() =>
                setActiveCategory(activeCategory === category ? null : category)
              }
            />
          ))}
        </div>

        <p className="text-sm font-medium text-black/60">
          {filtered.length === guides.length
            ? `${guides.length} οδηγοί συνολικά`
            : `${filtered.length} από ${guides.length} οδηγούς`}
          {query && (
            <>
              {" — για «"}
              <strong className="text-brand-900">{query}</strong>»
            </>
          )}
        </p>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-black/10 bg-brand-50/40 p-10 text-center">
          <p className="text-lg font-bold text-brand-900">
            Δεν βρέθηκε οδηγός για «{query}».
          </p>
          <p className="mt-2 text-sm text-black/70">
            Δοκίμασε πιο γενικό όρο, ή στείλε μας το ερώτημα —
            απαντάμε την ίδια εργάσιμη.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-bold text-white"
          >
            Επικοινωνία με την υποστήριξη
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="group flex h-full flex-col rounded-2xl border-2 border-black/[0.08] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lg"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-brand-900/70">
                    {g.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50">
                    <Clock size={12} aria-hidden />
                    {g.read}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-extrabold tracking-tightest text-brand-900">
                  {g.n}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-brand-900 group-hover:text-brand-800">
                  {g.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-black/70">
                  {g.intro}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-900">
                  Άνοιγμα οδηγού
                  <ArrowRight
                    size={14}
                    strokeWidth={2.5}
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "inline-flex h-9 items-center rounded-full border-2 px-3 text-xs font-black uppercase tracking-widest transition-colors " +
        (active
          ? "border-brand-900 bg-brand-900 text-white"
          : "border-black/10 bg-white text-black/70 hover:border-brand-500 hover:text-brand-900")
      }
    >
      {label}
    </button>
  );
}

/** Lower-case + strip Greek tonos so "τιμολόγιο" matches "τιμολογιο". */
function normalise(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
