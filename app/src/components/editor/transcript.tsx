"use client";

import type { ReactNode } from "react";
import { GripVertical, Music } from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/feedback";

export type WordState = "normal" | "active" | "selected";

export type DemoWord = {
  id: string;
  text: string;
  state?: WordState;
  isCorrected?: boolean;
  isLowConfidence?: boolean;
};

const WORD_STATE: Record<WordState, string> = {
  normal: "",
  active: "bg-word-active text-on-word-active",
  selected: "bg-selection text-on-selection",
};

/** One word of the transcript. In the real editor it is a TipTap node; here it is static text. */
export function WordToken({ word }: { word: DemoWord }) {
  return (
    <span
      data-word-id={word.id}
      className={cn(
        "rounded-sm px-px transition-colors duration-(--duration-fast)",
        WORD_STATE[word.state ?? "normal"],
        word.isCorrected && "underline decoration-dotted decoration-text-muted underline-offset-4",
        word.isLowConfidence && "underline decoration-wavy decoration-text-muted underline-offset-4",
      )}
    >
      {word.text}
    </span>
  );
}

const SPEAKER_COLOR = ["text-speaker-1", "text-speaker-2", "text-speaker-3", "text-speaker-4"] as const;

type BlockShellProps = {
  label: string;
  isPlaying?: boolean;
  tone: "speech" | "music" | "placeholder";
  header: ReactNode;
  children: ReactNode;
};

const TONE: Record<BlockShellProps["tone"], string> = {
  speech: "bg-bg border-transparent hover:border-border",
  music: "bg-block-music text-on-block-music border-transparent",
  placeholder: "bg-block-placeholder text-on-block-placeholder border-dashed border-on-block-placeholder/40",
};

function BlockShell({ label, isPlaying, tone, header, children }: BlockShellProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        "group relative rounded-md border p-4 pl-10 transition-colors duration-(--duration-fast)",
        TONE[tone],
        isPlaying && "before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-pill before:bg-accent",
      )}
    >
      <button
        type="button"
        aria-label={`Mover bloque: ${label}`}
        className="focus-ring absolute top-4 left-2 rounded-sm text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      <div className="mb-2 flex items-center gap-2 text-xs">{header}</div>
      {children}
    </section>
  );
}

type SpeechBlockProps = {
  speaker: string;
  speakerIndex: number;
  start: string;
  words: ReadonlyArray<DemoWord>;
  isPlaying?: boolean;
  renderWord?: (word: DemoWord) => ReactNode;
};

export function SpeechBlock({ speaker, speakerIndex, start, words, isPlaying, renderWord }: SpeechBlockProps) {
  const speakerColor = SPEAKER_COLOR[speakerIndex % SPEAKER_COLOR.length];
  return (
    <BlockShell
      label={`${speaker}, ${start}`}
      tone="speech"
      isPlaying={isPlaying}
      header={
        <>
          <span className={cn("font-semibold", speakerColor)}>{speaker}</span>
          <span className="font-mono text-text-muted tabular-nums">{start}</span>
        </>
      }
    >
      <p className="font-transcript text-transcript text-pretty">
        {words.map((word, index) => (
          // data-k lets the editor map a text selection (including the trailing space) back to the word.
          <span key={word.id} data-k={word.id}>
            {renderWord ? renderWord(word) : <WordToken word={word} />}
            {index < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    </BlockShell>
  );
}

type MusicBlockProps = { title: string; duration: string; fades: string };

export function MusicBlock({ title, duration, fades }: MusicBlockProps) {
  return (
    <BlockShell
      label={`Música: ${title}`}
      tone="music"
      header={
        <>
          <Music aria-hidden className="size-3.5" />
          <span className="font-semibold">Música</span>
          <span className="font-mono tabular-nums">{duration}</span>
        </>
      }
    >
      <p className="text-sm">
        {title} <span className="opacity-80">· {fades}</span>
      </p>
    </BlockShell>
  );
}

export function PlaceholderBlock({ label }: { label: string }) {
  return (
    <BlockShell label={`Marcador: ${label}`} tone="placeholder" header={<span className="font-semibold">Marcador</span>}>
      <p className="text-sm">{label} · graba aquí o arrastra un audio</p>
    </BlockShell>
  );
}

export function TranscribingBlock({ progress }: { progress: number }) {
  return (
    <section aria-busy="true" aria-label="Transcribiendo" className="rounded-md border border-border p-4 pl-10">
      <p className="mb-3 text-xs text-text-muted">Transcribiendo… {Math.round(progress * 100)} %</p>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </section>
  );
}
