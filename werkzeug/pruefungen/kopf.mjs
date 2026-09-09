/* Der Kopf der App. Ein Platz für den Stift, eine Bedeutung je Ansicht —
   und eine Reiterleiste, die dabei nicht springt. */
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page } = await starte({ geraet: "handy" });

const sichtbar = sel => page.evaluate(s => {
  const el = document.querySelector(s);
  if(!el) return false;
  const st = getComputedStyle(el);
  return st.visibility !== "hidden" && st.display !== "none";
}, sel);
const kasten = sel => page.evaluate(s => {
  const r = document.querySelector(s).getBoundingClientRect();
  return {x:Math.round(r.x), b:Math.round(r.width)};
}, sel);

/* Beide Stifte liegen im selben Kasten — sonst wäre es nicht ein Platz. */
const platzEdit = await kasten("#btnEdit"), platzSort = await kasten("#btnSort");
pruef("beide Stifte teilen sich denselben Platz",
  platzEdit.x === platzSort.x && platzEdit.b === platzSort.b,
  JSON.stringify(platzEdit) + " / " + JSON.stringify(platzSort));

const reiterBreite = {};
for(const [knopf, name] of [["#rTag","tag"],["#rKal","kalender"],["#rEin","eintraege"],["#rZeu","zeugnis"]]){
  await page.click(knopf); await page.waitForTimeout(150);
  reiterBreite[name] = (await kasten(".reiter")).b;
  const edit = await sichtbar("#btnEdit"), sort = await sichtbar("#btnSort");
  pruef(`${name}: höchstens ein Stift sichtbar`, !(edit && sort), `edit=${edit} sort=${sort}`);
  if(name === "tag")       pruef("Tag zeigt den Plan-Stift", edit && !sort);
  if(name === "eintraege") pruef("Einträge zeigt den Sortier-Stift", sort && !edit);
  if(name === "kalender" || name === "zeugnis")
    pruef(`${name} zeigt keinen Stift`, !edit && !sort);
}
pruef("Reiterleiste bleibt in jeder Ansicht gleich breit",
  new Set(Object.values(reiterBreite)).size === 1, JSON.stringify(reiterBreite));

/* In einer Unterliste gibt es nichts zu sortieren. */
await page.click("#rEin"); await page.waitForTimeout(150);
await page.evaluate(() => { einSub = "H"; zeichne(); });
await page.waitForTimeout(150);
pruef("Unterliste zeigt keinen Stift", !(await sichtbar("#btnSort")));
pruef("Reiterleiste bleibt auch dort gleich breit",
  (await kasten(".reiter")).b === reiterBreite.eintraege);

/* Der Stift schaltet den Sortiermodus und den Hinweis dazu. */
await page.evaluate(() => { einSub = null; zeichne(); });
await page.waitForTimeout(150);
await page.click("#btnSort"); await page.waitForTimeout(200);
pruef("Sortieren an: Stift ist gedrückt",
  (await page.getAttribute("#btnSort", "aria-pressed")) === "true");
pruef("Sortieren an: Hinweis steht da", await sichtbar("#sortHinweis"));
pruef("Sortieren an: Pfeile an den Kacheln",
  (await page.$$("#einKacheln [data-khoch]")).length > 0);
/* Die Kacheln müssen Kacheln bleiben. Vorher erbten die Pfeile die Kachelform
   und die Kachel daneben schrumpfte auf ihre Textbreite; mit dem Klassennamen
   „reihe" wurde sie zusätzlich zur Versalienschaltfläche der Dialoge. */
const kachelMasse = await page.evaluate(() => {
  const reihen = [...document.querySelectorAll("#einKacheln .kachelreihe")];
  return reihen.map(r => {
    const k = r.querySelector("[data-sub]"), p = r.querySelector(".pfeile button");
    return {kachel:Math.round(k.getBoundingClientRect().width),
            pfeil:Math.round(p.getBoundingClientRect().width),
            reihe:Math.round(r.getBoundingClientRect().width),
            gross:getComputedStyle(k).textTransform};
  });
});
pruef("alle Kacheln gleich breit",
  new Set(kachelMasse.map(m => m.kachel)).size === 1,
  kachelMasse.map(m => m.kachel).join(", "));
pruef("Kachel füllt die Reihe neben den Pfeilen",
  kachelMasse.every(m => m.kachel > m.reihe - m.pfeil - 20),
  JSON.stringify(kachelMasse[0]));
pruef("Pfeile bleiben schmal", kachelMasse.every(m => m.pfeil < 60), String(kachelMasse[0].pfeil));
pruef("Kachelschrift bleibt normal", kachelMasse.every(m => m.gross === "none"),
  kachelMasse[0].gross);

await page.click("#btnSort"); await page.waitForTimeout(200);
pruef("Sortieren aus: Stift ist gelöst",
  (await page.getAttribute("#btnSort", "aria-pressed")) === "false");
pruef("Sortieren aus: kein Hinweis mehr", !(await sichtbar("#sortHinweis")));

/* Derselbe Ablauf beim Plan-Stift — beide müssen sich gleich anfühlen. */
await page.click("#rTag"); await page.waitForTimeout(150);
await page.click("#btnEdit"); await page.waitForTimeout(200);
pruef("Bearbeiten an: Stift ist gedrückt",
  (await page.getAttribute("#btnEdit", "aria-pressed")) === "true");
pruef("Bearbeiten an: Hinweis steht da", await sichtbar("#editHinweis"));
await page.click("#btnEdit"); await page.waitForTimeout(200);
pruef("Bearbeiten aus: kein Hinweis mehr", !(await sichtbar("#editHinweis")));

/* Beide Hinweise sagen auf dieselbe Art, wie man wieder herauskommt. */
const schluss = await page.evaluate(() => [
  document.querySelector("#editHinweis").textContent,
  document.querySelector("#sortHinweis").textContent
].map(t => t.replace(/\s+/g," ").trim()));
pruef("beide Hinweise nennen denselben Ausweg",
  schluss.every(t => t.includes("Nochmal auf ✎ oben tippen, wenn du fertig bist.")),
  schluss.join(" | "));

pruef("kein Fehlerkasten", (await fehlerkasten(page)) === null);
await ende();
