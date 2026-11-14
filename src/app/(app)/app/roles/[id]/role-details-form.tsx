"use client";

import { useActionState } from "react";

import { updateRoleDetails, type RoleState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function RoleDetailsForm({
  roleId,
  name,
  description,
  isSystem,
}: {
  roleId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}) {
  const [state, formAction] = useActionState<RoleState, FormData>(
    updateRoleDetails,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roleId" value={roleId} />
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <Field label="Role name" htmlFor="role-name" required>
        <Input
          id="role-name"
          name="name"
          defaultValue={name}
          maxLength={60}
          required
          disabled={isSystem}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="role-description"
        hint={isSystem ? "System role definitions are fixed." : undefined}
      >
        <Input
          id="role-description"
          name="description"
          defaultValue={description ?? ""}
          maxLength={300}
          disabled={isSystem}
        />
      </Field>

      {isSystem ? (
        <p className="text-[11px] text-slate-500">
          This is a system role. Its name is fixed, but its permissions can still be
          adjusted below.
        </p>
      ) : (
        <SubmitButton size="sm" pendingLabel="Saving…">
          Save details
        </SubmitButton>
      )}
    </form>
  );
}
