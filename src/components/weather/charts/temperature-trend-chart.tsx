"use client";

import React, { useState, useId } from "react";
import { HourlyForecastEntry } from "@/lib/weather/domain/weather";
import { formatHourlyTime } from "@/lib/weather/utils/date-format";
import { formatTemperature } from "@/lib/weather/domain/units";

export interface TemperatureTrendChartProps {
  entries: HourlyForecastEntry[];
  unit: "celsius" | "fahrenheit";
  timezone?: string;
}

export function TemperatureTrendChart({
  entries,
  unit,
  timezone,
}: TemperatureTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();
  const apparentGradientId = useId();

  if (!entries || entries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-text-muted text-sm glass rounded-2xl">
        No hourly temperature telemetry available
      </div>
    );
  }

  // Display the next 24 hours of data
  const data = entries.slice(0, 24);

  const temperatures = data.map((d) => d.temperature);
  const apparentTemps = data
    .map((d) => d.apparentTemperature)
    .filter((t): t is number => t !== null && t !== undefined);

  const allTemps = [...temperatures, ...apparentTemps];
  const minTemp = Math.floor(Math.min(...allTemps) - 1);
  const maxTemp = Math.ceil(Math.max(...allTemps) + 1);
  const tempRange = Math.max(maxTemp - minTemp, 4);

  // SVG dimensions
  const width = 800;
  const height = 240;
  const padding = { top: 30, right: 30, bottom: 40, left: 30 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Coordinate mapping
  const getX = (index: number) =>
    padding.left + (index / (data.length - 1)) * graphWidth;
  const getY = (temp: number) =>
    padding.top + graphHeight - ((temp - minTemp) / tempRange) * graphHeight;

  // Path generators with smooth cubic Bézier curves
  const generateSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 2) return "";
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.temperature) }));
  const tempLinePath = generateSmoothPath(points);
  const areaPath = `${tempLinePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  const apparentPoints = data
    .map((d, i) =>
      d.apparentTemperature !== null && d.apparentTemperature !== undefined
        ? { x: getX(i), y: getY(d.apparentTemperature) }
        : null
    )
    .filter((p): p is { x: number; y: number } => p !== null);
  const apparentLinePath =
    apparentPoints.length > 1 ? generateSmoothPath(apparentPoints) : "";

  // Highlight points
  const highestIndex = temperatures.indexOf(Math.max(...temperatures));
  const lowestIndex = temperatures.indexOf(Math.min(...temperatures));

  const activeEntry = hoverIndex !== null ? data[hoverIndex] : null;
  const activeX = hoverIndex !== null ? getX(hoverIndex) : null;
  const activeY =
    hoverIndex !== null ? getY(data[hoverIndex].temperature) : null;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Header telemetry & legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-accent-400" />
            <span className="text-text-secondary font-medium">Temperature</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full border-b border-dashed border-accent-300/60" />
            <span className="text-text-muted">Feels Like</span>
          </div>
        </div>

        {activeEntry ? (
          <div className="font-mono text-xs flex items-center gap-2 px-2.5 py-1 rounded-lg glass">
            <span className="text-accent-400 font-semibold">
              {formatHourlyTime(activeEntry.timestamp, timezone)}:
            </span>
            <span className="text-text-primary">
              {formatTemperature(activeEntry.temperature, unit)}
            </span>
            {activeEntry.apparentTemperature !== null &&
              activeEntry.apparentTemperature !== undefined && (
                <span className="text-text-muted">
                  (Feels{" "}
                  {formatTemperature(activeEntry.apparentTemperature, unit)})
                </span>
              )}
            <span className="text-text-secondary">
              · {activeEntry.conditionText}
            </span>
          </div>
        ) : (
          <div className="text-text-muted text-[11px] font-mono">
            High: {formatTemperature(Math.max(...temperatures), unit)} · Low:{" "}
            {formatTemperature(Math.min(...temperatures), unit)}
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative w-full aspect-[16/7] sm:aspect-[16/5] glass rounded-2xl p-2 sm:p-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible select-none"
          role="img"
          aria-label="24-hour hourly temperature trend chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent-500)"
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent-500)"
                stopOpacity="0.0"
              />
            </linearGradient>
            <linearGradient id={apparentGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent-300)"
                stopOpacity="0.15"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent-300)"
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = padding.top + ratio * graphHeight;
            const tempVal = Math.round(maxTemp - ratio * tempRange);
            return (
              <g key={i} className="opacity-30">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.75"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-text-muted"
                >
                  {tempVal}°
                </text>
              </g>
            );
          })}

          {/* Temperature Area fill */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Apparent temperature line (dashed) */}
          {apparentLinePath && (
            <path
              d={apparentLinePath}
              fill="none"
              stroke="var(--color-accent-300)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-60"
            />
          )}

          {/* Main temperature curve */}
          <path
            d={tempLinePath}
            fill="none"
            stroke="var(--color-accent-400)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Peak markers (High & Low) */}
          {highestIndex >= 0 && (
            <g>
              <circle
                cx={points[highestIndex].x}
                cy={points[highestIndex].y}
                r="4.5"
                fill="var(--color-accent-400)"
                className="animate-pulse"
              />
              <text
                x={points[highestIndex].x}
                y={points[highestIndex].y - 8}
                textAnchor="middle"
                className="text-[11px] font-mono font-bold fill-accent-400"
              >
                {Math.round(temperatures[highestIndex])}°
              </text>
            </g>
          )}

          {lowestIndex >= 0 && lowestIndex !== highestIndex && (
            <g>
              <circle
                cx={points[lowestIndex].x}
                cy={points[lowestIndex].y}
                r="3.5"
                fill="var(--color-accent-300)"
              />
              <text
                x={points[lowestIndex].x}
                y={points[lowestIndex].y + 14}
                textAnchor="middle"
                className="text-[10px] font-mono fill-text-muted"
              >
                {Math.round(temperatures[lowestIndex])}°
              </text>
            </g>
          )}

          {/* Time axis labels (every 3 hours) */}
          {data.map((d, i) => {
            if (i % 3 !== 0 && i !== data.length - 1) return null;
            const x = getX(i);
            const timeLabel = formatHourlyTime(d.timestamp, timezone);
            return (
              <text
                key={i}
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] font-mono fill-text-muted"
              >
                {timeLabel}
              </text>
            );
          })}

          {/* Hover scrubber vertical line & cursor dot */}
          {activeX !== null && activeY !== null && (
            <g>
              <line
                x1={activeX}
                y1={padding.top}
                x2={activeX}
                y2={height - padding.bottom}
                stroke="var(--color-accent-400)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={activeX}
                cy={activeY}
                r="5"
                fill="var(--color-accent-400)"
                stroke="var(--color-atmos-950)"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Invisible interactive columns for smooth hover and touch events */}
          {data.map((_, i) => {
            const colWidth = graphWidth / data.length;
            const x = getX(i) - colWidth / 2;
            return (
              <rect
                key={i}
                x={x}
                y={padding.top}
                width={colWidth}
                height={graphHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
                onTouchStart={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
