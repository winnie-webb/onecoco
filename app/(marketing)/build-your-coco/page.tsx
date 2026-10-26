import { redirect } from "next/navigation";

// Personalised coconuts (names, messages, printed stickers) are paused for
// the pilot: we don't have the printing kit yet. The builder components
// (components/marketing/InteractiveBuilder.tsx, BuildTeaser.tsx,
// components/order/CocoPreview.tsx) are kept so this page can come back by
// restoring it from git history; old links land on ordering instead of a 404.
export default function Page() {
  redirect("/order");
}
