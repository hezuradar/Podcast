import { isSpeechBlock, type Block, type EditDoc, type WordRef } from "./types";

/** All word refs in document order. */
export function listRefs(doc: EditDoc): WordRef[] {
  return doc.blocks.flatMap((block) => (isSpeechBlock(block) ? block.words : []));
}

/** Removes the words with these instance keys. Empty speech blocks disappear. Never mutates. */
export function deleteWords(doc: EditDoc, keys: ReadonlySet<string>): EditDoc {
  const hasMatch = listRefs(doc).some((ref) => keys.has(ref.k));
  if (!hasMatch) return doc;

  const blocks = doc.blocks.flatMap<Block>((block) => {
    if (!isSpeechBlock(block)) return [block];
    const words = block.words.filter((ref) => !keys.has(ref.k));
    if (words.length === 0) return [];
    return [words.length === block.words.length ? block : { ...block, words }];
  });
  return { ...doc, blocks };
}

/** Like deleteWords, and returns the removed refs (document order) for a later paste. */
export function cutWords(doc: EditDoc, keys: ReadonlySet<string>): { doc: EditDoc; clip: WordRef[] } {
  const clip = listRefs(doc).filter((ref) => keys.has(ref.k));
  return { doc: deleteWords(doc, keys), clip };
}

type NewBlock = { assetId: string; blockId: string };

/**
 * Inserts the clip after the word `afterKey` (or at the start of the first speech block when null).
 * Each pasted word gets a fresh key from `newKey`. With no speech block at all, `newBlock` creates one.
 */
export function pasteWords(
  doc: EditDoc,
  clip: ReadonlyArray<WordRef>,
  afterKey: string | null,
  newKey: () => string,
  newBlock?: NewBlock,
): EditDoc {
  if (clip.length === 0) return doc;
  const pasted = clip.map((ref) => ({ ...ref, k: newKey() }));

  const targetIndex =
    afterKey === null
      ? doc.blocks.findIndex(isSpeechBlock)
      : doc.blocks.findIndex((block) => isSpeechBlock(block) && block.words.some((ref) => ref.k === afterKey));

  if (targetIndex === -1) {
    if (afterKey !== null || !newBlock) return doc;
    const block: Block = { id: newBlock.blockId, type: "speech", assetId: newBlock.assetId, speakerId: null, words: pasted };
    return { ...doc, blocks: [block, ...doc.blocks] };
  }

  const blocks = doc.blocks.map((block, index) => {
    if (index !== targetIndex || !isSpeechBlock(block)) return block;
    const at = afterKey === null ? 0 : block.words.findIndex((ref) => ref.k === afterKey) + 1;
    return { ...block, words: [...block.words.slice(0, at), ...pasted, ...block.words.slice(at)] };
  });
  return { ...doc, blocks };
}

/** Adds a placeholder block (a slot to record into later) at the end of the episode. */
export function appendPlaceholder(doc: EditDoc, id: string, label: string): EditDoc {
  const clean = label.trim();
  if (clean.length === 0) throw new Error("A placeholder needs a label");
  return { ...doc, blocks: [...doc.blocks, { id, type: "placeholder", label: clean }] };
}

/** Changes how a word reads, never where its audio is. */
export function correctWord(doc: EditDoc, key: string, text: string): EditDoc {
  const clean = text.trim();
  if (clean.length === 0) throw new Error("A correction cannot be empty");

  const blocks = doc.blocks.map((block) => {
    if (!isSpeechBlock(block) || !block.words.some((ref) => ref.k === key)) return block;
    return { ...block, words: block.words.map((ref) => (ref.k === key ? { ...ref, text: clean } : ref)) };
  });
  return { ...doc, blocks };
}
