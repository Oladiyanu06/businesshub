"use client";

import { useActionState } from "react";

import { updateRolePermissions, type RoleState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { PermissionMatrix } from "../permission-matrix";
import { PERMISSION_CATALOG } from "@/lib/permissions";

export function RolePermissionsForm({
  roleId,
  assigned,
  lockAll,
}: {
  roleId: string;
  assigned: string[];
  lockAll: boolean;
}) {
  const [state, formAction] = useActionState<RoleState, FormData>(
    updateRolePermissions,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roleId" value={roleId} />
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <PermissionMatrix catalog={PERMISSION_CATALOG} initial={assigned} lockAll={lockAll} />

      {!lockAll ? (
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Saving permissions…">
            Save permissions
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
