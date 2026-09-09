/* Die Regel: Wo es eine Fach-Option gibt, muss es bei eingeschalteter
   Trennung auch eine Lehrkraft-Option geben. Diese Datei geht jede Stelle
   durch, an der die App etwas je Fach anbietet oder gliedert. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page } = await starte({ geraet: "handy" });

await page.evaluate(() => {
  cfg.nachLehrer = true;
  cfg.lehrer = {"MÜ":"Frau Müller", "SC":"Herr Schmidt"};
  cfg.fachnamen = {MA:"Mathematik"};
  cfg.anteilM = 50; cfg.anteile = {}; cfg.anteileLk = {};
  plan.A.MO = [{fach:"MA",raum:"101",lk:"MÜ"}, null, null, null];
  plan.A.DI = [{fach:"MA",raum:"102",lk:"SC"}, null, null, null];
  plan.B = JSON.parse(JSON.stringify(plan.A));
  noten = [
    {id:"n1",fach:"MA",lk:"MÜ",art:"m",wert:1,datum:"2026-03-01",titel:"",notiz:"",geloescht:false},
    {id:"n2",fach:"MA",lk:"MÜ",art:"s",wert:3,datum:"2026-03-01",titel:"",notiz:"",geloescht:false},
    {id:"n3",fach:"MA",lk:"SC",art:"m",wert:2,datum:"2026-03-01",titel:"",notiz:"",geloescht:false},
    {id:"n4",fach:"MA",lk:"SC",art:"s",wert:4,datum:"2026-03-01",titel:"",notiz:"",geloescht:false}];
  eintraege = [
    {id:"m1",typ:"M",fach:"MA",lk:"MÜ",datum:"2026-03-01",titel:"Formeln Müller",notiz:"",bilder:[],zeit:"",
     erledigt:false,erledigtAm:null,geloescht:false,geloeschtAm:null},
    {id:"m2",typ:"M",fach:"MA",lk:"SC",datum:"2026-03-01",titel:"Formeln Schmidt",notiz:"",bilder:[],zeit:"",
     erledigt:false,erledigtAm:null,geloescht:false,geloeschtAm:null},
    {id:"f1",typ:"F",fach:"MA",lk:"MÜ",datum:"2026-03-02",titel:"entschuldigt",stunden:2,
     erledigt:false,erledigtAm:null,geloescht:false,geloeschtAm:null},
    {id:"f2",typ:"F",fach:"MA",lk:"SC",datum:"2026-03-03",titel:"entschuldigt",stunden:4,
     erledigt:false,erledigtAm:null,geloescht:false,geloeschtAm:null}];
  sichern(); zeichne();
});

/* ---------- Verhältnis: drei Stufen ---------- */
pruef("ohne eigenen Wert gilt der Standard",
  (await page.evaluate(() => anteilFuer("MA","MÜ"))) === 50);
await page.evaluate(() => { cfg.anteile.MA = 70; sichern(); });
pruef("ohne Lehrkraft-Wert gilt der des Fachs",
  (await page.evaluate(() => anteilFuer("MA","MÜ"))) === 70);
await page.evaluate(() => { cfg.anteileLk["MA/MÜ"] = 20; sichern(); });
pruef("der Lehrkraft-Wert sticht den des Fachs",
  (await page.evaluate(() => anteilFuer("MA","MÜ"))) === 20);
pruef("die andere Lehrkraft bleibt beim Fachwert",
  (await page.evaluate(() => anteilFuer("MA","SC"))) === 70);

/* Und er wirkt wirklich auf den Schnitt: MÜ hat mündlich 1, schriftlich 3.
   Bei 20 % mündlich sind das 0,2*1 + 0,8*3 = 2,6. */
pruef("der Schnitt rechnet mit dem Verhältnis der Lehrkraft",
  Math.abs((await page.evaluate(() => notenSchnitt("MA","MÜ").gesamt)) - 2.6) < 1e-9,
  String(await page.evaluate(() => notenSchnitt("MA","MÜ").gesamt)));

/* ---------- Zeugnis: Unterzeile führt in denselben Dialog ---------- */
await page.evaluate(() => { ansicht = "zeugnis"; zeichne(); });
await page.waitForTimeout(200);
pruef("Unterzeilen im Zeugnis sind antippbar",
  (await page.$$("#zeuListe button.zeuUnter[data-zeulk]")).length === 2);
pruef("Unterzeile nennt ihr eigenes Verhältnis",
  (await page.textContent('#zeuListe [data-zeulk="MÜ"] .wer')).includes("20 %"),
  await page.textContent('#zeuListe [data-zeulk="MÜ"] .wer'));
await page.click('#zeuListe [data-zeulk="MÜ"]');
await page.waitForTimeout(250);
pruef("Der Dialog gilt der Lehrkraft, nicht dem Fach",
  (await page.textContent("#anTitel")).includes("Frau Müller"),
  await page.textContent("#anTitel"));
pruef("Er zeigt ihren Wert", (await page.inputValue("#anWert")) === "20");
/* Speichern schreibt nur ihren Wert, nicht den des Fachs. */
await page.fill("#anWert", "40");
await page.click("#bAnSpeichern");
await page.waitForTimeout(250);
pruef("Speichern trifft nur die Lehrkraft",
  await page.evaluate(() => cfg.anteileLk["MA/MÜ"] === 40 && cfg.anteile.MA === 70),
  await page.evaluate(() => JSON.stringify([cfg.anteileLk, cfg.anteile])));
/* „Standard" nimmt nur ihren Wert zurück. */
await page.click('#zeuListe [data-zeulk="MÜ"]'); await page.waitForTimeout(200);
await page.click("#bAnStandard"); await page.waitForTimeout(250);
pruef("Standard löst nur die Lehrkraft, das Fach bleibt",
  await page.evaluate(() => cfg.anteileLk["MA/MÜ"] === undefined && cfg.anteile.MA === 70));
/* Die Fachzeile selbst führt weiter in den Fach-Dialog. */
await page.click('#zeuListe [data-zeufach="MA"]:not([data-zeulk])'); await page.waitForTimeout(250);
pruef("Die Fachzeile bleibt der Fach-Dialog",
  (await page.textContent("#anTitel")).trim() === "Mathematik",
  await page.textContent("#anTitel"));
await page.evaluate(() => dlgAnteil.close());

/* ---------- Notenkarten: ein Chip je Lehrkraft ---------- */
await page.evaluate(() => { ansicht = "eintraege"; einSub = "G"; zeichne(); });
await page.waitForTimeout(200);
pruef("Notenkarte hat einen Chip je Lehrkraft",
  (await page.$$("#einListe .anteilchip[data-anteillk]")).length === 2);
pruef("und weiterhin den Chip des Fachs",
  (await page.$$("#einListe .anteilchip:not([data-anteillk])")).length === 1);

/* ---------- Einstellungen: Verhältnis je Fach *und* Lehrkraft ---------- */
await page.evaluate(() => einstellungenOeffnen());
await page.waitForTimeout(400);
pruef("Einstellungen zeigen eine Zeile je Lehrkraft",
  (await page.$$("#sAnteilFaecher [data-anteillkfach]")).length === 2);
pruef("die Lehrkraft-Zeile schlägt den Fachwert vor",
  (await page.getAttribute('#sAnteilFaecher [data-anteillkfach="MA/MÜ"]', "placeholder")) === "70");
await page.fill('#sAnteilFaecher [data-anteillkfach="MA/SC"]', "30");
await page.click("#bEinstSpeichern");
await page.waitForTimeout(400);
pruef("Einstellungen speichern den Lehrkraft-Wert",
  (await page.evaluate(() => cfg.anteileLk["MA/SC"])) === 30,
  await page.evaluate(() => JSON.stringify(cfg.anteileLk)));
pruef("Der Wert übersteht das Säubern einer Sicherung",
  await page.evaluate(() => cfgSaeubern({anteileLk:{"ma/mü":30, "kaputt":10, "a/b/c":5}}).anteileLk["MA/MÜ"] === 30
    && Object.keys(cfgSaeubern({anteileLk:{"ma/mü":30, "kaputt":10, "a/b/c":5}}).anteileLk).length === 1),
  await page.evaluate(() => JSON.stringify(cfgSaeubern({anteileLk:{"ma/mü":30,"kaputt":10,"a/b/c":5}}).anteileLk)));

/* ---------- Merkblätter: Überschrift je Fach und Lehrkraft ---------- */
await page.evaluate(() => { ansicht = "eintraege"; einSub = "M"; zeichne(); });
await page.waitForTimeout(200);
const merkKoepfe = await page.$$eval("#einListe .eyebrow", l => l.map(x => x.textContent.trim()));
pruef("Merkblätter gliedern nach Fach und Lehrkraft",
  merkKoepfe.some(t => t.includes("Frau Müller")) && merkKoepfe.some(t => t.includes("Herr Schmidt")),
  merkKoepfe.join(" · "));
await page.evaluate(() => { cfg.nachLehrer = false; zeichne(); });
await page.waitForTimeout(200);
const merkOhne = await page.$$eval("#einListe .eyebrow", l => l.map(x => x.textContent.trim()));
pruef("ohne Trennung nur nach Fach", merkOhne.length === 1 && merkOhne[0] === "Mathematik",
  merkOhne.join(" · "));

/* ---------- Fehlzeiten: Aufteilung je Lehrkraft ---------- */
await page.evaluate(() => { cfg.nachLehrer = true; einSub = "F"; zeichne(); });
await page.waitForTimeout(200);
const fehlHinweis = await page.textContent("#einSubHinweis");
pruef("Fehlzeiten teilen nach Lehrkraft auf",
  fehlHinweis.includes("Frau Müller") && fehlHinweis.includes("Herr Schmidt"), fehlHinweis);
pruef("und zählen je Kurs richtig",
  fehlHinweis.includes("(Frau Müller) 2") && fehlHinweis.includes("(Herr Schmidt) 4"), fehlHinweis);
await page.evaluate(() => { cfg.nachLehrer = false; zeichne(); });
await page.waitForTimeout(200);
pruef("ohne Trennung wieder nur je Fach",
  (await page.textContent("#einSubHinweis")).includes("Mathematik 6"),
  await page.textContent("#einSubHinweis"));

pruef("kein Fehlerkasten", (await fehlerkasten(page)) === null);
await ende();
