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

  // Synchronize state during render when location prop changes
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

  // Compute tile range for viewport (assuming 800x450 container)
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
    const dLon = -(dx / 256 / n) * 360;

    const currentTile = latLonToTile(
      centerStartRef.current.lat,
      centerStartRef.current.lon,
      zoom
    );
    const newTileY = currentTile.y - dy / 256;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * newTileY) / n)));
    const newLat = Math.max(-85, Math.min(85, (latRad * 180) / Math.PI));

    let newLon = centerStartRef.current.lon + dLon;
    while (newLon > 180) newLon -= 360;
    while (newLon < -180) newLon += 360;

    setCenterLat(newLat);
    setCenterLon(newLon);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  };

  // Click on map to inspect coordinate
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tileX = centerTile.x + (clickX - containerWidth / 2) / 256;
    const tileY = centerTile.y + (clickY - containerHeight / 2) / 256;

    const coords = tileToLatLon(tileX, tileY, zoom);
    const clampedLat = parseFloat(
      Math.max(-85, Math.min(85, coords.lat)).toFixed(4)
    );
    const clampedLon = parseFloat(
      Math.max(-180, Math.min(180, coords.lon)).toFixed(4)
    );

    setClickedCoords({ lat: clampedLat, lon: clampedLon });
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
          <span className="font-bold text-[#222222] text-sm">
            Radar & Map
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]">
            Interactive
          </span>
        </div>

        {/* Layer Selector */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setActiveLayer("radar")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeLayer === "radar"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Precipitation Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("temperature")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeLayer === "temperature"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Temperature
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("wind")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeLayer === "wind"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Wind
          </button>
        </div>
      </div>

      {/* Main Map Tile Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleMapClick}
        role="region"
        aria-label="2D interactive weather map. Drag to pan, use +/- buttons to zoom, click anywhere to inspect."
        className="w-full h-[450px] relative rounded-lg overflow-hidden border border-[#E5E7EB] bg-[#F7F7F7] cursor-grab active:cursor-grabbing select-none"
      >
        {/* Render visible Web Mercator tile grid */}
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
              {/* Esri World Imagery / Natural Basemap Tile */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${zoom}/${t.y}/${t.x}`}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0";
                }}
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
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0";
                  }}
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
              <div className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#222222] shadow-sm flex items-center gap-1.5 whitespace-nowrap border border-[#E5E7EB] bg-white">
                <span className="w-2 h-2 rounded-full bg-[#FFC928]" />
                <span>{location.name}</span>
                {currentTemp !== undefined && (
                  <span className="font-bold text-[#222222] tabular-nums">
                    {Math.round(currentTemp)}
                    {tempUnit}
                  </span>
                )}
                {conditionText && (
                  <span className="text-xs text-[#6B7280] font-normal">
                    · {conditionText}
                  </span>
                )}
              </div>
              {/* Pin point */}
              <div className="w-2.5 h-2.5 rotate-45 bg-[#FFC928] border border-white -mt-1 shadow-xs" />
            </div>
          )}

        {/* Clicked Coordinate Marker & Action Popover */}
        {clickedCoords && (
          <div
            className="absolute top-4 left-4 z-20 p-3 rounded-md border border-[#E5E7EB] bg-white shadow-md flex flex-col gap-2 max-w-xs animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold text-[#222222]">
              Inspected Coordinate
            </div>
            <div className="text-xs text-[#6B7280] tabular-nums">
              Lat: {clickedCoords.lat}, Lon: {clickedCoords.lon}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSelectClicked}
                className="px-3 py-1.5 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-semibold text-xs transition-colors shadow-xs"
              >
                Inspect Weather
              </button>
              <button
                type="button"
                onClick={() => setClickedCoords(null)}
                className="px-2 py-1.5 text-xs text-[#6B7280] hover:text-[#222222]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Non-Radar Layer Configuration Notice */}
        {activeLayer !== "radar" && (
          <div className="absolute top-4 right-4 z-20 p-3 rounded-md border border-[#E5E7EB] bg-white max-w-xs text-xs text-[#6B7280] shadow-sm">
            <span className="font-semibold text-[#222222] block mb-1">
              {activeLayer === "temperature"
                ? "Global Temperature Heatmap"
                : "Wind Streamline Vector"}
            </span>
            <span>
              Real-time raster tiles require commercial weather provider keys. Local telemetry for {location.name} is active in dashboard cards.
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
            className="w-8 h-8 rounded-md bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F7] font-bold text-base shadow-xs flex items-center justify-center transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 1, 2))}
            aria-label="Zoom out map"
            className="w-8 h-8 rounded-md bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F7] font-bold text-base shadow-xs flex items-center justify-center transition-colors"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Recenter map on current location"
            title="Recenter on location"
            className="w-8 h-8 rounded-md bg-white border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F7] text-xs shadow-xs flex items-center justify-center transition-colors"
          >
            🎯
          </button>
        </div>

        {/* Radar Controls & Legend */}
        {activeLayer === "radar" && (
          <div
            className="absolute bottom-4 left-4 z-20 p-2.5 rounded-md border border-[#E5E7EB] bg-white flex flex-col gap-2 text-xs shadow-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[#6B7280]">Radar Opacity</span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={radarOpacity}
                onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                aria-label="Precipitation radar tile opacity"
                className="w-20 accent-[#FFC928] cursor-pointer"
              />
            </div>
            {/* Reflectivity dBZ Legend */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-[#E5E7EB] text-xs">
              <span className="text-[#6B7280]">dBZ:</span>
              <div className="flex items-center h-2 rounded overflow-hidden">
                <span className="w-5 h-full bg-emerald-500" title="Light: 20-30 dBZ" />
                <span className="w-5 h-full bg-sky-400" title="Moderate: 30-40 dBZ" />
                <span className="w-5 h-full bg-amber-400" title="Heavy: 40-50 dBZ" />
                <span className="w-5 h-full bg-rose-500" title="Intense/Hail: 50+ dBZ" />
              </div>
              <span className="text-[#6B7280]">Light → Heavy</span>
            </div>
          </div>
        )}
      </div>

      {/* Attribution Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#6B7280] px-1">
        <span>Map: © Esri, HERE, Garmin, FAO, NOAA, USGS</span>
        <span>
          Radar:{" "}
          {isRadarLoading ? "Refreshing..." : "RainViewer Real-time Tile API"}
        </span>
      </div>
    </div>
  );
}
