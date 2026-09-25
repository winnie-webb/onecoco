import { brand } from "@/lib/brand";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function FinalCta() {
  return (
    <section className="py-16 sm:py-24" aria-label="Get a coco">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-jungle-700 to-jungle-950 px-6 py-14 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime-500/20 blur-3xl"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold text-sand-50 sm:text-5xl">
              Your vacation deserves a fresh one.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-pretty text-lg text-sand-300">
              {brand.subtitle}
            </p>
            <Button href="/order" variant="accent" size="lg" className="mt-9">
              <span aria-hidden="true">🥥</span>
              {brand.cta}
            </Button>
            <p className="mt-5 text-sm text-sand-300">
              Now delivering in {brand.market}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
