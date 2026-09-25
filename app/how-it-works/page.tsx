import type { Metadata } from "next";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Section, Eyebrow } from "@/components/ui/Section";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "How It Works",
  description: `How ${brand.name} gets a fresh coconut to your beach chair in ${brand.marketShort}.`,
};

const questions = [
  {
    q: "How do you find me on the beach?",
    a: "Your location gets us close. What actually finds you is the note you leave — a blue umbrella, the lifeguard tower, a yellow shirt. Your runner also taps to tell you when they're nearly there, so you can stand up and wave.",
  },
  {
    q: "What if I move?",
    a: "Tell us. There's a button on your order screen to send us your new spot, and your runner gets it straight away.",
  },
  {
    q: "How do I pay?",
    a: "Card, or cash to the runner when they reach you. You see the full total — coco, delivery, everything — before you commit to anything.",
  },
  {
    q: "How long does it take?",
    a: "We show you a time range before you order, based on where you are and how busy we are. If we haven't got anyone free, we tell you that instead of guessing.",
  },
];

export default function Page() {
  return (
    <>
      <HowItWorks />
      <Section className="bg-sand-100" label="Questions">
        <div className="max-w-2xl">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-4xl">
            The things people actually ask.
          </h2>
        </div>
        <dl className="mt-10 grid gap-6 md:grid-cols-2">
          {questions.map((item) => (
            <div
              key={item.q}
              className="rounded-card border border-sand-300 bg-sand-50 p-6"
            >
              <dt className="font-display text-lg font-bold text-jungle-800">
                {item.q}
              </dt>
              <dd className="mt-2 text-pretty leading-relaxed text-ink-soft">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <FinalCta />
    </>
  );
}
