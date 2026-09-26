import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Section";
import { CocoMark } from "@/components/ui/CocoMark";

const designs = ["Jamaican", "Tropical", "Romance", "Birthday"];

export function BuildTeaser() {
  return (
    <section className="bg-jungle-900 py-16 text-sand-100 sm:py-24" aria-label="Build your coco">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow tone="light">Build Your Coco</Eyebrow>
            <h2 className="font-display text-3xl font-extrabold text-sand-50 sm:text-5xl">
              Put your name on it.
            </h2>
            <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-sand-300">
              A name, a message and a design on a colour sticker. It costs a couple
              of dollars more and it&rsquo;s the one that ends up on the grid.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2">
              {designs.map((d) => (
                <li
                  key={d}
                  className="rounded-full border border-jungle-700 bg-jungle-800 px-4 py-2 text-sm font-medium text-sand-200"
                >
                  {d}
                </li>
              ))}
            </ul>

            <Button href="/build-your-coco" variant="accent" size="lg" className="mt-9">
              Build yours
            </Button>
          </div>

          {/* Illustrative preview of the personalisation, not a live builder. */}
          <div className="rounded-[2rem] border border-jungle-700 bg-jungle-800/60 p-6 sm:p-8">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
              Preview
            </p>

            <div className="mt-5 flex items-center gap-6">
              <CocoMark className="h-28 w-28 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-display text-3xl font-extrabold text-sand-50">
                  Sarah
                </p>
                <p className="mt-1 truncate text-lg text-lime-400">Jamaica 2026 ❤️</p>
                <p className="mt-3 text-sm text-sand-400">Design · Jamaican</p>
              </div>
            </div>

            <dl className="mt-7 space-y-2.5 border-t border-jungle-700 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-sand-300">Classic Coco</dt>
                <dd className="text-sand-100">US$7</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sand-300">Custom sticker</dt>
                <dd className="text-sand-100">US$2</dd>
              </div>
              <div className="flex justify-between border-t border-jungle-700 pt-2.5 font-display text-base font-bold">
                <dt className="text-sand-50">Your coco</dt>
                <dd className="text-lime-400">US$9</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-sand-400">
              Example only. Delivery is added at checkout.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
