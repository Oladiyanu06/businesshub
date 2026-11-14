import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserX } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "No workspace access" };

export default async function NoAccessPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
          <UserX className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">No workspace assigned</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This sign-in is valid, but it is not linked to an active business employee
          record or a platform administrator account. Ask your administrator to complete
          your provisioning.
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
