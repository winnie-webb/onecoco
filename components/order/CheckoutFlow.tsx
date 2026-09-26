"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProductPicker } from "@/components/order/ProductPicker";
import { track } from "@/lib/analytics/events";
import type { CatalogueProductWithCustomizations } from "@/lib/db/queries/catalogue";
import type { CartItem } from "@/lib/pricing/cart-types";

interface QuoteResponse {
  quoteId: string;
  totalCents: number;
  deliveryFeeCents: number;
  subtotalCents: number;
  customizationCents: number;
  taxCents: number;
  currency: string;
  lines: { name: string; qty: number; lineTotalCents: number }[];
}

type Step = "picking" | "quoted" | "checkout" | "paying" | "error";

function money(cents: number, currency: string): string {
  return `${currency === "USD" ? "US$" : currency + " "}${(cents / 100).toFixed(2)}`;
}

export function CheckoutFlow({
  products,
  lat,
  lng,
  accuracyM,
}: {
  products: CatalogueProductWithCustomizations[];
  lat: number;
  lng: number;
  accuracyM: number | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("picking");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [landmarkText, setLandmarkText] = useState("");
  const [customerDescription, setCustomerDescription] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<"mock" | "cash">("mock");

  async function requestQuote(item: CartItem) {
    setError(null);
    try {
      const res = await fetch("/api/v1/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: [item], lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not get a price for that.");
        return;
      }
      track("product_selected", { totalCents: data.totalCents });
      setQuote(data);
      setStep("checkout");
    } catch {
      setError("Something went wrong getting your price. Try again.");
    }
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;
    setStep("paying");
    setError(null);
    track("checkout_started");

    try {
      const clientIdempotencyKey = crypto.randomUUID();
      const orderRes = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          clientIdempotencyKey,
          contact: { name, phone, email },
          landmarkText: landmarkText || undefined,
          customerDescription: customerDescription || undefined,
          location: { lat, lng, accuracyM: accuracyM ?? undefined },
          paymentProvider,
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        setError(order.error ?? "Could not place your order.");
        setStep("checkout");
        return;
      }

      if (paymentProvider === "mock") {
        const startRes = await fetch("/api/v1/payments/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.orderId, provider: "mock" }),
        });
        const started = await startRes.json();
        if (!startRes.ok) {
          setError(started.error ?? "Could not start payment.");
          setStep("checkout");
          return;
        }

        const captureRes = await fetch("/api/v1/payments/mock/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: started.paymentId }),
        });
        const captured = await captureRes.json();
        if (!captureRes.ok) {
          setError(captured.error ?? "Payment did not go through.");
          setStep("checkout");
          return;
        }
        track("payment_succeeded");
      }

      router.push(`/confirm/${order.trackToken}`);
    } catch {
      setError("Something went wrong placing your order. Try again.");
      setStep("checkout");
    }
  }

  if (step === "picking") {
    return (
      <div>
        {error && <p className="mb-4 text-center font-medium text-red-700">{error}</p>}
        <ProductPicker products={products} onQuote={requestQuote} quoting={false} />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="text-left">
      <div className="mb-6 rounded-card border-2 border-sand-200 p-4">
        {quote.lines.map((line, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>
              {line.qty}× {line.name}
            </span>
            <span>{money(line.lineTotalCents, quote.currency)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between text-sm text-ink-soft">
          <span>Delivery</span>
          <span>{money(quote.deliveryFeeCents, quote.currency)}</span>
        </div>
        {quote.taxCents > 0 && (
          <div className="flex justify-between text-sm text-ink-soft">
            <span>Tax</span>
            <span>{money(quote.taxCents, quote.currency)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-sand-200 pt-2 font-bold text-jungle-900">
          <span>Total</span>
          <span>{money(quote.totalCents, quote.currency)}</span>
        </div>
      </div>

      <form onSubmit={submitOrder} className="flex flex-col gap-4">
        {error && <p className="font-medium text-red-700">{error}</p>}

        <Field label="Your name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
          />
        </Field>
        <Field label="Phone">
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
          />
        </Field>
        <Field label="Landmark (e.g. blue umbrella near the jerk stand)">
          <input
            value={landmarkText}
            onChange={(e) => setLandmarkText(e.target.value)}
            className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
          />
        </Field>
        <Field label="What you look like (e.g. red hat, two kids) — this finds you faster than GPS does">
          <input
            value={customerDescription}
            onChange={(e) => setCustomerDescription(e.target.value)}
            className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">Pay with</legend>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentProvider("mock")}
              className={`flex-1 rounded-full border-2 px-4 py-3 text-sm font-semibold ${
                paymentProvider === "mock" ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200"
              }`}
            >
              Card (test mode)
            </button>
            <button
              type="button"
              onClick={() => setPaymentProvider("cash")}
              className={`flex-1 rounded-full border-2 px-4 py-3 text-sm font-semibold ${
                paymentProvider === "cash" ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200"
              }`}
            >
              Cash on delivery
            </button>
          </div>
          {paymentProvider === "mock" && (
            <p className="mt-2 text-xs text-ink-soft">
              Real payments aren&rsquo;t live yet — this uses a test provider that always succeeds, so the rest of the
              flow can be built and proven end to end.
            </p>
          )}
        </fieldset>

        <Button type="submit" size="lg" disabled={step === "paying"} className="mt-2 w-full">
          {step === "paying" ? "Placing your order…" : `Pay ${money(quote.totalCents, quote.currency)}`}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
