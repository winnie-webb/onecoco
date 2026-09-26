import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { LocationGate } from "@/components/order/LocationGate";
import { brand } from "@/lib/brand";
import { getFullCatalogue } from "@/lib/db/queries/catalogue";

export const metadata: Metadata = {
  title: brand.cta,
  robots: { index: false, follow: true },
};

// Otherwise Next prerenders this at BUILD time and bakes in whatever the
// catalogue looked like then — wrong the moment a product is renamed or
// repriced without a redeploy.
export const dynamic = "force-dynamic";

/**
 * Phase 2 gave this page real location capture + zone/serviceability
 * resolution (docs/ARCHITECTURE.md §9, §13). Phase 3 adds the rest of the
 * flow behind it — catalogue, quote, checkout, guest tracking — but only
 * when a spot actually resolves as serviceable; every other branch still
 * says exactly where it stands rather than leading into a dead end.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ qr?: string }> }) {
  const products = await getFullCatalogue();
  // §2: "one table and one URL parameter" — /order?qr=<code>. Threaded
  // through LocationGate -> CheckoutFlow -> POST /api/v1/orders, resolved
  // server-side there; never trusted or looked up client-side.
  const { qr } = await searchParams;

  return (
    <Section label="Ordering">
      <div className="mx-auto max-w-xl text-center">
        <Eyebrow>{brand.marketShort}</Eyebrow>
        <h1 className="font-display text-4xl font-extrabold text-jungle-900 sm:text-5xl">
          Are we at your spot?
        </h1>
      </div>
      <div className="mt-9">
        <LocationGate products={products} qrCode={qr} />
      </div>
    </Section>
  );
}
