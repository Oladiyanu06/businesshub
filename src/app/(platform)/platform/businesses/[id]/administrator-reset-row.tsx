"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import {
  resetAdministratorPassword,
  type AdministratorResetState,
} from "../../actions";
import { StatusBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";

export type AdministratorRow = {
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
};

export function AdministratorResetRow({
  businessId,
  administrator,
}: {
  businessId: string;
  administrator: AdministratorRow;
}) {
  const [state, formAction] = useActionState<AdministratorResetState, FormData>(
    resetAdministratorPassword,
    undefined,
  );

  return (
    <>
      <tr>
        <td className="px-5 py-3 font-medium text-slate-900">
          {administrator.full_name}
        </td>
        <td className="px-5 py-3 text-slate-600">{administrator.email}</td>
        <td className="px-5 py-3 text-slate-600">{administrator.phone ?? "—"}</td>
        <td className="px-5 py-3">
          <StatusBadge status={administrator.status} />
        </td>
        <td className="px-5 py-3 text-right">
          <form action={formAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="employeeId" value={administrator.employee_id} />
            <SubmitButton variant="outline" size="sm" pendingLabel="Resetting…">
              <KeyRound className="h-3.5 w-3.5" aria-hidden /> Reset
            </SubmitButton>
          </form>
        </td>
      </tr>

      {state?.error || state?.password ? (
        <tr>
          <td colSpan={5} className="border-t border-amber-100 bg-amber-50/60 px-5 py-3">
            {state.error ? (
              <p className="text-xs text-red-700" role="alert">
                {state.error}
              </p>
            ) : null}

            {state.password ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-amber-900">
                  Temporary password — shown once:
                </span>
                <code className="select-all rounded bg-amber-100 px-2 py-1 font-mono text-[12px] text-amber-900">
                  {state.password}
                </code>
                <CopyButton value={state.password} />
                <span className="text-xs text-amber-900">
                  Send it to {administrator.full_name} through a secure channel.
                  They must change it at next sign-in.
                </span>
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}
