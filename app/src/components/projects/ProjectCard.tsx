"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteProjectAction } from "@/app/actions";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Menu } from "@/components/ui/overlays";

type ProjectCardProps = {
  /** Without an id the card is a preview (design page): the menu does nothing. */
  id?: string;
  href: string;
  title: string;
  updated: string;
  duration: string;
  isProcessing?: boolean;
};

export function ProjectCard({ id, href, title, updated, duration, isProcessing = false }: ProjectCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!id) return;
    startDelete(async () => {
      try {
        await deleteProjectAction(id);
      } catch {
        setError("No se pudo borrar. Inténtalo otra vez.");
      }
    });
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-6 rounded-lg border border-border bg-surface-raised p-5",
        "transition-shadow duration-(--duration-base) ease-standard hover:shadow-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-base font-semibold break-words">
          <Link href={href} className="focus-ring rounded-sm after:absolute after:inset-0 after:rounded-lg">
            {title}
          </Link>
        </h3>
        <div className="relative z-10">
          <Menu label={`Opciones de ${title}`} items={[{ label: "Borrar", onSelect: () => setIsConfirming(true), isDanger: true }]} />
        </div>
      </div>
      <p className="mt-auto flex items-center gap-2 text-xs text-text-muted">
        <span className="font-mono tabular-nums">{duration}</span>
        <span aria-hidden>·</span>
        <span>{updated}</span>
        {isProcessing && (
          <span className="ml-auto rounded-pill bg-warning-soft px-2 py-0.5 font-semibold text-warning">Procesando</span>
        )}
      </p>
      {isConfirming && (
        <div role="alertdialog" aria-label={`Borrar ${title}`} className="relative z-10 flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-sm">¿Borrar este proyecto? No se puede deshacer.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsConfirming(false)} autoFocus>
              Cancelar
            </Button>
            <Button size="sm" variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              Borrar
            </Button>
          </div>
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </article>
  );
}
