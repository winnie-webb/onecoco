import type { Metadata, Viewport } from "next";
import { brand, siteUrl } from "@/lib/brand";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { display } from "@/lib/fonts";
import "./globals.css";

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
