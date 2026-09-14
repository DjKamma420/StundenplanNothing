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

/* --- Übersetzung ---------------------------------------------------------
   Der deutsche Satz ist zugleich sein eigener Schlüssel. Wer ihn umformuliert,
   ohne EN nachzuziehen, bekäme sonst eine stillschweigend halb englische
   Oberfläche — der Satz fiele einfach auf Deutsch zurück. Deshalb hier: jeder
   Schlüssel, der sich statisch finden lässt, muss in EN stehen.

   Nicht erfasst sind Schlüssel, die erst zur Laufzeit entstehen (etwa aus
   einer Zuordnung heraus). Die deckt werkzeug/pruefungen/sprache.mjs ab. */
const entitaeten = (t) =>
  String(t)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const glatt = (t) => entitaeten(t == null ? "" : t).replace(/\s+/g, " ").trim();

/** txt("eins" + "zwei", …) — aneinandergehängte Zeichenketten sind ein Schlüssel. */
function schluesselAusJs(quelle) {
  const raus = new Set();
  const re = /(?<![\w$.])txtz?\(/g;
  let treffer;
  while ((treffer = re.exec(quelle))) {
    let i = treffer.index + treffer[0].length, ganz = "", erste = true;
    for (;;) {
      while (/\s/.test(quelle[i])) i++;
      if (!erste) {
        if (quelle[i] !== "+") break;
        i++;
        while (/\s/.test(quelle[i])) i++;
      }
      if (quelle[i] !== '"') break;
      let j = i + 1, stueck = "";
      while (j < quelle.length && quelle[j] !== '"') {
        if (quelle[j] === "\\") { stueck += quelle[j] + quelle[j + 1]; j += 2; continue; }
        stueck += quelle[j++];
      }
      if (quelle[j] !== '"') break;
      ganz += stueck; i = j + 1; erste = false;
    }
    if (ganz) raus.add(ganz);
  }
  /* txtz(n, "einer", "mehrere") und zahl(n, "einer", "mehrere") */
  for (const m of quelle.matchAll(/(?<![\w$.])txtz\([^,]+,\s*"([^"]*)"\s*,\s*"([^"]*)"/g)) {
    raus.add(m[1]); raus.add(m[2]);
  }
  /* txt(bedingung ? "so" : "anders") */
  for (const m of quelle.matchAll(/(?<![\w$.])txt\([^;)]{0,120}?\?\s*"([^"]*)"\s*:\s*"([^"]*)"\s*[,)]/g)) {
    raus.add(m[1]); raus.add(m[2]);
  }
  /* Tabellen, aus denen heraus übersetzt wird: txt(LANG[x]) und dergleichen. */
  for (const name of ["LANG", "ART", "ARTLANG"]) {
    const t = quelle.match(new RegExp("const " + name + "\\s*=\\s*\\{([\\s\\S]*?)\\};"));
    if (t) for (const m of t[1].matchAll(/:\s*"([^"]*)"/g)) raus.add(m[1]);
  }
  const fehl = quelle.match(/const FEHLARTEN = \[([^\]]*)\]/);
  if (fehl) for (const m of fehl[1].matchAll(/"([^"]*)"/g)) raus.add(m[1]);
  const teile = quelle.match(/const EINST_TEILE = \[([\s\S]*?)\n\];/);
  if (teile) for (const m of teile[1].matchAll(/titel:\s*"([^"]*)"/g)) raus.add(m[1]);
  raus.delete("");
  return raus;
}
/** zahl(n, "Tag", "Tagen") — gezählte Wörter stehen in EN_ZAHL. */
function schluesselAusZahl(quelle) {
  const raus = new Set();
  for (const m of quelle.matchAll(/(?<![\w$.])zahl\([^,]*,\s*"([^"]*)"\s*,\s*"([^"]*)"/g)) {
    raus.add(m[1]); raus.add(m[2]);
  }
  for (const m of quelle.matchAll(/mehrzahlWort\(\s*w === "1" \? "([^"]*)" : "([^"]*)"/g)) {
    raus.add(m[1]); raus.add(m[2]);
  }
  return raus;
}
/** data-t (Text), data-t-html (Text mit Auszeichnung), -ph, -al. */
function schluesselAusHtml(quelle) {
  const raus = new Set();
  for (const m of quelle.matchAll(/<(\w+)[^>]*\sdata-t(?![-\w])[^>]*>([\s\S]*?)<\/\1>/g)) {
    const vorKind = m[2].split("<")[0];
    raus.add(glatt(vorKind.trim() ? vorKind : m[2]));
  }
  for (const m of quelle.matchAll(/<(\w+)[^>]*\sdata-t-html(?![-\w])[^>]*>([\s\S]*?)<\/\1>/g))
    raus.add(glatt(m[2]));
  for (const r of [/<[^>]*\bplaceholder="([^"]*)"[^>]*\bdata-t-ph\b[^>]*>/g,
                   /<[^>]*\bdata-t-ph\b[^>]*\bplaceholder="([^"]*)"[^>]*>/g,
                   /<[^>]*\baria-label="([^"]*)"[^>]*\bdata-t-al\b[^>]*>/g,
                   /<[^>]*\bdata-t-al\b[^>]*\baria-label="([^"]*)"[^>]*>/g])
    for (const m of quelle.matchAll(r)) raus.add(glatt(m[1]));
  raus.delete("");
  return raus;
}
function tabelle(quelle, name) {
  const t = quelle.match(new RegExp("const " + name + " = \\{([\\s\\S]*?)\\n\\};"));
  if (!t) throw new Error(name + " nicht gefunden");
  /* Im Quelltext maskierte Anführungszeichen sind im Schlüssel selbst keine. */
  const keys = [...t[1].matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)]
    .map((m) => m[1].replace(/\\(["\\])/g, "$1"));
  const doppelt = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (doppelt.length) throw new Error(name + " doppelt: " + [...new Set(doppelt)].join(", "));
  return new Set(keys);
}

pruef("Jeder Satz hat eine englische Fassung", () => {
  const js = lies("app.js"), html = lies("index.html");
  const en = tabelle(js, "EN"), enZahl = tabelle(js, "EN_ZAHL");
  const gebraucht = new Set([...schluesselAusJs(js), ...schluesselAusHtml(html)]);
  const fehlt = [...gebraucht].filter((k) => !en.has(k));
  const fehltZahl = [...schluesselAusZahl(js)].filter((k) => !enZahl.has(k));
  if (fehlt.length || fehltZahl.length)
    throw new Error("ohne Übersetzung: "
      + [...fehlt, ...fehltZahl].map((k) => JSON.stringify(k.slice(0, 60))).join(", "));
  /* Ein Schlüssel mit Backslash liesse sich hier nicht zuverlässig lesen. */
  const roh = [...gebraucht].filter((k) => k.includes("\\") && !k.includes('\\"'));
  if (roh.length) throw new Error("Schlüssel mit Escape-Folge: " + roh.join(", "));
  return gebraucht.size + en.size + " Sätze, " + enZahl.size + " gezählte Wörter";
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
