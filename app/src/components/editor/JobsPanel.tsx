"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice, ProgressBar } from "@/components/ui/feedback";
import type { Job } from "@/lib/data/projects";
import { cancelTranscription } from "@/lib/transcription";
import { useJobs } from "@/components/editor/useProjectMedia";

const LABEL: Record<Job["type"], string> = {
  transcode: "Preparando el audio",
  transcribe: "Transcribiendo",
  diarize: "Separando hablantes",
  enhance: "Mejorando la voz",
  render: "Exportando",
};

/** Progress of the worker's jobs for this project, polled while something is running. Transcriptions can be cancelled. */
export function JobsPanel({ projectId, initialJobs }: { projectId: string; initialJobs: Job[] }) {
  const jobs = useJobs(projectId, initialJobs);
  const router = useRouter();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = jobs.filter((job) => job.status === "queued" || job.status === "running");
  const failed = jobs.filter((job) => job.status === "error");
  if (running.length === 0 && failed.length === 0 && !error) return null;

  const cancel = async (jobId: string) => {
    setCancelling(jobId);
    setError(null);
    try {
      await cancelTranscription(jobId);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cancelar");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {running.map((job) => (
        <div key={job.id} className="flex items-center gap-3 rounded-md border border-border bg-surface-raised p-3">
          <div className="grow">
            <ProgressBar
              label={job.status === "queued" ? `${LABEL[job.type]} (en cola)` : LABEL[job.type]}
              value={job.status === "running" && job.progress > 0 ? job.progress : undefined}
            />
          </div>
          {job.type === "transcribe" && (
            <Button
              variant="ghost"
              size="sm"
              isLoading={cancelling === job.id}
              leadingIcon={<X aria-hidden className="size-4" />}
              onClick={() => void cancel(job.id)}
            >
              Cancelar
            </Button>
          )}
        </div>
      ))}
      {failed.map((job) => (
        <Notice key={job.id} tone="error" title={`${LABEL[job.type]}: no se pudo completar`}>
          {job.error ?? "Error desconocido"}
        </Notice>
      ))}
      {error && (
        <Notice tone="error" title="Cancelar transcripción">
          {error}
        </Notice>
      )}
    </div>
  );
}
