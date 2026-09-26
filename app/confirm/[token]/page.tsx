import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { TrackView } from "@/components/order/TrackView";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

/** The first view of an order right after payment — same live payload as
 * `/track/[token]`, just with a "confirmed" banner. Bookmark-safe: reloading
 * this URL later still works, it just won't say "confirmed" forever since
 * that banner is a one-time framing, not stored state. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Section label="Order confirmed">
      <TrackView token={token} justConfirmed />
    </Section>
  );
}
