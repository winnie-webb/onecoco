import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: brand.cta,
  robots: { index: false, follow: true },
};

/**
 * HONEST PLACEHOLDER.
 *
 * Ordering is Phases 2–3 and genuinely does not exist yet. This page says so
 * plainly rather than presenting a flow that cannot complete — the primary CTA
 * has to lead somewhere truthful, not to a 404 or a mock checkout.
 */
export default function Page() {
  return (
    <Section label="Ordering">
      <div className="mx-auto max-w-xl text-center">
        <Eyebrow>Nearly</Eyebrow>
        <h1 className="font-display text-4xl font-extrabold text-jungle-900 sm:text-5xl">
          Ordering isn&rsquo;t open yet.
        </h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-soft">
          {brand.name} is getting ready to launch on its first beach in{" "}
          {brand.market}. The moment we can actually put a cold coco in your
          hand, this is where you&rsquo;ll do it.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href="/how-it-works" size="lg">
            See how it will work
          </Button>
          <Button href="/" variant="outline" size="lg">
            Back to the start
          </Button>
        </div>
      </div>
    </Section>
  );
}
