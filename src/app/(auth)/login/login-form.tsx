"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signIn, type AuthState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(signIn, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

      <Field label="Work email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="you@business.com"
          required
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        <Link
          href="/forgot-password"
          className="font-medium text-brand-700 hover:underline"
        >
          Forgot your password?
        </Link>
        <span className="mt-1 block">
          Staff can also ask their business administrator to reset it.
        </span>
      </p>
    </form>
  );
}
