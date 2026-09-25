import { brand } from "@/lib/brand";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CocoMark } from "@/components/ui/CocoMark";

const facts = [
  { label: "Cut fresh", detail: "Opened to order, never pre-cut" },
  { label: "Minutes, not hours", detail: "Walked to your spot on the sand" },
  { label: "No app needed", detail: "It all happens right here" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-sand-50 pb-4 pt-10 sm:pt-16">
      {/* Soft lime bloom behind the headline. Decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-lime-500/20 blur-3xl"
      />

      <Container className="relative">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-sand-100 px-4 py-2 text-sm font-semibold text-jungle-800">
              <span className="h-2 w-2 rounded-full bg-lime-600" aria-hidden="true" />
              {brand.market}
            </p>

            <h1 className="mt-6 font-display text-[2.75rem] font-extrabold leading-[1.04] tracking-tight text-jungle-900 sm:text-6xl lg:text-[4.25rem]">
              {brand.tagline}
            </h1>

            <p className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-ink-soft sm:text-xl">
              {brand.subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/order" variant="accent" size="lg" className="w-full sm:w-auto">
                <span aria-hidden="true">🥥</span>
                {brand.cta}
              </Button>
              <Button href="/how-it-works" variant="outline" size="lg" className="w-full sm:w-auto">
                How it works
              </Button>
            </div>

            <dl className="mt-10 grid gap-5 border-t border-sand-200 pt-8 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="font-display font-bold text-jungle-800">{f.label}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {f.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/*
            Illustrative composition, not photography. Real hero photography is
            an outstanding Phase 1 gap — see PHASE-1-NOTES.md.
          */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-4/5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-jungle-700 via-jungle-800 to-jungle-950 sm:aspect-square lg:aspect-4/5">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-500/25 blur-2xl"
              />
              {/* Horizon + water lines. */}
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3">
                <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-jungle-950 to-transparent" />
                <div className="absolute bottom-16 left-8 h-px w-24 bg-sand-100/20" />
                <div className="absolute bottom-11 left-16 h-px w-32 bg-sand-100/15" />
                <div className="absolute bottom-6 left-6 h-px w-20 bg-sand-100/10" />
              </div>

              <CocoMark className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-[56%] drop-shadow-2xl sm:h-64 sm:w-64" />

              <p className="absolute inset-x-6 bottom-6 text-center font-display text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">
                Fresh · Cold · Jamaican
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
