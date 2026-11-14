"use client";

import { useActionState } from "react";

import { createRole, type RoleState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PermissionMatrix } from "../permission-matrix";
import { PERMISSION_CATALOG } from "@/lib/permissions";

export function NewRoleForm() {
  const [state, formAction] = useActionState<RoleState, FormData>(createRole, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role name" htmlFor="name" required>
            <Input id="name" name="name" maxLength={60} placeholder="Store Supervisor" required />
          </Field>
          <Field
            label="Description"
            htmlFor="description"
            hint="Shown to administrators when assigning roles."
          >
            <Input id="description" name="description" maxLength={300} />
          </Field>
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Permissions</h2>
        <p className="mb-3 text-xs text-slate-500">
          Select the modules and actions this role may use. Start from scratch or grant
          whole modules.
        </p>
        <PermissionMatrix catalog={PERMISSION_CATALOG} initial={[]} />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <p className="mr-auto text-xs text-slate-500">
          You can fine-tune permissions at any time.
        </p>
        <SubmitButton pendingLabel="Creating role…">Create role</SubmitButton>
      </div>
    </form>
  );
}
