"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";

import { provisionEmployee, type EmployeeState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Role = { id: string; key: string; name: string; description: string | null };

export function NewEmployeeForm({
  branches,
  roles,
  businessName,
}: {
  branches: Array<{ id: string; name: string }>;
  roles: Role[];
  businessName: string;
}) {
  const [state, formAction] = useActionState<EmployeeState, FormData>(
    provisionEmployee,
    undefined,
  );

  if (state?.credentials) {
    const credentials = state.credentials;
    return (
      <div className="space-y-5 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {credentials.fullName} can now sign in
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {credentials.employeeNumber} · {businessName}
            </p>
          </div>
        </div>

        <Alert variant="warning" title="One-time credentials">
          Share these with the employee through a secure channel. The temporary password
          is shown once and must be changed at first sign-in.
        </Alert>

        <dl className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Sign-in email
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-slate-900">{credentials.email}</dd>
            </div>
            <CopyButton value={credentials.email} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Temporary password
              </dt>
              <dd className="mt-0.5 select-all font-mono text-sm text-slate-900">
                {credentials.tempPassword}
              </dd>
            </div>
            <CopyButton value={credentials.tempPassword} />
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/employees/${credentials.employeeId}`}
            className={buttonStyles({ size: "sm" })}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden /> Open employee record
          </Link>
          <Link
            href="/app/employees/new"
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
        <legend className="text-sm font-semibold text-slate-900">Employee details</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" required className="sm:col-span-2">
            <Input id="fullName" name="fullName" maxLength={120} autoComplete="off" required />
          </Field>

          <Field
            label="Work email"
            htmlFor="email"
            hint="This becomes their sign-in identifier."
            required
          >
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={160}
              autoComplete="off"
              required
            />
          </Field>

          <Field label="Phone number" htmlFor="phone" hint="Optional">
            <Input id="phone" name="phone" type="tel" maxLength={30} autoComplete="off" />
          </Field>

          <Field
            label="Employee number"
            htmlFor="employeeNumber"
            hint="Leave blank to generate automatically."
          >
            <Input id="employeeNumber" name="employeeNumber" maxLength={30} autoComplete="off" />
          </Field>

          <Field label="Job designation" htmlFor="designation" hint="Optional">
            <Input
              id="designation"
              name="designation"
              maxLength={80}
              placeholder="Sales Assistant"
              autoComplete="off"
            />
          </Field>

          <Field label="Assigned branch" htmlFor="branchId" className="sm:col-span-2">
            <Select id="branchId" name="branchId" defaultValue="">
              <option value="">No branch (central staff)</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3 border-t border-slate-100 pt-5">
        <legend className="text-sm font-semibold text-slate-900">Roles</legend>
        <p className="-mt-1 text-xs text-slate-500">
          Permissions are the union of the selected roles. You can change these later.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 has-checked:border-brand-300 has-checked:bg-brand-50/50"
            >
              <input
                type="checkbox"
                name="roleIds"
                value={role.id}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="block text-[13px] font-medium text-slate-900">{role.name}</span>
                <span className="block text-[11px] leading-relaxed text-slate-500">
                  {role.description ?? "Custom role"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-500">
          A temporary password is generated and shown once.
        </p>
        <SubmitButton pendingLabel="Creating account…">Register employee</SubmitButton>
      </div>
    </form>
  );
}
