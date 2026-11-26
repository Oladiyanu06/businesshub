import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
          </span>
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.18em] text-slate-900"
          >
            BUSINESSHUB
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Reset your password
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Enter the email address on your account and we will send a secure
            link to set a new password.
          </p>

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
          Staff without access to the account email should ask their business
          administrator to reset the password.
        </p>
      </div>
    </main>
  );
}
