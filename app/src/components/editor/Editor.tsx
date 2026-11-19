"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, FileAudio, Square } from "lucide-react";
import { Button, RecordButton } from "@/components/ui/Button";
import { EmptyState, Notice, ProgressBar } from "@/components/ui/feedback";
import { Slider, Switch } from "@/components/ui/form-controls";
import { SidePanel, ToolRail, Transport, type ToolId } from "@/components/editor/editor-chrome";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { JobsPanel } from "@/components/editor/JobsPanel";
import { TranscriptEditor } from "@/components/editor/TranscriptEditor";
import { UploadPanel } from "@/components/editor/UploadPanel";
import { useAutosave, type SaveStatus } from "@/components/editor/useAutosave";
import { useEditHistory } from "@/components/editor/useEditHistory";
import { usePlayback } from "@/components/editor/usePlayback";
import { useProjectAudio } from "@/components/editor/useProjectMedia";
import { useRecorder } from "@/components/editor/useRecorder";
import { appendPlaceholder } from "@/lib/doc/operations";
import { buildEdl, keyAtTime, timeOfKey } from "@/lib/edl/edl";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Language } from "@/lib/media";
import { uploadMedia } from "@/lib/upload";
import type { ProjectDetail } from "@/lib/data/projects";

const SAVE_LABEL: Record<SaveStatus, { text: string; className: string }> = {
  saved: { text: "Guardado", className: "text-text-muted" },
  saving: { text: "Guardando…", className: "text-text-muted" },
  error: { text: "No se pudo guardar", className: "text-danger" },
  conflict: { text: "Cambiado en otra pestaña: recarga la página", className: "text-warning" },
};

const PANEL_TITLE: Record<ToolId, string> = { add: "Añadir audio", music: "Música", placeholder: "Marcador", filters: "Filtros" };

function PlaceholderForm({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!label.trim()) return;
        onAdd(label);
        setLabel("");
      }}
    >
      <label htmlFor="placeholder-label" className="text-sm font-semibold">
        Nombre del marcador
      </label>
      <input
        id="placeholder-label"
        value={label}
        maxLength={200}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Por ejemplo: pregunta sobre AGVs"
        className="focus-ring h-10 rounded-md border border-border-input bg-bg px-3 text-sm"
      />
      <Button type="submit" disabled={!label.trim()} leadingIcon={<Bookmark aria-hidden className="size-4" />}>
        Añadir al final
      </Button>
    </form>
  );
}

function useRecordingUpload(projectId: string, language: Language) {
  const recorder = useRecorder();
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleRecordClick = () => (recorder.state === "ready" ? void recorder.start() : recorder.togglePause());

  const stopAndUpload = async () => {
    const file = await recorder.stop();
    if (!file || file.size === 0) return;
    setUploadError(null);
    setUploadProgress(0);
    try {
      await uploadMedia({ projectId, file, fileName: file.name, language, source: "recording", onProgress: setUploadProgress });
      router.refresh();
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "No se pudo guardar la grabación");
    } finally {
      setUploadProgress(null);
    }
  };

  return { recorder, uploadProgress, uploadError, handleRecordClick, stopAndUpload };
}

export function Editor({ project }: { project: ProjectDetail }) {
  const history = useEditHistory(project.doc);
  const { doc } = history;
  const words = useMemo(() => new Map(project.words.map((word) => [word.id, word])), [project.words]);
  const edl = useMemo(() => buildEdl(doc, words), [doc, words]);
  const audio = useProjectAudio(project.assets);
  const playback = usePlayback(edl, audio.player);
  const saveStatus = useAutosave(project.id, doc, project.docVersion);
  const [tool, setTool] = useState<ToolId | null>(doc.blocks.length === 0 && project.assets.length === 0 ? "add" : null);
  const [language, setLanguage] = useState<Language>("es");
  const recording = useRecordingUpload(project.id, language);
  const { recorder } = recording;

  const hasMoved = playback.isPlaying || playback.currentMs > 0;
  const activeKey = hasMoved ? keyAtTime(edl, words, playback.currentMs) : null;
  const hasContent = doc.blocks.length > 0;
  const isProcessing = project.jobs.some((job) => job.status === "queued" || job.status === "running");
  const save = SAVE_LABEL[saveStatus];
  const jobsKey = project.jobs.map((job) => `${job.id}:${job.status}`).join("|");

  const seekKey = (key: string) => {
    const time = timeOfKey(edl, words, key);
    if (time !== null) playback.seek(time);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-(--layout-header-height) shrink-0 items-center gap-3 border-b border-border bg-surface-raised px-3 sm:px-4">
        <Link href="/" aria-label="Volver a los proyectos" className="focus-ring rounded-sm p-1 text-text-muted hover:text-text">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="min-w-0 truncate text-base font-semibold" title={project.title}>
          {project.title}
        </h1>
        <p role="status" className={cn("hidden shrink-0 text-xs sm:block", save.className)}>
          {save.text}
        </p>
        <div className="ml-auto">
          <ExportDialog
            projectId={project.id}
            title={project.title}
            doc={doc}
            edl={edl}
            words={words}
            speakers={project.speakers}
            isSaved={saveStatus === "saved"}
          />
        </div>
      </header>

      <div className="relative flex min-h-0 grow">
        <ToolRail activeTool={tool} onToolChange={setTool} />
        {tool && (
          <SidePanel
            title={PANEL_TITLE[tool]}
            onClose={() => setTool(null)}
            className="absolute inset-y-0 left-(--layout-tool-rail-width) right-0 z-20 overflow-y-auto shadow-pop max-md:w-auto md:static md:shadow-none"
          >
            {tool === "add" && <UploadPanel projectId={project.id} language={language} onLanguageChange={setLanguage} />}
            {tool === "placeholder" && (
              <PlaceholderForm onAdd={(label) => history.apply(appendPlaceholder(doc, crypto.randomUUID(), label))} />
            )}
            {tool === "filters" && (
              <div className="flex flex-col gap-4">
                <Switch label="Mejorar la voz" checked={false} onCheckedChange={() => undefined} disabled />
                <Slider label="Intensidad" value={70} onValueChange={() => undefined} disabled />
                <p className="text-xs text-text-muted">
                  La mejora de voz (DeepFilterNet) todavía no está instalada en el worker.
                </p>
              </div>
            )}
            {tool === "music" && (
              <EmptyState
                icon={FileAudio}
                title="Biblioteca vacía"
                description="La biblioteca de música propia o CC0 todavía no está disponible."
              />
            )}
          </SidePanel>
        )}

        <main className="flex min-w-0 grow flex-col">
          <div className="grow overflow-y-auto">
            <div className="mx-auto flex w-full max-w-(--layout-transcript-max-width) flex-col gap-4 px-4 py-6">
              <JobsPanel key={jobsKey} projectId={project.id} initialJobs={project.jobs} />
              {audio.state === "error" && (
                <Notice tone="warning" title="No se pudo cargar el audio">
                  La transcripción se puede editar, pero la reproducción no tendrá sonido. Recarga la página.
                </Notice>
              )}
              {recording.uploadProgress !== null && <ProgressBar label="Guardando la grabación" value={recording.uploadProgress} />}
              {(recording.uploadError ?? recorder.error) && (
                <Notice tone="error" title="Grabación">
                  {recording.uploadError ?? recorder.error}
                </Notice>
              )}
              {hasContent ? (
                <TranscriptEditor
                  doc={doc}
                  words={words}
                  speakers={project.speakers}
                  activeKey={activeKey}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                  onApply={history.apply}
                  onUndo={history.undo}
                  onRedo={history.redo}
                  onSeekKey={seekKey}
                  onTogglePlay={playback.toggle}
                />
              ) : (
                !isProcessing && (
                  <EmptyState
                    icon={FileAudio}
                    title="El episodio está vacío"
                    description="Sube un audio o un vídeo, o graba con el micrófono. La transcripción aparecerá aquí y podrás editar el audio editando el texto."
                    action={<Button onClick={() => setTool("add")}>Añadir audio</Button>}
                  />
                )
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-raised">
            <Transport
              isPlaying={playback.isPlaying}
              current={formatDuration(playback.currentMs)}
              total={formatDuration(edl.totalMs)}
              isDisabled={!hasContent}
              onTogglePlay={playback.toggle}
              onRestart={playback.restart}
              onSkip={playback.skip}
            />
            <div className="flex items-center gap-2 pr-3 sm:pr-4">
              {recorder.state !== "ready" && (
                <Button variant="secondary" size="sm" onClick={() => void recording.stopAndUpload()} leadingIcon={<Square aria-hidden className="size-3.5" />}>
                  <span className="hidden sm:inline">Parar y transcribir</span>
                  <span className="sm:hidden">Parar</span>
                </Button>
              )}
              <RecordButton
                state={recorder.state}
                elapsed={formatDuration(recorder.elapsedMs)}
                disabledReason={recording.uploadProgress !== null ? "Guardando…" : undefined}
                onClick={recording.handleRecordClick}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
