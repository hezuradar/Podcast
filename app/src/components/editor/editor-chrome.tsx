"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Bookmark,
  FolderOpen,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  SkipBack,
  SlidersHorizontal,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export type ToolId = "add" | "music" | "placeholder" | "filters";

const TOOLS: ReadonlyArray<{ id: ToolId; label: string; icon: LucideIcon }> = [
  { id: "add", label: "Añadir", icon: Plus },
  { id: "music", label: "Música", icon: Music },
  { id: "placeholder", label: "Marcador", icon: Bookmark },
  { id: "filters", label: "Filtros", icon: SlidersHorizontal },
];

type ToolRailProps = { activeTool: ToolId | null; onToolChange: (tool: ToolId | null) => void };

/** Vertical tool rail with roving tabindex (arrow keys move between tools). */
export function ToolRail({ activeTool, onToolChange }: ToolRailProps) {
  const [focusIndex, setFocusIndex] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (focusIndex + step + TOOLS.length) % TOOLS.length;
    setFocusIndex(next);
    buttons.current[next]?.focus();
  };

  return (
    <nav aria-label="Herramientas" className="w-(--layout-tool-rail-width) shrink-0 border-r border-border bg-surface py-3">
      <div role="toolbar" aria-orientation="vertical" onKeyDown={handleKeyDown} className="flex flex-col items-center gap-1">
        {TOOLS.map(({ id, label, icon: Icon }, index) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              tabIndex={index === focusIndex ? 0 : -1}
              aria-pressed={isActive}
              onClick={() => onToolChange(isActive ? null : id)}
              className={cn(
                "focus-ring flex w-14 flex-col items-center gap-1 rounded-md py-2 text-xs",
                "transition-colors duration-(--duration-fast)",
                isActive ? "bg-accent-soft text-on-accent-soft" : "text-text-muted hover:bg-bg hover:text-text",
              )}
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type SidePanelProps = { title: string; onClose: () => void; children: ReactNode; className?: string };

export function SidePanel({ title, onClose, children, className }: SidePanelProps) {
  const headingId = `panel-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <aside
      aria-labelledby={headingId}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className={cn(
        "flex w-(--layout-side-panel-width) shrink-0 flex-col gap-5 border-r border-border bg-surface-raised p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h2 id={headingId} className="text-lg">
          {title}
        </h2>
        <Button variant="ghost" size="sm" iconLabel={`Cerrar ${title}`} onClick={onClose}>
          <X aria-hidden className="size-4" />
        </Button>
      </div>
      {children}
    </aside>
  );
}

type TransportProps = {
  isPlaying: boolean;
  current: string;
  total: string;
  isDisabled?: boolean;
  onTogglePlay: () => void;
  onRestart?: () => void;
  onSkip?: (deltaMs: number) => void;
};

const SKIP_MS = 5000;

export function Transport({
  isPlaying,
  current,
  total,
  isDisabled = false,
  onTogglePlay,
  onRestart,
  onSkip,
}: TransportProps) {
  return (
    <div className="flex h-(--layout-transport-height) items-center gap-1 border-t border-border bg-surface-raised px-2 sm:gap-2 sm:px-4">
      <Button variant="ghost" iconLabel="Ir al inicio" disabled={isDisabled} onClick={onRestart}>
        <SkipBack aria-hidden className="size-4" />
      </Button>
      {/* ±5 s buttons hide on phones so the bar fits next to the tool rail; play/restart stay. */}
      <Button variant="ghost" iconLabel="Retroceder 5 segundos" disabled={isDisabled} onClick={() => onSkip?.(-SKIP_MS)} className="max-sm:hidden">
        <RotateCcw aria-hidden className="size-4" />
      </Button>
      <Button
        size="lg"
        iconLabel={isPlaying ? "Pausar" : "Reproducir"}
        onClick={onTogglePlay}
        disabled={isDisabled}
        className="rounded-pill"
      >
        {isPlaying ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5 translate-x-px" />}
      </Button>
      <Button variant="ghost" iconLabel="Avanzar 5 segundos" disabled={isDisabled} onClick={() => onSkip?.(SKIP_MS)} className="max-sm:hidden">
        <RotateCw aria-hidden className="size-4" />
      </Button>
      <p className="ml-1 font-mono text-xs whitespace-nowrap tabular-nums sm:ml-2 sm:text-sm">
        {current} <span className="text-text-muted">/ {total}</span>
      </p>
    </div>
  );
}

type DropZoneState = "idle" | "drag-over" | "error";

type DropZoneProps = { state: DropZoneState; errorMessage?: string; onChooseFile?: () => void };

export function DropZone({ state, errorMessage, onChooseFile }: DropZoneProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center",
        "transition-colors duration-(--duration-fast)",
        state === "drag-over" ? "border-accent bg-accent-soft" : "border-border-input bg-bg",
        state === "error" && "border-danger",
      )}
    >
      <Upload aria-hidden className={cn("size-6", state === "drag-over" ? "text-on-accent-soft" : "text-text-muted")} />
      <p className="text-sm">
        <span className="font-semibold">Suelta aquí un audio o vídeo</span>
        <br />
        <span className="text-text-muted">MP3, WAV, M4A, MP4, MOV o WebM · hasta 5 GB</span>
      </p>
      <Button variant="secondary" size="sm" onClick={onChooseFile} leadingIcon={<FolderOpen aria-hidden className="size-4" />}>
        Elegir archivo
      </Button>
      {state === "error" && errorMessage && (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
