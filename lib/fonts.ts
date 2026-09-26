import { Outfit } from "next/font/google";

/*
 * One family, two roles: --font-display and --font-sans both resolve here.
 * A second face cost ~40KB on first paint for a page whose body copy is a few
 * short paragraphs — not a good trade when the audience is on beach signal.
 *
 * Outfit is a variable font, so no `weight` array: that would pin static
 * instances and lose the weights in between. Measured cost of this setup is
 * 31.8KB in one file.
 */
export const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
