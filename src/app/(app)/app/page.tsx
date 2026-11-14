import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  GitBranch,
  MonitorSmartphone,
  ScrollText,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Alert } from "@/components/ui/alert";
import { can } from "@/lib/permissions";
import { requireBusiness } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatRelative, titleCase } from "@/lib/utils";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; permission?: string }>;
}) {
  const params = await searchParams;
  const session = await requireBusiness();
  const supabase = await createClient();
  const permissions = session.permissions;

  let branchName = "No branch assigned";
  if (session.employee.branchId) {
    const { data } = await supabase
      .from("branches")
      .select("name")
      .eq("id", session.employee.branchId)
      .maybeSingle();
    branchName = data?.name ?? branchName;
  }

  let employeeCount: number | null = null;
  if (can(permissions, "employee.view")) {
    const { count } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    employeeCount = count ?? 0;
  }

  let branchCount: number | null = null;
  if (can(permissions, "branch.view")) {
    const { count } = await supabase
      .from("branches")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    branchCount = count ?? 0;
  }

  let roleCount: number | null = null;
  if (can(permissions, "role.view")) {
    const { count } = await supabase
      .from("roles")
      .select("id", { count: "exact", head: true });
    roleCount = count ?? 0;
  }

  let deviceCount: number | null = null;
  if (can(permissions, "device.view")) {
    const { count } = await supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    deviceCount = count ?? 0;
  }

  const { data: profile } = await supabase
    .from("businesses")
    .select("email, phone, address, logo_url")
    .eq("id", session.business.id)
    .maybeSingle();

  type AuditRow = {
    id: number;
    action: string;
    entity_type: string;
    entity_id: string | null;
    actor_employee_id: string | null;
    created_at: string;
  };

  let recentAudit: AuditRow[] = [];
  const actorNames = new Map<string, string>();

  if (can(permissions, "audit.view")) {
    const { data } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, actor_employee_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    recentAudit = (data ?? []) as AuditRow[];

    const actorIds = Array.from(
      new Set(recentAudit.map((row) => row.actor_employee_id).filter(Boolean)),
    ) as string[];

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from("employees")
        .select("id, full_name")
        .in("id", actorIds);
      for (const actor of actors ?? []) {
        actorNames.set(actor.id, actor.full_name);
      }
    }
  }

  const approvalThreshold = session.business.expenseApprovalThreshold;

  const checklist = [
    {
      label: "Business profile",
      complete: Boolean(profile?.email && profile?.phone),
      href: can(permissions, "business.settings") ? "/app/settings" : undefined,
    },
    {
      label: "At least one branch",
      complete: (branchCount ?? 0) > 0,
      href: can(permissions, "branch.manage") ? "/app/branches" : undefined,
    },
    {
      label: "Team registered",
      complete: (employeeCount ?? 0) > 1,
      href: can(permissions, "employee.manage") ? "/app/employees/new" : undefined,
    },
    {
      label: "Roles configured",
      complete: (roleCount ?? 0) > 0,
      href: can(permissions, "role.view") ? "/app/roles" : undefined,
    },
    {
      label: "Offline device registered",
      complete: (deviceCount ?? 0) > 0,
      href: can(permissions, "device.view") ? "/app/devices" : undefined,
    },
  ].filter((item) => item.complete !== undefined);

  const completed = checklist.filter((item) => item.complete).length;

  return (
    <div className="space-y-6">
      {params.error === "forbidden" ? (
        <Alert variant="error" title="Permission required">
          Your role does not include{" "}
          <code className="rounded bg-red-100 px-1 py-0.5 text-[11px]">
            {params.permission ?? "access to this module"}
          </code>
          . Ask your business administrator to review your role.
        </Alert>
      ) : null}

      <PageHeader
        eyebrow={session.business.name}
        title={`Welcome, ${session.employee.fullName.split(" ")[0]}`}
        description={`${branchName} · ${session.roles.map((role) => role.name).join(" · ") || "Employee"} · Employee ${session.employee.employeeNumber}`}
        actions={
          can(permissions, "employee.manage") ? (
            <Link href="/app/employees/new" className={buttonStyles({ size: "sm" })}>
              <UserPlus className="h-4 w-4" aria-hidden /> Register employee
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {employeeCount !== null ? (
          <StatCard
            label="Active employees"
            value={employeeCount}
            hint="Authorised people in this business"
            icon={<Users className="h-4.5 w-4.5" aria-hidden />}
          />
        ) : null}
        {branchCount !== null ? (
          <StatCard
            label="Active branches"
            value={branchCount}
            hint="Locations operating under this business"
            icon={<GitBranch className="h-4.5 w-4.5" aria-hidden />}
            tone="emerald"
          />
        ) : null}
        {roleCount !== null ? (
          <StatCard
            label="Roles defined"
            value={roleCount}
            hint="System and custom access profiles"
            icon={<ShieldCheck className="h-4.5 w-4.5" aria-hidden />}
            tone="slate"
          />
        ) : null}
        {deviceCount !== null ? (
          <StatCard
            label="Registered devices"
            value={deviceCount}
            hint="Devices eligible for offline mode"
            icon={<MonitorSmartphone className="h-4.5 w-4.5" aria-hidden />}
            tone="amber"
          />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Workspace readiness"
            description={`${completed} of ${checklist.length} foundational controls in place`}
            action={
              <Badge tone={completed === checklist.length ? "success" : "warning"}>
                {completed === checklist.length ? "Ready" : "Setup in progress"}
              </Badge>
            }
          />
          <CardBody className="space-y-1">
            {checklist.map((item) => {
              const content = (
                <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                  {item.complete ? (
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="h-4.5 w-4.5 shrink-0 text-slate-300" aria-hidden />
                  )}
                  <span
                    className={
                      item.complete ? "text-sm text-slate-500" : "text-sm font-medium text-slate-800"
                    }
                  >
                    {item.label}
                  </span>
                  {!item.complete && item.href ? (
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
                  ) : null}
                </div>
              );

              return item.href ? (
                <Link key={item.label} href={item.href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={item.label}>{content}</div>
              );
            })}

            {completed < checklist.length ? (
              <p className="px-2 pt-2 text-xs leading-relaxed text-slate-500">
                Complete these controls before onboarding the wider team. Offline devices
                are provisioned in Phase 3 of the rollout and are listed here for readiness.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Your access" description="Effective for this session" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Employee number</span>
                <span className="font-mono text-xs font-medium text-slate-800">
                  {session.employee.employeeNumber}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Branch</span>
                <span className="font-medium text-slate-800">{branchName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Last sign-in</span>
                <span className="font-medium text-slate-800">
                  {formatRelative(session.employee.lastLoginAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Permissions</span>
                <span className="font-medium text-slate-800">{permissions.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                {session.roles.map((role) => (
                  <Badge key={role.id} tone="brand">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Controls in force" />
            <CardBody className="space-y-2.5 text-[13px] text-slate-600">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                Row-level isolation binds every record to{" "}
                <span className="font-medium">{session.business.name}</span>.
              </p>
              <p className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                Expense approval threshold:{" "}
                <span className="font-medium">
                  {approvalThreshold > 0
                    ? `${session.business.currency} ${approvalThreshold.toLocaleString()}`
                    : "not configured"}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                Offline session expiry: {session.business.offlineSessionHours} hours.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {can(permissions, "audit.view") ? (
        <Card>
          <CardHeader
            title="Recent activity"
            description="Append-only record of important changes"
            action={
              <Link
                href="/app/audit"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                View audit trail <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <CardBody className="p-0">
            {recentAudit.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                <ScrollText className="mx-auto mb-2 h-5 w-5 text-slate-300" aria-hidden />
                No audited activity yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentAudit.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <ScrollText className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-slate-800">
                        {titleCase(row.action)} · {titleCase(row.entity_type)}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {row.actor_employee_id
                          ? (actorNames.get(row.actor_employee_id) ?? "Employee")
                          : "System"}
                        {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ""}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-[11px] text-slate-400"
                      dateTime={row.created_at}
                      title={formatDateTime(row.created_at)}
                    >
                      {formatRelative(row.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
