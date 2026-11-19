import { listRefs } from "../doc/operations";
import type { EditDoc, Word, WordRef } from "../doc/types";

/** A continuous range of one source asset, placed at `startAtMs` on the edited timeline. */
export type Segment = {
  assetId: string;
  inMs: number;
  outMs: number;
  startAtMs: number;
  /** The words this segment plays, in order (instance key + source word id). */
  items: Array<Pick<WordRef, "k" | "w">>;
};

export type Edl = { segments: Segment[]; totalMs: number };

export type WordMap = ReadonlyMap<string, Word>;

const lengthOf = (segment: Segment) => segment.outMs - segment.inMs;

/**
 * Turns the edit document into the list of audio ranges to play. Words that are next to each other
 * both in the document and in the source audio are merged into one range, so the pause between them
 * is kept; any cut or move starts a new range. The player and the export renderer share this.
 */
export function buildEdl(doc: EditDoc, words: WordMap): Edl {
  const segments: Segment[] = [];
  let lastIdx = -1;

  for (const ref of listRefs(doc)) {
    const word = words.get(ref.w);
    if (!word) continue;
    const current = segments.at(-1);
    const item = { k: ref.k, w: ref.w };
    const continues = current !== undefined && current.assetId === word.assetId && word.idx === lastIdx + 1;

    if (continues) {
      segments[segments.length - 1] = { ...current, outMs: word.endMs, items: [...current.items, item] };
    } else {
      const startAtMs = current ? current.startAtMs + lengthOf(current) : 0;
      segments.push({ assetId: word.assetId, inMs: word.startMs, outMs: word.endMs, startAtMs, items: [item] });
    }
    lastIdx = word.idx;
  }

  const last = segments.at(-1);
  return { segments, totalMs: last ? last.startAtMs + lengthOf(last) : 0 };
}

/** Instance key of the word heard at `timeMs` of the edited timeline (the previous word in a pause). */
export function keyAtTime(edl: Edl, words: WordMap, timeMs: number): string | null {
  const segment = edl.segments.find((s) => timeMs >= s.startAtMs && timeMs < s.startAtMs + lengthOf(s));
  if (!segment) return null;
  const sourceMs = segment.inMs + (timeMs - segment.startAtMs);

  let found: string | null = segment.items[0]?.k ?? null;
  for (const item of segment.items) {
    const word = words.get(item.w);
    if (!word || word.startMs > sourceMs) break;
    found = item.k;
  }
  return found;
}

/** Where the word with instance key `key` starts on the edited timeline. */
export function timeOfKey(edl: Edl, words: WordMap, key: string): number | null {
  for (const segment of edl.segments) {
    const item = segment.items.find((candidate) => candidate.k === key);
    const word = item ? words.get(item.w) : undefined;
    if (word) return segment.startAtMs + (word.startMs - segment.inMs);
  }
  return null;
}
