"use client";

import { useState, type ReactNode } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { Dialog as RadixDialog, DropdownMenu, Popover } from "radix-ui";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

/** Overlays sit above sticky editor chrome (toolbar z-10, mobile side panel z-20). */
const POP_SURFACE = "z-50 rounded-md border border-border bg-surface-raised shadow-pop";

type DialogProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** While processing, Escape and outside clicks do not close the dialog. */
  isBusy?: boolean;
};

export function Dialog({ trigger, title, description, children, footer, isBusy = false }: DialogProps) {
  const preventWhenBusy = (event: Event) => {
    if (isBusy) event.preventDefault();
  };
  return (
    <RadixDialog.Root>
      <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-text/40" />
        <RadixDialog.Content
          onEscapeKeyDown={preventWhenBusy}
          onPointerDownOutside={preventWhenBusy}
          className={cn(
            "fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-[30rem] -translate-y-1/2 flex-col gap-5 rounded-lg p-6",
            "border border-border bg-surface-raised shadow-pop",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title className="text-lg">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="text-sm text-text-muted">{description}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="sm" iconLabel="Cerrar" disabled={isBusy}>
                <X aria-hidden className="size-4" />
              </Button>
            </RadixDialog.Close>
          </div>
          {children}
          {footer && <div className="flex justify-end gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export type MenuItem = { label: string; onSelect: () => void; isDisabled?: boolean; isDanger?: boolean };

type MenuProps = { label: string; items: ReadonlyArray<MenuItem> };

export function Menu({ label, items }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" iconLabel={label}>
          <MoreHorizontal aria-hidden className="size-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className={cn("min-w-44 p-1", POP_SURFACE)}>
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              disabled={item.isDisabled}
              onSelect={item.onSelect}
              className={cn(
                "flex h-8 cursor-default items-center rounded-sm px-2 text-sm outline-none select-none",
                "data-[highlighted]:bg-accent-soft data-[highlighted]:text-on-accent-soft data-[disabled]:opacity-50",
                item.isDanger && "text-danger",
              )}
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type CorrectWordPopoverProps = {
  word: string;
  onSave: (text: string) => void;
  children: ReactNode;
};

export function CorrectWordPopover({ word, onSave, children }: CorrectWordPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(word);
  const isEmpty = draft.trim().length === 0;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setDraft(word);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isEmpty) return;
    onSave(draft.trim());
    setIsOpen(false);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className={cn("w-64 p-3", POP_SURFACE)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label htmlFor="correct-word" className="text-xs text-text-muted">
              Corregir palabra (el audio no cambia)
            </label>
            <input
              id="correct-word"
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={(event) => event.target.select()}
              aria-invalid={isEmpty || undefined}
              className="focus-ring h-9 rounded-sm border border-border-input bg-bg px-2 font-transcript text-base aria-[invalid=true]:border-danger"
            />
            <div className="flex justify-end gap-2">
              <Popover.Close asChild>
                <Button variant="ghost" size="sm">
                  Cancelar
                </Button>
              </Popover.Close>
              <Button type="submit" size="sm" disabled={isEmpty}>
                Guardar
              </Button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
