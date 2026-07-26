import type { CSSProperties } from "react";

/**
 * Tiny decorative sparkline. No axes, no labels, no library — just an SVG
 * polyline sized to fit inside a stat card. Values are normalized so a flat
 * series still renders a straight line instead of collapsing to zero height.
 */
export function Sparkline({
  values,
  color = "currentColor",
  height = 40,
  strokeWidth = 2,
  fill = true,
  className,
  style,
}: {
  values: number[];
  color?: string;
  height?: number;
  strokeWidth?: number;
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  if (values.length === 0) return null;
  const width = 100; // viewBox width — scales via CSS
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((v, i) => {
    const x = i * step;
    // Reserve stroke width so the top isn't clipped.
    const y = height - ((v - min) / range) * (height - strokeWidth) - strokeWidth / 2;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = fill
    ? `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`
    : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden
      className={className}
      style={{ display: "block", color, ...style }}
    >
      {areaD && (
        <path
          d={areaD}
          fill={color}
          fillOpacity={0.12}
          stroke="none"
        />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
