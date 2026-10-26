import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { ContactLinks } from "@/components/site/ContactLinks";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${brand.name} in ${brand.marketShort}.`,
};

export default function Page() {
  return (
    <LegalPage title="Contact us">
      <p>
        Questions about an order, a refund, or working with us? WhatsApp is fastest while we&rsquo;re on the beach.
        Include your order number if you have one.
      </p>
      <ContactLinks />
      <p>
        See also our <a href="/refunds">refunds &amp; cancellations</a>, <a href="/privacy">privacy</a> and{" "}
        <a href="/terms">terms</a> pages.
      </p>
    </LegalPage>
  );
}
