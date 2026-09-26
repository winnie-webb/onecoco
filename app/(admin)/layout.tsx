import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "../globals.css";

/**
 * Its own root layout — no marketing `<Header/>`/`<Footer/>` here. Next.js
 * supports multiple root layouts via route groups precisely for this split
 * (staff tool vs. public site); see route-groups.md's "Use cases".
 */
const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
