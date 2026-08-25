/* Gerüst für Browserprüfungen. Enthält genau das, was sonst am Anfang jeder
   Prüfdatei neu getippt wird: Server, Browserstart, Profilauswahl wegklicken,
   Zählwerk. Ohne Fremdpakete für den Server — Playwright wird gesucht, nicht
   vorausgesetzt.

   Benutzung:
     import { starte, ende, pruef } from "../browser.mjs";
     const { page } = await starte();
     pruef("etwas", await page.isVisible("#ansichtTag"));
     await ende();                                  // beendet mit passendem Code
*/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const WURZEL = path.resolve(new URL("../", import.meta.url).pathname);
const TYPEN = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json",
  ".webmanifest":"application/manifest+json", ".png":"image/png", ".svg":"image/svg+xml" };

let treffer = 0, daneben = 0;
export function pruef(name, ok, zusatz = "") {
  console.log((ok ? "  ok    " : "  FEHL  ") + name + (zusatz ? " — " + zusatz : ""));
  ok ? treffer++ : daneben++;
}

/** Kleiner statischer Server. Spart den Umweg über ein Fremdpaket. */
export function serviere(verzeichnis = WURZEL, port = 0) {
  const server = http.createServer((anfrage, antwort) => {
    const rein = decodeURIComponent(anfrage.url.split("?")[0]);
    const datei = path.join(verzeichnis, rein === "/" ? "/index.html" : rein);
    if (!datei.startsWith(verzeichnis) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      antwort.writeHead(404).end("nicht gefunden"); return;
    }
    antwort.writeHead(200, { "content-type": TYPEN[path.extname(datei)] || "application/octet-stream" });
    fs.createReadStream(datei).pipe(antwort);
  });
  return new Promise((fertig) =>
    server.listen(port, "127.0.0.1", () => fertig({ server, port: server.address().port })));
}

function findePlaywright() {
  const require = createRequire(import.meta.url);
  for (const ort of ["playwright", "/opt/node22/lib/node_modules/playwright/index.js"]) {
    try { return require(ort); } catch (e) { /* nächster Versuch */ }
  }
  throw new Error("Playwright nicht gefunden. Ohne es gibt es keine Browserprüfung.");
}
function findeChromium() {
  for (const stamm of ["/opt/pw-browsers"]) {
    if (!fs.existsSync(stamm)) continue;
    for (const eintrag of fs.readdirSync(stamm)) {
      const weg = path.join(stamm, eintrag, "chrome-linux", "chrome");
      if (fs.existsSync(weg)) return weg;
    }
  }
  return undefined;      // Playwright sucht dann selbst
}

let laufend = null;
/**
 * @param {object} o
 *  verzeichnis  was ausgeliefert wird (Vorgabe: Projektwurzel)
 *  geraet       "handy" | "desktop" (Vorgabe: desktop)
 *  breite/hoehe eigene Fenstergroesse
 *  profilWeg    Profilauswahl wegklicken (Vorgabe: true)
 *  dialogeJa    confirm()/alert() bestaetigen (Vorgabe: true) — ohne das
 *               lehnt Playwright jeden confirm ab und Pruefungen laufen ins Leere
 */
export async function starte(o = {}) {
  const { chromium } = findePlaywright();
  const { server, port } = await serviere(o.verzeichnis || WURZEL);
  const browser = await chromium.launch({ executablePath: findeChromium() });
  const handy = o.geraet === "handy";
  const ctx = await browser.newContext({
    viewport: { width: o.breite || (handy ? 390 : 1280), height: o.hoehe || (handy ? 844 : 800) },
    isMobile: handy, hasTouch: handy, locale: "de-DE",
  });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  if (o.dialogeJa !== false) page.on("dialog", async (d) => { await d.accept(); });

  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  if (o.profilWeg !== false && (await page.isVisible("#profilStart"))) {
    await page.click("#pGitter .kachel");
    await page.waitForTimeout(250);
  }
  laufend = { browser, server, fehler };
  return { browser, ctx, page, fehler, port, kasten: () => fehlerkasten(page) };
}

/** Inhalt des roten Fehlerkastens, oder null. Die wichtigste Einzelprüfung. */
export const fehlerkasten = (page) =>
  page.evaluate(() => { const k = document.getElementById("fehlerkasten"); return k ? k.textContent : null; });

export async function ende() {
  if (laufend) {
    const echte = laufend.fehler.filter((t) => !/favicon/.test(t));
    if (echte.length) pruef("keine Seitenfehler", false, echte.join("; "));
    else pruef("keine Seitenfehler", true);
    await laufend.browser.close();
    laufend.server.close();
  }
  console.log(`\n${treffer} bestanden, ${daneben} fehlgeschlagen.`);
  process.exit(daneben ? 1 : 0);
}
