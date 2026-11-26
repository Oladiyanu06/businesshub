import "server-only";

import { cookies } from "next/headers";

import {
  createRecoveryToken,
  RECOVERY_COOKIE,
  RECOVERY_TTL_SECONDS,
  verifyRecoveryToken,
} from "@/lib/auth/recovery-token";

/**
 * A dedicated secret is preferred, but the service-role key is already a
 * strong server-only value and keeps existing deployments working without a
 * new environment variable.
 */
function getRecoverySecret(): string {
  const secret =
    process.env.PASSWORD_RECOVERY_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret) {
    throw new Error("No secret is available to sign password-recovery tokens.");
  }

  return secret;
}

export async function setRecoveryCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(RECOVERY_COOKIE, createRecoveryToken(userId, getRecoverySecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RECOVERY_TTL_SECONDS,
  });
}

export async function hasRecoveryCookie(userId: string): Promise<boolean> {
  const store = await cookies();
  return verifyRecoveryToken(
    store.get(RECOVERY_COOKIE)?.value,
    userId,
    getRecoverySecret(),
  );
}

export async function clearRecoveryCookie(): Promise<void> {
  const store = await cookies();
  store.delete(RECOVERY_COOKIE);
}
