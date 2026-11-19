import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle, Mic, Pause } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface-raised text-text border border-border-input hover:bg-surface",
  ghost: "bg-transparent text-text hover:bg-surface",
  danger: "bg-danger text-on-danger hover:brightness-95",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 gap-1.5",
  md: "h-10 px-4 gap-2",
  lg: "h-12 px-5 gap-2",
};

const ICON_SIZE: Record<Size, string> = { sm: "size-8", md: "size-10", lg: "size-12" };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  /** Icon-only button: pass the icon as children and a label for screen readers. */
  iconLabel?: string;
  leadingIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  iconLabel,
  leadingIcon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const isIconOnly = Boolean(iconLabel);
  return (
    <button
      type={type}
      aria-label={iconLabel}
      title={iconLabel}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center rounded-md text-sm font-semibold",
        "transition-[background-color,filter,transform] duration-(--duration-fast) ease-standard",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        isIconOnly ? ICON_SIZE[size] : SIZE[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : leadingIcon}
      {children}
    </button>
  );
}

type RecordState = "ready" | "recording" | "paused";

type RecordButtonProps = {
  state: RecordState;
  elapsed: string;
  disabledReason?: string;
  onClick?: () => void;
};

const RECORD_LABEL: Record<RecordState, string> = {
  ready: "Grabar",
  recording: "Pausar grabación",
  paused: "Reanudar grabación",
};

export function RecordButton({ state, elapsed, disabledReason, onClick }: RecordButtonProps) {
  const isDisabled = Boolean(disabledReason);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-pressed={state === "recording"}
        aria-label={RECORD_LABEL[state]}
        title={`${RECORD_LABEL[state]} (R)`}
        className={cn(
          "focus-ring relative grid size-14 place-items-center rounded-pill bg-record text-on-record shadow-card",
          "transition-transform duration-(--duration-fast) ease-standard hover:scale-105 active:scale-95",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        )}
      >
        {state === "recording" && (
          <span aria-hidden className="absolute inset-0 animate-ping rounded-pill bg-record opacity-30" />
        )}
        {state === "recording" ? <Pause aria-hidden className="size-6" /> : <Mic aria-hidden className="size-6" />}
      </button>
      <div className="flex flex-col">
        <span className="font-mono text-sm tabular-nums">{elapsed}</span>
        {disabledReason && <span className="text-xs text-text-muted">{disabledReason}</span>}
      </div>
    </div>
  );
}
