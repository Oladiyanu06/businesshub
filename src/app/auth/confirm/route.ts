import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { setRecoveryCookie } from "@/lib/auth/recovery-cookie";
import { safeNextPath } from "@/lib/auth/redirect";

const ALLOWED_TYPES: EmailOtpType[] = ["invite", "recovery", "email", "email_change"];

/**
 * Handles both link shapes Supabase can produce:
 *  - `token_hash` from a custom email template (works on any device);
 *  - `code` from the default template with PKCE (must open in the same browser
 *    that requested the reset, because the verifier lives in a cookie).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next")) ?? "/change-password";

  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/login?error=expired_link`);
    }

    if (type === "recovery") {
      await setRecoveryCookie(data.user.id);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  if (type === "recovery") {
    await setRecoveryCookie(data.user.id);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
