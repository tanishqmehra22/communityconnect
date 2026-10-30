/** Pure predicates kept separate from DOM rendering for focused regression tests. */
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function filterResources(
  records,
  {
    query = "",
    category = "all",
    ward = "all",
    eligibility = "all",
    distance = "any",
    serviceLanguage = "all",
    sort = "nearest",
  } = {},
  translate = (value) => value,
) {
  const q = normalize(query);
  const result = records.filter((r) => {
    const text = normalize(
      [
        r.title,
        r.description,
        r.summary,
        r.address,
        r.category,
        translate(r.title),
        translate(r.description),
        translate(r.summary || ""),
        translate(r.category),
        ...(r.keywords || []),
      ].join(" "),
    );
    return (
      (!q || q.split(/\s+/).every((term) => text.includes(term))) &&
      (category === "all" || r.category === category) &&
      (ward === "all" || r.ward === ward) &&
      (eligibility === "all" || r.eligibility.includes(eligibility)) &&
      (distance === "any" || r.distance <= Number(distance)) &&
      (serviceLanguage === "all" ||
        (serviceLanguage === "bilingual" || serviceLanguage === "spanish"
          ? r.languages.includes("spanish")
          : r.languages.includes(serviceLanguage)))
    );
  });
  return result.sort((a, b) =>
    sort === "alpha"
      ? translate(a.title).localeCompare(translate(b.title))
      : sort === "recent"
        ? b.updated - a.updated
        : a.distance - b.distance,
  );
}
export function filterEvents(
  records,
  { query = "", category = "all", month = "all" } = {},
  translate = (value) => value,
) {
  const q = normalize(query);
  return records
    .filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (month === "all" || e.date.startsWith(month)) &&
        (!q ||
          q
            .split(/\s+/)
            .every((term) =>
              normalize(
                [
                  e.title,
                  translate(e.title),
                  e.description,
                  translate(e.description || ""),
                  e.location,
                  e.category,
                  translate(e.category),
                ].join(" "),
              ).includes(term),
            )),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
