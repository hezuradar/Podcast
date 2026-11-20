"use client";

import { Fragment, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Pencil, Redo2, Scissors, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CorrectWordPopover } from "@/components/ui/overlays";
import { PlaceholderBlock, SpeechBlock, type DemoWord } from "@/components/editor/transcript";
import { correctWord, cutWords, listRefs, pasteWords } from "@/lib/doc/operations";
import type { AudioBlock, EditDoc, WordRef } from "@/lib/doc/types";
import type { WordMap } from "@/lib/edl/edl";

type Speaker = { id: string; label: string };
type Range = { anchor: number; focus: number };

type TranscriptEditorProps = {
  doc: EditDoc;
  words: WordMap;
  speakers: ReadonlyArray<Speaker>;
  activeKey: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onApply: (next: EditDoc) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSeekKey: (key: string) => void;
  onTogglePlay: () => void;
  /** Renders an untranscribed audio block (with its Transcribe / Cancel controls). */
  renderAudioBlock: (block: AudioBlock) => ReactNode;
};

const newKey = () => crypto.randomUUID();

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function keyFromNode(node: Node | null): string | undefined {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>("[data-k]")?.dataset.k;
}

export function TranscriptEditor(props: TranscriptEditorProps) {
  const { doc, words, speakers, activeKey, canUndo, canRedo, onApply, onUndo, onRedo, onSeekKey, onTogglePlay, renderAudioBlock } =
    props;
  const [range, setRange] = useState<Range | null>(null);
  const [clipboard, setClipboard] = useState<WordRef[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const refs = useMemo(() => listRefs(doc), [doc]);
  const indexOf = useMemo(() => new Map(refs.map((ref, index) => [ref.k, index])), [refs]);

  const bounds = range && refs.length > 0
    ? {
        lo: Math.min(range.anchor, range.focus, refs.length - 1),
        hi: Math.min(Math.max(range.anchor, range.focus), refs.length - 1),
      }
    : null;
  const selected = bounds ? refs.slice(bounds.lo, bounds.hi + 1) : [];
  const selectedKeys = new Set(selected.map((ref) => ref.k));
  const displayText = (ref: WordRef) => ref.text ?? words.get(ref.w)?.text ?? "";

  const collapseTo = (index: number, total: number) =>
    setRange(total === 0 ? null : { anchor: Math.min(index, total - 1), focus: Math.min(index, total - 1) });

  const removeSelection = (mode: "delete" | "cut") => {
    if (!bounds || selected.length === 0) return;
    const { doc: next, clip } = cutWords(doc, selectedKeys);
    if (mode === "cut") setClipboard(clip);
    onApply(next);
    collapseTo(bounds.lo, refs.length - selected.length);
    setAnnouncement(`${plural(selected.length, "palabra", "palabras")} ${mode === "cut" ? "cortada(s)" : "borrada(s)"}`);
  };

  const paste = () => {
    if (clipboard.length === 0) {
      setAnnouncement("No hay nada que pegar");
      return;
    }
    const afterKey = bounds ? refs[bounds.hi].k : (refs.at(-1)?.k ?? null);
    const assetId = words.get(clipboard[0].w)?.assetId ?? "pasted";
    const next = pasteWords(doc, clipboard, afterKey, newKey, { assetId, blockId: newKey() });
    const start = afterKey === null ? 0 : listRefs(next).findIndex((ref) => ref.k === afterKey) + 1;
    onApply(next);
    setRange({ anchor: start, focus: start + clipboard.length - 1 });
    setAnnouncement(`${plural(clipboard.length, "palabra pegada", "palabras pegadas")}`);
  };

  const moveFocus = (to: number, extend: boolean) => {
    if (refs.length === 0) return;
    const focus = Math.max(0, Math.min(to, refs.length - 1));
    setRange((current) => ({ anchor: extend && current ? current.anchor : focus, focus }));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const focus = range?.focus ?? -1;

    const shortcuts: Record<string, () => void> = {};
    if (mod) {
      shortcuts.z = () => (event.shiftKey ? onRedo() : onUndo());
      shortcuts.y = onRedo;
      shortcuts.x = () => removeSelection("cut");
      shortcuts.c = () => {
        setClipboard(selected);
        setAnnouncement(`${plural(selected.length, "palabra copiada", "palabras copiadas")}`);
      };
      shortcuts.v = paste;
    } else {
      shortcuts.arrowright = () => moveFocus(focus + 1, event.shiftKey);
      shortcuts.arrowleft = () => moveFocus(focus <= 0 ? 0 : focus - 1, event.shiftKey);
      shortcuts.home = () => moveFocus(0, event.shiftKey);
      shortcuts.end = () => moveFocus(refs.length - 1, event.shiftKey);
      shortcuts.backspace = () => removeSelection("delete");
      shortcuts.delete = () => removeSelection("delete");
      shortcuts[" "] = onTogglePlay;
      shortcuts.enter = () => (range ? onSeekKey(refs[range.focus]?.k ?? "") : undefined);
      shortcuts.escape = () => setRange(null);
    }

    const action = shortcuts[key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    containerRef.current?.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const anchor = indexOf.get(keyFromNode(selection.anchorNode) ?? "");
      const focus = indexOf.get(keyFromNode(selection.focusNode) ?? "");
      selection.removeAllRanges();
      if (anchor !== undefined && focus !== undefined) setRange({ anchor, focus });
      return;
    }
    const key = keyFromNode(event.target as Node);
    const index = key ? indexOf.get(key) : undefined;
    if (key && index !== undefined) {
      setRange({ anchor: index, focus: index });
      onSeekKey(key);
    }
  };

  const single = selected.length === 1 ? selected[0] : null;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="toolbar"
        aria-label="Edición del texto"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-raised p-1 shadow-card"
      >
        <Button variant="ghost" size="sm" iconLabel="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
          <Undo2 aria-hidden className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" iconLabel="Rehacer (Ctrl+Y)" disabled={!canRedo} onClick={onRedo}>
          <Redo2 aria-hidden className="size-4" />
        </Button>
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="sm" iconLabel="Cortar (Ctrl+X)" disabled={selected.length === 0} onClick={() => removeSelection("cut")}>
          <Scissors aria-hidden className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" iconLabel="Borrar (Supr)" disabled={selected.length === 0} onClick={() => removeSelection("delete")}>
          <Trash2 aria-hidden className="size-4" />
        </Button>
        {single ? (
          <CorrectWordPopover word={displayText(single)} onSave={(text) => onApply(correctWord(doc, single.k, text))}>
            <Button variant="ghost" size="sm" leadingIcon={<Pencil aria-hidden className="size-4" />}>
              Corregir
            </Button>
          </CorrectWordPopover>
        ) : (
          <Button variant="ghost" size="sm" disabled leadingIcon={<Pencil aria-hidden className="size-4" />}>
            Corregir
          </Button>
        )}
        <span className="ml-auto px-2 text-xs text-text-muted">
          {selected.length > 0 ? plural(selected.length, "palabra seleccionada", "palabras seleccionadas") : "Selecciona texto para editarlo"}
        </span>
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        role="textbox"
        aria-multiline="true"
        aria-label="Transcripción del episodio"
        aria-describedby="transcript-help"
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp}
        className="focus-ring flex flex-col gap-3 rounded-md"
      >
        {doc.blocks.map((block) => {
          if (block.type === "placeholder") return <PlaceholderBlock key={block.id} label={block.label} />;
          if (block.type === "audio") return <Fragment key={block.id}>{renderAudioBlock(block)}</Fragment>;
          const speakerIndex = Math.max(0, speakers.findIndex((s) => s.id === block.speakerId));
          const blockWords: DemoWord[] = block.words.map((ref) => ({
            id: ref.k,
            text: displayText(ref),
            isCorrected: ref.text !== undefined,
            state: selectedKeys.has(ref.k) ? "selected" : ref.k === activeKey ? "active" : "normal",
          }));
          return (
            <SpeechBlock
              key={block.id}
              speaker={speakers[speakerIndex]?.label ?? "Voz"}
              speakerIndex={speakerIndex}
              start=""
              words={blockWords}
              isPlaying={activeKey !== null && block.words.some((ref) => ref.k === activeKey)}
            />
          );
        })}
      </div>

      <p id="transcript-help" className="sr-only">
        Flechas para moverte por palabras, Mayúsculas y flechas para seleccionar, Supr para borrar, Ctrl+X, Ctrl+C y
        Ctrl+V para cortar, copiar y pegar, Ctrl+Z para deshacer, Intro para ir a la palabra y espacio para reproducir.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
