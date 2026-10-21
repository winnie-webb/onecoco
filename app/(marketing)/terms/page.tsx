import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { brand } from "@/lib/brand";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms for ordering from ${brand.name}.`,
};

export default function Page() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms apply when you order from {brand.name}, operated by {legal.operator}. By placing an order you agree
        to them.
      </p>

      <h2>Where and when we deliver</h2>
      <p>
        We deliver only inside the beach areas shown when you share your location, and only during opening hours. The
        delivery time we show is an estimate range, not a guarantee; sand, crowds and weather all affect it.
      </p>

      <h2>Prices and payment</h2>
      <p>
        Prices are shown in US dollars and include everything you pay (coconut, extras and delivery) before you
        commit. You can pay by card through PayPal, or in cash to your runner on delivery. The price is fixed when you
        place the order.
      </p>

      <h2>Receiving your order</h2>
      <p>
        Show your runner the four-digit delivery code from your order screen. If we can&rsquo;t find you after
        trying to reach you by phone, the order may be marked undeliverable.
      </p>

      <h2>Cancellations and refunds</h2>
      <p>
        See our <a href="/refunds">refunds &amp; cancellations</a> page.
      </p>

      <h2>Personalised coconuts</h2>
      <p>
        Names and messages you add are printed or written on your coconut. We may refuse text that is offensive or
        infringes someone else&rsquo;s rights, and refund that part of the order.
      </p>

      <h2>Our responsibility</h2>
      <p>
        We prepare every coconut fresh and handle it hygienically. Nothing in these terms limits rights you have under
        Jamaican consumer protection law. These terms are governed by the laws of Jamaica.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms; the version shown when you place an order is the one that applies to it.</p>
    </LegalPage>
  );
}
