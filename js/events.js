import { eventCard } from "./cards.js";
import { events } from "./data.js";
import { filterEvents } from "./filters.js";
import { t, translate, getLanguage, dateLabel } from "./i18n.js";
import { escapeHTML, mapMarkup, showEvent, categoryLabel } from "./ui.js";
export function calendarMarkup(items) {
  const monthKeys = [...new Set(items.map((e) => e.date.slice(0, 7)))];
  return monthKeys
    .map((key) => {
      const [year, month] = key.split("-").map(Number),
        first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(),
        days = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const label = new Intl.DateTimeFormat(
        getLanguage() === "es" ? "es-US" : "en-US",
        { month: "long", year: "numeric", timeZone: "UTC" },
      ).format(new Date(Date.UTC(year, month - 1, 1)));
      const weekdays =
        getLanguage() === "es"
          ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
          : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      let cells =
        weekdays
          .map((d) => `<div class="calendar-heading">${d}</div>`)
          .join("") +
        Array.from(
          { length: first },
          () => '<div class="calendar-day empty" aria-hidden="true"></div>',
        ).join("");
      for (let day = 1; day <= days; day++) {
        const date = `${key}-${String(day).padStart(2, "0")}`;
        cells += `<div class="calendar-day"><span>${day}</span>${items
          .filter((e) => e.date === date)
          .map(
            (e) =>
              `<button class="calendar-event" data-event="${e.id}" aria-label="${escapeHTML(t(e.title))} — ${dateLabel(date)}">${escapeHTML(t(e.title))}</button>`,
          )
          .join("")}</div>`;
      }
      return `<section class="calendar-month" aria-label="${label}"><h2>${label}</h2><div class="calendar-grid">${cells}</div></section>`;
    })
    .join("");
}
export function initEvents() {
  const search = document.querySelector("#event-search");
  if (!search) return;
  document
    .querySelectorAll("#calendar-view-panel,#map-view-panel")
    .forEach((panel) => panel.classList.remove("hidden"));
  const params = new URLSearchParams(location.search);
  let active = "all",
    view = "grid";
  const month = document.querySelector("#month-filter"),
    pills = [...document.querySelectorAll(".category-pill")];
  const render = () => {
    const filtered = filterEvents(
      events,
      { query: search.value, category: active, month: month.value },
      t,
    );
    document.querySelector("#event-count").textContent =
      getLanguage() === "es"
        ? `${filtered.length} de ${events.length} eventos de ejemplo`
        : `${filtered.length} of ${events.length} demo events`;
    document.querySelector("#event-empty").hidden = filtered.length > 0;
    document.querySelector("#event-cards-grid").innerHTML = filtered
      .map(eventCard)
      .join("");
    document.querySelector("#calendar-view-panel").innerHTML =
      calendarMarkup(filtered);
    document.querySelector("#map-view-panel").innerHTML = mapMarkup(
      filtered,
      "event",
    );
    for (const v of ["grid", "calendar", "map"]) {
      document.getElementById(`${v}-view-panel`).hidden = v !== view;
      document
        .getElementById(`view-${v}-btn`)
        .setAttribute("aria-pressed", String(v === view));
    }
    pills.forEach((p) =>
      p.setAttribute("aria-pressed", String(p.dataset.category === active)),
    );
    for (const id of [
      "grid-view-panel",
      "calendar-view-panel",
      "map-view-panel",
    ])
      translate(document.getElementById(id));
  };
  search.addEventListener("input", render);
  month.addEventListener("change", render);
  pills.forEach((p) =>
    p.addEventListener("click", () => {
      active = p.dataset.category;
      render();
    }),
  );
  for (const v of ["grid", "calendar", "map"])
    document.getElementById(`view-${v}-btn`).addEventListener("click", () => {
      view = v;
      render();
    });
  document
    .querySelector("[data-reset-events]")
    .addEventListener("click", () => {
      search.value = "";
      active = "all";
      month.value = "all";
      render();
      search.focus();
    });
  document.addEventListener("languagechange", render);
  render();
  if (params.has("event")) showEvent(params.get("event"));
}
