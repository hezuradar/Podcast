import { accessibilityViolations, createProject, expect, test } from "./helpers";

test.describe("S01 project list", () => {
  test("F01-H1 create a project and land in the empty editor", async ({ page }) => {
    await createProject(page, "E2E proyecto vacío");
    await expect(page.getByRole("heading", { name: "El episodio está vacío" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Elegir archivo" })).toBeVisible();
  });

  test("F01-E2 a 60+ character title is truncated in the editor header at 390 px, not overflowing", async ({ page }) => {
    const title = "Un título muy largo para comprobar que la cabecera no se rompe nunca jamás";
    await createProject(page, title);
    await page.setViewportSize({ width: 390, height: 844 });
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveAttribute("title", title);
    expect(await heading.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true); // ellipsis
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await expect(page.getByRole("button", { name: "Exportar" })).toBeInViewport();
  });

  test("F01-N1 an unsupported file is rejected with a clear message", async ({ page }) => {
    await createProject(page, "E2E archivo no válido");
    await page.locator('input[type="file"]').setInputFiles({ name: "notas.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") });
    await expect(page.getByRole("alert").filter({ hasText: "notas.pdf" })).toContainText("no es un audio ni un vídeo admitido");
  });

  test("delete a project asks first and then removes it", async ({ page }) => {
    const id = await createProject(page, "E2E para borrar");
    await page.goto("/");
    const card = page.getByRole("article").filter({ has: page.locator(`a[href="/projects/${id}"]`) });
    await card.getByRole("button", { name: /Opciones de/ }).click();
    await page.getByRole("menuitem", { name: "Borrar" }).click();
    await card.getByRole("button", { name: "Borrar", exact: true }).click();
    await expect(page.locator(`a[href="/projects/${id}"]`)).toHaveCount(0);
  });

  test("home page has no WCAG A/AA violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Tus episodios" })).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test("home page works at 390 px without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(scrolls).toBe(false);
  });
});
