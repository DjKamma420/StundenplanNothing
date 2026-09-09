from pathlib import Path

p = Path('app.js')
s = p.read_text()

def ersetze(alt, neu, name):
    global s
    n = s.count(alt)
    if n != 1:
        raise SystemExit(f'{name}: erwartet 1 Treffer, gefunden {n}')
    s = s.replace(alt, neu)

ersetze(
'const SCHEMA = 3;\n',
'''const SCHEMA = 3;\nconst datenstandVon = roh => Number(roh && roh.fassung) || 0;\nconst neuereDatenText = stand => "Diese Daten stammen aus einer neueren Fassung der App "\n  + `(Datenstand ${stand}, diese App kennt ${SCHEMA}). Aktualisiere die App, bevor du weiterarbeitest.`;\n''',
'Datenstand-Helfer')

ersetze(
'const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);\n',
'''const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);\n/* Eine ältere App darf Daten einer neueren Datenform weder migrieren noch\n   speichern. Der Schalter wird beim Laden des aktiven Profils gesetzt. */\nlet datenZuNeu = false;\n''',
'Daten-Schutzschalter')

ersetze(
'''  schreib(k, v){\n    this.puffer[k] = v;\n    try{ localStorage.setItem(this.pfad(k), JSON.stringify(v)); }\n    catch(e){ zeigeFehler("Speicher voll. Lösche Bilder aus Merkblättern oder lege eine Sicherung an."); }\n  },\n  entferne(k){\n    delete this.puffer[k];\n    try{ localStorage.removeItem(this.pfad(k)); }catch(e){}\n  }\n''',
'''  schreib(k, v){\n    if(datenZuNeu) return;\n    this.puffer[k] = v;\n    try{ localStorage.setItem(this.pfad(k), JSON.stringify(v)); }\n    catch(e){ zeigeFehler("Speicher voll. Lösche Bilder aus Merkblättern oder lege eine Sicherung an."); }\n  },\n  entferne(k){\n    if(datenZuNeu) return;\n    delete this.puffer[k];\n    try{ localStorage.removeItem(this.pfad(k)); }catch(e){}\n  }\n''',
'Speicher-Schreibschutz')

ersetze(
'''function profileSichern(){\n  try{\n''',
'''function profileSichern(){\n  if(datenZuNeu) return;\n  try{\n''',
'Profil-Schreibschutz')

ersetze(
'''function zustandLaden(){\n  Speicher.puffer = {};\n  cfg       = Object.assign({}, STANDARD, Speicher.lies("cfg", {}));\n  plan      = Speicher.lies("plan", {});\n  eintraege = Speicher.lies("eintraege", []);\n  ferien    = Speicher.lies("ferien", []);\n  sonder    = Speicher.lies("sonder", []);\n  noten     = Speicher.lies("noten", []);\n  merkblattUmziehen();\n  datenMigrieren();\n}\n''',
'''function zustandLaden(){\n  Speicher.puffer = {};\n  const rohCfg = Speicher.lies("cfg", {});\n  datenZuNeu = datenstandVon(rohCfg) > SCHEMA;\n  cfg       = Object.assign({}, STANDARD, rohCfg);\n  plan      = Speicher.lies("plan", {});\n  eintraege = Speicher.lies("eintraege", []);\n  ferien    = Speicher.lies("ferien", []);\n  sonder    = Speicher.lies("sonder", []);\n  noten     = Speicher.lies("noten", []);\n  /* Schon die alte Merkblattmigration schreibt Daten. Bei einem neueren\n     Datenstand muss deshalb vor jeder Migration abgebrochen werden. */\n  if(!datenZuNeu) merkblattUmziehen();\n  datenMigrieren();\n}\n''',
'Laden vor Migration schützen')

ersetze(
'''function datenMigrieren(){\n  const war = Number(cfg.fassung) || 0;\n  if(war === SCHEMA) return;\n  if(war > SCHEMA){\n    zeigeFehler("Diese Daten stammen aus einer neueren Fassung der App "\n      + `(Datenstand ${war}, diese App kennt ${SCHEMA}). `\n      + "Aktualisiere die App, bevor du weiterarbeitest.");\n    return;\n  }\n''',
'''function datenMigrieren(){\n  const war = datenstandVon(cfg);\n  if(war === SCHEMA) return;\n  if(war > SCHEMA){\n    datenZuNeu = true;\n    zeigeFehler(neuereDatenText(war));\n    /* Nicht nur warnen: die Oberfläche vollständig sperren. Sonst könnte\n       eine Tastenkombination oder ein Klick unter dem Fehlerkasten doch noch\n       eine Schreiboperation auslösen. Der Neuladen-Knopf bleibt erreichbar. */\n    const k = document.getElementById("fehlerkasten");\n    if(k){ k.style.bottom = "0"; k.style.maxHeight = "none"; }\n    return;\n  }\n''',
'Neuere Daten blockieren')

ersetze('function normalisiere(){\n', 'function normalisiere(){\n  if(datenZuNeu) return;\n', 'Normalisierung schützen')
ersetze('function sichern(){\n  Speicher.schreib("cfg", cfg);', 'function sichern(){\n  if(datenZuNeu) return;\n  Speicher.schreib("cfg", cfg);', 'Sichern schützen')
ersetze('function zeichne(){\n  normalisiere();', 'function zeichne(){\n  if(datenZuNeu) return;\n  normalisiere();', 'Zeichnen schützen')
ersetze('function starten(){\n  if(!cfg || !Array.isArray(cfg.slots) || !cfg.slots.length){', 'function starten(){\n  if(datenZuNeu){ browserPruefen(); return; }\n  if(!cfg || !Array.isArray(cfg.slots) || !cfg.slots.length){', 'Start schützen')

ersetze(
'''  const gegenWeiss = 1.05 / (L + 0.05);\n  const gegenSchwarz = (L + 0.05) / (helligkeit("#111111") + 0.05);\n  document.documentElement.style.setProperty("--aufAkzent", gegenSchwarz > gegenWeiss ? "#111" : "#fff");\n''',
'''  const gegenWeiss = 1.05 / (L + 0.05);\n  /* Reines Schwarz statt #111: bei der Standardfarbe lag #111 mit 4,435:1\n     knapp unter WCAG 4,5:1. Schwarz/Weiß garantiert für jede Hex-Farbe die\n     kontrastreichere der beiden Extremfarben. */\n  const gegenSchwarz = (L + 0.05) / 0.05;\n  document.documentElement.style.setProperty("--aufAkzent", gegenSchwarz > gegenWeiss ? "#000" : "#fff");\n''',
'Akzent-Kontrast')

ersetze('  c.fassung = alsZahl(c.fassung, 0, 999, 0);\n', '  /* Nach erfolgreicher Prüfung liegt das Paket in der aktuellen Form vor. */\n  c.fassung = SCHEMA;\n', 'Import-Datenstand')

ersetze(
'''/* Aus beliebigem JSON wird ein Datensatz — oder ein leeres Ergebnis. */\nfunction paketSaeubern(d){\n''',
'''const paketDatenstand = d => datenstandVon(d && d.cfg);\nconst paketZuNeu = d => paketDatenstand(d) > SCHEMA;\n/* Aus beliebigem JSON wird ein Datensatz — oder ein leeres Ergebnis. */\nfunction paketSaeubern(d){\n''',
'Paket-Datenstand')

ersetze(
'''function alleProfileUebernehmen(liste){\n  if(!confirm("Diese Sicherung enthält alle Profile. Sämtliche Profile auf diesem "\n''',
'''function alleProfileUebernehmen(liste){\n  const neuerStand = Math.max(0, ...liste.map(paketDatenstand));\n  if(neuerStand > SCHEMA) return alert(neuereDatenText(neuerStand));\n  if(!confirm("Diese Sicherung enthält alle Profile. Sämtliche Profile auf diesem "\n''',
'Mehrprofil-Import prüfen')

ersetze(
'''    const rein = paketSaeubern(p);\n    DATEN.filter(k => k !== "merkblatt").forEach(k => {\n''',
'''    const rein = paketSaeubern(p);\n    /* Auch Profile mit derselben ID werden wirklich ersetzt. Alte Nebenwerte\n       wie gemeldet_... oder sicherSpaeter dürfen nicht in den Restore hineinragen. */\n    profilSchluessel(id).forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });\n    DATEN.filter(k => k !== "merkblatt").forEach(k => {\n''',
'Restore-Nebenschlüssel löschen')

ersetze(
'''  if(d && Array.isArray(d.profile)) return alleProfileUebernehmen(d.profile);\n  if(d && d.art === "plan") return planUebernehmen(d);\n  const teil = paketSaeubern(d);\n''',
'''  if(d && Array.isArray(d.profile)) return alleProfileUebernehmen(d.profile);\n  if(d && d.art === "plan") return planUebernehmen(d);\n  if(paketZuNeu(d)) return alert(neuereDatenText(paketDatenstand(d)));\n  const teil = paketSaeubern(d);\n''',
'Einzelprofil-Import prüfen')

p.write_text(s)

sw = Path('sw.js')
w = sw.read_text()
if w.count('const VERSION = "v48";') != 1:
    raise SystemExit('sw.js: v48 nicht eindeutig gefunden')
sw.write_text(w.replace('const VERSION = "v48";', 'const VERSION = "v49";'))

ch = Path('CHANGELOG.md')
c = ch.read_text()
marker = '## v48\n'
if c.count(marker) != 1:
    raise SystemExit('CHANGELOG: v48 nicht eindeutig gefunden')
eintrag = '''## v49\n\n**Behoben**\n- Akzentflächen wählen jetzt reines Schwarz oder Weiß als Textfarbe. Damit erfüllt auch das Standardrot den Mindestkontrast von 4,5:1 für normalen Text.\n- Trifft eine ältere App auf einen **neueren Datenstand**, bleibt der gespeicherte Datensatz vollständig unangetastet: keine Merkblattmigration, Normalisierung, Archivbereinigung oder Sicherung läuft mehr. Die Oberfläche wird bis zum Update gesperrt.\n- Sicherungsdateien aus einem neueren Datenschema werden vor dem Import abgewiesen, statt unbekannte Felder beim Säubern zu verlieren. Erfolgreich gelesene ältere Sicherungen werden direkt auf den aktuellen Datenstand gesetzt.\n- **Alle Profile wiederherstellen** entfernt nun auch alte profilbezogene Nebenschlüssel derselben Profil-ID, etwa Tagesmerker für Erinnerungen oder eine vertagte Sicherung.\n\n'''
ch.write_text(c.replace(marker, eintrag + marker))

test = r'''import { starte, ende, pruef } from "../browser.mjs";

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
'''
Path('werkzeug/pruefungen/v49.mjs').write_text(test)
