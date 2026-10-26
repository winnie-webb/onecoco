import { Section, Eyebrow } from "@/components/ui/Section";
import { legal } from "@/lib/legal";

/** Shared shell for the policy pages: heading, draft notice, readable measure. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section label={title}>
      <article className="mx-auto max-w-2xl">
        <Eyebrow>Policies</Eyebrow>
        <h1 className="font-display text-3xl font-extrabold text-jungle-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated {legal.lastUpdated}</p>
        {!legal.reviewed && (
          <p className="mt-6 rounded-card border-2 border-sand-300 bg-sand-100 p-4 text-sm text-ink-soft" role="note">
            Draft: this policy is awaiting legal review and may change before launch.
          </p>
        )}
        <div className="mt-8 space-y-4 leading-relaxed text-ink-soft [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-jungle-800 [&_a]:font-semibold [&_a]:text-jungle-800 [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </article>
    </Section>
  );
}
