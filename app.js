/* =====================================================================
   Stundenplan — gesamte Logik.
   Aufbau siehe ARCHITEKTUR.md. Kurz: kein Framework, ein Datensatz je
   Profil im localStorage, bei jeder Änderung wird die sichtbare Ansicht
   neu gezeichnet.
   ===================================================================== */

/* --- Fehleranzeige zuerst: eine leere Seite sagt niemandem etwas --- */
function zeigeFehler(text, quelle){
  try{
    let k = document.getElementById("fehlerkasten");
    if(!k){
      k = document.createElement("div");
      k.id = "fehlerkasten";
      k.setAttribute("role","alert");
      k.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99;background:#e5382b;"
        + "color:#fff;font:12px ui-monospace,monospace;padding:12px 14px;line-height:1.5;"
        + "white-space:pre-wrap;max-height:52vh;overflow:auto";
      (document.body || document.documentElement).appendChild(k);
    }
    let umgebung = "";
    try{
      umgebung = "\n" + (typeof BUILD === "string" ? BUILD : "?")
        + " · " + (navigator.language || "?")
        + " · " + (screen.width + "×" + screen.height)
        + " · " + navigator.userAgent.slice(0, 120);
    }catch(e){}
    k.textContent = "Fehler\n" + text + (quelle ? "\n" + quelle : "") + umgebung
      + "\n\nBitte diesen Text weitergeben. Deine Daten sind nicht betroffen.";
    /* Wer hier steht, kommt sonst nicht weiter. Die häufigste Ursache ist eine
       halb erneuerte Fassung — neues index.html, altes app.js. Ein Neuladen
       ohne Zwischenspeicher behebt genau das. Der Speicher bleibt unberührt. */
    const knopf = document.createElement("button");
    knopf.textContent = "App neu laden";
    knopf.style.cssText = "margin-top:12px;font:inherit;background:#fff;color:#e5382b;"
      + "border:0;border-radius:8px;padding:9px 14px;font-weight:700";
    knopf.onclick = async () => {
      knopf.textContent = "Lädt …";
      try{
        if(window.caches) for(const name of await caches.keys()) await caches.delete(name);
        if("serviceWorker" in navigator){
          const reg = await navigator.serviceWorker.getRegistration();
          if(reg){ await reg.update(); if(reg.waiting) reg.waiting.postMessage("sofort"); }
        }
      }catch(e){}
      location.reload();
    };
    k.appendChild(knopf);
  }catch(e){}
}
window.addEventListener("error", e => {
  const datei = (e.filename || "").split("/").pop();
  zeigeFehler(e.message, datei ? `${datei}, Zeile ${e.lineno}` : "");
});
window.addEventListener("unhandledrejection", e =>
  zeigeFehler("Unerledigt: " + ((e.reason && e.reason.message) || e.reason)));

/* Fassung der Daten im Speicher — nicht die der App. Sie steigt nur, wenn
   sich die Form der gespeicherten Daten ändert, und gibt späteren
   Umstellungen einen Anker. Ohne sie weiß niemand, was da liegt. */
const SCHEMA = 3;

/* --- Voreinstellungen. Nichts davon ist auf eine Schule zugeschnitten. --- */
const STANDARD = {
  fassung: SCHEMA,
  klasse: "",
  slots: [
    {std:"1,2", von:"08:00", bis:"09:30"},
    {std:"3,4", von:"09:50", bis:"11:20"},
    {std:"5,6", von:"11:40", bis:"13:10"},
    {std:"7,8", von:"13:40", bis:"15:10"}
  ],
  zweiWochen: false,
  land: "",
  notenSystem: "note6",
  anteilM: 50,
  anteile: {},
  lehrer: {},
  fachnamen: {},
  akzent: "#e5382b",
  modus: "dunkel",
  schrift: "system",
  melden: true,
  letzteSicherung: null,
  sicherTage: 28,               // Abstand der Erinnerung in Tagen, 0 = nie erinnern
  sicherAuto: false,            // beim Öffnen von selbst in den Ordner schreiben
  sicherHalten: 3,              // Monate, die im Ordner bleiben; 0 = alles behalten
  archivTage: 0,                // Tage, die Gelöschtes im Archiv bleibt; 0 = für immer
  startProfil: "immer",         // Profilauswahl beim Öffnen: immer | mehrere | nie
  stdProTag: 8,                 // Stunden je Schultag, für die Umrechnung in Fehltage
  reiheEin: null,               // Reihenfolge im Einträge-Menü
  reiheFach: null               // Reihenfolge der Fächer im Zeugnis
};
const REIHE_STANDARD = ["H","K","N","E","G","M","F","archiv"];
const VORLAGEN = {
  block90: STANDARD.slots,
  einzel45: [
    {std:"1", von:"08:00", bis:"08:45"}, {std:"2", von:"08:45", bis:"09:30"},
    {std:"3", von:"09:50", bis:"10:35"}, {std:"4", von:"10:35", bis:"11:20"},
    {std:"5", von:"11:40", bis:"12:25"}, {std:"6", von:"12:25", bis:"13:10"},
    {std:"7", von:"13:40", bis:"14:25"}, {std:"8", von:"14:25", bis:"15:10"}
  ]
};
const FARBEN = ["#e5382b","#2f7de1","#12a463","#e0a325","#9b5de5","#ef476f","#00b3b3","#8a8a8a"];
const LAENDER = {
  "DE-BW":"Baden-Württemberg","DE-BY":"Bayern","DE-BE":"Berlin","DE-BB":"Brandenburg",
  "DE-HB":"Bremen","DE-HH":"Hamburg","DE-HE":"Hessen","DE-MV":"Mecklenburg-Vorpommern",
  "DE-NI":"Niedersachsen","DE-NW":"Nordrhein-Westfalen","DE-RP":"Rheinland-Pfalz",
  "DE-SL":"Saarland","DE-SN":"Sachsen","DE-ST":"Sachsen-Anhalt","DE-SH":"Schleswig-Holstein",
  "DE-TH":"Thüringen"
};
const TAGE = ["MO","DI","MI","DO","FR"];
const LANG = {MO:"Montag",DI:"Dienstag",MI:"Mittwoch",DO:"Donnerstag",FR:"Freitag"};
const ART  = {H:"Hausaufgabe",K:"Klausur",N:"Notiz",M:"Merkblatt",F:"Fehlzeit"};
const FEHLARTEN = ["entschuldigt","unentschuldigt","verspätet"];
const EREIGNISARTEN = ["ereignis","ausfall","vertretung"];
const ARTLANG = {H:"Hausaufgaben",K:"Klausuren",N:"Notizen",E:"Ereignisse",
                 G:"Noten",M:"Merkblätter",F:"Fehlzeiten",archiv:"Archiv"};

/* Date.now() allein kollidiert, sobald zwei Einträge in derselben
   Millisekunde entstehen — beim Einlesen einer Sicherung passiert genau das. */
const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

/* --- Speicher, an das aktive Profil gebunden --- */
const Speicher = {
  puffer:{},
  pfad(k){ return "p" + profilId + "_" + k; },
  lies(k, standard){
    try{ const v = localStorage.getItem(this.pfad(k)); return v ? JSON.parse(v) : standard; }
    catch(e){ return k in this.puffer ? this.puffer[k] : standard; }
  },
  schreib(k, v){
    this.puffer[k] = v;
    try{ localStorage.setItem(this.pfad(k), JSON.stringify(v)); }
    catch(e){ zeigeFehler("Speicher voll. Lösche Bilder aus Merkblättern oder lege eine Sicherung an."); }
  },
  entferne(k){
    delete this.puffer[k];
    try{ localStorage.removeItem(this.pfad(k)); }catch(e){}
  }
};
/* Alle Schlüssel eines Profils — auch die, die nicht in DATEN stehen
   (etwa die Tagesmerker der Erinnerung). */
function profilSchluessel(id){
  try{ return Object.keys(localStorage).filter(k => k.startsWith("p" + id + "_")); }
  catch(e){ return DATEN.map(k => "p" + id + "_" + k); }
}

const DATEN = ["cfg","plan","eintraege","ferien","sonder","noten","merkblatt"];
let profile = [], profilId = "1";
function profileSichern(){
  try{
    localStorage.setItem("profile", JSON.stringify(profile));
    localStorage.setItem("profilAktiv", profilId);
  }catch(e){}
}
function profileLaden(){
  try{
    profile = JSON.parse(localStorage.getItem("profile") || "[]");
    profilId = localStorage.getItem("profilAktiv") || "1";
  }catch(e){ profile = []; }
  if(!Array.isArray(profile) || !profile.length){
    const alt = DATEN.some(k => { try{ return localStorage.getItem(k) !== null; }catch(e){ return false; } });
    profile = [{id:"1", name: alt ? "Mein Plan" : "Profil 1"}];
    profilId = "1";
    if(alt) DATEN.forEach(k => { try{
      const v = localStorage.getItem(k);
      if(v !== null){ localStorage.setItem("p1_" + k, v); localStorage.removeItem(k); }
    }catch(e){} });
    profileSichern();
  }
  if(!profile.some(x => x.id === profilId)) profilId = profile[0].id;
}
profileLaden();
const profilName = () => (profile.find(x => x.id === profilId) || {}).name || "Profil";

let cfg, plan, eintraege, ferien, sonder, noten;
function zustandLaden(){
  Speicher.puffer = {};
  cfg       = Object.assign({}, STANDARD, Speicher.lies("cfg", {}));
  plan      = Speicher.lies("plan", {});
  eintraege = Speicher.lies("eintraege", []);
  ferien    = Speicher.lies("ferien", []);
  sonder    = Speicher.lies("sonder", []);
  noten     = Speicher.lies("noten", []);
  merkblattUmziehen();
  datenMigrieren();
}
/* Bis Fassung 3 erledigen normalisiere() und merkblattUmziehen() die
   Umstellung alter Formen von selbst; hier wird nur festgehalten, worauf
   spätere Schritte aufsetzen. Wichtig ist der umgekehrte Fall: Daten aus
   einer neueren App-Fassung dürfen nicht stillschweigend beschnitten werden. */
function datenMigrieren(){
  const war = Number(cfg.fassung) || 0;
  if(war === SCHEMA) return;
  if(war > SCHEMA){
    zeigeFehler("Diese Daten stammen aus einer neueren Fassung der App "
      + `(Datenstand ${war}, diese App kennt ${SCHEMA}). `
      + "Aktualisiere die App, bevor du weiterarbeitest.");
    return;
  }
  cfg.fassung = SCHEMA;
  Speicher.schreib("cfg", cfg);
}
/* Frühere Fassungen hielten Merkblätter als {FACH: Text}. Jetzt sind es
   normale Einträge vom Typ M — dadurch gelten Suche und Archiv auch dort. */
function merkblattUmziehen(){
  const alt = Speicher.lies("merkblatt", null);
  if(alt && typeof alt === "object" && !Array.isArray(alt)){
    Object.entries(alt).forEach(([fach, text]) => {
      if(text) eintraege.push({id:neueId(), typ:"M", fach, datum:iso(new Date()),
        titel:"Merkblatt", notiz:text, bilder:[], erledigt:false, geloescht:false});
    });
    Speicher.schreib("merkblatt", []);
    Speicher.schreib("eintraege", eintraege);
  }
}
zustandLaden();

let ansicht = "tag", einSub = null, bearbeiten = false;
let gewaehlt = new Date(), kalMonat = new Date(), kalTag = new Date();

/* --- Datum. Bewusst ohne toISOString(), das verschiebt die Zeitzone. --- */
const zwei = n => String(n).padStart(2,"0");
const iso  = d => `${d.getFullYear()}-${zwei(d.getMonth()+1)}-${zwei(d.getDate())}`;
const gleich = (a,b) => iso(a) === iso(b);
const zeigDatum = s => s ? s.slice(8,10)+"."+s.slice(5,7)+"."+s.slice(0,4) : "";
function montagVon(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  const wt = x.getDay() === 0 ? 7 : x.getDay();
  x.setDate(x.getDate() - (wt - 1)); return x;
}
const plusTage = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const tagIndex = d => { const wt = d.getDay(); return (wt >= 1 && wt <= 5) ? wt-1 : 5; };
function kalenderwoche(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  x.setDate(x.getDate() + 3 - ((x.getDay()+6)%7));
  const jan4 = new Date(x.getFullYear(),0,4);
  return 1 + Math.round(((x - jan4)/864e5 - 3 + ((jan4.getDay()+6)%7))/7);
}
const wocheFuer = d => !cfg.zweiWochen ? "A" : (kalenderwoche(d) % 2 === 1 ? "A" : "B");
const minuten = s => { const [h,m] = s.split(":").map(Number); return h*60+m; };
const jetztMin = () => { const n = new Date(); return n.getHours()*60 + n.getMinutes(); };

/* --- Daten pflegen --- */
function normalisiere(){
  ["A","B"].forEach(w => {
    if(!plan[w]) plan[w] = {};
    TAGE.forEach(t => {
      if(!Array.isArray(plan[w][t])) plan[w][t] = [];
      plan[w][t].length = cfg.slots.length;
      for(let i = 0; i < cfg.slots.length; i++){
        const z = plan[w][t][i];
        if(z === undefined || z === null){ plan[w][t][i] = null; continue; }
        /* Fächer überall groß: Einträge werden beim Speichern normalisiert,
           der Plan tat es früher nicht — sonst gelten „Ch" und „CH" als zwei
           Fächer, das Zeugnis zeigt beide und der Schnitt zerfällt. */
        if(typeof z.fach === "string" && z.fach !== z.fach.trim().toUpperCase())
          z.fach = z.fach.trim().toUpperCase();
      }
    });
  });
  eintraege.forEach(e => {
    if(e.geloescht === undefined) e.geloescht = false;
    if(e.typ === "M" && !Array.isArray(e.bilder)) e.bilder = [];
    if(e.typ === "F" && !e.stunden) e.stunden = 1;   // frühere Fassungen zählten je Fach
    /* Die Art der Fehlzeit steckt im Titel. Steht dort etwas Fremdes, würde
       die Auswahl beim Bearbeiten still auf den ersten Eintrag zurückfallen. */
    if(e.typ === "F" && !FEHLARTEN.includes(e.titel)) e.titel = FEHLARTEN[0];
    if(e.erledigt && !e.erledigtAm) e.erledigtAm = iso(new Date());
  });
  noten.forEach(n => { if(n.geloescht === undefined) n.geloescht = false; });
  /* Fassungen vor v39 hielten nicht fest, wann etwas ins Archiv kam. Für die
     beginnt die Frist heute, nicht rückwirkend — sonst verschwände beim ersten
     Öffnen ohne Vorwarnung ein ganzes Archiv. */
  let gestempelt = false;
  const stempeln = x => {
    if(x.geloescht && !x.geloeschtAm){ x.geloeschtAm = iso(new Date()); gestempelt = true; }
  };
  eintraege.forEach(stempeln); sonder.forEach(stempeln); noten.forEach(stempeln);
  if(gestempelt){
    Speicher.schreib("eintraege", eintraege);
    Speicher.schreib("sonder", sonder);
    Speicher.schreib("noten", noten);
  }
  sonder.forEach(o => {
    if(o.geloescht === undefined) o.geloescht = false;
    if(!EREIGNISARTEN.includes(o.art)) o.art = "ereignis";
    if(o.slot !== null && o.slot >= cfg.slots.length) o.slot = null;
  });
  aufraeumen();
}
/* Abgehakte Hausaufgaben und Klausuren wandern nach sieben Tagen ins Archiv.
   Notizen, Merkblätter und Fehlzeiten bleiben — die will man behalten. */
function aufraeumen(){
  const grenze = iso(plusTage(new Date(), -7));
  let bewegt = false;
  eintraege.forEach(e => {
    if(!e.geloescht && e.erledigt && (e.typ === "H" || e.typ === "K")
       && e.erledigtAm && e.erledigtAm <= grenze){ insArchiv(e); bewegt = true; }
  });
  if(bewegt) Speicher.schreib("eintraege", eintraege);
  archivAufraeumen();
}

/* Wann etwas im Archiv gelandet ist. Ältere Fassungen haben das nicht
   festgehalten — für die beginnt die Frist heute, nicht rückwirkend.
   Sonst verschwände beim ersten Öffnen ohne Vorwarnung ein ganzes Archiv. */
const archiviertAm = x => x.geloeschtAm || iso(new Date());
const archivFrist = () => Math.max(0, Number(cfg.archivTage) || 0);
/** Tage bis zur endgültigen Entfernung, oder null bei „für immer". */
function archivRest(x){
  const tage = archivFrist();
  if(!tage) return null;
  const alter = Math.round((new Date() - new Date(archiviertAm(x)+"T12:00"))/864e5);
  return tage - alter;
}
/* Entfernt endgültig, was die Frist überschritten hat. Bei 0 passiert nichts. */
function archivAufraeumen(){
  if(!archivFrist()) return;
  const behalten = x => !x.geloescht || archivRest(x) > 0;
  const vorher = eintraege.length + sonder.length + noten.length;
  eintraege = eintraege.filter(behalten);
  sonder    = sonder.filter(behalten);
  noten     = noten.filter(behalten);
  if(eintraege.length + sonder.length + noten.length !== vorher){
    Speicher.schreib("eintraege", eintraege);
    Speicher.schreib("sonder", sonder);
    Speicher.schreib("noten", noten);
  }
}
function sichern(){
  Speicher.schreib("cfg", cfg); Speicher.schreib("plan", plan);
  Speicher.schreib("eintraege", eintraege); Speicher.schreib("ferien", ferien);
  Speicher.schreib("sonder", sonder); Speicher.schreib("noten", noten);
}
/* Archivieren und Zurückholen an einer Stelle: ohne geloeschtAm wüsste
   niemand, wann die Aufbewahrungsfrist abläuft. */
function insArchiv(x){ x.geloescht = true; x.geloeschtAm = iso(new Date()); }
function ausArchiv(x){ x.geloescht = false; x.geloeschtAm = null; }

const aktiv        = () => eintraege.filter(e => !e.geloescht);
const sonderAktiv  = () => sonder.filter(o => !o.geloescht);
const notenAktiv   = () => noten.filter(n => !n.geloescht);
const sonderAn     = (d,slot) => sonderAktiv().find(x => x.datum === iso(d) && x.slot === slot) || null;
const sonderFrei   = d => sonderAktiv().filter(x => x.datum === iso(d) && x.slot === null);
const sonderTag    = d => sonderAktiv().filter(x => x.datum === iso(d));
/* Termine des Tages: Merkblätter haben zwar ein Datum, gehören aber nicht in den Tagesplan. */
const eintraegeAm  = d => aktiv().filter(e => e.datum === iso(d) && e.typ !== "M")
  .sort((a,b) => (a.erledigt - b.erledigt) || "KHFN".indexOf(a.typ) - "KHFN".indexOf(b.typ));

function faecher(){
  const s = new Set();
  /* plan[w] kann fehlen, wenn gelesen wird, bevor normalisiere() lief. */
  ["A","B"].forEach(w => TAGE.forEach(t =>
    ((plan[w] && plan[w][t]) || []).forEach(x => x && x.fach && s.add(x.fach))));
  return [...s].sort();
}
const alleFaecher = () => [...new Set([...faecher(), ...notenAktiv().map(n => n.fach),
  ...aktiv().map(e => e.fach)])].filter(Boolean).sort();
const lehrerName = k => (cfg.lehrer && cfg.lehrer[k]) || k || "";
const fachName   = k => (cfg.fachnamen && cfg.fachnamen[k]) || k || "";
const freiAm = d => { const s = iso(d); return ferien.find(f => s >= f.von && s <= f.bis) || null; };
function hatFachAm(d, fach){
  if(!fach) return false;
  const i = tagIndex(d); if(i === 5) return false;
  const woche = plan[wocheFuer(d)];
  return ((woche && woche[TAGE[i]]) || []).some(x => x && x.fach && x.fach.toUpperCase() === fach);
}
function naechsterTagMitFach(d, fach){
  for(let i = 1; i <= 120; i++){
    const x = plusTage(d, i);
    if(hatFachAm(x, fach) && !freiAm(x)) return x;
  }
  return null;
}

/* --- Noten --- */
const anteilFuer = fach => {
  const e = cfg.anteile && cfg.anteile[fach];
  return Math.max(0, Math.min(100, Number((e === undefined || e === null) ? cfg.anteilM : e) || 0));
};
const hatEigenenAnteil = f => cfg.anteile && cfg.anteile[f] !== undefined && cfg.anteile[f] !== null;
function notenSchnitt(fach){
  const teil = art => {
    const l = notenAktiv().filter(n => n.fach === fach && n.art === art);
    return l.length ? l.reduce((s,n) => s + n.wert, 0) / l.length : null;
  };
  const m = teil("m"), sch = teil("s"), aM = anteilFuer(fach);
  if(m === null && sch === null) return {m:null, s:null, gesamt:null};
  if(m === null)   return {m:null, s:sch, gesamt:sch};
  if(sch === null) return {m, s:null, gesamt:m};
  return {m, s:sch, gesamt:(m*aM + sch*(100-aM))/100};
}
const notenText = w => (w === null || w === undefined) ? "—"
  : (cfg.notenSystem === "punkte15" ? w.toFixed(1) : w.toFixed(2).replace(".", ","));
const zeugnisNote = w => (w === null || w === undefined) ? null : Math.round(w);

/* --- Werkzeug --- */
const $ = s => document.querySelector(s);
const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const zahl = (n, ein, viele) => `${n} ${n === 1 ? ein : viele}`;
/* Stundenraster-Felder kommen aus den Einstellungen und können nach dem
   Einlesen einer fremden Sicherung alles enthalten — nie roh ins HTML. */
const stdText = s => esc(String((s && s.std) || "").replace(/,/g,"/"));
const oktette = t => new TextEncoder().encode(t).length;
/* Ein Versprechen, das nach ms aufgibt statt ewig zu hängen. */
const mitZeitgrenze = (v,ms) => Promise.race([v, new Promise(r => setTimeout(() => r(null), ms))]);

/* --- Darstellung anwenden --- */
/** Helligkeit einer Farbe nach WCAG — entscheidet, ob Text darauf hell oder dunkel sein muss. */
function helligkeit(farbe){
  const h = String(farbe || "").replace("#","");
  if(h.length !== 6) return 0;
  const teil = i => {
    const v = parseInt(h.slice(i,i+2),16)/255;
    return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  };
  return 0.2126*teil(0) + 0.7152*teil(2) + 0.0722*teil(4);
}
function themaAnwenden(){
  const akzent = cfg.akzent || "#e5382b";
  document.documentElement.style.setProperty("--akzent", akzent);
  /* Nicht raten, sondern rechnen: Welche der beiden Textfarben hat auf diesem
     Akzent den besseren Kontrast? Bei Gelb oder Türkis gewinnt Schwarz. */
  const L = helligkeit(akzent);
  const gegenWeiss = 1.05 / (L + 0.05);
  const gegenSchwarz = (L + 0.05) / (helligkeit("#111111") + 0.05);
  document.documentElement.style.setProperty("--aufAkzent", gegenSchwarz > gegenWeiss ? "#111" : "#fff");
  document.body.classList.toggle("hell", cfg.modus === "hell");
  document.body.classList.remove("schrift-mono","schrift-serif");
  if(cfg.schrift === "mono") document.body.classList.add("schrift-mono");
  if(cfg.schrift === "serif") document.body.classList.add("schrift-serif");
  const m = document.querySelector('meta[name=theme-color]');
  if(m) m.setAttribute("content", cfg.modus === "hell" ? "#f7f7f5" : "#0a0a0a");
}

/* =====================================================================
   Zeichnen
   ===================================================================== */
function zeichne(){
  normalisiere();
  themaAnwenden();
  $("#ansichtTag").classList.toggle("hidden", ansicht !== "tag");
  $("#ansichtKal").classList.toggle("hidden", ansicht !== "kalender");
  $("#ansichtEin").classList.toggle("hidden", ansicht !== "eintraege");
  $("#ansichtZeu").classList.toggle("hidden", ansicht !== "zeugnis");
  $("#rTag").setAttribute("aria-pressed", ansicht === "tag");
  $("#rKal").setAttribute("aria-pressed", ansicht === "kalender");
  $("#rEin").setAttribute("aria-pressed", ansicht === "eintraege");
  $("#rZeu").setAttribute("aria-pressed", ansicht === "zeugnis");
  $("#btnEdit").classList.toggle("hidden", ansicht !== "tag");
  const punkte = $("#wischPunkte");
  if(punkte) [...punkte.children].forEach((p,i) => p.classList.toggle("an", ANSICHTEN[i] === ansicht));
  try{
    if(ansicht === "tag") zeichneTag();
    else if(ansicht === "kalender") zeichneKalender();
    else if(ansicht === "zeugnis") zeichneZeugnis();
    else zeichneEintraege();
  }catch(e){ zeigeFehler("Ansicht \u201e"+ansicht+"\u201c: "+e.message, (e.stack||"").split("\n")[1]||""); }
}

function zeichneTag(){
  const idx = tagIndex(gewaehlt), woche = wocheFuer(gewaehlt);
  document.body.classList.toggle("bearbeiten", bearbeiten);
  $("#btnEdit").setAttribute("aria-pressed", bearbeiten);
  $("#editHinweis").classList.toggle("hidden", !bearbeiten);
  $("#klasseAnzeige").textContent = cfg.klasse || "Stundenplan";
  $("#titel").innerHTML = (idx === 5 ? "Wochenende" : LANG[TAGE[idx]]) +
    ` <span>${zwei(gewaehlt.getDate())}.${zwei(gewaehlt.getMonth()+1)}.</span>`;
  $("#kwLabel").textContent = "KW " + kalenderwoche(gewaehlt);
  $("#abLabel").classList.toggle("hidden", !cfg.zweiWochen);
  $("#abLabel").textContent = woche;
  $("#countdown").textContent = countdownText();

  const frei = freiAm(gewaehlt), b = $("#freiBanner");
  b.classList.toggle("hidden", !frei);
  if(frei) b.innerHTML = `<b>${esc(frei.name)}</b><div>${frei.typ === "feiertag" ? "Feiertag" : "Ferien"} · kein Unterricht</div>`;

  const mo = montagVon(gewaehlt);
  $("#tage").innerHTML = [...TAGE, "WE"].map((t,i) => {
    const d = plusTage(mo, i === 5 ? 5 : i);
    const istHeute = gleich(d, new Date()) ||
      (i === 5 && tagIndex(new Date()) === 5 && gleich(montagVon(new Date()), mo));
    const hat = (i === 5 ? [plusTage(mo,5), plusTage(mo,6)] : [d])
      .flatMap(x => eintraegeAm(x)).filter(e => !e.erledigt);
    const zeichen = [...new Set(hat.map(e => e.typ))].join("");
    return `<button type="button" data-tag="${i}" aria-pressed="${i === idx}">${t}
      ${istHeute ? '<span class="punkt"></span>'
        : (zeichen ? `<span class="khn" style="border:0;padding:0;display:block;margin-top:4px">${zeichen}</span>` : "")}
    </button>`;
  }).join("");

  if(idx === 5){
    $("#plan").innerHTML = [["Samstag",plusTage(mo,5)],["Sonntag",plusTage(mo,6)]].map(([n,d]) => {
      /* sonderTag statt sonderFrei: ein Ereignis, dem jemand eine Stunde
         zugeordnet hat, war am Wochenende sonst unsichtbar. */
      const es = eintraegeAm(d), ev = sonderTag(d);
      const inhalt =
        ev.map(o => `<div style="margin-top:9px" data-wesonder="${o.id}">
             <span class="einmalig">${o.art === "vertretung" ? "Vertretung" : o.art === "ausfall" ? "Ausfall" : "Ereignis"}</span>
             <span style="margin-left:7px">${esc(o.titel)}${
               o.slot !== null && cfg.slots[o.slot] ? " · " + esc(cfg.slots[o.slot].von) : ""}</span></div>`).join("") +
        es.map(e => `<div style="margin-top:9px"><span class="khn">${e.typ}</span>
             <span style="margin-left:7px">${e.fach ? esc(e.fach)+" — " : ""}${esc(e.titel) || ART[e.typ]}</span></div>`).join("");
      return `<div class="we-teil">
        <div class="eyebrow">${n} ${zwei(d.getDate())}.${zwei(d.getMonth()+1)}.</div>
        ${inhalt || `<div class="detail" style="margin-top:6px">frei</div>`}
        <button class="mini" data-weplus="${iso(d)}" style="margin-top:11px">+ Ereignis</button>
      </div>`;
    }).join("");
  } else {
    const tag = TAGE[idx];
    /* Leere Stunden am Ende des Tages werden abgeschnitten — der Tag endet
       dort, wo der Unterricht endet. Freistunden mittendrin bleiben stehen. */
    let letzte = -1;
    cfg.slots.forEach((s,i) => { if(plan[woche][tag][i] || sonderAn(gewaehlt,i)) letzte = i; });
    const bis = letzte < 0 ? cfg.slots.length : letzte + 1;
    const linie = jetztLinie(bis);

    const teile = cfg.slots.slice(0, bis).map((s,i) => {
      const regulaer = plan[woche][tag][i];
      const o = sonderAn(gewaehlt, i);
      const ausfall = o && o.art === "ausfall";
      const f = (o && !ausfall) ? null : regulaer;
      const es = eintraegeAm(gewaehlt).filter(e => !e.erledigt && f && e.fach &&
                   e.fach.toUpperCase() === f.fach.toUpperCase());
      const zeichen = [...new Set(es.map(e => e.typ))].map(t => `<span class="khn">${t}</span>`).join("");
      const text = ausfall ? esc(regulaer ? regulaer.fach : "—")
                 : o ? esc(o.titel) : (f ? esc(f.fach) : "frei");
      let unten = stdText(s);
      if(ausfall) unten += " · fällt aus";
      else if(o){
        if(o.raum) unten += ` · ${esc(o.raum)}`;
        if(regulaer) unten += ` · <span class="durch">${esc(regulaer.fach)}</span>`;
      } else if(f) unten += ` · ${esc(f.raum) || "—"}${f.lk ? " · "+esc(f.lk) : ""}`;
      return `<button type="button" class="block ${istAktuellerSlot(i) ? "jetzt" : ""} ${ausfall ? "ausfall" : ""}"
          data-block="${i}">
        <div class="zeit"><b>${esc(s.von)}</b>${esc(s.bis)}</div>
        <div>
          <div class="fach ${(f || o) ? "" : "leer"}">${text}</div>
          <div class="detail">${unten}</div>
          ${o && !ausfall ? `<div class="marker"><span class="einmalig">${o.art === "vertretung" ? "Vertretung" : "einmalig"}</span></div>` : ""}
          ${zeichen ? `<div class="marker">${zeichen}</div>` : ""}
        </div></button>`;
    });
    if(linie !== null) teile.splice(linie, 0, '<div class="jetztlinie"><span>jetzt</span></div>');
    if(bis < cfg.slots.length && bis > 0)
      teile.push(`<div class="schluss">Schluss nach ${esc(cfg.slots[bis-1].bis)}</div>`);
    $("#plan").innerHTML = teile.join("");
  }
  zeichneFortschritt();
  sicherungBanner();
  zeichneListe("#tagListe", "#tagNix", eintraegeAm(gewaehlt));
}

/* Das README verspricht eine Erinnerung nach vier Wochen. Sie stand bisher
   nur in den Einstellungen — also dort, wo sie niemand sieht, der nicht
   ohnehin gerade sichert. Jetzt steht sie im Weg, wo sie hingehört. */
/* Wann zuletzt gesichert wurde, ist eine Frage des Geräts, nicht des
   Profils — eine Sicherung über alle Profile gilt für alle. Der ältere
   Eintrag im Profil zählt weiter mit, damit v32-Stände nicht verlorengehen. */
function sicherungDatum(){
  let geraet = "";
  try{ geraet = localStorage.getItem("sicherungZuletzt") || ""; }catch(e){}
  const imProfil = cfg.letzteSicherung || "";
  return geraet > imProfil ? geraet : imProfil;
}
const sicherungAlter = () => {
  const l = sicherungDatum();
  return l ? Math.round((new Date() - new Date(l+"T12:00"))/864e5) : null;
};
const hatEchteDaten = () => !!(eintraege.length || noten.length || faecher().length);
function sicherungFaellig(){
  const tage = Math.max(0, Number(cfg.sicherTage) || 0);
  if(!tage || !hatEchteDaten()) return false;
  const alter = sicherungAlter();
  return alter === null || alter >= tage;
}
function sicherungBanner(){
  const b = $("#sicherBanner");
  const zeigen = sicherungFaellig() && Speicher.lies("sicherSpaeter", "") !== iso(new Date());
  b.classList.toggle("hidden", !zeigen);
  if(!zeigen) return;
  const alter = sicherungAlter();
  b.innerHTML = `<b>Sicherung fällig</b>
    <div>${alter === null ? "Dieser Plan wurde noch nie gesichert."
      : "Letzte Sicherung vor " + zahl(alter,"Tag","Tagen") + "."}
      Löscht der Browser seine Websitedaten, ist ohne Sicherung alles weg.</div>
    <div class="chips" style="margin-top:11px">
      <button type="button" id="bSicherJetzt">Jetzt sichern</button>
      <button type="button" id="bSicherSpaeter">Heute nicht</button>
    </div>`;
}
$("#sicherBanner").onclick = e => {
  if(e.target.closest("#bSicherJetzt")){ jetztSichern(true); return; }
  if(e.target.closest("#bSicherSpaeter")){
    Speicher.schreib("sicherSpaeter", iso(new Date())); zeichne();
  }
};
/* Kurze Rückmeldung für Dinge, die von selbst passieren. Was unsichtbar
   geschieht, glaubt einem niemand. */
let hinweisUhr = null;
function kurzHinweis(text){
  const el = $("#toast"); if(!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(hinweisUhr);
  hinweisUhr = setTimeout(() => el.classList.add("hidden"), 6000);
}
$("#toast").onclick = () => $("#toast").classList.add("hidden");

const istHeuteSchultag = () =>
  gleich(gewaehlt, new Date()) && tagIndex(gewaehlt) !== 5 && cfg.slots.length && !freiAm(gewaehlt);
function istAktuellerSlot(i){
  if(!istHeuteSchultag()) return false;
  const j = jetztMin();
  return j >= minuten(cfg.slots[i].von) && j < minuten(cfg.slots[i].bis);
}
function jetztLinie(bis){
  if(!istHeuteSchultag()) return null;
  const j = jetztMin();
  if(cfg.slots.some((s,i) => istAktuellerSlot(i))) return null;
  if(j < minuten(cfg.slots[0].von)) return 0;
  for(let i = 0; i < bis-1; i++)
    if(j >= minuten(cfg.slots[i].bis) && j < minuten(cfg.slots[i+1].von)) return i+1;
  return bis;
}
function zeichneFortschritt(){
  const box = $("#fortschritt");
  if(!istHeuteSchultag()){ box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const j = jetztMin(), tag = TAGE[tagIndex(gewaehlt)], woche = wocheFuer(gewaehlt);
  const inhalt = i => sonderAn(gewaehlt,i) || plan[woche][tag][i];
  const ersteVon = minuten(cfg.slots[0].von), letzteBis = minuten(cfg.slots.at(-1).bis);
  let anteil = 0, links = "", rechts = "";
  const i = cfg.slots.findIndex((s,k) => istAktuellerSlot(k));
  if(i >= 0){
    const s = cfg.slots[i], von = minuten(s.von), bis = minuten(s.bis);
    anteil = (j - von)/(bis - von);
    const x = inhalt(i);
    links = x ? `<b>${esc(x.fach || x.titel)}</b>${x.raum ? " · "+esc(x.raum) : ""}` : "Freistunde";
    rechts = `noch ${bis - j} min`;
  } else if(j < ersteVon){
    links = "Beginnt um " + cfg.slots[0].von; rechts = `in ${ersteVon - j} min`;
  } else if(j >= letzteBis){
    anteil = 1; links = "Schule aus"; rechts = "";
  } else {
    let vor = cfg.slots[0], nach = cfg.slots.at(-1);
    for(let k = 0; k < cfg.slots.length-1; k++)
      if(j >= minuten(cfg.slots[k].bis) && j < minuten(cfg.slots[k+1].von)){ vor = cfg.slots[k]; nach = cfg.slots[k+1]; }
    const von = minuten(vor.bis), bis = minuten(nach.von);
    anteil = (j - von)/(bis - von);
    const naechstes = inhalt(cfg.slots.indexOf(nach));
    links = `<b>Pause</b>${naechstes ? " · dann "+esc(naechstes.fach || naechstes.titel) : ""}`;
    rechts = `weiter um ${nach.von} · noch ${bis - j} min`;
  }
  $("#balkenFuell").style.width = (Math.max(0,Math.min(1,anteil))*100).toFixed(1) + "%";
  $("#fortLinks").innerHTML = links;
  $("#fortRechts").textContent = rechts;
}
function countdownText(){
  const heute = new Date();
  if(istHeuteSchultag()){
    const j = jetztMin(), ende = minuten(cfg.slots.at(-1).bis);
    if(j < ende){
      const rest = ende - j;
      return `Schulschluss in ${Math.floor(rest/60)} h ${zwei(rest%60)} min`;
    }
  }
  const naechste = ferien.filter(f => f.typ === "ferien" && f.von > iso(heute))
    .sort((a,b) => a.von.localeCompare(b.von))[0];
  if(naechste){
    const tage = Math.round((new Date(naechste.von+"T12:00") - new Date(iso(heute)+"T12:00"))/864e5);
    return `${naechste.name} in ${zahl(tage,"Tag","Tagen")}`;
  }
  return "";
}

function zeichneListe(sel, nixSel, liste, mitNotiz = true){
  $(sel).innerHTML = liste.map(e => {
    const d = new Date(e.datum + "T12:00");
    const abhakbar = e.typ === "H" || e.typ === "K" || e.typ === "N";
    return `<li class="${e.erledigt ? "weg" : ""}">
      ${abhakbar ? `<input type="checkbox" class="hak" data-hak="${e.id}" ${e.erledigt ? "checked" : ""} aria-label="Erledigt">`
                 : `<span style="width:18px;flex:none"></span>`}
      <div class="wachs" data-bearbeite="${e.id}">
        <div class="kopf"><span class="khn ${e.erledigt ? "aus" : ""}">${e.typ}</span>
          <span class="titel">${e.fach ? esc(e.fach)+" — " : ""}${esc(e.titel) || ART[e.typ]}</span></div>
        ${mitNotiz && e.notiz ? `<div class="notiz">${esc(e.notiz)}</div>` : ""}
        <div class="wann">${d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
      </div></li>`;
  }).join("");
  $(nixSel).hidden = liste.length > 0;
}

function zeichneKalender(){
  $("#monatLabel").textContent = kalMonat.toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  const start = montagVon(new Date(kalMonat.getFullYear(), kalMonat.getMonth(), 1));
  let html = ["Mo","Di","Mi","Do","Fr","Sa","So"].map(t => `<div class="wt">${t}</div>`).join("");
  for(let i = 0; i < 42; i++){
    const d = plusTage(start, i);
    const es = eintraegeAm(d).filter(e => !e.erledigt);
    const zeichen = [...new Set(es.map(e => e.typ))].map(t => `<i>${t}</i>`).join("")
      + (sonderTag(d).length ? '<span class="quadratfach"></span>' : "");
    html += `<button type="button" class="tagfeld ${d.getMonth() !== kalMonat.getMonth() ? "fremd" : ""}
       ${gleich(d,new Date()) ? "heute" : ""} ${freiAm(d) ? "ferien" : ""}"
       aria-pressed="${gleich(d,kalTag)}" data-kal="${iso(d)}">
       ${d.getDate()}<span class="zeichen">${zeichen}</span></button>`;
  }
  $("#gitter").innerHTML = html;
  $("#kalTagLabel").textContent = kalTag.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long"});
  const frei = freiAm(kalTag);
  $("#kalFerien").classList.toggle("hidden", !frei);
  if(frei) $("#kalFerien").textContent = frei.name + (frei.typ === "feiertag" ? " · Feiertag" : " · Ferien");
  zeichneListe("#kalListe", "#kalNix", eintraegeAm(kalTag), false);
  const ev = sonderTag(kalTag);
  if(ev.length){
    $("#kalListe").insertAdjacentHTML("afterbegin", ev.map(o => `<li>
      <span style="width:18px;flex:none"></span>
      <div class="wachs" data-ereignis="${o.id}"><div class="kopf"><span class="einmalig">Ereignis</span>
        <span class="titel">${esc(o.titel)}</span></div></div></li>`).join(""));
    $("#kalNix").hidden = true;
  }
}

/* --- Einträge --- */
/** Reihenfolge der Kacheln, unbekannte Einträge hinten. */
function reiheEin(){
  const w = Array.isArray(cfg.reiheEin) ? cfg.reiheEin.filter(x => REIHE_STANDARD.includes(x)) : [];
  return [...w, ...REIHE_STANDARD.filter(x => !w.includes(x))];
}
let sortModus = false;

function kachelnZeichnen(){
  const liste = reiheEin();
  $("#einKacheln").innerHTML = liste.map((k,i) => {
    const knopf = `<button type="button" data-sub="${k}">${ARTLANG[k]}<small id="zahl${k}"></small></button>`;
    if(!sortModus) return knopf;
    /* Im Sortiermodus zählt der Kachelklick nicht — sonst öffnet sich beim
       Umsortieren dauernd eine Liste. */
    return `<div style="display:flex;gap:8px;align-items:stretch">
      <div style="flex:1;pointer-events:none;opacity:.75">${knopf}</div>
      <div style="display:flex;flex-direction:column;gap:6px;justify-content:center">
        <button type="button" class="mini" data-khoch="${i}" ${i === 0 ? "disabled style=opacity:.3" : ""}>↑</button>
        <button type="button" class="mini" data-krunter="${i}" ${i === liste.length-1 ? "disabled style=opacity:.3" : ""}>↓</button>
      </div></div>`;
  }).join("");
}
const listeVonTyp = t => {
  const heuteIso = iso(new Date());
  if(t === "M") return aktiv().filter(e => e.typ === "M").sort((a,b) => (a.fach||"").localeCompare(b.fach||"") || b.datum.localeCompare(a.datum));
  if(t === "F") return aktiv().filter(e => e.typ === "F").sort((a,b) => b.datum.localeCompare(a.datum));
  return aktiv().filter(e => e.typ === t && (!e.erledigt || e.datum >= heuteIso))
    .sort((a,b) => (a.erledigt - b.erledigt) || a.datum.localeCompare(b.datum));
};
const kommendeEreignisse = () => sonderAktiv()
  .filter(o => o.datum >= iso(plusTage(new Date(), -7)))
  .sort((a,b) => a.datum.localeCompare(b.datum) || ((a.slot ?? -1) - (b.slot ?? -1)));
function archivListe(){
  return [
    ...eintraege.filter(e => e.geloescht).map(e => ({art:"eintrag", id:e.id, marke:e.typ, datum:e.datum,
      seit:archiviertAm(e), rest:archivRest(e),
      text:(e.fach ? e.fach+" — " : "") + (e.titel || ART[e.typ] || "")})),
    ...sonder.filter(o => o.geloescht).map(o => ({art:"ereignis", id:o.id, marke:"E", datum:o.datum,
      seit:archiviertAm(o), rest:archivRest(o), text:o.titel})),
    ...noten.filter(n => n.geloescht).map(n => ({art:"note", id:n.id, marke:"G", datum:n.datum,
      seit:archiviertAm(n), rest:archivRest(n),
      text:`${notenText(n.wert)} · ${fachName(n.fach)}${n.titel ? " — "+n.titel : ""}`}))
  ].sort((a,b) => (a.rest === null ? 1e9 : a.rest) - (b.rest === null ? 1e9 : b.rest)
               || b.datum.localeCompare(a.datum));
}
/* Was der Hinweis oben im Archiv sagt. */
function archivHinweis(liste){
  const tage = archivFrist();
  if(!tage) return "Gelöschtes bleibt hier, bis du es selbst entfernst. "
    + "Eine Frist stellst du unter ⚙ → Archiv ein.";
  const bald = liste.filter(a => a.rest !== null && a.rest <= 7).length;
  return `Gelöschtes wird ${zahl(tage,"Tag","Tage")} nach dem Löschen endgültig entfernt.`
    + (bald ? ` ${zahl(bald,"Eintrag geht","Einträge gehen")} in der kommenden Woche verloren.` : "")
    + " Zum sofortigen Entfernen ein zweites Mal löschen.";
}
const archivFinden = (art,id) => art === "eintrag" ? eintraege.find(x => x.id === id)
  : art === "ereignis" ? sonder.find(x => x.id === id) : noten.find(x => x.id === id);

function zeichneEintraege(){
  $("#einMenu").classList.toggle("hidden", einSub !== null);
  $("#einDetail").classList.toggle("hidden", einSub === null);
  $("#einSubHinweis").textContent = "";
  $("#einSubHinweis").style.color = "";

  if(einSub === null){
    kachelnZeichnen();
    const off = t => listeVonTyp(t).filter(e => !e.erledigt).length;
    const std = fehlStunden();
    const zaehler = {
      H: off("H") ? `${off("H")} offen` : "nichts offen",
      K: off("K") ? `${off("K")} anstehend` : "nichts anstehend",
      N: off("N") ? `${off("N")} vorhanden` : "keine",
      E: kommendeEreignisse().length ? `${kommendeEreignisse().length} geplant` : "keine",
      G: notenAktiv().length ? `${notenAktiv().length} eingetragen` : "keine",
      M: listeVonTyp("M").length ? `${listeVonTyp("M").length} vorhanden` : "keine",
      F: std ? `${zahl(std,"Stunde","Stunden")} · ${tageText(std)}` : "keine",
      archiv: archivListe().length ? `${archivListe().length} im Archiv` : "leer"
    };
    Object.entries(zaehler).forEach(([k,v]) => { const el = $("#zahl"+k); if(el) el.textContent = v; });
    suchen();

    return;
  }
  $("#einTitel").textContent = ARTLANG[einSub] || "";

  if(einSub === "archiv"){
    const liste = archivListe();
    const el = $("#einSubHinweis");
    el.textContent = archivHinweis(liste);
    el.style.color = archivFrist() ? "var(--akzent)" : "";
    $("#einListe").innerHTML = liste.map(e => {
      const rest = e.rest === null ? ""
        : e.rest <= 0 ? " · wird beim nächsten Öffnen entfernt"
        : e.rest === 1 ? " · noch heute" : ` · noch ${zahl(e.rest,"Tag","Tage")}`;
      return `<li>
      <div class="wachs">
        <div class="kopf"><span class="khn aus">${esc(e.marke)}</span>
          <span class="titel" style="color:var(--muted)">${esc(e.text)}</span></div>
        <div class="wann">${zeigDatum(e.datum)} · gelöscht ${zeigDatum(e.seit)}<span
          style="${e.rest !== null && e.rest <= 7 ? "color:var(--akzent)" : ""}">${rest}</span></div></div>
      <button class="mini" data-zurueck="${e.art}:${e.id}">Zurück</button>
      <button class="mini" data-endgueltig="${e.art}:${e.id}" style="border-color:var(--akzent);color:var(--akzent)">Löschen</button>
    </li>`; }).join("");
    $("#einNix").textContent = "Archiv ist leer.";
    $("#einNix").hidden = liste.length > 0;
    return;
  }
  if(einSub === "E"){
    const liste = kommendeEreignisse();
    $("#einListe").innerHTML = liste.map(o => {
      const d = new Date(o.datum+"T12:00");
      const wann = d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"}) +
        (o.slot !== null && cfg.slots[o.slot] ? ` · ${cfg.slots[o.slot].von}` : " · ganzer Tag");
      return `<li><span style="width:18px;flex:none"></span>
        <div class="wachs" data-ereignis="${o.id}">
          <div class="kopf"><span class="einmalig">${o.art === "ausfall" ? "Ausfall" : o.art === "vertretung" ? "Vertretung" : "Ereignis"}</span>
            <span class="titel">${esc(o.titel)}</span></div>
          ${o.notiz ? `<div class="notiz">${esc(o.notiz)}</div>` : ""}
          <div class="wann">${wann}${o.raum ? " · "+esc(o.raum) : ""}</div></div></li>`;
    }).join("");
    $("#einNix").textContent = "Keine Ereignisse geplant.";
    $("#einNix").hidden = liste.length > 0;
    return;
  }
  if(einSub === "G"){ zeichneNoten(); return; }
  if(einSub === "M"){ zeichneMerk(); return; }
  if(einSub === "F"){ zeichneFehlzeiten(); return; }

  const liste = listeVonTyp(einSub);
  zeichneListe("#einListe", "#einNix", liste);
  $("#einNix").textContent = {H:"Keine offenen Hausaufgaben.",K:"Keine Klausuren eingetragen.",
                              N:"Keine Notizen."}[einSub] || "Nichts vorhanden.";
}

function zeichneNoten(){
  $("#einSubHinweis").textContent =
    `Verhältnis je Fach antippbar. Standard: ${Number(cfg.anteilM)||0} % mündlich.`;
  const liste = alleFaecher().filter(f => notenAktiv().some(n => n.fach === f));
  $("#einListe").innerHTML = liste.map(f => {
    const sch = notenSchnitt(f), aM = anteilFuer(f);
    const eigene = notenAktiv().filter(n => n.fach === f).sort((a,b) => b.datum.localeCompare(a.datum));
    return `<li style="display:block;padding:0;border:0"><div class="notenkarte">
      <div class="kopfz">
        <div><div style="font-size:17px">${esc(fachName(f))}</div>
          <div class="teil">mündlich ${notenText(sch.m)} · schriftlich ${notenText(sch.s)}</div></div>
        <div class="schnitt">${notenText(sch.gesamt)}</div></div>
      <div class="notenchips"><button type="button" class="anteilchip" data-anteil="${esc(f)}">
        ${aM} % mündlich${hatEigenenAnteil(f) ? " · eigen" : ""}</button></div>
      ${eigene.map(n => `<div class="notenzeile" data-note="${n.id}">
        <span class="wert">${notenText(n.wert)}</span>
        <span class="art">${n.art === "m" ? "mündl." : "schriftl."}</span>
        <span class="wofuer">${esc(n.titel) || "—"}</span>
        <span class="tag">${zeigDatum(n.datum)}</span></div>`).join("")}
    </div></li>`;
  }).join("");
  $("#einNix").textContent = "Noch keine Noten eingetragen.";
  $("#einNix").hidden = liste.length > 0;
}

function zeichneMerk(){
  const liste = listeVonTyp("M");
  $("#einSubHinweis").textContent = "Antippen zum Ansehen.";
  let letztesFach = null;
  $("#einListe").innerHTML = liste.map(e => {
    const kopf = e.fach !== letztesFach ? `<div class="eyebrow mitte" style="margin-top:18px">${esc(fachName(e.fach))}</div>` : "";
    letztesFach = e.fach;
    const bilder = (e.bilder || []).length;
    return `<li style="display:block;padding:0;border:0">${kopf}
      <button type="button" class="merkzeile" data-schau="${e.id}">
        <div class="mtitel">${esc(e.titel) || "Merkblatt"}</div>
        <div class="mstand">${zeigDatum(e.datum)}${e.zeit ? " · "+e.zeit : ""}
          ${bilder ? " · " + zahl(bilder,"Bild","Bilder") : ""}</div>
      </button></li>`;
  }).join("");
  $("#einNix").textContent = "Noch keine Merkblätter.";
  $("#einNix").hidden = liste.length > 0;
}

/* Fehlzeiten werden in Unterrichtsstunden gezählt, nicht je Fach —
   so steht es auch auf dem Zeugnis. */
const fehlStunden = art => listeVonTyp("F")
  .filter(e => !art || e.titel === art)
  .reduce((s,e) => s + (Number(e.stunden) || 1), 0);
const alsTage = std => {
  const p = Math.max(1, Number(cfg.stdProTag) || 8);
  const t = std / p;
  return t % 1 ? t.toFixed(1).replace(".", ",") : String(t);
};
const tageText = std => { const t = alsTage(std); return `${t} ${t === "1" ? "Tag" : "Tage"}`; };
function fehlText(){
  const g = fehlStunden(), u = fehlStunden("unentschuldigt");
  if(!g) return "";
  return `${zahl(g,"Stunde","Stunden")} = ${tageText(g)}`
       + (u ? ` · davon ${u} unentschuldigt` : "");
}
function zeichneFehlzeiten(){
  const liste = listeVonTyp("F");
  $("#einSubHinweis").textContent = fehlText();
  $("#einListe").innerHTML = liste.map(e => `<li>
    <span style="width:18px;flex:none"></span>
    <div class="wachs" data-bearbeite="${e.id}">
      <div class="kopf"><span class="khn">F</span>
        <span class="titel">${zahl(Number(e.stunden)||1,"Stunde","Stunden")} — ${esc(e.titel) || "Fehlzeit"}</span></div>
      ${e.notiz ? `<div class="notiz">${esc(e.notiz)}</div>` : ""}
      <div class="wann">${zeigDatum(e.datum)}</div></div></li>`).join("");
  $("#einNix").textContent = "Keine Fehlzeiten erfasst.";
  $("#einNix").hidden = liste.length > 0;
}

/** Fächer in der eingestellten Reihenfolge, neue hinten angehängt. */
function fachReihenfolge(){
  const alle = alleFaecher().filter(f => faecher().includes(f) || notenAktiv().some(n => n.fach === f));
  const wunsch = Array.isArray(cfg.reiheFach) ? cfg.reiheFach : [];
  return [...wunsch.filter(f => alle.includes(f)), ...alle.filter(f => !wunsch.includes(f))];
}
function zeichneZeugnis(){
  const liste = fachReihenfolge();
  const schnitte = liste.map(f => notenSchnitt(f).gesamt).filter(w => w !== null);
  const gesamt = schnitte.length ? schnitte.reduce((a,b) => a+b, 0)/schnitte.length : null;
  $("#zeuSchnitt").textContent = gesamt === null ? "" : notenText(gesamt);
  const fehl = fehlText();
  $("#zeuHinweis").textContent = (notenAktiv().length
    ? `Aus ${zahl(notenAktiv().length,"Note","Noten")} in ${schnitte.length} von ${liste.length} Fächern.`
    : "Noch keine Noten. Tippe ein Fach an, um Verhältnis und Zielnote zu setzen.")
    + (fehl ? `  Versäumt: ${fehl}.` : "");
  $("#zeuListe").innerHTML = liste.map(f => {
    const sch = notenSchnitt(f), ganz = zeugnisNote(sch.gesamt);
    const anzahl = notenAktiv().filter(n => n.fach === f).length;
    return `<button type="button" class="zeuZeile" data-zeufach="${esc(f)}">
      <div class="fachn">${esc(fachName(f))}
        <small>${anzahl ? zahl(anzahl,"Note","Noten") : "keine Noten"} · ${anteilFuer(f)} % mündlich</small></div>
      <div class="roh">${notenText(sch.gesamt)}</div>
      <div class="note">${ganz === null ? "—" : ganz}</div></button>`;
  }).join("");
  $("#zeuNix").hidden = liste.length > 0;
}

/* =====================================================================
   Navigation
   ===================================================================== */
const ANSICHTEN = ["tag","kalender","eintraege","zeugnis"];
function zeigeAnsicht(a){
  ansicht = a;
  if(a === "kalender"){ kalMonat = new Date(gewaehlt); kalTag = new Date(gewaehlt); }
  if(a === "eintraege") einSub = null;
  zeichne();
}
$("#rTag").onclick = () => zeigeAnsicht("tag");
$("#rKal").onclick = () => zeigeAnsicht("kalender");
$("#rEin").onclick = () => zeigeAnsicht("eintraege");
$("#rZeu").onclick = () => zeigeAnsicht("zeugnis");
$("#btnEdit").onclick = () => { bearbeiten = !bearbeiten; zeichne(); };
$("#btnHeute").onclick = () => { gewaehlt = new Date(); zeichne(); };
$("#wocheZurueck").onclick = () => { gewaehlt = plusTage(gewaehlt,-7); zeichne(); };
$("#wocheVor").onclick     = () => { gewaehlt = plusTage(gewaehlt, 7); zeichne(); };
$("#monatMinus").onclick = () => { kalMonat = new Date(kalMonat.getFullYear(), kalMonat.getMonth()-1, 1); zeichne(); };
$("#monatPlus").onclick  = () => { kalMonat = new Date(kalMonat.getFullYear(), kalMonat.getMonth()+1, 1); zeichne(); };
$("#tage").onclick = e => {
  const b = e.target.closest("[data-tag]"); if(!b) return;
  const i = +b.dataset.tag;
  gewaehlt = plusTage(montagVon(gewaehlt), i === 5 ? 5 : i); zeichne();
};
$("#kalHeute").onclick = () => {
  kalTag = new Date(); kalMonat = new Date(); gewaehlt = new Date(); zeichne();
};
/* Doppeltippen selbst erkennen: das eingebaute dblclick-Ereignis bleibt aus,
   weil der erste Klick das Gitter neu zeichnet und der zweite deshalb auf
   einem anderen Element landet. */
let letzterKalTipp = {datum:null, zeit:0};
$("#gitter").onclick = e => {
  const b = e.target.closest("[data-kal]"); if(!b) return;
  const jetzt = Date.now();
  const doppelt = letzterKalTipp.datum === b.dataset.kal && jetzt - letzterKalTipp.zeit < 450;
  letzterKalTipp = {datum: doppelt ? null : b.dataset.kal, zeit: jetzt};
  if(doppelt){ kalMenuOeffnen(b.dataset.kal); return; }
  kalTag = new Date(b.dataset.kal+"T12:00"); zeichne();
};

/* Wischen: eine Geste, mehrere Orte */
function wischen(el, beiWisch){
  if(!el) return;
  let x0 = null, y0 = null;
  el.addEventListener("touchstart", e => {
    if(e.touches.length !== 1){ x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, {passive:true});
  el.addEventListener("touchend", e => {
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if(Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)*1.2) return;
    beiWisch(dx < 0 ? 1 : -1);
  }, {passive:true});
}
wischen($("#ansichtTag"), r => { gewaehlt = plusTage(gewaehlt, r); zeichne(); });
wischen($("#ansichtKal"), r => { kalMonat = new Date(kalMonat.getFullYear(), kalMonat.getMonth()+r, 1); zeichne(); });
wischen($("#ansichtEin"), () => { if(einSub !== null){ einSub = null; zeichne(); } });
const ansichtWisch = r => {
  if(ansicht === "eintraege" && einSub !== null){ einSub = null; zeichne(); return; }
  const i = ANSICHTEN.indexOf(ansicht);
  zeigeAnsicht(ANSICHTEN[(i + r + ANSICHTEN.length) % ANSICHTEN.length]);
};
wischen($("#fuss"), ansichtWisch);
wischen($("#leerraum"), ansichtWisch);
$("#wischPunkte").onclick = () => {
  if(ansicht === "eintraege" && einSub !== null){ einSub = null; zeichne(); return; }
  const i = ANSICHTEN.indexOf(ansicht);
  zeigeAnsicht(ANSICHTEN[(i+1) % ANSICHTEN.length]);
};
/* Tippen neben den Inhalt einer Unterliste führt zurück */
$("#ansichtEin").addEventListener("click", e => {
  if(einSub !== null && e.target === $("#ansichtEin")){ einSub = null; zeichne(); }
});
/* Kalenderfeld gedrückt halten, doppelt antippen oder rechts klicken:
   Auswahl, was an diesem Tag eingetragen werden soll. */
(function(){
  let uhr = null, langKal = false;
  const g = $("#gitter");
  const feld = e => e.target.closest("[data-kal]");
  g.addEventListener("touchstart", e => {
    const b = feld(e); if(!b) return;
    uhr = setTimeout(() => {
      langKal = true;
      if(navigator.vibrate) navigator.vibrate(15);
      kalMenuOeffnen(b.dataset.kal);
    }, 500);
  }, {passive:true});
  ["touchmove","touchend","touchcancel"].forEach(t =>
    g.addEventListener(t, () => { clearTimeout(uhr); }, {passive:true}));
  g.addEventListener("contextmenu", e => {
    const b = feld(e); if(!b) return;
    e.preventDefault(); kalMenuOeffnen(b.dataset.kal);
  });
  g.addEventListener("click", e => { if(langKal){ langKal = false; e.stopPropagation(); } }, true);
})();

/* Was an einem Kalendertag angelegt werden kann. Der freie Tag war früher
   das Einzige — der Kalender kann jetzt auch das, was ein Kalender kann. */
let kalMenuDatum = null;
function kalMenuOeffnen(datum){
  kalMenuDatum = datum;
  kalTag = new Date(datum + "T12:00");
  const frei = freiAm(kalTag);
  const eigen = ferien.find(f => f.typ === "eigen" && datum >= f.von && datum <= f.bis);
  $("#kmTitel").textContent =
    kalTag.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const dran = sonderTag(kalTag).length + eintraegeAm(kalTag).length;
  $("#kmStand").textContent = [
    frei ? frei.name + (frei.typ === "feiertag" ? " · Feiertag"
                      : frei.typ === "eigen" ? " · eigener freier Tag" : " · Ferien") : "",
    dran ? zahl(dran, "Eintrag", "Einträge") : ""
  ].filter(Boolean).join(" · ") || "nichts eingetragen";
  $("#bKmFreiText").textContent = eigen ? "Freien Tag ändern" : "Freier Tag";
  $("#bKmFreiKlein").textContent = eigen ? eigen.name : "Praktikum, Ausflug, beweglicher Ferientag";
  dlgKalTag.showModal();
}
const kalMenu = (typ, extra) => {
  dlgKalTag.close();
  eintragOeffnen(null, new Date(kalMenuDatum + "T12:00"), typ, "", undefined, extra);
};
$("#bKmTermin").onclick  = () => kalMenu("E");
$("#bKmHA").onclick      = () => kalMenu("H");
$("#bKmKlausur").onclick = () => kalMenu("K");
$("#bKmNotiz").onclick   = () => kalMenu("N");
$("#bKmFehl").onclick    = () => kalMenu("F");
$("#bKmFrei").onclick    = () => { dlgKalTag.close(); tagFreiOeffnen(kalMenuDatum); };
$("#bKmAb").onclick      = () => dlgKalTag.close();

let tagFreiDatum = null;
function tagFreiOeffnen(datum){
  tagFreiDatum = datum;
  const vorhanden = ferien.find(f => f.typ === "eigen" && datum >= f.von && datum <= f.bis);
  $("#tfDatum").textContent = zeigDatum(datum);
  tfName.value = vorhanden ? vorhanden.name : "";
  tfBis.value = vorhanden ? vorhanden.bis : datum;
  $("#bTagFreiWeg").classList.toggle("hidden", !vorhanden);
  dlgTagFrei.showModal();
}
$("#bTagFreiAb").onclick = () => dlgTagFrei.close();
$("#bTagFreiSpeichern").onclick = () => {
  const name = tfName.value.trim() || "Frei";
  const bis = tfBis.value && tfBis.value >= tagFreiDatum ? tfBis.value : tagFreiDatum;
  ferien = ferien.filter(f => !(f.typ === "eigen" && tagFreiDatum >= f.von && tagFreiDatum <= f.bis));
  ferien.push({von:tagFreiDatum, bis, name, typ:"eigen"});
  ferien.sort((a,b) => a.von.localeCompare(b.von));
  sichern(); dlgTagFrei.close(); zeichne();
};
$("#bTagFreiWeg").onclick = () => {
  ferien = ferien.filter(f => !(f.typ === "eigen" && tagFreiDatum >= f.von && tagFreiDatum <= f.bis));
  sichern(); dlgTagFrei.close(); zeichne();
};

/* Dialoge: Tippen auf den Hintergrund schließt */
document.querySelectorAll("dialog").forEach(d => {
  const zu = () => { if(d.id === "dlgEinst") einstSchliessen(); else d.close(); };
  d.addEventListener("click", e => { if(e.target === d) zu(); });
  wischen(d, zu);
});

/* =====================================================================
   Stunde antippen
   ===================================================================== */
let offenerBlock = 0, langDruck = false, fachInfoFach = null;
(function(){
  let uhr = null;
  const flaeche = $("#plan");
  const start = e => {
    const b = e.target.closest("[data-block]"); if(!b) return;
    const i = +b.dataset.block;
    uhr = setTimeout(() => {
      langDruck = true;
      if(navigator.vibrate) navigator.vibrate(15);
      fachInfo(i);
    }, 500);
  };
  const stopp = () => { clearTimeout(uhr); uhr = null; };
  flaeche.addEventListener("touchstart", start, {passive:true});
  ["touchmove","touchend","touchcancel"].forEach(t => flaeche.addEventListener(t, stopp, {passive:true}));
  flaeche.addEventListener("contextmenu", e => {
    const b = e.target.closest("[data-block]"); if(!b) return;
    e.preventDefault(); fachInfo(+b.dataset.block);
  });
})();

$("#plan").onclick = e => {
  const plus = e.target.closest("[data-weplus]");
  if(plus){ eintragOeffnen(null, new Date(plus.dataset.weplus+"T12:00"), "E", "", null); return; }
  const wes = e.target.closest("[data-wesonder]");
  if(wes){ ereignisOeffnen(wes.dataset.wesonder); return; }
  const b = e.target.closest("[data-block]"); if(!b) return;
  if(langDruck){ langDruck = false; return; }
  offenerBlock = +b.dataset.block;
  if(bearbeiten){ blockDialog(); return; }
  const o = sonderAn(gewaehlt, offenerBlock);
  if(o){ ereignisOeffnen(o.id); return; }
  schnellDialog();
};

function blockDialog(){
  const woche = wocheFuer(gewaehlt), tag = TAGE[tagIndex(gewaehlt)];
  const f = plan[woche][tag][offenerBlock] || {};
  fFach.value = f.fach || ""; fRaum.value = f.raum || ""; fLK.value = f.lk || "";
  $("#dlgBlockTitel").textContent = `${LANG[tag]}, ${cfg.slots[offenerBlock].std.replace(/,/g,"/")}. Stunde`;
  $("#dlgBlockZeit").textContent = `${cfg.slots[offenerBlock].von} – ${cfg.slots[offenerBlock].bis}`;
  const h = $("#hinweisWoche");
  h.classList.toggle("hidden", !cfg.zweiWochen);
  h.textContent = `Gilt nur für die ${woche}-Woche.`;
  dlgBlock.showModal();
}
$("#bBlockAb").onclick = () => dlgBlock.close();
$("#bBlockSpeichern").onclick = () => {
  /* Groß wie überall sonst — sonst zählen „Ch" und „CH" als zwei Fächer. */
  const fach = fFach.value.trim().toUpperCase();
  plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock] =
    fach ? {fach, raum:fRaum.value.trim(), lk:fLK.value.trim()} : null;
  sichern(); dlgBlock.close(); zeichne();
};
$("#bBlockLeeren").onclick = () => {
  plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock] = null;
  sichern(); dlgBlock.close(); zeichne();
};

const schnellFach = () => {
  const f = plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock];
  return f ? f.fach : "";
};
function schnellDialog(){
  const fach = schnellFach();
  if(!fach){ eintragOeffnen(null, gewaehlt, "E", "", offenerBlock); return; }
  const s = cfg.slots[offenerBlock];
  $("#schnellTitel").textContent = fachName(fach);
  $("#schnellZeit").textContent = `${s.von} – ${s.bis}`;
  const naechste = naechsterTagMitFach(gewaehlt, fach.toUpperCase());
  $("#bSchnellHAZiel").textContent = naechste
    ? "fällig " + naechste.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})
    : "kein weiterer Termin";
  dlgSchnell.showModal();
}
const schnell = (typ, datum, extra) => { dlgSchnell.close();
  eintragOeffnen(null, datum, typ, schnellFach(), offenerBlock, extra); };
$("#bSchnellHA").onclick = () => {
  const fach = schnellFach();
  schnell("H", naechsterTagMitFach(gewaehlt, fach.toUpperCase()) || plusTage(gewaehlt,1));
};
$("#bSchnellNotiz").onclick   = () => schnell("N", gewaehlt);
$("#bSchnellKlausur").onclick = () => schnell("K", gewaehlt);
$("#bSchnellFehl").onclick = () => {
  const std = (cfg.slots[offenerBlock].std || "1").split(",").length;
  dlgSchnell.close();
  eintragOeffnen(null, gewaehlt, "F", "", offenerBlock, {stunden:std});
};
$("#bSchnellAusfall").onclick = () => {
  dlgSchnell.close();
  const datum = iso(gewaehlt);
  sonder = sonder.filter(x => !(x.datum === datum && x.slot === offenerBlock));
  sonder.push({id:neueId(), datum, slot:offenerBlock, art:"ausfall",
               titel:"Fällt aus", raum:"", notiz:"", geloescht:false});
  sichern(); zeichne();
};
$("#bSchnellVertretung").onclick = () => {
  dlgSchnell.close(); eintragOeffnen(null, gewaehlt, "E", "", offenerBlock, {art:"vertretung"});
};
$("#bSchnellErsatz").onclick = () => {
  dlgSchnell.close(); eintragOeffnen(null, gewaehlt, "E", "", offenerBlock);
};
/* Langes Drücken gibt es mit Tastatur nicht — hier führt derselbe Weg hin. */
$("#bSchnellInfo").onclick = () => { dlgSchnell.close(); fachInfo(offenerBlock); };

/** Alles, was die App über ein Fach weiß. */
function fachInfo(i){
  const f = plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][i];
  if(!f) return;
  const k = f.fach.toUpperCase();
  fachInfoFach = k;
  let stunden = 0;
  ["A","B"].forEach(w => TAGE.forEach(t =>
    (plan[w][t]||[]).forEach(x => { if(x && x.fach.toUpperCase() === k) stunden++; })));
  const proWoche = cfg.zweiWochen ? stunden/2 : stunden;
  const naechste = naechsterTagMitFach(gewaehlt, k);
  const sch = notenSchnitt(k);
  const offen = aktiv().filter(e => !e.erledigt && e.fach === k && (e.typ === "H" || e.typ === "K"));
  const mb = aktiv().filter(e => e.fach === k && e.typ === "M").length;

  $("#fiTitel").textContent = fachName(k);
  $("#fiKuerzel").textContent = fachName(k) === k ? "" : k;
  const zeile = (a,b) => `<div class="fiZeile"><span>${a}</span><span>${b}</span></div>`;
  $("#fiInhalt").innerHTML =
    zeile("Lehrkraft", f.lk ? esc(lehrerName(f.lk)) : "—") +
    zeile("Raum", esc(f.raum) || "—") +
    zeile("Stunden je Woche", proWoche % 1 ? proWoche.toFixed(1) : String(proWoche)) +
    (naechste ? `<div class="fiZeile"><span>Als Nächstes</span>
       <span><button type="button" class="mini" data-zukalender="${iso(naechste)}">
       ${naechste.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</button></span></div>`
     : zeile("Als Nächstes","—")) +
    zeile("Schnitt", notenText(sch.gesamt)) +
    zeile("Merkblätter", mb ? String(mb) : "keine") +
    zeile("Offen", offen.length ? offen.map(e => e.typ).join(" ") : "nichts");
  dlgFach.showModal();
}
$("#bFachAb").onclick = () => dlgFach.close();
$("#fiInhalt").onclick = e => {
  const b = e.target.closest("[data-zukalender]"); if(!b) return;
  dlgFach.close();
  kalTag = new Date(b.dataset.zukalender+"T12:00");
  kalMonat = new Date(kalTag);
  ansicht = "kalender"; zeichne();
};
$("#bFachMerk").onclick = () => { dlgFach.close(); ansicht = "eintraege"; einSub = "M"; zeichne(); };

/* =====================================================================
   Eintragsdialog — eine Oberfläche für alle Arten
   ===================================================================== */
let bearbeiteId = null, ereignisId = null, noteId = null, bilder = [], ereignisArt = "ereignis";

function fachAuswahlFuellen(wert){
  const liste = alleFaecher();
  eFach.innerHTML = `<option value="">— keins —</option>` +
    liste.map(f => `<option ${f === wert ? "selected" : ""}>${esc(f)}</option>`).join("") +
    `<option value="__frei">Anderes …</option>`;
  if(wert && !liste.includes(wert)){ eFach.value = "__frei"; eFachFrei.value = wert; }
  else if(!wert) eFach.value = "";
  freiUmschalten();
}
const freiUmschalten = () => $("#eFachFreiWrap").classList.toggle("hidden", eFach.value !== "__frei");
const aktuellesFach = () => (eFach.value === "__frei" ? eFachFrei.value : eFach.value).trim().toUpperCase();
eFach.onchange = () => {
  freiUmschalten();
  if(!$("#eDatumWahl").classList.contains("hidden")) zeichneDatumWahl();
};
eFachFrei.oninput = () => { if(!$("#eDatumWahl").classList.contains("hidden")) zeichneDatumWahl(); };
eTyp.onchange = artUmschalten;

function stundenAuswahlFuellen(slot){
  eStunde.innerHTML = `<option value="">ganzer Tag</option>` +
    cfg.slots.map((s,i) => `<option value="${i}" ${i === slot ? "selected" : ""}>${stdText(s)} · ${esc(s.von)}</option>`).join("");
  if(slot === null || slot === undefined) eStunde.value = "";
}
function artUmschalten(){
  const t = eTyp.value;
  const ev = t === "E", note = t === "G", merk = t === "M", fehl = t === "F";
  $("#eFachWrap").classList.toggle("hidden", ev || fehl);
  $("#eEreignisWrap").classList.toggle("hidden", !ev);
  $("#eNoteWrap").classList.toggle("hidden", !note);
  $("#eFehlWrap").classList.toggle("hidden", !fehl);
  $("#eBildWrap").classList.toggle("hidden", !merk);
  $("#eTextWrap").classList.toggle("hidden", fehl);
  $("#eTextLabel").textContent = merk ? "Überschrift" : "Was";
  $("#eNotizLabel").textContent = merk ? "Inhalt" : "Notizen";
  eNotiz.style.minHeight = merk ? "220px" : "";
  $("#eWertLabel").textContent = cfg.notenSystem === "punkte15" ? "Punkte 0–15" : "Note 1–6";
  if(ev) $("#eFachFreiWrap").classList.add("hidden"); else freiUmschalten();
  bilderZeichnen();
}

/* --- Datumsauswahl mit Punkten an den Tagen des gewählten Fachs --- */
let eMonat = new Date();
function datumFeldText(){
  const v = eDatum.value;
  $("#eDatumFeld").textContent = v
    ? new Date(v+"T12:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})
    : "—";
}
function zeichneDatumWahl(){
  const fach = aktuellesFach();
  $("#eMonatLabel").textContent = eMonat.toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  const start = montagVon(new Date(eMonat.getFullYear(), eMonat.getMonth(), 1));
  let html = ["Mo","Di","Mi","Do","Fr","Sa","So"].map(t => `<div class="wt">${t}</div>`).join("");
  for(let i = 0; i < 42; i++){
    const d = plusTage(start, i);
    html += `<button type="button" class="tagfeld ${d.getMonth() !== eMonat.getMonth() ? "fremd" : ""}
       ${gleich(d,new Date()) ? "heute" : ""} ${freiAm(d) ? "ferien" : ""}"
       aria-pressed="${eDatum.value === iso(d)}" data-wahl="${iso(d)}">
       ${d.getDate()}${hatFachAm(d,fach) ? '<span class="punktfach"></span>' : ""}</button>`;
  }
  $("#eGitter").innerHTML = html;
  $("#eGitterHinweis").textContent = fach
    ? `Roter Punkt: ${fach} steht an diesem Tag im Plan.`
    : "Wähle oben ein Fach, dann werden die passenden Tage markiert.";
}
function datumWahlOeffnen(auf){
  $("#eDatumWahl").classList.toggle("hidden", !auf);
  $("#eDatumFeld").setAttribute("aria-expanded", auf ? "true" : "false");
  if(auf){ eMonat = new Date((eDatum.value || iso(new Date()))+"T12:00"); zeichneDatumWahl(); }
}
$("#eDatumFeld").onclick = () => datumWahlOeffnen($("#eDatumWahl").classList.contains("hidden"));
$("#eMonatMinus").onclick = () => { eMonat = new Date(eMonat.getFullYear(), eMonat.getMonth()-1, 1); zeichneDatumWahl(); };
$("#eMonatPlus").onclick  = () => { eMonat = new Date(eMonat.getFullYear(), eMonat.getMonth()+1, 1); zeichneDatumWahl(); };
$("#eGitter").onclick = e => {
  const b = e.target.closest("[data-wahl]"); if(!b) return;
  eDatum.value = b.dataset.wahl; datumFeldText(); datumWahlOeffnen(false);
};

/* --- Bilder: verkleinern, sonst platzt der Browserspeicher --- */
function bilderZeichnen(){
  $("#eBilder").innerHTML = bilder.map((b,i) =>
    `<div class="bildweg"><img src="${esc(b)}" alt=""><button type="button" data-bildweg="${i}">×</button></div>`).join("");
  const kb = Math.round(bilder.reduce((s,b) => s + b.length, 0) / 1024 * 0.75);
  const warn = speicherWarnung();
  $("#bildStand").textContent = (bilder.length ? `${zahl(bilder.length,"Bild","Bilder")} · ca. ${kb} kB` : "")
    + (warn ? (bilder.length ? " · " : "") + warn : "");
  $("#bildStand").style.color = warn ? "var(--akzent)" : "";
}
$("#eBilder").onclick = e => {
  const b = e.target.closest("[data-bildweg]"); if(!b) return;
  bilder.splice(+b.dataset.bildweg, 1); bilderZeichnen();
};
$("#bBildWahl").onclick = () => bildDatei.click();
bildDatei.onchange = () => {
  const dateien = [...(bildDatei.files || [])];
  dateien.forEach(datei => bildVerkleinern(datei, d => { bilder.push(d); bilderZeichnen(); }));
  bildDatei.value = "";
};
function bildVerkleinern(datei, fertig){
  const leser = new FileReader();
  leser.onload = () => {
    const bild = new Image();
    bild.onload = () => {
      const max = 1000;
      const skala = Math.min(1, max / Math.max(bild.width, bild.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bild.width * skala); c.height = Math.round(bild.height * skala);
      c.getContext("2d").drawImage(bild, 0, 0, c.width, c.height);
      fertig(c.toDataURL("image/jpeg", 0.7));
    };
    bild.onerror = () => zeigeFehler("Bild ließ sich nicht lesen.");
    bild.src = leser.result;
  };
  leser.readAsDataURL(datei);
}

/* --- Öffnen --- */
function standardArt(){
  if(ansicht === "eintraege" && einSub && ARTLANG[einSub] && einSub !== "archiv") return einSub;
  if(ansicht === "zeugnis") return "G";
  return "H";
}
function eintragOeffnen(e, datum, typ, fach, slot, extra){
  bearbeiteId = e ? e.id : null;
  ereignisId = null; noteId = null; bilder = [];
  ereignisArt = (extra && extra.art) || "ereignis";
  eWert.value = ""; eNArt.value = "s"; eOrt.value = ""; eFehlArt.value = "entschuldigt";
  eFehlStd.value = 1;
  const d = datum || gewaehlt;
  const vorhanden = (typ === "E" && slot !== undefined && slot !== null) ? sonderAn(d, slot) : null;
  if(vorhanden){ ereignisId = vorhanden.id; ereignisArt = vorhanden.art || "ereignis"; }

  $("#dlgEintragTitel").textContent = (e || vorhanden) ? "Eintrag ändern" : "Neuer Eintrag";
  eTyp.value = e ? e.typ : (typ || standardArt());
  eDatum.value = e ? e.datum : iso(d);
  eText.value = e ? (e.titel || "") : (vorhanden ? vorhanden.titel : (ereignisArt === "vertretung" ? "Vertretung" : ""));
  eNotiz.value = e ? (e.notiz || "") : (vorhanden ? (vorhanden.notiz || "") : "");
  if(e && e.typ === "M") bilder = (e.bilder || []).slice();
  if(e && e.typ === "F"){ eFehlArt.value = e.titel || "entschuldigt"; eFehlStd.value = Number(e.stunden)||1; }
  if(!e && typ === "F" && extra && extra.stunden) eFehlStd.value = extra.stunden;
  if(vorhanden) eOrt.value = vorhanden.raum || "";
  stundenAuswahlFuellen(vorhanden ? vorhanden.slot : (slot === undefined ? null : slot));
  /* Nie ein Fach vorbelegen, außer es kommt eindeutig aus der angetippten Stunde. */
  fachAuswahlFuellen(e ? e.fach : (fach || ""));
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.toggle("hidden", !(e || vorhanden));
  dlgEintrag.showModal();
}
function ereignisOeffnen(id){
  const o = sonder.find(x => x.id === id); if(!o) return;
  bearbeiteId = null; noteId = null; ereignisId = id; bilder = [];
  ereignisArt = o.art || "ereignis";
  $("#dlgEintragTitel").textContent = "Ereignis ändern";
  eTyp.value = "E"; eDatum.value = o.datum;
  eText.value = o.titel; eNotiz.value = o.notiz || ""; eOrt.value = o.raum || "";
  stundenAuswahlFuellen(o.slot);
  fachAuswahlFuellen("");
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.remove("hidden");
  dlgEintrag.showModal();
}
function noteOeffnen(n){
  if(!n) return eintragOeffnen(null, new Date(), "G", "");
  bearbeiteId = null; ereignisId = null; noteId = n.id; bilder = [];
  $("#dlgEintragTitel").textContent = "Note ändern";
  eTyp.value = "G"; eDatum.value = n.datum;
  eText.value = n.titel || ""; eNotiz.value = n.notiz || "";
  eWert.value = String(n.wert).replace(".", ","); eNArt.value = n.art;
  fachAuswahlFuellen(n.fach);
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.remove("hidden");
  dlgEintrag.showModal();
}
$("#btnEintrag").onclick = () => eintragOeffnen(null, ansicht === "kalender" ? kalTag : gewaehlt);
$("#bEintragAb").onclick = () => dlgEintrag.close();

$("#bEintragSpeichern").onclick = () => {
  const datum = eDatum.value || iso(new Date());
  const fach = aktuellesFach();
  const t = eTyp.value;

  if(t === "E"){
    const titel = eText.value.trim();
    const slot = eStunde.value === "" ? null : +eStunde.value;
    if(ereignisId) sonder = sonder.filter(x => x.id !== ereignisId);
    else if(slot !== null) sonder = sonder.filter(x => !(x.datum === datum && x.slot === slot));
    if(titel) sonder.push({id:neueId(), datum, slot, art:ereignisArt, titel,
                           raum:eOrt.value.trim(), notiz:eNotiz.value.trim(), geloescht:false});
    sichern(); dlgEintrag.close(); zeichne(); return;
  }
  if(t === "G"){
    const wert = parseFloat(String(eWert.value).replace(",", "."));
    const grenze = cfg.notenSystem === "punkte15" ? [0,15] : [1,6];
    if(isNaN(wert) || wert < grenze[0] || wert > grenze[1])
      return alert(`Bitte einen Wert zwischen ${grenze[0]} und ${grenze[1]} eingeben.`);
    if(!fach) return alert("Bitte ein Fach wählen.");
    const nd = {fach, art:eNArt.value, wert, datum, titel:eText.value.trim(), notiz:eNotiz.value.trim()};
    const alteNote = noteId && noten.find(x => x.id === noteId);
    if(alteNote) Object.assign(alteNote, nd);
    else noten.push(Object.assign({id:neueId(), geloescht:false}, nd));
    sichern(); dlgEintrag.close(); zeichne(); return;
  }
  if(!fach && t === "M") return alert("Bitte ein Fach wählen.");
  const jetzt = new Date();
  const daten = {typ:t, fach: t === "F" ? "" : fach, datum,
    titel: t === "F" ? eFehlArt.value : eText.value.trim(),
    notiz: eNotiz.value.trim()};
  if(t === "F") daten.stunden = Math.max(1, Number(eFehlStd.value) || 1);
  if(t === "M"){
    daten.bilder = bilder.slice();
    daten.zeit = `${zwei(jetzt.getHours())}:${zwei(jetzt.getMinutes())}`;
    if(!daten.titel) daten.titel = "Merkblatt vom " + zeigDatum(datum);
  }
  const alter = bearbeiteId && eintraege.find(x => x.id === bearbeiteId);
  if(alter) Object.assign(alter, daten);
  else eintraege.push(Object.assign({id:neueId(), erledigt:false, geloescht:false}, daten));
  sichern(); dlgEintrag.close(); zeichne();
};
$("#bEintragWeg").onclick = () => {
  const ziel = ereignisId ? sonder.find(x => x.id === ereignisId)
             : noteId     ? noten.find(x => x.id === noteId)
             :              eintraege.find(x => x.id === bearbeiteId);
  if(ziel) insArchiv(ziel);
  sichern(); dlgEintrag.close(); zeichne();
};

/* --- Merkblatt ansehen --- */
let schauId = null;
function schauOeffnen(id){
  const e = eintraege.find(x => x.id === id); if(!e) return;
  schauId = id;
  $("#schauTitel").textContent = e.titel || "Merkblatt";
  $("#schauStand").textContent = `${fachName(e.fach)} · ${zeigDatum(e.datum)}${e.zeit ? " · "+e.zeit : ""}`;
  $("#schauText").textContent = e.notiz || "";
  $("#schauBilder").innerHTML = (e.bilder||[]).map(b => `<img src="${esc(b)}" alt="">`).join("");
  dlgSchau.showModal();
}
$("#bSchauAb").onclick = () => dlgSchau.close();
$("#bSchauBearbeiten").onclick = () => {
  dlgSchau.close(); eintragOeffnen(eintraege.find(x => x.id === schauId));
};

/* --- Listenklicks --- */
function listenKlick(e){
  const hak = e.target.closest("[data-hak]");
  if(hak){
    const it = eintraege.find(x => x.id === hak.dataset.hak);
    if(!it){ zeichne(); return; }              // in einem anderen Tab entfernt
    it.erledigt = hak.checked; it.erledigtAm = hak.checked ? iso(new Date()) : null;
    sichern(); zeichne(); return;
  }
  const schau = e.target.closest("[data-schau]");
  if(schau){ schauOeffnen(schau.dataset.schau); return; }
  const ereignis = e.target.closest("[data-ereignis]");
  if(ereignis){ ereignisOeffnen(ereignis.dataset.ereignis); return; }
  const anteil = e.target.closest("[data-anteil]");
  if(anteil){ anteilOeffnen(anteil.dataset.anteil); return; }
  const note = e.target.closest("[data-note]");
  if(note){ noteOeffnen(noten.find(n => n.id === note.dataset.note)); return; }
  const bea = e.target.closest("[data-bearbeite]");
  if(bea) eintragOeffnen(eintraege.find(x => x.id === bea.dataset.bearbeite));
}
["#tagListe","#kalListe","#einListe","#suchListe"].forEach(s => $(s).onclick = listenKlick);
$("#einListe").addEventListener("click", e => {
  const zurueck = e.target.closest("[data-zurueck]");
  if(zurueck){
    const [art,id] = zurueck.dataset.zurueck.split(":");
    const it = archivFinden(art,id);
    if(it){ ausArchiv(it); if(art === "eintrag"){ it.erledigt = false; it.erledigtAm = null; } }
    sichern(); zeichne(); return;
  }
  const weg = e.target.closest("[data-endgueltig]");
  if(weg && confirm("Endgültig löschen? Das lässt sich nicht rückgängig machen.")){
    const [art,id] = weg.dataset.endgueltig.split(":");
    if(art === "eintrag") eintraege = eintraege.filter(x => x.id !== id);
    else if(art === "ereignis") sonder = sonder.filter(x => x.id !== id);
    else noten = noten.filter(x => x.id !== id);
    sichern(); zeichne();
  }
});
$("#btnSort").onclick = () => {
  sortModus = !sortModus;
  $("#btnSort").setAttribute("aria-pressed", sortModus);
  $("#sortHinweis").classList.toggle("hidden", !sortModus);
  zeichne();
};
$("#einMenu").onclick = e => {
  const h = e.target.closest("[data-khoch]"), r = e.target.closest("[data-krunter]");
  if(h || r){
    const liste = reiheEin();
    const i = +( h ? h.dataset.khoch : r.dataset.krunter), j = i + (h ? -1 : 1);
    if(j >= 0 && j < liste.length){
      [liste[i], liste[j]] = [liste[j], liste[i]];
      cfg.reiheEin = liste; sichern(); zeichne();
    }
    return;
  }
  if(sortModus) return;
  const b = e.target.closest("[data-sub]"); if(!b) return;
  einSub = b.dataset.sub; zeichne();
};
$("#zeuListe").onclick = e => {
  const b = e.target.closest("[data-zeufach]"); if(!b) return;
  anteilOeffnen(b.dataset.zeufach);
};

/* --- Suche --- */
$("#suchFeld").oninput = suchen;
function suchen(){
  const q = ($("#suchFeld").value || "").trim().toLowerCase();
  const ul = $("#suchListe");
  $("#einKacheln").classList.toggle("hidden", q.length > 0);
  if(!q){ ul.innerHTML = ""; return; }
  /* Kürzel und ausgeschriebener Name gelten als dasselbe: Wer „Chemie" sucht,
     findet auch Einträge, die nur „CH" tragen — sofern es in den Einstellungen steht. */
  const suchtext = o => [o.fach, fachName(o.fach), lehrerName(o.fach), o.titel, o.notiz, o.raum]
    .filter(Boolean).join(" ").toLowerCase();
  const treffer = [
    ...aktiv().filter(e => suchtext(e).includes(q)),
    ...notenAktiv().filter(n => suchtext(n).includes(q))
      .map(n => ({id:n.id, typ:"G", fach:n.fach, titel:`${notenText(n.wert)} ${n.titel||""}`, datum:n.datum, note:true})),
    ...sonderAktiv().filter(o => suchtext(o).includes(q))
      .map(o => ({id:o.id, typ:"E", fach:"", titel:o.titel, datum:o.datum, ereignis:true}))
  ].sort((a,b) => b.datum.localeCompare(a.datum)).slice(0, 40);
  ul.innerHTML = treffer.map(e => `<li>
    <span style="width:18px;flex:none"></span>
    <div class="wachs" ${e.note ? `data-note="${e.id}"` : e.ereignis ? `data-ereignis="${e.id}"`
       : e.typ === "M" ? `data-schau="${e.id}"` : `data-bearbeite="${e.id}"`}>
      <div class="kopf"><span class="khn">${e.typ}</span>
        <span class="titel">${e.fach ? esc(e.fach)+" — " : ""}${esc(e.titel) || ART[e.typ] || ""}</span></div>
      <div class="wann">${zeigDatum(e.datum)}</div></div></li>`).join("")
    || `<li><div class="wachs"><span class="titel" style="color:var(--muted)">Nichts gefunden.</span></div></li>`;
}

/* --- Verhältnis und Zielnote --- */
let anteilFach = null;
function anteilOeffnen(fach){
  anteilFach = fach;
  $("#anTitel").textContent = fachName(fach);
  anWert.value = anteilFuer(fach);
  anZiel.value = ""; $("#anZielErgebnis").textContent = "";
  anteilVorschau();
  dlgAnteil.showModal();
}
function anteilVorschau(){
  const m = Math.max(0, Math.min(100, Number(anWert.value) || 0));
  $("#anHinweis").textContent = `${m} % mündlich, ${100-m} % schriftlich.`
    + (hatEigenenAnteil(anteilFach) ? "" : " Zurzeit gilt der Standard.");
}
anWert.oninput = anteilVorschau;
function zielRechnen(){
  const ziel = parseFloat(String(anZiel.value).replace(",", "."));
  const feld = $("#anZielErgebnis");
  if(isNaN(ziel)){ feld.textContent = ""; return; }
  const art = anZielArt.value;
  const eigene = notenAktiv().filter(n => n.fach === anteilFach);
  const derArt = eigene.filter(n => n.art === art);
  const andere = eigene.filter(n => n.art !== art);
  const mittel = l => l.length ? l.reduce((s,n) => s+n.wert, 0)/l.length : null;
  const aM = anteilFuer(anteilFach)/100;
  const gew = art === "m" ? aM : 1-aM;
  const andMittel = mittel(andere);
  const n = derArt.length;
  /* gesucht: x, sodass ((Summe+x)/(n+1))*gew + andMittel*(1-gew) = ziel */
  let noetig;
  if(andMittel === null){ noetig = (ziel*(n+1)) - derArt.reduce((s,v) => s+v.wert, 0); }
  else {
    const rest = (ziel - andMittel*(1-gew)) / gew;
    noetig = rest*(n+1) - derArt.reduce((s,v) => s+v.wert, 0);
  }
  const grenze = cfg.notenSystem === "punkte15" ? [0,15] : [1,6];
  const machbar = noetig >= grenze[0] && noetig <= grenze[1];
  feld.textContent = machbar
    ? `Die nächste ${art === "m" ? "mündliche" : "schriftliche"} Note müsste ${notenText(noetig)} sein.`
    : `Mit einer einzelnen Note nicht erreichbar (rechnerisch ${notenText(noetig)}).`;
}
anZiel.oninput = zielRechnen; anZielArt.onchange = zielRechnen;
$("#bAnStandard").onclick = () => {
  if(cfg.anteile) delete cfg.anteile[anteilFach];
  sichern(); dlgAnteil.close(); zeichne();
};
$("#bAnSpeichern").onclick = () => {
  if(!cfg.anteile) cfg.anteile = {};
  cfg.anteile[anteilFach] = Math.max(0, Math.min(100, Number(anWert.value) || 0));
  sichern(); dlgAnteil.close(); zeichne();
};

/* =====================================================================
   Plan einfügen
   ===================================================================== */
function parseZelle(t){
  /* Erwartet FACH, RAUM (LEHRKRAFT). Eckige Klammern enthalten oft die Klasse. */
  const m = t.trim().match(/^(.+?),\s*(.+?)\s*([([])(.+?)[)\]]$/);
  if(!m) return null;
  const [, fach, raum, klammer, rest] = m;
  return {fach:fach.trim(), raum:raum.trim(),
          lk: klammer === "(" ? rest.trim() : "", klasse: klammer === "[" ? rest.trim() : ""};
}
function textLesen(text){
  const zeilen = text.split("\n").map(z => z.trim()).filter(z => z && z !== "-");
  const proStunde = {}; let std = null;
  for(const z of zeilen){
    const kopf = z.match(/^([0-9]{1,2})\s*(.*)$/);
    if(kopf && (kopf[2] === "" || parseZelle(kopf[2]))){
      std = kopf[1]; if(kopf[2]) proStunde[std] = parseZelle(kopf[2]); continue;
    }
    const zelle = parseZelle(z);
    if(zelle && std) proStunde[std] = zelle;
  }
  return proStunde;
}
function importTabelle(werte){
  $("#iTabelle").innerHTML = cfg.slots.map((sl,i) => {
    const v = werte[i] || {};
    return `<div class="izeile" data-zeile="${i}">
      <div class="std">${stdText(sl)}</div>
      <input type="text" data-f="fach" value="${esc(v.fach||"")}" placeholder="Fach" autocapitalize="characters">
      <input type="text" data-f="raum" value="${esc(v.raum||"")}" placeholder="Raum" autocapitalize="characters">
      <input type="text" data-f="lk" value="${esc(v.lk||"")}" placeholder="LK" autocapitalize="characters">
    </div>`;
  }).join("");
}
const importAuslesen = () => [...document.querySelectorAll("#iTabelle .izeile")].map(z => ({
  fach:z.querySelector('[data-f=fach]').value.trim(),
  raum:z.querySelector('[data-f=raum]').value.trim(),
  lk:z.querySelector('[data-f=lk]').value.trim()
}));
const importLaden = () => importTabelle((plan[cfg.zweiWochen ? iWoche.value : "A"][TAGE[+iTag.value]] || []).map(x => x || {}));
let zurueckZuEinst = false;
function importOeffnen(){
  iTag.innerHTML = TAGE.map((t,i) =>
    `<option value="${i}" ${i === Math.min(tagIndex(gewaehlt),4) ? "selected" : ""}>${LANG[t]}</option>`).join("");
  iWoche.value = wocheFuer(gewaehlt);
  $("#iWocheWrap").classList.toggle("hidden", !cfg.zweiWochen);
  iText.value = ""; $("#iErgebnis").textContent = "";
  importLaden(); dlgImport.showModal();
}
iTag.onchange = importLaden; iWoche.onchange = importLaden;
$("#bImportText").onclick = () => {
  const proStunde = textLesen(iText.value);
  const werte = cfg.slots.map(sl => {
    const z = sl.std.split(",").map(x => proStunde[x.trim()]).find(Boolean);
    return z ? {fach:z.fach, raum:z.raum, lk:z.lk || z.klasse} : {};
  });
  const treffer = werte.filter(w => w.fach).length;
  if(treffer){ importTabelle(werte); $("#iErgebnis").textContent = `${treffer} Zeilen übernommen. Prüfen und speichern.`; }
  else $("#iErgebnis").textContent = "Nichts erkannt. Die Stundennummern müssen mitkopiert sein.";
};
$("#bImportAb").onclick = () => { dlgImport.close(); if(zurueckZuEinst){ zurueckZuEinst = false; einstellungenOeffnen(); } };
$("#bImportSpeichern").onclick = () => {
  const woche = cfg.zweiWochen ? iWoche.value : "A", tag = TAGE[+iTag.value];
  importAuslesen().forEach((w,i) => {
    plan[woche][tag][i] = w.fach ? {fach:w.fach.toUpperCase(), raum:w.raum, lk:w.lk} : null; });
  sichern(); dlgImport.close();
  if(zurueckZuEinst){ zurueckZuEinst = false; zeichne(); einstellungenOeffnen(); return; }
  ansicht = "tag"; gewaehlt = plusTage(montagVon(gewaehlt), +iTag.value); zeichne();
};

/* =====================================================================
   Profile
   ===================================================================== */
function profilKnopf(){
  const el = $("#btnProfil"); if(!el) return;
  el.textContent = (profilName().trim()[0] || "P").toUpperCase();
  el.setAttribute("aria-label", "Profil: " + profilName());
}
let profilVerwalten = false, profilManuell = false;
function zeichneProfilAuswahl(){
  $("#pFrage").textContent = profilVerwalten ? "Profile verwalten" : "Wer bist du?";
  $("#pVerwalten").textContent = profilVerwalten ? "Fertig" : "Verwalten";
  $("#pZurueck").classList.toggle("hidden", !profilManuell || profilVerwalten);
  const kacheln = profile.map((x,i) => `<div>
    <button type="button" class="kachel" data-wechsel="${x.id}" aria-current="${x.id === profilId}">
      <div class="feld"><span>${esc((x.name.trim()[0]||"P").toUpperCase())}</span></div>
      <div class="kname">${esc(x.name)}</div>
      <div class="knum">Profil ${String(i+1).padStart(2,"0")}</div></button>
    ${profilVerwalten ? `<div class="kwerkzeug">
      <button type="button" data-umbenennen="${x.id}">Name</button>
      ${profile.length > 1 ? `<button type="button" class="loesch" data-profilweg="${x.id}">×</button>` : ""}
    </div>` : ""}</div>`).join("");
  const neu = profilVerwalten ? `<div><button type="button" class="kachel neu" id="kachelNeu">
      <div class="feld"><span>+</span></div><div class="kname">Neues Profil</div>
      <div class="knum">Anlegen</div></button></div>` : "";
  $("#pGitter").innerHTML = kacheln + neu;
}
function profilAuswahlZeigen(manuell){
  profilManuell = !!manuell; profilVerwalten = false;
  zeichneProfilAuswahl();
  $("#profilStart").classList.remove("hidden");
}
const profilAuswahlSchliessen = () => { $("#profilStart").classList.add("hidden"); profilVerwalten = false; };
$("#btnProfil").onclick = () => profilAuswahlZeigen(true);
$("#pZurueck").onclick = profilAuswahlSchliessen;
$("#pVerwalten").onclick = () => { profilVerwalten = !profilVerwalten; zeichneProfilAuswahl(); };
$("#pGitter").onclick = e => {
  if(e.target.closest("#kachelNeu")){
    const name = prompt("Name des neuen Profils", "Profil " + (profile.length+1));
    if(!name || !name.trim()) return;
    const id = neueId();
    profile.push({id, name:name.trim()}); profilId = id; profileSichern();
    zustandLaden(); normalisiere(); sichern();
    profilVerwalten = false; profilKnopf(); ansicht = "tag";
    profilAuswahlSchliessen(); zeichne(); return;
  }
  const u = e.target.closest("[data-umbenennen]");
  if(u){
    const x = profile.find(y => y.id === u.dataset.umbenennen);
    const name = prompt("Neuer Name", x.name);
    if(name && name.trim()){ x.name = name.trim(); profileSichern(); zeichneProfilAuswahl(); profilKnopf(); }
    return;
  }
  const d = e.target.closest("[data-profilweg]");
  if(d){
    const x = profile.find(y => y.id === d.dataset.profilweg);
    if(!confirm(`Profil \u201e${x.name}\u201c mit allen Daten löschen? Das lässt sich nicht rückgängig machen.`)) return;
    profilSchluessel(x.id).forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    profile = profile.filter(y => y.id !== x.id);
    if(profilId === x.id){ profilId = profile[0].id; zustandLaden(); normalisiere(); }
    profileSichern(); profilKnopf(); zeichneProfilAuswahl(); zeichne(); return;
  }
  const w = e.target.closest("[data-wechsel]");
  if(w && !profilVerwalten){
    profilId = w.dataset.wechsel; profileSichern();
    zustandLaden(); normalisiere(); profilKnopf();
    ansicht = "tag"; einSub = null; gewaehlt = new Date();
    profilAuswahlSchliessen(); zeichne();
  }
};

/* =====================================================================
   Ferien, Erinnerungen, Kalender-Export
   ===================================================================== */
async function ferienLaden(land){
  const j = new Date().getFullYear();
  const url = a => `https://openholidaysapi.org/${a}?countryIsoCode=DE&subdivisionCode=${land}`
    + `&languageIsoCode=DE&validFrom=${j}-01-01&validTo=${j+1}-12-31`;
  /* Ohne Abbruch bliebe „Wird geladen …" bei einem hängenden Dienst für
     immer stehen. Fremde Antworten werden zudem nicht blind ausgepackt. */
  const hole = async (a,typ) => {
    const stopp = new AbortController();
    const uhr = setTimeout(() => stopp.abort(), 15000);
    let r;
    try{ r = await fetch(url(a), {headers:{accept:"application/json"}, signal:stopp.signal}); }
    finally{ clearTimeout(uhr); }
    if(!r.ok) throw new Error(a + ": " + r.status);
    const liste = await r.json();
    if(!Array.isArray(liste)) throw new Error(a + ": unerwartete Antwort");
    return liste.map(x => {
      const namen = Array.isArray(x && x.name) ? x.name : [];
      const treffer = namen.find(nm => nm && nm.language === "DE") || namen[0];
      return {von:x && x.startDate, bis:x && x.endDate, typ,
              name:(treffer && treffer.text) || "Ferien"};
    }).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.von || ""));
  };
  const [feier, schul] = await Promise.all([hole("PublicHolidays","feiertag"), hole("SchoolHolidays","ferien")]);
  return [...feier, ...schul].sort((a,b) => a.von.localeCompare(b.von));
}
$("#sFerienLaden").onclick = async () => {
  const land = sLand.value;
  if(!land){ $("#sFerienStand").textContent = "Bitte zuerst ein Bundesland wählen."; return; }
  $("#sFerienStand").textContent = "Wird geladen …";
  try{
    const eigene = ferien.filter(f => f.typ === "eigen");   // selbst eingetragene behalten
    ferien = [...await ferienLaden(land), ...eigene].sort((a,b) => a.von.localeCompare(b.von));
    cfg.land = land; sichern(); ferienStand(); zeichne();
  }catch(err){
    $("#sFerienStand").textContent = (err && err.name === "AbortError")
      ? "Der Dienst antwortet nicht. Später noch einmal versuchen."
      : "Laden fehlgeschlagen. Internet prüfen.";
  }
};
$("#sFerienWeg").onclick = () => {
  ferien = ferien.filter(f => f.typ === "eigen");
  sichern(); ferienStand(); zeichne();
};
function ferienStand(){
  const eigene = ferien.filter(f => f.typ === "eigen").length;
  $("#sFerienStand").textContent = (eigene ? `${zahl(eigene,"eigener Tag","eigene Tage")} · ` : "")
    + (ferien.length
    ? `${ferien.length} Einträge gespeichert, bis ${zeigDatum(ferien.at(-1).bis)}.`
    : "Noch nichts geladen.");
}

/* Benachrichtigungen: nur beim Öffnen, denn eine Web-App kann sich nicht
   selbst wecken. Für echte Wecker gibt es den Kalender-Export. */
function meldeStand(){
  const s = ("Notification" in window) ? Notification.permission : "nicht verfügbar";
  $("#sMeldeStand").textContent = "Berechtigung: " +
    ({granted:"erteilt", denied:"abgelehnt", default:"noch nicht gefragt"}[s] || s);
}
$("#sMeldeRecht").onclick = async () => {
  if(!("Notification" in window)) return meldeStand();
  try{ await Notification.requestPermission(); }catch(e){}
  meldeStand();
};
/* Chrome auf Android verbietet new Notification() und verlangt den Umweg
   über den Service Worker. Der Rückgabewert sagt, ob wirklich etwas erschien —
   nur dann darf der Tag als gemeldet gelten. */
async function melden(titel, text){
  try{
    if(!("Notification" in window) || Notification.permission !== "granted") return false;
    if("serviceWorker" in navigator){
      const reg = await mitZeitgrenze(navigator.serviceWorker.ready, 3000);
      if(reg && reg.showNotification){
        await reg.showNotification(titel, {body:text, icon:"icon-192.png",
          badge:"icon-192.png", tag:"stundenplan", lang:"de"});
        return true;
      }
    }
    new Notification(titel, {body:text, icon:"icon-192.png", badge:"icon-192.png"});
    return true;
  }catch(e){ return false; }
}
/* Die Tagesmerker sammeln sich sonst Jahr für Jahr an und zählen beim
   Speicherstand mit. Nur der von heute wird gebraucht. */
function meldemerkerAufraeumen(){
  const heute = "_gemeldet_" + iso(new Date());
  profilSchluessel(profilId)
    .filter(k => k.includes("_gemeldet_") && !k.endsWith(heute))
    .forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
}
async function erinnerungenPruefen(){
  if(!cfg.melden) return;
  const heute = new Date(), key = "gemeldet_" + iso(heute);
  if(Speicher.lies(key, false)) return;
  const inTagen = n => iso(plusTage(heute, n));
  const bisEndeWoche = aktiv().filter(e => !e.erledigt && (e.typ === "K" || e.typ === "H")
    && e.datum >= iso(heute) && e.datum <= inTagen(7));
  const morgen = bisEndeWoche.filter(e => e.datum === inTagen(1));
  const klausuren = bisEndeWoche.filter(e => e.typ === "K");
  let text = "";
  if(morgen.length) text = "Morgen: " + morgen.map(e => (e.fach||"")+" "+(e.titel||ART[e.typ])).join(", ");
  else if(heute.getDay() === 0 && bisEndeWoche.length)
    text = `Diese Woche: ${zahl(klausuren.length,"Klausur","Klausuren")}, `
         + `${zahl(bisEndeWoche.length-klausuren.length,"Hausaufgabe","Hausaufgaben")}`;
  else if(klausuren.length && klausuren[0].datum <= inTagen(3))
    text = `Klausur am ${zeigDatum(klausuren[0].datum)}: ${klausuren[0].fach||""}`;
  if(text && await melden("Stundenplan", text)) Speicher.schreib(key, true);
}

/* ICS-Export: damit übernimmt der Systemkalender das Erinnern. */
const icsTag  = datum => datum.replace(/-/g,"");
const icsFolgetag = datum => icsTag(iso(plusTage(new Date(datum+"T12:00"), 1)));
/* Ohne VTIMEZONE gilt eine Zeit ohne Z als „schwebend" und wird in der
   Zeitzone des Kalenders gelesen — für einen Stundenplan genau richtig. */
const icsZeit = (datum, uhr) => icsTag(datum) + "T" + uhr.replace(":","") + "00";
/* RFC 5545: höchstens 75 Oktette je Zeile, Fortsetzung mit führendem
   Leerzeichen. Ohne das brechen strenge Kalender an langen Notizen ab. */
function icsFalten(zeile){
  const teile = []; let akt = "", grenze = 75;
  for(const zeichen of zeile){
    if(oktette(akt + zeichen) > grenze){ teile.push(akt); akt = ""; grenze = 74; }
    akt += zeichen;
  }
  teile.push(akt);
  return teile.map((t,i) => i ? " " + t : t);
}
function icsBauen(){
  const roh = t => String(t == null ? "" : t).replace(/[\\;,]/g, m => "\\"+m).replace(/\r?\n/g, "\\n");
  const stempel = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const zeilen = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Stundenplan//DE","CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", `X-WR-CALNAME:${roh("Stundenplan " + (cfg.klasse || profilName()))}`];
  const termin = (id, start, ende, ganztags, titel, notiz, alarm) => {
    zeilen.push("BEGIN:VEVENT", `UID:${id}@stundenplan`, `DTSTAMP:${stempel}`,
      ganztags ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
      ganztags ? `DTEND;VALUE=DATE:${ende}`    : `DTEND:${ende}`,
      `SUMMARY:${roh(titel)}`);
    if(notiz) zeilen.push(`DESCRIPTION:${roh(notiz)}`);
    if(alarm) zeilen.push("BEGIN:VALARM", `TRIGGER:-${alarm}`, "ACTION:DISPLAY",
      `DESCRIPTION:${roh(titel)}`, "END:VALARM");
    zeilen.push("END:VEVENT");
  };
  aktiv().filter(e => (e.typ === "K" || e.typ === "H") && !e.erledigt).forEach(e =>
    /* DTEND ist nach RFC 5545 ausschließend — ein Ganztagstermin endet am
       Folgetag, sonst verschlucken manche Kalender ihn. */
    termin(e.id, icsTag(e.datum), icsFolgetag(e.datum), true,
      (e.typ === "K" ? "Klausur " : "HA ") + (e.fach||"") + " " + (e.titel||""),
      e.notiz, "PT15H"));
  sonderAktiv().filter(o => o.art !== "ausfall" && o.datum >= iso(plusTage(new Date(),-1)))
    .forEach(o => {
      const s = o.slot !== null && cfg.slots[o.slot];
      if(s) termin(o.id, icsZeit(o.datum, s.von), icsZeit(o.datum, s.bis), false,
        o.titel + (o.raum ? " · " + o.raum : ""), o.notiz, "PT30M");
      else  termin(o.id, icsTag(o.datum), icsFolgetag(o.datum), true,
        o.titel + (o.raum ? " · " + o.raum : ""), o.notiz, "PT15H");
    });
  zeilen.push("END:VCALENDAR");
  return zeilen.filter(Boolean).flatMap(icsFalten).join("\r\n") + "\r\n";
}
function herunterladen(text, name, typ){
  const url = URL.createObjectURL(new Blob([text], {type:typ}));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#sIcs").onclick = () => herunterladen(icsBauen(), `stundenplan-termine-${iso(new Date())}.ics`, "text/calendar");

/* =====================================================================
   Sicherungen prüfen
   Eine eingelesene Datei kann von überall herkommen — das README rät sogar
   ausdrücklich, sie sich selbst zu schicken. Übernommen wird deshalb nur,
   was bekannt ist, und nur in der erwarteten Form. Sonst landet fremder
   Inhalt ungeprüft im HTML dieser Seite.
   ===================================================================== */
const alsText    = (v, max = 200) => typeof v === "string" ? v.slice(0, max) : "";
const alsZahl    = (v, min, max, standard) => {
  const z = Number(v);
  return Number.isFinite(z) ? Math.max(min, Math.min(max, z)) : standard;
};
const alsDatum   = v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
const alsUhrzeit = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : "";
const alsKuerzel = v => alsText(v, 20).trim().toUpperCase();
const alsId      = v => /^[A-Za-z0-9_-]{1,40}$/.test(String(v)) ? String(v) : neueId();
/* Bilder dürfen nur eingebettete Bilddaten sein — ein beliebiger Text stünde
   sonst in einem src-Attribut und könnte daraus ausbrechen. */
const alsBild = v => (typeof v === "string" && v.length < 4e6
  && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) ? v : null;

function paareSaeubern(o){
  const raus = {};
  if(o && typeof o === "object" && !Array.isArray(o))
    Object.entries(o).slice(0, 400).forEach(([k,v]) => {
      const s = alsKuerzel(k); if(s) raus[s] = alsText(v, 60);
    });
  return raus;
}
/* „Std." benennt Stundennummern. Mehr als Ziffern, Komma und Schrägstrich
   braucht das Feld nicht — und mehr darf auch nicht hinein. */
function slotsSaeubern(l){
  const raus = (Array.isArray(l) ? l : []).slice(0, 24).map(s => ({
    std: alsText(s && s.std, 20).replace(/[^0-9,\/ ]/g, "").trim(),
    von: alsUhrzeit(s && s.von), bis: alsUhrzeit(s && s.bis)
  })).filter(s => s.std && s.von && s.bis);
  return raus.length ? raus : STANDARD.slots.slice();
}
function cfgSaeubern(roh){
  const c = Object.assign({}, STANDARD, (roh && typeof roh === "object") ? roh : {});
  c.klasse      = alsText(c.klasse, 40);
  c.slots       = slotsSaeubern(c.slots);
  c.zweiWochen  = !!c.zweiWochen;
  c.land        = LAENDER[c.land] ? c.land : "";
  c.notenSystem = c.notenSystem === "punkte15" ? "punkte15" : "note6";
  c.anteilM     = alsZahl(c.anteilM, 0, 100, 50);
  c.anteile     = {};
  if(roh && roh.anteile && typeof roh.anteile === "object")
    Object.entries(roh.anteile).slice(0, 400).forEach(([k,v]) => {
      const f = alsKuerzel(k); if(f) c.anteile[f] = alsZahl(v, 0, 100, 50);
    });
  c.lehrer     = paareSaeubern(c.lehrer);
  c.fachnamen  = paareSaeubern(c.fachnamen);
  c.akzent     = /^#[0-9a-fA-F]{6}$/.test(String(c.akzent)) ? String(c.akzent) : STANDARD.akzent;
  c.modus      = c.modus === "hell" ? "hell" : "dunkel";
  c.schrift    = ["mono","serif"].includes(c.schrift) ? c.schrift : "system";
  c.melden     = !!c.melden;
  c.letzteSicherung = alsDatum(c.letzteSicherung) || null;
  c.sicherTage  = alsZahl(c.sicherTage, 0, 365, 28);
  c.sicherAuto  = !!c.sicherAuto;
  c.sicherHalten = alsZahl(c.sicherHalten, 0, 60, 3);
  c.archivTage = alsZahl(c.archivTage, 0, 3650, 0);
  c.startProfil = ["immer","mehrere","nie"].includes(c.startProfil) ? c.startProfil : "immer";
  c.fassung = alsZahl(c.fassung, 0, 999, 0);
  c.stdProTag  = alsZahl(c.stdProTag, 1, 16, 8);
  c.reiheEin   = Array.isArray(c.reiheEin)
    ? c.reiheEin.filter(x => REIHE_STANDARD.includes(x)) : null;
  c.reiheFach  = Array.isArray(c.reiheFach)
    ? c.reiheFach.map(alsKuerzel).filter(Boolean).slice(0, 200) : null;
  return c;
}
const zelleSaeubern = z => (z && typeof z === "object" && alsKuerzel(z.fach))
  ? {fach:alsKuerzel(z.fach), raum:alsText(z.raum, 20), lk:alsText(z.lk, 20)} : null;
function planSaeubern(roh){
  const raus = {};
  ["A","B"].forEach(w => {
    raus[w] = {};
    TAGE.forEach(t => {
      const l = (roh && roh[w] && Array.isArray(roh[w][t])) ? roh[w][t] : [];
      raus[w][t] = l.slice(0, 24).map(zelleSaeubern);
    });
  });
  return raus;
}
function eintragSaeubern(e){
  if(!e || typeof e !== "object" || !ART[e.typ]) return null;
  const raus = {
    id:     alsId(e.id),
    typ:    e.typ,
    fach:   e.typ === "F" ? "" : alsKuerzel(e.fach),
    datum:  alsDatum(e.datum) || iso(new Date()),
    titel:  alsText(e.titel, 200),
    notiz:  alsText(e.notiz, 20000),
    erledigt:   !!e.erledigt,
    erledigtAm: alsDatum(e.erledigtAm) || null,
    geloescht:  !!e.geloescht,
    geloeschtAm: alsDatum(e.geloeschtAm) || null
  };
  if(e.typ === "M"){
    raus.bilder = (Array.isArray(e.bilder) ? e.bilder : []).map(alsBild).filter(Boolean).slice(0, 30);
    raus.zeit   = alsUhrzeit(e.zeit) || "";
  }
  if(e.typ === "F"){
    raus.stunden = alsZahl(e.stunden, 1, 20, 1);
    if(!FEHLARTEN.includes(raus.titel)) raus.titel = FEHLARTEN[0];
  }
  return raus;
}
function freiSaeubern(f){
  if(!f || typeof f !== "object") return null;
  const von = alsDatum(f.von); if(!von) return null;
  const bis = alsDatum(f.bis) || von;
  return {von, bis: bis >= von ? bis : von, name: alsText(f.name, 80) || "Frei",
          typ: ["ferien","feiertag","eigen"].includes(f.typ) ? f.typ : "eigen"};
}
function sonderSaeubern(o){
  if(!o || typeof o !== "object") return null;
  const datum = alsDatum(o.datum); if(!datum) return null;
  return {id:alsId(o.id), datum,
          slot: (o.slot === null || o.slot === undefined) ? null : alsZahl(o.slot, 0, 23, null),
          art:  EREIGNISARTEN.includes(o.art) ? o.art : "ereignis",
          titel:alsText(o.titel, 200) || "Ereignis",
          raum: alsText(o.raum, 40), notiz: alsText(o.notiz, 4000),
          geloescht: !!o.geloescht, geloeschtAm: alsDatum(o.geloeschtAm) || null};
}
function noteSaeubern(g){
  if(!g || typeof g !== "object") return null;
  const fach = alsKuerzel(g.fach); if(!fach) return null;
  const wert = Number(g.wert); if(!Number.isFinite(wert)) return null;
  return {id:alsId(g.id), fach, art: g.art === "m" ? "m" : "s",
          wert: Math.max(0, Math.min(15, wert)),
          datum: alsDatum(g.datum) || iso(new Date()),
          titel: alsText(g.titel, 200), notiz: alsText(g.notiz, 4000),
          geloescht: !!g.geloescht, geloeschtAm: alsDatum(g.geloeschtAm) || null};
}
/* Aus beliebigem JSON wird ein Datensatz — oder ein leeres Ergebnis. */
function paketSaeubern(d){
  const p = {};
  if(!d || typeof d !== "object") return p;
  if(d.cfg  && typeof d.cfg  === "object") p.cfg  = cfgSaeubern(d.cfg);
  if(d.plan && typeof d.plan === "object") p.plan = planSaeubern(d.plan);
  if(Array.isArray(d.eintraege)) p.eintraege = d.eintraege.slice(0,5000).map(eintragSaeubern).filter(Boolean);
  if(Array.isArray(d.ferien))    p.ferien    = d.ferien.slice(0,2000).map(freiSaeubern).filter(Boolean);
  if(Array.isArray(d.sonder))    p.sonder    = d.sonder.slice(0,5000).map(sonderSaeubern).filter(Boolean);
  if(Array.isArray(d.noten))     p.noten     = d.noten.slice(0,5000).map(noteSaeubern).filter(Boolean);
  return p;
}

/* =====================================================================
   Sicherungsordner
   Ein einmal gewählter Ordner bleibt gemerkt — der Griff darauf lebt in der
   IndexedDB, die Berechtigung im Browser. Das gibt es nur, wo die File
   System Access API vorhanden ist: auf dem Rechner in Chrome und Edge.
   Chrome auf Android und Safari kennen sie nicht; dort bleibt es beim
   gewöhnlichen Download, und die App sagt das auch.
   ===================================================================== */
const ordnerMoeglich = () => typeof window.showDirectoryPicker === "function" && window.isSecureContext;
const IDB_NAME = "stundenplan", IDB_LAGER = "griffe";
let ordner = null;                                   // Griff für diese Sitzung

function idbOeffnen(){
  return new Promise((fertig, weg) => {
    let a;
    try{ a = indexedDB.open(IDB_NAME, 1); }catch(e){ return weg(e); }
    a.onupgradeneeded = () => {
      if(!a.result.objectStoreNames.contains(IDB_LAGER)) a.result.createObjectStore(IDB_LAGER);
    };
    a.onsuccess = () => fertig(a.result);
    a.onerror   = () => weg(a.error);
  });
}
async function griffLegen(wert){
  const db = await idbOeffnen();
  return new Promise((fertig, weg) => {
    const lager = db.transaction(IDB_LAGER, "readwrite").objectStore(IDB_LAGER);
    const a = wert === null ? lager.delete("ordner") : lager.put(wert, "ordner");
    a.onsuccess = () => fertig(true);
    a.onerror   = () => weg(a.error);
  });
}
async function ordnerLaden(){
  if(!ordnerMoeglich()) return null;
  try{
    const db = await idbOeffnen();
    ordner = await new Promise(fertig => {
      const a = db.transaction(IDB_LAGER, "readonly").objectStore(IDB_LAGER).get("ordner");
      a.onsuccess = () => fertig(a.result || null);
      a.onerror   = () => fertig(null);
    });
  }catch(e){ ordner = null; }
  return ordner;
}
/* fragen=true nur aus einem Antippen heraus: ohne Geste lehnt der Browser
   die Nachfrage ab, und ein stiller Versuch beim Start soll nicht stören. */
async function ordnerBereit(fragen){
  if(!ordner) return false;
  try{
    const art = {mode:"readwrite"};
    if(await ordner.queryPermission(art) === "granted") return true;
    if(!fragen) return false;
    return await ordner.requestPermission(art) === "granted";
  }catch(e){ return false; }
}
const sicherungDateiname = () => {
  const alle = profile.length > 1;
  return `stundenplan-${alle ? "alle" : dateiName()}-${iso(new Date())}.json`;
};
const sicherungInhalt = () => profile.length > 1 ? sicherungAlleText() : sicherungsText();
/* Erkennt die eigenen Sicherungen am Namen. Alles andere im Ordner bleibt
   unangetastet — dort liegen womöglich fremde Dateien. */
const SICHERUNGSNAME = /^stundenplan-.+-(\d{4}-\d{2}-\d{2})\.json$/;
function haltegrenze(){
  const monate = Math.max(0, Number(cfg.sicherHalten) || 0);
  if(!monate) return null;
  const d = new Date(); d.setMonth(d.getMonth() - monate);
  return iso(d);
}
/** Namen der eigenen Sicherungen im Ordner, älteste zuerst. */
async function ordnerSicherungen(){
  const liste = [];
  if(!ordner) return liste;
  for await (const [name, griff] of ordner.entries()){
    if(griff.kind !== "file") continue;
    const m = name.match(SICHERUNGSNAME);
    if(m) liste.push({name, datum:m[1]});
  }
  return liste.sort((a,b) => a.datum.localeCompare(b.datum));
}
/** Löscht die eigenen Sicherungen, die älter sind als die Haltefrist. */
async function ordnerAufraeumen(){
  const grenze = haltegrenze();
  if(!grenze) return 0;
  let weg = 0;
  for(const s of await ordnerSicherungen())
    if(s.datum < grenze){ try{ await ordner.removeEntry(s.name); weg++; }catch(e){} }
  return weg;
}
/** Schreibt die Sicherung in den Ordner. null heißt: kein Ordner verfügbar. */
async function inOrdnerSichern(fragen){
  if(!await ordnerBereit(fragen)) return null;
  const name = sicherungDateiname();
  const datei = await ordner.getFileHandle(name, {create:true});
  const strom = await datei.createWritable();
  await strom.write(sicherungInhalt());
  await strom.close();
  const weg = await ordnerAufraeumen();
  sicherungNotiert();
  return {name, weg};
}
/** Erst den Ordner versuchen, sonst herunterladen. Immer eine echte Sicherung. */
async function jetztSichern(fragen){
  try{
    const fertig = await inOrdnerSichern(fragen);
    if(fertig){
      kurzHinweis(`Gesichert: ${fertig.name}`
        + (fertig.weg ? ` · ${zahl(fertig.weg,"alte Datei","alte Dateien")} entfernt` : ""));
      return true;
    }
  }catch(e){ zeigeFehler("Ordner: " + ((e && e.message) || e)); return false; }
  herunterladen(sicherungInhalt(), sicherungDateiname(), "application/json");
  sicherungNotiert();
  return true;
}
/* Beim Öffnen von selbst sichern. Ohne erteilte Berechtigung wird nicht
   gefragt — dann übernimmt das Banner, wo ein Antippen die Frage erlaubt. */
async function autoSicherung(){
  if(!cfg.sicherAuto || !sicherungFaellig()) return;
  await ordnerLaden();
  try{
    const fertig = await inOrdnerSichern(false);
    if(fertig) kurzHinweis(`Sicherung angelegt: ${fertig.name}`
      + (fertig.weg ? ` · ${zahl(fertig.weg,"alte Datei","alte Dateien")} entfernt` : ""));
  }catch(e){}
}

/* =====================================================================
   Anleitung
   Der Text steht als Datenstruktur, nicht als Markup: Inhaltsverzeichnis
   und Suche entstehen dadurch aus derselben Quelle und können nicht
   auseinanderlaufen. Der Inhalt ist Quelltext, keine Nutzereingabe — er
   darf deshalb Markup enthalten und geht nicht durch esc().
   ===================================================================== */
const HILFE = [
{id:"was", teil:"Erste Schritte", titel:"Was diese App ist", worte:"überblick zweck",
 text:`<p>Ein Stundenplan fürs Handy, der zeigt, was Schulportale meist verschweigen:
   <b>echte Uhrzeiten</b>, alle Kurse in <b>einer</b> Ansicht, dazu Hausaufgaben,
   Klausuren, Noten, Merkblätter und Fehlzeiten.</p>
  <p>Nichts ist auf eine bestimmte Schule zugeschnitten. Fächer, Räume, Lehrkräfte
   und Zeiten entstehen allein aus dem, was du einträgst.</p>
  <p class="hWarn"><b>Das Wichtigste:</b> Alle Daten liegen ausschließlich im Speicher
   deines Browsers. Es gibt keinen Server, kein Konto, keine Wiederherstellung.
   Löschst du die Websitedaten, ist alles weg — auch der Entwickler kann nichts
   zurückholen. Deshalb: regelmäßig sichern (siehe <i>Sicherung</i>).</p>`},

{id:"installieren", teil:"Erste Schritte", titel:"Auf den Startbildschirm legen", worte:"installieren pwa app icon homescreen",
 text:`<p>Die App läuft im Browser, lässt sich aber wie eine richtige App ablegen.
   Danach startet sie ohne Browserleiste und funktioniert offline.</p>
  <ul>
   <li><b>Android, Chrome:</b> Adresse öffnen, Menü ⋮, <i>App installieren</i>
     bzw. <i>Installieren und Verknüpfen</i>.</li>
   <li><b>iPhone, Safari:</b> Adresse öffnen, Teilen-Knopf, <i>Zum Home-Bildschirm</i>.</li>
   <li><b>Rechner:</b> Installationssymbol rechts in der Adressleiste.</li>
  </ul>
  <p class="hWarn"><b>Auf dem iPhone besonders wichtig:</b> Öffnest du die App nur als
   Lesezeichen in Safari, löscht Safari die Daten nach sieben Tagen ohne Benutzung
   von selbst. Auf dem Startbildschirm bleiben sie.</p>`},

{id:"einrichten", teil:"Erste Schritte", titel:"Einrichten in zehn Minuten", worte:"anfang setup erste schritte klasse",
 text:`<ol>
   <li><b>⚙ oben rechts</b> öffnen.</li>
   <li><b>Klasse</b> eintragen — sie steht später klein über dem Wochentag.</li>
   <li><b>Stundenraster</b> prüfen. Zwei Vorlagen zum Antippen, sonst Zeilen von Hand.</li>
   <li>Hat deine Schule <b>A- und B-Wochen</b>: Haken setzen.</li>
   <li><b>Bundesland</b> wählen und <b>Ferien laden</b>.</li>
   <li>Optional <b>Akzentfarbe</b>, <b>heller Modus</b>, <b>Schrift</b>.</li>
   <li><b>Speichern</b>, dann den Plan eintragen (siehe <i>Der Stundenplan</i>).</li>
  </ol>`},

{id:"raster", teil:"Der Stundenplan", titel:"Stundenraster einstellen", worte:"zeiten stunden block doppelstunde pause slots",
 text:`<p>Eine Zeile pro Feld im Tagesplan. Unter <b>Std.</b> stehen die
   Stundennummern, die dieses Feld abdeckt — bei Doppelstunden mit Komma.</p>
  <table class="hTab">
   <tr><th>Std.</th><th>von</th><th>bis</th></tr>
   <tr><td>1,2</td><td>08:00</td><td>09:30</td></tr>
   <tr><td>3,4</td><td>09:50</td><td>11:20</td></tr>
   <tr><td>5,6</td><td>11:40</td><td>13:10</td></tr>
  </table>
  <p>Keine Doppelstunden? Dann <code>1</code>, <code>2</code>, <code>3</code> …
   in einzelne Zeilen. Das Raster darf beliebig viele Felder haben.</p>
  <p class="hWarn"><b>Achtung beim Verkleinern:</b> Nimmst du Zeilen weg, verschwindet
   der Unterricht am Ende der Tage. Die App fragt vorher nach und nennt die Zahl
   der betroffenen Stunden.</p>`},

{id:"handeintragen", teil:"Der Stundenplan", titel:"Plan von Hand eintragen", worte:"bearbeiten stift fach raum lehrer",
 text:`<p><b>✎ oben antippen</b> schaltet das Bearbeiten ein — ein Hinweis unter dem
   Plan zeigt das an. Jetzt öffnet ein Tipp auf eine Stunde die Felder
   <i>Fach</i>, <i>Raum</i>, <i>Lehrkraft</i>.</p>
  <p>Fächer werden immer <b>groß</b> gespeichert, egal wie du sie tippst. Sonst
   würden „Ch“ und „CH“ als zwei Fächer gelten und der Notenschnitt zerfiele.</p>
  <p>Erneut auf ✎ tippen beendet das Bearbeiten. Für eine Woche brauchst du keine
   fünf Minuten — <b>ein Stundenplan wiederholt sich</b>, eine Woche reicht,
   bei A/B-Wochen zwei.</p>`},

{id:"import", teil:"Der Stundenplan", titel:"Plan aus dem Schulportal einfügen", worte:"import kopieren zwischenablage einfügen portal",
 text:`<p>⚙ → <b>Plan einfügen</b>. Tag und Woche wählen, die kopierte Tabelle in
   <i>Aus der Zwischenablage füllen</i> einsetzen, <b>In die Tabelle übernehmen</b>,
   prüfen, <b>Speichern</b>.</p>
  <p>Erwartet wird je Stunde eine Zeile im Format
   <code>FACH, RAUM (LEHRKRAFT)</code>, davor die Stundennummer:</p>
  <pre class="hCode">1
CH, B005 (MUEL)
2
CH, B005 (MUEL)
3
MA, B006 (SCHM)</pre>
  <p>Eckige Klammern werden auch erkannt; darin steht in vielen Portalen die Klasse
   statt der Lehrkraft.</p>
  <p class="hWarn">Viele Portale können zwischen Fach-, Raum- und Lehrkraftansicht
   umschalten. Gebraucht wird die Ansicht, bei der <b>das Fach zuerst</b> steht —
   sonst landen Lehrernamen als Fächer in deinem Plan.</p>
  <p>Passt das Format deiner Schule gar nicht: Der Ausdruck steht in
   <code>app.js</code> in der Funktion <code>parseZelle</code>.</p>`},

{id:"abwoche", teil:"Der Stundenplan", titel:"A- und B-Wochen", worte:"wechselwoche gerade ungerade kalenderwoche",
 text:`<p>Feste Regel: <b>ungerade Kalenderwoche = A, gerade = B.</b> Welche gerade
   läuft, steht oben neben der Kalenderwoche und in den Einstellungen.</p>
  <p>Passt es bei deiner Schule andersherum, trag deine A-Woche einfach als
   B-Woche ein — die Regel selbst ist nicht einstellbar, das Ergebnis schon.</p>
  <p>Unterscheiden sich die Wochen nur in ein paar Stunden: ⚙ → <b>Wochenwechsel</b>
   → <i>A-Woche → B-Woche</i> kopiert alles herüber, danach änderst du die
   Abweichungen.</p>`},

{id:"namen", teil:"Der Stundenplan", titel:"Kürzel und ausgeschriebene Namen", worte:"lehrer fachnamen abkürzung",
 text:`<p>Unter ⚙ → <b>Lehrkräfte</b> und <b>Fachnamen</b> je Zeile ein Kürzel und
   der Name, getrennt durch ein Gleichheitszeichen:</p>
  <pre class="hCode">WZET = Frau Wietzet
CH = Chemie
MA = Mathematik</pre>
  <p>Der Plan zeigt weiter die Kürzel — sonst passt er nicht auf den Bildschirm.
   Die vollen Namen erscheinen in der Fach-Info, im Zeugnis und in der Suche:
   Wer „Chemie“ sucht, findet auch Einträge, die nur „CH“ tragen.</p>`},
{id:"reiter", teil:"Täglich benutzen", titel:"Die vier Reiter", worte:"navigation wischen ansicht tag kalender einträge zeugnis",
 text:`<table class="hTab">
   <tr><th>Reiter</th><th>Inhalt</th></tr>
   <tr><td><b>Tag</b></td><td>Plan des Tages mit Uhrzeiten, laufender Stunde, Fortschrittsbalken</td></tr>
   <tr><td><b>Kalender</b></td><td>Monatsübersicht mit Markierungen, darunter der gewählte Tag</td></tr>
   <tr><td><b>Einträge</b></td><td>Suche und alle Listen samt Archiv</td></tr>
   <tr><td><b>Zeugnis</b></td><td>Alle Fächer mit Schnitt und gerundeter Note</td></tr>
  </table>
  <p>Wechseln durch Antippen, durch Antippen der vier Punkte unten oder durch
   <b>Wischen in jedem freien Bereich unterhalb des Inhalts</b> — auch mitten auf
   der Seite, wenn dort nichts mehr steht. Steht eine Unterliste offen, führt der
   erste Wisch zurück ins Menü.</p>
  <p>In der Tagesansicht wischt man zusätzlich <b>tagweise</b> vor und zurück, im
   Kalender <b>monatsweise</b>.</p>`},

{id:"stundeantippen", teil:"Täglich benutzen", titel:"Eine Stunde antippen", worte:"schnellauswahl hausaufgabe fällt aus vertretung fachinfo",
 text:`<p><b>Kurz antippen</b> öffnet die Schnellauswahl für diese Stunde:</p>
  <ul>
   <li><b>Hausaufgabe</b> — das Fälligkeitsdatum ist schon auf die
     <i>nächste Stunde dieses Fachs</i> gesetzt. Steht Chemie am Dienstag und
     Freitag, ergibt ein Tipp am Dienstag automatisch Freitag.</li>
   <li><b>Notiz</b> — freier Text zu diesem Tag.</li>
   <li><b>Klausur</b> — Termin.</li>
   <li><b>Fehlzeit</b> — die Stundenzahl des Blocks ist schon eingetragen.</li>
   <li><b>Fällt aus</b> — nur an diesem einen Tag, das Fach wird durchgestrichen.</li>
   <li><b>Vertretung</b> — anderes Fach oder anderer Raum, nur an diesem Tag.</li>
   <li><b>Sonstiges Ereignis</b> — alles andere.</li>
   <li><b>Fach-Info</b> — dasselbe wie langes Drücken.</li>
  </ul>
  <p><b>Gedrückt halten</b> öffnet direkt die Fach-Info: ausgeschriebener Name,
   Lehrkraft, Raum, Wochenstunden, nächster Termin (antippbar, springt in den
   Kalender), Notenschnitt, Zahl der Merkblätter und was offen ist.</p>
  <p class="hHinweis"><i>Fällt aus</i>, <i>Vertretung</i> und Ereignisse gelten
   <b>nur an diesem einen Tag</b>. Der Regelplan bleibt unangetastet.</p>`},

{id:"eintragsknopf", teil:"Täglich benutzen", titel:"Der Eintragsknopf", worte:"plus neu anlegen art typ",
 text:`<p>Ein Knopf für alles, unten am Bildschirm. Die Art richtet sich danach, wo
   du gerade bist — bist du in den Noten, ist „Note“ vorausgewählt.</p>
  <table class="hTab">
   <tr><th>Art</th><th>Wofür</th><th>Beispiel</th></tr>
   <tr><td>Hausaufgabe</td><td>mit Fälligkeit, abhakbar</td><td>MA — S. 42 Nr. 1–7</td></tr>
   <tr><td>Klausur</td><td>Termin, abhakbar</td><td>CH — Redoxreaktionen</td></tr>
   <tr><td>Notiz</td><td>freier Text zu einem Tag</td><td>Referat besprochen</td></tr>
   <tr><td>Ereignis</td><td>einmalig, ganzer Tag oder eine Stunde</td><td>Zahnarzt, 3./4. Std.</td></tr>
   <tr><td>Note</td><td>mündlich/schriftlich, Wofür, Notizen</td><td>2,3 schriftlich</td></tr>
   <tr><td>Merkblatt</td><td>Formeln, Regeln, Vokabeln, mit Bildern</td><td>pq-Formel</td></tr>
   <tr><td>Fehlzeit</td><td>in Unterrichtsstunden, ohne Fach</td><td>2 Stunden entschuldigt</td></tr>
  </table>
  <p>Ein <b>Fach ist nie vorausgewählt</b> — außer du kommst aus einer angetippten
   Stunde. Das verhindert, dass Einträge stillschweigend am falschen Fach landen.</p>
  <p>Bei der Datumsauswahl bekommt jeder Tag einen <b>roten Punkt</b>, an dem das
   gewählte Fach im Plan steht. So findest du die nächste Stunde ohne Blättern.</p>`},

{id:"kalendermenue", teil:"Täglich benutzen", titel:"Im Kalender eintragen", worte:"doppeltippen gedrückt halten tagesmenü termin freier tag",
 text:`<p>Ein Kalenderfeld <b>doppelt antippen</b> oder <b>gedrückt halten</b>
   (am Rechner auch Rechtsklick) öffnet das Tagesmenü: Termin, Hausaufgabe,
   Klausur, Notiz, Fehlzeit oder freier Tag.</p>
  <p>Oben im Menü steht, was an dem Tag schon eingetragen ist und ob er als frei
   markiert ist. Ist er das, heißt der Knopf <i>Freien Tag ändern</i> und zeigt
   dessen Bezeichnung.</p>
  <p>Einzelnes Antippen wählt weiterhin nur den Tag aus — darunter erscheint, was
   an ihm ansteht.</p>`},

{id:"suchen", teil:"Täglich benutzen", titel:"Suchen", worte:"finden filter",
 text:`<p>Im Reiter <b>Einträge</b> ganz oben. Gesucht wird über Fach, Titel, Notiz
   und Raum — bei Ereignissen, Noten, Hausaufgaben, Klausuren, Notizen und
   Merkblättern gleichzeitig.</p>
  <p>Kürzel und ausgeschriebener Name gelten als dasselbe, sofern der Name unter
   ⚙ hinterlegt ist. Höchstens 40 Treffer, neueste zuerst.</p>`},

{id:"archiv", teil:"Täglich benutzen", titel:"Archiv und Löschen", worte:"papierkorb wiederherstellen zurückholen",
 text:`<p>Gelöschtes verschwindet nicht sofort, sondern landet im <b>Archiv</b> —
   Einträge, Ereignisse und Noten gleichermaßen. Von dort zurückholen oder
   endgültig entfernen. Ein zweites Löschen ist unwiderruflich und wird
   nachgefragt.</p>
  <p>Abgehakte Hausaufgaben und Klausuren wandern nach <b>sieben Tagen</b>
   automatisch ins Archiv. Notizen, Merkblätter und Fehlzeiten bleiben stehen —
   die will man behalten.</p>
  <p><b>Wie lange das Archiv aufbewahrt</b>, stellst du unter ⚙ → <b>Archiv</b> ein:
   für immer (Voreinstellung), 30 Tage, 3, 6 oder 12 Monate. Ist eine Frist gesetzt,
   nennt der Hinweis oben im Archiv sie, und jede Zeile zeigt, wie lange sie noch
   bleibt. Die letzte Woche wird farbig hervorgehoben.</p>
  <p class="hWarn">Eine Frist entfernt Einträge <b>endgültig</b> — danach hilft nur
   noch eine Sicherung. Die Uhr läuft ab dem Tag des Löschens; für alles, was schon
   vor dieser Fassung im Archiv lag, beginnt sie beim ersten Öffnen, nicht
   rückwirkend.</p>`},

{id:"noten", teil:"Noten und Zeugnis", titel:"Noten eintragen", worte:"note punkte system 1-6 0-15",
 text:`<p>Unter ⚙ → <b>Noten</b> wählst du zwischen <b>Noten 1–6</b> und
   <b>Punkten 0–15</b>. Die Eingabe akzeptiert Komma und Punkt, also 2,3 wie 2.3.</p>
  <p>Jede Note ist entweder <b>mündlich</b> oder <b>schriftlich</b>. Beide werden
   getrennt gemittelt und erst danach verrechnet.</p>`},

{id:"verhaeltnis", teil:"Noten und Zeugnis", titel:"Verhältnis mündlich zu schriftlich", worte:"gewichtung anteil prozent",
 text:`<p>Ein Standardwert gilt für alle Fächer, einzelne Fächer dürfen abweichen.
   Einstellbar unter ⚙ → <i>Verhältnis je Fach</i> oder durch Antippen einer
   Fachzeile im Zeugnis.</p>
  <p><b>Rechenbeispiel.</b> Mündlich 3,0 · schriftlich 2,0 · Verhältnis 40 % mündlich:</p>
  <pre class="hCode">3,0 × 0,40  +  2,0 × 0,60  =  1,2 + 1,2  =  2,40</pre>
  <p>Gibt es nur eine Art Noten, zählt diese allein — das Verhältnis bleibt dann
   ohne Wirkung.</p>`},

{id:"zielnote", teil:"Noten und Zeugnis", titel:"Zielnoten-Rechner", worte:"was muss ich schreiben ziel rechner",
 text:`<p>Eine Fachzeile im Zeugnis antippen, unten <b>Zielnote</b> eintragen und die
   Art wählen. Die App rechnet aus, was die <i>nächste</i> Note dieser Art bringen
   müsste, damit der Schnitt das Ziel erreicht.</p>
  <p><b>Beispiel.</b> Zwei schriftliche Noten 3,0 und 3,0, Ziel 2,5 schriftlich,
   keine mündlichen Noten. Gesucht ist x mit</p>
  <pre class="hCode">(3,0 + 3,0 + x) / 3 = 2,5   →   x = 1,5</pre>
  <p>Liegt das Ergebnis außerhalb der Skala, sagt die App das offen: „Mit einer
   einzelnen Note nicht erreichbar“ — samt dem rechnerischen Wert.</p>`},

{id:"zeugnis", teil:"Noten und Zeugnis", titel:"Die Zeugnis-Ansicht", worte:"schnitt gerundet durchschnitt",
 text:`<p>Jedes Fach mit Schnitt und gerundeter Note, dazu oben der Gesamtschnitt
   über alle Fächer, die Noten haben. Die Reihenfolge der Fächer ist unter ⚙
   umsortierbar.</p>
  <p class="hWarn"><b>Das ist eine Schätzung, keine Auskunft.</b> Die App gewichtet
   alle Noten einer Art gleich. Lehrkräfte rechnen oft anders — eine Klausur zählt
   selten so viel wie ein Test.</p>`},
{id:"merkblatt", teil:"Merkblätter, Fehlzeiten, Ferien", titel:"Merkblätter", worte:"formeln vokabeln bilder foto tafelbild",
 text:`<p>Beliebig viele je Fach, jedes mit Datum und Uhrzeit. Zeilenumbrüche und
   Einrückungen bleiben erhalten, dargestellt wird in Monospace — Formeln bleiben
   dadurch ausgerichtet.</p>
  <p><b>Bilder</b> lassen sich einfügen, etwa vom Tafelbild. Sie werden automatisch
   auf 1000 px verkleinert und als JPEG komprimiert.</p>
  <p class="hWarn">Der Browserspeicher fasst rund 5 MB für alles zusammen. Unter
   ⚙ → <b>Speicher</b> siehst du den Stand in Prozent; ab 80 % warnt die App,
   solange noch Zeit für eine Sicherung bleibt.</p>
  <p class="hHinweis">Bedenke, was du fotografierst — Aufnahmen von Mitschülerinnen
   und Mitschülern gehören nur mit deren Einverständnis dorthin.</p>`},

{id:"fehlzeiten", teil:"Merkblätter, Fehlzeiten, Ferien", titel:"Fehlzeiten", worte:"fehlstunden versäumt entschuldigt unentschuldigt verspätet",
 text:`<p>Gezählt wird in <b>Unterrichtsstunden</b>, nicht je Fach — so steht es auch
   auf dem Zeugnis. Drei Arten: entschuldigt, unentschuldigt, verspätet.</p>
  <p>Unter ⚙ → <b>Fehlzeiten</b> stellst du ein, wie viele Stunden ein Schultag hat.
   Daraus rechnet das Zeugnis die Fehltage aus.</p>
  <p><b>Beispiel.</b> 8 Stunden je Schultag, 20 versäumte Stunden ergeben
   <code>20 / 8 = 2,5 Tage</code>.</p>`},

{id:"ferien", teil:"Merkblätter, Fehlzeiten, Ferien", titel:"Ferien und eigene freie Tage", worte:"feiertage bundesland openholidays praktikum ausflug",
 text:`<p>⚙ → <b>Ferien und Feiertage</b> → Bundesland wählen → <b>Ferien laden</b>.
   Die Termine kommen von openholidaysapi.org, einem offenen Datenprojekt.
   Übertragen wird nur, welches Bundesland und welcher Zeitraum gefragt sind —
   keine deiner Daten. Danach liegen sie lokal.</p>
  <p><b>Eigene freie Tage</b> trägst du im Kalender über das Tagesmenü ein:
   Praktikum, Ausflug, beweglicher Ferientag, auch über mehrere Tage. Sie werden
   grau dargestellt wie Ferien und <b>überleben ein erneutes Laden</b> der
   offiziellen Termine.</p>`},

{id:"warumsichern", teil:"Sicherung", titel:"Warum du sichern musst", worte:"datenverlust backup verloren",
 text:`<p class="hWarn">Deine Daten liegen nur auf diesem Gerät. Das heißt konkret:</p>
  <ul>
   <li>Löschst du in Chrome die <b>Cookies und Websitedaten</b>, ist der komplette
     Plan weg — samt Noten, Hausaufgaben und Merkblättern.</li>
   <li>Deinstallierst du die App oder wechselst das Handy, ist alles weg.</li>
   <li>Der private Modus vergisst alles beim Schließen.</li>
   <li>In Safari löscht das System die Daten nach sieben Tagen ohne Benutzung,
     wenn die App nicht auf dem Startbildschirm liegt.</li>
   <li><b>Niemand kann etwas wiederherstellen</b> — die Daten waren nie irgendwo
     anders.</li>
  </ul>`},

{id:"sichernwie", teil:"Sicherung", titel:"Sichern und wieder einlesen", worte:"datei json export import teilen",
 text:`<p>⚙ → <b>Sicherung</b>:</p>
  <ul>
   <li><b>Als Datei sichern</b> — eine JSON-Datei dieses Profils in die Downloads.</li>
   <li><b>Alle Profile sichern</b> — eine einzige Datei für das ganze Gerät.
     Erscheint erst ab zwei Profilen.</li>
   <li><b>Teilen</b> — über das System-Teilen-Menü, etwa an dich selbst per Mail.
     Kann das Gerät keine Dateien teilen, landet die Sicherung in der
     Zwischenablage; ein abgebrochenes Teilen zählt nicht als Sicherung.</li>
   <li><b>Datei einlesen</b> — stellt wieder her.</li>
  </ul>
  <p class="hWarn"><b>Einlesen ersetzt, es ergänzt nicht.</b> Der gesamte Plan des
   Profils wird überschrieben. Die App fragt vorher nach und nennt dabei, wann
   zuletzt gesichert wurde.</p>
  <p>Eingelesen wird nur, was die App auch selbst schreibt: Jedes Feld wird auf
   Form und Wertebereich geprüft, alles Unbekannte verworfen. Eine fremde oder
   beschädigte Datei kann die App dadurch nicht durcheinanderbringen.</p>`},

{id:"ordner", teil:"Sicherung", titel:"Sicherungsordner und Automatik", worte:"automatisch ordner rhythmus erinnerung haltefrist",
 text:`<p><b>Am Rechner (Chrome, Edge):</b> ⚙ → <b>Sicherungsordner</b> → einmal einen
   Ordner wählen. Danach legt die App ihre Sicherungen immer dort ab, ohne zu
   fragen. Mit dem Häkchen <i>Beim Öffnen automatisch sichern</i> passiert das von
   selbst, sobald es fällig ist.</p>
  <p><b>Haltefrist:</b> Im Ordner bleiben die letzten 1, 3, 6 oder 12 Monate.
   Ältere Sicherungen räumt die App weg — aber <b>nur ihre eigenen</b>, erkennbar
   am Namensmuster. Fremde Dateien im Ordner bleiben unangetastet.</p>
  <p><b>Rhythmus:</b> ⚙ → <i>Erinnerung</i> → alle 7, 14, 28 Tage, alle 3 Monate
   oder nie. Ist es fällig, erscheint oben in der Tagesansicht ein Banner mit
   <i>Jetzt sichern</i> und <i>Heute nicht</i>.</p>
  <p class="hHinweis"><b>Auf dem Handy gibt es die Ordnerwahl nicht</b> — kein
   mobiler Browser kann eine Seite dauerhaft in einen Ordner schreiben lassen.
   Sicherungen gehen dort in die Downloads. Willst du sie sortiert haben, schalte
   in Chrome unter <i>⋮ → Einstellungen → Downloads</i> die Option
   <i>Speicherort für Dateien abfragen</i> ein.</p>`},

{id:"profile", teil:"Sicherung", titel:"Profile", worte:"mehrere personen geschwister wechseln",
 text:`<p>Mehrere Datensätze auf einem Gerät. Jedes Profil hat eigenen Plan, eigene
   Einträge, Noten, Merkblätter und Einstellungen — <b>nichts wird geteilt</b>.</p>
  <p>Beim Öffnen steht die Auswahl am Anfang, auch bei nur einem Profil: So siehst
   du immer, in welchen Datensatz du gleich schreibst. Unter ⚙ → <i>Beim Öffnen</i>
   umstellbar auf <i>nur bei mehreren Profilen</i> oder <i>gleich in den Plan</i>.</p>
  <p>Jederzeit über den Buchstaben oben rechts erreichbar. Dort auch <i>Verwalten</i>
   zum Anlegen, Umbenennen und Löschen.</p>`},

{id:"erinnerungen", teil:"Erinnerungen", titel:"Warum sich die App nicht selbst weckt", worte:"benachrichtigung push melden",
 text:`<p>Eine Web-App kann sich nicht selbst wecken. Es gibt deshalb zwei Wege:</p>
  <ol>
   <li><b>Beim Öffnen.</b> Die App meldet sich, wenn etwas ansteht — sonntags mit
     einem Wochenüberblick, am Tag vor einer Klausur, bei Klausuren in den nächsten
     drei Tagen. Höchstens einmal täglich. Berechtigung unter ⚙ → Erinnerungen.</li>
   <li><b>Kalender-Export.</b> Der zuverlässige Weg — siehe nächster Abschnitt.</li>
  </ol>
  <p class="hHinweis">Auf dem iPhone gibt es Benachrichtigungen nur, wenn die App
   auf dem Startbildschirm liegt.</p>`},

{id:"ics", teil:"Erinnerungen", titel:"Kalender-Export (.ics)", worte:"google apple outlook termine wecker",
 text:`<p>⚙ → Erinnerungen → <b>Kalender-Export</b>. Die Datei importierst du in
   Google Kalender, Apple Kalender oder Outlook. Dort bekommst du <b>echte
   Erinnerungen</b>, auch wenn die App geschlossen ist.</p>
  <ul>
   <li>Hausaufgaben und Klausuren: ganztags, Erinnerung <b>15 Stunden vorher</b> —
     also am Vorabend gegen neun.</li>
   <li>Ereignisse mit fester Stunde: als Termin von/bis, <b>30 Minuten vorher</b>.</li>
   <li>„Fällt aus“ wird nicht exportiert, das würde den Kalender zumüllen.</li>
  </ul>
  <p>Bei einem erneuten Import werden dieselben Termine aktualisiert statt
   verdoppelt — jeder trägt eine feste Kennung.</p>`},
{id:"aufbau", teil:"Technik: wie es funktioniert", titel:"Aufbau — drei Dateien, kein Server", worte:"architektur html js quelltext",
 text:`<p>Die ganze App besteht aus drei Textdateien und zwei Bildern:</p>
  <table class="hTab">
   <tr><th>Datei</th><th>Inhalt</th></tr>
   <tr><td><code>index.html</code></td><td>Aufbau und sämtliches CSS, alle Dialoge</td></tr>
   <tr><td><code>app.js</code></td><td>die gesamte Logik, auch dieser Text hier</td></tr>
   <tr><td><code>sw.js</code></td><td>Offline-Speicher, Versionsnummer, Dateiliste</td></tr>
  </table>
  <p><b>Kein Server, keine Datenbank, kein Build-Vorgang, keine Bibliotheken.</b>
   Nichts wird zur Laufzeit nachgeladen. Ausgeliefert wird über GitHub Pages, das
   nur fertige Dateien verschickt und selbst nichts rechnet.</p>
  <p>Der Verzicht ist Absicht: Die App bleibt vom Handy aus bearbeitbar, und was
   es nicht gibt, kann nicht ausfallen, veralten oder abgeschaltet werden.</p>`},

{id:"speicher", teil:"Technik: wie es funktioniert", titel:"Wo die Daten liegen", worte:"localstorage speicher schlüssel json",
 text:`<p>Alles im <code>localStorage</code> des Browsers — einem Speicher, der zu
   genau einer Webadresse gehört und das Gerät nicht verlässt. Je Profil ein
   Satz Schlüssel mit dem Präfix <code>p&lt;id&gt;_</code>:</p>
  <table class="hTab">
   <tr><th>Schlüssel</th><th>Inhalt</th></tr>
   <tr><td><code>cfg</code></td><td>Einstellungen, Stundenraster, Kürzel-Tabellen</td></tr>
   <tr><td><code>plan</code></td><td><code>plan[A|B][MO..FR][Feld]</code> = Fach, Raum, Lehrkraft</td></tr>
   <tr><td><code>eintraege</code></td><td>Hausaufgaben H, Klausuren K, Notizen N, Merkblätter M, Fehlzeiten F</td></tr>
   <tr><td><code>sonder</code></td><td>einmalige Ereignisse, Ausfall, Vertretung</td></tr>
   <tr><td><code>noten</code></td><td>alle Noten</td></tr>
   <tr><td><code>ferien</code></td><td>Ferien, Feiertage und eigene freie Tage</td></tr>
  </table>
  <p>Alles als JSON. Gelöschtes bekommt nur die Markierung
   <code>geloescht: true</code> und bleibt im Archiv, bis es endgültig entfernt wird.</p>
  <p>In <code>cfg.fassung</code> steht der <b>Datenstand</b>. Trifft eine ältere App
   auf neuere Daten, sagt sie das, statt sie stillschweigend zu beschneiden.</p>`},

{id:"zeichnen", teil:"Technik: wie es funktioniert", titel:"Wie die Anzeige entsteht", worte:"rendern zeichne neu aufbauen",
 text:`<p>Es gibt kein Framework und keine Datenbindung. Nach jeder Änderung läuft
   eine Funktion <code>zeichne()</code>, die den sichtbaren Bereich komplett neu
   aufbaut. Davor räumt <code>normalisiere()</code> die Daten auf: fehlende Felder
   ergänzen, Fächer großschreiben, abgehakte Aufgaben nach sieben Tagen archivieren.</p>
  <p>Das ist absichtlich stumpf. Der gesamte Zustand steht in wenigen Variablen,
   und jede Ansicht ist eine reine Funktion davon — es gibt keinen Zwischenzustand,
   der veralten könnte.</p>
  <p>Ein Zeitgeber läuft alle 30 Sekunden und erneuert Fortschrittsbalken und
   Countdown; wechselt dabei das Datum, springt die App auf den neuen Tag.</p>`},

{id:"offline", teil:"Technik: wie es funktioniert", titel:"Offline und Aktualisieren", worte:"service worker cache update version zwischenspeicher",
 text:`<p>Ein <b>Service Worker</b> legt die fünf Dateien beim ersten Besuch in einen
   Zwischenspeicher. Danach werden Anfragen <b>zuerst daraus</b> beantwortet und im
   Hintergrund erneuert. Deshalb startet die App sofort, auch ohne Netz und auch
   bei schlechtem WLAN.</p>
  <p>Die <b>Versionsnummer</b> steht an genau einer Stelle in <code>sw.js</code>
   und ist unten unter den vier Punkten sichtbar. Die App fragt die laufende
   Fassung beim Service Worker ab und vergleicht sie mit der auf dem Server;
   bei einem Unterschied erscheint dort <i>tippen zum Aktualisieren</i>.</p>
  <p>Beim Installieren holt der Service Worker seine Dateien ausdrücklich vom Netz.
   Ohne das dürfte der Browser einzelne aus seinem eigenen Zwischenspeicher
   liefern — dann träfe ein neues <code>index.html</code> auf ein altes
   <code>app.js</code> und die App bräche ab. Genau das ist einmal passiert.</p>`},

{id:"sicherheit", teil:"Technik: wie es funktioniert", titel:"Sicherheit", worte:"xss esc sanitizer csp schutz",
 text:`<p>Die App zeigt viel selbst eingegebenen Text an. Drei Schichten verhindern,
   dass daraus ausführbarer Code wird:</p>
  <ol>
   <li><b><code>esc()</code></b> — jeder Wert aus Daten wird maskiert, bevor er ins
     HTML geht. Aus einem spitzen Klammerzeichen wird Text, kein Element.</li>
   <li><b>Prüfung beim Einlesen</b> — eine Sicherungsdatei kann von überall
     herkommen. Übernommen wird nur, was bekannt ist, und nur in der erwarteten
     Form: Datumsangaben als Datum, Farben als Hex-Wert, Bilder nur als
     eingebettete Bilddaten.</li>
   <li><b>Content-Security-Policy</b> — die Seite darf keinen Code von fremden
     Adressen laden und keinen aus dem Dokument selbst ausführen. Was die App
     nicht braucht, kann sie auch nicht.</li>
  </ol>
  <p>Es gibt keine Zugangsdaten, keine Schlüssel und keine Anmeldung — also auch
   nichts, was gestohlen werden könnte.</p>`},

{id:"kalenderwoche", teil:"Technik: wie es funktioniert", titel:"Datum, Kalenderwoche, A/B", worte:"zeitzone iso woche berechnung",
 text:`<p>Datumsangaben werden als <code>JJJJ-MM-TT</code> geführt und stets als
   <b>lokale Zeit</b> gelesen. Der naheliegende Weg über die eingebaute
   ISO-Umwandlung würde die Zeitzone verschieben und je nach Uhrzeit den Vortag
   liefern — deshalb rechnet die App selbst.</p>
  <p>Die Kalenderwoche folgt der ISO-Regel: Woche 1 ist die mit dem ersten
   Donnerstag des Jahres. Daraus folgt die A/B-Woche über die Parität.</p>`},

{id:"grenzen", teil:"Technik: wie es funktioniert", titel:"Grenzen und warum es sie gibt", worte:"portal abruf same-origin speicherplatz",
 text:`<p><b>Warum kein automatischer Abruf vom Schulportal?</b> Die App liegt auf
   einer anderen Adresse als dein Portal. Der Browser verbietet Zugriffe über
   Domaingrenzen hinweg, solange die Gegenseite das nicht ausdrücklich erlaubt.
   Diese <i>Same-Origin-Regel</i> lässt sich nicht wegprogrammieren. Nötig wäre
   ein Vermittler-Dienst oder ein Skript auf der Portalseite — beides braucht
   Zugangsdaten oder die Zustimmung der Schule.</p>
  <p>Praktisch fällt es kaum ins Gewicht: Der Plan gilt ein halbes Jahr. Nur
   Vertretungen musst du nachsehen, und die trägst du mit zwei Tipps ein.</p>
  <p><b>Warum rund 5 MB?</b> Das ist die übliche Grenze des Browserspeichers.
   Browser rechnen dabei in Zwei-Byte-Zeichen, weshalb die Anzeige unter
   ⚙ → Speicher ebenso rechnet. Bilder in Merkblättern sind mit Abstand der
   größte Posten.</p>`},

{id:"nichttut", teil:"Technik: wie es funktioniert", titel:"Was die App nie tut", worte:"datenschutz tracking werbung server",
 text:`<ul>
   <li>Sie sendet keine deiner Daten irgendwohin.</li>
   <li>Sie hat kein Konto, kein Passwort, keine Anmeldung.</li>
   <li>Sie trackt nicht, wirbt nicht, analysiert nicht.</li>
   <li>Sie lädt keinen fremden Code nach; alles liegt im Quelltext.</li>
  </ul>
  <p>Die <b>einzige</b> Verbindung nach außen ist der freiwillige Abruf der
   Ferientermine. Dabei erfährt der Dienst nicht einmal, von welcher Seite die
   Anfrage kommt.</p>`},

{id:"fehlerkasten", teil:"Wenn etwas klemmt", titel:"Der rote Fehlerkasten", worte:"absturz fehler meldung neu laden",
 text:`<p>Bricht etwas ab, erscheint oben ein roter Kasten mit der Meldung, der
   Stelle im Quelltext, der Version und Angaben zum Gerät. <b>Deine Daten sind
   dabei nicht betroffen</b> — die Anzeige ist abgestürzt, nicht der Speicher.</p>
  <p>Im Kasten steht der Knopf <b>App neu laden</b>. Er leert die Zwischenspeicher
   und startet neu, ohne die Daten anzurühren. Das behebt die häufigste Ursache:
   eine halb erneuerte Fassung.</p>
  <p>Bleibt es dabei, gib den Text weiter — er enthält alles, was zur Suche nötig
   ist. Ohne Server gibt es kein Protokoll; deine Meldung ist die einzige Quelle.</p>`},

{id:"problemdaten", teil:"Wenn etwas klemmt", titel:"Häufige Fälle", worte:"probleme hilfe funktioniert nicht leer",
 text:`<table class="hTab">
   <tr><th>Beobachtung</th><th>Ursache und Abhilfe</th></tr>
   <tr><td>Plan ist leer</td><td>Anderes Profil aktiv? Buchstabe oben rechts prüfen.</td></tr>
   <tr><td>Alles weg</td><td>Websitedaten gelöscht oder Speicher vom System geräumt. Ohne Sicherung nicht wiederherstellbar.</td></tr>
   <tr><td>„Speicher voll“</td><td>Bilder aus alten Merkblättern entfernen, vorher sichern.</td></tr>
   <tr><td>Keine Erinnerungen</td><td>Berechtigung unter ⚙ prüfen. Auf dem iPhone nur, wenn die App auf dem Startbildschirm liegt. Verlässlich ist der Kalender-Export.</td></tr>
   <tr><td>Neue Fassung kommt nicht</td><td>⚙ → <i>Nach Update suchen</i>, sonst App schließen und neu öffnen.</td></tr>
   <tr><td>Ferien laden schlägt fehl</td><td>Internet prüfen. Antwortet der Dienst nicht, bricht die App nach 15 Sekunden ab und sagt es.</td></tr>
   <tr><td>Fach doppelt im Zeugnis</td><td>Sollte nicht mehr vorkommen; Fächer werden beim Öffnen vereinheitlicht. Sonst melden.</td></tr>
  </table>`}

];

/* Sucht nur in den Textknoten. Über den fertigen HTML-Text zu ersetzen
   würde Treffer mitten in Attributnamen markieren und das Markup zerreissen. */
function hilfeMarkieren(wurzel, wort){
  if(!wort) return;
  const lauf = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
  const knoten = [];
  while(lauf.nextNode()) knoten.push(lauf.currentNode);
  const klein = wort.toLowerCase();
  knoten.forEach(k => {
    const text = k.nodeValue;
    if(!text.toLowerCase().includes(klein)) return;
    const stueck = document.createDocumentFragment();
    let rest = text, i;
    while((i = rest.toLowerCase().indexOf(klein)) !== -1){
      if(i) stueck.appendChild(document.createTextNode(rest.slice(0, i)));
      const mark = document.createElement("mark");
      mark.textContent = rest.slice(i, i + wort.length);
      stueck.appendChild(mark);
      rest = rest.slice(i + wort.length);
    }
    if(rest) stueck.appendChild(document.createTextNode(rest));
    k.parentNode.replaceChild(stueck, k);
  });
}

function hilfeZeichnen(){
  const wort = ($("#hilfeSuche").value || "").trim();
  const klein = wort.toLowerCase();
  const passt = a => !klein
    || (a.titel + " " + a.teil + " " + a.text + " " + (a.worte || "")).toLowerCase().includes(klein);
  const treffer = HILFE.filter(passt);

  /* Inhaltsverzeichnis nur ohne Suche — bei einer Suche ist die Trefferliste
     das Verzeichnis. */
  const verz = $("#hilfeVerzeichnis");
  verz.classList.toggle("hidden", !!klein);
  if(!klein){
    let letzterTeil = null;
    verz.innerHTML = "<div class=\"eyebrow\">Inhalt</div>" + HILFE.map(a => {
      const kopf = a.teil !== letzterTeil
        ? `<div class="hvTeil">${esc(a.teil)}</div>` : "";
      letzterTeil = a.teil;
      return kopf + `<button type="button" class="hvZeile" data-zu="${esc(a.id)}">${esc(a.titel)}</button>`;
    }).join("");
  }

  $("#hilfeStand").textContent = klein
    ? (treffer.length ? `${zahl(treffer.length,"Abschnitt","Abschnitte")} zu „${wort}“`
                      : `Nichts zu „${wort}“ gefunden.`)
    : `${zahl(HILFE.length,"Abschnitt","Abschnitte")}`;

  let letzter = null;
  $("#hilfeInhalt").innerHTML = treffer.map(a => {
    const kopf = a.teil !== letzter ? `<div class="eyebrow hTeil">${esc(a.teil)}</div>` : "";
    letzter = a.teil;
    return kopf + `<section class="hAbschnitt" id="h-${esc(a.id)}">
      <h3>${esc(a.titel)}</h3>${a.text}</section>`;
  }).join("");
  if(klein) hilfeMarkieren($("#hilfeInhalt"), wort);
}

function hilfeOeffnen(){
  $("#hilfeSuche").value = "";
  hilfeZeichnen();
  dlgHilfe.showModal();
  $("#hilfeKoerper").scrollTop = 0;
}
$("#btnHilfe").onclick = hilfeOeffnen;
$("#bHilfeAb").onclick = () => dlgHilfe.close();
$("#bHilfeOben").onclick = () => { $("#hilfeKoerper").scrollTop = 0; };
$("#hilfeSuche").oninput = hilfeZeichnen;
$("#hilfeVerzeichnis").onclick = e => {
  const b = e.target.closest("[data-zu]"); if(!b) return;
  const ziel = document.getElementById("h-" + b.dataset.zu);
  if(ziel) ziel.scrollIntoView({block:"start", behavior:"smooth"});
};

/* =====================================================================
   Einstellungen
   ===================================================================== */
function slotEditorZeichnen(slots){
  $("#slotEditor").innerHTML = slots.map((s,i) => `<div class="slot" data-slot="${i}">
    <input type="text" value="${esc(s.std)}" data-feld="std" inputmode="numeric">
    <input type="time" value="${s.von}" data-feld="von">
    <input type="time" value="${s.bis}" data-feld="bis">
    <button type="button" data-slotweg="${i}" aria-label="Zeile löschen">×</button></div>`).join("");
}
const slotsAuslesen = () => [...document.querySelectorAll("#slotEditor .slot")].map(z => ({
  std:z.querySelector('[data-feld=std]').value.trim(),
  von:z.querySelector('[data-feld=von]').value,
  bis:z.querySelector('[data-feld=bis]').value
})).filter(s => s.std && s.von && s.bis);
const paareText = obj => Object.entries(obj||{}).map(([k,v]) => `${k} = ${v}`).join("\n");
/** Alle Lehrkraft-Kürzel aus dem Plan. */
function alleLehrer(){
  const s = new Set();
  ["A","B"].forEach(w => TAGE.forEach(t =>
    (plan[w] && plan[w][t] || []).forEach(x => { if(x && x.lk) s.add(x.lk.toUpperCase()); })));
  return [...s].sort();
}
/** Kürzelliste als Text: bekannte Namen dahinter, unbekannte leer zum Ausfüllen. */
function paareVorbelegt(obj, kuerzel){
  const o = Object.assign({}, obj || {});
  kuerzel.forEach(k => { if(o[k] === undefined) o[k] = ""; });
  return Object.keys(o).sort().map(k => `${k} = ${o[k]}`).join("\n");
}
function textPaare(t){
  const o = {};
  String(t||"").split("\n").forEach(z => {
    const m = z.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
    if(m && m[2]) o[m[1].toUpperCase()] = m[2];   // Zeilen ohne Namen werden nicht gespeichert
  });
  return o;
}
/* Reihenfolge-Listen: einfache Pfeile statt Ziehen — auf dem Handy zuverlässiger. */
function reiheZeichnen(sel, liste, beschriften){
  $(sel).innerHTML = liste.map((k,i) => `<div class="reihezeile">
    <span class="rname">${esc(beschriften(k))}</span>
    <button type="button" data-hoch="${i}" ${i === 0 ? "disabled style=opacity:.3" : ""} aria-label="nach oben">↑</button>
    <button type="button" data-runter="${i}" ${i === liste.length-1 ? "disabled style=opacity:.3" : ""} aria-label="nach unten">↓</button>
  </div>`).join("");
}
let reiheFachListe = [];
function reihenZeichnen(){
  reiheZeichnen("#sReiheFach", reiheFachListe, fachName);
}
function reiheSchieben(liste, i, r){
  const j = i + r;
  if(j < 0 || j >= liste.length) return liste;
  [liste[i], liste[j]] = [liste[j], liste[i]];
  return liste;
}
$("#sReiheFach").onclick = e => {
  const h = e.target.closest("[data-hoch]"), r = e.target.closest("[data-runter]");
  if(h) reiheFachListe = reiheSchieben(reiheFachListe, +h.dataset.hoch, -1);
  else if(r) reiheFachListe = reiheSchieben(reiheFachListe, +r.dataset.runter, 1);
  else return;
  reihenZeichnen();
};

function anteilFaecherZeichnen(){
  const liste = alleFaecher();
  $("#sAnteilFaecher").innerHTML = liste.length
    ? liste.map(f => `<div class="anteilzeile"><span>${esc(fachName(f))}</span>
        <input type="number" min="0" max="100" step="5" data-anteilfach="${esc(f)}"
          placeholder="${Number(cfg.anteilM)||0}" value="${hatEigenenAnteil(f) ? cfg.anteile[f] : ""}"></div>`).join("")
    : `<p class="hinweis">Sobald Fächer im Plan stehen, erscheinen sie hier.</p>`;
}
function anteilFaecherLesen(){
  const o = {};
  document.querySelectorAll("[data-anteilfach]").forEach(el => {
    const v = el.value.trim();
    if(v !== "") o[el.dataset.anteilfach] = Math.max(0, Math.min(100, Number(v)||0));
  });
  return o;
}
const anteilHinweis = () => {
  const m = Math.max(0, Math.min(100, Number(sAnteilM.value)||0));
  $("#sAnteilHinweis").textContent = `${m} % mündlich, ${100-m} % schriftlich.`;
};
sAnteilM.oninput = anteilHinweis;
sNotenSystem.onchange = () => {
  $("#eWertLabel").textContent = sNotenSystem.value === "punkte15" ? "Punkte 0–15" : "Note 1–6";
};
/* Browser rechnen den Speicher in UTF-16-Einheiten ab: zwei Byte je Zeichen.
   Wer nur Zeichen zählt, meldet die Hälfte und wundert sich, warum bei
   „2500 kB" nichts mehr hineinpasst. Schlüsselnamen zählen mit. */
const GRENZE_KB = 5120;
function belegteKb(){
  let zeichen = 0;
  try{ for(const k in localStorage) if(Object.prototype.hasOwnProperty.call(localStorage,k))
    zeichen += k.length + (localStorage[k] || "").length; }catch(e){}
  return Math.round(zeichen * 2 / 1024);
}
const speicherAnteil = () => Math.min(100, Math.round(belegteKb() / GRENZE_KB * 100));
const speicherWarnung = () => {
  const a = speicherAnteil();
  return a >= 80 ? `Der Speicher ist zu ${a} % voll. Lege eine Sicherung an und `
    + `entferne alte Bilder aus Merkblättern, sonst gehen neue Einträge verloren.` : "";
};
function speicherStand(){
  const kb = belegteKb(), warn = speicherWarnung();
  const bilderZahl = eintraege.reduce((s,e) => s + ((e.bilder||[]).length), 0);
  const el = $("#sSpeicher");
  el.textContent = `${kb} kB von rund ${GRENZE_KB} kB belegt (${speicherAnteil()} %) · `
    + `${zahl(bilderZahl,"Bild","Bilder")} in Merkblättern.` + (warn ? " " + warn : "");
  el.style.color = warn ? "var(--akzent)" : "";
}
function sicherungStand(){
  const l = sicherungDatum(), alter = sicherungAlter();
  const el = $("#sSicherStand");
  if(!l){ el.textContent = "Noch nie gesichert. Jetzt wäre ein guter Zeitpunkt."; return; }
  el.textContent = sicherungFaellig()
    ? `Letzte Sicherung vor ${zahl(alter,"Tag","Tagen")} — Zeit für eine neue.`
    : `Letzte Sicherung: ${zeigDatum(l)}${alter ? ` (vor ${zahl(alter,"Tag","Tagen")})` : " (heute)"}.`;
}
function archivHinweisEinstellung(){
  const tage = Math.max(0, Number(sArchivTage.value) || 0);
  const el = $("#sArchivHinweis");
  if(!tage){
    el.textContent = "Nichts wird von selbst entfernt. Das Archiv wächst, bis du "
      + "einzelne Einträge endgültig löschst.";
    el.style.color = "";
    return;
  }
  /* Vor dem Speichern zeigen, was diese Wahl sofort kosten würde. */
  const jetzt = archivListe();
  const weg = jetzt.filter(a => {
    const alter = Math.round((new Date() - new Date(a.seit+"T12:00"))/864e5);
    return alter >= tage;
  }).length;
  el.textContent = `Gelöschtes wird ${zahl(tage,"Tag","Tage")} nach dem Löschen `
    + "endgültig entfernt — das lässt sich nicht rückgängig machen."
    + (weg ? ` Beim Speichern verschwinden dadurch sofort ${zahl(weg,"Eintrag","Einträge")}.` : "");
  el.style.color = weg ? "var(--akzent)" : "";
}
sArchivTage.onchange = archivHinweisEinstellung;

function rhythmusHinweis(){
  const tage = Math.max(0, Number(sRhythmus.value) || 0);
  const monate = Math.max(0, Number(sHalten.value) || 0);
  $("#sRhythmusHinweis").textContent = (tage
    ? `Die App erinnert dich alle ${zahl(tage,"Tag","Tage")} in der Tagesansicht.`
    : "Es wird nicht erinnert. Ans Sichern denkst du dann selbst.")
    + (monate
      ? ` Im Sicherungsordner bleiben die letzten ${zahl(monate,"Monat","Monate")}; ältere Sicherungen der App werden dort gelöscht.`
      : " Im Sicherungsordner bleibt alles liegen.");
}
sRhythmus.onchange = rhythmusHinweis;
sHalten.onchange = rhythmusHinweis;

/* --- Ordner: Anzeige und Knöpfe --- */
async function ordnerStand(){
  const el = $("#sOrdnerStand");
  if(!el) return;
  if(!ordner){ el.textContent = "Noch kein Ordner gewählt. Sicherungen gehen in die Downloads."; return; }
  const frei = await ordnerBereit(false);
  let zusatz = "";
  if(frei){
    try{
      const liste = await ordnerSicherungen();
      const grenze = haltegrenze();
      const alt = grenze ? liste.filter(x => x.datum < grenze).length : 0;
      zusatz = ` · ${zahl(liste.length,"Sicherung","Sicherungen")} darin`
        + (alt ? `, ${alt} davon älter als die Haltefrist` : "");
    }catch(e){}
  }
  el.textContent = `Ordner: ${ordner.name}`
    + (frei ? "" : " · Zugriff muss beim nächsten Sichern einmal bestätigt werden")
    + zusatz;
}
$("#sOrdnerWahl").onclick = async () => {
  try{
    const gewaehlterOrdner = await window.showDirectoryPicker({mode:"readwrite", id:"stundenplan"});
    ordner = gewaehlterOrdner;
    await griffLegen(ordner);
    ordnerStand();
  }catch(e){ if(e && e.name !== "AbortError") zeigeFehler("Ordner: " + ((e && e.message) || e)); }
};
$("#sOrdnerWeg").onclick = async () => {
  ordner = null;
  try{ await griffLegen(null); }catch(e){}
  ordnerStand();
};
$("#sOrdnerJetzt").onclick = async () => {
  if(!ordner) return alert("Wähle zuerst einen Ordner.");
  await jetztSichern(true);
  ordnerStand();
};
/* Merkt sich beim Öffnen den Zustand aller Felder. Beim Schließen wird
   verglichen — nur dann fragt die App nach. */
let einstStand = null;
function einstFelder(){
  return [...dlgEinst.querySelectorAll("input,select,textarea")]
    .filter(el => el.id && el.type !== "file")
    .map(el => el.id + "=" + (el.type === "checkbox" ? el.checked : el.value)).join("\u0001")
    + "\u0001reihe=" + (reiheFachListe || []).join(",");
}
const einstGeaendert = () => einstStand !== null && einstFelder() !== einstStand;

function einstellungenOeffnen(){
  sKlasse.value = cfg.klasse;
  sZweiWochen.checked = cfg.zweiWochen;
  slotEditorZeichnen(cfg.slots);
  sFarbe.value = cfg.akzent; sFarbeHex.value = cfg.akzent;
  sModus.value = cfg.modus; sSchrift.value = cfg.schrift;
  sStartProfil.value = cfg.startProfil || "immer";
  if(sStartProfil.selectedIndex < 0) sStartProfil.value = "immer";
  $("#sFarbVorlagen").innerHTML = FARBEN.map(f =>
    `<button type="button" data-farbe="${f}" style="border-color:${f};color:${f}">${f}</button>`).join("");
  sNotenSystem.value = cfg.notenSystem; sAnteilM.value = Number(cfg.anteilM)||0;
  anteilHinweis(); anteilFaecherZeichnen();
  sStdProTag.value = Math.max(1, Number(cfg.stdProTag) || 8);
  sArchivTage.value = String(archivFrist());
  if(sArchivTage.selectedIndex < 0) sArchivTage.value = "0";
  archivHinweisEinstellung();
  reiheFachListe = fachReihenfolge().slice();
  reihenZeichnen();
  sMelden.checked = !!cfg.melden; meldeStand();
  /* Alle im Plan vorkommenden Kürzel stehen schon da — eingetragen werden
     muss nur der Name dahinter. Vorhandene Zuordnungen bleiben erhalten. */
  sLehrer.value  = paareVorbelegt(cfg.lehrer, alleLehrer());
  sFaecher.value = paareVorbelegt(cfg.fachnamen, alleFaecher());
  sLand.innerHTML = `<option value="">— wählen —</option>` +
    Object.entries(LAENDER).map(([k,v]) => `<option value="${k}" ${cfg.land === k ? "selected":""}>${v}</option>`).join("");
  ferienStand();
  /* Ein Wert, den die Auswahl nicht kennt, lässt selectedIndex auf -1 fallen. */
  sRhythmus.value = String(Math.max(0, Number(cfg.sicherTage) || 0));
  if(sRhythmus.selectedIndex < 0) sRhythmus.value = "28";
  sHalten.value = String(Math.max(0, Number(cfg.sicherHalten) || 0));
  if(sHalten.selectedIndex < 0) sHalten.value = "3";
  sAuto.checked = !!cfg.sicherAuto;
  rhythmusHinweis();
  $("#sOrdnerGeht").classList.toggle("hidden", !ordnerMoeglich());
  $("#sOrdnerGehtNicht").classList.toggle("hidden", ordnerMoeglich());
  if(ordnerMoeglich()) ordnerLaden().then(ordnerStand);
  sDaten.value = sicherungsText();
  $("#ankerJetzt").textContent = `Diese Woche ist KW ${kalenderwoche(new Date())}, also ${kalenderwoche(new Date())%2===1?"A":"B"}.`;
  $("#ankerWrap").classList.toggle("hidden", !cfg.zweiWochen);
  $("#sWocheKopieren").classList.toggle("hidden", !cfg.zweiWochen);
  $("#sWocheStand").textContent = "";
  $("#sDateiAlle").classList.toggle("hidden", profile.length < 2);
  sicherungStand(); speicherStand(); versionPruefen();
  dlgEinst.showModal();
  einstStand = einstFelder();
}
$("#btnEinst").onclick = einstellungenOeffnen;

/* Schließen mit ungesicherten Änderungen: fragen statt verwerfen.
   Betrifft Zurück-Geste, Hintergrundtipp und Wischen gleichermaßen. */
function einstSchliessen(){
  if(!einstGeaendert()){ einstStand = null; dlgEinst.close(); return; }
  if(confirm("Es gibt ungespeicherte Änderungen.\n\nOK = speichern und schließen\nAbbrechen = verwerfen")){
    $("#bEinstSpeichern").click();
  } else {
    einstStand = null; dlgEinst.close();
  }
}
dlgEinst.addEventListener("cancel", e => {          // Zurück-Geste oder Esc
  if(einstGeaendert()){ e.preventDefault(); einstSchliessen(); }
  else einstStand = null;
});
dlgEinst.addEventListener("close", () => { einstStand = null; });
sZweiWochen.onchange = () => {
  $("#ankerWrap").classList.toggle("hidden", !sZweiWochen.checked);
  $("#sWocheKopieren").classList.toggle("hidden", !sZweiWochen.checked);
};
$("#sImport").onclick = () => { zurueckZuEinst = true; einstStand = null; dlgEinst.close(); importOeffnen(); };
/* A- und B-Woche unterscheiden sich meist nur in ein, zwei Stunden.
   Einmal kopieren spart, den ganzen Plan zweimal einzutragen. */
$("#sWocheKopieren").onclick = e => {
  const b = e.target.closest("[data-kopiere]"); if(!b) return;
  const von = b.dataset.kopiere[0], nach = b.dataset.kopiere[1];
  if(!confirm(`Die ${nach}-Woche wird vollständig durch die ${von}-Woche ersetzt. Fortfahren?`)) return;
  TAGE.forEach(t => plan[nach][t] = ((plan[von] && plan[von][t]) || [])
    .map(x => x ? Object.assign({}, x) : null));
  sichern(); zeichne();
  $("#sWocheStand").textContent = `${von}-Woche in die ${nach}-Woche übernommen.`;
};
$("#slotEditor").onclick = e => {
  const b = e.target.closest("[data-slotweg]"); if(!b) return;
  const s = slotsAuslesen(); s.splice(+b.dataset.slotweg,1); slotEditorZeichnen(s);
};
$("#sSlotPlus").onclick = () => {
  const s = slotsAuslesen(); s.push({std:String(s.length+1), von:"15:30", bis:"16:15"}); slotEditorZeichnen(s);
};
document.querySelectorAll("[data-vorlage]").forEach(b =>
  b.onclick = () => slotEditorZeichnen(VORLAGEN[b.dataset.vorlage]));
$("#sFarbVorlagen").onclick = e => {
  const b = e.target.closest("[data-farbe]"); if(!b) return;
  sFarbe.value = b.dataset.farbe; sFarbeHex.value = b.dataset.farbe; farbeVorschau();
};
function farbeVorschau(){
  const v = sFarbeHex.value.trim();
  if(/^#[0-9a-fA-F]{6}$/.test(v)) document.documentElement.style.setProperty("--akzent", v);
}
sFarbe.oninput = () => { sFarbeHex.value = sFarbe.value; farbeVorschau(); };
sFarbeHex.oninput = () => { if(/^#[0-9a-fA-F]{6}$/.test(sFarbeHex.value.trim())) sFarbe.value = sFarbeHex.value.trim(); farbeVorschau(); };
sModus.onchange = () => { cfg.modus = sModus.value; themaAnwenden(); };
sSchrift.onchange = () => { cfg.schrift = sSchrift.value; themaAnwenden(); };

const dateiName = () => (profilName().replace(/[^A-Za-z0-9äöüÄÖÜß -]/g,"").trim() || "plan")
  .replace(/\s+/g,"-").toLowerCase();
const sicherungsText = () => JSON.stringify(
  {fassung:2, art:"profil", erstellt:new Date().toISOString(), profil:profilName(),
   cfg, plan, eintraege, ferien, sonder, noten}, null, 2);
/* Die Sicherung eines Profils enthält nur dieses eine. Wer mehrere führt,
   hätte auf einem neuen Gerät sonst jedes einzeln nachbauen müssen. */
function sicherungAlleText(){
  const holen = (id,k) => {
    try{ const v = localStorage.getItem("p"+id+"_"+k); return v ? JSON.parse(v) : null; }
    catch(e){ return null; }
  };
  return JSON.stringify({fassung:2, art:"alle", erstellt:new Date().toISOString(),
    profile: profile.map(p => p.id === profilId
      ? {id:p.id, name:p.name, cfg, plan, eintraege, ferien, sonder, noten}
      : {id:p.id, name:p.name, cfg:holen(p.id,"cfg"), plan:holen(p.id,"plan"),
         eintraege:holen(p.id,"eintraege"), ferien:holen(p.id,"ferien"),
         sonder:holen(p.id,"sonder"), noten:holen(p.id,"noten")})}, null, 2);
}
/* Nur vermerken, wenn die Daten das Gerät wirklich verlassen haben. Ein
   falscher Vermerk verschweigt vier Wochen lang, dass keine Sicherung besteht. */
function sicherungNotiert(){
  const heute = iso(new Date());
  cfg.letzteSicherung = heute;
  try{ localStorage.setItem("sicherungZuletzt", heute); }catch(e){}
  Speicher.entferne("sicherSpaeter");      // erledigt ist nicht vertagt
  sichern(); sicherungStand(); zeichne();
}
$("#sDatei").onclick = () => {
  herunterladen(sicherungsText(), `stundenplan-${dateiName()}-${iso(new Date())}.json`, "application/json");
  sicherungNotiert();
};
$("#sDateiAlle").onclick = () => {
  herunterladen(sicherungAlleText(), `stundenplan-alle-${iso(new Date())}.json`, "application/json");
  sicherungNotiert();
};
$("#sDateiWahl").onclick = () => sDateiLesen.click();
sDateiLesen.onchange = () => {
  const f = sDateiLesen.files && sDateiLesen.files[0]; if(!f) return;
  const leser = new FileReader();
  leser.onload = () => { sDaten.value = leser.result; $("#sLaden").click(); };
  leser.onerror = () => alert("Datei ließ sich nicht lesen.");
  leser.readAsText(f); sDateiLesen.value = "";
};
$("#sTeilen").onclick = async () => {
  const text = profile.length > 1 ? sicherungAlleText() : sicherungsText();
  const name = `stundenplan-${profile.length > 1 ? "alle" : dateiName()}-${iso(new Date())}.json`;
  try{
    /* Mit einer leeren Dateiliste antwortet canShare auch dort „nein", wo
       Dateien sehr wohl gehen — deshalb erst die Datei bauen, dann fragen. */
    const datei = typeof File === "function" ? new File([text], name, {type:"application/json"}) : null;
    if(datei && navigator.canShare && navigator.canShare({files:[datei]})){
      await navigator.share({files:[datei], title:"Stundenplan-Sicherung"});
    } else if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      alert("Dein Gerät kann keine Dateien teilen. Die Sicherung liegt jetzt in der "
        + "Zwischenablage — füge sie irgendwo ein, wo sie bleibt.");
    } else {
      herunterladen(text, name, "application/json");
    }
    sicherungNotiert();
  }catch(e){
    if(e && e.name === "AbortError") return;      // abgebrochen ist keine Sicherung
    zeigeFehler("Teilen fehlgeschlagen: " + ((e && e.message) || e));
  }
};
/* Ersetzt sämtliche Profile des Geräts durch die aus der Datei. */
function alleProfileUebernehmen(liste){
  if(!confirm("Diese Sicherung enthält alle Profile. Sämtliche Profile auf diesem "
    + "Gerät werden dadurch ersetzt. Fortfahren?")) return;
  const vorher = profile.map(p => p.id), neu = [];
  liste.slice(0, 20).forEach((p, i) => {
    const id = alsId(p && p.id);
    if(neu.some(x => x.id === id)) return;
    const rein = paketSaeubern(p);
    DATEN.filter(k => k !== "merkblatt").forEach(k => {
      const wert = rein[k] !== undefined ? rein[k]
                 : (k === "cfg" || k === "plan") ? {} : [];
      try{ localStorage.setItem("p"+id+"_"+k, JSON.stringify(wert)); }catch(e){}
    });
    neu.push({id, name: alsText(p && p.name, 40).trim() || "Profil " + (i+1)});
  });
  if(!neu.length) return alert("In der Datei stecken keine lesbaren Profile.");
  /* Was vorher da war und in der Sicherung nicht vorkommt, wäre sonst
     unerreichbarer Ballast im Speicher. */
  vorher.filter(id => !neu.some(x => x.id === id))
    .forEach(id => profilSchluessel(id).forEach(k => { try{ localStorage.removeItem(k); }catch(e){} }));
  profile = neu; profilId = neu[0].id; profileSichern();
  zustandLaden(); normalisiere(); sichern(); profilKnopf();
  ansicht = "tag"; einSub = null; dlgEinst.close(); zeichne();
}
$("#sLaden").onclick = () => {
  let d;
  try{ d = JSON.parse(sDaten.value); }
  catch(e){ return alert("Der Text lässt sich nicht lesen. Ist es wirklich eine Sicherungsdatei?"); }
  if(d && Array.isArray(d.profile)) return alleProfileUebernehmen(d.profile);
  const teil = paketSaeubern(d);
  if(!Object.keys(teil).length) return alert("In der Datei steckt kein erkennbarer Stundenplan.");
  /* Einlesen ersetzt, es ergänzt nicht. Wer das übersieht, verliert einen
     Plan, den es nirgends sonst gibt. */
  if(hatEchteDaten()){
    const alter = sicherungAlter();
    if(!confirm("Das ersetzt den gesamten Plan dieses Profils — Einträge, Noten, "
      + "Merkblätter und Archiv.\n"
      + (alter === null ? "Von den jetzigen Daten gibt es noch keine Sicherung."
                        : `Letzte Sicherung der jetzigen Daten: vor ${zahl(alter,"Tag","Tagen")}.`)
      + "\n\nFortfahren?")) return;
  }
  if(teil.cfg)       cfg       = teil.cfg;
  if(teil.plan)      plan      = teil.plan;
  if(teil.eintraege) eintraege = teil.eintraege;
  if(teil.ferien)    ferien    = teil.ferien;
  if(teil.sonder)    sonder    = teil.sonder;
  if(teil.noten)     noten     = teil.noten;
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};
$("#sReset").onclick = () => {
  if(!confirm("Plan, Einträge, Noten, Merkblätter und Archiv dieses Profils löschen?")) return;
  /* Auch die Nebenschlüssel — sonst bleibt etwa der Merker „heute schon
     erinnert" stehen und das frische Profil schweigt. */
  profilSchluessel(profilId).forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
  Speicher.puffer = {};
  cfg = Object.assign({}, STANDARD); plan = {}; eintraege = []; ferien = []; sonder = []; noten = [];
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};
$("#sUpdate").onclick = async () => {
  const s = await versionPruefen();
  if(s && s.veraltet) aktualisieren();
  else alert("Du bist auf dem neuesten Stand" + (s && s.laeuft ? " (" + s.laeuft + ")." : "."));
};
$("#bEinstSpeichern").onclick = () => {
  const neu = slotsAuslesen();
  /* normalisiere() kürzt den Plan hart auf die Zahl der Zeilen. Das ist
     richtig — aber nicht kommentarlos, wenn dort noch Unterricht steht. */
  if(neu.length && neu.length < cfg.slots.length){
    let verlust = 0;
    ["A","B"].forEach(w => TAGE.forEach(t =>
      ((plan[w] && plan[w][t]) || []).slice(neu.length).forEach(x => { if(x) verlust++; })));
    if(verlust && !confirm(`Das Raster wird kürzer. Dabei gehen `
      + `${zahl(verlust,"belegte Stunde","belegte Stunden")} am Ende der Tage verloren. `
      + `Trotzdem speichern?`)) return;
  }
  cfg.klasse = sKlasse.value.trim();
  cfg.zweiWochen = sZweiWochen.checked;
  if(neu.length) cfg.slots = neu;
  cfg.land = sLand.value;
  cfg.notenSystem = sNotenSystem.value;
  cfg.anteilM = Math.max(0, Math.min(100, Number(sAnteilM.value)||0));
  cfg.anteile = anteilFaecherLesen();
  cfg.lehrer = textPaare(sLehrer.value);
  cfg.fachnamen = textPaare(sFaecher.value);
  if(/^#[0-9a-fA-F]{6}$/.test(sFarbeHex.value.trim())) cfg.akzent = sFarbeHex.value.trim();
  cfg.modus = sModus.value; cfg.schrift = sSchrift.value;
  cfg.startProfil = sStartProfil.value;
  cfg.melden = sMelden.checked;
  cfg.stdProTag = Math.max(1, Math.min(16, Number(sStdProTag.value) || 8));
  cfg.archivTage = Math.max(0, Math.min(3650, Number(sArchivTage.value) || 0));
  cfg.sicherTage = Math.max(0, Math.min(365, Number(sRhythmus.value) || 0));
  cfg.sicherHalten = Math.max(0, Math.min(60, Number(sHalten.value) || 0));
  cfg.sicherAuto = sAuto.checked;
  cfg.reiheFach = reiheFachListe.slice();
  einstStand = null;
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};

/* =====================================================================
   Version — einzige Quelle ist sw.js
   ===================================================================== */
let BUILD = "…";
async function laufendeVersion(){
  if(!("serviceWorker" in navigator)) return null;
  const reg = await mitZeitgrenze(navigator.serviceWorker.ready, 2000);
  const sw = reg && (reg.active || navigator.serviceWorker.controller);
  if(!sw) return null;
  return mitZeitgrenze(new Promise(fertig => {
    const kanal = new MessageChannel();
    kanal.port1.onmessage = e => fertig(e.data);
    sw.postMessage("version", [kanal.port2]);
  }), 2000);
}
async function serverVersion(){
  try{
    const antwort = await mitZeitgrenze(fetch("sw.js", {cache:"no-store"}), 5000);
    if(!antwort) return null;
    const t = await antwort.text();
    const m = t.match(/VERSION\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
  }catch(e){ return null; }
}
async function versionPruefen(){
  const [laeuft, server] = await Promise.all([laufendeVersion(), serverVersion()]);
  BUILD = laeuft || server || "—";
  const veraltet = laeuft && server && laeuft !== server;
  const w = $("#wischText");
  if(w){
    w.textContent = veraltet ? `${laeuft} · ${server} verfügbar — tippen zum Aktualisieren`
                             : "Wischen wechselt die Ansicht · " + BUILD;
    w.style.color = veraltet ? "var(--akzent)" : "";
    w.onclick = veraltet ? aktualisieren : null;
  }
  const v = $("#sVersion");
  if(v) v.textContent = veraltet ? `${laeuft} (neu: ${server})` : BUILD;
  return {laeuft, server, veraltet};
}
async function aktualisieren(){
  try{
    const reg = await navigator.serviceWorker.getRegistration();
    if(reg){ await reg.update(); if(reg.waiting) reg.waiting.postMessage("sofort"); }
  }catch(e){}
  location.reload();
}

/* =====================================================================
   Start
   ===================================================================== */
function startAnsicht(){
  try{
    const p = new URLSearchParams(location.search);
    const a = p.get("ansicht");
    if(a && ANSICHTEN.includes(a)) ansicht = a;
    const s = p.get("sub");
    if(s && ARTLANG[s]){ ansicht = "eintraege"; einSub = s; }
  }catch(e){}
}
let letzterTag = iso(new Date());
setInterval(() => {
  const jetzt = iso(new Date());
  if(jetzt !== letzterTag){ letzterTag = jetzt; gewaehlt = new Date(); zeichne(); }
  else if(ansicht === "tag") { zeichneFortschritt(); $("#countdown").textContent = countdownText(); }
}, 30000);
document.addEventListener("visibilitychange", () => { if(!document.hidden) zeichne(); });
/* Zwei offene Tabs auf demselben Profil schrieben sich bisher gegenseitig
   ganze Listen tot. Ändert der andere Tab etwas, hier neu einlesen. */
window.addEventListener("storage", e => {
  if(!e.key) return;
  if(e.key === "profile" || e.key === "profilAktiv"){ location.reload(); return; }
  const vorne = "p" + profilId + "_";
  if(!e.key.startsWith(vorne) || !DATEN.includes(e.key.slice(vorne.length))) return;
  zustandLaden(); normalisiere(); zeichne();
});

/* Ohne <dialog> läuft hier fast nichts: jeder Eintrag, jede Einstellung
   steckt darin. Safari kennt es erst ab iOS 15.4. Ein klarer Satz ist besser
   als Knöpfe, die stumm bleiben. */
function browserPruefen(){
  const fehlt = [];
  if(!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) fehlt.push("Dialogfenster");
  try{ if(!window.localStorage) fehlt.push("Speicher"); }catch(e){ fehlt.push("Speicher"); }
  if(!fehlt.length) return true;
  zeigeFehler("Dieser Browser ist zu alt für die App — es fehlt: " + fehlt.join(", ")
    + ".\nAuf dem iPhone braucht es iOS 15.4 oder neuer, sonst einen aktuellen "
    + "Chrome, Firefox, Edge oder Safari.");
  return false;
}

function starten(){
  if(!cfg || !Array.isArray(cfg.slots) || !cfg.slots.length){
    cfg = Object.assign({}, STANDARD, cfg || {});
    cfg.slots = STANDARD.slots.slice();
  }
  browserPruefen();
  themaAnwenden();
  startAnsicht();
  normalisiere();
  profilKnopf();
  zeichne();
  versionPruefen();
  meldemerkerAufraeumen();
  erinnerungenPruefen().catch(() => {});
  autoSicherung().catch(() => {});
  /* Die Profilauswahl steht am Anfang, nicht nur bei mehreren Profilen:
     wer sie sieht, weiß, in welchem Datensatz er gleich schreibt. */
  const wann = cfg.startProfil || "immer";
  if(wann === "immer" || (wann === "mehrere" && profile.length > 1)) profilAuswahlZeigen(false);
}
try{ starten(); }
catch(e){ zeigeFehler(e.message, (e.stack||"").split("\n")[1] || ""); }
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
