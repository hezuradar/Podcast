import { describe, expect, test } from "vitest";
import { appendPlaceholder, correctWord, cutWords, deleteWords, listRefs, pasteWords } from "./operations";
import type { EditDoc } from "./types";

function makeDoc(): EditDoc {
  return {
    blocks: [
      {
        id: "b1",
        type: "speech",
        assetId: "a1",
        speakerId: null,
        words: [
          { k: "k1", w: "w1" },
          { k: "k2", w: "w2" },
          { k: "k3", w: "w3" },
        ],
      },
      { id: "p1", type: "placeholder", label: "Intro" },
      {
        id: "b2",
        type: "speech",
        assetId: "a1",
        speakerId: null,
        words: [
          { k: "k4", w: "w4" },
          { k: "k5", w: "w5" },
        ],
      },
    ],
  };
}

const keys = (doc: EditDoc) => listRefs(doc).map((ref) => ref.k);

describe("listRefs", () => {
  test("returns word refs in document order, skipping non-speech blocks", () => {
    expect(keys(makeDoc())).toEqual(["k1", "k2", "k3", "k4", "k5"]);
  });
});

describe("deleteWords", () => {
  test("removes the given words and keeps the original document unchanged", () => {
    const doc = makeDoc();
    const next = deleteWords(doc, new Set(["k2", "k4"]));
    expect(keys(next)).toEqual(["k1", "k3", "k5"]);
    expect(keys(doc)).toEqual(["k1", "k2", "k3", "k4", "k5"]);
  });

  test("drops a speech block when all its words are deleted, keeps placeholders", () => {
    const next = deleteWords(makeDoc(), new Set(["k4", "k5"]));
    expect(next.blocks.map((block) => block.id)).toEqual(["b1", "p1"]);
  });

  test("returns the same document when nothing matches", () => {
    const doc = makeDoc();
    expect(deleteWords(doc, new Set(["nope"]))).toBe(doc);
  });
});

describe("cutWords and pasteWords", () => {
  test("cut returns the removed refs in document order", () => {
    const { doc, clip } = cutWords(makeDoc(), new Set(["k5", "k1"]));
    expect(clip.map((ref) => ref.k)).toEqual(["k1", "k5"]);
    expect(keys(doc)).toEqual(["k2", "k3", "k4"]);
  });

  test("paste inserts after the given word, keeping the audio references", () => {
    const { doc, clip } = cutWords(makeDoc(), new Set(["k1"]));
    const pasted = pasteWords(doc, clip, "k4", () => "new");
    expect(listRefs(pasted).map((ref) => ref.w)).toEqual(["w2", "w3", "w4", "w1", "w5"]);
  });

  test("paste gives each pasted word a fresh instance key so copies do not collide", () => {
    const doc = makeDoc();
    let n = 0;
    const pasted = pasteWords(doc, [{ k: "k1", w: "w1" }], "k3", () => `copy-${++n}`);
    expect(keys(pasted)).toEqual(["k1", "k2", "k3", "copy-1", "k4", "k5"]);
  });

  test("paste with no anchor inserts at the start of the first speech block", () => {
    const pasted = pasteWords(makeDoc(), [{ k: "x", w: "w9" }], null, () => "x2");
    expect(keys(pasted)[0]).toBe("x2");
  });

  test("paste into a document with no speech blocks creates one", () => {
    const empty: EditDoc = { blocks: [] };
    const pasted = pasteWords(empty, [{ k: "x", w: "w9" }], null, () => "x2", { assetId: "a1", blockId: "nb" });
    expect(pasted.blocks).toEqual([
      { id: "nb", type: "speech", assetId: "a1", speakerId: null, words: [{ k: "x2", w: "w9" }] },
    ]);
  });
});

describe("appendPlaceholder", () => {
  test("adds a placeholder block at the end without touching the words", () => {
    const next = appendPlaceholder(makeDoc(), "p9", "Entrevista");
    expect(next.blocks.at(-1)).toEqual({ id: "p9", type: "placeholder", label: "Entrevista" });
    expect(keys(next)).toEqual(keys(makeDoc()));
  });

  test("an empty label is rejected", () => {
    expect(() => appendPlaceholder(makeDoc(), "p9", " ")).toThrow();
  });
});

describe("correctWord", () => {
  test("sets a text override without touching the audio reference", () => {
    const next = correctWord(makeDoc(), "k2", "Oñati");
    expect(listRefs(next)[1]).toEqual({ k: "k2", w: "w2", text: "Oñati" });
  });

  test("an empty correction is rejected", () => {
    expect(() => correctWord(makeDoc(), "k2", "   ")).toThrow();
  });
});
