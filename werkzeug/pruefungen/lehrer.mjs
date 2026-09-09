/* Trennung nach Lehrkraft und das Ende des Schultages.
   Beides ist Rechnung, nicht Anzeige — hier wird es an einem gestellten
   Plan nachgerechnet, statt es beim Ausprobieren zu glauben. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page, kasten } = await starte();

/* Ein Plan, in dem dasselbe Fach zweimal steht — montags bei MÜ,
   dienstags bei SC. Der Dienstag endet nach der zweiten Stunde. */
await page.evaluate(() => {
  gewaehlt = new Date("2026-03-02T12:00");          // ein Montag
  plan.A.MO = [{fach:"MA", raum:"101", lk:"MÜ"}, null, null, null];
  plan.A.DI = [{fach:"MA", raum:"102", lk:"SC"}, {fach:"DE", raum:"103", lk:"MÜ"}, null, null];
  plan.A.MI = [null, null, null, {fach:"MA", raum:"101", lk:"MÜ"}];
  plan.B = JSON.parse(JSON.stringify(plan.A));
  cfg.zweiWochen = false;
  cfg.lehrer = {"MÜ":"Frau Müller", "SC":"Herr Schmidt"};
  ferien = [];
  cfg.nachLehrer = false;
  sichern(); zeichne();
});

/* Ohne die Einstellung bleibt alles beim Alten: der Dienstag zählt. */
pruef("ohne Trennung: nächste Stunde ist der Dienstag",
  (await page.evaluate(() => iso(naechsterTagMitFach(gewaehlt, "MA", lkFilter("MÜ"))))) === "2026-03-03");

await page.evaluate(() => { cfg.nachLehrer = true; sichern(); zeichne(); });

/* Mit Trennung überspringt die Suche den Dienstag: dort steht MA bei SC. */
pruef("mit Trennung: nächste Stunde bei derselben Lehrkraft ist der Mittwoch",
  (await page.evaluate(() => iso(naechsterTagMitFach(gewaehlt, "MA", lkFilter("MÜ"))))) === "2026-03-04");
pruef("andere Lehrkraft findet ihren eigenen Tag",
  (await page.evaluate(() => iso(naechsterTagMitFach(gewaehlt, "MA", lkFilter("SC"))))) === "2026-03-03");
pruef("ohne Lehrkraft im Plan bleibt es bei der nächsten Stunde des Fachs",
  (await page.evaluate(() => iso(naechsterTagMitFach(gewaehlt, "MA", "")))) === "2026-03-03");

/* Der Schnelldialog einer angetippten Stunde muss dieselbe Antwort geben. */
await page.evaluate(() => { offenerBlock = 0; schnellDialog(); });
await page.waitForTimeout(150);
pruef("Schnelldialog nennt den Termin bei derselben Lehrkraft",
  (await page.textContent("#bSchnellHAZiel")).includes("Mi"),
  await page.textContent("#bSchnellHAZiel"));
await page.evaluate(() => dlgSchnell.close());

/* Noten je Lehrkraft: das Zeugnis bekommt Unterpunkte. */
await page.evaluate(() => {
  noten = [
    {id:"n1", fach:"MA", lk:"MÜ", art:"s", wert:2, datum:"2026-03-01", titel:"", notiz:"", geloescht:false},
    {id:"n2", fach:"MA", lk:"SC", art:"s", wert:4, datum:"2026-03-01", titel:"", notiz:"", geloescht:false}
  ];
  sichern(); ansicht = "zeugnis"; zeichne();
});
await page.waitForTimeout(150);
const unter = await page.$$eval("#zeuListe .zeuUnter",
  l => l.map(z => z.querySelector(".wer").textContent.trim() + "=" + z.querySelector(".note").textContent.trim()));
pruef("Zeugnis trennt das Fach nach Lehrkraft",
  unter.includes("Frau Müller=2") && unter.includes("Herr Schmidt=4"), unter.join(" · "));
pruef("Gesamtschnitt des Fachs bleibt stehen",
  (await page.textContent('#zeuListe [data-zeufach="MA"] .note')).trim() === "3");

await page.evaluate(() => { cfg.nachLehrer = false; zeichne(); });
await page.waitForTimeout(150);
pruef("ohne Trennung keine Unterpunkte",
  (await page.$$("#zeuListe .zeuUnter")).length === 0);

/* Notizen: Zwischenüberschriften je Lehrkraft. */
await page.evaluate(() => {
  cfg.nachLehrer = true;
  eintraege = [
    {id:"e1", typ:"N", fach:"MA", lk:"MÜ", datum:"2026-03-02", titel:"Eins", notiz:"",
     erledigt:false, erledigtAm:null, geloescht:false, geloeschtAm:null},
    {id:"e2", typ:"N", fach:"MA", lk:"SC", datum:"2026-03-02", titel:"Zwei", notiz:"",
     erledigt:false, erledigtAm:null, geloescht:false, geloeschtAm:null}
  ];
  sichern(); ansicht = "eintraege"; einSub = "N"; zeichne();
});
await page.waitForTimeout(150);
const koepfe = await page.$$eval("#einListe .eyebrow", l => l.map(x => x.textContent.trim()));
pruef("Notizen zeigen Überschriften je Lehrkraft",
  koepfe.includes("Frau Müller") && koepfe.includes("Herr Schmidt"), koepfe.join(" · "));

await page.evaluate(() => {
  eintraege.forEach(e => e.lk = "");
  sichern(); zeichne();
});
await page.waitForTimeout(150);
pruef("eine einzige Gruppe bekommt keine Überschrift",
  (await page.$$("#einListe .eyebrow")).length === 0);

/* Schulende: der Dienstag endet nach der zweiten Stunde, nicht nach der
   vierten. Genau das war vorher falsch. */
pruef("letzter Block des Dienstags ist die zweite Stunde",
  (await page.evaluate(() => letzterBlock(new Date("2026-03-03T12:00")))) === 1);
pruef("letzter Block des Montags ist die erste Stunde",
  (await page.evaluate(() => letzterBlock(new Date("2026-03-02T12:00")))) === 0);
pruef("ein Tag ohne Unterricht hat keinen letzten Block",
  (await page.evaluate(() => letzterBlock(new Date("2026-03-05T12:00")))) === -1);
pruef("Schulschluss rechnet mit dem eigenen Stundenplan",
  (await page.evaluate(() => {
    /* countdownText liest die Uhr — der Dienstag wird zu „heute" gemacht. */
    const echt = Date.now, tag = new Date("2026-03-03T09:00");
    Date.now = () => tag.getTime();
    const alt = window.Date;
    window.Date = class extends alt { constructor(...a){ return a.length ? new alt(...a) : new alt(tag); } };
    window.Date.now = () => tag.getTime();
    gewaehlt = new alt("2026-03-03T12:00");
    const t = countdownText();
    window.Date = alt; Date.now = echt;
    return t;
  })).startsWith("Schulschluss in 2 h 20"),
  "Ende der zweiten Stunde ist 11:20, also 2 h 20 min nach 09:00");

/* Der ganze Weg: Stunde antippen, Hausaufgabe anlegen, speichern. Die
   Lehrkraft muss aus der Stunde kommen und im Eintrag landen. */
await page.evaluate(() => {
  cfg.nachLehrer = true; eintraege = []; sichern();
  ansicht = "tag"; gewaehlt = new Date("2026-03-02T12:00"); zeichne();
  offenerBlock = 0; schnellDialog();
});
await page.waitForTimeout(150);
await page.click("#bSchnellHA");
await page.waitForTimeout(200);
pruef("Eintragsdialog zeigt das Feld für die Lehrkraft", await page.isVisible("#eLkWrap"));
pruef("Lehrkraft aus der angetippten Stunde ist vorbelegt",
  (await page.inputValue("#eLk")) === "MÜ", await page.inputValue("#eLk"));
await page.fill("#eText", "Seite 12");
await page.click("#bEintragSpeichern");
await page.waitForTimeout(250);
pruef("Hausaufgabe merkt sich die Lehrkraft",
  (await page.evaluate(() => eintraege.find(e => e.titel === "Seite 12")?.lk)) === "MÜ");

/* Die Einstellung selbst: einmal durch den Dialog und zurück. */
await page.evaluate(() => { cfg.nachLehrer = false; sichern(); einstellungenOeffnen(); });
await page.waitForTimeout(300);
await page.check("#sNachLehrer");
await page.click("#bEinstSpeichern");
await page.waitForTimeout(300);
pruef("Einstellung wird gespeichert", await page.evaluate(() => cfg.nachLehrer === true));
pruef("Einstellung übersteht das Säubern einer Sicherung",
  await page.evaluate(() => cfgSaeubern({nachLehrer:true}).nachLehrer === true
                         && cfgSaeubern({}).nachLehrer === false));

pruef("kein Fehlerkasten", (await fehlerkasten(page)) === null, (await kasten()) || "");
await ende();
