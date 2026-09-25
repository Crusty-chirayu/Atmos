"use client";

import React, { useState } from "react";
import { HistoricalWeather } from "@/lib/weather/domain/weather";
import {
  formatTemperature,
  formatPrecipitation,
} from "@/lib/weather/domain/units";

export interface HistoricalTrendChartProps {
  data: HistoricalWeather;
  tempUnit: "celsius" | "fahrenheit";
  precipUnit: "mm" | "inch";
}

export function HistoricalTrendChart({
  data,
  tempUnit,
  precipUnit,
}: HistoricalTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const summaries = data.dailySummaries;
  if (!summaries || summaries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-text-muted text-sm glass rounded-2xl">
        No historical reanalysis telemetry available for this range
      </div>
    );
  }

  const allMins = summaries.map((s) => s.temperatureMin);
  const allMaxs = summaries.map((s) => s.temperatureMax);
  const minTemp = Math.floor(Math.min(...allMins) - 2);
  const maxTemp = Math.ceil(Math.max(...allMaxs) + 2);
  const tempRange = Math.max(maxTemp - minTemp, 4);

  const width = 800;
  const height = 260;
  const padding = { top: 30, right: 35, bottom: 45, left: 40 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = (index: number) =>
    padding.left + (index / Math.max(summaries.length - 1, 1)) * graphWidth;
  const getY = (t: number) =>
    padding.top + graphHeight - ((t - minTemp) / tempRange) * graphHeight;

  // Mean temp line
  const meanPoints = summaries
    .map((s, i) =>
      s.temperatureMean !== null && s.temperatureMean !== undefined
        ? { x: getX(i), y: getY(s.temperatureMean) }
        : null
    )
    .filter((p): p is { x: number; y: number } => p !== null);

  let meanLinePath = "";
  if (meanPoints.length > 1) {
    meanLinePath = `M ${meanPoints[0].x} ${meanPoints[0].y}`;
    for (let i = 0; i < meanPoints.length - 1; i++) {
      const p1 = meanPoints[i];
      const p2 = meanPoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      meanLinePath += ` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
  }

  const activeDay = hoverIndex !== null ? summaries[hoverIndex] : null;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Legend & active details */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400/40 border border-amber-400/80" />
            <span className="text-text-secondary font-medium">
              Daily Range (Min/Max)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-amber-400" />
            <span className="text-text-muted">Mean Temperature</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 rounded bg-cyan-400/60" />
            <span className="text-text-muted">
              Precipitation ({precipUnit})
            </span>
          </div>
        </div>

        {activeDay ? (
          <div className="font-mono text-xs flex items-center gap-2 px-2.5 py-1 rounded-lg glass">
            <span className="text-amber-400 font-semibold">
              {activeDay.date}:
            </span>
            <span className="text-text-primary">
              {formatTemperature(activeDay.temperatureMin, tempUnit)} -{" "}
              {formatTemperature(activeDay.temperatureMax, tempUnit)}
            </span>
            {activeDay.temperatureMean !== null &&
              activeDay.temperatureMean !== undefined && (
                <span className="text-text-muted">
                  (Mean {formatTemperature(activeDay.temperatureMean, tempUnit)}
                  )
                </span>
              )}
            <span className="text-cyan-400">
              · {formatPrecipitation(activeDay.precipitationSum, precipUnit)}
            </span>
          </div>
        ) : (
          <div className="text-text-muted text-[11px] font-mono">
            {summaries.length} days analyzed ({data.startDate} to {data.endDate}
            )
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative w-full aspect-[16/7] sm:aspect-[16/5] glass rounded-2xl p-2 sm:p-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible select-none"
          role="img"
          aria-label="Historical daily weather reanalysis chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = padding.top + ratio * graphHeight;
            const tVal = Math.round(maxTemp - ratio * tempRange);
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
                  {tVal}°
                </text>
              </g>
            );
          })}

          {/* Daily Min-Max Range Vertical Bars */}
          {summaries.map((s, i) => {
            const x = getX(i);
            const yMax = getY(s.temperatureMax);
            const yMin = getY(s.temperatureMin);
            const barHeight = Math.max(yMin - yMax, 4);
            const barWidth = Math.min(graphWidth / summaries.length - 2, 14);

            return (
              <g key={i}>
                {/* Temperature Span Bar */}
                <rect
                  x={x - barWidth / 2}
                  y={yMax}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  fill="rgba(251, 191, 36, 0.25)"
                  stroke="rgba(251, 191, 36, 0.7)"
                  strokeWidth="1"
                />

                {/* Precipitation indicator at bottom */}
                {s.precipitationSum > 0 && (
                  <rect
                    x={x - Math.max(barWidth / 2, 2)}
                    y={
                      height -
                      padding.bottom -
                      Math.min(s.precipitationSum * 2, 20)
                    }
                    width={barWidth}
                    height={Math.min(s.precipitationSum * 2, 20)}
                    rx="1.5"
                    fill="rgb(6 182 212)"
                    opacity="0.85"
                  />
                )}
              </g>
            );
          })}

          {/* Mean Temperature Curve */}
          {meanLinePath && (
            <path
              d={meanLinePath}
              fill="none"
              stroke="rgb(251 191 36)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Date labels */}
          {summaries.map((s, i) => {
            const step = Math.max(Math.floor(summaries.length / 7), 1);
            if (i % step !== 0 && i !== summaries.length - 1) return null;
            const x = getX(i);
            const shortDate = s.date.slice(5); // MM-DD
            return (
              <text
                key={i}
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] font-mono fill-text-muted"
              >
                {shortDate}
              </text>
            );
          })}

          {/* Interactive touch/mouse columns */}
          {summaries.map((_, i) => {
            const colWidth = graphWidth / summaries.length;
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

      <div className="text-[10px] text-text-muted flex items-center justify-between font-mono px-1">
        <span>Dataset: ECMWF ERA5 Reanalysis</span>
        <span>Atmospheric Physics Model & Historical Observations</span>
      </div>
    </div>
  );
}
