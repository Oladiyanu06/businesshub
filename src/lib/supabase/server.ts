import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getAuthClockSkewSeconds } from "@/lib/supabase/clock";
import { normaliseAuthCookieExpiry } from "@/lib/supabase/session-cookie";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. It carries the signed-in user's JWT, so every query is
 * subject to row-level security.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  // Keep the SDK's expiry check on server time, so a host with a skewed clock
  // does not refresh (and rotate) the token — and its RLS-bound JWT — on every
  // single request.
  const skewSeconds = await getAuthClockSkewSeconds();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return normaliseAuthCookieExpiry(cookieStore.getAll(), skewSeconds);
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies. The proxy refreshes the
          // session instead, so this is safe to ignore here.
        }
      },
    },
  });
}
