"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  type CocoSpec,
  MESSAGE_MAX,
  NAME_MAX,
  cleanText,
  defaultSpec,
  designs,
  extras,
  fonts as fontOptions,
  formatUsd,
  coconutView,
  normalizeSpec,
  occasions,
  products,
  priceLines,
  shapes,
  specFromParams,
  specToParams,
  straws,
  symbols,
  validateSpec,
} from "@/lib/coco/spec";
import { type FontFamilies, drawSticker, drawSymbol, loadStickerFont } from "@/lib/coco/sticker";
import { VIEW_ASPECT } from "@/lib/coco/shape";
import { brand } from "@/lib/brand";
import type { CocoScene } from "./coco3d/scene";
import { Coco2D } from "./Coco2D";

type Action =
  | { type: "set"; spec: CocoSpec }
  | { type: "field"; key: "name" | "name2" | "message"; value: string }
  | { type: "pick"; key: "product" | "design" | "font" | "shape" | "straw" | "symbol"; value: string }
  | { type: "occasion"; value: string }
  | { type: "extra"; value: string; on: boolean };

function reducer(spec: CocoSpec, a: Action): CocoSpec {
  switch (a.type) {
    case "set":
      return a.spec;
    case "field":
      return { ...spec, [a.key]: cleanText(a.value, a.key === "message" ? MESSAGE_MAX : NAME_MAX) };
    case "pick":
      return normalizeSpec({ ...spec, [a.key]: a.value });
    case "occasion": {
      // Picking an occasion also picks the design that suits it; they can change it after.
      const o = occasions.find((x) => x.value === a.value);
      return o ? { ...spec, occasion: o.value, design: o.design } : { ...spec, occasion: "" };
    }
    case "extra": {
      const set = new Set(spec.extras);
      if (a.on) set.add(a.value as CocoSpec["extras"][number]);
      else set.delete(a.value as CocoSpec["extras"][number]);
      return normalizeSpec({ ...spec, extras: [...set] });
    }
  }
}

type Mode = "2d" | "loading" | "3d";

export function CocoBuilder({ fonts }: { fonts: FontFamilies }) {
  const [spec, dispatch] = useReducer(reducer, defaultSpec);
  const [mode, setMode] = useState<Mode>("2d");
  // Which coconut of a Coco for Two the preview shows.
  const [active, setActive] = useState(0);
  const shown = spec.product === "two" ? active : 0;
  const view = useMemo(() => coconutView(spec, shown), [spec, shown]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CocoScene | null>(null);
  const specRef = useRef(spec);

  // Restore a shared design from the URL.
  useEffect(() => {
    if (window.location.search) dispatch({ type: "set", spec: specFromParams(new URLSearchParams(window.location.search)) });
  }, []);

  // Keep the URL in step, so the link is always the design. replaceState: no history spam.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = specToParams(spec).toString();
      window.history.replaceState(window.history.state, "", q ? `?${q}` : window.location.pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [spec]);

  // Load the 3D view once the page is idle. Until then — or forever, where 3D
  // isn't a good idea — the 2D preview is the preview.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    let cancelled = false;
    const start = async () => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      setMode("loading");
      try {
        const { createScene } = await import("./coco3d/scene");
        if (cancelled) return;
        const scene = createScene(canvas, {
          fonts,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          onReady: () => !cancelled && setMode("3d"),
          onContextLost: () => {
            sceneRef.current = null;
            setMode("2d");
          },
        });
        sceneRef.current = scene;
        scene.update(specRef.current);
      } catch {
        // No WebGL, or the chunk failed on a bad connection: 2D is a complete preview.
        if (!cancelled) setMode("2d");
      }
    };
    // Safari has no requestIdleCallback.
    const idle = "requestIdleCallback" in window;
    const id = idle ? window.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback(id);
      else clearTimeout(id);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [fonts]);

  useEffect(() => {
    specRef.current = view;
    sceneRef.current?.update(view);
  }, [view]);

  const problems = useMemo(() => validateSpec(spec), [spec]);
  const lines = useMemo(() => priceLines(spec), [spec]);
  const total = lines.reduce((n, l) => n + l.cents, 0);
  const occasion = occasions.find((o) => o.value === spec.occasion);
  const problemFor = (f: "name" | "name2" | "message") => problems.find((p) => p.field === f)?.message;

  const share = useCallback(async () => {
    const canvas = await shareImage(view, fonts, sceneRef.current);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], "my-coco.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `My ${brand.name}` });
        return;
      } catch {
        // Dismissed the share sheet: nothing to do.
        return;
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, [view, fonts]);

  const orderHref = `/order?${specToParams(spec).toString()}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      {/* Preview */}
      {/* On phones the preview sticks under the header, so it stays in view while they type. */}
      <div className="sticky top-[65px] z-10 -mx-4 bg-sand-50/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0">
        {spec.product === "two" && (
          <div className="mb-2 flex justify-center gap-2" role="group" aria-label="Show coconut">
            {[spec.name, spec.name2].map((n, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={shown === i}
                onClick={() => setActive(i)}
                className={chipClass(shown === i, "min-h-9 max-w-[45%] truncate")}
              >
                {n.trim() || `Coco ${i + 1}`}
              </button>
            ))}
          </div>
        )}
        <div
          className="relative mx-auto h-[38svh] max-h-[34rem] overflow-hidden rounded-[2rem] bg-gradient-to-b from-sand-100 to-sand-200 lg:h-auto lg:w-full lg:max-w-md"
          style={{ aspectRatio: String(VIEW_ASPECT) }}
          role="img"
          aria-label={describe(view)}
        >
          <div className={`transition-opacity duration-300 ${mode === "3d" ? "opacity-0" : "opacity-100"}`} aria-hidden="true">
            <Coco2D spec={view} fonts={fonts} />
          </div>
          <canvas
            ref={canvasRef}
            tabIndex={mode === "3d" ? 0 : -1}
            aria-label="Spin the coconut: drag, or use the left and right arrow keys"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                sceneRef.current?.spin(e.key === "ArrowLeft" ? -Math.PI / 4 : Math.PI / 4);
              }
            }}
            className={`absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-300 active:cursor-grabbing ${
              mode === "3d" ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          {mode === "3d" && (
            <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-xs font-medium text-jungle-800/70">
              Drag to spin
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
        <Choice
          legend="Your coco"
          name="product"
          value={spec.product}
          options={products.map((p) => ({ value: p.value, label: `${p.label} · ${formatUsd(p.priceCents)}` }))}
          onChange={(v) => {
            dispatch({ type: "pick", key: "product", value: v });
            setActive(0);
          }}
        />

        <Field
          label={spec.product === "two" ? "First name" : "Name"}
          hint={`${spec.name.length}/${NAME_MAX}`}
          error={problemFor("name")}
        >
          <input
            type="text"
            value={spec.name}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder="Sarah"
            onFocus={() => setActive(0)}
            onChange={(e) => dispatch({ type: "field", key: "name", value: e.target.value })}
            className={inputClass}
          />
        </Field>

        {spec.product === "two" && (
          <Field label="Second name" hint={`${spec.name2.length}/${NAME_MAX}`} error={problemFor("name2")}>
            <input
              type="text"
              value={spec.name2}
              maxLength={NAME_MAX}
              autoComplete="off"
              placeholder="Tom"
              onFocus={() => setActive(1)}
              onChange={(e) => dispatch({ type: "field", key: "name2", value: e.target.value })}
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Message" hint={`${spec.message.length}/${MESSAGE_MAX}`} error={problemFor("message")}>
          <input
            type="text"
            value={spec.message}
            maxLength={MESSAGE_MAX}
            autoComplete="off"
            placeholder={occasion?.placeholder ?? "Jamaica 2026"}
            onChange={(e) => dispatch({ type: "field", key: "message", value: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Choice
          legend="Occasion"
          name="occasion"
          value={spec.occasion}
          options={occasions}
          onChange={(v) => dispatch({ type: "occasion", value: v === spec.occasion ? "" : v })}
        />
        <Choice legend="Design" name="design" value={spec.design} options={designs} onChange={(v) => dispatch({ type: "pick", key: "design", value: v })} />

        <fieldset>
          <legend className={legendClass}>Symbol</legend>
          <div className="flex flex-wrap gap-2">
            {symbols.map((s) => (
              <label key={s.value} className={chipClass(spec.symbol === s.value, "size-12 justify-center px-0")} title={s.label}>
                <input
                  type="radio"
                  name="symbol"
                  value={s.value}
                  checked={spec.symbol === s.value}
                  onChange={() => dispatch({ type: "pick", key: "symbol", value: s.value })}
                  className="sr-only"
                />
                {s.value === "none" ? <span className="text-xs">None</span> : <SymbolIcon symbol={s.value} />}
                <span className="sr-only">{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Choice legend="Font" name="font" value={spec.font} options={fontOptions} onChange={(v) => dispatch({ type: "pick", key: "font", value: v })} />
        <Choice legend="Sticker shape" name="shape" value={spec.shape} options={shapes} onChange={(v) => dispatch({ type: "pick", key: "shape", value: v })} />

        <fieldset>
          <legend className={legendClass}>
            Straw <span className="font-normal text-ink-soft">· free</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {straws.map((s) => (
              <label key={s.value} className="relative flex cursor-pointer flex-col items-center gap-1 text-xs text-ink-soft">
                <input
                  type="radio"
                  name="straw"
                  value={s.value}
                  checked={spec.straw === s.value}
                  onChange={() => dispatch({ type: "pick", key: "straw", value: s.value })}
                  className="peer sr-only"
                />
                <span
                  className="size-11 rounded-full border-4 border-sand-50 shadow-[0_0_0_2px_var(--color-sand-300)] peer-checked:shadow-[0_0_0_3px_var(--color-jungle-800)] peer-focus-visible:outline-3 peer-focus-visible:outline-lime-600"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legendClass}>Extras</legend>
          <ul className="divide-y divide-sand-200 rounded-card border border-sand-200 bg-sand-50">
            {extras.map((x) => (
              <li key={x.value}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={spec.extras.includes(x.value)}
                    onChange={(e) => dispatch({ type: "extra", value: x.value, on: e.target.checked })}
                    className="size-5 accent-jungle-800"
                  />
                  <span className="flex-1 text-jungle-900">{x.label}</span>
                  <span className="text-sm text-ink-soft">{x.priceCents ? `+${formatUsd(x.priceCents)}${spec.product === "two" ? " each" : ""}` : "Free"}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="rounded-card border border-sand-300 bg-sand-100 p-5 sm:p-6">
          <dl className="space-y-2 text-sm">
            {lines.map((l) => (
              <div key={l.label} className="flex justify-between">
                <dt className="text-ink-soft">{l.label}</dt>
                <dd className="text-jungle-900">{formatUsd(l.cents)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-sand-300 pt-2.5 font-display text-lg font-bold">
              <dt className="text-jungle-900">Your coco</dt>
              <dd className="text-jungle-900" aria-live="polite">
                {formatUsd(total)}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={problems.length ? undefined : orderHref}
              aria-disabled={problems.length > 0}
              className={`inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-jungle-800 px-7 text-lg font-semibold whitespace-nowrap text-sand-50 hover:bg-jungle-700 ${
                problems.length ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Add to order
            </a>
            <button
              type="button"
              onClick={share}
              className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-jungle-800 px-7 text-lg font-semibold whitespace-nowrap text-jungle-800 hover:bg-jungle-800 hover:text-sand-50"
            >
              Share my coco
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            Delivery is added at checkout. Ordering opens soon, and this page&rsquo;s link keeps your design.
          </p>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "block min-h-12 w-full rounded-xl border border-sand-300 bg-white px-4 text-jungle-900 placeholder:text-ink-soft/60 focus:border-jungle-700";
const legendClass = "mb-3 font-display text-base font-bold text-jungle-900";

function chipClass(checked: boolean, extra = "") {
  return `inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-lime-600 ${
    checked ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-300 bg-sand-50 text-jungle-800 hover:border-jungle-700"
  } ${extra}`;
}

function Field({ label, hint, error, children }: { label: string; hint: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-base font-bold text-jungle-900">{label}</span>
        <span className="text-xs text-ink-soft">{hint}</span>
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-sm font-medium text-red-700" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function Choice({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className={legendClass}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={chipClass(value === o.value)}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              // onClick as well, so tapping the chosen occasion clears it.
              onClick={() => value === o.value && onChange(o.value)}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SymbolIcon({ symbol }: { symbol: CocoSpec["symbol"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = getComputedStyle(c).color;
    drawSymbol(ctx, symbol, c.width / 2, c.height / 2, c.width * 0.8);
  });
  return <canvas ref={ref} width={48} height={48} className="size-6" aria-hidden="true" />;
}

function describe(spec: CocoSpec): string {
  const parts = [`A fresh coconut with a ${spec.shape} ${spec.design} sticker`];
  if (spec.name) parts.push(`reading "${spec.name}"`);
  if (spec.message) parts.push(`and "${spec.message}"`);
  const g = spec.extras.filter((e) => extras.find((x) => x.value === e)?.garnish);
  if (g.length) parts.push(`with ${g.join(", ")}`);
  return `${parts.join(" ")}, and a ${spec.straw} straw.`;
}

/** 1080×1350 portrait: the size Instagram and WhatsApp crop least. */
async function shareImage(spec: CocoSpec, fonts: FontFamilies, scene: CocoScene | null) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#fbf6ea");
  g.addColorStop(1, "#e2d3b4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  await loadStickerFont(spec.font, fonts);
  if (scene) {
    const h = H * 0.84;
    scene.drawInto(ctx, (W - h * VIEW_ASPECT) / 2, 40, h * VIEW_ASPECT, h);
  } else {
    // No 3D: the sticker itself, big.
    const s = shapes.find((x) => x.value === spec.shape) ?? shapes[0];
    const sticker = document.createElement("canvas");
    sticker.width = s.widthIn * 300;
    sticker.height = s.heightIn * 300;
    drawSticker(sticker.getContext("2d")!, spec, { fonts });
    const w = W * 0.62;
    const h = (w * sticker.height) / sticker.width;
    ctx.drawImage(sticker, (W - w) / 2, (H * 0.9 - h) / 2, w, h);
  }

  ctx.fillStyle = "#0b3d2e";
  ctx.textAlign = "center";
  ctx.font = `800 44px ${fonts.bold}`;
  ctx.fillText(brand.name, W / 2, H - 90);
  ctx.fillStyle = "#46544d";
  ctx.font = `500 30px ${fonts.bold}`;
  ctx.fillText(brand.market, W / 2, H - 45);
  return c;
}
