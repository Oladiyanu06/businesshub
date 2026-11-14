import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CloudOff, LockKeyhole, ShieldCheck, Users } from "lucide-react";

import { LoginForm } from "./login-form";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(59,125,246,0.35), transparent 42%), radial-gradient(circle at 85% 75%, rgba(16,185,129,0.22), transparent 40%)",
          }}
        />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-[0.18em]">BUSINESSHUB</span>
          </Link>
          <h1 className="mt-16 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            The operating record for every branch you run.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Sales, stock and money stay connected — even on a bad connection. Access is
            limited to provisioned employees and authorised devices.
          </p>
        </div>

        <div className="relative grid gap-3">
          {[
            {
              icon: <CloudOff className="h-4 w-4" />,
              title: "Offline-capable",
              body: "Transactions queue locally and reconcile when you reconnect.",
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              title: "Isolated by business",
              body: "Your records are never visible to another business.",
            },
            {
              icon: <Users className="h-4 w-4" />,
              title: "Accountable access",
              body: "Every role, permission and device can be reviewed and revoked.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <span className="mt-0.5 text-brand-300">{item.icon}</span>
              <div>
                <p className="text-[13px] font-medium text-white">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-[11px] text-slate-500">
          Licensed to individual businesses. Commercial terms are managed separately.
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              <Building2 className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-[0.18em] text-slate-900">
              BUSINESSHUB
            </span>
          </div>

          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <LockKeyhole className="h-3 w-3" aria-hidden /> Authorised access only
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Sign in to your workspace
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Use the credentials issued by your business administrator.
            </p>
          </div>

          <LoginForm next={safeNextPath(next) ?? undefined} />

          <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
            No account? Business accounts are created by the BUSINESSHUB platform
            administrator. Employees are registered by their business administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
