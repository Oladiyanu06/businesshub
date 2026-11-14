import { CheckCircle2, Info, ShieldAlert, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "warning" | "info";

const styles: Record<Variant, { wrapper: string; icon: React.ReactNode }> = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />,
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-800",
    icon: <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden />,
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-800",
    icon: <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden />,
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-800",
    icon: <Info className="h-4 w-4 text-sky-600" aria-hidden />,
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const style = styles[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm", style.wrapper, className)}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title && "mt-0.5", "text-[13px] leading-relaxed")}>{children}</div>
      </div>
    </div>
  );
}
