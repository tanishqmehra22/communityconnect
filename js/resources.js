import { resourceCard } from "./cards.js";
import { resources } from "./data.js";
import { filterResources } from "./filters.js";
import { t, translate, getLanguage, setLanguage } from "./i18n.js";
import { escapeHTML, mapMarkup, showResource } from "./ui.js";
const wardLabels = {
  northside: "Northside (Wards 1-6)",
  "west-ward": "West Ward (Wards 7-12)",
  downtown: "Downtown Core (Wards 13-18)",
  riverside: "Riverside (Wards 19-24)",
};
export function initResources() {
  const search = document.querySelector("#resource-search-input");
  if (!search) return;
  const params = new URLSearchParams(location.search);
  let active = params.get("category") || "all",
    ward = params.get("ward") || "all",
    map = false;
  search.value = params.get("q") || "";
  const grid = document.querySelector("#resource-cards-grid"),
    mapPanel = document.querySelector("#resource-map"),
    empty = document.querySelector("#resource-empty"),
    pills = [...document.querySelectorAll(".cat-pill")];
  if (!pills.some((p) => p.dataset.cat === active)) active = "all";
  if (!wardLabels[ward]) ward = "all";
  const ids = [
    "filter-eligibility",
    "filter-distance",
    "filter-language",
    "filter-sort",
  ];
  const read = (id) => document.getElementById(id).value;
  const wardChip = document.querySelector("#ward-chip");
  const render = () => {
    const base = {
      query: search.value,
      ward,
      eligibility: read(ids[0]),
      distance: read(ids[1]),
      serviceLanguage: read(ids[2]),
      sort: read(ids[3]),
    };
    const filtered = filterResources(
      resources,
      { ...base, category: active },
      t,
    );
    // Pill counts reflect every other active filter so they always agree with the grid.
    const inCategory = filterResources(
      resources,
      { ...base, category: "all" },
      t,
    );
    pills.forEach((p) => {
      const n =
        p.dataset.cat === "all"
          ? inCategory.length
          : inCategory.filter((r) => r.category === p.dataset.cat).length;
      const count = p.querySelector("[data-pill-count]");
      if (count) count.textContent = ` (${n})`;
    });
    grid.innerHTML = filtered.map(resourceCard).join("");
    grid.hidden = map;
    mapPanel.hidden = !map;
    if (map) mapPanel.innerHTML = mapMarkup(filtered);
    empty.hidden = filtered.length > 0;
    const summary =
      getLanguage() === "es"
        ? `${filtered.length} de ${resources.length} programas de ejemplo`
        : `${filtered.length} of ${resources.length} demo programs`;
    document.querySelector("#resource-count").textContent = summary;
    const inline = document.querySelector("#inline-resource-count");
    if (inline) inline.textContent = summary;
    if (wardChip) {
      wardChip.hidden = ward === "all";
      if (ward !== "all") {
        const label = t(wardLabels[ward]);
        wardChip.querySelector("#ward-chip-label").textContent = label;
        wardChip.setAttribute(
          "aria-label",
          getLanguage() === "es"
            ? `Quitar filtro de vecindario: ${label}`
            : `Remove neighborhood filter: ${label}`,
        );
      }
    }
    pills.forEach((p) =>
      p.setAttribute("aria-pressed", String(p.dataset.cat === active)),
    );
    document
      .querySelector("#view-mode-toggle")
      .setAttribute("aria-pressed", String(map));
    document.querySelector("#view-mode-toggle").innerHTML =
      `<span class="material-symbols-outlined" aria-hidden="true">${map ? "view_list" : "map"}</span><span>${t(map ? "List View" : "Map View")}</span>`;
    translate(grid);
    translate(mapPanel);
  };
  const updateURL = () => {
    const url = new URL(location.href);
    for (const [key, value] of [
      ["q", search.value.trim()],
      ["category", active],
      ["ward", ward],
    ]) {
      if (value && value !== "all") url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
  };
  search.addEventListener("input", () => {
    updateURL();
    render();
  });
  pills.forEach((p) =>
    p.addEventListener("click", () => {
      active = p.dataset.cat;
      updateURL();
      render();
    }),
  );
  ids.forEach((id) =>
    document.getElementById(id).addEventListener("change", render),
  );
  wardChip?.addEventListener("click", () => {
    ward = "all";
    updateURL();
    render();
    search.focus();
  });
  document.querySelector("#reset-filters-btn").addEventListener("click", () => {
    search.value = "";
    active = "all";
    ward = "all";
    ids.forEach((id) => (document.getElementById(id).selectedIndex = 0));
    updateURL();
    render();
    search.focus();
  });
  document
    .querySelector("[data-clear-search]")
    .addEventListener("click", () => {
      search.value = "";
      updateURL();
      render();
      search.focus();
    });
  document.querySelector("#view-mode-toggle").addEventListener("click", () => {
    map = !map;
    render();
  });
  document
    .querySelector("[data-map-resources]")
    ?.addEventListener("click", () => {
      map = true;
      render();
      mapPanel.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
  document.addEventListener("languagechange", render);
  render();
  if (params.has("resource")) showResource(params.get("resource"));
}
export function printGuide(language = getLanguage()) {
  const old = getLanguage();
  setLanguage(language);
  document.querySelector(".print-guide")?.remove();
  const guide = document.createElement("section");
  guide.className = "print-guide print-only";
  guide.innerHTML = `<h1>${t("CommunityConnect Demo Guide")}</h1><p>${t("Fictional resources. Do not use this guide for real service or emergency assistance.")}</p>${resources.map((r) => `<article><h2>${escapeHTML(t(r.title))}</h2><p>${escapeHTML(t(r.description))}</p><p>${escapeHTML(r.address)} · ${escapeHTML(t(r.hours))}</p><p>${r.phone} · ${t("English • Spanish")}</p></article>`).join("")}`;
  document.querySelector("main").append(guide);
  window.print();
  setLanguage(old);
}
