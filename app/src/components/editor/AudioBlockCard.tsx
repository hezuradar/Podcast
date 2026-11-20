"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileAudio, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/format";
import { LANGUAGES, type Language } from "@/lib/media";
import { cancelTranscription, requestTranscription } from "@/lib/transcription";
import type { Asset, Job } from "@/lib/data/projects";
import { cn } from "@/lib/cn";

type AudioBlockCardProps = {
  asset: Asset | undefined;
  /** The queued or running transcription of this audio, if any. */
  job: Job | undefined;
  language: Language;
  isPlaying: boolean;
};

/**
 * An audio in the episode without a transcript: it plays and exports whole. From here it can be
 * transcribed, or its running transcription stopped.
 */
export function AudioBlockCard({ asset, job, language: defaultLanguage, isPlaying }: AudioBlockCardProps) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const name = asset?.originalName ?? "Audio";
  const duration = asset?.durationMs ? formatDuration(asset.durationMs) : "";

  const run = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo completar la acción");
      }
    });
  };

  return (
    <section
      aria-label={`Audio sin transcribir: ${name}`}
      className={cn(
        "relative flex flex-col gap-3 rounded-md border border-dashed border-border-input bg-surface p-4",
        isPlaying && "before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-pill before:bg-accent",
      )}
    >
      <div className="flex items-center gap-2 text-xs">
        <FileAudio aria-hidden className="size-4 text-text-muted" />
        <span className="min-w-0 truncate font-semibold">{name}</span>
        {duration && <span className="font-mono tabular-nums text-text-muted">{duration}</span>}
      </div>
      {job ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-text-muted">
            {job.status === "queued" ? "Transcripción en cola…" : `Transcribiendo… ${Math.round(job.progress * 100)} %`}
          </p>
          <Button
            variant="secondary"
            size="sm"
            isLoading={isPending}
            leadingIcon={<X aria-hidden className="size-4" />}
            onClick={() => run(() => cancelTranscription(job.id))}
          >
            Cancelar transcripción
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <p className="w-full text-sm text-text-muted">
            Sin transcribir: se escucha, se mejora y se exporta entero, pero no se puede editar por texto.
          </p>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Idioma
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="focus-ring h-8 rounded-md border border-border-input bg-bg px-2 text-sm font-normal"
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" isLoading={isPending} disabled={!asset?.hasProxy} onClick={() => run(() => requestTranscription(asset?.id ?? "", language))}>
            Transcribir
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
