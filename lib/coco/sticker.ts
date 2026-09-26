/**
 * The sticker, drawn once, used everywhere.
 *
 * `drawSticker` is the single source of truth for what goes on the coconut:
 * the 2D preview, the 3D decal texture, the share image and the 300 DPI print
 * file all call it. If the preview and the printed sticker ever disagree, the
 * bug is here and the fix lands in both at once.
 *
 * Browser-only (Canvas 2D), but has no React and no WebGL.
 */

import { type CocoSpec, type Design, type Font, type SymbolKey, shapes } from "./spec";

/** Resolved CSS font-family strings for each sticker font. */
export type FontFamilies = Record<Font, string>;

const FONT_WEIGHT: Record<Font, string> = { bold: "800", script: "400", classic: "400" };

type Palette = { name: string; nameStroke?: string; message: string; symbol: string };

const PALETTES: Record<Design, Palette> = {
  jamaican: { name: "#fed100", message: "#ffffff", symbol: "#fed100" },
  tropical: { name: "#0b3d2e", message: "#12543d", symbol: "#e2572b" },
  romance: { name: "#9f1239", message: "#be123c", symbol: "#e11d48" },
  birthday: { name: "#5b21b6", message: "#7c3aed", symbol: "#f59e0b" },
};

/** Pixel size for a sticker shape at a given resolution (px per inch). */
export function stickerSize(shape: CocoSpec["shape"], ppi: number) {
  const s = shapes.find((x) => x.value === shape) ?? shapes[0];
  return { width: Math.round(s.widthIn * ppi), height: Math.round(s.heightIn * ppi) };
}

/** Small deterministic PRNG so confetti lands in the same place every draw. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function background(ctx: CanvasRenderingContext2D, design: Design, w: number, h: number) {
  const s = Math.min(w, h);
  switch (design) {
    case "jamaican": {
      ctx.fillStyle = "#009b3a";
      ctx.fillRect(0, 0, w, h);
      // Black hoists top and bottom, gold saltire — the flag, fitted to the shape.
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(0, h);
      ctx.moveTo(w, 0);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(w, h);
      ctx.fill();
      ctx.strokeStyle = "#fed100";
      ctx.lineWidth = s * 0.13;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(w, 0);
      ctx.lineTo(0, h);
      ctx.stroke();
      // Dark band behind the text keeps the name legible over the flag.
      ctx.fillStyle = "rgba(6, 37, 27, 0.88)";
      roundRect(ctx, w * 0.08, h * 0.33, w * 0.84, h * 0.4, s * 0.08);
      ctx.fill();
      break;
    }
    case "tropical": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#8ee0cf");
      g.addColorStop(1, "#fdf3d8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(26, 107, 79, 0.9)";
      leaf(ctx, w * 0.1, h * 0.95, s * 0.42, -0.9);
      leaf(ctx, w * 0.02, h * 0.8, s * 0.36, -0.3);
      leaf(ctx, w * 0.92, h * 0.06, s * 0.4, 2.3);
      leaf(ctx, w * 1.0, h * 0.2, s * 0.32, 2.9);
      break;
    }
    case "romance": {
      ctx.fillStyle = "#fde2e7";
      ctx.fillRect(0, 0, w, h);
      const r = rng(7);
      ctx.fillStyle = "#f9b4c3";
      for (let i = 0; i < 18; i++) {
        drawSymbol(ctx, "heart", r() * w, r() * h, s * (0.06 + r() * 0.05));
      }
      break;
    }
    case "birthday": {
      ctx.fillStyle = "#fff7e6";
      ctx.fillRect(0, 0, w, h);
      const r = rng(11);
      const colors = ["#f472b6", "#38bdf8", "#fbbf24", "#34d399", "#a78bfa"];
      for (let i = 0; i < 46; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.save();
        ctx.translate(r() * w, r() * h);
        ctx.rotate(r() * Math.PI);
        ctx.fillRect(-s * 0.012, -s * 0.03, s * 0.024, s * 0.06);
        ctx.restore();
      }
      break;
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A palm frond: a spine with leaflets, pointing along `angle`. */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let i = 1; i <= 7; i++) {
    const t = i / 8;
    const l = len * 0.32 * Math.sin(Math.PI * t);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(len * t, side * l * 0.5, l * 0.55, len * 0.035, side * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillRect(0, -len * 0.015, len, len * 0.03);
  ctx.restore();
}

const HEART = "M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.3C19.5 16.4 12 21 12 21z";
const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

let heartPath: Path2D | undefined;
let starPath: Path2D | undefined;

/** Our own glyph set, drawn with the current fillStyle, centred on (cx, cy). */
export function drawSymbol(ctx: CanvasRenderingContext2D, key: SymbolKey, cx: number, cy: number, size: number) {
  if (key === "none") return;
  ctx.save();
  ctx.translate(cx, cy);
  switch (key) {
    case "heart":
    case "star": {
      heartPath ??= new Path2D(HEART);
      starPath ??= new Path2D(STAR);
      const k = size / 24;
      ctx.scale(k, k);
      ctx.translate(-12, -12);
      ctx.fill(key === "heart" ? heartPath : starPath);
      break;
    }
    case "sun": {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-size * 0.035, size * 0.31, size * 0.07, size * 0.17);
      }
      break;
    }
    case "flower": {
      for (let i = 0; i < 5; i++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.24, size * 0.16, size * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fed100";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "palm": {
      ctx.translate(0, size * 0.5);
      ctx.lineCap = "round";
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = size * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.12, -size * 0.45, 0, -size * 0.75);
      ctx.stroke();
      ctx.translate(0, -size * 0.75);
      for (const a of [-2.9, -2.3, -1.57, -0.85, -0.25]) leaf(ctx, 0, 0, size * 0.7, a);
      break;
    }
  }
  ctx.restore();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: string, family: string, start: number, min: number, maxWidth: number) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Break a message into at most two lines that fit `maxWidth`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(" ");
  let best = [text];
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const wmax = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (wmax < bestWidth) {
      bestWidth = wmax;
      best = [a, b];
    }
  }
  return best;
}

export type DrawOptions = {
  fonts: FontFamilies;
  /** Show "Your name" in place of an empty name (preview only, never print). */
  placeholder?: boolean;
};

/**
 * Draw the sticker into the whole of `ctx.canvas`, transparent outside the
 * die-cut shape. The canvas size decides resolution; its aspect should come
 * from `stickerSize`.
 */
export function drawSticker(ctx: CanvasRenderingContext2D, spec: CocoSpec, opts: DrawOptions) {
  const { width: w, height: h } = ctx.canvas;
  const s = Math.min(w, h);
  const pal = PALETTES[spec.design];
  const family = opts.fonts[spec.font];
  const weight = FONT_WEIGHT[spec.font];

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.clip();

  background(ctx, spec.design, w, h);

  const name = spec.name.trim();
  const message = spec.message.trim();
  const hasSymbol = spec.symbol !== "none";

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Vertical layout: symbol above, name in the middle, message below.
  const nameY = h * (message ? 0.47 : 0.52);
  const shown = name || (opts.placeholder ? "Your name" : "");
  if (shown) {
    const size = fitFont(ctx, shown, weight, family, s * (spec.font === "script" ? 0.2 : 0.21), s * 0.08, w * 0.7);
    ctx.globalAlpha = name ? 1 : 0.45;
    ctx.fillStyle = pal.name;
    ctx.fillText(shown, w / 2, nameY + (spec.font === "script" ? -size * 0.08 : 0));
    ctx.globalAlpha = 1;
  }

  if (message) {
    const size = s * 0.075;
    // Script is lovely for a name and illegible at message size: pair it with Bold.
    ctx.font = spec.font === "classic" ? `400 ${size}px ${family}` : `600 ${size}px ${opts.fonts.bold}`;
    const lines = wrap(ctx, message, w * 0.62);
    ctx.fillStyle = pal.message;
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.63 + i * size * 1.2));
  }

  if (hasSymbol) {
    ctx.fillStyle = pal.symbol;
    drawSymbol(ctx, spec.symbol, w / 2, h * (message ? 0.27 : 0.29), s * 0.13);
  }

  ctx.restore();

  // Die-cut white border, drawn last so nothing bleeds over it.
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - s * 0.035, h / 2 - s * 0.035, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Resolution for the label printer. */
export const PRINT_PPI = 300;

/**
 * The production file for the prep point: the same drawing at the sticker's
 * real size, 300 DPI. Wait for fonts first, or the printer gets the fallback.
 */
export async function renderPrintFile(spec: CocoSpec, fonts: FontFamilies): Promise<Blob> {
  await loadStickerFont(spec.font, fonts);
  const { width, height } = stickerSize(spec.shape, PRINT_PPI);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  drawSticker(ctx, spec, { fonts });
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Make sure a sticker font is ready before drawing with it (fetches it on first use). */
export function loadStickerFont(font: Font, fonts: FontFamilies): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return document.fonts.load(`${FONT_WEIGHT[font]} 48px ${fonts[font]}`).catch(() => undefined);
}
