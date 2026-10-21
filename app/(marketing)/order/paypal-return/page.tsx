import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { PayPalReturn } from "@/components/order/PayPalReturn";

export const metadata: Metadata = {
  title: "Finishing your payment",
  robots: { index: false, follow: false },
};

/**
 * PayPal's return_url and cancel_url (lib/payments/paypal.ts). PayPal adds
 * `?token=<PayPal order id>`; approving only authorises, so the client
 * component below asks our server to capture — never the browser itself.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; cancelled?: string }> }) {
  const { token, cancelled } = await searchParams;
  return (
    <Section label="Payment">
      <PayPalReturn providerRef={token ?? null} cancelled={cancelled === "1"} />
    </Section>
  );
}
