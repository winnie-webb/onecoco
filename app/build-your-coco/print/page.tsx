import type { Metadata } from "next";
import { StickerPrint } from "@/components/order/StickerPrint";
import { stickerFonts } from "@/components/order/stickerFonts";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Print sticker",
  robots: { index: false, follow: false },
};

/** Prep-point print sheet for a Build Your Coco design (see StickerPrint). */
export default function Page() {
  return (
    <Container className="py-10 print:p-0">
      <h1 className="mb-6 font-display text-3xl font-extrabold text-jungle-900 print:hidden">Print sticker</h1>
      <StickerPrint fonts={stickerFonts} />
    </Container>
  );
}
