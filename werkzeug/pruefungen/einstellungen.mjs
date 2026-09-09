/* Die Einstellungen sind zweistufig: erst ein Menü, dann ein Bereich.
   Der Umbau darf nichts verstecken, was vorher erreichbar war, und
   Speichern muss weiterhin über alle Bereiche hinweg greifen. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page } = await starte({ geraet: "handy" });

await page.evaluate(() => {
  cfg.klasse = "10b"; cfg.nachLehrer = true; cfg.archivTage = 90;
  cfg.lehrer = {"MÜ":"Frau Müller"}; cfg.fachnamen = {MA:"Mathematik"};
  plan.A.MO = [{fach:"MA",raum:"101",lk:"MÜ"}, null, null, null];
  plan.B = JSON.parse(JSON.stringify(plan.A));
  ferien = [{von:"2026-10-12",bis:"2026-10-24",name:"Herbstferien",typ:"ferien"}];
  normalisiere(); sichern(); zeichne();
});

/* --- Kein Feld darf beim Umbau verlorengegangen sein --- */
const heimatlos = await page.evaluate(() => {
  const alle = [...dlgEinst.querySelectorAll("input,select,textarea,button")]
    .filter(el => el.id && el.type !== "file" && el.id !== "btnHilfe"
                  && el.id !== "bEinstZurueck" && el.id !== "bEinstSpeichern"
                  && el.id !== "sUpdate");
  return alle.filter(el => !el.closest(".einstTeil")).map(el => el.id);
});
pruef("jedes Bedienelement liegt in einem Bereich", heimatlos.length === 0,
  heimatlos.join(", ") || "alle zugeordnet");

/* --- Die Bereiche in der Vorgabe sind sichtbar, nicht versteckt ---
   Nach einer Aktualisierung trifft neues index.html auf altes app.js; wären
   sie versteckt, stünden die Einstellungen dann leer da. */
const vorgabe = await page.evaluate(async () => {
  const t = await (await fetch("index.html")).text();
  const roh = new DOMParser().parseFromString(t, "text/html");
  return [...roh.querySelectorAll(".einstTeil")].map(el =>
    el.dataset.einst + (el.classList.contains("hidden") ? ":versteckt" : ":sichtbar"));
});
pruef("Bereiche stehen in index.html sichtbar",
  vorgabe.length === 8 && vorgabe.every(x => x.endsWith(":sichtbar")), vorgabe.join(" "));

/* --- Menü --- */
await page.evaluate(() => einstellungenOeffnen());
await page.waitForTimeout(400);
pruef("beim Öffnen steht das Menü da", await page.isVisible("#einstMenu"));
pruef("und kein Bereich", (await page.$$(".einstTeil:not(.hidden)")).length === 0);
const kacheln = await page.$$eval("#einstMenu [data-einstteil]",
  l => l.map(b => b.firstChild.textContent.trim() + " | " + b.querySelector("small").textContent.trim()));
pruef("acht Bereiche im Menü", kacheln.length === 8, String(kacheln.length));
pruef("jede Kachel nennt ihren Stand", kacheln.every(k => k.split("|")[1].trim().length > 0),
  kacheln.map(k => k.split("|")[1].trim()).join(" · "));
pruef("der Stand stimmt inhaltlich",
  kacheln.some(k => k.startsWith("Schule") && k.includes("10b"))
  && kacheln.some(k => k.startsWith("Fächer") && k.includes("getrennt"))
  && kacheln.some(k => k.startsWith("Fehlzeiten") && k.includes("90 Tage"))
  && kacheln.some(k => k.startsWith("Ferien") && k.includes("1 Zeitraum")),
  kacheln.join(" ; "));

/* --- In einen Bereich und zurück --- */
await page.click('[data-einstteil="noten"]');
await page.waitForTimeout(250);
pruef("der gewählte Bereich ist offen", await page.isVisible('[data-einst="noten"]'));
pruef("nur dieser eine", (await page.$$(".einstTeil:not(.hidden)")).length === 1);
pruef("das Menü ist weg", !(await page.isVisible("#einstMenu")));
pruef("die Überschrift nennt den Bereich",
  (await page.textContent("#einstTeilTitel")).trim() === "Noten und Zeugnis");
pruef("die doppelte innere Überschrift ist weg",
  await page.evaluate(() => {
    const e = document.querySelector('[data-einst="noten"] .eyebrow');
    return e.textContent.trim() === "Noten" && e.classList.contains("hidden");
  }));
pruef("die Anleitung gehört zur obersten Ebene", !(await page.isVisible("#einstHilfeZeile")));
await page.click("#bEinstZurueck");
await page.waitForTimeout(250);
pruef("zurück führt ins Menü", await page.isVisible("#einstMenu"));
pruef("und blendet die innere Überschrift wieder ein",
  await page.evaluate(() => !document.querySelector('[data-einst="noten"] .eyebrow').classList.contains("hidden")));
pruef("dort steht die Anleitung wieder", await page.isVisible("#einstHilfeZeile"));

/* --- Jeder Bereich lässt sich öffnen und enthält etwas --- */
for(const id of ["darstellung","schule","noten","fehlzeiten","erinnerungen","ferien","namen","sicherung"]){
  await page.click(`[data-einstteil="${id}"]`);
  await page.waitForTimeout(120);
  const felder = await page.$$eval(`[data-einst="${id}"] input,[data-einst="${id}"] select,`
    + `[data-einst="${id}"] textarea,[data-einst="${id}"] button`, l => l.length);
  pruef(`Bereich ${id} ist offen und nicht leer`,
    (await page.isVisible(`[data-einst="${id}"]`)) && felder > 0, `${felder} Bedienelemente`);
  await page.click("#bEinstZurueck");
  await page.waitForTimeout(100);
}

/* --- Speichern greift über Bereiche hinweg ---
   Die Felder bleiben im DOM, auch wenn ihr Bereich zu ist. Genau darauf
   baut das Speichern auf, das alle Felder auf einmal liest. */
await page.click('[data-einstteil="schule"]'); await page.waitForTimeout(150);
await page.fill("#sKlasse", "11c");
await page.click("#bEinstZurueck"); await page.waitForTimeout(150);
await page.click('[data-einstteil="fehlzeiten"]'); await page.waitForTimeout(150);
await page.fill("#sStdProTag", "6");
await page.click("#bEinstSpeichern"); await page.waitForTimeout(400);
pruef("Änderungen aus zwei Bereichen landen zusammen im Speicher",
  await page.evaluate(() => cfg.klasse === "11c" && cfg.stdProTag === 6),
  await page.evaluate(() => cfg.klasse + " / " + cfg.stdProTag));

/* --- Beim erneuten Öffnen wieder oben anfangen --- */
await page.evaluate(() => einstellungenOeffnen());
await page.waitForTimeout(350);
pruef("ein neues Öffnen beginnt wieder im Menü", await page.isVisible("#einstMenu"));
pruef("die Kachel zeigt den neuen Stand",
  (await page.textContent('[data-einstteil="schule"]')).includes("11c"),
  await page.textContent('[data-einstteil="schule"]'));

/* --- Die Rückfrage beim Schliessen erkennt Änderungen weiterhin --- */
await page.click('[data-einstteil="darstellung"]'); await page.waitForTimeout(150);
await page.selectOption("#sSchrift", "mono");
pruef("eine Änderung in einem Bereich gilt als Änderung",
  await page.evaluate(() => einstGeaendert()));
await page.evaluate(() => { sSchrift.value = "system"; });
pruef("zurückgestellt gilt sie nicht mehr",
  await page.evaluate(() => !einstGeaendert()));
await page.evaluate(() => { einstStand = null; dlgEinst.close(); });

/* --- Wer aus einem Bereich heraus einen anderen Dialog öffnet, kommt
       dorthin zurück und nicht ins Menü. --- */
await page.evaluate(() => einstellungenOeffnen());
await page.waitForTimeout(300);
await page.click('[data-einstteil="schule"]'); await page.waitForTimeout(200);
await page.click("#sImport"); await page.waitForTimeout(300);
pruef("Plan einfügen schliesst die Einstellungen",
  await page.evaluate(() => !dlgEinst.open && dlgImport.open));
await page.click("#bImportAb"); await page.waitForTimeout(350);
pruef("und die Rückkehr landet im selben Bereich",
  await page.evaluate(() => dlgEinst.open
    && !document.querySelector('[data-einst="schule"]').classList.contains("hidden")),
  await page.evaluate(() => einstTeil));
await page.evaluate(() => { einstStand = null; dlgEinst.close(); });

/* Ein unbekannter Bereichsname darf nicht in einen leeren Dialog führen. */
await page.evaluate(() => einstellungenOeffnen("gibtsnicht"));
await page.waitForTimeout(300);
pruef("ein unbekannter Bereich fällt aufs Menü zurück", await page.isVisible("#einstMenu"));
await page.evaluate(() => { einstStand = null; dlgEinst.close(); });

pruef("kein Fehlerkasten", (await fehlerkasten(page)) === null);
await ende();
