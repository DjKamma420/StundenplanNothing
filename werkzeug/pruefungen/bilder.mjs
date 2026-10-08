/* Bilder müssen in allen drei Datentöpfen dieselben Wege überstehen:
   Dateiauswahl, Bearbeiten, Neustart, Sicherung, Import und Abbruch. */
import fs from "node:fs";
import { starte, ende, pruef } from "../browser.mjs";

const { page, kasten } = await starte({ geraet:"handy" });
const bild = fs.readFileSync(new URL("../../icon-192.png", import.meta.url));
const dateien = ["eins.png", "zwei.png"].map(name => ({name, mimeType:"image/png", buffer:bild}));
const kennungen = {};
const oeffne = async (typ, id) => page.evaluate(({typ,id}) => {
  if(!id) eintragOeffnen(null, new Date(), typ, "MA");
  else if(typ === "E") ereignisOeffnen(id);
  else if(typ === "G") noteOeffnen(noten.find(x => x.id === id));
  else eintragOeffnen(eintraege.find(x => x.id === id));
}, {typ,id});
const warte = async n => page.waitForFunction(n => bilder.length === n && bilderLaufend === 0, n);
const speichere = async () => {
  await page.click("#bEintragSpeichern");
  await page.waitForFunction(() => !dlgEintrag.open);
};

for(const typ of ["H","K","N","M","F","E","G"]){
  await oeffne(typ);
  pruef(typ + " · Bildauswahl sichtbar", await page.isVisible("#bBildWahl"));
  if(typ !== "F") await page.fill("#eText", "Bildtest " + typ);
  if(typ === "G") await page.fill("#eWert", "2");
  await page.setInputFiles("#bildDatei", dateien);
  await warte(2);
  pruef(typ + " · zwei Vorschauen", await page.locator("#eBilder img").count() === 2);
  await page.click("#eBilder [data-bildschau='0']");
  pruef(typ + " · vergrößertes Bild", await page.isVisible("#dlgBild"));
  await page.click("#bBildAb");
  await speichere();
  kennungen[typ] = await page.evaluate(typ => {
    const topf = typ === "E" ? sonder : typ === "G" ? noten : eintraege.filter(x => x.typ === typ);
    return topf.at(-1).id;
  }, typ);
  await oeffne(typ, kennungen[typ]);
  pruef(typ + " · Bearbeiten behält Bilder", await page.locator("#eBilder img").count() === 2);
  await page.click("#eBilder [data-bildweg='0']");
  await speichere();
  if(typ === "E") kennungen.E = await page.evaluate(() => sonder.at(-1).id);
}

const stand = await page.evaluate(() => {
  const alle = [...eintraege, ...sonder, ...noten];
  return alle.length === 7 && alle.every(e => e.bilder.length === 1)
    && ["eintraege","sonder","noten"].every(k => Speicher.lies(k, []).every(e => e.bilder.length === 1));
});
pruef("alle Eintragsarten mit entferntem Bild gespeichert", stand);

await page.reload({waitUntil:"networkidle"});
if(await page.isVisible("#profilStart")) await page.click("#pGitter .kachel");
await oeffne("H", kennungen.H);
pruef("Bilder überstehen Neustart", await page.locator("#eBilder img").count() === 1);
await page.click("#bEintragAb");
await page.waitForFunction(() => !dlgEintrag.open);

const sicherung = await page.evaluate(() => sicherungsText());
const gesamt = await page.evaluate(() => JSON.parse(sicherungAlleText()));
pruef("Gesamtsicherung enthält alle Anhänge",
  [...gesamt.profile[0].eintraege, ...gesamt.profile[0].sonder, ...gesamt.profile[0].noten]
    .every(e => e.bilder.length === 1));
pruef("Planfreigabe enthält keine Bilder", await page.evaluate(() => !planText().includes("data:image/")));
await page.evaluate(text => {
  eintraege = []; sonder = []; noten = [];
  sDaten.value = text; document.getElementById("sLaden").click();
}, sicherung);
pruef("Profilsicherung stellt alle Anhänge wieder her", await page.evaluate(() =>
  [...eintraege, ...sonder, ...noten].length === 7
  && [...eintraege, ...sonder, ...noten].every(e => e.bilder.length === 1)));
await page.evaluate(gesamt => alleProfileUebernehmen(gesamt.profile), gesamt);
pruef("Gesamtsicherung stellt Ereignis- und Notenbilder wieder her", await page.evaluate(() =>
  sonder[0].bilder.length === 1 && noten[0].bilder.length === 1));

const rein = await page.evaluate(() => {
  const gut = eintraege[0].bilder[0];
  const boese = [gut, '" onerror=alert(1) x="', "https://example.org/bild.png", "data:image/svg+xml;base64,PHN2Zz4="];
  const e = {id:"alt", typ:"H", fach:"MA", datum:"2026-10-08", bilder:boese};
  return {ein:eintragSaeubern(e).bilder, ereignis:sonderSaeubern(e).bilder,
    note:noteSaeubern({...e,wert:2}).bilder, alt:eintragSaeubern({...e,bilder:undefined}).bilder,
    max:eintragSaeubern({...e,bilder:Array(40).fill(gut)}).bilder.length,
    stand:paketSaeubern({cfg:{fassung:3},eintraege:[e]}).cfg.fassung};
});
pruef("Import verwirft fremde URLs, SVG und HTML bei allen Arten",
  rein.ein.length === 1 && rein.ereignis.length === 1 && rein.note.length === 1);
pruef("alte Sicherungen bleiben lesbar", rein.alt.length === 0 && rein.stand === 4);
pruef("Import begrenzt Bildanzahl", rein.max === 30);

await oeffne("N");
await page.evaluate(() => {
  const c = document.createElement("canvas"); c.width = 1800; c.height = 900;
  c.getContext("2d").fillRect(0,0,c.width,c.height);
  const daten = atob(c.toDataURL("image/png").split(",")[1]);
  const bytes = Uint8Array.from(daten, x => x.charCodeAt(0));
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes],"clipboard.png",{type:"image/png"}));
  eNotiz.dispatchEvent(new ClipboardEvent("paste",{clipboardData:transfer,bubbles:true,cancelable:true}));
});
await warte(1);
const groesse = await page.evaluate(async () => {
  const b = new Image(); b.src = bilder[0]; await b.decode();
  return {breite:b.width, hoehe:b.height, jpeg:bilder[0].startsWith("data:image/jpeg;base64,")};
});
pruef("Zwischenablage verkleinert Bilder auf 1000 px und JPEG",
  groesse.breite === 1000 && groesse.hoehe === 500 && groesse.jpeg);
pruef("Handydialog läuft nicht quer", await page.evaluate(() =>
  dlgEintrag.scrollWidth <= dlgEintrag.clientWidth + 1));
await page.click("#bEintragAb");
await page.waitForFunction(() => !dlgEintrag.open);

/* Ein verzögerter echter Lesevorgang darf nach Abbruch nicht in den nächsten
   Eintrag schreiben. Der Dateileser wird nur für diesen Grenzfall verzögert. */
await oeffne("N");
await page.evaluate(() => {
  window.__alterLeser = FileReader;
  window.FileReader = class extends window.__alterLeser {
    readAsDataURL(datei){ setTimeout(() => super.readAsDataURL(datei), 200); }
  };
});
await page.setInputFiles("#bildDatei", dateien[0]);
pruef("Speichern wartet auf Bildverarbeitung", await page.isDisabled("#bEintragSpeichern"));
await page.click("#bEintragAb");
await page.waitForFunction(() => !dlgEintrag.open);
await oeffne("K");
await page.waitForTimeout(400);
pruef("abgebrochene Bilder bleiben aus neuem Eintrag heraus", await page.evaluate(() => bilder.length === 0));
await page.evaluate(() => { window.FileReader = window.__alterLeser; });
await page.setInputFiles("#bildDatei", {name:"kaputt.png",mimeType:"image/png",buffer:Buffer.from("kein Bild")});
await page.waitForFunction(() => bilderLaufend === 0);
pruef("defektes Bild sperrt Speichern nicht", !(await page.isDisabled("#bEintragSpeichern")));
await page.click("#bEintragAb");
await page.waitForFunction(() => !dlgEintrag.open);

/* Voller Speicher muss beim Anlegen und beim Ändern den alten Datensatz
   behalten und die noch nicht gespeicherten Bilder im Dialog lassen. */
for(const typ of ["H","E","G"]){
  await oeffne(typ, kennungen[typ]);
  await page.evaluate(() => {
    window.__vorher = JSON.stringify([eintraege,sonder,noten]);
    window.__schreib = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("voll", "QuotaExceededError"); };
  });
  await page.fill("#eText", "Nicht gespeichert");
  await page.click("#bEintragSpeichern");
  pruef(typ + " · bei Speicherfehler bleibt Dialog offen", await page.isVisible("#dlgEintrag"));
  pruef(typ + " · bei Speicherfehler bleibt alter Datensatz", await page.evaluate(() =>
    window.__vorher === JSON.stringify([eintraege,sonder,noten])));
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__schreib;
    document.getElementById("fehlerkasten")?.remove();
  });
  await page.click("#bEintragAb");
  await page.waitForFunction(() => !dlgEintrag.open);
}
pruef("kein unerwarteter Fehlerkasten", await kasten() === null);
await ende();
