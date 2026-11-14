"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  size = "md",
  className,
  name,
  value,
  formNoValidate,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
  formNoValidate?: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      name={name}
      value={value}
      formNoValidate={formNoValidate}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
