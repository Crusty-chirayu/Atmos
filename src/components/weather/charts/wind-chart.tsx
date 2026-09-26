"use client";

import React, { useState } from "react";
import { HourlyForecastEntry } from "@/lib/weather/domain/weather";
import { formatHourlyTime } from "@/lib/weather/utils/date-format";
import { formatWindSpeed } from "@/lib/weather/domain/units";

export interface WindChartProps {
  entries: HourlyForecastEntry[];
  unit: "kmh" | "ms" | "mph" | "kn";
  timezone?: string;
}

function getCardinalDirection(deg: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

export function WindChart({ entries, unit, timezone }: WindChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-text-muted text-sm bg-surface-raised border border-border-default/60 rounded-md">
        No wind telemetry available
      </div>
    );
  }

  const data = entries.slice(0, 24);
  const speeds = data.map((d) => d.windSpeed);
  const gusts = data
    .map((d) => d.windGusts)
    .filter((g): g is number => g !== null && g !== undefined);

  const maxVal = Math.max(...speeds, ...gusts, 10);
  const maxScale = Math.ceil(maxVal * 1.15);

  const width = 800;
  const height = 240;
  const padding = { top: 30, right: 35, bottom: 45, left: 35 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = (index: number) =>
    padding.left + (index / (data.length - 1)) * graphWidth;
  const getY = (val: number) =>
    padding.top + graphHeight - (val / maxScale) * graphHeight;

  const speedPoints = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.windSpeed),
  }));

  let speedPath = "";
  if (speedPoints.length > 0) {
    speedPath = `M ${speedPoints[0].x} ${speedPoints[0].y}`;
    for (let i = 0; i < speedPoints.length - 1; i++) {
      const p1 = speedPoints[i];
      const p2 = speedPoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      speedPath += ` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
  }

  const gustPoints = data
    .map((d, i) =>
      d.windGusts !== null && d.windGusts !== undefined
        ? { x: getX(i), y: getY(d.windGusts) }
        : null
    )
    .filter((p): p is { x: number; y: number } => p !== null);

  let gustPath = "";
  if (gustPoints.length > 0) {
    gustPath = `M ${gustPoints[0].x} ${gustPoints[0].y}`;
    for (let i = 0; i < gustPoints.length - 1; i++) {
      const p1 = gustPoints[i];
      const p2 = gustPoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      gustPath += ` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
  }

  const activeEntry = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Legend & active details */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-emerald-400" />
            <span className="text-text-secondary font-medium">
              Sustained Wind
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full border-b border-dashed border-teal-300" />
            <span className="text-text-muted">Peak Gusts</span>
          </div>
        </div>

        {activeEntry ? (
          <div className="text-xs flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F7F7F7] border border-[#E5E7EB]">
            <span className="text-[#222222] font-semibold tabular-nums">
              {formatHourlyTime(activeEntry.timestamp, timezone)}:
            </span>
            <span className="text-[#222222] font-medium tabular-nums">
              {formatWindSpeed(activeEntry.windSpeed, unit)}
            </span>
            {activeEntry.windGusts !== null &&
              activeEntry.windGusts !== undefined && (
                <span className="text-[#6B7280] tabular-nums">
                  (Gusts {formatWindSpeed(activeEntry.windGusts, unit)})
                </span>
              )}
            <span className="text-[#6B7280] flex items-center gap-1">
              <span>{getCardinalDirection(activeEntry.windDirection)}</span>
              <span>({activeEntry.windDirection}°)</span>
            </span>
          </div>
        ) : (
          <div className="text-[#6B7280] text-xs">
            Max Sustained: <strong className="text-[#222222] tabular-nums">{formatWindSpeed(Math.max(...speeds), unit)}</strong>
            {gusts.length > 0 &&
              ` · Max Gust: ${formatWindSpeed(Math.max(...gusts), unit)}`}
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative w-full aspect-[16/7] sm:aspect-[16/5] bg-white border border-[#E5E7EB] rounded-lg p-2 sm:p-4 overflow-hidden shadow-xs">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible select-none"
          role="img"
          aria-label="24-hour wind velocity, gusts, and direction chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = padding.top + ratio * graphHeight;
            const val = Math.round(maxScale * (1 - ratio));
            return (
              <g key={i} className="opacity-25">
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
                  {val}
                </text>
              </g>
            );
          })}

          {/* Wind Gusts Path (dashed) */}
          {gustPath && (
            <path
              d={gustPath}
              fill="none"
              stroke="rgb(45 212 191)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-60"
            />
          )}

          {/* Sustained Wind Speed Path */}
          {speedPath && (
            <path
              d={speedPath}
              fill="none"
              stroke="rgb(52 211 153)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Wind Direction Arrows (plotted every 3 hours) */}
          {data.map((d, i) => {
            if (i % 3 !== 0 && i !== data.length - 1) return null;
            const x = getX(i);
            const y = getY(d.windSpeed);

            return (
              <g
                key={i}
                transform={`translate(${x}, ${y})`}
                className="transition-transform"
              >
                <circle
                  r="7"
                  fill="#FFFFFF"
                  stroke="rgb(52 211 153)"
                  strokeWidth="1.5"
                />
                {/* Arrow pointing in wind direction */}
                <g transform={`rotate(${d.windDirection})`}>
                  <path
                    d="M 0 -4 L 2.5 3 L 0 1.5 L -2.5 3 Z"
                    fill="rgb(52 211 153)"
                  />
                </g>
              </g>
            );
          })}

          {/* Time axis labels */}
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

          {/* Interactive touch/mouse columns */}
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
