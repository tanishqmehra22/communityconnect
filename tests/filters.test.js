import test from "node:test";
import assert from "node:assert/strict";
import { resources, events } from "../js/data.js";
import { filterResources, filterEvents, normalize } from "../js/filters.js";
import { es } from "../js/i18n.js";
const spanish = (s) => es[s] || s;
test("keyword search is case-insensitive and accent-insensitive", () => {
  assert.equal(normalize("  CLÍNICA  "), "clinica");
  assert.deepEqual(
    filterResources(resources, { query: "CLÍNICA" }, spanish).map((r) => r.id),
    ["metro-health"],
  );
});
test("Spanish service descriptions are searchable", () =>
  assert.equal(
    filterResources(resources, { query: "comidas" }, spanish)[0].id,
    "oak-food",
  ));
test("resource search matches service aliases", () =>
  assert.equal(
    filterResources(resources, { query: "despensa" })[0].id,
    "oak-food",
  ));
test("category, distance, and eligibility combine", () => {
  assert.equal(
    filterResources(resources, { category: "housing", distance: "2" }).length,
    0,
  );
  assert.equal(
    filterResources(resources, { eligibility: "no-id", distance: "2" }).length,
    2,
  );
});
test("language filtering uses sample service capabilities", () =>
  assert.deepEqual(
    filterResources(resources, { serviceLanguage: "mandarin" }).map(
      (r) => r.id,
    ),
    ["metro-health"],
  ));
test("home neighborhood selection limits results", () =>
  assert.deepEqual(
    filterResources(resources, { ward: "riverside" }).map((r) => r.id),
    ["riverside-senior"],
  ));
test("unknown query returns an empty list", () =>
  assert.equal(
    filterResources(resources, { query: "unfindablexyz" }).length,
    0,
  ));
test("sorting does not mutate source data", () => {
  const before = resources.map((r) => r.id);
  const sorted = filterResources(resources, { sort: "alpha" });
  assert.equal(sorted[0].id, "hope-housing");
  assert.deepEqual(
    resources.map((r) => r.id),
    before,
  );
});
test("event date and category filters combine", () => {
  assert.equal(
    filterEvents(events, { month: "2026-11", category: "health" }).length,
    2,
  );
  assert.equal(filterEvents(events, { month: "2026-12" }).length, 0);
});
test("events sort chronologically and support Spanish search", () => {
  assert.equal(filterEvents(events)[0].id, "cleanup");
  assert.equal(
    filterEvents(events, { query: "finanzas" }, spanish)[0].id,
    "finance",
  );
});
test("sample IDs are unique and records contain required service information", () => {
  for (const collection of [resources, events]) {
    assert.equal(new Set(collection.map((r) => r.id)).size, collection.length);
    for (const r of collection) {
      assert.ok(r.id && r.title && r.description);
      assert.ok(!Object.hasOwn(r, "html"));
    }
  }
});
test("contacts use reserved example phone numbers", () => {
  for (const r of resources) assert.match(r.phone, /^\(202\) 555-01\d{2}$/);
});
