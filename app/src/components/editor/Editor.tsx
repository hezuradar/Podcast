"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, FileAudio } from "lucide-react";
import { Button, RecordButton } from "@/components/ui/Button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Slider, Switch } from "@/components/ui/form-controls";
import { SidePanel, ToolRail, Transport, type ToolId } from "@/components/editor/editor-chrome";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { TranscriptEditor } from "@/components/editor/TranscriptEditor";
import { UploadPanel } from "@/components/editor/UploadPanel";
import { useAutosave, type SaveStatus } from "@/components/editor/useAutosave";
import { useEditHistory } from "@/components/editor/useEditHistory";
import { usePlayback } from "@/components/editor/usePlayback";
import { appendPlaceholder } from "@/lib/doc/operations";
import { buildEdl, keyAtTime, timeOfKey } from "@/lib/edl/edl";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProjectDetail } from "@/lib/data/projects";

const SAVE_LABEL: Record<SaveStatus, { text: string; className: string }> = {
  saved: { text: "Guardado", className: "text-text-muted" },
  saving: { text: "Guardando…", className: "text-text-muted" },
  error: { text: "No se pudo guardar", className: "text-danger" },
  conflict: { text: "Cambiado en otra pestaña: recarga la página", className: "text-warning" },
};

const PANEL_TITLE: Record<ToolId, string> = { add: "Añadir audio", music: "Música", placeholder: "Marcador", filters: "Filtros" };

export function Editor({ project }: { project: ProjectDetail }) {
  const history = useEditHistory(project.doc);
  const { doc } = history;
  const words = useMemo(() => new Map(project.words.map((word) => [word.id, word])), [project.words]);
  const edl = useMemo(() => buildEdl(doc, words), [doc, words]);
  const playback = usePlayback(edl.totalMs);
  const saveStatus = useAutosave(project.id, doc, project.docVersion);
  const [tool, setTool] = useState<ToolId | null>(doc.blocks.length === 0 ? "add" : null);
  const [placeholderLabel, setPlaceholderLabel] = useState("");

  const hasMoved = playback.isPlaying || playback.currentMs > 0;
  const activeKey = hasMoved ? keyAtTime(edl, words, playback.currentMs) : null;
  const hasContent = doc.blocks.length > 0;
  const save = SAVE_LABEL[saveStatus];

  const seekKey = (key: string) => {
    const time = timeOfKey(edl, words, key);
    if (time !== null) playback.seek(time);
  };

  const addPlaceholder = () => {
    if (!placeholderLabel.trim()) return;
    history.apply(appendPlaceholder(doc, crypto.randomUUID(), placeholderLabel));
    setPlaceholderLabel("");
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
          <ExportDialog title={project.title} doc={doc} edl={edl} words={words} speakers={project.speakers} />
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
            {tool === "add" && <UploadPanel projectId={project.id} />}
            {tool === "placeholder" && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  addPlaceholder();
                }}
              >
                <label htmlFor="placeholder-label" className="text-sm font-semibold">
                  Nombre del marcador
                </label>
                <input
                  id="placeholder-label"
                  value={placeholderLabel}
                  maxLength={200}
                  onChange={(event) => setPlaceholderLabel(event.target.value)}
                  placeholder="Por ejemplo: pregunta sobre AGVs"
                  className="focus-ring h-10 rounded-md border border-border-input bg-bg px-3 text-sm"
                />
                <Button type="submit" disabled={!placeholderLabel.trim()} leadingIcon={<Bookmark aria-hidden className="size-4" />}>
                  Añadir al final
                </Button>
              </form>
            )}
            {tool === "filters" && (
              <div className="flex flex-col gap-4">
                <Switch label="Mejorar la voz" checked={false} onCheckedChange={() => undefined} disabled />
                <Slider label="Intensidad" value={70} onValueChange={() => undefined} disabled />
                <p className="text-xs text-text-muted">La mejora de voz se activa cuando esté montado el motor de audio.</p>
              </div>
            )}
            {tool === "music" && (
              <EmptyState
                icon={FileAudio}
                title="Biblioteca vacía"
                description="Podrás subir música propia o con licencia CC0 cuando esté montado el motor de audio."
              />
            )}
          </SidePanel>
        )}

        <main className="flex min-w-0 grow flex-col">
          <div className="grow overflow-y-auto">
            <div className="mx-auto flex w-full max-w-(--layout-transcript-max-width) flex-col gap-4 px-4 py-6">
              {project.isDemoTranscript && hasContent && (
                <Notice tone="info" title="Transcripción de ejemplo">
                  Sin audio real todavía: el reproductor avanza solo con el reloj.
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
                <EmptyState
                  icon={FileAudio}
                  title="El episodio está vacío"
                  description="Sube un audio o un vídeo para empezar. La transcripción aparecerá aquí y podrás editar el audio editando el texto."
                  action={<Button onClick={() => setTool("add")}>Añadir audio</Button>}
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-surface-raised">
            <Transport
              isPlaying={playback.isPlaying}
              current={formatDuration(playback.currentMs)}
              total={formatDuration(edl.totalMs)}
              isDisabled={!hasContent}
              onTogglePlay={playback.toggle}
              onRestart={playback.restart}
              onSkip={playback.skip}
            />
            <div className="hidden pr-4 lg:block">
              <RecordButton state="ready" elapsed="0:00" disabledReason="La grabación llega con el motor de audio" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
