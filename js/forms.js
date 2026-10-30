import { t, translate } from "./i18n.js";
export function fieldError(field) {
  const value = field.value.trim();
  if (field.type === "checkbox" && field.required && !field.checked)
    return "Please select this checkbox to continue.";
  if (!value && field.required) {
    if (field.type === "email") return "Please enter a valid email address.";
    if (field.tagName === "SELECT") return "Please select an inquiry category.";
    if (field.id === "message")
      return "Please write a message with at least 20 characters.";
    if (/name/i.test(field.id))
      return "Please enter your name (at least 2 characters).";
    return "Please complete this field.";
  }
  if (!value) return "";
  if (
    field.type === "email" &&
    (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  )
    return "Please enter a valid email address.";
  if (/name/i.test(field.id) && value.length < 2)
    return "Please enter your name (at least 2 characters).";
  if (field.id === "message" && value.length < 20)
    return "Please write a message with at least 20 characters.";
  if (field.type === "tel" && !/^[+()\d\s.\-]{7,25}$/.test(value))
    return "Please enter a valid phone number or leave it blank.";
  if (field.maxLength > 0 && value.length > field.maxLength)
    return "Please complete this field.";
  return "";
}
export function initForms() {
  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    const fields = [...form.querySelectorAll("input,select,textarea")],
      status = form.querySelector(".form-status");
    let submitted = false,
      success = false;
    fields.forEach((field) => {
      if (/name|email/.test(field.id)) field.required = true;
      if (/name/i.test(field.id)) field.autocomplete = "name";
      if (field.type === "email") field.autocomplete = "email";
      if (field.type === "text" || field.type === "email")
        field.maxLength = field.type === "email" ? 254 : 100;
      const error = document.createElement("span");
      error.className = "form-error";
      error.id = `${field.id}-error`;
      error.hidden = true;
      field.closest("label")?.contains(field)
        ? field.closest("label").after(error)
        : field.parentElement.append(error);
      const described = field.getAttribute("aria-describedby");
      field.setAttribute(
        "aria-describedby",
        [described, error.id].filter(Boolean).join(" "),
      );
      const check = () => {
        const message = fieldError(field);
        error.textContent = t(message);
        error.hidden = !message;
        field.setAttribute("aria-invalid", String(Boolean(message)));
        field.dataset.error = message;
        return !message;
      };
      field.addEventListener("input", () => {
        if (submitted) check();
        if (success) {
          success = false;
          status.textContent = "";
        }
      });
      field.addEventListener("change", () => {
        if (submitted) check();
      });
      field._check = check;
    });
    const validate = () => {
      let valid = true,
        first;
      fields.forEach((field) => {
        if (!field._check()) {
          valid = false;
          first ??= field;
        }
      });
      return { valid, first };
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitted = true;
      const { valid, first } = validate();
      status.classList.toggle("is-error", !valid);
      if (!valid) {
        status.textContent = t("Please fix the highlighted fields.");
        first.focus();
        return;
      }
      success = true;
      status.textContent = t(
        "Demo complete. Your form passed validation. No message was sent.",
      );
      form.reset();
      submitted = false;
      fields.forEach((field) => {
        field.removeAttribute("aria-invalid");
        field.dataset.error = "";
        document.getElementById(`${field.id}-error`).hidden = true;
      });
    });
    document.addEventListener("languagechange", () => {
      if (submitted) validate();
      if (success)
        status.textContent = t(
          "Demo complete. Your form passed validation. No message was sent.",
        );
      else if (status.classList.contains("is-error") && status.textContent)
        status.textContent = t("Please fix the highlighted fields.");
    });
  });
  const params = new URLSearchParams(location.search),
    select = document.querySelector("#category");
  if (select && params.get("inquiry")) {
    const words =
      params.get("inquiry") === "organization"
        ? /service|organization/i
        : params.get("inquiry") === "event"
          ? /partnership/i
          : /volunteer/i;
    const option = [...select.options].find((o) => words.test(o.textContent));
    if (option) select.value = option.value;
  }
}
