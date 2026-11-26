"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { loadSessionContext } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirect";
import { clearRecoveryCookie, hasRecoveryCookie } from "@/lib/auth/recovery-cookie";
import { SITE_URL } from "@/lib/site";

export type AuthState = { error?: string } | undefined;

const signInSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const session = await loadSessionContext(supabase);

  const allowed =
    session &&
    (session.isPlatformAdmin ||
      (session.employee && session.employee.status === "active"));

  if (!session || !allowed) {
    await supabase.auth.signOut();
    return {
      error:
        "This account is not active or has not been assigned to a business. Contact your administrator.",
    };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;
  const userAgent = headerList.get("user-agent");

  await supabase.from("login_events").insert({
    business_id: session.business?.id ?? null,
    user_id: session.userId,
    employee_id: session.employee?.id ?? null,
    email: session.employee?.email ?? session.platformAdmin?.email ?? parsed.data.email,
    event: "login",
    ip,
    user_agent: userAgent,
    device_id: null,
  });

  if (session.employee?.mustChangePassword) {
    redirect("/change-password");
  }

  // Return the user to the page that sent them to the sign-in screen. The
  // route guards still apply, so a tenant user asking for a platform route is
  // bounced to their own workspace by `requirePlatformAdmin`.
  const next = safeNextPath(formData.get("next"));
  if (next) redirect(next);

  redirect(session.employee ? "/app" : "/platform");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const passwordSchema = z
  .object({
    currentPassword: z.string().optional().default(""),
    password: z
      .string()
      .min(12, "Use at least 12 characters.")
      .regex(/[a-z]/, "Include a lowercase letter.")
      .regex(/[A-Z]/, "Include an uppercase letter.")
      .regex(/[0-9]/, "Include a number.")
      .regex(/[^A-Za-z0-9]/, "Include a symbol."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type PasswordState = { error?: string } | undefined;

export async function changePassword(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the password fields." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session has expired. Sign in again." };

  // A recovery link already proved control of the email address, so the old
  // password is unknown by definition. Every other route still requires it.
  const recovering = await hasRecoveryCookie(user.id);

  if (!recovering) {
    if (!user.email) return { error: "Your session has expired. Sign in again." };
    if (parsed.data.currentPassword.length === 0) {
      return { error: "Enter your current password." };
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });

    if (reauthError) return { error: "Your current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  const { error: flagError } = await supabase.rpc("mark_password_changed");
  if (flagError) {
    console.error("mark_password_changed failed", flagError.message);
  }

  if (recovering) await clearRecoveryCookie();

  redirect("/app");
}

export type ResetRequestState = { error?: string; sent?: boolean } | undefined;

const resetRequestSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
});

/**
 * Always reports success, whether or not the address exists, so the form
 * cannot be used to discover which emails have accounts.
 */
export async function requestPasswordReset(
  _state: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/confirm?type=recovery&next=/change-password`,
  });

  if (error) {
    // Do not surface this to the browser: it would reveal whether the address
    // exists or that the mail provider is rate-limiting.
    console.error("requestPasswordReset failed", error.message);
  }

  return { sent: true };
}
