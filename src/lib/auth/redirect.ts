/**
 * Post-sign-in destination handling.
 *
 * The proxy sends signed-out visitors to `/login?next=<path>` so they return to
 * the page they asked for. Anything coming back from the browser is untrusted:
 * only same-origin, absolute paths are accepted, and never the auth endpoints
 * themselves (which would create a redirect loop).
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const path = value.trim();
  if (path.length === 0 || path.length > 2_000) return null;

  // Must be an absolute path, not a scheme-relative or absolute URL.
  if (!path.startsWith("/") || path.startsWith("//")) return null;

  // Browsers treat a backslash as a slash, so `/\evil.com` becomes `//evil.com`.
  if (path.includes("\\")) return null;

  // Never bounce back into auth routes or API handlers.
  if (/^\/(?:login|logout|auth|api)(?:[/?#]|$)/.test(path)) return null;

  return path;
}
