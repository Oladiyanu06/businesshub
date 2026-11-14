import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const tones: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/15",
  brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "active"
      ? "success"
      : status === "suspended" || status === "revoked"
        ? "danger"
        : status === "terminated" || status === "archived"
          ? "neutral"
          : "warning";

  return <Badge tone={tone}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
