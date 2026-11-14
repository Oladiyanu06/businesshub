"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";

import { assignRoles, type RoleAssignmentState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

type Role = { id: string; key: string; name: string; description: string | null };

export function RolesForm({
  employeeId,
  roles,
  assignedIds,
}: {
  employeeId: string;
  roles: Role[];
  assignedIds: string[];
}) {
  const [state, formAction] = useActionState<RoleAssignmentState, FormData>(
    assignRoles,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="space-y-2">
        {roles.map((role) => (
          <label
            key={role.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/50"
          >
            <input
              type="checkbox"
              name="roleIds"
              value={role.id}
              defaultChecked={assignedIds.includes(role.id)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-900">
                {role.key === "business_admin" ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                ) : null}
                {role.name}
              </span>
              <span className="block text-[11px] leading-relaxed text-slate-500">
                {role.description ?? "Custom role"}
              </span>
            </span>
          </label>
        ))}
      </div>

      <p className="text-[11px] text-slate-500">
        The Business Administrator role always retains full permissions. The business must
        keep at least one active administrator.
      </p>

      <SubmitButton size="sm" pendingLabel="Updating access…">
        Update roles
      </SubmitButton>
    </form>
  );
}
