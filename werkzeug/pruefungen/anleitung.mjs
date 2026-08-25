/* Anleitung: Verzeichnis, Sprünge, Suche, Technikteil. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page } = await starte();

await page.evaluate(() => einstellungenOeffnen());
await page.waitForTimeout(300);
pruef("Knopf in den Einstellungen sichtbar", await page.isVisible("#btnHilfe"));
await page.click("#btnHilfe");
await page.waitForTimeout(300);
pruef("Dialog öffnet", await page.isVisible("#dlgHilfe"));

const zahlen = await page.evaluate(() => ({
  abschnitte: HILFE.length,
  teile: [...new Set(HILFE.map(a => a.teil))],
  eindeutig: new Set(HILFE.map(a => a.id)).size === HILFE.length,
  gezeichnet: document.querySelectorAll("#hilfeInhalt .hAbschnitt").length,
  verzeichnis: document.querySelectorAll("#hilfeVerzeichnis .hvZeile").length,
}));
pruef("alle Abschnitte gezeichnet", zahlen.gezeichnet === zahlen.abschnitte,
      `${zahlen.gezeichnet} von ${zahlen.abschnitte}`);
pruef("Verzeichnis vollständig", zahlen.verzeichnis === zahlen.abschnitte,
      `${zahlen.verzeichnis} Einträge`);
pruef("Kennungen eindeutig", zahlen.eindeutig);
pruef("Teile vorhanden", zahlen.teile.length >= 7, zahlen.teile.join(" · "));
pruef("Technikteil dabei", zahlen.teile.some(t => /Technik/.test(t)));

/* Jeder Verweis im Verzeichnis muss ein Ziel haben. */
const tote = await page.evaluate(() =>
  [...document.querySelectorAll("#hilfeVerzeichnis [data-zu]")]
    .filter(b => !document.getElementById("h-" + b.dataset.zu)).length);
pruef("keine toten Sprungziele", tote === 0, String(tote));

/* Sprung ins Ziel */
await page.evaluate(() => document.querySelector('#hilfeVerzeichnis [data-zu="offline"]').click());
/* Sanftes Scrollen ueber mehr als zehntausend Pixel braucht laenger, als man
   denkt — deshalb auf den Stillstand warten statt auf eine feste Zeit. */
await page.waitForFunction(() => {
  const k = document.getElementById("hilfeKoerper");
  if (window.__letzterStand === k.scrollTop) return true;
  window.__letzterStand = k.scrollTop; return false;
}, null, { polling: 120, timeout: 8000 });
const sichtbar = await page.evaluate(() => {
  const k = document.getElementById("hilfeKoerper").getBoundingClientRect();
  const z = document.getElementById("h-offline").getBoundingClientRect();
  return z.top >= k.top - 8 && z.top < k.bottom;
});
pruef("Sprung ins Ziel scrollt dorthin", sichtbar);

/* Suche */
await page.fill("#hilfeSuche", "Sicherungsordner");
await page.waitForTimeout(250);
const s1 = await page.evaluate(() => ({
  treffer: document.querySelectorAll("#hilfeInhalt .hAbschnitt").length,
  markiert: document.querySelectorAll("#hilfeInhalt mark").length,
  verzeichnisWeg: document.getElementById("hilfeVerzeichnis").classList.contains("hidden"),
  stand: document.getElementById("hilfeStand").textContent,
}));
pruef("Suche filtert", s1.treffer > 0 && s1.treffer < zahlen.abschnitte, s1.treffer + " Treffer");
pruef("Treffer werden markiert", s1.markiert > 0, s1.markiert + " Markierungen");
pruef("Verzeichnis weicht der Trefferliste", s1.verzeichnisWeg);
pruef("Trefferzahl wird genannt", /Abschnitt/.test(s1.stand), s1.stand);

/* Suche ohne Treffer */
await page.fill("#hilfeSuche", "zzzunfindbar");
await page.waitForTimeout(250);
const leer = await page.evaluate(() => ({
  treffer: document.querySelectorAll("#hilfeInhalt .hAbschnitt").length,
  stand: document.getElementById("hilfeStand").textContent }));
pruef("leere Suche sagt es", leer.treffer === 0 && /Nichts/.test(leer.stand), leer.stand);

/* Markieren darf das Markup nicht zerreissen */
await page.fill("#hilfeSuche", "e");
await page.waitForTimeout(300);
const heil = await page.evaluate(() => ({
  tabellen: document.querySelectorAll("#hilfeInhalt .hTab td").length,
  code: document.querySelectorAll("#hilfeInhalt code, #hilfeInhalt .hCode").length,
  markInAttr: document.querySelectorAll("#hilfeInhalt [data-zu]").length,
}));
pruef("Tabellen überleben das Markieren", heil.tabellen > 10, heil.tabellen + " Zellen");
pruef("Code-Auszeichnung überlebt", heil.code > 5, heil.code + " Stellen");

/* Zurück zum Verzeichnis */
await page.fill("#hilfeSuche", "");
await page.waitForTimeout(250);
pruef("Verzeichnis kehrt zurück", await page.isVisible("#hilfeVerzeichnis"));
pruef("kein Fehlerkasten", (await fehlerkasten(page)) === null);

await page.click("#bHilfeAb");
await page.waitForTimeout(300);
pruef("Dialog schließt", (await page.evaluate(() => document.getElementById("dlgHilfe").open)) === false);

await ende();
