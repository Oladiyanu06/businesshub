export const SITE_NAME = "BUSINESSHUB";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://businesshub-pi.vercel.app"
).replace(/\/$/, "");

export const SITE_TITLE = "BUSINESSHUB — Multi-branch business operations";

export const SITE_DESCRIPTION =
  "Multi-tenant business operations platform for growing retailers: employees, roles, branches, devices and an audit trail, with strict per-business data isolation.";

export const SITE_KEYWORDS = [
  "business management software",
  "multi-branch business software",
  "multi-tenant SaaS",
  "staff and role management",
  "business operations platform",
  "retail branch management",
  "business software Nigeria",
  "Lagos business software",
];

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${SITE_URL}/`).toString();
}
