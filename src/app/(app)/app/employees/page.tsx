import Link from "next/link";
import {
  ChevronRight,
  Filter,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatRelative, initials } from "@/lib/utils";

const PAGE_SIZE = 20;

type EmployeeRow = {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  branch_id: string | null;
  designation: string | null;
  status: string;
  must_change_password: boolean;
  last_login_at: string | null;
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branch?: string;
    page?: string;
  }>;
}) {
  const session = await requirePermission("employee.view");
  const params = await searchParams;
  const supabase = await createClient();

  const q = (params.q ?? "").trim().slice(0, 80);
  const status = ["active", "suspended", "terminated"].includes(params.status ?? "")
    ? (params.status as string)
    : "";
  const branch = params.branch ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const safeSearch = q.replace(/[^a-zA-Z0-9 @._+-]/g, "");

  let query = supabase
    .from("employees")
    .select(
      "id, employee_number, full_name, email, phone, branch_id, designation, status, must_change_password, last_login_at",
      { count: "exact" },
    )
    .eq("business_id", session.business.id)
    .order("full_name", { ascending: true });

  if (safeSearch) {
    query = query.or(
      `full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,employee_number.ilike.%${safeSearch}%`,
    );
  }
  if (status) query = query.eq("status", status);
  if (branch) query = query.eq("branch_id", branch);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);

  const employees = (data ?? []) as EmployeeRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const employeeIds = employees.map((employee) => employee.id);
  const roleMap = new Map<string, string[]>();

  if (employeeIds.length > 0 && can(session.permissions, "role.view")) {
    const { data: assignments } = await supabase
      .from("employee_roles")
      .select("employee_id, role_id")
      .eq("business_id", session.business.id)
      .in("employee_id", employeeIds);

    const roleIds = Array.from(new Set((assignments ?? []).map((row) => row.role_id)));
    if (roleIds.length > 0) {
      const { data: roles } = await supabase
        .from("roles")
        .select("id, name")
        .eq("business_id", session.business.id)
        .in("id", roleIds);
      const roleNames = new Map((roles ?? []).map((role) => [role.id, role.name]));

      for (const assignment of assignments ?? []) {
        const names = roleMap.get(assignment.employee_id) ?? [];
        const name = roleNames.get(assignment.role_id);
        if (name) names.push(name);
        roleMap.set(assignment.employee_id, names);
      }
    }
  }

  let branches: Array<{ id: string; name: string }> = [];
  if (can(session.permissions, "branch.view")) {
    const { data: branchData } = await supabase
      .from("branches")
      .select("id, name")
      .eq("business_id", session.business.id)
      .order("name");
    branches = branchData ?? [];
  }

  const branchNames = new Map(branches.map((item) => [item.id, item.name]));

  const makePageHref = (target: number) => {
    const queryString = new URLSearchParams();
    if (q) queryString.set("q", q);
    if (status) queryString.set("status", status);
    if (branch) queryString.set("branch", branch);
    if (target > 1) queryString.set("page", String(target));
    const value = queryString.toString();
    return value ? `/app/employees?${value}` : "/app/employees";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People & access"
        title="Employees"
        description={`${total} ${total === 1 ? "employee" : "employees"} matching the current view.`}
        actions={
          can(session.permissions, "employee.manage") ? (
            <Link href="/app/employees/new" className={buttonStyles({ size: "sm" })}>
              <UserPlus className="h-4 w-4" aria-hidden /> Register employee
            </Link>
          ) : null
        }
      />

      <Card>
        <CardBody className="border-b border-slate-100 py-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
                Search
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="Name, email or employee number"
                  className="pl-9"
                />
              </div>
            </div>

            <div  className="w-40">
              <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </Select>
            </div>

            {branches.length > 0 ? (
              <div className="w-48">
                <label htmlFor="branch" className="mb-1 block text-xs font-medium text-slate-600">
                  Branch
                </label>
                <Select id="branch" name="branch" defaultValue={branch}>
                  <option value="">All branches</option>
                  {branches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <button type="submit" className={buttonStyles({ variant: "outline", size: "md" })}>
              <Filter className="h-4 w-4" aria-hidden /> Apply
            </button>
            {q || status || branch ? (
              <Link
                href="/app/employees"
                className={buttonStyles({ variant: "ghost", size: "md" })}
              >
                Clear
              </Link>
            ) : null}
          </form>
        </CardBody>

        <CardBody className="p-0">
          {error ? (
            <div className="px-5 py-8 text-sm text-red-600">
              The employee directory could not be loaded.
            </div>
          ) : employees.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Users className="h-6 w-6" aria-hidden />}
                title={q || status || branch ? "No employees match" : "No employees yet"}
                description={
                  q || status || branch
                    ? "Adjust the filters or search term."
                    : "Register your first employee to give them controlled access to the business."
                }
                action={
                  can(session.permissions, "employee.manage") && !q ? (
                    <Link href="/app/employees/new" className={buttonStyles({ size: "sm" })}>
                      Register employee
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Employee</th>
                    <th className="px-5 py-3 font-semibold">Number</th>
                    <th className="px-5 py-3 font-semibold">Branch</th>
                    <th className="px-5 py-3 font-semibold">Roles</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Last sign-in</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((employee) => {
                    const names = roleMap.get(employee.id) ?? [];
                    return (
                      <tr key={employee.id} className="group hover:bg-slate-50/60">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                              {initials(employee.full_name)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={`/app/employees/${employee.id}`}
                                className="block truncate font-medium text-slate-900 hover:text-brand-700"
                              >
                                {employee.full_name}
                              </Link>
                              <p className="truncate text-[11px] text-slate-500">
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {employee.employee_number}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {employee.branch_id
                            ? (branchNames.get(employee.branch_id) ?? "—")
                            : "Unassigned"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {names.length > 0 ? (
                              names.slice(0, 2).map((name) => (
                                <Badge key={name} tone="brand">
                                  {name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">No role</span>
                            )}
                            {names.length > 2 ? (
                              <Badge tone="neutral">+{names.length - 2}</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge status={employee.status} />
                            {employee.must_change_password ? (
                              <span className="text-[10px] font-medium text-amber-600">
                                Password change pending
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {formatRelative(employee.last_login_at)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/app/employees/${employee.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
                          >
                            View <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>

        {totalPages > 1 ? (
          <CardBody className="flex items-center justify-between border-t border-slate-100 py-3 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={makePageHref(page - 1)} className={buttonStyles({ variant: "outline", size: "sm" })}>
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link href={makePageHref(page + 1)} className={buttonStyles({ variant: "outline", size: "sm" })}>
                  Next
                </Link>
              ) : null}
            </div>
          </CardBody>
        ) : null}
      </Card>
    </div>
  );
}
