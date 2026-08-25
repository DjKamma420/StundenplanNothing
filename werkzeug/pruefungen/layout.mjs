/* Ausrichtung. Am Handy fällt Verrutschtes nicht auf, weil die Spalte dort
   die volle Breite hat — deshalb wird hier breit gemessen. */
import { starte, ende, pruef } from "../browser.mjs";

for (const breite of [1440, 1280, 390]) {
  const { page, browser } = await starte({ breite, hoehe: 850, geraet: breite < 500 ? "handy" : "desktop" });
  const mitte = breite / 2;
  const m = (wahl) => page.evaluate((s) => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect(); return Math.round(r.left + r.width / 2);
  }, wahl);

  for (const [name, wahl] of [["Eintragsknopf","#btnEintrag"], ["Wischpunkte",".punkte"],
                              ["Wischtext","#wischText"], ["Inhalt","#ansichtTag"]]) {
    const x = await m(wahl);
    pruef(`${breite}px · ${name} mittig`, Math.abs(x - mitte) <= 1, `${x} statt ${mitte}`);
  }

  /* Der Stift steht nur in der Tagesansicht. Verschwände er ganz, spränge
     die Reiterleiste bei jedem Wechsel. */
  const breiten = {};
  for (const [name, id] of [["Tag","#rTag"], ["Kal","#rKal"], ["Ein","#rEin"], ["Zeu","#rZeu"]]) {
    await page.click(id); await page.waitForTimeout(120);
    breiten[name] = await page.evaluate(() => Math.round(document.querySelector(".reiter").getBoundingClientRect().width));
  }
  const einzig = [...new Set(Object.values(breiten))];
  pruef(`${breite}px · Reiterleiste konstant`, einzig.length === 1, JSON.stringify(breiten));

  await page.click("#rKal"); await page.waitForTimeout(150);
  const titel = await m("#monatLabel"), leiste = await m(".monat");
  pruef(`${breite}px · Monatstitel mittig`, Math.abs(titel - leiste) <= 1, `${titel} statt ${leiste}`);

  pruef(`${breite}px · kein Querlauf`, await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

  /* Unter 16 px zoomt Safari auf dem iPhone beim Antippen hinein. */
  await page.evaluate(() => einstellungenOeffnen());
  await page.waitForTimeout(300);
  const klein = await page.evaluate(() => {
    const zu = [];
    document.querySelectorAll("#dlgEinst input:not([type=checkbox]):not([type=color]):not([type=file]),#dlgEinst select,#dlgEinst textarea")
      .forEach(e => { const px = parseFloat(getComputedStyle(e).fontSize); if (px < 16) zu.push((e.id || e.className) + " " + px + "px"); });
    return zu;
  });
  pruef(`${breite}px · kein Feld unter 16px`, klein.length === 0, klein.join(", "));
  await browser.close();
}
await ende();
