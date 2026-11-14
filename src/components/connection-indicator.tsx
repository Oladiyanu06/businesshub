"use client";

import { useEffect, useState } from "react";
import { CloudOff, Loader2, RefreshCw, Wifi } from "lucide-react";

import { useOnlineStatus } from "@/lib/use-online-status";
import { cn } from "@/lib/utils";

type SyncStatus = "idle" | "syncing" | "error";

export const SYNC_EVENT = "businesshub:sync-status";

export function ConnectionIndicator({ compact = false }: { compact?: boolean }) {
  const online = useOnlineStatus();
  const [sync, setSync] = useState<SyncStatus>("idle");

  useEffect(() => {
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<SyncStatus>).detail;
      if (detail === "syncing" || detail === "error" || detail === "idle") setSync(detail);
    };

    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const state = !online
    ? {
        label: "Offline",
        icon: <CloudOff className="h-3.5 w-3.5" aria-hidden />,
        className: "bg-amber-50 text-amber-700 ring-amber-600/20",
        dot: "bg-amber-500",
      }
    : sync === "syncing"
      ? {
          label: "Synchronising",
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />,
          className: "bg-sky-50 text-sky-700 ring-sky-600/20",
          dot: "bg-sky-500",
        }
      : sync === "error"
        ? {
            label: "Sync error",
            icon: <RefreshCw className="h-3.5 w-3.5" aria-hidden />,
            className: "bg-red-50 text-red-700 ring-red-600/20",
            dot: "bg-red-500",
          }
        : {
            label: "Online",
            icon: <Wifi className="h-3.5 w-3.5" aria-hidden />,
            className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
            dot: "bg-emerald-500",
          };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        state.className,
      )}
      role="status"
      aria-live="polite"
      title={`Connection: ${state.label}`}
    >
      {compact ? <span className={cn("h-1.5 w-1.5 rounded-full", state.dot)} /> : state.icon}
      <span className={compact ? "sr-only" : undefined}>{state.label}</span>
    </span>
  );
}
