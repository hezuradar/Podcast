import { describe, expect, test } from "vitest";
import { buildEdl, keyAtTime, timeOfKey } from "./edl";
import type { EditDoc, Word } from "../doc/types";

// Source audio a1: five words, 500 ms each with 100 ms gaps.
const WORDS: Word[] = [0, 1, 2, 3, 4].map((idx) => ({
  id: `w${idx}`,
  assetId: "a1",
  idx,
  text: `word${idx}`,
  startMs: idx * 600,
  endMs: idx * 600 + 500,
  speakerId: null,
}));
const BY_ID = new Map(WORDS.map((word) => [word.id, word]));

function docOf(wordIds: string[]): EditDoc {
  return {
    blocks: [
      { id: "b", type: "speech", assetId: "a1", speakerId: null, words: wordIds.map((w, i) => ({ k: `k${i}`, w })) },
    ],
  };
}

describe("buildEdl", () => {
  test("an untouched transcript is one segment covering the whole source", () => {
    const edl = buildEdl(docOf(["w0", "w1", "w2", "w3", "w4"]), BY_ID);
    expect(edl.segments).toHaveLength(1);
    expect(edl.segments[0]).toMatchObject({ assetId: "a1", inMs: 0, outMs: 2900, startAtMs: 0 });
    expect(edl.totalMs).toBe(2900);
  });

  test("deleting a word splits the audio into two segments with no gap between them", () => {
    const edl = buildEdl(docOf(["w0", "w1", "w3", "w4"]), BY_ID);
    expect(edl.segments.map((s) => [s.inMs, s.outMs, s.startAtMs])).toEqual([
      [0, 1100, 0],
      [1800, 2900, 1100],
    ]);
    expect(edl.totalMs).toBe(2200);
  });

  test("moved words make a new segment even when they are adjacent in the source", () => {
    const edl = buildEdl(docOf(["w2", "w0", "w1"]), BY_ID);
    expect(edl.segments.map((s) => [s.inMs, s.outMs])).toEqual([
      [1200, 1700],
      [0, 1100],
    ]);
  });

  test("words that are missing from the word map are skipped, not crashed on", () => {
    const edl = buildEdl(docOf(["w0", "ghost", "w1"]), BY_ID);
    expect(edl.segments).toHaveLength(1);
  });

  test("an empty document has no segments and zero length", () => {
    expect(buildEdl({ blocks: [] }, BY_ID)).toEqual({ segments: [], totalMs: 0 });
  });

  test("an untranscribed audio block plays its whole asset", () => {
    const doc: EditDoc = { blocks: [{ id: "x", type: "audio", assetId: "a2" }] };
    const edl = buildEdl(doc, BY_ID, new Map([["a2", 5000]]));
    expect(edl.segments).toEqual([{ assetId: "a2", inMs: 0, outMs: 5000, startAtMs: 0, items: [] }]);
    expect(edl.totalMs).toBe(5000);
  });

  test("audio blocks and transcribed words play in document order", () => {
    const doc: EditDoc = {
      blocks: [
        { id: "x", type: "audio", assetId: "a2" },
        { id: "b", type: "speech", assetId: "a1", speakerId: null, words: [{ k: "k0", w: "w0" }] },
      ],
    };
    const edl = buildEdl(doc, BY_ID, new Map([["a2", 1000]]));
    expect(edl.segments.map((s) => [s.assetId, s.inMs, s.outMs, s.startAtMs])).toEqual([
      ["a2", 0, 1000, 0],
      ["a1", 0, 500, 1000],
    ]);
  });

  test("an audio block whose duration is unknown is skipped", () => {
    const doc: EditDoc = { blocks: [{ id: "x", type: "audio", assetId: "a3" }] };
    expect(buildEdl(doc, BY_ID).segments).toEqual([]);
  });
});

describe("keyAtTime and timeOfKey", () => {
  const edl = buildEdl(docOf(["w0", "w1", "w3", "w4"]), BY_ID);

  test("finds the word playing at a time on the edited timeline", () => {
    expect(keyAtTime(edl, BY_ID, 0)).toBe("k0");
    expect(keyAtTime(edl, BY_ID, 700)).toBe("k1");
    // 1100 ms into the edit is the start of the second segment, source 1800 ms = w3.
    expect(keyAtTime(edl, BY_ID, 1150)).toBe("k2");
  });

  test("in a gap between words it keeps the previous word", () => {
    expect(keyAtTime(edl, BY_ID, 550)).toBe("k0");
  });

  test("outside the timeline there is no word", () => {
    expect(keyAtTime(edl, BY_ID, -1)).toBeNull();
    expect(keyAtTime(edl, BY_ID, 99999)).toBeNull();
  });

  test("timeOfKey is where that word starts on the edited timeline", () => {
    expect(timeOfKey(edl, BY_ID, "k0")).toBe(0);
    expect(timeOfKey(edl, BY_ID, "k2")).toBe(1100);
    expect(timeOfKey(edl, BY_ID, "k3")).toBe(1700);
    expect(timeOfKey(edl, BY_ID, "nope")).toBeNull();
  });
});
