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

  async function signOut() {
    await browserClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="border-b border-sand-200 bg-jungle-900 text-sand-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap items-center gap-1" aria-label="Admin">
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
          <div className="flex items-center gap-3 text-sm text-sand-200">
            <span>
              {session.displayName ?? session.email} · {session.role}
            </span>
            <button onClick={signOut} className="rounded-full px-3 py-2 font-medium hover:bg-jungle-800">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
