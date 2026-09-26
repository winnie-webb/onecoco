import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "../globals.css";

/** Its own root layout, same split as (admin) and (runner) — no marketing
 * chrome. Partners are desktop-first (reviewing revenue, printing QR
 * codes), so this one doesn't need (runner)'s mobile-first bias. */
const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Partner", template: "%s · Partner" },
  robots: { index: false, follow: false },
};

export default function PartnerRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-dvh bg-sand-50 antialiased">{children}</body>
    </html>
  );
}
