import { GitBranch, Star } from "lucide-react";

import { setBranchStatus, setDefaultBranch } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { NewBranchForm } from "./new-branch-form";
import { EditBranchForm } from "./edit-branch-form";

type BranchRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  is_default: boolean;
  status: "active" | "inactive";
  created_at: string;
};

export default async function BranchesPage() {
  const session = await requirePermission("branch.view");
  const supabase = await createClient();
  const manage = can(session.permissions, "branch.manage");

  const { data } = await supabase
    .from("branches")
    .select("id, name, code, address, phone, is_default, status, created_at")
    .eq("business_id", session.business.id)
    .order("is_default", { ascending: false })
    .order("name");

  const branches = (data ?? []) as BranchRow[];

  const { data: employeeRows } = await supabase
    .from("employees")
    .select("branch_id, status")
    .eq("business_id", session.business.id);

  const staffCount = new Map<string, number>();
  for (const row of employeeRows ?? []) {
    if (row.branch_id && row.status === "active") {
      staffCount.set(row.branch_id, (staffCount.get(row.branch_id) ?? 0) + 1);
    }
  }

  const activeCount = branches.filter((branch) => branch.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Branches"
        description={`${branches.length} ${branches.length === 1 ? "location" : "locations"} · ${activeCount} active. Each branch maintains its own inventory once the stock modules roll out.`}
      />

      {!manage ? (
        <Alert variant="info">
          You can review branches, but changing them requires the branch management
          permission.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Locations" description="Ordered by default branch first" />
          <CardBody className="p-0">
            {branches.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<GitBranch className="h-6 w-6" aria-hidden />}
                  title="No branches yet"
                  description="Add a branch to organise staff, stock and daily reporting by location."
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {branches.map((branch) => (
                  <li key={branch.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                          <Badge tone="neutral">{branch.code}</Badge>
                          {branch.is_default ? (
                            <Badge tone="brand">
                              <Star className="h-3 w-3" aria-hidden /> Default
                            </Badge>
                          ) : null}
                          <StatusBadge status={branch.status} />
                        </div>
                        <p className="mt-1 text-[12px] text-slate-500">
                          {branch.address || "No address recorded"}
                          {branch.phone ? ` · ${branch.phone}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {staffCount.get(branch.id) ?? 0} active staff · added{" "}
                          {formatDate(branch.created_at)}
                        </p>
                      </div>

                      {manage ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {!branch.is_default ? (
                            <form action={setDefaultBranch}>
                              <input type="hidden" name="branchId" value={branch.id} />
                              <SubmitButton variant="ghost" size="sm" pendingLabel="Setting…">
                                Make default
                              </SubmitButton>
                            </form>
                          ) : null}
                          <form action={setBranchStatus}>
                            <input type="hidden" name="branchId" value={branch.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={branch.status === "active" ? "inactive" : "active"}
                            />
                            <SubmitButton
                              variant="outline"
                              size="sm"
                              pendingLabel="Updating…"
                            >
                              {branch.status === "active" ? "Deactivate" : "Activate"}
                            </SubmitButton>
                          </form>
                        </div>
                      ) : null}
                    </div>

                    {manage ? (
                      <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                        <summary className="cursor-pointer text-[12px] font-medium text-slate-600">
                          Edit details
                        </summary>
                        <div className="pt-3">
                          <EditBranchForm
                            branch={{
                              id: branch.id,
                              name: branch.name,
                              address: branch.address,
                              phone: branch.phone,
                            }}
                          />
                        </div>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {manage ? (
          <Card>
            <CardHeader title="Add a branch" description="New locations start active" />
            <CardBody>
              <NewBranchForm />
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
