import { initLanguage, translate } from "./i18n.js";
import { initUI } from "./ui.js";
import { initResources } from "./resources.js";
import { initEvents } from "./events.js";
import { initForms } from "./forms.js";
initUI();
initForms();
initLanguage();
initResources();
initEvents();
const hero = document.querySelector("#hero-search-form");
hero?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#search-input").value.trim(),
    ward = document.querySelector("#ward-selector").value;
  const url = new URL("resources.html", location.href);
  if (query) url.searchParams.set("q", query);
  if (ward !== "all") url.searchParams.set("ward", ward);
  location.href = url.href;
});
document.querySelectorAll("[data-search]").forEach((button) =>
  button.addEventListener("click", () => {
    location.href = `resources.html?q=${encodeURIComponent(button.dataset.search)}`;
  }),
);
translate();
