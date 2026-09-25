import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";

/* Phase 1: the static marketing surface. City and beach pages join this in
   Phase 2, generated from the geography tables. */
const routes = ["", "/how-it-works", "/build-your-coco", "/partners"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
