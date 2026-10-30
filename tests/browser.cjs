/* Run against npm start. Uses an installed Chrome by default; set PLAYWRIGHT_CHANNEL=chromium for Playwright's browser. */
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
      headless: true,
      channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    }),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  let checks = 0;
  const errors = [],
    failed = [],
    report = [];
  const base = process.env.TEST_URL || "http://127.0.0.1:4173";
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  page.on("requestfailed", (r) => failed.push(r.url()));
  async function check(name, run) {
    await run();
    checks++;
    report.push(name);
    console.log("PASS", name);
  }
  const visit = async (name) => {
    await page.goto(`${base}/${name}.html`);
    await page.evaluate(() => document.fonts.ready);
  };
  await check(
    "all five pages load local assets, have one main landmark, correct active navigation, and no overflow",
    async () => {
      for (const slug of ["index", "resources", "events", "about", "contact"]) {
        await visit(slug);
        assert.equal(await page.locator("main").count(), 1);
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(
          await page
            .locator(".desktop-nav a[aria-current=page]")
            .getAttribute("href"),
          slug + ".html",
        );
        await page
          .locator("img")
          .evaluateAll((images) =>
            images.forEach((i) => (i.loading = "eager")),
          );
        await page.waitForFunction(() =>
          [...document.images].every((i) => i.complete && i.naturalWidth > 0),
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        assert.equal(
          await page
            .locator('script[src^="https"],link[href^="https"]')
            .count(),
          0,
        );
      }
    },
  );
  await check("every local link and fragment resolves", async () => {
    for (const slug of ["index", "resources", "events", "about", "contact"]) {
      await visit(slug);
      const links = await page
        .locator("a[href]")
        .evaluateAll((as) =>
          as.map((a) => ({
            href: a.getAttribute("href"),
            info: a.hasAttribute("data-info"),
            print: a.hasAttribute("data-print"),
          })),
        );
      for (const { href, info, print } of links) {
        if (info || print) continue;
        const url = new URL(href, `${base}/${slug}.html`);
        if (url.origin !== base) continue;
        const response = await context.request.get(url.href);
        assert.equal(response.ok(), true, href);
        if (url.hash) {
          const html = await response.text();
          assert.ok(html.includes(`id="${url.hash.slice(1)}"`), href);
        }
      }
    }
  });
  await check(
    "home search carries query and neighborhood to resource results",
    async () => {
      await visit("index");
      await page.locator("#search-input").fill("food");
      await page.locator("#ward-selector").selectOption("northside");
      await page.locator("#hero-search-form button[type=submit]").click();
      await page.waitForURL(/resources.html/);
      assert.equal(await page.locator(".resource-card").count(), 1);
      assert.match(page.url(), /ward=northside/);
      assert.match(
        await page.locator(".resource-card").textContent(),
        /Oak Street/,
      );
    },
  );
  await check(
    "result summary, category counts, and grid agree under combined filters and reset",
    async () => {
      const state = async () => ({
        cards: await page.locator(".resource-card").count(),
        summary: (await page.locator("#resource-count").textContent()).trim(),
        inline: (
          await page.locator("#inline-resource-count").textContent()
        ).trim(),
        all: (await page.locator("[data-cat=all]").textContent()).trim(),
      });
      await page.goto(`${base}/resources.html?ward=downtown`);
      await page.evaluate(() => localStorage.setItem("communityconnect.language", "en"));
      await page.reload();
      let s = await state();
      assert.equal(s.cards, 3);
      assert.match(s.summary, /^3 of 6 demo programs/);
      assert.equal(s.inline, s.summary);
      assert.match(s.all, /All Services \(3\)/);
      assert.equal(await page.locator("#ward-chip").isVisible(), true);
      assert.match(
        await page.locator("#ward-chip").textContent(),
        /Downtown Core/,
      );
      await page.locator("[data-cat=housing]").click();
      s = await state();
      assert.equal(s.cards, 1);
      assert.match(s.summary, /^1 of 6 demo programs/);
      assert.match(s.all, /\(3\)/);
      await page.locator("#filter-distance").selectOption({ index: 1 });
      s = await state();
      assert.equal(
        s.summary.startsWith(`${s.cards} of 6`),
        true,
        "summary matches grid after distance filter",
      );
      await page.locator("#reset-filters-btn").click();
      s = await state();
      assert.equal(s.cards, 6);
      assert.match(s.all, /All Services \(6\)/);
      assert.equal(await page.locator("#ward-chip").isVisible(), false);
      await page.goto(`${base}/resources.html?ward=riverside`);
      await page.locator("#ward-chip").click();
      assert.equal(await page.locator(".resource-card").count(), 6);
      assert.doesNotMatch(page.url(), /ward=/);
    },
  );
  await check(
    "category filters, search empty state, reset, and clear search work",
    async () => {
      await visit("resources");
      await page.locator("[data-cat=housing]").click();
      assert.equal(await page.locator(".resource-card").count(), 1);
      await page.locator("#resource-search-input").fill("unfindablexyz");
      assert.equal(await page.locator(".resource-card").count(), 0);
      assert.equal(await page.locator("#resource-empty").isVisible(), true);
      await page.locator("#reset-filters-btn").click();
      assert.equal(await page.locator(".resource-card").count(), 6);
      await page.locator("#resource-search-input").fill("clinic");
      assert.equal(await page.locator(".resource-card").count(), 1);
      await page.locator("[data-clear-search]").click();
      assert.equal(await page.locator(".resource-card").count(), 6);
    },
  );
  await check(
    "distance, service language, eligibility, and sort controls work",
    async () => {
      await page.locator("#filter-distance").selectOption("2");
      assert.equal(await page.locator(".resource-card").count(), 2);
      await page.locator("#filter-language").selectOption("mandarin");
      assert.equal(await page.locator(".resource-card").count(), 1);
      await page.locator("#reset-filters-btn").click();
      await page.locator("#filter-eligibility").selectOption("seniors");
      assert.equal(await page.locator(".resource-card").count(), 1);
      await page.locator("#reset-filters-btn").click();
      await page.locator("#filter-sort").selectOption("alpha");
      assert.match(
        await page.locator(".resource-card").first().textContent(),
        /Hope Pathways/,
      );
    },
  );
  await check(
    "resource dialogs trap focus, close on Escape, and restore opener focus",
    async () => {
      const button = page.locator("[data-resource=hope-housing]").first();
      await button.click();
      assert.equal(await page.locator("dialog").isVisible(), true);
      assert.match(
        await page.locator("#dialog-title").textContent(),
        /Hope Pathways/,
      );
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await page.evaluate(
          () => document.activeElement.closest("dialog") !== null,
        ),
        true,
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog").isVisible(), false);
      assert.equal(
        await button.evaluate((b) => b === document.activeElement),
        true,
      );
    },
  );
  await check(
    "resource map respects filters and opens detail views",
    async () => {
      await page.locator("#reset-filters-btn").click();
      await page.locator("[data-cat=education]").click();
      await page.locator("#view-mode-toggle").click();
      assert.equal(await page.locator("#resource-map .map-pin").count(), 1);
      await page.locator("#resource-map .map-pin").click();
      assert.match(
        await page.locator("#dialog-title").textContent(),
        /Literacy/,
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Spanish toggle translates static content, resources, accessible labels, and persists across navigation",
    async () => {
      await visit("resources");
      await page.locator("[data-lang=es]").click();
      assert.equal(await page.locator("html").getAttribute("lang"), "es");
      assert.match(await page.locator("h1").textContent(), /Directorio/);
      await page.locator("#resource-search-input").fill("despensa");
      assert.equal(await page.locator(".resource-card").count(), 1);
      assert.match(
        await page.locator(".resource-card").textContent(),
        /Centro alimentario/,
      );
      assert.match(
        await page
          .locator("#resource-search-input")
          .getAttribute("placeholder"),
        /Busca/,
      );
      await page.locator('.desktop-nav a[href="events.html"]').click();
      await page.waitForURL(/events\.html/);
      await page.waitForFunction(() =>
        /Eventos/.test(document.querySelector("h1")?.textContent || ""),
      );
      assert.match(await page.locator("h1").textContent(), /Eventos/);
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("communityconnect.language"),
        ),
        "es",
      );
      await page.locator("[data-lang=en]").click();
    },
  );
  await check(
    "event listing, category, keyword, date, and reset work",
    async () => {
      await visit("events");
      assert.equal(await page.locator("#event-cards-grid > *").count(), 8);
      await page.locator(".category-pill[data-category=health]").click();
      assert.equal(await page.locator("#event-cards-grid > *").count(), 2);
      await page.locator("#month-filter").selectOption("2026-12");
      assert.equal(await page.locator("#event-empty").isVisible(), true);
      await page.locator("[data-reset-events]").click();
      assert.equal(await page.locator("#event-cards-grid > *").count(), 8);
      await page.locator("#event-search").fill("coding");
      assert.equal(await page.locator("#event-cards-grid > *").count(), 1);
      await page.locator("#event-search").fill("");
    },
  );
  await check(
    "calendar renders actual November weekdays and opens event details",
    async () => {
      await page.locator("#view-calendar-btn").click();
      assert.equal(await page.locator(".calendar-day:not(.empty)").count(), 30);
      await page.locator(".calendar-event[data-event=cleanup]").click();
      assert.match(
        await page.locator("#dialog-title").textContent(),
        /Clean-Up/,
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "event map renders all matching fictional locations",
    async () => {
      await page.locator("#view-map-btn").click();
      assert.equal(await page.locator("#map-view-panel .map-pin").count(), 8);
      await page
        .locator("#map-view-panel .map-pin[data-event=finance]")
        .click();
      assert.match(
        await page.locator("#dialog-title").textContent(),
        /Financial/,
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "demo registration confirms truthfully and remains only in memory",
    async () => {
      await page.locator("[data-event=harvest]").first().click();
      await page.locator("[data-register=harvest]").click();
      assert.match(
        await page.locator("#registration-status").textContent(),
        /No place is reserved/,
      );
      assert.equal(
        await page.locator("[data-register=harvest]").isDisabled(),
        true,
      );
      await page.keyboard.press("Escape");
      await page.locator("[data-event=harvest]").first().click();
      assert.equal(
        await page.locator("[data-register=harvest]").isDisabled(),
        true,
      );
      await page.reload();
      await page.locator("[data-event=harvest]").first().click();
      assert.equal(
        await page.locator("[data-register=harvest]").isDisabled(),
        false,
      );
    },
  );
  await check(
    "calendar download is a valid clearly marked demo ICS file",
    async () => {
      const download = page.waitForEvent("download");
      await page.locator("dialog [data-calendar-event=harvest]").click();
      const file = await download;
      assert.match(file.suggestedFilename(), /demo.*\.ics$/);
      const text = fs.readFileSync(await file.path(), "utf8");
      assert.match(text, /BEGIN:VCALENDAR/);
      assert.match(text, /DTSTART:20261121T100000/);
      assert.match(text, /SUMMARY:\[DEMO\]/);
      await page.keyboard.press("Escape");
    },
  );
  await check("share URLs open a selected resource detail view", async () => {
    await page.goto(`${base}/resources.html?resource=metro-health`);
    assert.equal(await page.locator("dialog").isVisible(), true);
    assert.match(await page.locator("#dialog-title").textContent(), /Metro/);
    await page.keyboard.press("Escape");
  });
  await check(
    "contact form shows inline accessible errors and focuses first invalid input",
    async () => {
      await visit("contact");
      await page.locator("#submitBtn").click();
      assert.equal(
        await page.locator("#fullName").getAttribute("aria-invalid"),
        "true",
      );
      assert.equal(
        await page
          .locator("#fullName")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      assert.equal(await page.locator("#message-error").isVisible(), true);
      await page.locator("#fullName").fill("Demo Resident");
      await page.locator("#email").fill("invalid");
      await page.locator("#message").fill("short");
      await page.locator("#submitBtn").click();
      assert.match(
        await page.locator("#email-error").textContent(),
        /valid email/,
      );
      assert.match(
        await page.locator("#message-error").textContent(),
        /20 characters/,
      );
    },
  );
  await check(
    "valid demo contact submission makes no POST request and claims no delivery",
    async () => {
      let posts = 0;
      const listener = (r) => {
        if (r.method() === "POST") posts++;
      };
      page.on("request", listener);
      await page.locator("#email").fill("demo@example.com");
      await page.locator("#category").selectOption({ index: 1 });
      await page
        .locator("#message")
        .fill("This is a sample inquiry to test the local demonstration.");
      await page.locator("#submitBtn").click();
      assert.match(
        await page.locator("#contactForm .form-status").textContent(),
        /No message was sent/,
      );
      assert.equal(posts, 0);
      page.off("request", listener);
    },
  );
  await check(
    "Spanish validation and success messages render correctly",
    async () => {
      await page.locator("[data-lang=es]").click();
      await page.locator("#submitBtn").click();
      assert.match(
        await page.locator("#fullName-error").textContent(),
        /Introduce/,
      );
      await page.locator("#fullName").fill("Residente de ejemplo");
      await page.locator("#email").fill("demo@example.com");
      await page.locator("#category").selectOption({ index: 1 });
      await page
        .locator("#message")
        .fill("Este es un mensaje de demostración para el formulario.");
      await page.locator("#submitBtn").click();
      assert.match(
        await page.locator(".form-status").textContent(),
        /No se envió/,
      );
      await page.locator("[data-lang=en]").click();
    },
  );
  await check(
    "FAQ buttons support keyboard activation and accurate expanded states",
    async () => {
      const faq = page.locator("#faqAccordion button").first();
      const initiallyOpen =
        (await faq.getAttribute("aria-expanded")) === "true";
      const id = await faq.getAttribute("aria-controls");
      assert.equal(await page.locator("#" + id).isVisible(), initiallyOpen);
      await faq.focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await faq.getAttribute("aria-expanded"),
        String(!initiallyOpen),
      );
      assert.equal(await page.locator("#" + id).isVisible(), !initiallyOpen);
      await page.keyboard.press("Space");
      assert.equal(await page.locator("#" + id).isVisible(), initiallyOpen);
    },
  );
  await check(
    "home and about volunteer forms validate and confirm as demos",
    async () => {
      for (const slug of ["index", "about"]) {
        await visit(slug);
        const form = page.locator("[data-demo-form]");
        await form.locator("button[type=submit]").click();
        assert.match(await form.locator(".form-status").textContent(), /fix/);
        await form.locator("input[type=text]").first().fill("Demo Volunteer");
        await form.locator("input[type=email]").fill("demo@example.com");
        if (await form.locator("input[required][type=checkbox]").count())
          await form.locator("input[required][type=checkbox]").check();
        await form.locator("button[type=submit]").click();
        assert.match(
          await form.locator(".form-status").textContent(),
          /No message was sent/,
        );
      }
    },
  );
  await check(
    "print guide opens browser print with bilingual sample resource content",
    async () => {
      await visit("resources");
      await page.evaluate(() => {
        window.print = () => {
          window.__printed = true;
        };
      });
      await page.locator("[data-print=es]").click();
      await page.waitForFunction(() => window.__printed);
      assert.match(await page.locator(".print-guide h1").textContent(), /Guía/);
      assert.equal(await page.locator(".print-guide article").count(), 6);
    },
  );
  await check(
    "responsive pages fit at 360, 390, 768, and 1024 px in both languages",
    async () => {
      for (const width of [360, 390, 768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        for (const slug of [
          "index",
          "resources",
          "events",
          "about",
          "contact",
        ]) {
          await visit(slug);
          for (const language of ["en", "es"]) {
            await page.locator(`[data-lang=${language}]`).click();
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              true,
              `${slug} ${width}px ${language}`,
            );
          }
        }
      }
      await page.locator("[data-lang=en]").click();
    },
  );
  await check(
    "mobile menu opens all five links, closes on Escape, and bottom navigation is active",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await visit("index");
      await page.locator(".menu-toggle").click();
      assert.equal(await page.locator("#mobile-menu").isVisible(), true);
      assert.equal(await page.locator("#mobile-menu a").count(), 5);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#mobile-menu").isVisible(), false);
      await page.locator('.bottom-nav a[href="resources.html"]').click();
      assert.equal(
        await page
          .locator(".bottom-nav a[aria-current=page]")
          .getAttribute("href"),
        "resources.html",
      );
    },
  );
  await check(
    "no runtime exceptions or failed asset requests occurred",
    async () => {
      assert.deepEqual(errors, []);
      assert.deepEqual([...new Set(failed)], []);
    },
  );
  fs.writeFileSync(
    "docs/browser-test-results.json",
    JSON.stringify(
      {
        checks,
        passed: checks,
        viewportWidths: [360, 390, 768, 1024, 1440],
        languages: ["en", "es"],
        tests: report,
      },
      null,
      2,
    ),
  );
  console.log(`\n${checks} browser checks passed.`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
