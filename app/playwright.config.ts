import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const FAKE_MIC = resolve(__dirname, "e2e/fixtures/voz-prueba.wav");

export default defineConfig({
  testDir: "e2e",
  // Transcription runs on CPU in the worker: the slow flows need minutes, not seconds.
  timeout: 300_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-audio-capture=${FAKE_MIC}`,
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
