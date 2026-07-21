"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trophy,
  CalendarDays,
  Wallet,
  ReceiptText,
  Coins,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

// ─── Types ──────────────────────────────────────────────────────────────

export type MonthPoint = {
  label: string;
  count: number;
  revenue: number;
  vat: number;
};
export type DayPoint = { label: string; date: string; value: number };
export type YearPoint = { year: number; revenue: number };
export type ClientLine = {
  id: string;
  name: string;
  docs: number;
  revenue: number;
};

export type StatisticsProps = {
  selectedYear: number;
  currentYear: number;
  months: MonthPoint[];
  daily: DayPoint[];
  yearly: YearPoint[];
  topClients: ClientLine[];
  kpis: {
    monthRevenue: number;
    prevMonthRevenue: number;
    monthDocs: number;
    yearRevenue: number;
    prevYearRevenue: number;
    yearDocs: number;
    ytdRevenue: number;
    lifetimeRevenue: number;
    lifetimeDocs: number;
    avgInvoice: number;
  };
};

// ─── Formatters ─────────────────────────────────────────────────────────

const nfMoney = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const nfCompact = new Intl.NumberFormat("el-GR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const nfInt = new Intl.NumberFormat("el-GR");

function money(v: number) {
  return nfMoney.format(v);
}

function compactMoney(v: number) {
  if (v === 0) return "0€";
  if (Math.abs(v) < 1000) return `${nfInt.format(Math.round(v))}€`;
  return `${nfCompact.format(v)}€`;
}

// ─── Animated counter ──────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useAnimatedNumber(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  const startAt = useRef<number>(0);
  const startFrom = useRef<number>(0);

  useEffect(() => {
    startFrom.current = 0;
    startAt.current = performance.now();
    if (raf.current) cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const elapsed = now - startAt.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      setValue(startFrom.current + (target - startFrom.current) * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return value;
}

function AnimatedMoney({ value }: { value: number }) {
  const v = useAnimatedNumber(value);
  return <>{money(v)}</>;
}
function AnimatedInt({ value }: { value: number }) {
  const v = useAnimatedNumber(value);
  return <>{nfInt.format(Math.round(v))}</>;
}

// ─── Delta chip ────────────────────────────────────────────────────────

function DeltaChip({
  current,
  previous,
  small = false,
}: {
  current: number;
  previous: number;
  small?: boolean;
}) {
  if (previous === 0 && current === 0)
    return (
      <span
        className={
          "inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 font-bold text-ink-500 " +
          (small ? "text-[10px]" : "text-xs")
        }
      >
        —
      </span>
    );

  const delta =
    previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold " +
        (up
          ? "bg-emerald-100 text-emerald-800"
          : "bg-red-100 text-red-700") +
        (small ? " text-[10px]" : " text-xs")
      }
    >
      <Icon size={small ? 10 : 12} strokeWidth={2.5} aria-hidden />
      {Math.abs(delta).toFixed(0)}%
    </span>
  );
}

// ─── Sparkline ─────────────────────────────────────────────────────────

function Sparkline({
  data,
  height = 44,
  width = 140,
  tone = "brand",
}: {
  data: number[];
  height?: number;
  width?: number;
  tone?: "brand" | "emerald";
}) {
  if (data.length < 2) return <div style={{ height }} />;
  const max = Math.max(1, ...data);
  const step = width / (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - (d / max) * height;
    return `${x},${y}`;
  });
  const area = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;
  const stroke = tone === "emerald" ? "#059669" : "#25457b";
  const fill = tone === "emerald" ? "#05966930" : "#25457b30";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="overflow-visible"
      aria-hidden
    >
      <path d={area} fill={fill} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  spark,
  delta,
  tone = "brand",
}: {
  icon: typeof Wallet;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  spark?: number[];
  delta?: { current: number; previous: number };
  tone?: "brand" | "emerald";
}) {
  const iconBg = tone === "emerald" ? "bg-emerald-600" : "bg-brand-800";
  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-soft">
      <div
        className={
          "absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10 transition-opacity group-hover:opacity-20 " +
          (tone === "emerald" ? "bg-emerald-500" : "bg-brand-700")
        }
        aria-hidden
      />
      <CardBody className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`grid h-10 w-10 place-items-center rounded-lg text-white ${iconBg}`}
          >
            <Icon size={18} aria-hidden />
          </div>
          {delta && (
            <DeltaChip current={delta.current} previous={delta.previous} />
          )}
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-ink-500">
          {label}
        </p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-brand-900 md:text-4xl">
          {value}
        </p>
        {sub && <p className="mt-1 text-sm text-ink-700">{sub}</p>}

        {spark && spark.length > 1 && (
          <div className="mt-3">
            <Sparkline data={spark} tone={tone} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Interactive Bar Chart ─────────────────────────────────────────────

const BAR_W = 900;
const BAR_H = 320;
const BAR_PAD = { top: 30, right: 24, bottom: 40, left: 12 };

function BarChart({
  months,
}: {
  months: MonthPoint[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const chartW = BAR_W - BAR_PAD.left - BAR_PAD.right;
  const chartH = BAR_H - BAR_PAD.top - BAR_PAD.bottom;
  const max = Math.max(1, ...months.map((m) => m.revenue));
  const bestIdx = months.reduce(
    (best, m, i) => (m.revenue > months[best]!.revenue ? i : best),
    0,
  );
  const barW = chartW / months.length;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * BAR_W - BAR_PAD.left;
    const idx = Math.floor(relX / barW);
    if (idx >= 0 && idx < months.length) setHovered(idx);
    else setHovered(null);
  };

  const active = hovered != null ? months[hovered]! : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BAR_W} ${BAR_H}`}
        className="w-full min-w-[560px] cursor-crosshair select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHovered(null)}
        role="img"
        aria-label="Έσοδα ανά μήνα"
      >
        {/* horizontal gridlines */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={BAR_PAD.left}
            x2={BAR_PAD.left + chartW}
            y1={BAR_PAD.top + chartH * (1 - t)}
            y2={BAR_PAD.top + chartH * (1 - t)}
            stroke="#e2e8f0"
            strokeDasharray={t === 1 ? undefined : "4 4"}
          />
        ))}

        {months.map((m, i) => {
          const h = (m.revenue / max) * chartH;
          const x = BAR_PAD.left + i * barW + barW * 0.12;
          const y = BAR_PAD.top + chartH - h;
          const w = barW * 0.76;
          const isHovered = hovered === i;
          const isBest = bestIdx === i;
          const fill = isHovered
            ? "#0f1f39"
            : isBest
              ? "#0f1f39"
              : "#25457b";
          return (
            <g key={i} aria-label={`${m.label} ${money(m.revenue)}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h || 2}
                rx={6}
                fill={fill}
                style={{
                  transition: "y 240ms ease, height 240ms ease, fill 200ms",
                }}
              />
              {isBest && (
                <text
                  x={x + w / 2}
                  y={y - 12}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="#0f1f39"
                >
                  ★ {compactMoney(m.revenue)}
                </text>
              )}
              <text
                x={x + w / 2}
                y={BAR_PAD.top + chartH + 22}
                textAnchor="middle"
                fontSize={12}
                fontWeight={isHovered ? 800 : 600}
                fill={isHovered ? "#0f1f39" : "#334155"}
              >
                {m.label}
              </text>
              {/* Full-height invisible hit rect */}
              <rect
                x={BAR_PAD.left + i * barW}
                y={BAR_PAD.top}
                width={barW}
                height={chartH}
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>

      {active && hovered !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-brand-900 px-4 py-2.5 text-white shadow-xl"
          style={{
            left: `calc(${((BAR_PAD.left + hovered * barW + barW / 2) / BAR_W) * 100}% )`,
            top: 8,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-200">
            {active.label}
          </p>
          <p className="mt-0.5 text-lg font-extrabold">{money(active.revenue)}</p>
          <p className="text-xs text-brand-100">
            {nfInt.format(active.count)}{" "}
            {active.count === 1 ? "παραστατικό" : "παραστατικά"} · ΦΠΑ{" "}
            {money(active.vat)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Interactive Line Chart ────────────────────────────────────────────

const LINE_W = 900;
const LINE_H = 300;
const LINE_PAD = { top: 24, right: 20, bottom: 40, left: 12 };

function LineChart({ data }: { data: DayPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const chartW = LINE_W - LINE_PAD.left - LINE_PAD.right;
  const chartH = LINE_H - LINE_PAD.top - LINE_PAD.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const points = data.map((d, i) => {
    const x = LINE_PAD.left + i * step;
    const y = LINE_PAD.top + chartH * (1 - d.value / max);
    return { x, y, d };
  });

  const pathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const pathArea =
    points.length > 0
      ? `${pathLine} L ${points[points.length - 1]!.x},${LINE_PAD.top + chartH} L ${points[0]!.x},${LINE_PAD.top + chartH} Z`
      : "";

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * LINE_W - LINE_PAD.left;
    const idx = Math.round(relX / step);
    if (idx >= 0 && idx < data.length) setHovered(idx);
    else setHovered(null);
  };

  const active = hovered != null ? points[hovered] : null;

  const totalRevenue = data.reduce((s, d) => s + d.value, 0);
  const avgDaily = totalRevenue / Math.max(1, data.length);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LINE_W} ${LINE_H}`}
        className="w-full min-w-[560px] cursor-crosshair select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHovered(null)}
        role="img"
        aria-label="Ημερήσια έσοδα"
      >
        <defs>
          <linearGradient id="area-navy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#25457b" stopOpacity="0.35" />
            <stop offset="1" stopColor="#25457b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={LINE_PAD.left}
            x2={LINE_PAD.left + chartW}
            y1={LINE_PAD.top + chartH * (1 - t)}
            y2={LINE_PAD.top + chartH * (1 - t)}
            stroke="#e2e8f0"
            strokeDasharray={t === 1 ? undefined : "4 4"}
          />
        ))}

        {pathArea && <path d={pathArea} fill="url(#area-navy)" />}
        {pathLine && (
          <path
            d={pathLine}
            fill="none"
            stroke="#0f1f39"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Average dashed line */}
        <line
          x1={LINE_PAD.left}
          x2={LINE_PAD.left + chartW}
          y1={LINE_PAD.top + chartH * (1 - avgDaily / max)}
          y2={LINE_PAD.top + chartH * (1 - avgDaily / max)}
          stroke="#059669"
          strokeDasharray="5 4"
          strokeWidth={1.5}
        />
        <text
          x={LINE_PAD.left + chartW - 4}
          y={LINE_PAD.top + chartH * (1 - avgDaily / max) - 5}
          textAnchor="end"
          fontSize={10}
          fontWeight={700}
          fill="#059669"
        >
          Μ.Ο. {compactMoney(avgDaily)}
        </text>

        {/* Cursor line + focused dot */}
        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={LINE_PAD.top}
              y2={LINE_PAD.top + chartH}
              stroke="#0f1f39"
              strokeDasharray="3 4"
              strokeWidth={1}
            />
            <circle cx={active.x} cy={active.y} r={7} fill="#0f1f39" />
            <circle cx={active.x} cy={active.y} r={3.5} fill="#fff" />
          </>
        )}

        {points.map((p, i) => {
          const show = i % Math.max(1, Math.ceil(data.length / 8)) === 0;
          if (!show) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={LINE_PAD.top + chartH + 22}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="#64748b"
            >
              {p.d.label}
            </text>
          );
        })}
      </svg>

      {active && hovered !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-brand-900 px-4 py-2.5 text-white shadow-xl"
          style={{
            left: `${(active.x / LINE_W) * 100}%`,
            top: 8,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-200">
            {active.d.date}
          </p>
          <p className="mt-0.5 text-lg font-extrabold">
            {money(active.d.value)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Yearly Bar Chart (compact) ────────────────────────────────────────

function YearlyBars({
  yearly,
  selectedYear,
}: {
  yearly: YearPoint[];
  selectedYear: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...yearly.map((y) => y.revenue));

  return (
    <div className="space-y-3">
      {yearly.map((y, i) => {
        const isSelected = y.year === selectedYear;
        const width = (y.revenue / max) * 100;
        const isHovered = hovered === i;
        return (
          <div
            key={y.year}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            className={
              "cursor-pointer rounded-lg px-3 py-2 transition-colors " +
              (isHovered ? "bg-brand-50" : "")
            }
          >
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  "font-bold " +
                  (isSelected ? "text-brand-900" : "text-ink-700")
                }
              >
                {y.year}
                {isSelected && (
                  <span className="ml-1.5 rounded-full bg-brand-900 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                    τρέχον
                  </span>
                )}
              </span>
              <span
                className={
                  "font-extrabold tabular-nums " +
                  (isHovered ? "text-brand-900" : "text-ink-900")
                }
              >
                {money(y.revenue)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className={
                  "h-full transition-all duration-500 " +
                  (isSelected ? "bg-brand-900" : "bg-brand-500")
                }
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Top clients ranked list ───────────────────────────────────────────

function TopClientsList({ clients }: { clients: ClientLine[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...clients.map((c) => c.revenue));

  if (clients.length === 0)
    return (
      <p className="p-6 text-sm text-ink-700">
        Δεν υπάρχουν εκδοθέντα παραστατικά για τα επιλεγμένα φίλτρα.
      </p>
    );

  return (
    <ol className="divide-y-2 divide-ink-300/60">
      {clients.map((c, i) => {
        const width = (c.revenue / max) * 100;
        const isTop = i === 0;
        const isHovered = hovered === i;
        return (
          <li
            key={c.id}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            className={
              "cursor-pointer px-5 py-4 transition-colors " +
              (isHovered ? "bg-brand-50/50" : "")
            }
          >
            <div className="flex items-center gap-3">
              <div
                className={
                  "grid h-9 w-9 place-items-center rounded-full font-black " +
                  (isTop
                    ? "bg-amber-100 text-amber-900"
                    : "bg-ink-100 text-ink-700")
                }
              >
                {isTop ? <Trophy size={16} /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-brand-900">
                  {c.name}
                </p>
                <p className="text-xs text-ink-500">
                  {nfInt.format(c.docs)}{" "}
                  {c.docs === 1 ? "παραστατικό" : "παραστατικά"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold tabular-nums text-brand-900">
                  {money(c.revenue)}
                </p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className={
                  "h-full transition-all duration-700 " +
                  (isTop ? "bg-amber-500" : "bg-brand-700")
                }
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────

export function StatisticsClient(props: StatisticsProps) {
  const monthRevSeries = useMemo(
    () => props.months.map((m) => m.revenue),
    [props.months],
  );

  return (
    <>
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Έσοδα αυτόν τον μήνα"
          value={<AnimatedMoney value={props.kpis.monthRevenue} />}
          sub={`${nfInt.format(props.kpis.monthDocs)} παραστατικά`}
          delta={{
            current: props.kpis.monthRevenue,
            previous: props.kpis.prevMonthRevenue,
          }}
          spark={monthRevSeries}
        />
        <KpiCard
          icon={Sparkles}
          label={`Έσοδα ${props.selectedYear}`}
          value={<AnimatedMoney value={props.kpis.yearRevenue} />}
          sub={`${nfInt.format(props.kpis.yearDocs)} παραστατικά`}
          delta={{
            current: props.kpis.yearRevenue,
            previous: props.kpis.prevYearRevenue,
          }}
          tone="emerald"
        />
        <KpiCard
          icon={ReceiptText}
          label={`YTD ${props.currentYear}`}
          value={<AnimatedMoney value={props.kpis.ytdRevenue} />}
        />
        <KpiCard
          icon={Coins}
          label="Μέση αξία παραστατικού"
          value={<AnimatedMoney value={props.kpis.avgInvoice} />}
          sub={`Σύνολο περιόδου: ${money(props.kpis.lifetimeRevenue)}`}
        />
      </div>

      {/* Monthly + Yearly */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`Έσοδα ανά μήνα · ${props.selectedYear}`}
            subtitle="Πέρνα το ποντίκι πάνω από τις μπάρες για λεπτομέρειες."
            action={
              <span className="hidden items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-800 md:inline-flex">
                <Trophy size={12} />
                Καλύτερος μήνας
              </span>
            }
          />
          <CardBody>
            <BarChart months={props.months} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Ετήσια πορεία"
            subtitle="Ranked ανά έτος."
          />
          <CardBody>
            <YearlyBars
              yearly={props.yearly}
              selectedYear={props.selectedYear}
            />
          </CardBody>
        </Card>
      </div>

      {/* Daily line chart */}
      <Card className="mt-6">
        <CardHeader
          title="Ημερήσια έσοδα · τελευταίες 30 ημέρες"
          subtitle="Ο διακεκομμένος πράσινος δείχνει τον μέσο όρο."
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-800">
              <CalendarDays size={12} />
              Real-time
            </span>
          }
        />
        <CardBody>
          <LineChart data={props.daily} />
        </CardBody>
      </Card>

      {/* Top clients */}
      <Card className="mt-6">
        <CardHeader
          title={`Top πελάτες · ${props.selectedYear}`}
          subtitle="Οι πελάτες που φέρνουν τα περισσότερα έσοδα."
        />
        <CardBody className="p-0">
          <TopClientsList clients={props.topClients} />
        </CardBody>
      </Card>
    </>
  );
}
