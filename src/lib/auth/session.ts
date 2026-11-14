import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { can, isPermissionKey, type PermissionKey } from "@/lib/permissions";
import { rawSessionContextSchema } from "@/lib/auth/schema";

export type EmployeeContext = {
  id: string;
  businessId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  branchId: string | null;
  designation: string | null;
  status: "active" | "suspended" | "terminated";
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};

export type BusinessContext = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  status: "active" | "suspended" | "archived";
  logoUrl: string | null;
  offlineSessionHours: number;
  expenseApprovalThreshold: number;
};

export type RoleSummary = {
  id: string;
  key: string;
  name: string;
};

export type SessionContext = {
  userId: string;
  isPlatformAdmin: boolean;
  platformAdmin: { fullName: string; email: string } | null;
  employee: EmployeeContext | null;
  business: BusinessContext | null;
  roles: RoleSummary[];
  permissions: PermissionKey[];
};

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads the authenticated user's tenant context through a SECURITY DEFINER
 * RPC. Accepts an existing client so a Server Action can reuse the session it
 * has just established.
 */
export async function loadSessionContext(
  supabase: ServerSupabaseClient,
): Promise<SessionContext | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase.rpc("get_my_context");
  if (error || !data) {
    console.error("get_my_context failed", error?.message);
    return null;
  }

  const parsed = rawSessionContextSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Unexpected session context shape", parsed.error.flatten());
    return null;
  }

  const raw = parsed.data;

  return {
    userId: raw.user_id,
    isPlatformAdmin: raw.is_platform_admin,
    platformAdmin: raw.platform_admin
      ? { fullName: raw.platform_admin.full_name, email: raw.platform_admin.email }
      : null,
    employee: raw.employee
      ? {
          id: raw.employee.id,
          businessId: raw.employee.business_id,
          employeeNumber: raw.employee.employee_number,
          fullName: raw.employee.full_name,
          email: raw.employee.email,
          phone: raw.employee.phone,
          branchId: raw.employee.branch_id,
          designation: raw.employee.designation,
          status: raw.employee.status,
          mustChangePassword: raw.employee.must_change_password,
          lastLoginAt: raw.employee.last_login_at,
        }
      : null,
    business: raw.business
      ? {
          id: raw.business.id,
          name: raw.business.name,
          slug: raw.business.slug,
          currency: raw.business.currency,
          timezone: raw.business.timezone,
          status: raw.business.status,
          logoUrl: raw.business.logo_url,
          offlineSessionHours: raw.business.offline_session_hours,
          expenseApprovalThreshold: raw.business.expense_approval_threshold,
        }
      : null,
    roles: raw.roles,
    permissions: raw.permissions.filter(isPermissionKey),
  };
}

/**
 * Request-scoped context. Cached for the duration of a React render pass;
 * Server Actions call it fresh so revoked permissions take effect immediately.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> =>
  loadSessionContext(await createClient()),
);

export async function requireSession(options?: { allowPasswordChange?: boolean }) {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  if (session.employee?.status === "suspended" || session.employee?.status === "terminated") {
    redirect("/suspended");
  }

  if (!options?.allowPasswordChange && session.employee?.mustChangePassword) {
    redirect("/change-password");
  }

  return session;
}

export type BusinessSession = SessionContext & {
  employee: EmployeeContext;
  business: BusinessContext;
};

export async function requireBusiness(): Promise<BusinessSession> {
  const session = await requireSession();

  if (!session.employee || !session.business) {
    if (session.isPlatformAdmin) redirect("/platform");
    redirect("/no-access");
  }

  if (session.business.status !== "active") redirect("/suspended");

  return session as BusinessSession;
}

export async function requirePermission(key: PermissionKey): Promise<BusinessSession> {
  const session = await requireBusiness();
  if (!can(session.permissions, key)) {
    redirect(`/app?error=forbidden&permission=${encodeURIComponent(key)}`);
  }
  return session;
}

export async function requirePlatformAdmin(): Promise<SessionContext> {
  const session = await requireSession();
  if (!session.isPlatformAdmin) redirect("/app");
  return session;
}

/**
 * Non-redirecting authorization for Server Actions. Returns null when the
 * caller is not an active employee with the required permission.
 */
export async function getActionSession(
  permission?: PermissionKey,
  options?: { allowPasswordChange?: boolean },
): Promise<BusinessSession | null> {
  const session = await getSessionContext();
  if (!session?.employee || !session.business) return null;
  if (session.employee.status !== "active") return null;
  if (!options?.allowPasswordChange && session.employee.mustChangePassword) return null;
  if (session.business.status !== "active") return null;
  if (permission && !can(session.permissions, permission)) return null;
  return session as BusinessSession;
}

export function has(session: SessionContext, key: PermissionKey): boolean {
  return can(session.permissions, key);
}
