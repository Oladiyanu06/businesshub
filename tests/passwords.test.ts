import { describe, expect, it } from "vitest";

import {
  generateBranchCode,
  generateEmployeeNumber,
  generateTemporaryPassword,
} from "@/lib/auth/passwords";

describe("temporary passwords", () => {
  it("generates 16-character passwords containing all required classes", () => {
    for (let index = 0; index < 50; index += 1) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it("does not produce obvious ambiguous characters", () => {
    const password = generateTemporaryPassword();
    expect(password).not.toMatch(/[lIO01]/);
  });

  it("is not predictable across calls", () => {
    const values = new Set(Array.from({ length: 200 }, () => generateTemporaryPassword()));
    expect(values.size).toBe(200);
  });
});

describe("employee numbers", () => {
  it("uses the EMP prefix and an alphanumeric suffix", () => {
    expect(generateEmployeeNumber()).toMatch(/^EMP-[A-F0-9]{5}$/);
    expect(generateEmployeeNumber("ADM")).toMatch(/^ADM-[A-F0-9]{5}$/);
  });
});

describe("branch codes", () => {
  it("derives an uppercase code from the name", () => {
    expect(generateBranchCode("Ikeja Branch")).toBe("IKEJBRAN");
  });

  it("avoids collisions by appending a counter", () => {
    const code = generateBranchCode("Ikeja Branch", ["IKEJBRAN"]);
    expect(code).toBe("IKEJBR-2");
  });

  it("falls back to BRANCH when no letters remain", () => {
    expect(generateBranchCode("!!!")).toBe("BRANCH");
  });
});
