import Link from "next/link";
import { brand } from "@/lib/brand";
import { CocoMark } from "./CocoMark";

/**
 * The logo lockup lives here and nowhere else. Swapping the brand is this
 * file plus lib/brand.ts.
 */
export function Wordmark({
  className = "",
  tone = "dark",
  asLink = true,
}: {
  className?: string;
  tone?: "dark" | "light";
  asLink?: boolean;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <CocoMark className="h-8 w-8 shrink-0" />
      <span
        className={`font-display text-xl font-extrabold tracking-tight ${
          tone === "light" ? "text-sand-50" : "text-jungle-800"
        }`}
      >
        {brand.name}
      </span>
    </span>
  );

  if (!asLink) return inner;

  return (
    <Link href="/" aria-label={`${brand.name} home`} className="shrink-0">
      {inner}
    </Link>
  );
}
