import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthClockSkewSeconds } from "@/lib/supabase/clock";
import { isAuthCookie, normaliseAuthCookieExpiry } from "@/lib/supabase/session-cookie";

const PROTECTED_PREFIXES = ["/app", "/platform", "/change-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  // A prefetch is a background guess at the next page; it must never be allowed
  // to change the signed-in session. If its token refresh fails, @supabase/ssr
  // asks us to delete the auth cookies — doing so on a prefetch signs the user
  // out while they are still reading the current page.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";

  // Normalise session expiry to the auth server's clock. Without this, a host
  // whose clock is skewed refreshes (and rotates) the token on every request;
  // concurrent requests then replay the same refresh token, Supabase revokes
  // the session and the next navigation lands on /login.
  const skewSeconds = await getAuthClockSkewSeconds();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return normaliseAuthCookieExpiry(request.cookies.getAll(), skewSeconds);
      },
      setAll(cookiesToSet) {
        const onlyRemovingAuthCookies =
          cookiesToSet.length > 0 &&
          cookiesToSet.every(({ value, options }) => value === "" || options?.maxAge === 0) &&
          cookiesToSet.some(({ name }) => isAuthCookie(name));

        if (isPrefetch && onlyRemovingAuthCookies) return;

        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the session. Always use getUser(), never getSession(), so the JWT
  // is validated by the Auth server rather than trusted from a cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", requestedPath(request));
    // Carry over any cookies the refresh just wrote: dropping a rotated token
    // here would leave the browser replaying an already-used refresh token.
    return withCookies(NextResponse.redirect(loginUrl), response);
  }

  if (user && path === "/login") {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    appUrl.search = "";
    return withCookies(NextResponse.redirect(appUrl), response);
  }

  return response;
}

function withCookies(target: NextResponse, source: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

/** The path the user tried to open, safe to put in a query parameter. */
function requestedPath(request: NextRequest): string {
  const params = new URLSearchParams(request.nextUrl.searchParams);
  params.delete("_rsc");
  const query = params.toString();
  const path = request.nextUrl.pathname.startsWith("/")
    ? request.nextUrl.pathname
    : "/";
  return query ? `${path}?${query}` : path;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
