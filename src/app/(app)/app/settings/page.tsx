import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ProfileForm } from "./profile-form";
import { OperationalForm } from "./operational-form";

type BusinessRecord = {
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
  logo_url: string | null;
  status: string;
  license_reference: string | null;
  licensed_until: string | null;
  expense_approval_threshold: number;
  offline_session_hours: number;
  created_at: string;
};

export default async function SettingsPage() {
  const session = await requirePermission("business.settings");
  const supabase = await createClient();

  const { data } = await supabase
    .from("businesses")
    .select(
      "id, name, slug, legal_name, email, phone, address, city, state, country, currency, timezone, logo_url, status, license_reference, licensed_until, expense_approval_threshold, offline_session_hours, created_at",
    )
    .eq("id", session.business.id)
    .maybeSingle();

  const business = data as BusinessRecord | null;
  if (!business) {
    return (
      <Alert variant="error" title="Business profile unavailable">
        The business record could not be loaded. Try signing in again.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Business settings"
        description="Control how your workspace is identified and how strictly it operates."
        actions={
          <Link href="/app/employees" className={buttonStyles({ variant: "outline", size: "sm" })}>
            Manage employees
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Business profile" description="Shown on records and receipts" />
            <CardBody>
              <ProfileForm
                business={{
                  name: business.name,
                  legalName: business.legal_name,
                  email: business.email,
                  phone: business.phone,
                  address: business.address,
                  city: business.city,
                  state: business.state,
                  country: business.country,
                  timezone: business.timezone,
                  logoUrl: business.logo_url,
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Operational policy"
              description="Approval limits and offline behaviour"
            />
            <CardBody>
              <OperationalForm
                business={{
                  currency: business.currency,
                  expenseApprovalThreshold: business.expense_approval_threshold,
                  offlineSessionHours: business.offline_session_hours,
                }}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Workspace identity" />
            <CardBody className="space-y-3 text-sm">
              <Row label="Workspace slug" value={<span className="font-mono text-xs">{business.slug}</span>} />
              <Row label="Status" value={<Badge tone={business.status === "active" ? "success" : "danger"}>{business.status}</Badge>} />
              <Row label="Created" value={formatDate(business.created_at)} />
              <Row label="Business ID" value={<span className="font-mono text-[11px]">{business.id.slice(0, 8)}…</span>} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Licence record" description="Read-only — managed by the platform" />
            <CardBody className="space-y-3 text-sm">
              <Row
                label="Reference"
                value={business.license_reference ?? "Not recorded"}
              />
              <Row
                label="Licensed until"
                value={business.licensed_until ? formatDate(business.licensed_until) : "Not recorded"}
              />
              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] leading-relaxed text-slate-500">
                BUSINESSHUB does not bill, renew or restrict features by subscription. Licence
                details are recorded for administrative reference by the platform.
              </p>
            </CardBody>
          </Card>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-[13px] leading-relaxed text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              Protected fields
            </p>
            <p className="mt-1.5">
              Activation status and licence terms can only be changed by the BUSINESSHUB
              platform administrator. Every change here is written to the audit trail.
            </p>
          </div>

          <p className="flex items-start gap-2 text-[11px] text-slate-400">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Changes apply immediately for every employee in this business.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
