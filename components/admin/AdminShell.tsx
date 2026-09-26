"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/db/browser";
import type { StaffSession } from "@/lib/auth/guards";

const NAV = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/zones", label: "Zones" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/runners", label: "Runners" },
  { href: "/admin/map", label: "Map" },
  { href: "/admin/partners", label: "Partners" },
];

export function AdminShell({ session, children }: { session: StaffSession; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = NAV.find((item) => pathname?.startsWith(item.href));

  async function signOut() {
    await browserClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="sticky top-0 z-40 border-b border-sand-200 bg-jungle-900 text-sand-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Below md: current section + a disclosure menu, same zero-extra-state
              pattern as the marketing Header — everything else (full nav, session
              info, sign out) moves into the dropdown instead of being hidden. */}
          <span className="font-display font-bold text-sand-50 md:hidden">{current?.label ?? "Admin"}</span>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Admin">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  pathname?.startsWith(item.href) ? "bg-sand-50 text-jungle-900" : "text-sand-200 hover:text-sand-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 text-sm text-sand-200 md:flex">
            <span>
              {session.displayName ?? session.email} · {session.role}
            </span>
            <button onClick={signOut} className="rounded-full px-3 py-2 font-medium hover:bg-jungle-800">
              Sign out
            </button>
          </div>

          <details className="group relative md:hidden">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full transition-colors hover:bg-jungle-800 [&::-webkit-details-marker]:hidden"
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

            <div className="absolute right-0 top-13 w-64 rounded-card border border-sand-200 bg-sand-50 p-2 text-ink shadow-xl shadow-jungle-900/20">
              <nav className="flex flex-col" aria-label="Admin mobile">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-4 py-3 font-medium transition-colors ${
                      pathname?.startsWith(item.href) ? "bg-jungle-900 text-sand-50" : "text-ink hover:bg-sand-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-2 border-t border-sand-200 pt-2">
                <p className="px-4 py-2 text-sm text-ink-soft">
                  {session.displayName ?? session.email} · {session.role}
                </p>
                <button onClick={signOut} className="w-full rounded-xl px-4 py-3 text-left font-medium text-ink hover:bg-sand-100">
                  Sign out
                </button>
              </div>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
