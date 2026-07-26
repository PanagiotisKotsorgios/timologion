"use client";

import { useId, useMemo, useRef, useState, type CSSProperties } from "react";

type Point = {
  value: number;
  label: string;
};

export type SparklineFormatKind = "money" | "count" | "raw";

function formatFor(kind: SparklineFormatKind, n: number): string {
  if (kind === "money") {
    return n.toLocaleString("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    });
  }
  if (kind === "count") {
    return `${n.toLocaleString("el-GR")} ${n === 1 ? "παραστατικό" : "παραστατικά"}`;
  }
  return n.toLocaleString("el-GR");
}

/**
 * Smooth-line area chart primitive. Uses a cardinal/Catmull-Rom-ish cubic
 * Bezier between points instead of a jagged polyline so short daily-count
 * series read as a clean trend rather than a stair-step. Renders:
 *
 *   • A 3-line grid at 0/50/100% of the visible range (very faint).
 *   • A soft gradient fill under the curve.
 *   • The smooth curve itself.
 *   • Hover crosshair, filled-ring marker, and a tooltip anchored above.
 *
 * Interaction: pointer move / touch drag surfaces the nearest data point.
 * Works cleanly at any width because the viewBox stretches with the parent
 * and we render coordinates in a fixed 0..100 x-range.
 */
export function SparklineInteractive({
  points,
  color = "#0B1B3A",
  height = 90,
  strokeWidth = 2.4,
  formatKind = "raw",
  className,
  style,
}: {
  points: Point[];
  color?: string;
  height?: number;
  strokeWidth?: number;
  formatKind?: SparklineFormatKind;
  className?: string;
  style?: CSSProperties;
}) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const geometry = useMemo(() => {
    const n = points.length;
    if (n === 0) return null;
    const width = 100;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const paddingTop = 6;
    const paddingBottom = 4;
    const usable = height - paddingTop - paddingBottom;
    const step = n > 1 ? width / (n - 1) : width;

    const coords = points.map((p, i) => {
      const x = i * step;
      const y = height - paddingBottom - ((p.value - min) / range) * usable;
      return { x, y };
    });

    // Cardinal-style smoothing between points → cubic Beziers.
    const smoothing = 0.22;
    const line: string[] = [];
    line.push(`M ${coords[0]!.x} ${coords[0]!.y}`);
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i - 1] ?? coords[i]!;
      const p1 = coords[i]!;
      const p2 = coords[i + 1]!;
      const p3 = coords[i + 2] ?? coords[i + 1]!;
      const cp1x = p1.x + (p2.x - p0.x) * smoothing;
      const cp1y = p1.y + (p2.y - p0.y) * smoothing;
      const cp2x = p2.x - (p3.x - p1.x) * smoothing;
      const cp2y = p2.y - (p3.y - p1.y) * smoothing;
      line.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }
    const linePath = line.join(" ");
    const areaPath =
      `M 0 ${height} L 0 ${coords[0]!.y} ` +
      linePath.slice(1) + // strip leading M
      ` L ${width} ${height} Z`;

    return {
      width,
      coords,
      linePath,
      areaPath,
      step,
      gridYs: [
        paddingTop,
        paddingTop + usable / 2,
        height - paddingBottom,
      ],
    };
  }, [points, height]);

  if (!geometry || points.length === 0) return null;

  function pointerToIndex(clientX: number) {
    if (!svgRef.current || !geometry) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const relative = (clientX - rect.left) / rect.width;
    const idx = Math.round(relative * (points.length - 1));
    return Math.max(0, Math.min(points.length - 1, idx));
  }

  const hoveredPoint =
    hovered != null && geometry.coords[hovered]
      ? { ...geometry.coords[hovered]!, data: points[hovered]! }
      : null;

  return (
    <div className={"relative " + (className ?? "")} style={style}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${geometry.width} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        style={{ display: "block", color, overflow: "visible" }}
        onPointerMove={(e) => setHovered(pointerToIndex(e.clientX))}
        onPointerDown={(e) => setHovered(pointerToIndex(e.clientX))}
        onPointerLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="60%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {geometry.gridYs.map((y, i) => (
          <line
            key={i}
            x1={0}
            x2={geometry.width}
            y1={y}
            y2={y}
            stroke={color}
            strokeOpacity={i === 2 ? 0.14 : 0.06}
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Area fill */}
        <path d={geometry.areaPath} fill={`url(#${gradientId})`} />

        {/* Smoothed line */}
        <path
          d={geometry.linePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Hover crosshair + point marker */}
        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={0}
              y2={height}
              stroke={color}
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            {/* Outer soft halo */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={8}
              fill={color}
              fillOpacity={0.15}
              vectorEffect="non-scaling-stroke"
            />
            {/* Core marker: white fill, colored ring */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={4.5}
              fill="#ffffff"
              stroke={color}
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {hoveredPoint && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl bg-ink-900 px-3 py-2 text-center shadow-2xl"
          style={{
            left: `${(hoveredPoint.x / geometry.width) * 100}%`,
            top: -10,
            whiteSpace: "nowrap",
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            {hoveredPoint.data.label}
          </div>
          <div className="mt-0.5 text-[14px] font-black text-white">
            {formatFor(formatKind, hoveredPoint.data.value)}
          </div>
        </div>
      )}
    </div>
  );
}
