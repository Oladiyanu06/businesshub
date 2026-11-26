import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived proof that the current session was established through a
 * password-recovery link. It lets `/change-password` skip the "current
 * password" check without weakening the normal change-password flow.
 *
 * The token is signed, bound to the user id and expires quickly, so a value
 * copied from another browser cannot be replayed later.
 */
export const RECOVERY_COOKIE = "bh_recovery";
export const RECOVERY_TTL_SECONDS = 15 * 60;

export function createRecoveryToken(
  userId: string,
  secret: string,
  now: number = Date.now(),
): string {
  const expires = Math.floor(now / 1_000) + RECOVERY_TTL_SECONDS;
  const payload = `${userId}.${expires}`;
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyRecoveryToken(
  token: string | undefined,
  userId: string,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenUserId, expiresRaw, signature] = parts;
  if (tokenUserId !== userId) return false;

  const expires = Number(expiresRaw);
  if (!Number.isInteger(expires) || expires < Math.floor(now / 1_000)) return false;

  const expected = sign(`${tokenUserId}.${expiresRaw}`, secret);
  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);

  if (received.length !== wanted.length) return false;
  return timingSafeEqual(received, wanted);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
