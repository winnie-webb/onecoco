import Link from "next/link";
import { brand } from "@/lib/brand";
import { Wordmark } from "@/components/ui/Wordmark";
import { Container } from "@/components/ui/Container";

const columns = [
  {
    title: "Order",
    links: [
      { href: "/order", label: brand.cta },
      { href: "/build-your-coco", label: "Build Your Coco" },
      { href: "/how-it-works", label: "How It Works" },
    ],
  },
  {
    title: "Work with us",
    links: [
      { href: "/partners", label: "Hotels & Resorts" },
      { href: "/partners#tours", label: "Tour Operators" },
      { href: "/partners#runners", label: "Become a Runner" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-jungle-900 text-sand-100 print:hidden">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Wordmark tone="light" />
            <p className="mt-4 max-w-xs text-pretty text-sand-300">
              {brand.subtitle}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-jungle-800 px-4 py-2 text-sm font-semibold text-lime-400">
              <span aria-hidden="true">📍</span>
              {brand.market}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-lime-400">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sand-200 transition-colors hover:text-sand-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-jungle-800 py-6 text-sm text-sand-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {brand.name}. Made in Jamaica.
          </p>
          <p className="text-sand-400">{brand.market}</p>
        </div>
      </Container>
    </footer>
  );
}
