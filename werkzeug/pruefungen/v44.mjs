/* Die fünf Ergänzungen aus v44: Fach an der Fehlzeit, Plan allein teilen,
   Stundenplan als .ics, wiederkehrende Einträge, Wochenansicht, Pfeiltasten. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page } = await starte({ geraet: "handy" });

/* Ein gestellter Plan, auf dem alles Weitere fusst. */
await page.evaluate(() => {
  gewaehlt = new Date("2026-03-02T12:00");            // Montag
  cfg.zweiWochen = false;
  cfg.klasse = "10b";
  cfg.lehrer = {"MÜ":"Frau Müller"};
  cfg.fachnamen = {MA:"Mathematik", DE:"Deutsch"};
  plan.A.MO = [{fach:"MA",raum:"101",lk:"MÜ"}, {fach:"DE",raum:"7",lk:""}, null, null];
  plan.A.DI = [{fach:"DE",raum:"7",lk:""}, null, null, null];
  plan.B = JSON.parse(JSON.stringify(plan.A));
  /* Vom heutigen Tag aus in die Zukunft: der Export blickt ein Jahr voraus,
     eine Ferienwoche in der Vergangenheit hätte er zu Recht ignoriert. */
  const f1 = plusTage(new Date(), 30), f2 = plusTage(new Date(), 44);
  ferien = [{von:iso(f1), bis:iso(f2), name:"Osterferien", typ:"ferien"}];
  window.__ferienVon = iso(f1); window.__ferienBis = iso(f2);
  eintraege = []; noten = []; sonder = [];
  sichern(); zeichne();
});

/* ---------- 1. Fehlzeit kennt ihr Fach ---------- */
await page.evaluate(() => { offenerBlock = 0; schnellDialog(); });
await page.waitForTimeout(150);
await page.click("#bSchnellFehl");
await page.waitForTimeout(200);
pruef("Fehlzeit: Fachfeld ist sichtbar", await page.isVisible("#eFachWrap"));
pruef("Fehlzeit: Fach der angetippten Stunde ist vorbelegt",
  (await page.inputValue("#eFach")) === "MA", await page.inputValue("#eFach"));
await page.click("#bEintragSpeichern");
await page.waitForTimeout(250);
pruef("Fehlzeit merkt sich das Fach",
  (await page.evaluate(() => eintraege.find(e => e.typ === "F")?.fach)) === "MA");
pruef("Fehlzeit überlebt das Säubern mit Fach",
  await page.evaluate(() => eintragSaeubern({id:"x",typ:"F",fach:"ma",datum:"2026-03-02",
    titel:"entschuldigt",stunden:2}).fach === "MA"));
pruef("Fehlzeiten-Hinweis teilt nach Fach auf",
  (await page.evaluate(() => { ansicht="eintraege"; einSub="F"; zeichne();
    return document.querySelector("#einSubHinweis").textContent; })).includes("Mathematik"),
  await page.textContent("#einSubHinweis"));

/* ---------- 2. Nur den Plan teilen ---------- */
const paket = await page.evaluate(() => JSON.parse(planText()));
pruef("Plan-Paket ist als solches gekennzeichnet", paket.art === "plan");
pruef("Plan-Paket enthält den Plan", !!(paket.plan && paket.plan.A && paket.plan.A.MO[0]));
pruef("Plan-Paket enthält keine Noten, Einträge oder Fehlzeiten",
  !("noten" in paket) && !("eintraege" in paket) && !("sonder" in paket),
  Object.keys(paket).join(","));
pruef("Plan-Paket enthält keine Bewertungseinstellungen",
  !("anteile" in paket.cfg) && !("notenSystem" in paket.cfg) && !("akzent" in paket.cfg),
  Object.keys(paket.cfg).join(","));

/* Einlesen ersetzt nur den Plan. Der Rest muss unberührt bleiben. */
const fremd = JSON.stringify({fassung:2, art:"plan",
  cfg:{slots:[{std:"1",von:"07:30",bis:"08:15"}], zweiWochen:false, fachnamen:{PH:"Physik"}, lehrer:{}},
  plan:{A:{MO:[{fach:"PH",raum:"L1",lk:""}]}}});
await page.evaluate(() => { cfg.akzent = "#12a463"; noten = [
  {id:"n1",fach:"MA",lk:"",art:"s",wert:2,datum:"2026-03-01",titel:"",notiz:"",geloescht:false}];
  sichern(); einstellungenOeffnen(); });
await page.waitForTimeout(300);
/* Seit v46 sind die Einstellungen zweistufig — erst in den Bereich. */
await page.evaluate(() => einstZeigen("sicherung"));
await page.waitForTimeout(150);
await page.fill("#sDaten", fremd);
await page.click("#sLaden");
await page.waitForTimeout(400);
pruef("Plan-Einlesen ersetzt den Plan",
  (await page.evaluate(() => plan.A.MO[0]?.fach)) === "PH");
pruef("Plan-Einlesen lässt Noten stehen",
  (await page.evaluate(() => noten.length)) === 1);
pruef("Plan-Einlesen lässt Fehlzeiten stehen",
  (await page.evaluate(() => eintraege.filter(e => e.typ === "F").length)) === 1);
pruef("Plan-Einlesen lässt die Akzentfarbe stehen",
  (await page.evaluate(() => cfg.akzent)) === "#12a463");
pruef("Plan-Einlesen übernimmt das Stundenraster",
  (await page.evaluate(() => cfg.slots.length + ":" + cfg.slots[0].von)) === "1:07:30");
pruef("Plan-Einlesen ergänzt fremde Fachnamen, behält eigene",
  await page.evaluate(() => cfg.fachnamen.PH === "Physik" && cfg.fachnamen.MA === "Mathematik"),
  await page.evaluate(() => JSON.stringify(cfg.fachnamen)));

/* ---------- 3. Stundenplan als .ics ---------- */
await page.evaluate(() => {
  cfg.slots = [{std:"1,2",von:"08:00",bis:"09:30"},{std:"3,4",von:"09:50",bis:"11:20"}];
  plan.A.MO = [{fach:"MA",raum:"101",lk:"MÜ"}, null];
  plan.A.DI = [{fach:"DE",raum:"7",lk:""}, null];
  plan.B = JSON.parse(JSON.stringify(plan.A));
  normalisiere(); sichern(); zeichne();
});
const ics = await page.evaluate(() => icsPlanBauen());
pruef("Plan-ICS ist ein gültiger Kalender",
  ics.startsWith("BEGIN:VCALENDAR") && ics.trimEnd().endsWith("END:VCALENDAR"));
pruef("Plan-ICS enthält je belegter Stunde einen Termin",
  (ics.match(/BEGIN:VEVENT/g) || []).length === 2,
  String((ics.match(/BEGIN:VEVENT/g) || []).length));
pruef("Plan-ICS wiederholt wöchentlich", /RRULE:FREQ=WEEKLY;UNTIL=/.test(ics));
pruef("Plan-ICS trägt den ausgeschriebenen Fachnamen", /SUMMARY:Mathematik/.test(ics));
pruef("Plan-ICS nennt Raum und Lehrkraft",
  /LOCATION:101/.test(ics) && /DESCRIPTION:Frau M/.test(ics));
const spanne = await page.evaluate(() => [window.__ferienVon, window.__ferienBis]);
const ausgenommen = (ics.match(/EXDATE:[^\r\n]+/g) || []).join(" ")
  .match(/\d{8}/g) || [];
const inFerien = ausgenommen.filter(d => {
  const iso8 = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  return iso8 >= spanne[0] && iso8 <= spanne[1];
});
pruef("Plan-ICS nimmt die Ferien aus", inFerien.length > 0,
  inFerien.length ? inFerien.join(", ") : "keine EXDATE in der Ferienspanne");
pruef("Plan-ICS nimmt nur Ferientage aus", ausgenommen.length === inFerien.length,
  `${ausgenommen.length} EXDATE, davon ${inFerien.length} in den Ferien`);
const icsAB = await page.evaluate(() => { cfg.zweiWochen = true; const t = icsPlanBauen();
  cfg.zweiWochen = false; return t; });
pruef("Plan-ICS rechnet A/B-Wochen zweiwöchentlich", /INTERVAL=2/.test(icsAB));
pruef("Termine-ICS enthält weiterhin keine Unterrichtsserie",
  !/RRULE/.test(await page.evaluate(() => icsBauen())));

/* ---------- 4. Wiederkehrende Einträge ---------- */
await page.evaluate(() => {
  eintraege = []; sichern();
  eintragOeffnen(null, new Date("2026-03-06T12:00"), "N", "DE");
});
await page.waitForTimeout(200);
pruef("Notiz zeigt die Wiederholung", await page.isVisible("#eWdhWrap"));
await page.selectOption("#eWdh", "1");
await page.fill("#eWdhBis", "2026-04-03");
await page.fill("#eText", "Vokabeltest");
await page.waitForTimeout(150);
pruef("Der Stand nennt die Zahl der Termine",
  (await page.textContent("#eWdhStand")).startsWith("5 Termine"),
  await page.textContent("#eWdhStand"));
await page.click("#bEintragSpeichern");
await page.waitForTimeout(300);
const reihe = await page.evaluate(() => eintraege.filter(e => e.titel === "Vokabeltest"));
pruef("Die Reihe entsteht als echte Einträge", reihe.length === 5, String(reihe.length));
pruef("alle fallen auf denselben Wochentag",
  new Set(reihe.map(e => new Date(e.datum+"T12:00").getDay())).size === 1);
pruef("alle tragen dieselbe Reihen-Kennung",
  new Set(reihe.map(e => e.serie)).size === 1 && !!reihe[0].serie);
pruef("jeder Termin hat eine eigene Kennung",
  new Set(reihe.map(e => e.id)).size === 5);

/* Einzeln abhaken war der Grund für echte Einträge statt einer Regel. */
await page.evaluate(() => {
  const e = eintraege.find(x => x.titel === "Vokabeltest");
  e.erledigt = true; e.erledigtAm = iso(new Date()); sichern();
});
pruef("ein Termin lässt sich einzeln abhaken",
  (await page.evaluate(() => eintraege.filter(e => e.titel === "Vokabeltest" && e.erledigt).length)) === 1);

/* Löschen fragt nach: OK nimmt die ganze Reihe (dialogeJa bestätigt). */
await page.evaluate(() => eintragOeffnen(eintraege.find(e => e.titel === "Vokabeltest")));
await page.waitForTimeout(200);
await page.click("#bEintragWeg");
await page.waitForTimeout(300);
pruef("die ganze Reihe wandert ins Archiv",
  (await page.evaluate(() => eintraege.filter(e => e.titel === "Vokabeltest" && !e.geloescht).length)) === 0);
pruef("Noten kennen keine Wiederholung",
  await page.evaluate(() => { eintragOeffnen(null, new Date(), "G", "MA");
    return document.querySelector("#eWdhWrap").classList.contains("hidden"); }));
await page.evaluate(() => dlgEintrag.close());

/* ---------- 5. Wochenansicht ---------- */
await page.evaluate(() => { ansicht = "tag"; gewaehlt = new Date("2026-03-02T12:00"); zeichne(); });
await page.waitForTimeout(150);
await page.click("#btnWoche");
await page.waitForTimeout(250);
pruef("Wochendialog geht auf", await page.evaluate(() => dlgWoche.open));
pruef("Kopfzeile nennt die Kalenderwoche",
  (await page.textContent("#wochenLabel")).startsWith("KW 10"),
  await page.textContent("#wochenLabel"));
pruef("fünf Spalten für MO–FR",
  (await page.$$("#wochenTab th")).length === 6);          // Zeitspalte plus fünf Tage
pruef("nur so viele Zeilen wie belegte Stunden",
  (await page.$$("#wochenTab tr")).length === 2,           // Kopf plus eine Stunde
  String((await page.$$("#wochenTab tr")).length));
const montagsZelle = (await page.textContent("#wochenTab tr:nth-child(2) td:nth-child(2)"))
  .replace(/\s+/g,"").trim();
pruef("Montag zeigt Mathe mit Raum",
  montagsZelle.includes("MA") && montagsZelle.includes("101"), montagsZelle);
await page.click("#wochenPlus"); await page.waitForTimeout(200);
pruef("Vorblättern wechselt die Woche",
  (await page.textContent("#wochenLabel")).startsWith("KW 11"),
  await page.textContent("#wochenLabel"));
await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(200);
pruef("Pfeiltaste blättert im Dialog zurück",
  (await page.textContent("#wochenLabel")).startsWith("KW 10"));
/* Ferienwoche: schraffiert und benannt. Sie liegt dort, wo sie oben
   angelegt wurde — vom heutigen Tag aus gerechnet, nicht an einem festen Datum. */
await page.evaluate(() => {
  wochenAnker = montagVon(new Date(window.__ferienVon+"T12:00"));
  /* In den Ferien steht im Plan nichts Eigenes; die Zeilen kommen aus dem
     Regelplan, der auch in einer Ferienwoche gilt. */
  zeichneWoche();
});
await page.waitForTimeout(150);
pruef("Ferien sind in der Woche erkennbar",
  (await page.textContent("#wochenHinweis")).includes("Osterferien"),
  await page.textContent("#wochenHinweis"));
pruef("Ferientage sind markiert", (await page.$$("#wochenTab td.ferien")).length > 0);
/* Antippen springt auf den Tag. */
await page.evaluate(() => { wochenAnker = montagVon(new Date("2026-03-02T12:00")); zeichneWoche(); });
await page.waitForTimeout(150);
await page.click("#wochenTab [data-wochentag='2026-03-03']");
await page.waitForTimeout(250);
pruef("Antippen springt auf den Tag",
  (await page.evaluate(() => iso(gewaehlt))) === "2026-03-03");
pruef("Dialog ist danach zu", !(await page.evaluate(() => dlgWoche.open)));
pruef("die Seite läuft nicht waagerecht",
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

/* ---------- 6. Pfeiltasten in der Ansicht ---------- */
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200);
pruef("Pfeil rechts blättert einen Tag vor",
  (await page.evaluate(() => iso(gewaehlt))) === "2026-03-04");
await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(200);
pruef("Pfeil links blättert zurück",
  (await page.evaluate(() => iso(gewaehlt))) === "2026-03-03");
await page.keyboard.press("/"); await page.waitForTimeout(250);
pruef("Schrägstrich springt in die Suche",
  await page.evaluate(() => ansicht === "eintraege"
    && document.activeElement === document.querySelector("#suchFeld")));
/* Im Suchfeld darf die Pfeiltaste nicht mehr die Ansicht wegblättern. */
await page.evaluate(() => { const d = iso(gewaehlt); window.__vorher = d; });
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200);
pruef("im Eingabefeld blättern die Pfeile nicht",
  await page.evaluate(() => iso(gewaehlt) === window.__vorher));

pruef("kein Fehlerkasten", (await fehlerkasten(page)) === null);
await ende();
