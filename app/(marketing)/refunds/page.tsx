import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { ContactLinks } from "@/components/site/ContactLinks";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Refunds & Cancellations",
  description: `How refunds and cancellations work at ${brand.name}.`,
};

export default function Page() {
  return (
    <LegalPage title="Refunds & cancellations">
      <h2>If we can&rsquo;t deliver</h2>
      <p>
        If no runner accepts your order within a few minutes of paying, we cancel it automatically and refund your card
        payment in full. You&rsquo;ll get an email when that happens. Card refunds usually appear within 3–5 business
        days, depending on your bank.
      </p>
      <p>
        If we cancel your order for any other reason (weather, the beach closing, running out of coconuts) you also
        get a full refund.
      </p>

      <h2>If you want to cancel</h2>
      <p>
        Contact us before your runner picks up your order and we&rsquo;ll cancel and refund it in full. Once your
        coconut has been opened it can&rsquo;t be resold, so we can&rsquo;t refund an order after it&rsquo;s been
        picked up unless something went wrong on our side.
      </p>

      <h2>If something&rsquo;s wrong</h2>
      <p>
        If your coconut wasn&rsquo;t fresh, wasn&rsquo;t what you ordered, or never arrived, contact us the same day
        with your order number. We&rsquo;ll replace it or refund it.
      </p>

      <h2>Cash orders</h2>
      <p>
        Cash is only collected when your runner hands over your order, so there&rsquo;s nothing to refund for a cash
        order cancelled before delivery. Refunds on delivered cash orders are paid back in cash or by bank transfer.
      </p>

      <h2>Get in touch</h2>
      <ContactLinks />
    </LegalPage>
  );
}
