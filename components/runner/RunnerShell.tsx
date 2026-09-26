"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/db/browser";

export function RunnerShell({ session, children }: { session: { name: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await browserClient().auth.signOut();
    router.push("/runner/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-sand-200 bg-sand-50">
        <div className="flex items-center justify-between px-4 py-3">
          <nav className="flex gap-1" aria-label="Runner">
            <Link
              href="/runner/today"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${pathname === "/runner/today" ? "bg-jungle-800 text-sand-50" : "text-ink"}`}
            >
              Today
            </Link>
            <Link
              href="/runner/offers"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${pathname === "/runner/offers" ? "bg-jungle-800 text-sand-50" : "text-ink"}`}
            >
              Offers
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <span>{session.name}</span>
            <button onClick={signOut} className="font-medium">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
