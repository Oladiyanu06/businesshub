"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";

import { provisionBusiness, type ProvisionState } from "@/app/(platform)/platform/actions";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProvisionBusinessForm() {
  const [state, formAction] = useActionState<ProvisionState, FormData>(
    provisionBusiness,
    undefined,
  );

  if (state?.result) {
    const result = state.result;
    return (
      <div className="space-y-5 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {result.businessName} is provisioned
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Workspace slug: <span className="font-mono">{result.slug}</span>
            </p>
          </div>
        </div>

        <Alert variant="warning" title="Deliver these credentials securely — shown once">
          The temporary password cannot be retrieved again. The administrator must change
          it at first sign-in.
        </Alert>

        <dl className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Administrator email
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-slate-900">{result.adminEmail}</dd>
            </div>
            <CopyButton value={result.adminEmail} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Temporary password
              </dt>
              <dd className="mt-0.5 select-all font-mono text-sm text-slate-900">
                {result.tempPassword}
              </dd>
            </div>
            <CopyButton value={result.tempPassword} />
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/platform/businesses/${result.businessId}`}
            className={buttonStyles({ size: "sm" })}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden /> Open business
          </Link>
          <Link
            href="/platform/businesses/new"
            className={buttonStyles({ variant: "outline", size: "sm" })}
          >
            Register another
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">Business</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="name" required className="sm:col-span-2">
            <Input
              id="name"
              name="name"
              placeholder="Adeyemi Stores Ltd"
              maxLength={120}
              required
            />
          </Field>

          <Field
            label="Workspace slug"
            htmlFor="slug"
            hint="Optional. Derived from the name; lowercase letters, numbers and hyphens."
          >
            <Input id="slug" name="slug" placeholder="adeyemi-stores" maxLength={60} />
          </Field>

          <Field label="Country" htmlFor="country" required>
            <Input id="country" name="country" defaultValue="Nigeria" maxLength={80} required />
          </Field>

          <Field label="Currency" htmlFor="currency" required>
            <Select id="currency" name="currency" defaultValue="NGN">
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — Pound Sterling</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GHS">GHS — Ghanaian Cedi</option>
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="ZAR">ZAR — South African Rand</option>
            </Select>
          </Field>

          <Field label="Timezone" htmlFor="timezone" required>
            <Input
              id="timezone"
              name="timezone"
              defaultValue="Africa/Lagos"
              maxLength={80}
              required
            />
          </Field>

          <Field label="Default branch name" htmlFor="branchName" required>
            <Input
              id="branchName"
              name="branchName"
              defaultValue="Head Office"
              maxLength={120}
              required
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-100 pt-5">
        <legend className="text-sm font-semibold text-slate-900">
          Business administrator
        </legend>
        <p className="-mt-2 text-xs text-slate-500">
          This person will control the business environment and can register employees.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="adminFullName" required className="sm:col-span-2">
            <Input
              id="adminFullName"
              name="adminFullName"
              placeholder="Ada Okafor"
              maxLength={120}
              autoComplete="off"
              required
            />
          </Field>

          <Field label="Email address" htmlFor="adminEmail" required>
            <Input
              id="adminEmail"
              name="adminEmail"
              type="email"
              placeholder="ada@business.com"
              autoComplete="off"
              required
            />
          </Field>

          <Field label="Phone number" htmlFor="adminPhone" hint="Optional">
            <Input
              id="adminPhone"
              name="adminPhone"
              type="tel"
              placeholder="+234 800 000 0000"
              maxLength={30}
              autoComplete="off"
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-500">
          A temporary password is generated and shown once after submission.
        </p>
        <SubmitButton pendingLabel="Provisioning…">Register business</SubmitButton>
      </div>
    </form>
  );
}
