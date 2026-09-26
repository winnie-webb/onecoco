"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CocoPreview } from "@/components/order/CocoPreview";
import type { CatalogueProductWithCustomizations } from "@/lib/db/queries/catalogue";
import type { CartItem, CartSelection } from "@/lib/pricing/cart-types";

function money(cents: number): string {
  return `US$${(cents / 100).toFixed(2)}`;
}

/** Builds one `CartItem` from the real catalogue (§7: no price is ever a
 * literal here — every number rendered comes from `products` /
 * `customization_options`). One product per order for now; Phase 9's group
 * orders and a real multi-line cart are future work, not this component's. */
export function ProductPicker({
  products,
  onQuote,
  quoting,
}: {
  products: CatalogueProductWithCustomizations[];
  onQuote: (item: CartItem) => void;
  quoting: boolean;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({});

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  function toggleMulti(groupKey: string, value: string, max: number) {
    setMultiValues((prev) => {
      const current = prev[groupKey] ?? [];
      if (current.includes(value)) return { ...prev, [groupKey]: current.filter((v) => v !== value) };
      if (current.length >= max) return prev;
      return { ...prev, [groupKey]: [...current, value] };
    });
  }

  function submit() {
    if (!product) return;
    const selections: CartSelection[] = product.customizationGroups.map((g) => {
      if (g.inputType === "TEXT") return { groupKey: g.key, textValue: textValues[g.key] };
      if (g.inputType === "MULTISELECT") return { groupKey: g.key, optionValues: multiValues[g.key] ?? [] };
      return { groupKey: g.key, optionValues: selectValues[g.key] ? [selectValues[g.key]] : [] };
    });
    onQuote({ productId: product.id, qty, selections });
  }

  if (!product) return null;

  const hasCustomizations = product.customizationGroups.length > 0;

  return (
    <div className="text-left">
      {hasCustomizations && (
        <CocoPreview
          design={selectValues.design}
          name={textValues.name}
          message={textValues.message}
          extras={multiValues.extras ?? []}
          className="mb-6"
        />
      )}

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">Pick your coco</legend>
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-center justify-between rounded-card border-2 px-4 py-3 ${
                p.id === productId ? "border-jungle-800" : "border-sand-200"
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="product"
                  checked={p.id === productId}
                  onChange={() => setProductId(p.id)}
                  className="h-5 w-5 accent-jungle-800"
                />
                <span className="font-semibold text-jungle-900">{p.name}</span>
              </span>
              <span className="font-semibold text-jungle-800">{money(p.basePriceCents)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {product.customizationGroups.map((group) => (
        <fieldset key={group.key} className="mb-5">
          <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">
            {group.label}
            {group.priceDeltaCents > 0 && group.inputType !== "SELECT" ? ` (+${money(group.priceDeltaCents)})` : ""}
            {group.required ? " *" : ""}
          </legend>

          {group.inputType === "TEXT" && (
            <input
              type="text"
              maxLength={group.maxLength ?? undefined}
              value={textValues[group.key] ?? ""}
              onChange={(e) => setTextValues((prev) => ({ ...prev, [group.key]: e.target.value }))}
              className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base text-jungle-900 outline-none focus:border-jungle-800"
            />
          )}

          {group.inputType === "SELECT" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectValues((prev) => ({ ...prev, [group.key]: "" }))}
                className={`rounded-full border-2 px-4 py-2 text-sm ${
                  !selectValues[group.key] ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200 text-ink"
                }`}
              >
                None
              </button>
              {group.options.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setSelectValues((prev) => ({ ...prev, [group.key]: opt.value }))}
                  className={`rounded-full border-2 px-4 py-2 text-sm ${
                    selectValues[group.key] === opt.value ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200 text-ink"
                  }`}
                >
                  {opt.label}
                  {opt.priceDeltaCents > 0 ? ` (+${money(opt.priceDeltaCents)})` : ""}
                </button>
              ))}
            </div>
          )}

          {group.inputType === "MULTISELECT" && (
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => {
                const checked = (multiValues[group.key] ?? []).includes(opt.value);
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => toggleMulti(group.key, opt.value, group.maxSelect)}
                    className={`rounded-full border-2 px-4 py-2 text-sm ${
                      checked ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200 text-ink"
                    }`}
                  >
                    {opt.label}
                    {opt.priceDeltaCents > 0 ? ` (+${money(opt.priceDeltaCents)})` : ""}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}

      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-bold uppercase tracking-wide text-ink-soft">Qty</span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-sand-200 text-xl"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-semibold">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(10, q + 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-sand-200 text-xl"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <Button onClick={submit} disabled={quoting} size="lg" className="w-full">
        {quoting ? "Getting your price…" : "See price"}
      </Button>
    </div>
  );
}
