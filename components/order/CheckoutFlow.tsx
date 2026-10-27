"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProductPicker } from "@/components/order/ProductPicker";
import { track } from "@/lib/analytics/events";
import type { CatalogueProductWithCustomizations } from "@/lib/db/queries/catalogue";
import type { CartItem } from "@/lib/pricing/cart-types";
import type { CardProvider } from "@/lib/payments/availability";
import { PAYPAL_PENDING_KEY } from "@/components/order/paypal-pending";

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
  manualLocation = false,
  qrCode,
  cardProvider,
}: {
  products: CatalogueProductWithCustomizations[];
  lat: number;
  lng: number;
  accuracyM: number | null;
  /** lat/lng is the beach centre, not the customer — don't store it as
   * their location, and make the landmark field required instead. */
  manualLocation?: boolean;
  qrCode?: string;
  cardProvider: CardProvider | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("picking");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [landmarkText, setLandmarkText] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<CardProvider | "cash">(cardProvider ?? "cash");

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
          contact: { name },
          landmarkText: landmarkText || undefined,
          location: manualLocation ? undefined : { lat, lng, accuracyM: accuracyM ?? undefined },
          paymentProvider,
          qrCode,
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        setError(order.error ?? "Could not place your order.");
        setStep("checkout");
        return;
      }

      if (paymentProvider !== "cash") {
        const startRes = await fetch("/api/v1/payments/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.orderId, provider: paymentProvider }),
        });
        const started = await startRes.json();
        if (!startRes.ok) {
          setError(started.error ?? "Could not start payment.");
          setStep("checkout");
          return;
        }

        if (paymentProvider === "paypal") {
          if (!started.redirectUrl) {
            setError("Could not reach PayPal. Try again, or pay cash on delivery.");
            setStep("checkout");
            return;
          }
          // Leaving the site. The return page finishes the capture and
          // needs the track token to land the customer on their order; if
          // this storage is lost the return page falls back to PayPal's token.
          try {
            sessionStorage.setItem(
              PAYPAL_PENDING_KEY,
              JSON.stringify({ paymentId: started.paymentId, providerRef: started.providerRef, trackToken: order.trackToken }),
            );
          } catch {
            // Private mode etc. — the return page falls back to PayPal's token.
          }
          window.location.assign(started.redirectUrl);
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
        track("payment_succeeded", { provider: paymentProvider });
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
        {/* With a GPS fix the pin is where they are; without one (picked the
            beach by hand) the runner needs it in words. */}
        {manualLocation && (
          <Field label="Where are you? (e.g. by the lifeguard tower, blue umbrella)">
            <input
              required
              value={landmarkText}
              onChange={(e) => setLandmarkText(e.target.value)}
              className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
            />
          </Field>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">Pay with</legend>
          <div className="flex gap-2">
            {cardProvider && (
              <button
                type="button"
                aria-pressed={paymentProvider === cardProvider}
                onClick={() => setPaymentProvider(cardProvider)}
                className={`flex-1 rounded-full border-2 px-4 py-3 text-sm font-semibold ${
                  paymentProvider === cardProvider ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200"
                }`}
              >
                {cardProvider === "paypal" ? "Card or PayPal" : "Card (test mode)"}
              </button>
            )}
            <button
              type="button"
              aria-pressed={paymentProvider === "cash"}
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
              Test mode: this uses a test provider that always succeeds. It is never offered in production.
            </p>
          )}
          {paymentProvider === "paypal" && (
            <p className="mt-2 text-xs text-ink-soft">
              You&rsquo;ll pay on PayPal&rsquo;s secure page — no PayPal account needed to pay by card — then come
              straight back here.
            </p>
          )}
        </fieldset>

        <p className="text-xs text-ink-soft">
          By placing this order you agree to our{" "}
          <a href="/terms" target="_blank" className="font-semibold underline">
            terms
          </a>{" "}
          and{" "}
          <a href="/refunds" target="_blank" className="font-semibold underline">
            refund policy
          </a>
          . We use your details only to deliver this order —{" "}
          <a href="/privacy" target="_blank" className="font-semibold underline">
            privacy
          </a>
          .
        </p>

        <Button type="submit" size="lg" disabled={step === "paying"} className="mt-2 w-full">
          {step === "paying"
            ? "Placing your order…"
            : paymentProvider === "cash"
              ? `Place order — ${money(quote.totalCents, quote.currency)} cash`
              : `Pay ${money(quote.totalCents, quote.currency)}`}
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
