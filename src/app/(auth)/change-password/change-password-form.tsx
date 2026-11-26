"use client";

import { useActionState } from "react";

import { changePassword, type PasswordState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ChangePasswordForm({
  forced,
  recovery,
}: {
  forced: boolean;
  recovery: boolean;
}) {
  const [state, formAction] = useActionState<PasswordState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

      {recovery ? null : (
        <Field label="Current password" htmlFor="currentPassword" required>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
          />
        </Field>
      )}

      <Field
        label="New password"
        htmlFor="password"
        hint="At least 12 characters with upper and lower case letters, a number and a symbol."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirmPassword" required>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Updating password…">
        {forced || recovery ? "Set password and continue" : "Update password"}
      </SubmitButton>
    </form>
  );
}
