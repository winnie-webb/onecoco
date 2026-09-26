"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Section";
import { CocoPreview } from "@/components/order/CocoPreview";

/**
 * Phase 8: a REAL live preview, not the static illustration BuildTeaser
 * still uses (that one stays static and zero-JS on the homepage teaser,
 * deliberately — see PHASE-1-NOTES.md's JS budget note). This is local
 * state only, no database, no pricing — same "no ordering logic on
 * marketing pages" boundary Phase 1 drew. The real, priced version of this
 * exact preview lives inside `ProductPicker` at `/order`, driven by the
 * real catalogue.
 */
const DESIGNS = [
  { value: "", label: "None" },
  { value: "jamaican", label: "Jamaican" },
  { value: "tropical", label: "Tropical" },
  { value: "romance", label: "Romance" },
  { value: "birthday", label: "Birthday" },
];

const EXTRAS = [
  { value: "lime", label: "Lime" },
  { value: "straw", label: "Extra straw" },
  { value: "spoon", label: "Spoon" },
  { value: "water", label: "Extra coconut water" },
];

export function InteractiveBuilder() {
  const [design, setDesign] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [extras, setExtras] = useState<string[]>([]);

  function toggleExtra(value: string) {
    setExtras((prev) => (prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]));
  }

  return (
    <section className="bg-sand-100 py-16 sm:py-24" aria-label="Try the builder">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <Eyebrow>Try it</Eyebrow>
          <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-4xl">
            Play with it — no order, no account.
          </h2>
        </div>

        <div className="mt-10 grid gap-8 rounded-card border border-sand-300 bg-sand-50 p-6 sm:p-8 lg:grid-cols-2">
          <CocoPreview design={design || null} name={name} message={message} extras={extras} className="justify-self-center" />

          <div className="text-left">
            <label className="block">
              <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Name</span>
              <input
                type="text"
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah"
                className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Message</span>
              <input
                type="text"
                maxLength={40}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Jamaica 2026"
                className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
              />
            </label>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">Design</legend>
              <div className="flex flex-wrap gap-2">
                {DESIGNS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDesign(d.value)}
                    className={`rounded-full border-2 px-4 py-2 text-sm ${
                      design === d.value ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200 text-ink"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-soft">Extras</legend>
              <div className="flex flex-wrap gap-2">
                {EXTRAS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => toggleExtra(e.value)}
                    className={`rounded-full border-2 px-4 py-2 text-sm ${
                      extras.includes(e.value) ? "border-jungle-800 bg-jungle-800 text-sand-50" : "border-sand-200 text-ink"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <Button href="/order" size="lg" className="mt-7 w-full">
              Order this for real
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
