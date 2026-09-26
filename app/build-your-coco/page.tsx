import type { Metadata } from "next";
import { FinalCta } from "@/components/marketing/FinalCta";
import { CocoBuilder } from "@/components/order/CocoBuilder";
import { stickerFonts } from "@/components/order/stickerFonts";
import { Section, Eyebrow } from "@/components/ui/Section";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Build Your Coco",
  description:
    "Put your name, a message and a design on a fresh Jamaican coconut, delivered to your beach chair.",
};

const steps = [
  {
    title: "You design it here",
    body: "What you see is what gets printed. The preview and the sticker come from the same drawing.",
  },
  {
    title: "We print it fresh",
    body: "Your sticker is printed in full colour on waterproof vinyl at the prep point, then pressed onto a dried, chilled coco.",
  },
  {
    title: "It comes to your chair",
    body: "Straw in, garnish on, carried down the beach to you. Photo first, then drink.",
  },
];

export default function Page() {
  return (
    <>
      <Section label="Build your coco" className="!pt-10 sm:!pt-14">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <Eyebrow>Build Your Coco</Eyebrow>
          <h1 className="font-display text-4xl font-extrabold text-jungle-900 sm:text-5xl">
            Put your name on it.
          </h1>
          <p className="mt-3 text-pretty text-lg text-ink-soft">
            A custom sticker is US$2. Garnish is extra, and the straw colour is on us.
          </p>
        </div>
        <CocoBuilder fonts={stickerFonts} />
      </Section>

      <Section label="How your sticker is made" className="bg-sand-100">
        <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-4xl">
          How your sticker is made
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-card border border-sand-200 bg-sand-50 p-6">
              <p className="font-display text-sm font-bold text-lime-ink">0{i + 1}</p>
              <h3 className="mt-1 font-display text-lg font-bold text-jungle-800">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-ink-soft">
          Garnish availability varies by beach. You&rsquo;ll only ever be shown what {brand.name} can
          actually put in your hand that day.
        </p>
      </Section>

      <FinalCta />
    </>
  );
}
