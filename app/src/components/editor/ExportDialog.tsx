"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/overlays";
import type { EditDoc } from "@/lib/doc/types";
import type { Edl, WordMap } from "@/lib/edl/edl";
import { formatDuration } from "@/lib/format";

type ExportDialogProps = {
  title: string;
  doc: EditDoc;
  edl: Edl;
  words: WordMap;
  speakers: ReadonlyArray<{ id: string; label: string }>;
};

function slug(text: string): string {
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "episodio";
}

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Plain-text transcript of the edited episode: one paragraph per block, with the speaker name. */
export function transcriptToText(doc: EditDoc, words: WordMap, speakers: ExportDialogProps["speakers"]): string {
  return doc.blocks
    .map((block) => {
      if (block.type === "placeholder") return `[Marcador: ${block.label}]`;
      const speaker = speakers.find((s) => s.id === block.speakerId)?.label ?? "Voz";
      const text = block.words.map((ref) => ref.text ?? words.get(ref.w)?.text ?? "").join(" ");
      return `${speaker}: ${text}`;
    })
    .join("\n\n");
}

export function ExportDialog({ title, doc, edl, words, speakers }: ExportDialogProps) {
  const base = slug(title);
  const cuts = Math.max(edl.segments.length - 1, 0);
  const isEmpty = edl.segments.length === 0;

  return (
    <Dialog
      trigger={<Button size="sm">Exportar</Button>}
      title="Exportar episodio"
      description={`Versión actual: ${formatDuration(edl.totalMs)} · ${cuts} ${cuts === 1 ? "corte" : "cortes"}`}
    >
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          disabled={isEmpty}
          leadingIcon={<FileText aria-hidden className="size-4" />}
          onClick={() => download(`${base}.txt`, transcriptToText(doc, words, speakers), "text/plain;charset=utf-8")}
        >
          Transcripción (.txt)
        </Button>
        <Button
          variant="secondary"
          disabled={isEmpty}
          leadingIcon={<Download aria-hidden className="size-4" />}
          onClick={() => download(`${base}-cortes.json`, JSON.stringify(edl, null, 2), "application/json")}
        >
          Lista de cortes (.json)
        </Button>
        <Button disabled leadingIcon={<Download aria-hidden className="size-4" />}>
          Audio MP3
        </Button>
      </div>
      <Notice tone="warning" title="El audio llega con el motor de procesado">
        Exportar MP3 o WAV necesita el worker de ffmpeg, que se monta en el siguiente paso.
      </Notice>
    </Dialog>
  );
}
