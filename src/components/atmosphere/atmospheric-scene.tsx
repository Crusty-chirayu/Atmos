"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  getAtmosphereThemeFromWeather,
  AtmosphereTheme,
} from "@/lib/atmosphere/weather-theme";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";

export interface AtmosphericSceneProps {
  weatherCode?: number;
  isDay?: boolean;
  children?: React.ReactNode;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  length?: number; // For rain streaks
}

export function AtmosphericScene({
  weatherCode = 0,
  isDay = true,
  children,
  className = "",
}: AtmosphericSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Resolve current visual theme based on weather state
  const theme: AtmosphereTheme = useMemo(() => {
    return getAtmosphereThemeFromWeather(weatherCode, isDay);
  }, [weatherCode, isDay]);

  // Canvas particle simulation loop
  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width =
      canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height =
      canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initialize particles according to theme
    const count = Math.min(theme.particles.count, 60);
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx:
          theme.particles.type === "rain"
            ? (Math.random() - 0.5) * 0.5
            : (Math.random() - 0.5) * theme.particles.speed,
        vy:
          theme.particles.type === "rain"
            ? Math.random() * 4 + theme.particles.speed
            : theme.particles.type === "snow"
              ? Math.random() * 0.8 + 0.3
              : (Math.random() - 0.5) * theme.particles.speed,
        size: Math.random() * theme.particles.size + 0.8,
        opacity: Math.random() * 0.5 + 0.2,
        length:
          theme.particles.type === "rain" ? Math.random() * 12 + 8 : undefined,
      });
    }

    let isVisible = true;
    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    let lightningTimer = 0;
    let lightningOpacity = 0;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      if (!isVisible) return;

      ctx.clearRect(0, 0, width, height);

      // Handle periodic lightning flash if theme allows
      if (theme.lightning) {
        lightningTimer++;
        if (lightningTimer > 240 && Math.random() < 0.02) {
          lightningOpacity = 0.35;
          lightningTimer = 0;
        }
        if (lightningOpacity > 0) {
          ctx.fillStyle = `rgba(200, 220, 255, ${lightningOpacity})`;
          ctx.fillRect(0, 0, width, height);
          lightningOpacity -= 0.03;
        }
      }

      // Update and draw particles
      ctx.fillStyle = theme.particles.color;
      ctx.strokeStyle = theme.particles.color;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        } else if (p.y < 0) {
          p.y = height;
        }
        if (p.x > width) p.x = 0;
        else if (p.x < 0) p.x = width;

        ctx.globalAlpha = p.opacity;

        if (theme.particles.type === "rain" && p.length) {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.length);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [theme, reducedMotion]);

  return (
    <div
      className={`relative w-full overflow-hidden transition-colors duration-1000 ${className}`}
      style={{
        background: theme.backgroundGradient,
      }}
    >
      {/* Background Particle Canvas */}
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          aria-hidden="true"
        />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
