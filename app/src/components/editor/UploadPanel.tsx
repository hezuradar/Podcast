"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { attachDemoTranscriptAction } from "@/app/actions";
import { DropZone } from "@/components/editor/editor-chrome";
import { Notice, ProgressBar } from "@/components/ui/feedback";

const MAX_BYTES = 5 * 1024 ** 3;
const ACCEPT = "audio/*,video/mp4,video/quicktime,video/x-m4v,video/3gpp,video/webm";
const MEDIA_EXTENSION = /\.(mp3|wav|m4a|aac|flac|ogg|opus|mp4|mov|m4v|3gp|webm)$/i;

/** Returns an error message, or null when the file can be used. */
export function validateMediaFile(file: { name: string; type: string; size: number }): string | null {
  const isMedia = /^(audio|video)\//.test(file.type) || MEDIA_EXTENSION.test(file.name);
  if (!isMedia) return `«${file.name}» no es un audio ni un vídeo admitido.`;
  if (file.size > MAX_BYTES) return `«${file.name}» pesa más de 5 GB.`;
  if (file.size === 0) return `«${file.name}» está vacío.`;
  return null;
}

export function UploadPanel({ projectId }: { projectId: string }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateMediaFile(file);
    setError(problem);
    if (problem) return;
    startTransition(async () => {
      try {
        await attachDemoTranscriptAction(projectId);
        router.refresh();
      } catch {
        setError("No se pudo procesar el archivo. Inténtalo otra vez.");
      }
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info" title="Modo de demostración">
        Todavía no hay motor de transcripción: al subir un archivo se usa una transcripción de ejemplo.
      </Notice>
      {isPending ? (
        <ProgressBar label="Transcribiendo (demostración)" />
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <DropZone
            state={error ? "error" : isDragOver ? "drag-over" : "idle"}
            errorMessage={error ?? undefined}
            onChooseFile={() => inputRef.current?.click()}
          />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
