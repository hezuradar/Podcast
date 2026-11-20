import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

/** Every test fails on console errors (except dev-server reload noise) and on any 5xx response. */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !/_next\/hmr|WebSocket/.test(message.text())) problems.push(`console: ${message.text()}`);
      });
      page.on("response", (response) => {
        if (response.status() >= 500) problems.push(`HTTP ${response.status()} ${response.url()}`);
      });
      await use(problems);
      expect(problems, "console errors or 5xx responses").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function createProject(page: Page, title: string): Promise<string> {
  await page.goto("/");
  await page.getByLabel("Título del nuevo proyecto").fill(title);
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop() ?? "";
}

/** WCAG 2.1 A/AA scan; returns readable violations so a failure says what is wrong. */
export async function accessibilityViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

export function transcript(page: Page) {
  return page.getByRole("textbox", { name: "Transcripción del episodio" });
}
