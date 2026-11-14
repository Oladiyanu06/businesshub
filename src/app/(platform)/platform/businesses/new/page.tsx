import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { ProvisionBusinessForm } from "./provision-business-form";

export default async function NewBusinessPage() {
  await requirePlatformAdmin();

  return (
    <div className="space-y-6">
      <Link
        href="/platform"
        className={buttonStyles({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Businesses
      </Link>

      <PageHeader
        eyebrow="Platform control"
        title="Register a business"
        description="Creates an isolated workspace: business profile, default branch, administrator, six default roles and the full permission catalogue."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ProvisionBusinessForm />

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              What happens on submit
            </h2>
            <ol className="mt-3 space-y-2.5 text-[13px] text-slate-600">
              {[
                "A Supabase Auth account is created for the administrator with a temporary password.",
                "The business, default branch, roles and permissions are created in one database transaction.",
                "The administrator is linked to the business and assigned the Business Administrator role.",
                "A platform audit entry is written without copying any tenant transaction data.",
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-[13px] text-amber-800">
            <p className="font-semibold">One-time credentials</p>
            <p className="mt-1 leading-relaxed">
              The temporary password is shown once, immediately after provisioning. It is
              hashed by Supabase Auth and never stored in readable form. Deliver it to the
              administrator through a secure channel.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-[13px] text-slate-600">
            <p className="font-semibold text-slate-900">Commercial licensing</p>
            <p className="mt-1 leading-relaxed">
              No subscription, renewal or automated billing is created. Record licence
              details afterwards on the business page if your agreement requires them.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
