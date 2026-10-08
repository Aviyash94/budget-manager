import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Only the public pages. Everything else is per-user and behind login.
export default function sitemap(): MetadataRoute.Sitemap {
  return [`${base}/login`, `${base}/register`].map((url) => ({ url }));
}
