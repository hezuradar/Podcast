"use client";

import { useState, type ReactNode } from "react";
import { FileAudio, Music4, Upload } from "lucide-react";
import { Button, RecordButton } from "@/components/ui/Button";
import { Checkbox, Select, Slider, Switch } from "@/components/ui/form-controls";
import { CorrectWordPopover, Dialog, Menu } from "@/components/ui/overlays";
import { EmptyState, Notice, ProgressBar, Skeleton } from "@/components/ui/feedback";
import { DropZone, SidePanel, ToolRail, Transport, type ToolId } from "@/components/editor/editor-chrome";
import {
  MusicBlock,
  PlaceholderBlock,
  SpeechBlock,
  TranscribingBlock,
  WordToken,
  type DemoWord,
} from "@/components/editor/transcript";
import { ProjectCard } from "@/components/projects/ProjectCard";

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Portugués" },
] as const;

function toWords(text: string, prefix: string, overrides: Record<number, Partial<DemoWord>> = {}): DemoWord[] {
  return text.split(" ").map((word, index) => ({ id: `${prefix}-${index}`, text: word, ...overrides[index] }));
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-lg">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ButtonsSection() {
  return (
    <Section id="buttons" title="Botones">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Exportar</Button>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="ghost">Ver más</Button>
        <Button variant="danger">Borrar proyecto</Button>
        <Button isLoading>Transcribiendo</Button>
        <Button disabled>Desactivado</Button>
        <Button size="sm" variant="secondary" leadingIcon={<Upload aria-hidden className="size-4" />}>
          Subir
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-10">
        <RecordButton state="ready" elapsed="00:00" />
        <RecordButton state="recording" elapsed="03:41" />
        <RecordButton state="paused" elapsed="03:41" />
        <RecordButton state="ready" elapsed="00:00" disabledReason="No hay permiso para usar el micrófono" />
      </div>
    </Section>
  );
}

function FormsSection() {
  const [detectSpeakers, setDetectSpeakers] = useState(true);
  return (
    <Section id="forms" title="Formulario: Transcribir (S04)">
      <div className="grid max-w-md gap-4">
        <Select label="Idioma del audio" options={LANGUAGES} defaultValue="es" />
        <Checkbox
          label="Detectar hablantes"
          hint="Separa la transcripción por persona. Tarda un poco más."
          checked={detectSpeakers}
          onCheckedChange={setDetectSpeakers}
        />
        <Select label="Formato" options={[{ value: "mp3", label: "MP3" }]} error="Elige un formato" />
      </div>
    </Section>
  );
}

function OverlaysSection() {
  return (
    <Section id="overlays" title="Diálogos y menús">
      <div className="flex flex-wrap items-center gap-3">
        <Dialog
          trigger={<Button>Exportar…</Button>}
          title="Exportar episodio"
          description="Se exporta la versión actual del documento."
          footer={
            <>
              <Button variant="ghost">Cancelar</Button>
              <Button>Exportar MP3</Button>
            </>
          }
        >
          <Select label="Formato" options={[{ value: "mp3", label: "Audio MP3" }, { value: "wav", label: "Audio WAV" }]} />
          <ProgressBar label="Renderizando" value={0.42} />
        </Dialog>
        <Menu
          label="Opciones del bloque"
          items={[
            { label: "Fundido de entrada", onSelect: () => undefined },
            { label: "Sonar bajo la siguiente voz", onSelect: () => undefined },
            { label: "Quitar del episodio", onSelect: () => undefined, isDanger: true },
          ]}
        />
      </div>
    </Section>
  );
}

function FeedbackSection() {
  return (
    <Section id="feedback" title="Estados y avisos">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Notice tone="success" title="Exportación lista">
            episodio-12.mp3 · 24 MB
          </Notice>
          <Notice tone="warning" title="Audio largo">
            Transcribir 90 minutos en CPU tardará cerca de una hora.
          </Notice>
          <Notice tone="error" title="No se pudo transcribir" action={<Button size="sm" variant="secondary">Reintentar</Button>}>
            El archivo no tiene pista de audio.
          </Notice>
        </div>
        <div className="flex flex-col gap-5">
          <ProgressBar label="Subiendo entrevista.wav" value={0.68} />
          <ProgressBar label="Preparando audio" />
          <div aria-busy="true" className="flex flex-col gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
          <EmptyState
            icon={FileAudio}
            title="Todavía no hay proyectos"
            description="Crea uno y sube un audio o graba directamente."
            action={<Button>Nuevo proyecto</Button>}
          />
        </div>
      </div>
    </Section>
  );
}

function ProjectsSection() {
  return (
    <Section id="projects" title="Lista de proyectos (S01)">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCard href="/design" title="Episodio 12 · Intralogística" updated="hace 2 horas" duration="42:10" />
        <ProjectCard href="/design" title="Entrevista Oñati" updated="ayer" duration="18:05" isProcessing />
        <ProjectCard href="/design" title="Piloto" updated="12 nov" duration="05:31" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DropZone state="idle" />
        <DropZone state="drag-over" />
        <DropZone state="error" errorMessage="Este archivo pesa 6,2 GB. El máximo es 5 GB." />
      </div>
    </Section>
  );
}

const BLOCK_ONE = toWords("Bienvenidos a un nuevo episodio. Hoy hablamos de almacenes automáticos y de cómo eh se diseña un sistema de picking.", "b1", {
  4: { state: "active" },
  12: { state: "selected", isLowConfidence: true },
});
const BLOCK_TWO = toWords("Gracias por invitarme. En Oñati llevamos años trabajando en esto.", "b2", { 4: { isCorrected: true } });

function EditorPreview() {
  const [tool, setTool] = useState<ToolId | null>("filters");
  const [isEnhanced, setIsEnhanced] = useState(true);
  const [strength, setStrength] = useState(70);
  const [isPlaying, setIsPlaying] = useState(true);
  const [corrected, setCorrected] = useState("Oñati");

  const renderWord = (word: DemoWord) =>
    word.id === "b2-4" ? (
      <CorrectWordPopover word={corrected} onSave={setCorrected}>
        <button type="button" className="focus-ring rounded-sm" aria-label={`Corregir "${corrected}"`}>
          <WordToken word={{ ...word, text: corrected }} />
        </button>
      </CorrectWordPopover>
    ) : (
      <WordToken word={word} />
    );

  return (
    <Section id="editor" title="Editor (S05 + S09)">
      <div className="overflow-hidden rounded-lg border border-border shadow-card">
        <div className="flex h-(--layout-header-height) items-center justify-between border-b border-border bg-surface-raised px-4">
          <p className="font-semibold">Episodio 12 · Intralogística</p>
          <Button size="sm">Exportar</Button>
        </div>
        <div className="flex min-h-[32rem]">
          <ToolRail activeTool={tool} onToolChange={setTool} />
          {tool === "filters" && (
            <SidePanel title="Filtros" onClose={() => setTool(null)}>
              <Switch label="Mejorar la voz" checked={isEnhanced} onCheckedChange={setIsEnhanced} />
              <Slider label="Intensidad" value={strength} onValueChange={setStrength} disabled={!isEnhanced} />
              <p className="text-xs text-text-muted">Con menos intensidad se conserva más el ambiente de la sala.</p>
            </SidePanel>
          )}
          {tool === "music" && (
            <SidePanel title="Música" onClose={() => setTool(null)}>
              <EmptyState
                icon={Music4}
                title="Tu biblioteca está vacía"
                description="Sube música propia o con licencia CC0."
                action={<Button size="sm" variant="secondary">Subir música</Button>}
              />
            </SidePanel>
          )}
          <div className="flex grow flex-col bg-bg">
            <div className="mx-auto flex w-full max-w-(--layout-transcript-max-width) grow flex-col gap-3 px-6 py-6">
              <MusicBlock title="Intro de guitarra" duration="0:12" fades="entrada 0,5 s · sale bajo la voz" />
              <SpeechBlock speaker="Hablante 1" speakerIndex={0} start="0:12" words={BLOCK_ONE} isPlaying={isPlaying} />
              <SpeechBlock speaker="Hablante 2" speakerIndex={1} start="0:27" words={BLOCK_TWO} renderWord={renderWord} />
              <PlaceholderBlock label="Pregunta sobre AGVs" />
              <TranscribingBlock progress={0.42} />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-raised pr-4">
              <Transport isPlaying={isPlaying} current="00:15" total="42:10" onTogglePlay={() => setIsPlaying((p) => !p)} />
              <RecordButton state="ready" elapsed="00:00" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function DesignPlayground() {
  return (
    <>
      <EditorPreview />
      <ButtonsSection />
      <FormsSection />
      <OverlaysSection />
      <FeedbackSection />
      <ProjectsSection />
    </>
  );
}
