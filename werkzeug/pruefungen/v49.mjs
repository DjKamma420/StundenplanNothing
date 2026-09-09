import { starte, ende, pruef } from "../browser.mjs";

const { page } = await starte();

const kontraste = await page.evaluate(() => FARBEN.map(akzent => {
  cfg.akzent = akzent; themaAnwenden();
  const text = getComputedStyle(document.documentElement).getPropertyValue("--aufAkzent").trim();
  const L = helligkeit(akzent);
  const Lt = text === "#000" ? 0 : 1;
  const ratio = (Math.max(L,Lt)+0.05) / (Math.min(L,Lt)+0.05);
  return {akzent,text,ratio};
}));
pruef("alle Akzentfarben haben mindestens 4,5:1 Kontrast",
  kontraste.every(x => x.ratio >= 4.5), JSON.stringify(kontraste));
pruef("Standardrot verwendet die kontrastreiche schwarze Schrift",
  kontraste.find(x => x.akzent === "#e5382b")?.text === "#000");

const restore = await page.evaluate(() => {
  const id = profilId;
  localStorage.setItem(`p${id}_gemeldet_2099-01-01`, "true");
  localStorage.setItem(`p${id}_sicherSpaeter`, JSON.stringify("2099-01-01"));
  localStorage.setItem(`p${id}_irgendwasSpaeteres`, JSON.stringify({alt:true}));
  const paket = {id, name:"Wiederhergestellt", cfg:Object.assign({}, cfg, {fassung:SCHEMA}),
    plan:JSON.parse(JSON.stringify(plan)), eintraege:[], ferien:[], sonder:[], noten:[]};
  alleProfileUebernehmen([paket]);
  const prefix = `p${id}_`;
  return {
    rest: Object.keys(localStorage).filter(k => k.startsWith(prefix)).sort(),
    alt: Object.keys(localStorage).filter(k => k.startsWith(prefix)
      && (k.includes("gemeldet_") || k.endsWith("sicherSpaeter") || k.endsWith("irgendwasSpaeteres")))
  };
});
pruef("Mehrprofil-Restore entfernt alte Nebenschlüssel derselben ID", restore.alt.length === 0,
  JSON.stringify(restore));
pruef("Mehrprofil-Restore schreibt die eigentlichen Profildaten neu",
  restore.rest.some(k => k.endsWith("_cfg")) && restore.rest.some(k => k.endsWith("_plan")));

const importZukunft = await page.evaluate(() => {
  const vorherProfile = localStorage.getItem("profile");
  const fremdId = "zukunft";
  alleProfileUebernehmen([{id:fremdId,name:"Zukunft",cfg:{fassung:SCHEMA+1},plan:{},
    eintraege:[],ferien:[],sonder:[],noten:[]}]);
  return {
    profileGleich: localStorage.getItem("profile") === vorherProfile,
    angelegt: localStorage.getItem(`p${fremdId}_cfg`) !== null
  };
});
pruef("Backup mit neuerem Datenschema wird ohne Änderung abgewiesen",
  importZukunft.profileGleich && !importZukunft.angelegt, JSON.stringify(importZukunft));

const vorher = await page.evaluate(() => {
  const id = profilId;
  const werte = {
    cfg: JSON.stringify(Object.assign({}, cfg, {fassung:SCHEMA+1, zukunft:{bleibt:true}})),
    plan: JSON.stringify({A:{MO:[{fach:"MiXeD",raum:"101",lk:"X",zukunft:"bleibt"}]},B:{}}),
    eintraege: JSON.stringify([{id:"x",typ:"H",fach:"ma",datum:"2099-01-01",titel:"X",
      notiz:"",erledigt:true,geloescht:true,zukunft:"bleibt"}]),
    merkblatt: JSON.stringify({MA:"Legacy bleibt ebenfalls unverändert"})
  };
  Object.entries(werte).forEach(([k,v]) => localStorage.setItem(`p${id}_${k}`, v));
  return {id,werte};
});
await page.reload({waitUntil:"networkidle"});
await page.waitForTimeout(400);
const nachher = await page.evaluate(({id}) => {
  const lesen = k => localStorage.getItem(`p${id}_${k}`);
  const k = document.getElementById("fehlerkasten");
  const r = k && k.getBoundingClientRect();
  return {
    werte:{cfg:lesen("cfg"),plan:lesen("plan"),eintraege:lesen("eintraege"),merkblatt:lesen("merkblatt")},
    meldung:k ? k.textContent : "",
    voll:!!r && r.top <= 1 && r.bottom >= innerHeight - 1
  };
}, {id:vorher.id});
pruef("lokale Daten eines neueren Schemas bleiben bytegenau unangetastet",
  Object.keys(vorher.werte).every(k => vorher.werte[k] === nachher.werte[k]), JSON.stringify(nachher.werte));
pruef("neuere lokale Daten zeigen eine klare Update-Meldung",
  nachher.meldung.includes("neueren Fassung") && nachher.meldung.includes("Aktualisiere die App"));
pruef("bei neuerem Datenschema ist die Oberfläche vollständig gesperrt", nachher.voll);

await ende();
