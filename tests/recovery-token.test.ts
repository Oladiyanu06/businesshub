import { describe, expect, it } from "vitest";

import {
  createRecoveryToken,
  RECOVERY_TTL_SECONDS,
  verifyRecoveryToken,
} from "@/lib/auth/recovery-token";

const SECRET = "test-recovery-secret";
const USER = "901667dd-556b-4c20-a25e-856f7270dd15";
const NOW = 1_800_000_000_000;

describe("recovery tokens", () => {
  it("accepts a token it just issued for the same user", () => {
    const token = createRecoveryToken(USER, SECRET, NOW);
    expect(verifyRecoveryToken(token, USER, SECRET, NOW)).toBe(true);
  });

  it("rejects the token after its lifetime", () => {
    const token = createRecoveryToken(USER, SECRET, NOW);
    const later = NOW + RECOVERY_TTL_SECONDS * 1_000 + 1_000;
    expect(verifyRecoveryToken(token, USER, SECRET, later)).toBe(false);
  });

  it("is bound to one user", () => {
    const token = createRecoveryToken(USER, SECRET, NOW);
    expect(
      verifyRecoveryToken(token, "11111111-1111-4111-8111-111111111111", SECRET, NOW),
    ).toBe(false);
  });

  it("rejects a different secret", () => {
    const token = createRecoveryToken(USER, SECRET, NOW);
    expect(verifyRecoveryToken(token, USER, "another-secret", NOW)).toBe(false);
  });

  it("rejects a tampered expiry or signature", () => {
    const token = createRecoveryToken(USER, SECRET, NOW);
    const [userId, expires, signature] = token.split(".");
    const tampered = signature.endsWith("A")
      ? `${signature.slice(0, -1)}B`
      : `${signature.slice(0, -1)}A`;

    expect(
      verifyRecoveryToken(`${userId}.${Number(expires) + 60}.${signature}`, USER, SECRET, NOW),
    ).toBe(false);

    expect(
      verifyRecoveryToken(`${userId}.${expires}.${tampered}`, USER, SECRET, NOW),
    ).toBe(false);
  });

  it("rejects missing and malformed values", () => {
    expect(verifyRecoveryToken(undefined, USER, SECRET, NOW)).toBe(false);
    expect(verifyRecoveryToken("", USER, SECRET, NOW)).toBe(false);
    expect(verifyRecoveryToken(USER, USER, SECRET, NOW)).toBe(false);
    expect(verifyRecoveryToken(`${USER}.soon.signature`, USER, SECRET, NOW)).toBe(false);
  });
});
