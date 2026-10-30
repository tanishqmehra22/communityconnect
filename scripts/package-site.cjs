/** Publishable static output deliberately excludes the original export, tests, and tooling. */
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
for (const file of [
  "index.html",
  "resources.html",
  "events.html",
  "about.html",
  "contact.html",
])
  fs.copyFileSync(path.join(root, file), path.join(out, file));
for (const directory of ["css", "js", "assets"])
  fs.cpSync(path.join(root, directory), path.join(out, directory), {
    recursive: true,
    filter: (source) => path.basename(source) !== "input.css",
  });
console.log(
  "Static website ready in dist/. No upload or deployment was performed.",
);
