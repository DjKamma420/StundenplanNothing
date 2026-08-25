#!/usr/bin/env node
/* Stellt zusammen, was veröffentlicht wird — und zwar aus der Dateiliste in
   sw.js selbst. Damit können Auslieferung und Zwischenspeicher nicht
   auseinanderlaufen: fehlt eine dort genannte Datei, scheitert es hier,
   statt dass sich der Service Worker später beim Nutzer nicht installiert.

   Aufruf:  node werkzeug/seite-bauen.mjs [ziel]        (Vorgabe: _site) */
import fs from "node:fs";
import path from "node:path";

const ziel = process.argv[2] || "_site";
const treffer = fs.readFileSync("sw.js", "utf8").match(/const DATEIEN = \[([^\]]+)\]/);
if (!treffer) { console.error("DATEIEN in sw.js nicht gefunden."); process.exit(1); }

const dateien = (treffer[1].match(/"([^"]+)"/g) || [])
  .map((s) => s.slice(1, -1).replace(/^\.\//, ""))
  .filter(Boolean)
  .concat("sw.js");                 // sw.js steht nicht in der eigenen Liste

if (dateien.length < 2) { console.error("DATEIEN ist leer."); process.exit(1); }

fs.rmSync(ziel, { recursive: true, force: true });
fs.mkdirSync(ziel, { recursive: true });
for (const d of dateien) {
  if (!fs.existsSync(d)) { console.error("In sw.js genannt, aber nicht vorhanden: " + d); process.exit(1); }
  fs.copyFileSync(d, path.join(ziel, d));
}
/* Nicht nötig, solange über Actions ausgeliefert wird — schützt aber, falls
   die Quelle je wieder auf einen Branch umgestellt wird. */
fs.writeFileSync(path.join(ziel, ".nojekyll"), "");
console.log(`Veröffentlicht wird nach ${ziel}/: ` + dateien.join(", "));
