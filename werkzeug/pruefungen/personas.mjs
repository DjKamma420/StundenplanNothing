/* Nutzer-Perspektiven: alt/wenig technikaffin, jung/stresstestend, unachtsam. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";
const { page, browser } = await starte({ geraet:"handy", breite:390, hoehe:850, dialogeJa:false });

/* Etwas Plan, damit Knöpfe da sind. */
await page.evaluate(() => {
  ["MO","DI","MI","DO","FR"].forEach(t => plan.A[t]=[{fach:"MA",raum:"B1",lk:"X"},{fach:"DE",raum:"A2",lk:"Y"},null,null]);
  cfg.klasse="10b"; sichern(); zeichne();
});

/* ---------- ALT / wenig technikaffin ---------- */

/* Alle rein-ikonischen Knöpfe brauchen eine Beschriftung (Screenreader). */
const ohneLabel = await page.evaluate(() => {
  const raus = [];
  document.querySelectorAll("button").forEach(b => {
    if (b.offsetParent === null) return;                 // unsichtbar
    const txt = (b.textContent||"").trim();
    const label = b.getAttribute("aria-label") || b.getAttribute("title");
    // Knopf ohne Text und ohne Label = für Screenreader stumm
    if (!txt && !label) raus.push(b.id || b.className || "?");
  });
  return raus;
});
pruef("kein sichtbarer Knopf ohne Text und ohne aria-label", ohneLabel.length === 0, ohneLabel.join(", "));

/* Tap-Ziele: primäre Bedienknöpfe sollten nicht winzig sein (Richtwert 32px). */
const winzig = await page.evaluate(() => {
  const raus = [];
  document.querySelectorAll("button, input, select, .tagfeld, .block").forEach(el => {
    if (el.offsetParent === null) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const klein = Math.min(r.width, r.height);
    if (klein < 24) raus.push((el.id||el.className||el.tagName) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  });
  return raus;
});
/* WCAG 2.5.8 (AA) verlangt 24x24 CSS-px, nicht die oft zitierten 44x44
   (das ist AAA/Apple-HIG, keine Mindestanforderung). */
pruef("keine Tap-Ziele unter WCAG-AA-Minimum (24px)", winzig.length === 0, winzig.slice(0,6).join(" · "));

/* Kontrast der gedämpften Schrift gegen den Hintergrund (WCAG). */
const kontrast = await page.evaluate(() => {
  const lin = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
  const L = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const rgb = s => (s.match(/\d+/g)||[]).slice(0,3).map(Number);
  const ratio = (a,b) => { const l1=L(rgb(a)),l2=L(rgb(b)); const hi=Math.max(l1,l2),lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };
  const cs = getComputedStyle(document.body);
  const muted = getComputedStyle(document.querySelector(".detail")||document.body).color;
  const bg = cs.backgroundColor;
  return { verhaeltnis: +ratio(muted, bg).toFixed(2), muted, bg };
});
pruef("gedämpfte Schrift erreicht WCAG-AA für Kleintext (≥4.5)", kontrast.verhaeltnis >= 4.5,
      `Verhältnis ${kontrast.verhaeltnis} (${kontrast.muted} auf ${kontrast.bg})`);

/* Tastatur: Eintrag anlegen und speichern ohne Maus/Touch. */
await page.evaluate(() => { ansicht="tag"; zeichne(); });
await page.focus("#btnEintrag"); await page.keyboard.press("Enter"); await page.waitForTimeout(200);
const dialogOffen = await page.evaluate(() => document.getElementById("dlgEintrag").open);
pruef("Eintragsdialog per Tastatur (Enter) erreichbar", dialogOffen === true);
if (dialogOffen) {
  await page.fill("#eText", "Per Tastatur");
  await page.click("#bEintragSpeichern"); await page.waitForTimeout(200);
  const da = await page.evaluate(() => eintraege.some(e => e.titel === "Per Tastatur" && !e.geloescht));
  pruef("per Tastatur angelegter Eintrag gespeichert", da);
}

/* ---------- JUNG / Stress ---------- */

/* Schnelles Doppeltippen auf Speichern darf keinen Doppeleintrag erzeugen. */
await page.evaluate(() => { eintraege = eintraege.filter(e=>e.titel!=="DOPPEL"); sichern();
  eintragOeffnen(null, new Date(), "N", ""); });
await page.waitForTimeout(150);
await page.fill("#eText","DOPPEL");
await page.evaluate(() => { const b=document.getElementById("bEintragSpeichern"); b.click(); b.click(); b.click(); });
await page.waitForTimeout(200);
const doppel = await page.evaluate(() => eintraege.filter(e=>e.titel==="DOPPEL"&&!e.geloescht).length);
pruef("dreifaches Tippen auf Speichern erzeugt genau einen Eintrag", doppel === 1, doppel + " Einträge");

/* Sehr langer Text bringt weder Absturz noch Querlauf. */
await page.evaluate(() => {
  eintraege.push({id:"lang",typ:"N",fach:"MA",datum:iso(new Date()),
    titel:"L".repeat(5000), notiz:"Wört ".repeat(2000), erledigt:false,geloescht:false});
  sichern(); ansicht="tag"; zeichne();
});
await page.waitForTimeout(150);
const quer = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
pruef("5000-Zeichen-Titel erzeugt keinen horizontalen Querlauf", quer,
      await page.evaluate(() => document.documentElement.scrollWidth + " > " + document.documentElement.clientWidth));

/* Emoji in Feldern. */
await page.evaluate(() => {
  eintraege.push({id:"emo",typ:"H",fach:"MA",datum:iso(new Date()),titel:"🎉📚🧪 Test 你好",notiz:"",erledigt:false,geloescht:false});
  sichern(); ansicht="eintraege"; einSub="H"; zeichne();
});
await page.waitForTimeout(120);
pruef("Emoji/Unicode im Titel ohne Fehler", (await fehlerkasten(page)) === null);

/* Viele Einträge: rendert es und in vertretbarer Zeit? */
const dauer = await page.evaluate(() => {
  eintraege = []; const h = iso(new Date());
  for (let i=0;i<500;i++) eintraege.push({id:"m"+i,typ:"H",fach:"MA",datum:h,titel:"Aufgabe "+i,notiz:"x",erledigt:false,geloescht:false});
  sichern();
  const t0 = performance.now(); ansicht="eintraege"; einSub="H"; zeichne(); return Math.round(performance.now()-t0);
});
pruef("500 Einträge rendern in vertretbarer Zeit (<1500ms)", dauer < 1500, dauer + " ms");
pruef("kein Fehler bei 500 Einträgen", (await fehlerkasten(page)) === null);

/* ---------- UNACHTSAM ---------- */

let gefragt = [];
page.on("dialog", async d => { gefragt.push(d.message()); await d.dismiss(); });   // ausdrücklich ablehnen
await page.evaluate(() => { window.__vorReset = eintraege.length; einstellungenOeffnen(); });
await page.waitForTimeout(200);
await page.click("#sReset"); await page.waitForTimeout(200);
const nachAbbruch = await page.evaluate(() => eintraege.length);
pruef("„Alles löschen“ fragt nach und bricht bei Ablehnung ab",
      gefragt.some(m=>/löschen/i.test(m)) && nachAbbruch === (await page.evaluate(()=>window.__vorReset)),
      "gefragt: " + gefragt.length + ", danach " + nachAbbruch + " Einträge");

pruef("kein Fehlerkasten am Ende", (await fehlerkasten(page)) === null, ((await fehlerkasten(page))||"").slice(0,80));
await ende();
