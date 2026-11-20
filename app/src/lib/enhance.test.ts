import { describe, expect, test } from "vitest";
import { isEnhanceReady } from "./enhance";

const asset = (hasProxy: boolean, enhancedStrength: number | null) => ({ hasProxy, enhancedStrength });

describe("isEnhanceReady", () => {
  test("ready when every processed asset was enhanced at the current strength", () => {
    expect(isEnhanceReady({ assets: [asset(true, 70), asset(true, 70)], enhance: { enabled: true, strength: 70 } })).toBe(true);
  });

  test("not ready while one asset still has an old strength or none", () => {
    expect(isEnhanceReady({ assets: [asset(true, 70), asset(true, 40)], enhance: { enabled: true, strength: 70 } })).toBe(false);
    expect(isEnhanceReady({ assets: [asset(true, null)], enhance: { enabled: true, strength: 70 } })).toBe(false);
  });

  test("assets still being prepared do not block, but a project with no audio is not ready", () => {
    expect(isEnhanceReady({ assets: [asset(true, 70), asset(false, null)], enhance: { enabled: true, strength: 70 } })).toBe(true);
    expect(isEnhanceReady({ assets: [], enhance: { enabled: true, strength: 70 } })).toBe(false);
  });
});
