import { describe, expect, it } from "vitest";

import {
  isAuthCookie,
  normaliseAuthCookieExpiry,
} from "@/lib/supabase/session-cookie";

const BASE = "sb-your-project-ref-auth-token";

function encode(session: unknown): string {
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

function decode(value: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(value.slice("base64-".length), "base64url").toString("utf8"));
}

function session(expiresAt = 1_794_399_065) {
  return {
    access_token: "access",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user: { id: "901667dd-556b-4c20-a25e-856f7270dd15", email: "owner@example.com" },
  };
}

describe("isAuthCookie", () => {
  it("matches the session cookie and its chunks", () => {
    expect(isAuthCookie(BASE)).toBe(true);
    expect(isAuthCookie(`${BASE}.0`)).toBe(true);
    expect(isAuthCookie(`${BASE}.12`)).toBe(true);
  });

  it("ignores unrelated cookies", () => {
    expect(isAuthCookie("theme")).toBe(false);
    expect(isAuthCookie(`${BASE}-code-verifier`)).toBe(false);
    expect(isAuthCookie(`sb-your-project-ref-auth-token-code-verifier`)).toBe(false);
  });
});

describe("normaliseAuthCookieExpiry", () => {
  it("shifts expires_at by the measured skew and keeps everything else", () => {
    const [cookie] = normaliseAuthCookieExpiry(
      [{ name: BASE, value: encode(session(1_000)) }],
      32_395,
    );

    const parsed = decode(cookie.value);
    expect(parsed.expires_at).toBe(33_395);
    expect(parsed.refresh_token).toBe("refresh");
    expect(parsed.user).toEqual(session().user);
    expect(cookie.name).toBe(BASE);
  });

  it("is a no-op when the clocks agree", () => {
    const cookies = [{ name: BASE, value: encode(session()) }];
    expect(normaliseAuthCookieExpiry(cookies, 0)).toBe(cookies);
  });

  it("leaves other cookies and malformed values untouched", () => {
    const cookies = [
      { name: "theme", value: "dark" },
      { name: BASE, value: "not-base64" },
      { name: `${BASE}.0`, value: "base64-%%%" },
    ];

    expect(normaliseAuthCookieExpiry(cookies, 120)).toEqual(cookies);
  });

  it("ignores payloads without a numeric expires_at", () => {
    const value = encode({ access_token: "a", refresh_token: "r" });
    const cookies = [{ name: BASE, value }];
    expect(normaliseAuthCookieExpiry(cookies, 120)).toEqual(cookies);
  });

  it("handles a chunked session cookie", () => {
    const big = session();
    (big as Record<string, unknown>).padding = "x".repeat(4_000);
    const encoded = encode(big);
    const chunks = [];
    for (let offset = 0, index = 0; offset < encoded.length; offset += 3_180, index += 1) {
      chunks.push({ name: `${BASE}.${index}`, value: encoded.slice(offset, offset + 3_180) });
    }
    expect(chunks.length).toBeGreaterThan(1);

    const normalised = normaliseAuthCookieExpiry(chunks, 60);
    const joined = normalised
      .filter((cookie) => cookie.name.startsWith(BASE))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
      .map((cookie) => cookie.value)
      .join("");

    const parsed = decode(joined);
    expect(parsed.expires_at).toBe(1_794_399_065 + 60);
    expect(parsed.padding).toHaveLength(4_000);
  });
});
