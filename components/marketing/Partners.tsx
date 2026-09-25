import { Section, Eyebrow } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { brand } from "@/lib/brand";

const kinds = [
  {
    title: "Hotels & resorts",
    body: "A QR code on the beach chairs, at the pool, in the room. Your guests order, we deliver, you earn on every one.",
    points: ["QR codes for any placement", "Commission on every order", "Nothing for your staff to carry"],
  },
  {
    title: "Tour operators",
    body: "Thirty people off a bus at 11:30. Pre-order the lot and have them waiting when you land on the sand.",
    points: ["Order ahead for groups", "One invoice, not thirty", "Pick your time and spot"],
  },
];

export function Partners() {
  return (
    <Section id="partners" className="bg-sand-100" label="Partners">
      <div className="max-w-2xl">
        <Eyebrow>Partners</Eyebrow>
        <h2 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-5xl">
          Put a coco in every guest&rsquo;s hand.
        </h2>
        <p className="mt-4 text-pretty text-lg text-ink-soft">
          {brand.name} works with the people already looking after these
          visitors — hotels, resorts and tour operators in {brand.marketShort}.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {kinds.map((k) => (
          <div
            key={k.title}
            className="flex flex-col rounded-card border border-sand-300 bg-sand-50 p-7"
          >
            <h3 className="font-display text-2xl font-bold text-jungle-800">
              {k.title}
            </h3>
            <p className="mt-3 text-pretty leading-relaxed text-ink-soft">{k.body}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
              {k.points.map((p) => (
                <li key={p} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-600" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button href="/partners" size="lg">
          Talk to us about partnering
        </Button>
      </div>
    </Section>
  );
}
