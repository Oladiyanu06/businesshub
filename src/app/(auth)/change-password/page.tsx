import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { requireSession } from "@/lib/auth/session";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const session = await requireSession({ allowPasswordChange: true });
  if (!session.employee && !session.isPlatformAdmin) redirect("/no-access");

  const forced = session.employee?.mustChangePassword ?? false;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-[0.18em] text-slate-900">
            BUSINESSHUB
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {forced ? "Set a new password" : "Change your password"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {forced
              ? "Your account was provisioned with a temporary password. Replace it before continuing."
              : "Choose a strong password that you do not use elsewhere."}
          </p>

          <div className="mt-6">
            <ChangePasswordForm forced={forced} />
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Signed in as {session.employee?.email ?? "platform administrator"}
        </p>
      </div>
    </main>
  );
}
