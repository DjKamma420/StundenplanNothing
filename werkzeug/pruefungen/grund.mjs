/* Kernprüfung: startet die App, geht alle Ansichten durch, prüft die
   Regeln, die schon einmal gebrochen waren. Vorlage für weitere Dateien. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page, kasten } = await starte();

pruef("Start ohne Fehlerkasten", (await kasten()) === null, (await kasten()) || "");
pruef("Tagesansicht sichtbar", await page.isVisible("#ansichtTag"));

for (const [knopf, ansicht] of [["#rKal","#ansichtKal"], ["#rEin","#ansichtEin"],
                                ["#rZeu","#ansichtZeu"], ["#rTag","#ansichtTag"]]) {
  await page.click(knopf); await page.waitForTimeout(150);
  pruef("Ansicht " + knopf, await page.isVisible(ansicht));
}

/* Fächer müssen überall gross gespeichert werden — sonst gelten „Ch" und
   „CH" als zwei Fächer und der Notenschnitt zerfällt (Fehler aus v31). */
await page.click("#btnEdit");
await page.click("#plan .block >> nth=0");
await page.fill("#fFach", "ch");
await page.click("#bBlockSpeichern");
await page.click("#btnEdit");
pruef("Fach wird gross gespeichert",
      await page.evaluate(() => plan.A[TAGE[tagIndex(gewaehlt)]]?.[0]?.fach === "CH"
                             || plan.A.MO[0]?.fach === "CH"));

/* Eine fremde Sicherung darf keinen Code in die Seite bringen. */
const boese = JSON.stringify({
  cfg: { slots: [{ std: '1"><img src=x onerror=window.__BOESE=1>', von: "08:00", bis: "09:30" }],
         akzent: "javascript:alert(1)" },
  plan: { A: { MO: [{ fach: "<script>window.__BOESE=2<\/script>", raum: "x", lk: "y" }] } },
  eintraege: [{ id: "a", typ: "M", fach: "CH", datum: "2026-01-01", titel: "x",
                bilder: ['" onerror=window.__BOESE=3 x="'] }],
  noten: [], sonder: [], ferien: [],
});
await page.evaluate(() => einstellungenOeffnen());
await page.waitForTimeout(300);
await page.fill("#sDaten", boese);
await page.click("#sLaden");
await page.waitForTimeout(500);
pruef("kein Code aus fremder Sicherung", await page.evaluate(() => window.__BOESE === undefined));
pruef("Std.-Feld auf Ziffern reduziert",
      (await page.evaluate(() => cfg.slots[0].std)) === "1",
      await page.evaluate(() => cfg.slots[0].std));
pruef("ungültiges Bild verworfen",
      (await page.evaluate(() => eintraege.find(e => e.typ === "M")?.bilder.length)) === 0);
pruef("Akzentfarbe zurückgesetzt", (await page.evaluate(() => cfg.akzent)) === "#e5382b");
pruef("kein Fehlerkasten nach dem Einlesen", (await fehlerkasten(page)) === null);

await ende();
