/**
 * Supabase session cookie helpers.
 *
 * `@supabase/ssr` stores the session as a JSON payload in a cookie named
 * `sb-<project-ref>-auth-token` (chunked as `.0`, `.1`, … when it is large).
 * The payload carries `expires_at`, which the auth server computes from *its*
 * clock. `supabase-js` compares that value with the *local* clock and refreshes
 * the session whenever it looks expired.
 *
 * On a host whose clock is wrong that check misfires on every request: each
 * request rotates the refresh token, and any two concurrent requests then send
 * the same token. Supabase treats the second one as a reused token, revokes the
 * session and `@supabase/ssr` deletes the cookies — the user is silently signed
 * out mid-navigation.
 *
 * `normaliseAuthCookieExpiry` shifts `expires_at` by the measured clock skew
 * before the SDK reads it, so the comparison uses server time. The token that
 * is sent to Supabase is never modified, and every request still validates the
 * JWT with the auth server through `getUser()`.
 */

type Cookie = { name: string; value: string };

/** `sb-<ref>-auth-token` plus optional chunk suffix. */
const AUTH_COOKIE_PATTERN = /^(sb-.+-auth-token)(?:\.(\d+))?$/;

/** Mirrors `MAX_CHUNK_SIZE` in `@supabase/ssr`. */
const MAX_CHUNK_SIZE = 3180;

export function isAuthCookie(name: string): boolean {
  return AUTH_COOKIE_PATTERN.test(name);
}

/**
 * Returns the cookies with `expires_at` shifted by `skewSeconds` on every
 * Supabase auth cookie. `skewSeconds` is positive when the local clock runs
 * ahead of the auth server. Anything that cannot be parsed is returned
 * untouched so this helper can never break a session.
 */
export function normaliseAuthCookieExpiry<T extends Cookie>(
  cookies: T[],
  skewSeconds: number,
): T[] {
  if (!Number.isFinite(skewSeconds) || skewSeconds === 0) return cookies;

  const untouched: T[] = [];
  const groups = new Map<string, { plain?: T; chunks: T[] }>();

  for (const cookie of cookies) {
    const match = AUTH_COOKIE_PATTERN.exec(cookie.name);
    if (!match) {
      untouched.push(cookie);
      continue;
    }
    const [, base, index] = match;
    const group = groups.get(base) ?? { chunks: [] };
    if (index === undefined) group.plain = cookie;
    else group.chunks.push(cookie);
    groups.set(base, group);
  }

  const result: T[] = [...untouched];

  for (const [base, group] of groups) {
    // A plain cookie plus chunk cookies is an inconsistent state the SDK would
    // not read deterministically. Leave it for the SDK to resolve.
    if (group.plain && group.chunks.length > 0) {
      result.push(group.plain, ...group.chunks);
      continue;
    }

    const original = group.plain
      ? [group.plain]
      : [...group.chunks].sort((a, b) => chunkIndex(a.name) - chunkIndex(b.name));

    const adjusted = shiftExpiry(
      original.map((cookie) => cookie.value).join(""),
      skewSeconds,
    );

    if (adjusted === null) {
      result.push(...original);
      continue;
    }

    // Re-emit with the same naming convention. Base64url is ASCII, so splitting
    // the encoded string is equivalent to the SDK's chunker.
    if (group.plain || adjusted.length <= MAX_CHUNK_SIZE) {
      result.push({ ...original[0], name: base, value: adjusted });
    } else {
      for (
        let offset = 0, index = 0;
        offset < adjusted.length;
        offset += MAX_CHUNK_SIZE, index += 1
      ) {
        result.push({
          ...original[0],
          name: `${base}.${index}`,
          value: adjusted.slice(offset, offset + MAX_CHUNK_SIZE),
        });
      }
    }
  }

  return result;
}

function chunkIndex(name: string): number {
  const match = /\.(\d+)$/.exec(name);
  return match ? Number(match[1]) : 0;
}

function shiftExpiry(value: string, skewSeconds: number): string | null {
  // The default `cookieEncoding` is "base64url"; other encodings are left as-is.
  if (!value.startsWith("base64-")) return null;

  try {
    const json = decodeBase64Url(value.slice("base64-".length));
    const session = JSON.parse(json) as { expires_at?: unknown };
    if (typeof session.expires_at !== "number" || !Number.isFinite(session.expires_at)) {
      return null;
    }
    session.expires_at = Math.trunc(session.expires_at + skewSeconds);
    return `base64-${encodeBase64Url(JSON.stringify(session))}`;
  } catch {
    return null;
  }
}

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalised.length % 4)) % 4);
  const binary = atob(normalised + padding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
