"use client";

import { useActionState } from "react";

import { updateBranch, type BranchState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function EditBranchForm({
  branch,
}: {
  branch: { id: string; name: string; address: string | null; phone: string | null };
}) {
  const [state, formAction] = useActionState<BranchState, FormData>(updateBranch, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="branchId" value={branch.id} />
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" htmlFor={`name-${branch.id}`} required>
          <Input
            id={`name-${branch.id}`}
            name="name"
            defaultValue={branch.name}
            maxLength={120}
            required
          />
        </Field>
        <Field label="Address" htmlFor={`address-${branch.id}`}>
          <Input
            id={`address-${branch.id}`}
            name="address"
            defaultValue={branch.address ?? ""}
            maxLength={200}
          />
        </Field>
        <Field label="Phone" htmlFor={`phone-${branch.id}`}>
          <Input
            id={`phone-${branch.id}`}
            name="phone"
            type="tel"
            defaultValue={branch.phone ?? ""}
            maxLength={30}
          />
        </Field>
      </div>

      <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">
        Save branch
      </SubmitButton>
    </form>
  );
}
