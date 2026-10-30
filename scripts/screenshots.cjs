const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  for (const [label, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const slug of ["index", "resources", "events", "about", "contact"]) {
      await page.goto(`http://127.0.0.1:4173/${slug}.html`);
      await page
        .locator("img")
        .evaluateAll((images) =>
          images.forEach((image) => (image.loading = "eager")),
        );
      await page.waitForFunction(() =>
        [...document.images].every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      );
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `docs/screenshots/${slug}-${label}.png`,
        fullPage: true,
      });
      if (slug === "index")
        await page.screenshot({
          path: `docs/screenshots/home-${label}-viewport.png`,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:4173/resources.html");
  await page.locator("[data-lang=es]").click();
  await page
    .locator("img")
    .evaluateAll((images) =>
      images.forEach((image) => (image.loading = "eager")),
    );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/screenshots/resources-spanish.png",
    fullPage: true,
  });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
