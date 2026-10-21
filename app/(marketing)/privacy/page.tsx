import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { ContactLinks } from "@/components/site/ContactLinks";
import { brand } from "@/lib/brand";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${brand.name} collects, why, and how long we keep it.`,
};

export default function Page() {
  return (
    <LegalPage title="Privacy notice">
      <p>
        {brand.name} is operated by {legal.operator}, the data controller for the information below. We collect
        only what we need to get a coconut to you, and we keep exact locations for as short a time as we can.
      </p>

      <h2>What we collect, and why</h2>
      <ul>
        <li>
          <strong>Your location</strong>, once, when you tap to share it — to check we deliver where you are and to
          send a runner. We never track you in the background. If you tap &ldquo;I moved&rdquo; we take one new
          reading.
        </li>
        <li>
          <strong>Your name, phone number and email</strong> — so the runner can find and contact you, and so we can
          send your confirmation, receipt and any refund notice.
        </li>
        <li>
          <strong>Landmark and description</strong> you choose to give (&ldquo;blue umbrella, red hat&rdquo;) — to
          find you on the sand.
        </li>
        <li>
          <strong>Your order and payment status</strong> — what you ordered, what it cost, and whether it was paid.
          Card details are entered with PayPal; we never see or store your card number.
        </li>
        <li>
          <strong>Basic usage analytics</strong> — which steps of ordering people complete, so we can fix the ones
          that don&rsquo;t work.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Exact locations are reduced to the delivery-zone level 30 days after your order is delivered or cancelled.
        Order records (what was ordered, when, and what was paid) are kept as long as Jamaican tax and accounting law
        requires.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Only the services that run the business on our behalf: our hosting and database providers, PayPal (payments),
        our email provider, and our analytics provider. Your runner sees your first name, landmark, description and
        location for the order they&rsquo;re delivering. We don&rsquo;t sell your data.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Jamaica Data Protection Act, 2020 you can ask to see the personal data we hold about you, ask us to
        correct it, or ask us to delete it where we don&rsquo;t need to keep it by law. Contact us and we&rsquo;ll
        respond within 30 days.
      </p>
      <ContactLinks />
    </LegalPage>
  );
}
