import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "green" | "amber" | "danger";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-paper text-ink-2 border border-line",
  green: "bg-green-50 text-pine border border-green-100",
  amber: "bg-amber-50 text-amber-ink border border-amber/30",
  danger: "bg-danger-50 text-danger border border-danger/20",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-semibold tabular",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const alertTones: Record<Tone, string> = {
  neutral: "border-line bg-sheet text-ink-2",
  green: "border-green-100 bg-green-50 text-pine-900",
  amber: "border-amber/40 bg-amber-50 text-ink",
  danger: "border-danger/25 bg-danger-50 text-danger",
};

export function Alert({
  tone = "neutral",
  title,
  children,
  className,
  role,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div className={cn("rounded-[var(--radius-sm)] border px-4 py-3 text-sm", alertTones[tone], className)} role={role}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border-y border-line py-12">
      <h2 className="text-[1.8rem] text-ink">{title}</h2>
      {description && <p className="max-w-md text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-xs)] bg-line/70", className)} aria-hidden="true" />;
}
