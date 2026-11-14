import Link from "next/link";
import { Building2, Plus, ShieldCheck, Users } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type DirectoryRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  country: string;
  license_reference: string | null;
  licensed_until: string | null;
  created_at: string;
  employee_count: number;
  branch_count: number;
  admin_name: string | null;
  admin_email: string | null;
};

export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("platform_business_directory");
  const businesses = (Array.isArray(data) ? data : []) as DirectoryRow[];

  const active = businesses.filter((business) => business.status === "active").length;
  const suspended = businesses.filter((business) => business.status === "suspended").length;
  const employees = businesses.reduce(
    (total, business) => total + Number(business.employee_count ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {params.error === "invalid" ? (
        <Alert variant="error">The requested operation was invalid.</Alert>
      ) : null}

      <PageHeader
        eyebrow="Platform control"
        title="Businesses"
        description="Register and configure independent business environments. Tenant transaction data stays outside platform access."
        actions={
          <Link href="/platform/businesses/new" className={buttonStyles({ size: "sm" })}>
            <Plus className="h-4 w-4" aria-hidden /> Register business
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Businesses"
          value={businesses.length}
          hint="Independently licensed tenants"
          icon={<Building2 className="h-4.5 w-4.5" aria-hidden />}
        />
        <StatCard
          label="Active"
          value={active}
          hint="Environments currently usable"
          icon={<ShieldCheck className="h-4.5 w-4.5" aria-hidden />}
          tone="emerald"
        />
        <StatCard
          label="Suspended"
          value={suspended}
          hint="Access blocked immediately"
          icon={<ShieldCheck className="h-4.5 w-4.5" aria-hidden />}
          tone="amber"
        />
        <StatCard
          label="Employees"
          value={employees}
          hint="Active across all businesses"
          icon={<Users className="h-4.5 w-4.5" aria-hidden />}
          tone="slate"
        />
      </div>

      {error ? (
        <Alert variant="error" title="Directory unavailable">
          {error.message}
        </Alert>
      ) : null}

      <Card>
        <CardBody className="p-0">
          {businesses.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-900">No businesses yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Register the first business environment. This creates its administrator,
                default branch, roles and permissions in one transaction.
              </p>
              <Link
                href="/platform/businesses/new"
                className={buttonStyles({ size: "sm", className: "mt-4" })}
              >
                <Plus className="h-4 w-4" aria-hidden /> Register business
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Business</th>
                    <th className="px-5 py-3 font-semibold">Administrator</th>
                    <th className="px-5 py-3 font-semibold">People / branches</th>
                    <th className="px-5 py-3 font-semibold">Licence</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {businesses.map((business) => {
                    const expired =
                      business.licensed_until &&
                      new Date(business.licensed_until) < new Date(new Date().toDateString());

                    return (
                      <tr key={business.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/platform/businesses/${business.id}`}
                            className="font-medium text-slate-900 hover:text-brand-700"
                          >
                            {business.name}
                          </Link>
                          <p className="font-mono text-[11px] text-slate-400">{business.slug}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-slate-800">{business.admin_name ?? "—"}</p>
                          <p className="text-[11px] text-slate-500">{business.admin_email ?? ""}</p>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-slate-700">
                          {business.employee_count} / {business.branch_count}
                        </td>
                        <td className="px-5 py-3.5">
                          {business.licensed_until ? (
                            <Badge tone={expired ? "danger" : "success"}>
                              {expired ? "Expired" : "Until"} {formatDate(business.licensed_until)}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Not recorded</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={business.status} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {formatDate(business.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-xs leading-relaxed text-slate-500">
        Licensing dates are recorded for administrative reference only. BUSINESSHUB does
        not bill, renew or restrict access through a subscription system.
      </p>
    </div>
  );
}
