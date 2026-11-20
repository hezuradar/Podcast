"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice, ProgressBar } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/overlays";
import type { EditDoc } from "@/lib/doc/types";
import type { Edl, WordMap } from "@/lib/edl/edl";
import { formatDuration } from "@/lib/format";

type Speaker = { id: string; label: string };

type ExportDialogProps = {
  projectId: string;
  title: string;
  doc: EditDoc;
  edl: Edl;
  words: WordMap;
  speakers: ReadonlyArray<Speaker>;
  /** Audio export renders the saved document, so it waits until the latest edit is saved. */
  isSaved: boolean;
  /** One line saying whether the export carries the enhanced voice. */
  enhanceNote: string;
  /** Enhancement is on but still processing: audio export waits for it. */
  isEnhancePending: boolean;
};

type AudioExport = { kind: "audio_mp3" | "audio_wav"; status: "working" | "ready" | "error"; id?: string; error?: string };

const POLL_MS = 1000;

function slug(text: string): string {
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "episodio";
}

function clickDownload(href: string, filename = ""): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  clickDownload(url, filename);
  URL.revokeObjectURL(url);
}

/** Plain-text transcript of the edited episode: one paragraph per block, with the speaker name. */
export function transcriptToText(doc: EditDoc, words: WordMap, speakers: ReadonlyArray<Speaker>): string {
  return doc.blocks
    .map((block) => {
      if (block.type === "placeholder") return `[Marcador: ${block.label}]`;
      const speaker = speakers.find((s) => s.id === block.speakerId)?.label ?? "Voz";
      const text = block.words.map((ref) => ref.text ?? words.get(ref.w)?.text ?? "").join(" ");
      return `${speaker}: ${text}`;
    })
    .join("\n\n");
}

async function waitForExport(id: string): Promise<void> {
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const response = await fetch(`/api/exports/${id}`, { cache: "no-store" });
    const body = (await response.json()) as { status?: string; error?: string | null };
    if (body.status === "ready") return;
    if (body.status === "error" || !response.ok) throw new Error(body.error ?? "La exportación falló");
  }
}

export function ExportDialog({
  projectId,
  title,
  doc,
  edl,
  words,
  speakers,
  isSaved,
  enhanceNote,
  isEnhancePending,
}: ExportDialogProps) {
  const [audio, setAudio] = useState<AudioExport | null>(null);
  const base = slug(title);
  const cuts = Math.max(edl.segments.length - 1, 0);
  const isEmpty = edl.segments.length === 0;
  const isWorking = audio?.status === "working";

  const exportAudio = async (kind: AudioExport["kind"]) => {
    setAudio({ kind, status: "working" });
    try {
      const response = await fetch(`/api/projects/${projectId}/exports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const body = (await response.json()) as { exportId?: string; error?: string };
      if (!response.ok || !body.exportId) throw new Error(body.error ?? "No se pudo empezar la exportación");
      await waitForExport(body.exportId);
      setAudio({ kind, status: "ready", id: body.exportId });
      clickDownload(`/api/exports/${body.exportId}/download`);
    } catch (caught) {
      setAudio({ kind, status: "error", error: caught instanceof Error ? caught.message : "La exportación falló" });
    }
  };

  return (
    <Dialog
      trigger={<Button size="sm">Exportar</Button>}
      title="Exportar episodio"
      description={`Versión actual: ${formatDuration(edl.totalMs)} · ${cuts} ${cuts === 1 ? "corte" : "cortes"}`}
      isBusy={isWorking}
    >
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={isEmpty || !isSaved || isWorking || isEnhancePending}
          isLoading={isWorking && audio?.kind === "audio_mp3"}
          leadingIcon={<Download aria-hidden className="size-4" />}
          onClick={() => void exportAudio("audio_mp3")}
        >
          Audio MP3
        </Button>
        <Button
          variant="secondary"
          disabled={isEmpty || !isSaved || isWorking || isEnhancePending}
          isLoading={isWorking && audio?.kind === "audio_wav"}
          leadingIcon={<Download aria-hidden className="size-4" />}
          onClick={() => void exportAudio("audio_wav")}
        >
          Audio WAV
        </Button>
        <Button
          variant="secondary"
          disabled={isEmpty}
          className="col-span-2"
          leadingIcon={<FileText aria-hidden className="size-4" />}
          onClick={() => downloadText(`${base}.txt`, transcriptToText(doc, words, speakers), "text/plain;charset=utf-8")}
        >
          Transcripción (.txt)
        </Button>
      </div>
      <p className="text-xs text-text-muted">{enhanceNote}</p>
      {!isSaved && <p className="text-xs text-text-muted">Guardando los últimos cambios…</p>}
      {isWorking && <ProgressBar label="Generando el audio en tu equipo" />}
      {audio?.status === "ready" && audio.id && (
        <Notice tone="success" title="Exportación lista">
          Si la descarga no empieza sola,{" "}
          <a className="focus-ring rounded-sm font-semibold text-accent underline" href={`/api/exports/${audio.id}/download`}>
            descárgala aquí
          </a>
          .
        </Notice>
      )}
      {audio?.status === "error" && (
        <Notice tone="error" title="No se pudo exportar">
          {audio.error}
        </Notice>
      )}
    </Dialog>
  );
}
