import Link from "next/link";
import { brand } from "@/lib/brand";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const nav = [
  { href: "/#cocos", label: "Cocos" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/build-your-coco", label: "Build Your Coco" },
  { href: "/partners", label: "Partners" },
];

/**
 * The mobile menu is a <details> disclosure on purpose: it needs no client
 * JavaScript, which keeps the entire marketing surface server-rendered.
 * That matters more than usual here — the audience is on beach cell signal.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/90 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Wordmark />

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-[0.95rem] font-medium text-ink-soft transition-colors hover:bg-jungle-800/5 hover:text-jungle-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button href="/order" variant="accent">{brand.cta}</Button>

            <details className="group relative lg:hidden">
              <summary
                className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-jungle-800 transition-colors hover:bg-jungle-800/10 [&::-webkit-details-marker]:hidden"
                aria-label="Open menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" className="group-open:hidden" />
                  <path d="M6 6l12 12M18 6L6 18" className="hidden group-open:block" />
                </svg>
              </summary>

              <div className="absolute right-0 top-13 w-60 rounded-card border border-sand-200 bg-sand-50 p-2 shadow-xl shadow-jungle-900/10">
                <nav aria-label="Mobile" className="flex flex-col">
                  {nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl px-4 py-3 font-medium text-ink transition-colors hover:bg-sand-100"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </details>
          </div>
        </div>
      </Container>
    </header>
  );
}
