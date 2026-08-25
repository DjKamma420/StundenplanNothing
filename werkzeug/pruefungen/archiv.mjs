/* Archiv: Aufbewahrungsfrist, Hinweis, und die wichtigste Frage —
   verschwindet beim Aktualisieren nichts ungefragt. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page } = await starte();

/* Ausgangslage: drei archivierte Einträge ohne geloeschtAm, so wie sie eine
   Fassung vor v39 hinterlassen hätte. */
await page.evaluate(() => {
  eintraege = [
    {id:"a1", typ:"H", fach:"MA", datum:"2026-01-10", titel:"Alt ohne Datum",
     erledigt:true, geloescht:true},
    {id:"a2", typ:"N", fach:"DE", datum:"2026-02-01", titel:"Auch alt", geloescht:true},
    {id:"a3", typ:"K", fach:"CH", datum:"2026-03-01", titel:"Aktiv", geloescht:false},
  ];
  noten = []; sonder = [];
  cfg.archivTage = 0;
  sichern(); normalisiere(); zeichne();
});

pruef("Voreinstellung ist „für immer“", (await page.evaluate(() => cfg.archivTage)) === 0);

/* Migration: die Frist darf nicht rückwirkend gelten. */
const migriert = await page.evaluate(() => {
  ansicht = "eintraege"; einSub = "archiv"; zeichne();
  return eintraege.filter(e => e.geloescht).map(e => e.geloeschtAm);
});
const heute = new Date().toISOString().slice(0, 10);
pruef("altes Archiv bekommt heutiges Datum", migriert.every(d => d === heute), migriert.join(", "));

/* Der Stempel muss geschrieben sein — sonst begänne die Frist bei jedem
   Öffnen von vorn und liefe nie ab. */
const geschrieben = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("p" + profilId + "_eintraege"))
    .filter(e => e.geloescht).map(e => e.geloeschtAm));
pruef("Stempel überlebt einen Neustart", geschrieben.every(d => d === new Date().toISOString().slice(0,10)),
      JSON.stringify(geschrieben));

const ohneFrist = await page.evaluate(() => document.getElementById("einSubHinweis").textContent);
pruef("Hinweis ohne Frist nennt keine Löschung", /bis du es selbst entfernst/.test(ohneFrist), ohneFrist);
pruef("beide Einträge noch da", (await page.evaluate(() => archivListe().length)) === 2);

/* Frist setzen — die alten Einträge dürfen NICHT sofort verschwinden. */
await page.evaluate(() => { cfg.archivTage = 30; sichern(); normalisiere(); zeichne(); });
pruef("30-Tage-Frist entfernt frisch Archiviertes nicht",
      (await page.evaluate(() => archivListe().length)) === 2);
const mitFrist = await page.evaluate(() => {
  einSub = "archiv"; zeichne(); return document.getElementById("einSubHinweis").textContent; });
pruef("Hinweis nennt die Frist", /30 Tage nach dem Löschen endgültig entfernt/.test(mitFrist), mitFrist);
const zeile = await page.evaluate(() => document.querySelector("#einListe .wann").textContent);
pruef("Zeile zeigt Restzeit", /noch 30 Tage/.test(zeile), zeile.trim());

/* Wirklich abgelaufenes verschwindet. */
const nachAblauf = await page.evaluate(() => {
  eintraege.find(e => e.id === "a1").geloeschtAm = iso(plusTage(new Date(), -31));
  eintraege.find(e => e.id === "a2").geloeschtAm = iso(plusTage(new Date(), -3));
  sichern(); normalisiere(); zeichne();
  return { übrig: archivListe().map(a => a.id), aktiv: eintraege.some(e => e.id === "a3") };
});
pruef("abgelaufener Eintrag ist endgültig weg", !nachAblauf.übrig.includes("a1"), nachAblauf.übrig.join(", "));
pruef("Eintrag innerhalb der Frist bleibt", nachAblauf.übrig.includes("a2"));
pruef("nicht archivierter Eintrag bleibt unberührt", nachAblauf.aktiv);

/* Warnung in der letzten Woche */
const bald = await page.evaluate(() => {
  eintraege.find(e => e.id === "a2").geloeschtAm = iso(plusTage(new Date(), -26));
  sichern(); normalisiere(); einSub = "archiv"; zeichne();
  return { hinweis: document.getElementById("einSubHinweis").textContent,
           zeile: document.querySelector("#einListe .wann").textContent };
});
pruef("Hinweis warnt vor der kommenden Woche", /kommenden Woche verloren/.test(bald.hinweis), bald.hinweis);
pruef("Zeile zeigt wenige Tage", /noch 4 Tage/.test(bald.zeile), bald.zeile.trim());

/* Zurückholen setzt die Uhr zurück */
const zurueck = await page.evaluate(() => {
  document.querySelector('[data-zurueck="eintrag:a2"]').click();
  const e = eintraege.find(x => x.id === "a2");
  return { geloescht: e.geloescht, am: e.geloeschtAm };
});
pruef("Zurückholen löscht den Zeitpunkt", zurueck.geloescht === false && zurueck.am === null,
      JSON.stringify(zurueck));

/* Einstellung zeigt vorher, was sie kosten würde */
const warnung = await page.evaluate(() => {
  eintraege.push({id:"a4", typ:"N", fach:"", datum:"2026-01-01", titel:"Uralt",
                  geloescht:true, geloeschtAm:iso(plusTage(new Date(), -200))});
  sichern(); einstellungenOeffnen();
  document.getElementById("sArchivTage").value = "90";
  archivHinweisEinstellung();
  return document.getElementById("sArchivHinweis").textContent;
});
pruef("Einstellung warnt vor sofortigem Verlust", /verschwinden dadurch sofort 1 Eintrag/.test(warnung), warnung);

pruef("kein Fehlerkasten", (await fehlerkasten(page)) === null);
await ende();
