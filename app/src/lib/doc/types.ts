/** A word as transcribed. Immutable once written (table `words`). Times in ms of its source asset. */
export type Word = {
  id: string;
  assetId: string;
  /** Position in the source transcript; consecutive idx = consecutive audio. */
  idx: number;
  text: string;
  startMs: number;
  endMs: number;
  speakerId: string | null;
};

/**
 * A word as placed in the edit document. `k` is the instance key (unique in the document, so
 * the same word can be pasted twice), `w` the source word id, `text` an optional correction.
 */
export type WordRef = { k: string; w: string; text?: string };

export type SpeechBlock = {
  id: string;
  type: "speech";
  assetId: string;
  speakerId: string | null;
  words: WordRef[];
};

export type PlaceholderBlock = { id: string; type: "placeholder"; label: string };

export type Block = SpeechBlock | PlaceholderBlock;

/** The edit document stored in projects.doc_json. */
export type EditDoc = { blocks: Block[] };

export function isSpeechBlock(block: Block): block is SpeechBlock {
  return block.type === "speech";
}
