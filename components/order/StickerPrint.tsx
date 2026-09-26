"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  type CocoSpec,
  coconutView,
  designs,
  extras,
  fonts as fontOptions,
  productOf,
  shapes,
  specFromParams,
  stickerNames,
  straws,
  symbols,
  validateSpec,
} from "@/lib/coco/spec";
import { type FontFamilies, renderPrintFile } from "@/lib/coco/sticker";

type Sheet = { name: string; url: string };

const noSubscribe = () => () => {};

const label = (list: readonly { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v;

/*
 * Prep-point print sheet. Opened from an order's design link (the same query
 * string the builder writes), it renders each sticker with the same
 * drawSticker the customer saw, at 300 DPI and the real label size, one
 * sticker per printed page. Stands in for the Phase 4 "Print sticker" button,
 * and is what the M0 physical test prints from.
 */
export function StickerPrint({ fonts }: { fonts: FontFamilies }) {
  // The page is static; the design lives in the URL, which only exists in the browser.
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => null);
  const spec = useMemo<CocoSpec | null>(() => (search === null ? null : specFromParams(new URLSearchParams(search))), [search]);
  const [sheets, setSheets] = useState<Sheet[]>([]);

  useEffect(() => {
    if (!spec || validateSpec(spec).length) return;
    let live = true;
    const urls: string[] = [];
    const names = spec.product === "two" ? [0, 1] : [0];
    Promise.all(
      names
        .map((i) => coconutView(spec, i))
        .filter((v) => v.name.trim())
        .map(async (v) => {
          const url = URL.createObjectURL(await renderPrintFile(v, fonts));
          urls.push(url);
          return { name: v.name.trim(), url };
        }),
    ).then((s) => live && setSheets(s));
    return () => {
      live = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [spec, fonts]);

  if (!spec) return null;

  const problems = validateSpec(spec);
  const names = stickerNames(spec);
  const shape = shapes.find((s) => s.value === spec.shape) ?? shapes[0];

  if (problems.length || !names.length) {
    return (
      <p className="rounded-card border border-sand-300 bg-sand-100 p-6 text-ink-soft">
        {problems.length
          ? `This design can't be printed: ${problems.map((p) => p.message).join(" ")}`
          : "No sticker on this order: there's no name to print."}
      </p>
    );
  }

  const garnish = spec.extras.map((e) => label(extras, e));

  return (
    <>
      {/* One label per page, at the label's real size. */}
      <style>{`@page { size: ${shape.widthIn}in ${shape.heightIn}in; margin: 0; }`}</style>

      <div className="print:hidden">
        <dl className="grid gap-x-6 gap-y-2 rounded-card border border-sand-300 bg-sand-100 p-5 text-sm sm:grid-cols-2">
          {[
            ["Product", productOf(spec).label],
            ["Stickers", `${names.length} × ${shape.label.toLowerCase()} ${shape.widthIn}×${shape.heightIn} in`],
            ["Design", `${label(designs, spec.design)} · ${label(fontOptions, spec.font)} · ${label(symbols, spec.symbol)}`],
            ["Straw", label(straws, spec.straw)],
            ["Extras", garnish.length ? garnish.join(", ") : "None"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink-soft">{k}</dt>
              <dd className="font-medium text-jungle-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={sheets.length !== names.length}
            className="inline-flex min-h-12 items-center rounded-full bg-jungle-800 px-6 font-semibold text-sand-50 hover:bg-jungle-700 disabled:opacity-50"
          >
            Print {names.length > 1 ? `${names.length} stickers` : "sticker"}
          </button>
          {sheets.map((s) => (
            <a
              key={s.url}
              href={s.url}
              download={`sticker-${s.name.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.png`}
              className="inline-flex min-h-12 items-center rounded-full border-2 border-jungle-800 px-6 font-semibold text-jungle-800 hover:bg-jungle-800 hover:text-sand-50"
            >
              Download {s.name}
            </a>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Print at 100% (no &ldquo;fit to page&rdquo;). Wipe the coconut dry before applying.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-6 print:mt-0 print:block">
        {sheets.map((s) => (
          // Blob URLs from our own canvas; next/image can't optimise these.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.url}
            src={s.url}
            alt={`Sticker for ${s.name}`}
            style={{ width: `${shape.widthIn}in`, height: `${shape.heightIn}in` }}
            className="block shadow-md print:shadow-none print:not-last:break-after-page"
          />
        ))}
      </div>
    </>
  );
}
