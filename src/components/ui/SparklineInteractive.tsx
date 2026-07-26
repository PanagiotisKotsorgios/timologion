"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";

type Point = {
  value: number;
  label: string;
};

/**
 * Interactive sparkline — same visual footprint as the static Sparkline
 * primitive, plus hover interactions: crosshair guideline, filled point
 * marker, and a floating tooltip anchored to the nearest data point.
 *
 * Designed for stat cards. No external chart lib — pure SVG + one React
 * state hook. Works on touch by anchoring to `pointerdown`/`pointermove`.
 */
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

export function SparklineInteractive({
  points,
  color = "#0B1B3A",
  height = 44,
  strokeWidth = 2.25,
  formatKind = "raw",
  className,
  style,
}: {
  points: Point[];
  color?: string;
  height?: number;
  strokeWidth?: number;
  /**
   * String kind instead of a formatter function — functions can't cross the
   * server→client RSC boundary and the parent StatCard is a server
   * component, so we serialize the kind and format inside.
   */
  formatKind?: SparklineFormatKind;
  className?: string;
  style?: CSSProperties;
}) {
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
    const step = n > 1 ? width / (n - 1) : width;

    const coords = points.map((p, i) => {
      const x = i * step;
      const y =
        height -
        ((p.value - min) / range) * (height - strokeWidth * 2) -
        strokeWidth;
      return { x, y };
    });

    const pathD = `M ${coords.map((c) => `${c.x},${c.y}`).join(" L ")}`;
    const areaD = `M 0,${height} L ${coords.map((c) => `${c.x},${c.y}`).join(" L ")} L ${width},${height} Z`;
    return { width, coords, pathD, areaD, step };
  }, [points, height, strokeWidth]);

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
    <div
      className={"relative " + (className ?? "")}
      style={style}
    >
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
        {/* Soft fill under the line */}
        <path d={geometry.areaD} fill={color} fillOpacity={0.14} />
        {/* Main line */}
        <path
          d={geometry.pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover artifacts */}
        {hoveredPoint && (
          <>
            {/* Vertical dashed guideline */}
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
            {/* Point marker (white ring + colored core) */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={5}
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
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-ink-900 px-3 py-2 text-center text-[11px] font-bold text-white shadow-lg"
          style={{
            left: `${(hoveredPoint.x / geometry.width) * 100}%`,
            top: -8,
            whiteSpace: "nowrap",
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-widest text-white/60">
            {hoveredPoint.data.label}
          </div>
          <div className="mt-0.5 text-[13px] font-black">
            {formatFor(formatKind, hoveredPoint.data.value)}
          </div>
        </div>
      )}
    </div>
  );
}
