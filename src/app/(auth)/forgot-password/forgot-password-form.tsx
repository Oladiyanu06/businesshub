"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, type ResetRequestState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.sent ? (
        <Alert variant="success" title="Check your inbox">
          If an account exists for that address, a reset link is on its way. The
          link expires shortly, so use it as soon as it arrives. Check spam if you
          do not see it within a few minutes.
        </Alert>
      ) : null}

      <Field
        label="Work email"
        htmlFor="email"
        hint="Use the address your account was created with."
        required
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@business.com"
          required
          autoFocus
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>

      <p className="text-center text-xs text-slate-500">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
