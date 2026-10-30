import { t, translate, getLanguage, dateLabel } from "./i18n.js";
import { resources, events } from "./data.js";
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const registrations = new Set();
let opener = null,
  currentDetail = null;
export function openDialog(html, detail = null) {
  const dialog = document.querySelector("#detail-dialog");
  if (!dialog.open) opener = document.activeElement;
  currentDetail = detail;
  document.querySelector("#dialog-content").innerHTML = html;
  translate(dialog);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("[data-close-dialog]").focus();
}
function closeDialog() {
  document.querySelector("#detail-dialog").close();
  currentDetail = null;
  if (opener?.isConnected) opener.focus();
}
const categories = {
  food: "Food Assistance",
  healthcare: "Healthcare",
  housing: "Housing",
  education: "Education",
  employment: "Employment",
  community: "Community Support",
  workshop: "Workshops & Classes",
  health: "Health & Wellness",
  civic: "Civic & Environment",
  family: "Kids & Family",
};
export const categoryLabel = (category) => categories[category] || category;
export function showResource(id) {
  const r = resources.find((item) => item.id === id);
  if (!r) return;
  openDialog(
    `<span class="dialog-tag">${escapeHTML(t(categoryLabel(r.category)))}</span><h2 id="dialog-title">${escapeHTML(t(r.title))}</h2><p>${escapeHTML(t(r.description))}</p><p class="eyebrow">${t("Fictional organization. Addresses, hours, distances, availability, and contact details are sample data.")}</p><dl><div><dt>Location (Demo)</dt><dd>${escapeHTML(r.address)}</dd></div><div><dt>Hours (Demo)</dt><dd>${escapeHTML(t(r.hours))}</dd></div><div><dt>Phone (Not Connected)</dt><dd>${r.phone}</dd></div><div><dt>Service Languages</dt><dd>${t(r.languageLabel)}</dd></div></dl><div class="dialog-actions"><button class="primary-button" data-resource-map="${r.id}">Illustrative Map</button><button data-share-resource="${r.id}">Share Resource</button></div>`,
    { kind: "resource", id },
  );
}
export function showEvent(id) {
  const event = events.find((item) => item.id === id);
  if (!event) return;
  const done = registrations.has(id);
  openDialog(
    `<span class="dialog-tag">${escapeHTML(t(categoryLabel(event.category)))}</span><h2 id="dialog-title">${escapeHTML(t(event.title))}</h2><p>${escapeHTML(t(event.description || "Connect with your neighbors, participate in local workshops, and join volunteer-driven neighborhood events."))}</p><dl><div><dt>Event Date (Demo)</dt><dd>${dateLabel(event.date)}<br>${event.time}</dd></div><div><dt>Location (Demo)</dt><dd>${escapeHTML(event.location || "Community Pavilion · Demo")}</dd></div></dl><p class="eyebrow">Fictional event. Registration is simulated in this browser only.</p><div class="dialog-actions"><button class="primary-button" data-register="${id}" ${done ? "disabled" : ""}>${done ? "Demo Registered" : "Try Demo Registration"}</button><button data-calendar-event="${id}">Add to Calendar</button></div><div id="registration-status" role="status" aria-live="polite">${done ? `<p class="demo-confirmation">${t("Demo registration saved for this visit only. No place is reserved, no email is sent, and no personal information is collected.")}</p>` : ""}</div>`,
    { kind: "event", id },
  );
}
export function mapMarkup(items, kind = "resource") {
  const positions = [
    [15, 12],
    [57, 22],
    [21, 47],
    [56, 60],
    [12, 75],
    [53, 83],
    [7, 33],
    [45, 42],
  ];
  return `<div class="map-demo" role="group" aria-label="Illustrative Map">${items.map((item, i) => `<button class="map-pin" style="left:${positions[i % 8][0]}%;top:${positions[i % 8][1]}%" data-${kind}="${item.id}"><span class="material-symbols-outlined" aria-hidden="true">location_on</span>${escapeHTML(t(item.title))}</button>`).join("")}<div class="map-caption">Illustrative map • fictional locations • not for navigation</div></div><div class="map-legend">${items.map((item, i) => `<button data-${kind}="${item.id}">${i + 1}. ${escapeHTML(t(item.title))}</button>`).join("")}</div>${items.length ? "" : "<p>No locations match the current filters.</p>"}`;
}
const info = {
  "privacy-policy": [
    "Privacy Policy",
    "This local portfolio demo does not send form entries to a server or collect analytics. Only your language preference is saved in localStorage. Demo registrations last for this visit and stay in memory. Use sample information when trying forms.",
  ],
  "terms-of-service": [
    "Terms of Service",
    "CommunityConnect is an educational portfolio project. All organizations, people, services, statistics, locations, and contact information are fictional. This site cannot provide services, emergency help, or confirmed event reservations.",
  ],
  accessibility: [
    "Accessibility",
    "The interface supports keyboard navigation, visible focus, labeled fields, form errors, reduced motion, and English/Spanish text. This demonstration has automated accessibility checks; it does not claim formal accessibility certification.",
  ],
  "demo-contact": [
    "Demo Contact Details",
    "These contact details are fictional and not connected. Forms validate in your browser only. No message, call, text, or volunteer request is delivered.",
  ],
  seasonal: [
    "Explore Seasonal Support — Demo Program",
    "This fictional seasonal support example shows where a real directory might highlight changing community needs. There is no application, grant, or availability associated with this demonstration.",
  ],
  "demo-information": [
    "Project Overview",
    "CommunityConnect demonstrates a bilingual directory, searchable events, accessible forms, and local browser interactions. All program information is sample data.",
  ],
};
export function downloadFile(name, content, type) {
  const blob = new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadCalendar(id) {
  const e = events.find((item) => item.id === id);
  if (!e) return;
  const date = e.date.replaceAll("-", ""),
    start = e.time.split("–")[0].replace(":", ""),
    end = e.time.split("–")[1].replace(":", "");
  const clean = (s) =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CommunityConnect//Demo Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:demo-${e.id}@communityconnect.example`,
    "DTSTAMP:20261030T000000Z",
    `DTSTART:${date}T${start}00`,
    `DTEND:${date}T${end}00`,
    `SUMMARY:${clean("[DEMO] " + t(e.title))}`,
    `LOCATION:${clean(e.location || "Fictional community location")}`,
    "DESCRIPTION:Fictional portfolio event. No registration or actual event is provided.",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  downloadFile(
    `communityconnect-demo-${id}.ics`,
    lines.join("\r\n") + "\r\n",
    "text/calendar;charset=utf-8",
  );
}
async function share(kind, id) {
  const url = new URL(
    kind === "resource" ? "resources.html" : "events.html",
    location.href,
  );
  url.searchParams.set(kind, id);
  try {
    await navigator.clipboard.writeText(url.href);
    openDialog(
      `<h2 id="dialog-title">Share Link</h2><p>Link copied. This link opens the fictional listing.</p><p data-no-translate>${escapeHTML(url.href)}</p>`,
    );
  } catch {
    openDialog(
      `<h2 id="dialog-title">Share Link</h2><p>Copy this link to share the fictional listing.</p><input aria-label="Share Link" value="${escapeHTML(url.href)}" readonly style="width:100%;padding:12px;border:1px solid #bfc8c8;border-radius:8px">`,
    );
  }
}
export function initUI() {
  const menu = document.querySelector("#mobile-menu"),
    toggle = document.querySelector(".menu-toggle");
  const closeMenu = () => {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("Open navigation"));
  };
  toggle.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute("aria-expanded", String(!menu.hidden));
    toggle.setAttribute(
      "aria-label",
      t(menu.hidden ? "Open navigation" : "Close navigation"),
    );
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      closeMenu();
      toggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("header")) closeMenu();
  });
  window.matchMedia("(min-width:1181px)").addEventListener("change", (e) => {
    if (e.matches) closeMenu();
  });
  const dialog = document.querySelector("#detail-dialog");
  dialog
    .querySelector("[data-close-dialog]")
    .addEventListener("click", closeDialog);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog();
    }
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusable = [
      ...dialog.querySelectorAll(
        'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length);
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener("cancel", () => {
    currentDetail = null;
  });
  dialog.addEventListener("close", () => {
    if (opener?.isConnected) opener.focus();
  });
  document.addEventListener("click", (e) => {
    const button = e.target.closest(
      "[data-resource],[data-event],[data-register],[data-share-resource],[data-share-event],[data-calendar-event],[data-info],[data-resource-map]",
    );
    if (!button) return;
    e.preventDefault();
    if (button.hasAttribute("data-resource"))
      showResource(button.dataset.resource);
    else if (button.hasAttribute("data-event")) showEvent(button.dataset.event);
    else if (button.hasAttribute("data-register")) {
      registrations.add(button.dataset.register);
      button.textContent = t("Demo Registered");
      button.disabled = true;
      document.querySelector("#registration-status").innerHTML =
        `<p class="demo-confirmation">${t("Demo registration saved for this visit only. No place is reserved, no email is sent, and no personal information is collected.")}</p>`;
    } else if (button.hasAttribute("data-calendar-event"))
      downloadCalendar(button.dataset.calendarEvent);
    else if (button.hasAttribute("data-share-resource"))
      share("resource", button.dataset.shareResource);
    else if (button.hasAttribute("data-share-event"))
      share("event", button.dataset.shareEvent);
    else if (button.hasAttribute("data-resource-map"))
      openDialog(
        `<h2 id="dialog-title">Illustrative Map</h2>${mapMarkup(resources.filter((r) => r.id === button.dataset.resourceMap))}`,
      );
    else if (button.hasAttribute("data-info")) {
      if (button.dataset.info === "civic-data")
        downloadFile(
          "communityconnect-demo-resources.json",
          JSON.stringify(
            resources.map(({ html, ...r }) => r),
            null,
            2,
          ),
          "application/json",
        );
      else {
        const [title, body] =
          info[button.dataset.info] || info["demo-information"];
        openDialog(`<h2 id="dialog-title">${title}</h2><p>${body}</p>`);
      }
    }
  });
  document.addEventListener("languagechange", () => {
    if (!dialog.open) return;
    if (currentDetail?.kind === "resource") showResource(currentDetail.id);
    else if (currentDetail?.kind === "event") showEvent(currentDetail.id);
    else translate(dialog);
  });
  document.querySelectorAll("#faqAccordion button").forEach((button) => {
    document.getElementById(button.getAttribute("aria-controls")).hidden =
      button.getAttribute("aria-expanded") !== "true";
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      document.getElementById(button.getAttribute("aria-controls")).hidden =
        open;
      button.querySelector(".faq-icon")?.classList.toggle("rotate-180", !open);
    });
  });
  document.querySelectorAll("[data-print]").forEach((a) =>
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const { printGuide } = await import("./resources.js");
      printGuide(a.dataset.print);
    }),
  );
  document.querySelectorAll("button").forEach((button) => {
    if (button.textContent.includes("Download Demo Resource Data"))
      button.addEventListener("click", () =>
        downloadFile(
          "communityconnect-demo-resources.json",
          JSON.stringify(
            resources.map(({ html, ...r }) => r),
            null,
            2,
          ),
          "application/json",
        ),
      );
    if (button.textContent.includes("Review Governance By-Laws"))
      button.addEventListener("click", () => {
        const [title, body] = info["demo-information"];
        openDialog(`<h2 id="dialog-title">${title}</h2><p>${body}</p>`);
      });
  });
}
