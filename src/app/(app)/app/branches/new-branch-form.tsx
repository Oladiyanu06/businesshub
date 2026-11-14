"use client";

import { useActionState } from "react";

import { createBranch, type BranchState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function NewBranchForm() {
  const [state, formAction] = useActionState<BranchState, FormData>(createBranch, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch name" htmlFor="branch-name" required>
          <Input id="branch-name" name="name" maxLength={120} placeholder="Ikeja Branch" required />
        </Field>
        <Field
          label="Branch code"
          htmlFor="branch-code"
          hint="Optional. Generated from the name if left blank."
        >
          <Input
            id="branch-code"
            name="code"
            maxLength={16}
            placeholder="IKEJA"
            className="uppercase"
          />
        </Field>
        <Field label="Address" htmlFor="branch-address" className="sm:col-span-2">
          <Input id="branch-address" name="address" maxLength={200} />
        </Field>
        <Field label="Phone" htmlFor="branch-phone">
          <Input id="branch-phone" name="phone" type="tel" maxLength={30} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-slate-700">
        <input
          type="checkbox"
          name="isDefault"
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Make this the default branch
      </label>

      <SubmitButton size="sm" pendingLabel="Creating…">
        Add branch
      </SubmitButton>
    </form>
  );
}
