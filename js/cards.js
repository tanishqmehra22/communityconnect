/** Shared, escaped card renderers. The catalog contains data; layout lives here. */
import { t, dateLabel } from "./i18n.js";
import { escapeHTML as safe, categoryLabel } from "./ui.js";
const icon = (name) =>
  `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const categoryIcons = {
  food: "restaurant",
  healthcare: "local_hospital",
  housing: "home_work",
  education: "school",
  employment: "work",
  community: "diversity_3",
  workshop: "school",
  health: "health_and_safety",
  civic: "nature_people",
  family: "family_restroom",
};
export function resourceCard(r) {
  const metadata = [
    ["location_on", r.address],
    ["schedule", t(r.hours)],
    ["call", r.phone],
    ["translate", t(r.languageLabel)],
  ];
  return `<article class="resource-card group bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden" data-category="${r.category}">
 <div class="p-space-lg flex flex-col gap-space-md"><div class="flex items-start justify-between gap-space-sm"><div class="flex flex-wrap items-center gap-1.5"><span class="px-2.5 py-1 rounded-full font-label-sm text-label-sm bg-secondary-container text-on-secondary-container flex items-center gap-1">${icon(categoryIcons[r.category])}${safe(t(categoryLabel(r.category)))}</span><span class="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant">${safe(t(r.badge))}</span></div><div class="flex items-center gap-1 text-primary shrink-0" title="Demo Partner">${icon("verified")}<span class="font-label-sm text-label-sm font-bold">${t("Demo Partner")}</span></div></div>
 <div><h2 class="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors"><img class="resource-thumb" src="${r.image}" alt="" loading="lazy">${safe(t(r.title))}</h2><div class="flex items-center gap-2 mt-1"><span class="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">${safe(t(r.eligibilityBadge))}</span><span class="font-label-sm text-label-sm text-on-surface-variant">${safe(t(`• ${r.distance.toFixed(1)} miles away`))}</span></div><p class="font-body-sm text-body-sm text-on-surface-variant mt-3 leading-relaxed">${safe(t(r.summary))}</p></div>
 <div class="space-y-2 pt-2 bg-surface-container-low/70 p-3 rounded-xl">${metadata.map(([symbol, label]) => `<div class="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">${icon(symbol)}<span>${safe(label)}</span></div>`).join("")}</div></div>
 <div class="px-space-lg py-3 bg-surface-container-low/50 flex items-center justify-between gap-2"><button type="button" class="px-4 py-2 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-label-md text-label-md transition-colors flex items-center gap-1.5 shadow-sm" data-resource="${r.id}"><span>${t("View Details")}</span>${icon("arrow_forward")}</button><div class="flex items-center gap-1"><button type="button" class="p-2 text-on-surface-variant hover:text-primary rounded-lg" aria-label="Get Directions" data-resource-map="${r.id}">${icon("directions")}</button><button type="button" class="p-2 text-on-surface-variant hover:text-primary rounded-lg" aria-label="Share Resource" data-share-resource="${r.id}">${icon("share")}</button></div></div></article>`;
}
export function eventCard(e) {
  return `<article class="flex flex-col rounded-xl bg-surface-container-lowest overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
 <div class="relative h-56 overflow-hidden"><img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${e.image}" alt="${safe(e.imageAlt)}" loading="lazy"><div class="absolute top-3 left-3"><span class="px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">${safe(t(categoryLabel(e.category)))}</span></div><div class="absolute bottom-3 right-3 px-space-sm py-1 rounded-lg bg-surface-container-lowest/90 text-primary font-label-sm text-label-sm">${t("Demo Event")}</div></div>
 <div class="p-space-lg flex-1 flex flex-col justify-between space-y-space-md"><div class="space-y-space-xs"><div class="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm">${icon("calendar_today")}<span>${dateLabel(e.date)} · ${e.time}</span></div><h3 class="font-headline-md text-headline-md text-on-surface"><button type="button" class="event-title-button" data-event="${e.id}">${safe(t(e.title))}</button></h3><div class="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">${icon("location_on")}<span>${safe(t(e.location))}</span></div><p class="font-body-md text-body-md text-on-surface-variant pt-space-xs">${safe(t(e.description))}</p></div>
 <div class="flex flex-wrap gap-2">${e.badges.map((b) => `<span class="px-2 py-1 rounded bg-surface-container-low font-label-sm text-label-sm">${safe(t(b))}</span>`).join("")}</div><div class="flex items-center justify-between gap-2"><button type="button" class="primary-button" data-event="${e.id}">${safe(t(e.action))}</button><button type="button" class="p-2 text-on-surface-variant hover:text-primary rounded-lg" aria-label="Share Event" data-share-event="${e.id}">${icon("share")}</button></div></div></article>`;
}
