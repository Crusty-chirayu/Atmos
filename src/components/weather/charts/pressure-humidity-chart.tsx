"use client";

import React, { useState, useId } from "react";
import { HourlyForecastEntry } from "@/lib/weather/domain/weather";
import { formatHourlyTime } from "@/lib/weather/utils/date-format";
import { formatPressure } from "@/lib/weather/domain/units";

export interface PressureHumidityChartProps {
  entries: HourlyForecastEntry[];
  unit: "hpa" | "inhg";
  timezone?: string;
}

export function PressureHumidityChart({
  entries,
  unit,
  timezone,
}: PressureHumidityChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const humidityGradientId = useId();

  if (!entries || entries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-text-muted text-sm glass rounded-2xl">
        No barometric telemetry available
      </div>
    );
  }

  const data = entries.slice(0, 24);

  // Pressure values
  const pressures = data
    .map((d) => d.pressureMsl)
    .filter((p): p is number => p !== null && p !== undefined);

  const minPress =
    pressures.length > 0 ? Math.floor(Math.min(...pressures) - 2) : 1000;
  const maxPress =
    pressures.length > 0 ? Math.ceil(Math.max(...pressures) + 2) : 1030;
  const pressRange = Math.max(maxPress - minPress, 4);

  // SVG dimensions
  const width = 800;
  const height = 240;
  const padding = { top: 30, right: 40, bottom: 40, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = (index: number) =>
    padding.left + (index / (data.length - 1)) * graphWidth;

  const getPressureY = (p: number) =>
    padding.top + graphHeight - ((p - minPress) / pressRange) * graphHeight;

  const getHumidityY = (h: number) =>
    padding.top +
    graphHeight -
    (Math.min(Math.max(h, 0), 100) / 100) * graphHeight;

  // Pressure path
  const pressurePoints = data
    .map((d, i) =>
      d.pressureMsl !== null && d.pressureMsl !== undefined
        ? { x: getX(i), y: getPressureY(d.pressureMsl) }
        : null
    )
    .filter((p): p is { x: number; y: number } => p !== null);

  let pressurePath = "";
  if (pressurePoints.length > 1) {
    pressurePath = `M ${pressurePoints[0].x} ${pressurePoints[0].y}`;
    for (let i = 0; i < pressurePoints.length - 1; i++) {
      const p1 = pressurePoints[i];
      const p2 = pressurePoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      pressurePath += ` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
  }

  // Humidity Area path
  const humidityPoints = data.map((d, i) => ({
    x: getX(i),
    y: getHumidityY(d.relativeHumidity ?? 50),
  }));

  let humidityAreaPath = "";
  if (humidityPoints.length > 1) {
    let line = `M ${humidityPoints[0].x} ${humidityPoints[0].y}`;
    for (let i = 0; i < humidityPoints.length - 1; i++) {
      const p1 = humidityPoints[i];
      const p2 = humidityPoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      line += ` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
    humidityAreaPath = `${line} L ${humidityPoints[humidityPoints.length - 1].x} ${height - padding.bottom} L ${humidityPoints[0].x} ${height - padding.bottom} Z`;
  }

  const activeEntry = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Legend & active details */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-violet-400" />
            <span className="text-text-secondary font-medium">
              Pressure ({unit})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-indigo-500/30" />
            <span className="text-text-muted">Relative Humidity (%)</span>
          </div>
        </div>

        {activeEntry ? (
          <div className="font-mono text-xs flex items-center gap-2 px-2.5 py-1 rounded-lg glass">
            <span className="text-violet-400 font-semibold">
              {formatHourlyTime(activeEntry.timestamp, timezone)}:
            </span>
            <span className="text-text-primary">
              {activeEntry.pressureMsl !== null &&
              activeEntry.pressureMsl !== undefined
                ? formatPressure(activeEntry.pressureMsl, unit)
                : "N/A"}
            </span>
            <span className="text-text-secondary">
              · Humidity {activeEntry.relativeHumidity ?? 0}%
            </span>
          </div>
        ) : (
          <div className="text-text-muted text-[11px] font-mono">
            Range:{" "}
            {pressures.length > 0
              ? `${formatPressure(minPress, unit)} - ${formatPressure(maxPress, unit)}`
              : "N/A"}
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative w-full aspect-[16/7] sm:aspect-[16/5] glass rounded-2xl p-2 sm:p-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible select-none"
          role="img"
          aria-label="24-hour barometric pressure and humidity chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={humidityGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="rgb(99 102 241)"
                stopOpacity="0.25"
              />
              <stop
                offset="100%"
                stopColor="rgb(99 102 241)"
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* Grid lines (Pressure left axis) */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding.top + ratio * graphHeight;
            const pVal = Math.round(maxPress - ratio * pressRange);
            return (
              <g key={i} className="opacity-20">
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
                  {pVal}
                </text>
              </g>
            );
          })}

          {/* Humidity Area Fill */}
          {humidityAreaPath && (
            <path d={humidityAreaPath} fill={`url(#${humidityGradientId})`} />
          )}

          {/* Pressure Line */}
          {pressurePath && (
            <path
              d={pressurePath}
              fill="none"
              stroke="rgb(167 139 250)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

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
