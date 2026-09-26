import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { TrackView } from "@/components/order/TrackView";

export const metadata: Metadata = {
  title: "Track your order",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Section label="Track your order">
      <TrackView token={token} />
    </Section>
  );
}
