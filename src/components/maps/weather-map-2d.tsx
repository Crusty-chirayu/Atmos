"use client";

import React, { useState, useEffect, useRef } from "react";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";

export type WeatherMapLayer = "radar" | "temperature" | "wind" | "satellite";

export interface WeatherMap2DProps {
  location: GeocodingLocation;
  onSelectLocation?: (coords: { latitude: number; longitude: number }) => void;
  currentTemp?: number;
  tempUnit?: "°C" | "°F";
  conditionText?: string;
}

// Convert geographic coordinates to Web Mercator tile numbers
function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

// Convert tile coordinate to lat/lon
function tileToLatLon(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

export function WeatherMap2D({
  location,
  onSelectLocation,
  currentTemp,
  tempUnit = "°C",
  conditionText,
}: WeatherMap2DProps) {
  const [zoom, setZoom] = useState<number>(6);
  const [prevLocation, setPrevLocation] = useState<GeocodingLocation>(location);
  const [centerLat, setCenterLat] = useState<number>(location.latitude);
  const [centerLon, setCenterLon] = useState<number>(location.longitude);
  const [activeLayer, setActiveLayer] = useState<WeatherMapLayer>("radar");
  const [radarOpacity, setRadarOpacity] = useState<number>(0.75);
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
  const [isRadarLoading, setIsRadarLoading] = useState<boolean>(false);
  const [clickedCoords, setClickedCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  // Synchronize state during render when location prop changes (official React pattern)
  if (
    prevLocation.latitude !== location.latitude ||
    prevLocation.longitude !== location.longitude
  ) {
    setPrevLocation(location);
    setCenterLat(location.latitude);
    setCenterLon(location.longitude);
    setClickedCoords(null);
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const centerStartRef = useRef<{ lat: number; lon: number }>({
    lat: centerLat,
    lon: centerLon,
  });

  // Fetch latest public RainViewer radar timestamp
  useEffect(() => {
    let ignore = false;
    async function loadRadarMetadata() {
      setIsRadarLoading(true);
      try {
        const res = await fetch(
          "https://api.rainviewer.com/public/weather-maps.json"
        );
        if (res.ok) {
          const data = (await res.json()) as {
            radar?: { past?: Array<{ time: number }> };
          };
          const past = data.radar?.past;
          if (past && past.length > 0 && !ignore) {
            // Most recent past radar frame
            const latest = past[past.length - 1];
            setRadarTimestamp(latest.time);
          }
        }
      } catch {
        // Fallback silently if offline or blocked
      } finally {
        if (!ignore) setIsRadarLoading(false);
      }
    }

    loadRadarMetadata();
    return () => {
      ignore = true;
    };
  }, []);

  // Compute tile range for viewport (assuming 800x480 container)
  const containerWidth = 800;
  const containerHeight = 450;
  const centerTile = latLonToTile(centerLat, centerLon, zoom);

  const startTileX = Math.floor(centerTile.x - containerWidth / (2 * 256));
  const endTileX = Math.ceil(centerTile.x + containerWidth / (2 * 256));
  const startTileY = Math.floor(centerTile.y - containerHeight / (2 * 256));
  const endTileY = Math.ceil(centerTile.y + containerHeight / (2 * 256));

  const tiles = [];
  const maxTile = Math.pow(2, zoom);

  for (let x = startTileX; x <= endTileX; x++) {
    for (let y = startTileY; y <= endTileY; y++) {
      if (y >= 0 && y < maxTile) {
        // Normalize wrap-around for X (longitude)
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const pixelLeft = containerWidth / 2 + (x - centerTile.x) * 256;
        const pixelTop = containerHeight / 2 + (y - centerTile.y) * 256;

        tiles.push({
          x: wrappedX,
          y,
          key: `${zoom}-${wrappedX}-${y}`,
          left: pixelLeft,
          top: pixelTop,
        });
      }
    }
  }

  // Pointer drag interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    centerStartRef.current = { lat: centerLat, lon: centerLon };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const n = Math.pow(2, zoom);
    // Delta in tile units
    const dTileX = dx / 256;
    const dTileY = dy / 256;

    const startTile = latLonToTile(
      centerStartRef.current.lat,
      centerStartRef.current.lon,
      zoom
    );
    const newTileX = startTile.x - dTileX;
    const newTileY = Math.min(Math.max(startTile.y - dTileY, 0), n - 1);

    const newCoords = tileToLatLon(newTileX, newTileY, zoom);
    setCenterLat(newCoords.lat);
    setCenterLon(newCoords.lon);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Map Click to inspect location
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const dxPixels = clickX - containerWidth / 2;
    const dyPixels = clickY - containerHeight / 2;

    const clickedTileX = centerTile.x + dxPixels / 256;
    const clickedTileY = centerTile.y + dyPixels / 256;

    const coords = tileToLatLon(clickedTileX, clickedTileY, zoom);
    setClickedCoords({
      lat: Number(coords.lat.toFixed(4)),
      lon: Number(coords.lon.toFixed(4)),
    });
  };

  const handleRecenter = () => {
    setCenterLat(location.latitude);
    setCenterLon(location.longitude);
    setZoom(6);
    setClickedCoords(null);
  };

  const handleSelectClicked = () => {
    if (clickedCoords && onSelectLocation) {
      onSelectLocation({
        latitude: clickedCoords.lat,
        longitude: clickedCoords.lon,
      });
      setClickedCoords(null);
    }
  };

  // Compute screen pixel position of the active selected location marker
  const markerTile = latLonToTile(location.latitude, location.longitude, zoom);
  const markerX = containerWidth / 2 + (markerTile.x - centerTile.x) * 256;
  const markerY = containerHeight / 2 + (markerTile.y - centerTile.y) * 256;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Map Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-text-primary text-sm">
            2D Atmospheric Radar & Map
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20">
            Interactive
          </span>
        </div>

        {/* Layer Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass">
          <button
            type="button"
            onClick={() => setActiveLayer("radar")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeLayer === "radar"
                ? "bg-accent-500 text-atmos-950 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Precipitation Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("temperature")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeLayer === "temperature"
                ? "bg-accent-500 text-atmos-950 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Temperature
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("wind")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeLayer === "wind"
                ? "bg-accent-500 text-atmos-950 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Wind Vector
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleMapClick}
        className="relative w-full h-[400px] sm:h-[450px] glass rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing border border-atmos-700/40 select-none bg-atmos-950"
      >
        {/* Render Tile Grid */}
        <div className="absolute inset-0 pointer-events-none">
          {tiles.map((t) => (
            <div
              key={t.key}
              style={{
                position: "absolute",
                left: `${t.left}px`,
                top: `${t.top}px`,
                width: "256px",
                height: "256px",
              }}
            >
              {/* Base CartoDB Dark Matter Tile */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${zoom}/${t.x}/${t.y}.png`}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />

              {/* RainViewer Live Radar Overlay Tile */}
              {activeLayer === "radar" && radarTimestamp && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/${zoom}/${t.x}/${t.y}/2/1_1.png`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
                  style={{ opacity: radarOpacity }}
                  loading="lazy"
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>

        {/* Selected Location Beacon Marker */}
        {markerX >= -50 &&
          markerX <= containerWidth + 50 &&
          markerY >= -50 &&
          markerY <= containerHeight + 50 && (
            <div
              style={{
                position: "absolute",
                left: `${markerX}px`,
                top: `${markerY}px`,
                transform: "translate(-50%, -100%)",
              }}
              className="pointer-events-none flex flex-col items-center z-10"
            >
              {/* Telemetry Badge */}
              <div className="px-2.5 py-1 rounded-xl glass text-[11px] font-mono font-bold text-text-primary shadow-2xl flex items-center gap-1.5 whitespace-nowrap border border-accent-400/40 bg-atmos-900/90">
                <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                <span>{location.name}</span>
                {currentTemp !== undefined && (
                  <span className="text-accent-400">
                    {Math.round(currentTemp)}
                    {tempUnit}
                  </span>
                )}
                {conditionText && (
                  <span className="text-[10px] text-text-muted font-normal">
                    · {conditionText}
                  </span>
                )}
              </div>
              {/* Pin point */}
              <div className="w-2.5 h-2.5 rotate-45 bg-accent-400 border border-atmos-900 -mt-1 shadow-md" />
            </div>
          )}

        {/* Clicked Coordinate Marker & Action Popover */}
        {clickedCoords && (
          <div
            className="absolute top-4 left-4 z-20 p-3 rounded-2xl glass border border-accent-500/30 bg-atmos-900/95 shadow-2xl flex flex-col gap-2 max-w-xs animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold text-text-primary">
              Inspected Coordinate
            </div>
            <div className="font-mono text-[11px] text-text-muted">
              Lat: {clickedCoords.lat}, Lon: {clickedCoords.lon}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSelectClicked}
                className="px-3 py-1.5 rounded-xl bg-accent-500 text-atmos-950 font-bold text-xs hover:bg-accent-400 transition-colors shadow-sm"
              >
                Inspect Weather
              </button>
              <button
                type="button"
                onClick={() => setClickedCoords(null)}
                className="px-2 py-1.5 text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Non-Radar Layer Configuration Notice (Honest Architecture) */}
        {activeLayer !== "radar" && (
          <div className="absolute top-4 right-4 z-20 p-3 rounded-2xl glass border border-amber-500/30 bg-atmos-900/90 max-w-xs text-xs text-text-secondary">
            <span className="font-semibold text-amber-400 block mb-1">
              {activeLayer === "temperature"
                ? "Global Temperature Heatmap"
                : "Wind Streamline Vector"}
            </span>
            <span>
              Real-time raster tiles require commercial weather provider keys
              (OpenWeatherMap or Mapbox). Local telemetry for {location.name} is
              active in dashboard cards.
            </span>
          </div>
        )}

        {/* Map Controls (Zoom & Recenter) */}
        <div
          className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 1, 12))}
            aria-label="Zoom in map"
            className="w-8 h-8 rounded-xl glass flex items-center justify-center text-text-primary hover:bg-atmos-700/60 font-bold text-lg shadow-md transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 1, 2))}
            aria-label="Zoom out map"
            className="w-8 h-8 rounded-xl glass flex items-center justify-center text-text-primary hover:bg-atmos-700/60 font-bold text-lg shadow-md transition-colors"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Recenter map on current location"
            title="Recenter on location"
            className="w-8 h-8 rounded-xl glass flex items-center justify-center text-accent-400 hover:bg-atmos-700/60 text-xs font-mono shadow-md transition-colors"
          >
            🎯
          </button>
        </div>

        {/* Radar Opacity Slider (When Radar Active) */}
        {activeLayer === "radar" && (
          <div
            className="absolute bottom-4 left-4 z-20 px-3 py-2 rounded-2xl glass flex items-center gap-2 text-xs font-mono bg-atmos-900/80"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-text-muted">Radar Opacity</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={radarOpacity}
              onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
              aria-label="Precipitation radar tile opacity"
              className="w-20 accent-accent-400"
            />
          </div>
        )}
      </div>

      {/* Attribution Footer */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-text-muted font-mono px-1">
        <span>Map: © OpenStreetMap contributors, © CARTO</span>
        <span>
          Radar:{" "}
          {isRadarLoading ? "Refreshing..." : "RainViewer Real-time Tile API"}
        </span>
      </div>
    </div>
  );
}
