import { serviceClient } from "@/lib/db/client";
import type { Json } from "@/lib/db/types";
import type { Settings } from "@/lib/settings";
import type { CartItem, CartSelection } from "./cart-types";

export type { CartItem, CartSelection };

/**
 * §7: `quote(cart, zone, context) → { lines[], subtotal_cents,
 * customization_cents, delivery_fee_cents, tax_cents, total_cents, currency,
 * eta_min, eta_max }`. The client never sends a price — only product ids,
 * quantities, option ids. Persisted to `quotes` so checkout can compare its
 * re-quote against what the customer was shown (§4.2) rather than silently
 * charging a different number.
 */

export interface QuoteLine {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  customizationCentsPerUnit: number;
  lineTotalCents: number;
  customizations: {
    groupId: string;
    optionId: string | null;
    groupKey: string;
    label: string;
    priceDeltaCents: number;
    valueLabel: string;
  }[];
}

export interface ComputedQuote {
  lines: QuoteLine[];
  subtotalCents: number;
  customizationCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
}

export interface QuoteResult extends ComputedQuote {
  quoteId: string;
  expiresAt: string;
}

export class QuoteError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

/** Pure(-ish) computation — no persistence. Used both to build a fresh quote
 * and to re-derive one at checkout for the drift comparison (§7). */
export async function computeQuote(
  cart: CartItem[],
  zoneId: string,
  deliveryFeeCents: number,
  settings: Settings,
): Promise<ComputedQuote> {
  if (cart.length === 0) throw new QuoteError("cart is empty", "EMPTY_CART");

  const db = serviceClient();
  const lines: QuoteLine[] = [];
  let subtotalCents = 0;
  let customizationCents = 0;
  let currency = "USD";

  for (const item of cart) {
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      throw new QuoteError(`invalid quantity for product ${item.productId}`, "INVALID_QTY");
    }

    const { data: product, error: productError } = await db
      .from("products")
      .select("id, sku, name, base_price_cents, currency, active")
      .eq("id", item.productId)
      .single();
    if (productError || !product || !product.active) {
      throw new QuoteError(`product ${item.productId} is not available`, "PRODUCT_UNAVAILABLE");
    }
    currency = product.currency;

    const { data: groupLinks, error: groupError } = await db
      .from("product_customization_groups")
      .select("required, customization_groups(id, key, label, input_type, required, min_select, max_select, price_delta_cents)")
      .eq("product_id", product.id);
    if (groupError) throw new QuoteError("customization lookup failed", "INTERNAL");

    let itemCustomizationCents = 0;
    const customizationDetails: QuoteLine["customizations"] = [];

    for (const link of groupLinks ?? []) {
      const group = link.customization_groups as unknown as {
        id: string;
        key: string;
        label: string;
        input_type: Database_CustomizationInputType;
        required: boolean;
        min_select: number;
        max_select: number;
        price_delta_cents: number;
      } | null;
      if (!group) continue;

      const selection = item.selections.find((s) => s.groupKey === group.key);
      const groupRequired = link.required || group.required;

      if (group.input_type === "TEXT") {
        const value = selection?.textValue?.trim();
        if (!value && groupRequired) {
          throw new QuoteError(`"${group.label}" is required`, "MISSING_REQUIRED_GROUP");
        }
        if (value) {
          itemCustomizationCents += group.price_delta_cents;
          customizationDetails.push({
            groupId: group.id,
            optionId: null,
            groupKey: group.key,
            label: group.label,
            priceDeltaCents: group.price_delta_cents,
            valueLabel: value,
          });
        }
        continue;
      }

      if (group.input_type === "BOOLEAN") {
        if (selection?.boolValue) {
          itemCustomizationCents += group.price_delta_cents;
          customizationDetails.push({
            groupId: group.id,
            optionId: null,
            groupKey: group.key,
            label: group.label,
            priceDeltaCents: group.price_delta_cents,
            valueLabel: "yes",
          });
        } else if (groupRequired) {
          throw new QuoteError(`"${group.label}" is required`, "MISSING_REQUIRED_GROUP");
        }
        continue;
      }

      // SELECT / MULTISELECT
      const chosen = selection?.optionValues ?? [];
      if (chosen.length < group.min_select || chosen.length > group.max_select) {
        throw new QuoteError(
          `"${group.label}" needs between ${group.min_select} and ${group.max_select} choice(s)`,
          "INVALID_SELECT_COUNT",
        );
      }
      if (chosen.length === 0) continue;

      const { data: options, error: optionsError } = await db
        .from("customization_options")
        .select("id, value, label, price_delta_cents, active")
        .eq("group_id", group.id)
        .in("value", chosen);
      if (optionsError) throw new QuoteError("option lookup failed", "INTERNAL");
      if (!options || options.length !== chosen.length || options.some((o) => !o.active)) {
        throw new QuoteError(`"${group.label}" has an invalid selection`, "INVALID_OPTION");
      }

      for (const option of options) {
        itemCustomizationCents += option.price_delta_cents;
        customizationDetails.push({
          groupId: group.id,
          optionId: option.id,
          groupKey: group.key,
          label: group.label,
          priceDeltaCents: option.price_delta_cents,
          valueLabel: option.label,
        });
      }
    }

    const lineTotal = (product.base_price_cents + itemCustomizationCents) * item.qty;
    subtotalCents += product.base_price_cents * item.qty;
    customizationCents += itemCustomizationCents * item.qty;

    lines.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      qty: item.qty,
      unitPriceCents: product.base_price_cents,
      customizationCentsPerUnit: itemCustomizationCents,
      lineTotalCents: lineTotal,
      customizations: customizationDetails,
    });
  }

  const taxableCents = subtotalCents + customizationCents;
  const taxCents = Math.round((taxableCents * settings.taxRateBps) / 10_000);
  const totalCents = taxableCents + deliveryFeeCents + settings.serviceFeeCents + taxCents;

  return { lines, subtotalCents, customizationCents, deliveryFeeCents, taxCents, totalCents, currency };
}

/** Computes AND persists — the entry point for `POST /api/v1/quote`. */
export async function buildQuote(
  cart: CartItem[],
  zoneId: string,
  deliveryFeeCents: number,
  settings: Settings,
): Promise<QuoteResult> {
  const computed = await computeQuote(cart, zoneId, deliveryFeeCents, settings);
  const expiresAt = new Date(Date.now() + settings.quoteTtlMinutes * 60_000);
  const payload = {
    cart,
    zoneId,
    lines: computed.lines,
    deliveryFeeCents,
    serviceFeeCents: settings.serviceFeeCents,
    taxRateBps: settings.taxRateBps,
  };

  const db = serviceClient();
  const { data: quoteRow, error: insertError } = await db
    .from("quotes")
    .insert({
      zone_id: zoneId,
      payload: payload as unknown as NonNullable<Json>,
      total_cents: computed.totalCents,
      currency: computed.currency,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (insertError || !quoteRow) throw new QuoteError("could not persist quote", "INTERNAL");

  return { ...computed, quoteId: quoteRow.id, expiresAt: expiresAt.toISOString() };
}

// Narrow local alias to avoid importing the full generated enum union just for this file.
type Database_CustomizationInputType = "TEXT" | "SELECT" | "MULTISELECT" | "BOOLEAN";
