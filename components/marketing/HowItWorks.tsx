import { Section, Eyebrow } from "@/components/ui/Section";
import { brand } from "@/lib/brand";

export const steps = [
  {
    n: "01",
    title: "Tell us where you are",
    body: "Tap once to share your location. We check you're inside a delivery zone before you pay a cent.",
  },
  {
    n: "02",
    title: "Pick your coco",
    body: "Classic, or build one with a name and a message on it. Add a lime, a spoon, an extra straw.",
  },
  {
    n: "03",
    title: "Pay how you like",
    body: "Card, or cash to the runner when they reach you. Your total is shown before you commit.",
  },
  {
    n: "04",
    title: "Stay in your chair",
    body: "Watch the status as it moves. A runner walks it out to you and you take it from there.",
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how" label="How it works">
      <div className="max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-5xl">
          Four taps, then don&rsquo;t get up.
        </h2>
        <p className="mt-4 text-pretty text-lg text-ink-soft">
          The whole point is that you stay exactly where you are.
        </p>
      </div>

      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li
            key={step.n}
            className="rounded-card border border-sand-200 bg-sand-50 p-6 transition-shadow hover:shadow-lg hover:shadow-jungle-900/5"
          >
            <span className="font-display text-sm font-extrabold tracking-[0.2em] text-lime-ink">
              {step.n}
            </span>
            <h3 className="mt-3 font-display text-xl font-bold text-jungle-800">
              {step.title}
            </h3>
            <p className="mt-2 text-pretty leading-relaxed text-ink-soft">
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-10 rounded-card border border-sand-300 bg-sand-100 p-6 text-pretty text-ink-soft">
        <strong className="font-semibold text-jungle-800">
          Not on a beach we cover yet?
        </strong>{" "}
        {brand.name} is starting in {brand.marketShort}. Tell us where you are and
        we&rsquo;ll let you know the moment we get there.
      </p>
    </Section>
  );
}
