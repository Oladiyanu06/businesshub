import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  GitBranch,
  ShieldCheck,
  Users,
} from "lucide-react";

import { updateBusinessStatus } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/utils";
import { LicensingForm } from "./licensing-form";

type BusinessDetail = {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  currency: string;
  timezone: string;
  status: "active" | "suspended" | "archived";
  license_reference: string | null;
  licensed_until: string | null;
  license_notes: string | null;
  created_at: string;
  employee_count: number;
  branch_count: number;
  administrators: Array<{
    employee_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    status: string;
  }>;
};

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("platform_business_detail", {
    p_business_id: id,
  });

  if (error || !data) notFound();
  const business = data as BusinessDetail;

  return (
    <div className="space-y-6">
      <Link
        href="/platform"
        className={buttonStyles({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Businesses
      </Link>

      {query.notice === "status" ? (
        <Alert variant="success">Business status updated. Access rules take effect immediately.</Alert>
      ) : null}
      {query.error === "status" ? (
        <Alert variant="error">The status could not be updated.</Alert>
      ) : null}

      <PageHeader
        eyebrow={business.slug}
        title={business.name}
        description={`Registered ${formatDate(business.created_at)} · ${business.country} · ${business.currency}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={business.status} />
            <form action={updateBusinessStatus}>
              <input type="hidden" name="businessId" value={business.id} />
              <input
                type="hidden"
                name="status"
                value={business.status === "active" ? "suspended" : "active"}
              />
              <SubmitButton
                variant={business.status === "active" ? "danger" : "primary"}
                size="sm"
                pendingLabel="Updating…"
              >
                {business.status === "active" ? "Suspend access" : "Activate"}
              </SubmitButton>
            </form>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active employees"
          value={business.employee_count}
          icon={<Users className="h-4.5 w-4.5" aria-hidden />}
        />
        <StatCard
          label="Active branches"
          value={business.branch_count}
          icon={<GitBranch className="h-4.5 w-4.5" aria-hidden />}
          tone="emerald"
        />
        <StatCard
          label="Licensed until"
          value={business.licensed_until ? formatDate(business.licensed_until) : "—"}
          hint="Reference only; no billing in-app"
          icon={<CalendarDays className="h-4.5 w-4.5" aria-hidden />}
          tone="slate"
        />
        <StatCard
          label="Environment"
          value={<StatusBadge status={business.status} />}
          hint="Suspension blocks all tenant access"
          icon={<ShieldCheck className="h-4.5 w-4.5" aria-hidden />}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Business account" description="Profile visible to the tenant" />
            <CardBody className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              {[
                ["Legal name", business.legal_name],
                ["Contact email", business.email],
                ["Phone", business.phone],
                ["Address", business.address],
                ["City / state", [business.city, business.state].filter(Boolean).join(", ")],
                ["Country", business.country],
                ["Timezone", business.timezone],
                ["Currency", business.currency],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-0.5 text-slate-800">{value || "—"}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Administrators"
              description="Tenant account owners; platform has no access to their transaction records"
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Name</th>
                      <th className="px-5 py-2.5 font-semibold">Email</th>
                      <th className="px-5 py-2.5 font-semibold">Phone</th>
                      <th className="px-5 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {business.administrators.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                          No administrator is currently assigned.
                        </td>
                      </tr>
                    ) : (
                      business.administrators.map((admin) => (
                        <tr key={admin.employee_id}>
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {admin.full_name}
                          </td>
                          <td className="px-5 py-3 text-slate-600">{admin.email}</td>
                          <td className="px-5 py-3 text-slate-600">{admin.phone ?? "—"}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={admin.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-[13px] leading-relaxed text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <Building2 className="h-4 w-4" aria-hidden /> Data boundary
            </p>
            <p className="mt-1.5">
              Sales, receipts, customers, inventory, expenses and employee records are
              protected by tenant row-level security. Platform access to this page is
              limited to account and licensing information. Any exceptional access to
              tenant data requires a documented, time-boxed authorisation.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Licence record"
              description="Commercial terms managed outside the software"
            />
            <CardBody>
              <LicensingForm
                businessId={business.id}
                licenseReference={business.license_reference}
                licensedUntil={business.licensed_until}
                licenseNotes={business.license_notes}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Danger zone" />
            <CardBody className="space-y-3 text-[13px] text-slate-600">
              <p>
                Suspending a business immediately blocks every employee through row-level
                security and marks its environment inactive. Sign-in sessions cannot access
                tenant records.
              </p>
              <form action={updateBusinessStatus} className="flex flex-wrap gap-2">
                <input type="hidden" name="businessId" value={business.id} />
                <input
                  type="hidden"
                  name="status"
                  value={business.status === "archived" ? "active" : "archived"}
                />
                <SubmitButton variant="outline" size="sm" pendingLabel="Updating…">
                  {business.status === "archived" ? "Restore from archive" : "Archive business"}
                </SubmitButton>
              </form>
              <p className="text-xs text-slate-500">
                Archiving is not deletion. Tenant records stay intact so they can be
                restored or exported under the licence agreement.
              </p>
            </CardBody>
          </Card>

          <p className="text-[11px] text-slate-400">
            Business ID: <span className="font-mono">{business.id}</span>
            <br />
            Registered: {formatDateTime(business.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
