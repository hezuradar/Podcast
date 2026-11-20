"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "@/components/editor/editor-chrome";
import { ProgressBar } from "@/components/ui/feedback";
import { Checkbox, Select } from "@/components/ui/form-controls";
import { LANGUAGES, validateMediaFile, type Language } from "@/lib/media";
import { uploadMedia } from "@/lib/upload";

const ACCEPT = "audio/*,video/mp4,video/quicktime,video/x-m4v,video/3gpp,video/webm,.mp3,.wav,.m4a,.flac,.ogg,.opus";

type UploadPanelProps = {
  projectId: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
  /** Shared with recording: transcribe new audio right away, or only prepare it. */
  autoTranscribe: boolean;
  onAutoTranscribeChange: (value: boolean) => void;
};

export function UploadPanel({ projectId, language, onLanguageChange, autoTranscribe, onAutoTranscribeChange }: UploadPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateMediaFile(file);
    setError(problem);
    if (problem) return;
    setProgress(0);
    try {
      await uploadMedia({
        projectId,
        file,
        fileName: file.name,
        language,
        source: "upload",
        transcribe: autoTranscribe,
        onProgress: setProgress,
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo subir el archivo");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    void handleFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Idioma del audio"
        options={LANGUAGES}
        value={language}
        onChange={(event) => onLanguageChange(event.target.value as Language)}
      />
      <Checkbox
        label="Transcribir automáticamente"
        hint="Si lo desmarcas, el audio se prepara para escucharlo, mejorarlo y exportarlo entero, y puedes transcribirlo más tarde."
        checked={autoTranscribe}
        onCheckedChange={onAutoTranscribeChange}
      />
      {progress !== null ? (
        <ProgressBar label="Subiendo" value={progress} />
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
      <p className="text-xs text-text-muted">
        Al subirlo se prepara el audio y se transcribe en tu equipo. Puede tardar más o menos lo que dura el audio.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
