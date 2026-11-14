"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { resetEmployeePassword, type PasswordResetState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetPasswordForm({ employeeId }: { employeeId: string }) {
  const [state, formAction] = useActionState<PasswordResetState, FormData>(
    resetEmployeePassword,
    undefined,
  );

  return (
    <div className="space-y-3">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.password ? (
        <Alert variant="warning" title="Password reset — shown once">
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <code className="select-all rounded bg-amber-100 px-2 py-1 font-mono text-[12px] text-amber-900">
              {state.password}
            </code>
            <CopyButton value={state.password} />
          </div>
          <p className="mt-2">
            The employee must change this password at their next sign-in. Deliver it
            through a secure channel.
          </p>
        </Alert>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="employeeId" value={employeeId} />
        <SubmitButton variant="outline" size="sm" pendingLabel="Resetting…">
          <KeyRound className="h-3.5 w-3.5" aria-hidden /> Reset password
        </SubmitButton>
      </form>
    </div>
  );
}
