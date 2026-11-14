import "server-only";

import { getSupabaseEnv } from "@/lib/env";

/**
 * How far the host clock is from the Supabase auth server, in seconds.
 * Positive means the host runs ahead of the server.
 *
 * Token expiry (`expires_at`) is issued by the auth server but compared against
 * the local clock by `supabase-js`. A skewed host therefore refreshes the
 * token on every request; concurrent requests then reuse the same rotating
 * refresh token and Supabase revokes the session. Measuring the offset lets the
 * session cookies be normalised to server time (see `session-cookie.ts`).
 *
 * The value is cached per process and only trusted when the skew is large
 * enough to matter. Any failure degrades to `0`, i.e. default SDK behaviour.
 */

const SAMPLE_TTL_MS = 5 * 60 * 1000;
const MEANINGFUL_SKEW_SECONDS = 60;
const SAMPLE_TIMEOUT_MS = 3_000;

type Sample = { skewSeconds: number; sampledAt: number };

let cached: Sample | null = null;
let inFlight: Promise<number> | null = null;
let warned = false;

export async function getAuthClockSkewSeconds(): Promise<number> {
  if (cached && Date.now() - cached.sampledAt < SAMPLE_TTL_MS) {
    return cached.skewSeconds;
  }

  // Every request in a burst shares one probe instead of firing its own.
  inFlight ??= sample().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function sample(): Promise<number> {
  try {
    const { url, anonKey } = getSupabaseEnv();
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(SAMPLE_TIMEOUT_MS),
    });

    const header = response.headers.get("date");
    const serverMs = header ? Date.parse(header) : Number.NaN;
    if (!Number.isFinite(serverMs)) return cached?.skewSeconds ?? 0;

    const measured = Math.round((Date.now() - serverMs) / 1000);
    const skewSeconds = Math.abs(measured) >= MEANINGFUL_SKEW_SECONDS ? measured : 0;

    cached = { skewSeconds, sampledAt: Date.now() };

    if (skewSeconds !== 0 && !warned) {
      warned = true;
      console.warn(
        `[auth] The host clock is ${skewSeconds}s ahead of the Supabase auth server. ` +
          "Session expiry is normalised to server time so sign-in keeps working; " +
          "fix the host clock (NTP / automatic time) to remove this warning.",
      );
    }

    return skewSeconds;
  } catch {
    return cached?.skewSeconds ?? 0;
  }
}
