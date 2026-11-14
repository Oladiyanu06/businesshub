import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600 disabled:bg-brand-300",
  secondary:
    "bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:outline-slate-900 disabled:bg-slate-400",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400 disabled:text-slate-400",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-300",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />;
}
