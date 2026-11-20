/** Voice-enhancement rules shared by the server (export) and the browser (playback, panel). */

export const DEFAULT_STRENGTH = 70;

type EnhanceState = {
  assets: ReadonlyArray<{ hasProxy: boolean; enhancedStrength: number | null }>;
  enhance: { enabled: boolean; strength: number };
};

/** True when every processed asset has an enhanced copy made at the current strength. */
export function isEnhanceReady({ assets, enhance }: EnhanceState): boolean {
  const processed = assets.filter((asset) => asset.hasProxy);
  return processed.length > 0 && processed.every((asset) => asset.enhancedStrength === enhance.strength);
}
