import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("accepts same-origin absolute paths", () => {
    expect(safeNextPath("/platform/businesses/new")).toBe("/platform/businesses/new");
    expect(safeNextPath("/app/employees?page=2")).toBe("/app/employees?page=2");
    expect(safeNextPath("  /platform  ")).toBe("/platform");
  });

  it("rejects external URLs and scheme-relative paths", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("platform")).toBeNull();
  });

  it("rejects auth and API routes to avoid loops", () => {
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath("/login?next=/app")).toBeNull();
    expect(safeNextPath("/auth/confirm")).toBeNull();
    expect(safeNextPath("/api/health")).toBeNull();
    expect(safeNextPath("/logout")).toBeNull();
  });

  it("rejects empty, oversized and non-string values", () => {
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath("   ")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(`/${"a".repeat(2_001)}`)).toBeNull();
  });
});
