import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "brand" | "emerald" | "amber" | "slate";
}) {
  const iconTone =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : tone === "slate"
          ? "bg-slate-100 text-slate-500"
          : "bg-brand-50 text-brand-600";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? <p className="mt-1 truncate text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", iconTone)}>
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
