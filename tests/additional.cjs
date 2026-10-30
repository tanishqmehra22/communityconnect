const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
  });
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/resources.html");
  await page.locator("[data-share-resource=metro-health]").click();
  await page.waitForFunction(
    () => document.querySelector("#dialog-title")?.textContent === "Share Link",
  );
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /resources.html\?resource=metro-health/);
  await page.keyboard.press("Escape");
  const pending = page.waitForEvent("download");
  await page.locator("[data-info=civic-data]").first().click();
  const download = await pending;
  const records = JSON.parse(fs.readFileSync(await download.path()));
  assert.equal(records.length, 6);
  assert.ok(records.every((r) => r.id && r.phone));
  await page.goto("http://127.0.0.1:4173/contact.html?inquiry=organization");
  assert.notEqual(await page.locator("#category").inputValue(), "");
  assert.match(
    await page.locator("#category option:checked").textContent(),
    /organization/,
  );
  await page.goto("http://127.0.0.1:4173/resources.html");
  await page.evaluate(() => {
    navigator.clipboard.writeText = () =>
      Promise.reject(new Error("Unavailable"));
  });
  await page.locator("[data-share-resource=oak-food]").click();
  const input = page.locator("dialog input[readonly]");
  await input.waitFor();
  assert.match(await input.inputValue(), /oak-food/);
  await browser.close();
  fs.writeFileSync(
    "docs/additional-checks.json",
    JSON.stringify(
      {
        passed: 4,
        checks: [
          "Clipboard share copies the correct resource link",
          "Unavailable clipboard shows a selectable link",
          "Demo JSON download contains six structured records",
          "Organization inquiry preselects the contact category",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log("4 additional interaction checks passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
