import { Container } from "./Container";

export function Section({
  children,
  className = "",
  id,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  label?: string;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={`py-16 sm:py-24 ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}

/**
 * Small caps label above a heading.
 *
 * `tone` is not decoration. The default lime-ink token exists because lime on
 * white is ~1.6:1 and unreadable; on a dark green panel that same token is
 * equally unreadable the other way. Pass tone="light" on any jungle background.
 */
export function Eyebrow({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <p
      className={`mb-3 text-sm font-bold uppercase tracking-[0.18em] ${
        tone === "light" ? "text-lime-400" : "text-lime-ink"
      }`}
    >
      {children}
    </p>
  );
}
