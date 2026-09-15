/* Englische Fassung: Umschalten, Vollständigkeit, und dass die Daten
   dabei deutsch bleiben. Der Browser läuft auf de-DE — die Vorgabe ist
   damit Deutsch, und jede englische Anzeige ist wirklich umgeschaltet. */
import { starte, ende, pruef } from "../browser.mjs";

const { page, browser, fehler, kasten } = await starte();

const text = (s) => page.textContent(s).then((t) => (t || "").trim());

/* --- Vorgabe --- */
pruef("Vorgabe ist Deutsch", (await text("#rTag")) === "Tag", await text("#rTag"));
pruef("html lang steht auf de",
  (await page.evaluate(() => document.documentElement.lang)) === "de");

/* --- Umschalten über die Einstellungen, wie ein Mensch es täte --- */
await page.evaluate(() => einstellungenOeffnen());
await page.waitForTimeout(300);
pruef("Sprachwahl steht auf der obersten Ebene", await page.isVisible("#sSprache"));
pruef("und ist zweisprachig beschriftet",
  /Sprache/.test(await text("#einstSprachZeile")) && /Language/.test(await text("#einstSprachZeile")),
  await text("#einstSprachZeile"));

await page.selectOption("#sSprache", "en");
await page.waitForTimeout(400);

pruef("Reiter sind englisch", (await text("#rTag")) === "Day", await text("#rTag"));
pruef("Zeugnis heisst Report", (await text("#rZeu")) === "Report", await text("#rZeu"));
pruef("html lang steht auf en",
  (await page.evaluate(() => document.documentElement.lang)) === "en");
pruef("Einstellungen sind sofort englisch",
  /Appearance/.test(await text("#einstMenu")) && /Backup and storage/.test(await text("#einstMenu")));
pruef("die Wahl ist sofort gespeichert",
  (await page.evaluate(() => cfg.sprache)) === "en");

/* --- Vollständigkeit: jeder Schlüssel, der wirklich gezeichnet wird --- */
const luecken = await page.evaluate(() => {
  const fehlt = [];
  htmlTexte.forEach((x) => { if (EN[x.schluessel] === undefined) fehlt.push(x.schluessel); });
  const dazu = [
    ...Object.values(LANG), ...Object.values(ART), ...Object.values(ARTLANG),
    ...FEHLARTEN, ...EINST_TEILE.map((t) => t.titel),
  ];
  dazu.forEach((k) => { if (EN[k] === undefined) fehlt.push(k); });
  return fehlt;
});
pruef("kein gezeichneter Satz ohne Übersetzung", luecken.length === 0,
  luecken.slice(0, 6).join(" | "));

/* Die Bereichsstände entstehen erst zur Laufzeit — sie dürfen kein
   deutsches Wort mehr enthalten, das eine Übersetzung hätte. */
const staende = await page.evaluate(() =>
  EINST_TEILE.map((t) => { try { return t.stand(); } catch (e) { return "FEHLER"; } }).join(" · "));
pruef("Bereichsstände sind übersetzt",
  !/dunkel|hell|Stunden je Schultag|nie gesichert|Bundesland|getrennt/.test(staende), staende);

/* --- Anleitung --- */
await page.evaluate(() => { dlgEinst.close(); hilfeOeffnen(); });
await page.waitForTimeout(300);
const hilfe = await page.evaluate(() => ({
  teile: [...new Set(HILFE.map((a) => a.teil))],
  gezeichnet: document.querySelectorAll("#hilfeInhalt .hAbschnitt").length,
  quelle: HILFE_QUELLE.length,
  ohneEn: HILFE_QUELLE.filter((a) => !a.textEn || !a.titelEn || !a.teilEn).map((a) => a.id),
}));
pruef("Anleitung ist vollständig übersetzt", hilfe.ohneEn.length === 0, hilfe.ohneEn.join(", "));
pruef("Anleitung zeigt alle Abschnitte", hilfe.gezeichnet === hilfe.quelle,
  `${hilfe.gezeichnet} von ${hilfe.quelle}`);
pruef("Anleitungsteile sind englisch", hilfe.teile.includes("Getting started"),
  hilfe.teile.join(" · "));
await page.fill("#hilfeSuche", "backup folder");
await page.waitForTimeout(250);
const treffer = await page.evaluate(() => document.querySelectorAll("#hilfeInhalt .hAbschnitt").length);
pruef("Suche findet englische Stichwörter", treffer > 0, treffer + " Treffer");
/* Die deutschen Stichwörter jedes Abschnitts gelten weiter mit: wer den
   Begriff aus dem Unterricht kennt, findet den Abschnitt auch auf Englisch. */
await page.fill("#hilfeSuche", "Haltefrist");
await page.waitForTimeout(250);
const deTreffer = await page.evaluate(() => document.querySelectorAll("#hilfeInhalt .hAbschnitt").length);
pruef("und weiterhin die deutschen", deTreffer > 0, deTreffer + " Treffer");
await page.evaluate(() => dlgHilfe.close());

/* --- Datum und Zahlen --- */
const form = await page.evaluate(() => ({
  datum: zeigDatum("2026-03-04"),
  note: notenText(2.345),
  kurz: tagKurz("DI"),
}));
pruef("Datum englisch geschrieben", form.datum === "04/03/2026", form.datum);
pruef("Dezimalpunkt statt Komma", form.note === "2.35", form.note);
pruef("Wochentagskürzel übersetzt", form.kurz === "TU", form.kurz);

/* --- Gespeichert bleibt Deutsch --- */
const daten = await page.evaluate(() => {
  eintragOeffnen(null, new Date(), "F", "MA", 0, { stunden: 2 });
  document.getElementById("bEintragSpeichern").click();
  const e = eintraege.find((x) => x.typ === "F");
  return { titel: e && e.titel, tage: TAGE.join(","), fehlarten: FEHLARTEN.join(",") };
});
pruef("Fehlzeitenart bleibt deutsch gespeichert", daten.titel === "entschuldigt", String(daten.titel));
pruef("Wochentagsschlüssel bleiben deutsch", daten.tage === "MO,DI,MI,DO,FR", daten.tage);
pruef("Fehlzeitenarten bleiben deutsch", /verspätet/.test(daten.fehlarten), daten.fehlarten);
pruef("angezeigt wird sie trotzdem englisch",
  (await page.evaluate(() => txt("entschuldigt"))) === "excused");

/* --- Englisch ist wortreicher: passt es noch auf ein schmales Handy? --- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
for (const ansicht of ["tag", "kalender", "eintraege", "zeugnis"]) {
  await page.evaluate((a) => { window.ansicht = a; einSub = null; zeichne(); }, ansicht);
  await page.waitForTimeout(150);
  const quer = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  pruef("390px · " + ansicht + " läuft nicht waagerecht", quer <= 0, String(quer));
}
const reiter = await page.evaluate(() =>
  [...document.querySelectorAll(".reiter button")].map(b => b.scrollWidth > b.clientWidth + 1));
pruef("390px · kein Reiter wird abgeschnitten", !reiter.some(Boolean), reiter.join(" "));
await page.evaluate(() => einstellungenOeffnen("sicherung"));
await page.waitForTimeout(300);
const querEinst = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
pruef("390px · Einstellungen laufen nicht waagerecht", querEinst <= 0, String(querEinst));
await page.evaluate(() => dlgEinst.close());

/* --- Neustart behält die Sprache --- */
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
if (await page.isVisible("#profilStart")) { await page.click("#pGitter .kachel"); await page.waitForTimeout(250); }
pruef("Sprache übersteht einen Neustart", (await text("#rTag")) === "Day", await text("#rTag"));

/* --- Zurück auf Deutsch --- */
await page.evaluate(() => { cfg.sprache = "de"; sichern(); zeichne(); });
await page.waitForTimeout(200);
pruef("Zurückschalten stellt Deutsch wieder her", (await text("#rTag")) === "Tag", await text("#rTag"));
/* Leer heisst Gerätesprache — der Browser läuft auf de-DE. */
await page.evaluate(() => { cfg.sprache = ""; sichern(); zeichne(); });
await page.waitForTimeout(200);
pruef("Automatisch folgt dem Gerät", (await text("#rTag")) === "Tag", await text("#rTag"));

pruef("kein Fehlerkasten", (await kasten()) === null, (await kasten()) || "");
/* ende() prüft nur den zuletzt gestarteten Browser — dieser hier geht
   vorher zu, also seine Fehler an dieser Stelle. */
const echte = fehler.filter((t) => !/favicon/.test(t));
pruef("keine Seitenfehler beim Umschalten", echte.length === 0, echte.join("; "));
await browser.close();

/* --- Ein englisches Gerät: frisches Profil englisch, bestehendes deutsch ---
   Das ist die Zusage an alle, die die App schon benutzen: eine
   Aktualisierung stellt niemandem die Sprache um. */
const zweit = await starte({ sprache: "en-US" });
pruef("frisches Profil folgt dem englischen Gerät",
  (await zweit.page.textContent("#rTag")).trim() === "Day",
  (await zweit.page.textContent("#rTag")).trim());
pruef("cfg merkt sich die Gerätesprache", (await zweit.page.evaluate(() => cfg.sprache)) === "");

/* Ein Profil aus einer Fassung vor der Sprachwahl: cfg ohne das Feld. */
await zweit.page.evaluate(() => {
  const alt = JSON.parse(localStorage.getItem("p1_cfg") || "{}");
  delete alt.sprache;
  alt.klasse = "10b";
  localStorage.setItem("p1_cfg", JSON.stringify(alt));
});
await zweit.page.reload({ waitUntil: "networkidle" });
await zweit.page.waitForTimeout(400);
if (await zweit.page.isVisible("#profilStart")) {
  await zweit.page.click("#pGitter .kachel");
  await zweit.page.waitForTimeout(250);
}
pruef("bestehendes Profil bleibt deutsch",
  (await zweit.page.textContent("#rTag")).trim() === "Tag",
  (await zweit.page.textContent("#rTag")).trim());
pruef("kein Fehlerkasten auf dem englischen Gerät",
  (await zweit.kasten()) === null, (await zweit.kasten()) || "");

await ende();
