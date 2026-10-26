import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "../globals.css";

/** Its own root layout, same reasoning as `(admin)` — no marketing chrome,
 * and this one specifically needs to be mobile-first: a runner is on a
 * phone, on a beach, on weak signal (§21). */
const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Runner", template: "%s · Runner" },
  robots: { index: false, follow: false },
};

export default function RunnerRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-dvh bg-sand-50 antialiased">{children}</body>
    </html>
  );
}
