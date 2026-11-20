"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { Slider as RadixSlider, Switch as RadixSwitch } from "radix-ui";
import { cn } from "@/lib/cn";

type SwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Switch({ label, checked, onCheckedChange, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "focus-ring relative h-5 w-9 shrink-0 rounded-pill bg-border-input",
          "transition-colors duration-(--duration-fast) data-[state=checked]:bg-accent disabled:opacity-50",
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block size-4 translate-x-0.5 rounded-pill bg-bg shadow-card",
            "transition-transform duration-(--duration-fast) ease-standard data-[state=checked]:translate-x-[1.125rem]",
          )}
        />
      </RadixSwitch.Root>
    </div>
  );
}

type SliderProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  /** Fires once when the user releases the thumb (or finishes with the keyboard). */
  onValueCommit?: (value: number) => void;
  disabled?: boolean;
};

export function Slider({ label, value, onValueChange, onValueCommit, disabled }: SliderProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span id={id} className="text-sm font-semibold">
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-text-muted">{value} %</span>
      </div>
      <RadixSlider.Root
        aria-labelledby={id}
        value={[value]}
        onValueChange={([next]) => onValueChange(next)}
        onValueCommit={([next]) => onValueCommit?.(next)}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        className="relative flex h-5 touch-none items-center select-none data-[disabled]:opacity-50"
      >
        <RadixSlider.Track className="relative h-1 grow rounded-pill bg-border">
          <RadixSlider.Range className="absolute h-full rounded-pill bg-accent" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-valuetext={`${value} %`}
          className="focus-ring block size-4 rounded-pill border-2 border-accent bg-bg shadow-card"
        />
      </RadixSlider.Root>
    </div>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  error?: string;
};

export function Select({ label, options, error, className, ...rest }: SelectProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "focus-ring h-10 rounded-md border border-border-input bg-bg px-3 text-sm",
          "aria-[invalid=true]:border-danger disabled:opacity-50",
          className,
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
};

export function Checkbox({ label, checked, onCheckedChange, hint, disabled }: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <span className="relative mt-0.5 grid size-[1.125rem] shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className={cn(
            "focus-ring peer size-full appearance-none rounded-sm border border-border-input bg-bg",
            "checked:border-accent checked:bg-accent disabled:opacity-50",
          )}
        />
        <Check aria-hidden className="pointer-events-none absolute size-3.5 text-on-accent opacity-0 peer-checked:opacity-100" />
      </span>
      <label htmlFor={id} className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
      </label>
    </div>
  );
}
