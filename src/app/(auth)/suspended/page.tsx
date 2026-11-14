import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Access suspended" };

export default async function SuspendedPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  const name = session.employee?.fullName ?? "your account";
  const status = session.employee?.status ?? "suspended";

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Access is {status}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {name}, your access to{" "}
          <span className="font-medium text-slate-700">
            {session.business?.name ?? "this workspace"}
          </span>{" "}
          has been {status}. Contact your business administrator if you believe this is
          a mistake.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
