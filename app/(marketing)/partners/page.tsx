import type { Metadata } from "next";
import { Partners } from "@/components/marketing/Partners";
import { Section, Eyebrow } from "@/components/ui/Section";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partners",
  description: `Hotels, resorts and tour operators in ${brand.marketShort} — put a fresh coconut in every guest's hand.`,
};

const how = [
  {
    n: "01",
    title: "We give you a code",
    body: "A QR code for wherever it makes sense — beach chairs, the pool deck, the room, the concierge desk.",
  },
  {
    n: "02",
    title: "Your guest scans it",
    body: "It opens on their phone, already knowing where they are and who sent them. No app, no sign-up.",
  },
  {
    n: "03",
    title: "You earn on the order",
    body: "Every order that comes through your code is tracked to you, and you can see the lot in one place.",
  },
];

export default function Page() {
  return (
    <>
      <Partners />

      <Section label="How partnering works">
        <div className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-4xl">
            Nothing for your team to carry.
          </h2>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {how.map((s) => (
            <li
              key={s.n}
              className="rounded-card border border-sand-200 bg-sand-50 p-6"
            >
              <span className="font-display text-sm font-extrabold tracking-[0.2em] text-lime-ink">
                {s.n}
              </span>
              <h3 className="mt-3 font-display text-xl font-bold text-jungle-800">
                {s.title}
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="tours" className="bg-jungle-900" label="Get in touch">
        <div className="max-w-2xl">
          <Eyebrow tone="light">Get in touch</Eyebrow>
          <h2 className="font-display text-3xl font-extrabold text-sand-50 sm:text-4xl">
            Let&rsquo;s talk.
          </h2>
          <p className="mt-4 text-pretty text-lg text-sand-300">
            {brand.name} is opening in {brand.market}. If you look after visitors
            there — a hotel, a resort, a tour, a beach — we want to hear from you.
          </p>
          <p className="mt-8 rounded-card border border-jungle-700 bg-jungle-800 p-6 text-sand-200">
            A partner enquiry form lands with the partner dashboard. For now,
            reach out directly and we&rsquo;ll set you up by hand.
          </p>
        </div>
      </Section>
    </>
  );
}
