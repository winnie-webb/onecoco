"use client";

import { useEffect, useRef } from "react";
import { type CocoSpec, shapes, straws } from "@/lib/coco/spec";
import {
  HIBISCUS,
  LIME,
  STICKER_CENTER_Y,
  STRAW,
  TOP_RADIUS,
  TOP_Y,
  UMBRELLA,
  UNITS_PER_INCH,
  VIEW_ASPECT,
  VIEW_CENTER_Y,
  VIEW_HEIGHT,
  sampleProfile,
} from "@/lib/coco/shape";
import { type FontFamilies, drawSticker, loadStickerFont } from "@/lib/coco/sticker";

/*
 * The instant preview: an SVG coconut plus the real sticker canvas. It paints
 * with the page, updates on every keystroke, and stays as the whole preview
 * wherever 3D isn't available. Same geometry numbers as the 3D view, so the
 * cross-fade between them doesn't jump.
 */

const U = 100; // SVG units per model unit
const H = VIEW_HEIGHT * U;
const W = H * VIEW_ASPECT;
const sx = (x: number) => W / 2 + x * U;
const sy = (y: number) => H / 2 + (VIEW_CENTER_Y - y) * U;

const bodyPath = (() => {
  const prof = sampleProfile(4);
  const right = prof.map(([r, y]) => `${sx(r).toFixed(1)},${sy(y).toFixed(1)}`);
  const left = [...prof].reverse().map(([r, y]) => `${sx(-r).toFixed(1)},${sy(y).toFixed(1)}`);
  return `M${right.join("L")}L${left.join("L")}Z`;
})();

const strawEnds = (() => {
  const dx = Math.sin(-STRAW.tilt) * (STRAW.length / 2);
  const dy = Math.cos(STRAW.tilt) * (STRAW.length / 2);
  return { x1: sx(STRAW.x - dx), y1: sy(STRAW.y - dy), x2: sx(STRAW.x + dx), y2: sy(STRAW.y + dy) };
})();

const umbrellaTop = {
  x: sx(UMBRELLA.x - Math.sin(UMBRELLA.tilt) * (UMBRELLA.stick / 2)),
  y: sy(UMBRELLA.y + Math.cos(UMBRELLA.tilt) * (UMBRELLA.stick / 2)),
};
const umbrellaBottom = {
  x: sx(UMBRELLA.x + Math.sin(UMBRELLA.tilt) * (UMBRELLA.stick / 2)),
  y: sy(UMBRELLA.y - Math.cos(UMBRELLA.tilt) * (UMBRELLA.stick / 2)),
};
const deg = (rad: number) => (rad * 180) / Math.PI;

/** Sticker box as CSS percentages of the preview. */
export function stickerBox(shape: CocoSpec["shape"]) {
  const s = shapes.find((x) => x.value === shape) ?? shapes[0];
  const w = s.widthIn * UNITS_PER_INCH * U;
  const h = s.heightIn * UNITS_PER_INCH * U;
  return {
    left: `${((sx(0) - w / 2) / W) * 100}%`,
    top: `${((sy(STICKER_CENTER_Y) - h / 2) / H) * 100}%`,
    width: `${(w / W) * 100}%`,
    height: `${(h / H) * 100}%`,
  };
}

export function Coco2D({ spec, fonts }: { spec: CocoSpec; fonts: FontFamilies }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let live = true;
    const paint = () => {
      const s = shapes.find((x) => x.value === spec.shape) ?? shapes[0];
      // 128 px per inch is plenty for a thumbnail-sized overlay at 2x DPR.
      canvas.width = Math.round(s.widthIn * 128 * Math.min(window.devicePixelRatio || 1, 2));
      canvas.height = Math.round(s.heightIn * 128 * Math.min(window.devicePixelRatio || 1, 2));
      drawSticker(ctx, spec, { fonts, placeholder: true });
    };
    paint();
    loadStickerFont(spec.font, fonts).then(() => live && paint());
    return () => {
      live = false;
    };
  }, [spec, fonts]);

  const strawColor = (straws.find((s) => s.value === spec.straw) ?? straws[0]).color;
  const box = stickerBox(spec.shape);

  return (
    <div className="absolute inset-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="coco-husk" x1="0" x2="1">
            <stop offset="0" stopColor="#d9ccaa" />
            <stop offset="0.35" stopColor="#f3ecd9" />
            <stop offset="0.7" stopColor="#ece2c8" />
            <stop offset="1" stopColor="#c8b88f" />
          </linearGradient>
          <radialGradient id="coco-shadow">
            <stop offset="0.3" stopColor="#1a1f14" stopOpacity="0.3" />
            <stop offset="1" stopColor="#1a1f14" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={sx(0)} cy={sy(-1)} rx={140} ry={18} fill="url(#coco-shadow)" />
        {spec.extras.includes("umbrella") && (
          <g>
            <line x1={umbrellaBottom.x} y1={umbrellaBottom.y} x2={umbrellaTop.x} y2={umbrellaTop.y} stroke="#e8d7b0" strokeWidth="3" />
          </g>
        )}
        <line {...strawEnds} stroke={strawColor} strokeWidth="11" strokeLinecap="round" />
        <path d={bodyPath} fill="url(#coco-husk)" />
        <ellipse cx={sx(0)} cy={sy(TOP_Y)} rx={TOP_RADIUS * U} ry={7} fill="#e9dfbf" />
        <ellipse cx={sx(0.08)} cy={sy(TOP_Y)} rx={7} ry={2.5} fill="#8a7a55" />
        {spec.extras.includes("umbrella") && (
          <g transform={`rotate(${-deg(UMBRELLA.tilt)} ${umbrellaTop.x} ${umbrellaTop.y})`}>
            <path
              d={`M${umbrellaTop.x - 50},${umbrellaTop.y + 14} L${umbrellaTop.x},${umbrellaTop.y - 8} L${umbrellaTop.x + 50},${umbrellaTop.y + 14} Z`}
              fill="#f97316"
            />
            <path
              d={`M${umbrellaTop.x - 18},${umbrellaTop.y + 14} L${umbrellaTop.x},${umbrellaTop.y - 8} L${umbrellaTop.x + 18},${umbrellaTop.y + 14} Z`}
              fill="#fde68a"
            />
          </g>
        )}
        {spec.extras.includes("lime") && (
          <path
            d={`M${sx(LIME.x) - 26},${sy(LIME.y)} A26,26 0 0 1 ${sx(LIME.x) + 26},${sy(LIME.y)} Z`}
            fill="#bef264"
            stroke="#4d7c0f"
            strokeWidth="5"
          />
        )}
        {spec.extras.includes("hibiscus") && (
          <g transform={`translate(${sx(HIBISCUS.x)} ${sy(HIBISCUS.y) + 4})`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-12"
                rx="10"
                ry="14"
                fill="#e11d48"
                transform={`rotate(${i * 72})`}
              />
            ))}
            <circle r="5" fill="#7f1d1d" />
            <line x1="0" y1="0" x2="8" y2="-16" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
      <canvas ref={canvasRef} className="absolute" style={box} aria-hidden="true" />
    </div>
  );
}
