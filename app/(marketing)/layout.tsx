import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { brand, siteUrl } from "@/lib/brand";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import "../globals.css";

/*
 * One family, two roles: --font-display and --font-sans both resolve here.
 * A second face cost ~40KB on first paint for a page whose body copy is a few
 * short paragraphs — not a good trade when the audience is on beach signal.
 *
 * Outfit is a variable font, so no `weight` array: that would pin static
 * instances and lose the weights in between. Measured cost of this setup is
 * 31.8KB in one file.
 */
const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.subtitle,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.subtitle,
    siteName: brand.name,
    locale: "en_JM",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b3d2e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-jungle-800 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-sand-50"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
