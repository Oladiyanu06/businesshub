import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
          <CloudOff className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">You are offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This page could not be loaded from the network. Reconnect to continue. Offline
          sign-in and queued transactions become available when the offline POS module is
          enabled.
        </p>
        <Link href="/app" className={buttonStyles({ className: "mt-6 w-full" })}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Try again
        </Link>
        <p className="mt-4 text-[11px] text-slate-400">
          No business data is cached by the service worker on shared devices.
        </p>
      </div>
    </main>
  );
}
