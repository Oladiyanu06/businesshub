import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole, Trash2, Users } from "lucide-react";

import { deleteRole } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { can, PERMISSION_CATALOG } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/utils";
import { RoleDetailsForm } from "./role-details-form";
import { RolePermissionsForm } from "./role-permissions-form";

type RoleDetail = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
};

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("role.view");
  const { id } = await params;
  const supabase = await createClient();
  const manage = can(session.permissions, "role.manage");

  const { data } = await supabase
    .from("roles")
    .select("id, key, name, description, is_system, created_at")
    .eq("id", id)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!data) notFound();
  const role = data as RoleDetail;

  const [{ data: permissionRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", role.id)
      .eq("business_id", session.business.id),
    supabase
      .from("employee_roles")
      .select("employee_id")
      .eq("role_id", role.id)
      .eq("business_id", session.business.id),
  ]);

  const assigned = (permissionRows ?? []).map((row) => row.permission_key);
  const employeeIds = (assignmentRows ?? []).map((row) => row.employee_id);

  type Person = {
    id: string;
    full_name: string;
    email: string;
    status: string;
  };
  let people: Person[] = [];
  if (employeeIds.length > 0) {
    const { data: employeeRows } = await supabase
      .from("employees")
      .select("id, full_name, email, status")
      .eq("business_id", session.business.id)
      .in("id", employeeIds)
      .order("full_name");
    people = (employeeRows ?? []) as Person[];
  }

  const isAdminRole = role.key === "business_admin";
  const canDelete = manage && !role.is_system && people.length === 0;

  return (
    <div className="space-y-6">
      <Link
        href="/app/roles"
        className={buttonStyles({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Roles
      </Link>

      <PageHeader
        eyebrow="Role"
        title={role.name}
        description={role.description ?? "No description provided."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={role.is_system ? "neutral" : "brand"}>
              {role.is_system ? "System role" : "Custom role"}
            </Badge>
            <Badge tone={assigned.length === PERMISSION_CATALOG.length ? "success" : "info"}>
              {assigned.length} / {PERMISSION_CATALOG.length} permissions
            </Badge>
          </div>
        }
      />

      {isAdminRole ? (
        <Alert variant="info" title="Protected role">
          The Business Administrator role always keeps full permissions so the business can
          never lock itself out.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Permissions" description="What this role can do" />
            <CardBody>
              {manage ? (
                <RolePermissionsForm
                  roleId={role.id}
                  assigned={assigned}
                  lockAll={isAdminRole}
                />
              ) : (
                <PermissionReadOnly assigned={assigned} />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Role details" />
            <CardBody>
              {manage ? (
                <RoleDetailsForm
                  roleId={role.id}
                  name={role.name}
                  description={role.description}
                  isSystem={role.is_system}
                />
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Name</dt>
                    <dd className="font-medium text-slate-800">{role.name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Key</dt>
                    <dd className="font-mono text-xs text-slate-700">{role.key}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Created</dt>
                    <dd className="text-slate-700">{formatDate(role.created_at)}</dd>
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Assigned employees"
              description={`${people.length} ${people.length === 1 ? "person" : "people"}`}
            />
            <CardBody className="p-0">
              {people.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No employees currently hold this role.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {people.map((person) => (
                    <li key={person.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                        {initials(person.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/app/employees/${person.id}`}
                          className="block truncate text-[13px] font-medium text-slate-900 hover:text-brand-700"
                        >
                          {person.full_name}
                        </Link>
                        <p className="truncate text-[11px] text-slate-500">{person.email}</p>
                      </div>
                      <Badge tone={person.status === "active" ? "success" : "neutral"}>
                        {person.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {canDelete ? (
            <Card>
              <CardHeader title="Delete role" />
              <CardBody className="space-y-3">
                <p className="text-[13px] text-slate-600">
                  This role is not assigned to any employee. Deleting it is permanent.
                </p>
                <form action={deleteRole}>
                  <input type="hidden" name="roleId" value={role.id} />
                  <SubmitButton variant="danger" size="sm" pendingLabel="Deleting…">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete role
                  </SubmitButton>
                </form>
              </CardBody>
            </Card>
          ) : manage && !role.is_system && people.length > 0 ? (
            <Card>
              <CardHeader title="Delete role" />
              <CardBody className="text-[13px] text-slate-600">
                <Users className="mb-2 h-4 w-4 text-slate-400" aria-hidden />
                Remove this role from every employee before it can be deleted.
              </CardBody>
            </Card>
          ) : null}

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Role changes are audited and take effect on the employee&apos;s next request.
          </p>
        </div>
      </div>
    </div>
  );
}

function PermissionReadOnly({ assigned }: { assigned: string[] }) {
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {PERMISSION_CATALOG.map((permission) => {
        const active = assigned.includes(permission.key);
        return (
          <li
            key={permission.key}
            className={
              active
                ? "rounded-md bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-700"
                : "rounded-md px-2.5 py-1.5 text-[12px] text-slate-400 line-through"
            }
          >
            {permission.description}
          </li>
        );
      })}
    </ul>
  );
}
