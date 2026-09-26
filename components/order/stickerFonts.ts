import { DM_Serif_Display, Pacifico } from "next/font/google";
import { display } from "@/lib/fonts";
import type { FontFamilies } from "@/lib/coco/sticker";

/*
 * The two extra sticker faces. `preload: false` keeps them off the page's
 * first load entirely: the browser fetches one only when a customer picks it
 * and the sticker canvas asks for it (see loadStickerFont).
 */
const script = Pacifico({ weight: "400", subsets: ["latin"], display: "swap", preload: false });
const classic = DM_Serif_Display({ weight: "400", subsets: ["latin"], display: "swap", preload: false });

export const stickerFonts: FontFamilies = {
  bold: display.style.fontFamily,
  script: script.style.fontFamily,
  classic: classic.style.fontFamily,
};
