import Link from "next/link";
import { ChevronRight, LockKeyhole, Plus, ShieldCheck } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
};

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const session = await requirePermission("role.view");
  const params = await searchParams;
  const supabase = await createClient();
  const manage = can(session.permissions, "role.manage");

  const { data: roles } = await supabase
    .from("roles")
    .select("id, key, name, description, is_system")
    .eq("business_id", session.business.id)
    .order("is_system", { ascending: false })
    .order("name");

  const list = (roles ?? []) as RoleRow[];
  const roleIds = list.map((role) => role.id);

  const [{ data: permissionRows }, { data: assignmentRows }] = await Promise.all([
    roleIds.length > 0
      ? supabase
          .from("role_permissions")
          .select("role_id, permission_key")
          .eq("business_id", session.business.id)
          .in("role_id", roleIds)
      : Promise.resolve({ data: [] as Array<{ role_id: string; permission_key: string }> }),
    roleIds.length > 0
      ? supabase
          .from("employee_roles")
          .select("role_id, employee_id")
          .eq("business_id", session.business.id)
          .in("role_id", roleIds)
      : Promise.resolve({ data: [] as Array<{ role_id: string; employee_id: string }> }),
  ]);

  const permissionCount = new Map<string, number>();
  for (const row of permissionRows ?? []) {
    permissionCount.set(row.role_id, (permissionCount.get(row.role_id) ?? 0) + 1);
  }

  const employeeCount = new Map<string, number>();
  for (const row of assignmentRows ?? []) {
    employeeCount.set(row.role_id, (employeeCount.get(row.role_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      {params.error === "assigned_role" ? (
        <Alert variant="error" title="Role is in use">
          Remove this role from every employee before deleting it.
        </Alert>
      ) : null}
      {params.error === "system_role" ? (
        <Alert variant="error" title="System role">
          System roles cannot be deleted. You can still change their permissions — except
          the Business Administrator role, which always retains full access.
        </Alert>
      ) : null}
      {params.notice === "deleted" ? (
        <Alert variant="success">Role deleted.</Alert>
      ) : null}

      <PageHeader
        eyebrow="People & access"
        title="Roles & permissions"
        description="Permissions are additive. Employees receive the union of every role assigned to them."
        actions={
          manage ? (
            <Link href="/app/roles/new" className={buttonStyles({ size: "sm" })}>
              <Plus className="h-4 w-4" aria-hidden /> Create role
            </Link>
          ) : null
        }
      />

      <Card>
        <CardBody className="p-0">
          {list.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6" aria-hidden />}
                title="No roles defined"
                description="Roles control which modules and actions each employee can use."
                action={
                  manage ? (
                    <Link href="/app/roles/new" className={buttonStyles({ size: "sm" })}>
                      Create role
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Permissions</th>
                    <th className="px-5 py-3 font-semibold">Employees</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((role) => (
                    <tr key={role.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/app/roles/${role.id}`}
                          className="flex items-center gap-2 font-medium text-slate-900 hover:text-brand-700"
                        >
                          {role.key === "business_admin" ? (
                            <LockKeyhole className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                          ) : null}
                          {role.name}
                        </Link>
                        <p className="mt-0.5 max-w-md truncate text-[11px] text-slate-500">
                          {role.description ?? "No description"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={role.is_system ? "neutral" : "brand"}>
                          {role.is_system ? "System" : "Custom"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-slate-700">
                        {permissionCount.get(role.id) ?? 0}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-slate-700">
                        {employeeCount.get(role.id) ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/app/roles/${role.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
                        >
                          {manage ? "Manage" : "View"}{" "}
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-xs leading-relaxed text-slate-500">
        Grant <span className="font-medium">role.manage</span> and{" "}
        <span className="font-medium">employee.manage</span> only to trusted administrators:
        together they can change who has access to the business.
      </p>
    </div>
  );
}
