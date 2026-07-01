'use client';

import { useEffect, useRef } from 'react';

/**
 * Subtle rotating wireframe globe, rendered on a fixed full-viewport canvas
 * behind all app content. Pure canvas 2D — no WebGL/three.js dependency,
 * cheap enough to run continuously alongside live-polling dashboards.
 * Line color reads the --globe-line CSS variable so it adapts to the
 * active theme (brighter blue on night, deeper blue on day).
 */
export function GlobeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let angle = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let lineRgb = '96, 165, 250';

    const readThemeColor = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--globe-line').trim();
      if (raw) lineRgb = raw.replace(/\s+/g, ', ');
    };
    readThemeColor();
    const themeObserver = new MutationObserver(readThemeColor);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const LAT_STEPS = 16;
    const LON_STEPS = 24;
    const points: { lat: number; lon: number }[] = [];
    for (let i = 0; i <= LAT_STEPS; i++) {
      const lat = (Math.PI * i) / LAT_STEPS - Math.PI / 2;
      for (let j = 0; j < LON_STEPS; j++) {
        const lon = (2 * Math.PI * j) / LON_STEPS;
        points.push({ lat, lon });
      }
    }

    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
    }
    resize();
    window.addEventListener('resize', resize);

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function draw() {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Position: right side, vertically centered, large radius bleeding off-canvas
      const cx = width * 0.82;
      const cy = height * 0.42;
      const radius = Math.min(width, height) * 0.34;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      type Proj = { x: number; y: number; z: number; lat: number };
      const projected: Proj[] = [];

      for (const p of points) {
        const x0 = Math.cos(p.lat) * Math.cos(p.lon);
        const y0 = Math.sin(p.lat);
        const z0 = Math.cos(p.lat) * Math.sin(p.lon);
        // rotate around Y axis
        const x = x0 * cosA + z0 * sinA;
        const z = -x0 * sinA + z0 * cosA;
        const y = y0;

        const scale = radius;
        projected.push({
          x: cx + x * scale,
          y: cy + y * scale,
          z,
          lat: p.lat,
        });
      }

      // Outer rim glow
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.15);
      grad.addColorStop(0, `rgba(${lineRgb}, 0.10)`);
      grad.addColorStop(1, `rgba(${lineRgb}, 0)`);
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Sphere outline
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${lineRgb}, 0.16)`;
      ctx.lineWidth = 1;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Latitude rings (as ellipses, dimmer when farther)
      for (let i = 1; i < LAT_STEPS; i++) {
        const lat = (Math.PI * i) / LAT_STEPS - Math.PI / 2;
        const ringRadius = Math.cos(lat) * radius;
        const ringY = cy + Math.sin(lat) * radius;
        if (ringRadius < 1) continue;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${lineRgb}, 0.07)`;
        ctx.lineWidth = 1;
        ctx.ellipse(cx, ringY, ringRadius, ringRadius * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Grid dots — only front hemisphere, faded by depth
      for (const pr of projected) {
        if (pr.z < -0.15) continue;
        const depthAlpha = 0.08 + ((pr.z + 1) / 2) * 0.34;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${lineRgb}, ${depthAlpha.toFixed(3)})`;
        const dotSize = 0.9 + ((pr.z + 1) / 2) * 1.1;
        ctx.arc(pr.x, pr.y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // A couple of "active route" arcs for flavor (static great-circle-ish curves)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.moveTo(cx - radius * 0.55, cy - radius * 0.1);
      ctx.quadraticCurveTo(cx - radius * 0.1, cy - radius * 0.7, cx + radius * 0.35, cy - radius * 0.25);
      ctx.stroke();

      if (!prefersReducedMotion) angle += 0.0012;
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-90"
    />
  );
}
