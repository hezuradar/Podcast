import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { accessibilityViolations, createProject, expect, test, transcript } from "./helpers";

const VOICE = resolve(__dirname, "fixtures/voz-prueba.wav");
const RECORDING = resolve(__dirname, "fixtures/grabacion.webm");
const TRANSCRIBE_TIMEOUT = 240_000;

test.describe.configure({ mode: "serial" });

test("F01 + F03 + F07: upload, transcribe, cut a sentence, undo/redo, export MP3", async ({ page }) => {
  await createProject(page, "E2E episodio completo");
  await page.getByLabel("Idioma del audio").selectOption("es");
  await page.locator('input[type="file"]').setInputFiles(VOICE);

  const text = transcript(page);
  await expect(text).toContainText("almacenes", { timeout: TRANSCRIBE_TIMEOUT });
  await expect(text).toContainText("Esta frase sobra");

  // Select "Esta frase sobra y la vamos a borrar." (8 words) with the keyboard and delete it.
  await text.locator("[data-k]", { hasText: /^Esta\s*$/ }).click();
  await page.keyboard.down("Shift");
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.up("Shift");
  await expect(page.getByText("8 palabras seleccionadas")).toBeVisible();
  await page.keyboard.press("Delete");
  await expect(text).not.toContainText("sobra");

  await page.keyboard.press("Control+z");
  await expect(text).toContainText("sobra");
  await page.keyboard.press("Control+y");
  await expect(text).not.toContainText("sobra");
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();

  // The cut survives a reload (saved in SQLite).
  await page.reload();
  await expect(transcript(page)).not.toContainText("sobra");

  expect(await accessibilityViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Exportar" }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Audio MP3" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("E2E episodio completo.mp3");
});

test("F04: correct a word without changing the audio", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "E2E episodio completo" }).first().click();
  const text = transcript(page);
  await text.locator("[data-k]", { hasText: /^prueba\.\s*$/ }).click();
  await page.getByRole("button", { name: "Corregir" }).click();
  const input = page.getByLabel("Corregir palabra (el audio no cambia)");
  await input.fill("ensayo.");
  await input.press("Enter");
  await expect(text).toContainText("episodio de ensayo.");
  await text.focus();
  await page.keyboard.press("Control+z");
  await expect(text).toContainText("episodio de prueba.");
});

test("F02: record with the microphone, stop and get a transcript", async ({ page }) => {
  await createProject(page, "E2E grabación");
  await page.getByRole("button", { name: "Grabar" }).click();
  await expect(page.getByRole("button", { name: "Pausar grabación" })).toBeVisible();
  await page.waitForTimeout(4000); // let the fake microphone play part of the fixture
  await page.getByRole("button", { name: /Parar/ }).click();
  await expect(transcript(page)).toContainText(/\w+/, { timeout: TRANSCRIBE_TIMEOUT });
});

test("recorded WebM/Opus uploads are processed like any upload", async ({ page, request }) => {
  const id = await createProject(page, "E2E webm");
  const response = await request.post(`/api/projects/${id}/assets`, {
    headers: { "x-file-name": "grabacion.webm", "x-language": "es", "x-source": "recording", "content-type": "audio/webm" },
    data: readFileSync(RECORDING),
  });
  expect(response.status()).toBe(201);
  await page.reload();
  await expect(transcript(page)).toContainText("almacenes", { timeout: TRANSCRIBE_TIMEOUT });
});
