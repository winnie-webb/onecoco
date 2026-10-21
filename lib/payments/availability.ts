/**
 * Which provider sits behind the "Card" button (audit T-1). Server-only:
 * reads secrets to decide, returns only a name.
 *
 * PayPal whenever it's configured. Otherwise the mock provider, but only
 * outside production — it is hard-disabled there (lib/payments/mock.ts),
 * so production without PayPal offers cash only rather than a card button
 * that creates an order and then fails.
 */
export type CardProvider = "paypal" | "mock";

export function cardProvider(): CardProvider | null {
  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) return "paypal";
  if (process.env.NODE_ENV !== "production") return "mock";
  return null;
}
