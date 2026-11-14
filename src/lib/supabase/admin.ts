import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServiceRoleKey, getSupabaseEnv } from "@/lib/env";

/**
 * Privileged client. Bypasses RLS, therefore:
 *  - only import from server-only modules,
 *  - only use for Auth administration (creating/deleting auth users),
 *  - never return its results directly to a client without authorisation.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  return createSupabaseClient(url, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
