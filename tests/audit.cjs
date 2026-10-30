const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
  });
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const report = [];
  async function audit(name) {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    report.push({
      scenario: name,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    console.log(name, results.violations.length, "violations");
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const slug of ["index", "resources", "events", "about", "contact"]) {
      await page.goto("http://127.0.0.1:4173/" + slug + ".html");
      await page.evaluate(() => document.fonts.ready);
      await audit(`${slug}-${width}px`);
    }
  }
  await page.goto("http://127.0.0.1:4173/resources.html?resource=metro-health");
  await audit("resource-dialog-mobile");
  await page.keyboard.press("Escape");
  await page.goto("http://127.0.0.1:4173/events.html?event=finance");
  await audit("event-dialog-mobile");
  fs.writeFileSync(
    "docs/accessibility-audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  if (report.some((r) => r.violations.length)) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
