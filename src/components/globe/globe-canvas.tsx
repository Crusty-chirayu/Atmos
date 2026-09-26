"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  latLonToCartesian,
  cartesianToLatLon,
  FEATURED_CITIES,
  FeaturedCity,
} from "@/lib/globe/coordinates";
import { createProceduralEarthCanvas } from "@/lib/globe/earth-texture";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";

export interface GlobeCanvasProps {
  selectedLocation: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  onSelectCity?: (city: FeaturedCity) => void;
  onSelectCoordinates?: (coords: { latitude: number; longitude: number }) => void;
  className?: string;
}

export function GlobeCanvas({
  selectedLocation,
  onSelectCity,
  onSelectCoordinates,
  className = "",
}: GlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to mutable Three.js objects across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const selectedMarkerRef = useRef<THREE.Group | null>(null);
  const cityMarkersRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Interaction tracking refs
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const previousPointerPosRef = useRef({ x: 0, y: 0 });
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const isHoveringCityRef = useRef<string | null>(null);
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);
  const isAnimatingToTargetRef = useRef(false);
  const autoRotateRef = useRef(true);
  const animFrameIdRef = useRef<number | null>(null);

  // Accessible state
  const [hoveredCityName, setHoveredCityName] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const selectedLocationRef = useRef(selectedLocation);
  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  // Update target rotation when selectedLocation changes
  useEffect(() => {
    const lat = selectedLocation.latitude;
    const lon = selectedLocation.longitude;

    // To center (lat, lon) on camera (which looks down -Z toward origin),
    // target Y rotation should be -lon in radians, and target X rotation should be lat in radians
    const targetY = -(lon * Math.PI) / 180;
    const targetX = (lat * Math.PI) / 180;

    targetRotationRef.current = { x: targetX, y: targetY };
    isAnimatingToTargetRef.current = true;
    autoRotateRef.current = false;

    // Resume auto-rotation after 8 seconds of idle
    const timer = setTimeout(() => {
      autoRotateRef.current = true;
    }, 8000);

    return () => clearTimeout(timer);
  }, [selectedLocation.latitude, selectedLocation.longitude]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.2);
    cameraRef.current = camera;

    // 2. Renderer with safe WebGL context acquisition
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("WebGL initialization failed:", err);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rendererRef.current = renderer;

    // 3. Realistic Natural Planetary Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    // Warm Sun directional light creating realistic day/night terminator
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    sunLight.position.set(6, 3, 5);
    scene.add(sunLight);

    // 4. Globe Parent Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 5. Earth Sphere Mesh with Natural Satellite Surface
    const textureLoader = new THREE.TextureLoader();

    // Start with procedural canvas as immediate texture so it never flashes black or blank
    const earthCanvas = createProceduralEarthCanvas(2048, 1024);
    const proceduralTexture = new THREE.CanvasTexture(earthCanvas);
    proceduralTexture.colorSpace = THREE.SRGBColorSpace;

    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: proceduralTexture,
      roughness: 0.65,
      metalness: 0.05,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.y = -Math.PI / 2;
    globeGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Asynchronously load the high-res photorealistic NASA Blue Marble texture
    textureLoader.load(
      "/textures/earth_day.jpg",
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        earthMat.map = loadedTexture;
        earthMat.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn("Using procedural fallback for Earth surface:", err);
      }
    );

    // Specular ocean map for realistic ocean sunlight reflection
    textureLoader.load(
      "/textures/earth_specular.jpg",
      (specularTexture) => {
        earthMat.roughnessMap = specularTexture;
        earthMat.roughness = 0.7;
        earthMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Specular map optional
      }
    );

    // 6. Natural Dynamic Cloud Layer (Atmospheric Shell)
    const cloudGeo = new THREE.SphereGeometry(1.008, 48, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.rotation.y = -Math.PI / 2;
    globeGroup.add(cloudMesh);

    textureLoader.load(
      "/textures/earth_clouds.png",
      (cloudsTexture) => {
        cloudsTexture.colorSpace = THREE.SRGBColorSpace;
        cloudMat.map = cloudsTexture;
        cloudMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Cloud layer optional
      }
    );

    // 7. Subtle Rayleigh Scattering Limb Atmospheric Haze (restrained blue halo)
    const glowGeo = new THREE.SphereGeometry(1.025, 48, 48);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x3887d1) },
        viewVector: { value: camera.position },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.70 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(glowColor, max(0.0, intensity * 0.25));
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowMesh);

    // 8. Precision Station Marker (Aeronautical Reticle)
    const selectedGroup = new THREE.Group();
    globeGroup.add(selectedGroup);
    selectedMarkerRef.current = selectedGroup;

    // Center focal pin - Primary Yellow #FFC928
    const pinGeo = new THREE.SphereGeometry(0.016, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xffc928 });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    selectedGroup.add(pinMesh);

    // Clean outer reticle ring - Crisp White
    const ringGeo = new THREE.RingGeometry(0.024, 0.032, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    selectedGroup.add(ringMesh);

    // 9. Featured Reference Cities (Discrete Pips)
    cityMarkersRef.current.clear();
    const cityMarkerGeo = new THREE.SphereGeometry(0.011, 12, 12);

    for (const city of FEATURED_CITIES) {
      const cityMat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.65,
      });
      const cityMesh = new THREE.Mesh(cityMarkerGeo, cityMat);
      const pos = latLonToCartesian(city.latitude, city.longitude, 1.004);
      cityMesh.position.set(pos.x, pos.y, pos.z);
      cityMesh.userData = { cityId: city.id, city };
      globeGroup.add(cityMesh);
      cityMarkersRef.current.set(city.id, cityMesh);
    }

    // 9. Position the initial selected marker
    const initPos = latLonToCartesian(
      selectedLocationRef.current.latitude,
      selectedLocationRef.current.longitude,
      1.01
    );
    selectedGroup.position.set(initPos.x, initPos.y, initPos.z);
    selectedGroup.lookAt(initPos.x * 2, initPos.y * 2, initPos.z * 2);

    // Initial globe orientation to selected coordinates
    globeGroup.rotation.y = -(selectedLocationRef.current.longitude * Math.PI) / 180;
    globeGroup.rotation.x = (selectedLocationRef.current.latitude * Math.PI) / 180;

    // 10. Animation Loop
    let pulseAngle = 0;
    let isVisible = true;

    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (!isVisible) return;

      // Pulse selected marker
      pulseAngle += 0.05;
      const scale = 1 + Math.sin(pulseAngle) * 0.25;
      ringMesh.scale.set(scale, scale, scale);
      ringMat.opacity = 0.5 + Math.sin(pulseAngle) * 0.3;

      // Gently rotate clouds for dynamic atmospheric realism
      cloudMesh.rotation.y += 0.0002;

      // Smooth camera interpolation to target coordinates
      if (isAnimatingToTargetRef.current && targetRotationRef.current) {
        const { x: tX, y: tY } = targetRotationRef.current;
        // Normalize rotation difference around Y
        let diffY = tY - globeGroup.rotation.y;
        while (diffY > Math.PI) diffY -= Math.PI * 2;
        while (diffY < -Math.PI) diffY += Math.PI * 2;

        const diffX = tX - globeGroup.rotation.x;

        globeGroup.rotation.y += diffY * 0.08;
        globeGroup.rotation.x += diffX * 0.08;

        if (Math.abs(diffY) < 0.002 && Math.abs(diffX) < 0.002) {
          globeGroup.rotation.y = tY;
          globeGroup.rotation.x = tX;
          isAnimatingToTargetRef.current = false;
        }
      } else if (
        autoRotateRef.current &&
        !isDraggingRef.current &&
        !prefersReducedMotion
      ) {
        // Slow ambient rotation
        globeGroup.rotation.y += 0.0012;
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 11. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 12. Cleanup
    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();

      // Dispose geometries, materials, textures, renderer
      earthGeo.dispose();
      earthMat.dispose();
      proceduralTexture.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      cityMarkerGeo.dispose();
      renderer.dispose();
    };
  }, [prefersReducedMotion]);

  // Update selected marker position when coordinates change
  useEffect(() => {
    if (!selectedMarkerRef.current) return;
    const pos = latLonToCartesian(
      selectedLocation.latitude,
      selectedLocation.longitude,
      1.01
    );
    selectedMarkerRef.current.position.set(pos.x, pos.y, pos.z);
    selectedMarkerRef.current.lookAt(pos.x * 2, pos.y * 2, pos.z * 2);
  }, [selectedLocation.latitude, selectedLocation.longitude]);

  // ── Pointer / Drag Interaction Handlers ──
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    autoRotateRef.current = false;
    isAnimatingToTargetRef.current = false;
    previousPointerPosRef.current = { x: e.clientX, y: e.clientY };
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !globeGroupRef.current) {
      // Raycast for hover state on featured cities
      checkHoveredCity(e);
      return;
    }

    const deltaX = e.clientX - previousPointerPosRef.current.x;
    const deltaY = e.clientY - previousPointerPosRef.current.y;
    previousPointerPosRef.current = { x: e.clientX, y: e.clientY };

    const totalDist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );
    if (totalDist > 6) {
      hasDraggedRef.current = true;
    }

    const globe = globeGroupRef.current;
    globe.rotation.y += deltaX * 0.006;
    globe.rotation.x = Math.max(
      -Math.PI / 2.3,
      Math.min(Math.PI / 2.3, globe.rotation.x + deltaY * 0.006)
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    const totalDist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    // If the user dragged more than 6 pixels, treat as a drag rotation and DO NOT trigger coordinate picking
    if (hasDraggedRef.current || totalDist > 6) {
      return;
    }

    if (!cameraRef.current || !sceneRef.current) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // 1. First priority: Check if user tapped an existing featured city marker
    const cityMeshes = Array.from(cityMarkersRef.current.values());
    const cityIntersects = raycaster.intersectObjects(cityMeshes, false);
    if (cityIntersects.length > 0) {
      const hit = cityIntersects[0];
      const city = hit?.object.userData.city as FeaturedCity | undefined;
      if (city && onSelectCity) {
        onSelectCity(city);
        return;
      }
    }

    // 2. Second priority: Raycast against the actual Earth globe sphere
    if (earthMeshRef.current && (onSelectCoordinates || onSelectCity)) {
      const earthIntersects = raycaster.intersectObject(earthMeshRef.current, false);
      if (earthIntersects.length > 0) {
        const hit = earthIntersects[0];
        // Convert world hit point into globeGroup's local coordinate system (accounts for all rotations)
        const localPoint = globeGroupRef.current
          ? globeGroupRef.current.worldToLocal(hit.point.clone())
          : hit.point.clone();

        const { latitude, longitude } = cartesianToLatLon(
          localPoint.x,
          localPoint.y,
          localPoint.z
        );

        const validLat = Math.max(-90, Math.min(90, Number(latitude.toFixed(4))));
        let validLon = Number(longitude.toFixed(4));
        while (validLon > 180) validLon -= 360;
        while (validLon < -180) validLon += 360;
        validLon = Number(validLon.toFixed(4));

        // Update selected marker pin position immediately to give instant visual feedback
        if (selectedMarkerRef.current) {
          const newPos = latLonToCartesian(validLat, validLon, 1.01);
          selectedMarkerRef.current.position.set(newPos.x, newPos.y, newPos.z);
          selectedMarkerRef.current.lookAt(newPos.x * 2, newPos.y * 2, newPos.z * 2);
        }

        if (onSelectCoordinates) {
          onSelectCoordinates({ latitude: validLat, longitude: validLon });
        }
      }
    }
  };

  const checkHoveredCity = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cameraRef.current || !sceneRef.current) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const cityMeshes = Array.from(cityMarkersRef.current.values());
    const intersects = raycaster.intersectObjects(cityMeshes, false);

    if (intersects.length > 0) {
      const city = intersects[0]?.object.userData.city as
        FeaturedCity | undefined;
      if (city && isHoveringCityRef.current !== city.id) {
        isHoveringCityRef.current = city.id;
        setHoveredCityName(city.name);
      }
    } else if (isHoveringCityRef.current) {
      isHoveringCityRef.current = null;
      setHoveredCityName(null);
    }
  };

  // ── Keyboard & Accessible External Controls ──
  const rotateGlobe = useCallback((deltaY: number, deltaX: number) => {
    if (!globeGroupRef.current) return;
    autoRotateRef.current = false;
    isAnimatingToTargetRef.current = false;
    const globe = globeGroupRef.current;
    globe.rotation.y += deltaY;
    globe.rotation.x = Math.max(
      -Math.PI / 2.3,
      Math.min(Math.PI / 2.3, globe.rotation.x + deltaX)
    );
  }, []);

  const recenterGlobe = useCallback(() => {
    const lat = selectedLocation.latitude;
    const lon = selectedLocation.longitude;
    targetRotationRef.current = {
      x: (lat * Math.PI) / 180,
      y: -(lon * Math.PI) / 180,
    };
    isAnimatingToTargetRef.current = true;
  }, [selectedLocation.latitude, selectedLocation.longitude]);

  const adjustZoom = useCallback((direction: "in" | "out") => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const newZ =
      direction === "in"
        ? Math.max(2.2, cam.position.z - 0.3)
        : Math.min(4.5, cam.position.z + 0.3);
    cam.position.z = newZ;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[340px] flex items-center justify-center overflow-hidden select-none ${className}`}
      role="region"
      aria-label={`Interactive 3D Weather Globe displaying ${selectedLocation.name || "selected coordinates"}`}
    >
      {/* Three.js WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none focus:outline-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          isDraggingRef.current = false;
        }}
        tabIndex={0}
        aria-label="3D Earth globe. Use arrow keys to rotate, plus or minus to zoom, or use the accessible controls below."
        onKeyDown={(e) => {
          switch (e.key) {
            case "ArrowLeft":
              rotateGlobe(-0.15, 0);
              e.preventDefault();
              break;
            case "ArrowRight":
              rotateGlobe(0.15, 0);
              e.preventDefault();
              break;
            case "ArrowUp":
              rotateGlobe(0, -0.1);
              e.preventDefault();
              break;
            case "ArrowDown":
              rotateGlobe(0, 0.1);
              e.preventDefault();
              break;
            case "+":
            case "=":
              adjustZoom("in");
              e.preventDefault();
              break;
            case "-":
            case "_":
              adjustZoom("out");
              e.preventDefault();
              break;
            case "Home":
              recenterGlobe();
              e.preventDefault();
              break;
          }
        }}
      />

      {/* Hovered City Tooltip */}
      {hoveredCityName && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md text-xs font-semibold bg-white text-[#222222] border border-[#E5E7EB] shadow-xs pointer-events-none transition-opacity duration-200">
          Click to explore {hoveredCityName}
        </div>
      )}

      {/* Selected Location Latitude / Longitude Overlay */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-0.5 text-xs text-[#6B7280] pointer-events-none">
        <span className="font-semibold text-[#222222]">
          {selectedLocation.name || "Selected Location"}
        </span>
        <span className="tabular-nums">
          {Math.abs(selectedLocation.latitude).toFixed(2)}°
          {selectedLocation.latitude >= 0 ? "N" : "S"},{" "}
          {Math.abs(selectedLocation.longitude).toFixed(2)}°
          {selectedLocation.longitude >= 0 ? "E" : "W"}
        </span>
      </div>

      {/* Accessible Control Toolbar */}
      <div
        className="absolute bottom-4 right-4 flex items-center gap-1 p-1 rounded-md bg-white border border-[#E5E7EB] shadow-xs"
        role="toolbar"
        aria-label="Globe navigation controls"
      >
        <button
          type="button"
          onClick={() => rotateGlobe(-0.25, 0)}
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
          aria-label="Rotate globe left"
          title="Rotate Left"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => rotateGlobe(0.25, 0)}
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
          aria-label="Rotate globe right"
          title="Rotate Right"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => adjustZoom("in")}
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
          aria-label="Zoom in"
          title="Zoom In"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => adjustZoom("out")}
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
          aria-label="Zoom out"
          title="Zoom Out"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={recenterGlobe}
          className="px-2 py-1 rounded-md text-xs font-semibold bg-[#F7F7F7] hover:bg-[#E5E7EB] text-[#222222] border border-[#E5E7EB] transition-colors"
          aria-label="Recenter on selected location"
          title="Recenter"
        >
          Center
        </button>
      </div>
    </div>
  );
}
