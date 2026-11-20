import { defineConfig } from "vitest/config";

// Unit tests live next to the code (src/**/*.test.ts). e2e/ is Playwright's, run with `npx playwright test`.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
