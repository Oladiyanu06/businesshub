import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatMoney,
  humanizeKey,
  initials,
  slugify,
  titleCase,
} from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Adeyemi Stores Ltd")).toBe("adeyemi-stores-ltd");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("  Mama's  Kitchen & Bar!!  ")).toBe("mamas-kitchen-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello");
  });

  it("caps the length at 60 characters", () => {
    expect(slugify("a".repeat(120))).toHaveLength(60);
  });

  it("returns an empty string for symbols only", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("formatting", () => {
  it("formats initials from the first two names", () => {
    expect(initials("Ada Okafor")).toBe("AO");
    expect(initials("Mary Jane Watson")).toBe("MJ");
    expect(initials("Prince")).toBe("P");
  });

  it("title-cases keys and replaces separators", () => {
    expect(titleCase("role_permissions")).toBe("Role Permissions");
    expect(titleCase("business_admin")).toBe("Business Admin");
  });

  it("humanises dotted permission keys", () => {
    expect(humanizeKey("employee.manage")).toBe("Employee · Manage");
  });

  it("formats money with the given currency", () => {
    const formatted = formatMoney(1234.5, "NGN");
    expect(formatted).toContain("1,234.50");
  });

  it("formats dates and handles invalid input", () => {
    expect(formatDate("2026-01-15T10:00:00Z")).toMatch(/15 Jan 2026/);
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime("2026-01-15T10:30:00Z")).toMatch(/15 Jan 2026/);
    expect(formatDateTime(undefined)).toBe("—");
  });
});
