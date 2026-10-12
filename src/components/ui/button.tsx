import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger" | "dangerOutline" | "onDark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium whitespace-nowrap " +
  "transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-out-quart)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-pine text-paper hover:bg-pine-900",
  // Laranja reservado para a ação principal de compra
  accent: "bg-amber text-pine-900 hover:bg-amber-light",
  outline: "border border-line-strong text-ink hover:border-pine hover:text-pine bg-transparent",
  ghost: "text-ink-2 hover:text-pine hover:bg-green-50",
  danger: "bg-danger text-white hover:bg-danger/90",
  dangerOutline: "border border-danger/40 text-danger bg-transparent hover:bg-danger-50 hover:border-danger/70",
  onDark: "border border-paper/30 bg-transparent text-paper hover:border-paper/60 hover:bg-paper/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: Omit<CommonProps, "loading"> & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
