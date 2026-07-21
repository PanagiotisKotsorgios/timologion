import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { GUIDES, getGuide, nextGuide, prevGuide } from "../content";

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: "Οδηγός · timologion" };
  return {
    title: `${g.title} · Οδηγοί · timologion`,
    description: g.intro,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const prev = prevGuide(slug);
  const next = nextGuide(slug);

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-900 text-white">
        <Container className="py-20 md:py-28">
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden />
            Πίσω στους οδηγούς
          </Link>

          <div className="mt-8 flex items-center gap-4">
            <span className="text-5xl font-extrabold tracking-tightest text-emerald-300 md:text-6xl">
              {guide.n}
            </span>
            <div>
              <p className="eyebrow text-white/60">{guide.category}</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/70">
                <Clock size={14} aria-hidden />
                {guide.read} ανάγνωσης
              </p>
            </div>
          </div>

          <h1 className="mt-8 max-w-4xl text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            {guide.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-white/75 md:text-xl">
            {guide.intro}
          </p>
        </Container>
      </section>

      {/* Content */}
      <section className="bg-white">
        <Container size="reading" className="py-20 md:py-28">
          <div className="space-y-16">
            {guide.sections.map((s, i) => (
              <article key={i} className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-900 text-white">
                    <CheckCircle2 size={18} aria-hidden />
                  </span>
                  <h2 className="text-2xl font-extrabold text-brand-900 md:text-3xl">
                    {s.heading}
                  </h2>
                </div>

                {s.body
                  .split("\n\n")
                  .filter(Boolean)
                  .map((para, idx) => (
                    <p
                      key={idx}
                      className="text-lg leading-relaxed text-black/80"
                    >
                      {para}
                    </p>
                  ))}

                {s.bullets && s.bullets.length > 0 && (
                  <ul className="space-y-3 rounded-2xl border-2 border-black/[0.06] bg-brand-50/40 p-6">
                    {s.bullets.map((b, bi) => (
                      <li
                        key={bi}
                        className="flex items-start gap-3 text-base text-black/85"
                      >
                        <CheckCircle2
                          size={16}
                          className="mt-1 shrink-0 text-emerald-600"
                          aria-hidden
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.tip && (
                  <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 text-amber-950">
                    <Lightbulb size={20} className="mt-0.5 shrink-0" aria-hidden />
                    <p className="text-base leading-relaxed">{s.tip}</p>
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* Nav to prev/next */}
          <div className="mt-20 grid gap-4 border-t-2 border-black/10 pt-10 md:grid-cols-2">
            {prev ? (
              <Link
                href={`/guides/${prev.slug}`}
                className="group flex items-start gap-4 rounded-2xl border-2 border-black/10 bg-white p-6 transition-colors hover:border-brand-500"
              >
                <ArrowLeft
                  size={20}
                  className="mt-1 shrink-0 text-brand-900"
                  aria-hidden
                />
                <div>
                  <p className="eyebrow text-brand-900/60">
                    Προηγούμενο · {prev.n}
                  </p>
                  <p className="mt-1 text-base font-bold text-brand-900 group-hover:text-brand-800">
                    {prev.title}
                  </p>
                </div>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/guides/${next.slug}`}
                className="group flex items-start justify-between gap-4 rounded-2xl border-2 border-black/10 bg-white p-6 text-right transition-colors hover:border-brand-500 md:col-start-2"
              >
                <div>
                  <p className="eyebrow text-brand-900/60">
                    Επόμενο · {next.n}
                  </p>
                  <p className="mt-1 text-base font-bold text-brand-900 group-hover:text-brand-800">
                    {next.title}
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  className="mt-1 shrink-0 text-brand-900"
                  aria-hidden
                />
              </Link>
            )}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-3xl bg-brand-900 px-8 py-12 text-white md:px-14">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h3 className="text-2xl font-extrabold md:text-3xl">
                  Έτοιμος να το δοκιμάσεις;
                </h3>
                <p className="mt-2 text-white/70">
                  14 ημέρες δωρεάν, χωρίς κάρτα.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex h-14 items-center rounded-full bg-white px-8 text-base font-bold text-brand-900 transition-transform hover:-translate-y-0.5"
              >
                Ξεκίνα δωρεάν
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
