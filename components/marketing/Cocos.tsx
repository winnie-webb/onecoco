import { Section, Eyebrow } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { menuPreview } from "@/lib/marketing-menu";

function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-lime-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

export function Cocos() {
  return (
    <Section id="cocos" className="bg-sand-100" label="Our cocos">
      <div className="max-w-2xl">
        <Eyebrow>The menu</Eyebrow>
        <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-5xl">
          Three ways to have one.
        </h2>
        <p className="mt-4 text-pretty text-lg text-ink-soft">
          Every coco is cut to order. Nothing sits around waiting for you.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {menuPreview.map((item) => (
          <li
            key={item.slug}
            className={`relative flex flex-col rounded-card border p-7 ${
              item.featured
                ? "border-jungle-800 bg-jungle-900 text-sand-100 shadow-xl shadow-jungle-900/15"
                : "border-sand-300 bg-sand-50"
            }`}
          >
            {item.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-lime-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-jungle-900">
                Most ordered
              </span>
            )}

            <h3
              className={`font-display text-2xl font-bold ${
                item.featured ? "text-sand-50" : "text-jungle-800"
              }`}
            >
              {item.name}
            </h3>

            <p
              className={`mt-2 font-display text-3xl font-extrabold ${
                item.featured ? "text-lime-400" : "text-jungle-800"
              }`}
            >
              {item.priceLabel}
            </p>

            <p
              className={`mt-3 text-pretty leading-relaxed ${
                item.featured ? "text-sand-300" : "text-ink-soft"
              }`}
            >
              {item.blurb}
            </p>

            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {item.includes.map((inc) => (
                <li key={inc} className="flex gap-2.5">
                  <Check />
                  <span className={item.featured ? "text-sand-200" : "text-ink-soft"}>
                    {inc}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              href="/order"
              variant={item.featured ? "accent" : "outline"}
              className="mt-7 w-full"
            >
              Order this
            </Button>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-ink-soft">
        Prices in US dollars. Delivery is added at checkout and depends on where
        you are on the beach.
      </p>
    </Section>
  );
}
