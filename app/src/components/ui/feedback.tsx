import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type ProgressBarProps = { label: string; value?: number };

/** value 0-1; omit it for an indeterminate bar. */
export function ProgressBar({ label, value }: ProgressBarProps) {
  const isIndeterminate = value === undefined;
  const percent = isIndeterminate ? undefined : Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-text-muted">
        <span>{label}</span>
        {percent !== undefined && <span className="font-mono tabular-nums">{percent} %</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1 overflow-hidden rounded-pill bg-border"
      >
        <div
          className={cn(
            "h-full rounded-pill bg-accent transition-[width] duration-(--duration-base) ease-standard",
            isIndeterminate && "w-1/3 animate-pulse",
          )}
          style={percent === undefined ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-surface", className)} />;
}

type EmptyStateProps = { icon: LucideIcon; title: string; description: string; action?: ReactNode };

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <Icon aria-hidden className="size-8 text-text-muted" strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <h3 className="text-lg">{title}</h3>
        <p className="max-w-sm text-sm text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

type NoticeTone = "info" | "success" | "warning" | "error";

const TONE: Record<NoticeTone, { icon: LucideIcon; bar: string; text: string }> = {
  info: { icon: Info, bar: "bg-accent", text: "text-accent" },
  success: { icon: CheckCircle2, bar: "bg-success", text: "text-success" },
  warning: { icon: AlertTriangle, bar: "bg-warning", text: "text-warning" },
  error: { icon: XCircle, bar: "bg-danger", text: "text-danger" },
};

type NoticeProps = { tone: NoticeTone; title: string; children?: ReactNode; action?: ReactNode };

/** Toast body. The live Toast (Radix) wraps this in /replica-build. */
export function Notice({ tone, title, children, action }: NoticeProps) {
  const { icon: Icon, bar, text } = TONE[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="relative flex items-start gap-3 overflow-hidden rounded-md border border-border bg-surface-raised p-3 pl-4 shadow-pop"
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", bar)} />
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", text)} />
      <div className="flex grow flex-col gap-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {children && <p className="text-sm text-text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}
