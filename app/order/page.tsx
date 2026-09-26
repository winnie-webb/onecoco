import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { LocationGate } from "@/components/order/LocationGate";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: brand.cta,
  robots: { index: false, follow: true },
};

/**
 * Phase 2: real location capture + real zone/serviceability resolution
 * (docs/ARCHITECTURE.md §9, §13). Checkout itself is Phase 3 and still does
 * not exist — this page says exactly that when a spot IS serviceable,
 * rather than leading into a flow that can't complete. See PHASE-2-NOTES.md.
 */
export default function Page() {
  return (
    <Section label="Ordering">
      <div className="mx-auto max-w-xl text-center">
        <Eyebrow>{brand.marketShort}</Eyebrow>
        <h1 className="font-display text-4xl font-extrabold text-jungle-900 sm:text-5xl">
          Are we at your spot?
        </h1>
      </div>
      <div className="mt-9">
        <LocationGate />
      </div>
    </Section>
  );
}
