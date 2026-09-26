import type { Metadata } from "next";
import { BuildTeaser } from "@/components/marketing/BuildTeaser";
import { InteractiveBuilder } from "@/components/marketing/InteractiveBuilder";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Section, Eyebrow } from "@/components/ui/Section";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Build Your Coco",
  description:
    "Put a name, a message and a design on a fresh Jamaican coconut, delivered to your beach chair.",
};

const options = [
  { label: "Name", example: "Sarah", note: "Goes on the shell, front and centre." },
  { label: "Message", example: "Jamaica 2026 ❤️", note: "Short and sweet works best." },
  { label: "Design", example: "Jamaican", note: "Jamaican, Tropical, Romance, Birthday." },
  { label: "Occasion", example: "Honeymoon", note: "Birthday, anniversary, just married." },
];

const extras = ["Lime", "Extra straw", "Spoon", "Extra coconut water"];

export default function Page() {
  return (
    <>
      <BuildTeaser />
      <InteractiveBuilder />

      <Section label="What you can change">
        <div className="max-w-2xl">
          <Eyebrow>What you can change</Eyebrow>
          <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-4xl">
            Four things, and a few extras.
          </h2>
          <p className="mt-4 text-pretty text-lg text-ink-soft">
            Keep it simple. You&rsquo;re on a beach.
          </p>
        </div>

        <dl className="mt-10 grid gap-6 sm:grid-cols-2">
          {options.map((o) => (
            <div
              key={o.label}
              className="rounded-card border border-sand-200 bg-sand-50 p-6"
            >
              <dt className="font-display text-lg font-bold text-jungle-800">
                {o.label}
              </dt>
              <dd className="mt-2">
                <p className="font-display text-xl text-lime-ink">{o.example}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{o.note}</p>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 rounded-card border border-sand-300 bg-sand-100 p-7">
          <h3 className="font-display text-xl font-bold text-jungle-800">Extras</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {extras.map((e) => (
              <li
                key={e}
                className="rounded-full border border-sand-300 bg-sand-50 px-4 py-2 text-sm font-medium text-jungle-800"
              >
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-ink-soft">
            Availability varies by beach. You&rsquo;ll only ever be shown what
            {" "}{brand.name} can actually put in your hand that day.
          </p>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
