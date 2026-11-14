import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  GitBranch,
  Mail,
  MonitorSmartphone,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { revokeDevice, setEmployeeStatus } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  initials,
  titleCase,
} from "@/lib/utils";
import { EditEmployeeForm } from "./edit-employee-form";
import { RolesForm } from "./roles-form";
import { ResetPasswordForm } from "./reset-password-form";

type EmployeeDetail = {
  id: string;
  user_id: string;
  employee_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  branch_id: string | null;
  designation: string | null;
  status: "active" | "suspended" | "terminated";
  must_change_password: boolean;
  hired_on: string | null;
  last_login_at: string | null;
  created_at: string;
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("employee.view");
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("employees")
    .select(
      "id, user_id, employee_number, full_name, email, phone, branch_id, designation, status, must_change_password, hired_on, last_login_at, created_at",
    )
    .eq("id", id)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!data) notFound();
  const employee = data as EmployeeDetail;

  const manage = can(session.permissions, "employee.manage");
  const canSeeRoles = can(session.permissions, "role.view");
  const canSeeDevices = can(session.permissions, "device.view");
  const canSeeAudit = can(session.permissions, "audit.view");
  const isSelf = employee.id === session.employee.id;

  const [
    { data: branches },
    { data: roles },
    { data: assignments },
    { data: devices },
    { data: logins },
    { data: auditRows },
  ] = await Promise.all([
    manage
      ? supabase
          .from("branches")
          .select("id, name")
          .eq("business_id", session.business.id)
          .order("name")
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    canSeeRoles
      ? supabase
          .from("roles")
          .select("id, key, name, description")
          .eq("business_id", session.business.id)
          .order("name")
      : Promise.resolve({ data: [] as Array<{ id: string; key: string; name: string; description: string | null }> }),
    canSeeRoles
      ? supabase
          .from("employee_roles")
          .select("role_id")
          .eq("employee_id", employee.id)
          .eq("business_id", session.business.id)
      : Promise.resolve({ data: [] as Array<{ role_id: string }> }),
    canSeeDevices
      ? supabase
          .from("devices")
          .select(
            "id, device_name, device_fingerprint, platform, app_version, status, registered_at, last_seen_at, revoked_at",
          )
          .eq("employee_id", employee.id)
          .eq("business_id", session.business.id)
          .order("registered_at", { ascending: false })
      : Promise.resolve({ data: [] as DeviceRow[] }),
    supabase
      .from("login_events")
      .select("id, event, ip, user_agent, created_at")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(10),
    canSeeAudit
      ? supabase
          .from("audit_logs")
          .select("id, action, entity_type, created_at, metadata")
          .eq("entity_type", "employees")
          .eq("entity_id", employee.id)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const branchName = employee.branch_id
    ? ((branches ?? []).find((branch) => branch.id === employee.branch_id)?.name ?? "Branch")
    : "Central staff (no branch)";

  const assignedIds = (assignments ?? []).map((row) => row.role_id);
  const assignedNames = (roles ?? [])
    .filter((role) => assignedIds.includes(role.id))
    .map((role) => role.name);

  return (
    <div className="space-y-6">
      <Link
        href="/app/employees"
        className={buttonStyles({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Employees
      </Link>

      <PageHeader
        eyebrow="Employee record"
        title={employee.full_name}
        description={`${employee.employee_number} · ${employee.designation ?? "No designation"} · ${branchName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={employee.status} />
            {manage && !isSelf ? (
              <form action={setEmployeeStatus} className="flex flex-wrap gap-2">
                <input type="hidden" name="employeeId" value={employee.id} />
                {employee.status === "active" ? (
                  <>
                    <SubmitButton variant="outline" size="sm" name="status" value="suspended">
                      Suspend access
                    </SubmitButton>
                    <SubmitButton variant="danger" size="sm" name="status" value="terminated">
                      Terminate
                    </SubmitButton>
                  </>
                ) : (
                  <SubmitButton size="sm" name="status" value="active">
                    Restore access
                  </SubmitButton>
                )}
              </form>
            ) : null}
          </div>
        }
      />

      {employee.must_change_password ? (
        <Alert variant="warning" title="Temporary password still in use">
          This employee must change their password before they can use the workspace.
          {manage ? " If they cannot sign in, reset the password from the security card." : ""}
        </Alert>
      ) : null}

      {isSelf ? (
        <Alert variant="info">
          This is your own employee record. You cannot change your own employment status.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Employee details" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {initials(employee.full_name)}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{employee.full_name}</p>
                  <p className="text-xs text-slate-500">
                    Joined {formatDate(employee.hired_on ?? employee.created_at)}
                  </p>
                </div>
              </div>

              <dl className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                      Sign-in email
                    </dt>
                    <dd className="break-all text-slate-800">{employee.email}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">Phone</dt>
                    <dd className="text-slate-800">{employee.phone ?? "—"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <GitBranch className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">Branch</dt>
                    <dd className="text-slate-800">{branchName}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                      Last sign-in
                    </dt>
                    <dd className="text-slate-800">{formatRelative(employee.last_login_at)}</dd>
                  </div>
                </div>
              </dl>

              {manage ? (
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Edit details
                  </h3>
                  <EditEmployeeForm
                    employee={{
                      id: employee.id,
                      fullName: employee.full_name,
                      phone: employee.phone,
                      branchId: employee.branch_id,
                      designation: employee.designation,
                    }}
                    branches={branches ?? []}
                  />
                </div>
              ) : null}
            </CardBody>
          </Card>

          {canSeeRoles ? (
            <Card>
              <CardHeader
                title="Roles & permissions"
                description="Access is the union of all assigned roles"
                action={
                  <div className="flex flex-wrap gap-1">
                    {assignedNames.length === 0 ? (
                      <Badge tone="danger">No role assigned</Badge>
                    ) : (
                      assignedNames.map((name) => (
                        <Badge key={name} tone="brand">
                          {name}
                        </Badge>
                      ))
                    )}
                  </div>
                }
              />
              <CardBody>
                {manage ? (
                  <RolesForm
                    employeeId={employee.id}
                    roles={roles ?? []}
                    assignedIds={assignedIds}
                  />
                ) : (
                  <p className="text-sm text-slate-500">
                    Only administrators with permission to manage employees can change
                    role assignments.
                  </p>
                )}
              </CardBody>
            </Card>
          ) : null}

          {canSeeAudit ? (
            <Card>
              <CardHeader title="Record history" description="Audited changes to this employee record" />
              <CardBody className="p-0">
                {(auditRows ?? []).length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No changes recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(auditRows as Array<{ id: number; action: string; created_at: string }>).map(
                      (row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between px-5 py-3 text-sm"
                        >
                          <span className="text-slate-700">{titleCase(row.action)}</span>
                          <time className="text-[11px] text-slate-400" dateTime={row.created_at}>
                            {formatDateTime(row.created_at)}
                          </time>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {manage ? (
            <Card>
              <CardHeader title="Security" description="Password and access controls" />
              <CardBody className="space-y-4">
                <ResetPasswordForm employeeId={employee.id} />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Suspending or terminating an employee blocks sign-in and immediately
                  revokes every registered offline device.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Offline devices"
              description="Only authorised devices may operate offline"
            />
            <CardBody className="p-0">
              {!canSeeDevices ? (
                <p className="px-5 py-5 text-sm text-slate-500">
                  Your role cannot view device records.
                </p>
              ) : (devices ?? []).length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">
                  <MonitorSmartphone className="mb-2 h-5 w-5 text-slate-300" aria-hidden />
                  No devices registered. Device provisioning arrives with the offline POS
                  module.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(devices as DeviceRow[]).map((device) => (
                    <li key={device.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">
                            {device.device_name}
                          </p>
                          <p className="truncate font-mono text-[10px] text-slate-400">
                            {device.device_fingerprint.slice(0, 20)}…
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Registered {formatDate(device.registered_at)} · Last seen{" "}
                            {formatRelative(device.last_seen_at)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge status={device.status} />
                          {manage && device.status === "active" ? (
                            <form action={revokeDevice}>
                              <input type="hidden" name="deviceId" value={device.id} />
                              <input type="hidden" name="employeeId" value={employee.id} />
                              <SubmitButton variant="ghost" size="sm" pendingLabel="Revoking…">
                                Revoke
                              </SubmitButton>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sign-in history" />
            <CardBody className="p-0">
              {(logins ?? []).length === 0 ? (
                <p className="px-5 py-5 text-sm text-slate-500">No sign-in events recorded.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(logins as Array<{ id: number; event: string; ip: string | null; user_agent: string | null; created_at: string }>).map(
                    (event) => (
                      <li key={event.id} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            tone={
                              event.event === "login"
                                ? "success"
                                : event.event === "failed_login"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {titleCase(event.event)}
                          </Badge>
                          <time className="text-[11px] text-slate-400" dateTime={event.created_at}>
                            {formatDateTime(event.created_at)}
                          </time>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-slate-500">
                          {event.ip ? `${event.ip} · ` : ""}
                          {event.user_agent ?? "Unknown device"}
                        </p>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </CardBody>
          </Card>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-[13px] leading-relaxed text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              Accountability
            </p>
            <p className="mt-1.5">
              Every future sale, stock movement and financial record will identify this
              employee. Terminating an account preserves those historical records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type DeviceRow = {
  id: string;
  device_name: string;
  device_fingerprint: string;
  platform: string | null;
  app_version: string | null;
  status: string;
  registered_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};
