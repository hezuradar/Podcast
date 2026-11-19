"use client";

import { Notice, ProgressBar } from "@/components/ui/feedback";
import type { Job } from "@/lib/data/projects";
import { useJobs } from "@/components/editor/useProjectMedia";

const LABEL: Record<Job["type"], string> = {
  transcode: "Preparando el audio",
  transcribe: "Transcribiendo",
  diarize: "Separando hablantes",
  enhance: "Mejorando la voz",
  render: "Exportando",
};

/** Progress of the worker's jobs for this project, polled while something is running. */
export function JobsPanel({ projectId, initialJobs }: { projectId: string; initialJobs: Job[] }) {
  const jobs = useJobs(projectId, initialJobs);
  const running = jobs.filter((job) => job.status === "queued" || job.status === "running");
  const failed = jobs.filter((job) => job.status === "error");
  if (running.length === 0 && failed.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {running.map((job) => (
        <div key={job.id} className="rounded-md border border-border bg-surface-raised p-3">
          <ProgressBar
            label={job.status === "queued" ? `${LABEL[job.type]} (en cola)` : LABEL[job.type]}
            value={job.status === "running" && job.progress > 0 ? job.progress : undefined}
          />
        </div>
      ))}
      {failed.map((job) => (
        <Notice key={job.id} tone="error" title={`${LABEL[job.type]}: no se pudo completar`}>
          {job.error ?? "Error desconocido"}
        </Notice>
      ))}
    </div>
  );
}
