#!/usr/bin/env node
/* Alle statischen Prüfungen an einer Stelle — dieselbe Datei benutzen die
   GitHub-Workflows und wer von Hand prüft. Vorher stand dieselbe Logik
   dreimal als node -e in den Workflows und lief bei jeder Sitzung neu
   getippt im Terminal.

   Aufruf:  node werkzeug/pruefen.mjs [--basis <git-ref>]
   Ohne --basis entfallen die beiden Vergleiche gegen den Vorgänger. */
import { execSync } from "node:child_process";
import fs from "node:fs";

const basis = (() => {
  const i = process.argv.indexOf("--basis");
  return i > -1 ? process.argv[i + 1] : null;
})();

let fehler = 0;
const pruef = (name, fn) => {
  try {
    const hinweis = fn();
    console.log("  ok    " + name + (hinweis ? " — " + hinweis : ""));
  } catch (e) {
    console.error("  FEHL  " + name + " — " + e.message);
    fehler++;
  }
};
const lies = (f) => fs.readFileSync(f, "utf8");
const kennungen = (text) =>
  new Set([...text.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]));
/* Von app.js selbst angelegt, steht deshalb nicht in index.html. */
const AUSNAHMEN = new Set(["fehlerkasten"]);

pruef("JavaScript-Syntax", () => {
  for (const f of ["app.js", "sw.js"]) execSync(`node --check ${f}`);
  return "app.js, sw.js";
});

pruef("Manifest ist gültiges JSON", () => {
  const m = JSON.parse(lies("manifest.webmanifest"));
  if (!m.name || !Array.isArray(m.icons)) throw new Error("name oder icons fehlen");
  return m.name;
});

pruef("Versionsnummer vorhanden", () => {
  const m = lies("sw.js").match(/^const VERSION = "(v\d+)";$/m);
  if (!m) throw new Error('sw.js hat keine Zeile const VERSION = "vN";');
  return m[1];
});

pruef("Dateien aus sw.js sind vorhanden", () => {
  const t = lies("sw.js").match(/const DATEIEN = \[([^\]]+)\]/);
  if (!t) throw new Error("DATEIEN nicht gefunden");
  const liste = (t[1].match(/"([^"]+)"/g) || [])
    .map((s) => s.slice(1, -1).replace(/^\.\//, ""))
    .filter(Boolean);
  if (!liste.length) throw new Error("DATEIEN ist leer");
  const weg = liste.filter((f) => !fs.existsSync(f));
  if (weg.length) throw new Error("nicht vorhanden: " + weg.join(", "));
  return liste.length + " Dateien";
});

pruef("Angesprochene Kennungen stehen in index.html", () => {
  const da = kennungen(lies("index.html"));
  const js = lies("app.js");
  const fehlt = new Set();
  for (const r of [/\$\("#([A-Za-z0-9_-]+)"\)/g, /getElementById\("([A-Za-z0-9_-]+)"\)/g])
    for (const m of js.matchAll(r))
      if (!da.has(m[1]) && !AUSNAHMEN.has(m[1])) fehlt.add(m[1]);
  if (fehlt.size) throw new Error("fehlen: " + [...fehlt].join(", "));
  return da.size + " Kennungen";
});

/* null, wenn die Datei im Vergleichsstand noch nicht existierte (etwa der
   allererste Commit eines Repos) — dann gibt es schlicht nichts, wogegen
   zu vergleichen wäre, kein Fehler. */
const zeigeDatei = (ref, pfad) => {
  try { return execSync(`git show ${ref}:${pfad}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); }
  catch { return null; }
};

if (basis) {
  /* Eine Kennung zu entfernen bricht jede App, die noch mit älterem app.js
     im Speicher läuft. Genau so entstand der Absturz in v32. */
  pruef(`Keine Kennung entfernt (gegen ${basis})`, () => {
    const vorherText = zeigeDatei(basis, "index.html");
    if (vorherText === null) return "keine Vorfassung";
    const vorher = kennungen(vorherText);
    const jetzt = kennungen(lies("index.html"));
    const weg = [...vorher].filter((x) => !jetzt.has(x));
    if (weg.length) throw new Error("entfernt: " + weg.join(", "));
    return "keine";
  });

  pruef(`Versionsnummer gestiegen, falls nötig (gegen ${basis})`, () => {
    const altText = zeigeDatei(basis, "sw.js");
    if (altText === null) return "keine Vorfassung";
    const nummer = (t) => (t.match(/VERSION = "([^"]+)"/) || [])[1];
    const alt = nummer(altText);
    const neu = nummer(lies("sw.js"));
    if (alt !== neu) return `${alt} → ${neu}`;
    const geaendert = execSync(
      `git diff --name-only ${basis} -- index.html app.js`, { encoding: "utf8" }
    ).trim();
    if (geaendert)
      throw new Error(`${geaendert.split("\n").join(", ")} geändert, VERSION steht weiter auf ${neu}`);
    return "unverändert, nichts nötig";
  });
}

console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : "\nAlle Prüfungen bestanden.");
process.exit(fehler ? 1 : 0);
