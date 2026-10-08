/**
 * Public base URL used in emailed links. It must come from configuration, never from the request:
 * the Host header is attacker-controlled, and a reset link built from it could point at their site.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be set to build links in emails");
  }
  return "http://localhost:3000";
}
