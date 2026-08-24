/* =====================================================================
   Stundenplan — gesamte Logik
   Nichts ist auf eine bestimmte Schule zugeschnitten. Fächer entstehen
   allein aus dem, was eingetragen wird. Raster, Klasse, Wochenwechsel
   und Bundesland stehen in den Einstellungen.
   ===================================================================== */

/* Die Version steht ausschließlich in sw.js. Die App erfragt sie beim
   laufenden Service Worker und vergleicht sie mit der auf dem Server.
   Weichen beide ab, hängt das Gerät an alten Dateien. */
let BUILD = "…";

const STANDARD = {
  klasse: "",
  /* std = welche Stundennummern dieses Feld abdeckt.
     "1,2" = ein 90-Minuten-Block. "1" = eine Einzelstunde. */
  slots: [
    {std:"1,2", von:"08:00", bis:"09:30"},
    {std:"3,4", von:"09:50", bis:"11:20"},
    {std:"5,6", von:"11:40", bis:"13:10"},
    {std:"7,8", von:"13:40", bis:"15:10"}
  ],
  zweiWochen: false,
  land: "",          // z.B. "DE-NI"
  notenSystem: "note6",   // "note6" = 1–6, "punkte15" = 0–15
  anteilM: 50,            // Standardgewicht mündlich in Prozent, Rest ist schriftlich
  anteile: {},            // je Fach abweichendes Gewicht, z.B. {MA: 40}
  lehrer: {},             // Kürzel -> Name
  fachnamen: {}           // Kürzel -> ausgeschriebener Name
};

const VORLAGEN = {
  block90: STANDARD.slots,
  einzel45: [
    {std:"1", von:"08:00", bis:"08:45"}, {std:"2", von:"08:45", bis:"09:30"},
    {std:"3", von:"09:50", bis:"10:35"}, {std:"4", von:"10:35", bis:"11:20"},
    {std:"5", von:"11:40", bis:"12:25"}, {std:"6", von:"12:25", bis:"13:10"},
    {std:"7", von:"13:40", bis:"14:25"}, {std:"8", von:"14:25", bis:"15:10"}
  ]
};

const LAENDER = {
  "DE-BW":"Baden-Württemberg", "DE-BY":"Bayern", "DE-BE":"Berlin",
  "DE-BB":"Brandenburg", "DE-HB":"Bremen", "DE-HH":"Hamburg",
  "DE-HE":"Hessen", "DE-MV":"Mecklenburg-Vorpommern", "DE-NI":"Niedersachsen",
  "DE-NW":"Nordrhein-Westfalen", "DE-RP":"Rheinland-Pfalz", "DE-SL":"Saarland",
  "DE-SN":"Sachsen", "DE-ST":"Sachsen-Anhalt", "DE-SH":"Schleswig-Holstein",
  "DE-TH":"Thüringen"
};

const TAGE = ["MO","DI","MI","DO","FR"];
const LANG = {MO:"Montag", DI:"Dienstag", MI:"Mittwoch", DO:"Donnerstag", FR:"Freitag"};
const ART  = {H:"Hausaufgabe", K:"Klausur", N:"Notiz"};

/* ---------------------------------------------------------------
   Speicher
---------------------------------------------------------------- */
const Speicher = {
  puffer:{},
  pfad(k){ return "p" + profilId + "_" + k; },
  lies(k, standard){
    try{ const v = localStorage.getItem(this.pfad(k)); return v ? JSON.parse(v) : standard; }
    catch(e){ return k in this.puffer ? this.puffer[k] : standard; }
  },
  schreib(k, v){
    this.puffer[k] = v;
    try{ localStorage.setItem(this.pfad(k), JSON.stringify(v)); }catch(e){}
  }
};

/* ---------------------------------------------------------------
   Profile — jeder Datensatz liegt unter einem eigenen Schlüssel.
   Beim ersten Start werden vorhandene Daten in das erste Profil
   übernommen, damit nichts verloren geht.
---------------------------------------------------------------- */
const DATEN = ["cfg","plan","eintraege","ferien","sonder","noten"];
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
    const altvorhanden = DATEN.some(k => { try{ return localStorage.getItem(k) !== null; }catch(e){ return false; } });
    profile = [{id:"1", name: altvorhanden ? "Mein Plan" : "Profil 1"}];
    profilId = "1";
    if(altvorhanden) DATEN.forEach(k => {                 // Umzug der alten Daten
      try{
        const v = localStorage.getItem(k);
        if(v !== null){ localStorage.setItem("p1_" + k, v); localStorage.removeItem(k); }
      }catch(e){}
    });
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
  ferien    = Speicher.lies("ferien", []);   // [{von,bis,name,typ}]
  sonder    = Speicher.lies("sonder", []);   // [{id,datum,slot,titel,raum,notiz,geloescht}]
  noten     = Speicher.lies("noten", []);    // [{id,fach,art,wert,datum,titel,notiz,geloescht}]
}
zustandLaden();

let ansicht    = "tag";
let bearbeiten = false;
let gewaehlt   = new Date();
let kalMonat   = new Date();
let kalTag     = new Date();

/* ---------------------------------------------------------------
   Datum — ohne toISOString(), das verschiebt die Zeitzone
---------------------------------------------------------------- */
const zwei = n => String(n).padStart(2,"0");
const iso  = d => `${d.getFullYear()}-${zwei(d.getMonth()+1)}-${zwei(d.getDate())}`;
const gleich = (a,b) => iso(a) === iso(b);

function montagVon(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  const wt = x.getDay() === 0 ? 7 : x.getDay();
  x.setDate(x.getDate() - (wt - 1));
  return x;
}
function plusTage(d, n){ const x = new Date(d); x.setDate(x.getDate() + n); return x; }
/** 0–4 = Mo–Fr, 5 = Wochenende */
function tagIndex(d){ const wt = d.getDay(); return (wt >= 1 && wt <= 5) ? wt - 1 : 5; }

function kalenderwoche(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
  const jan4 = new Date(x.getFullYear(), 0, 4);
  return 1 + Math.round(((x - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
/** Feste Regel: ungerade Kalenderwoche = A, gerade = B. */
function wocheFuer(d){
  if(!cfg.zweiWochen) return "A";
  return kalenderwoche(d) % 2 === 1 ? "A" : "B";
}
const minuten = s => { const [h,m] = s.split(":").map(Number); return h*60 + m; };

/* ---------------------------------------------------------------
   Daten
---------------------------------------------------------------- */
function normalisiere(){
  ["A","B"].forEach(w => {
    if(!plan[w]) plan[w] = {};
    TAGE.forEach(t => {
      if(!Array.isArray(plan[w][t])) plan[w][t] = [];
      plan[w][t].length = cfg.slots.length;
      for(let i = 0; i < cfg.slots.length; i++)
        if(plan[w][t][i] === undefined) plan[w][t][i] = null;
    });
  });
  eintraege.forEach(e => {
    if(e.geloescht === undefined) e.geloescht = false;
    if(e.erledigt && !e.erledigtAm) e.erledigtAm = iso(new Date());
  });
  aufraeumen();
  /* Rasteränderungen können Ereignisse auf nicht mehr vorhandene Stunden
     zeigen lassen. Statt sie zu verlieren, hängen sie dann am Tag. */
  sonder.forEach(o => {
    if(o.slot !== null && o.slot >= cfg.slots.length) o.slot = null;
  });
}

/** Abgehakte Hausaufgaben und Klausuren wandern nach sieben Tagen ins Archiv.
    Notizen bleiben stehen — die hakt man ab, will sie aber oft behalten. */
function aufraeumen(){
  const grenze = iso(plusTage(new Date(), -7));
  let bewegt = false;
  eintraege.forEach(e => {
    if(!e.geloescht && e.erledigt && (e.typ === "H" || e.typ === "K")
       && e.erledigtAm && e.erledigtAm <= grenze){
      e.geloescht = true; bewegt = true;
    }
  });
  if(bewegt) Speicher.schreib("eintraege", eintraege);
}
function sichern(){
  Speicher.schreib("cfg", cfg); Speicher.schreib("plan", plan);
  Speicher.schreib("eintraege", eintraege); Speicher.schreib("ferien", ferien);
  Speicher.schreib("sonder", sonder); Speicher.schreib("noten", noten);
}
const sonderAktiv = () => sonder.filter(o => !o.geloescht);
const notenAktiv  = () => noten.filter(n => !n.geloescht);
const sonderAn = (d, slot) => sonderAktiv().find(x => x.datum === iso(d) && x.slot === slot) || null;
/** Ereignisse ohne feste Stunde — am Wochenende gibt es kein Raster. */
const sonderFrei = d => sonderAktiv().filter(x => x.datum === iso(d) && x.slot === null);
const sonderTag  = d => sonderAktiv().filter(x => x.datum === iso(d));
function faecher(){
  const s = new Set();
  ["A","B"].forEach(w => TAGE.forEach(t => (plan[w][t]||[]).forEach(x => x && x.fach && s.add(x.fach))));
  return [...s].sort();
}
const lehrerName = k => (cfg.lehrer && cfg.lehrer[k]) || k || "";
const fachName   = k => (cfg.fachnamen && cfg.fachnamen[k]) || k || "";

/* Notenschnitt je Fach. Mündlich und schriftlich werden getrennt gemittelt
   und dann nach dem eingestellten Verhältnis verrechnet. Fehlt eine der
   beiden Arten, zählt die andere allein. */
const anteilFuer = fach => {
  const eigen = cfg.anteile && cfg.anteile[fach];
  const wert = (eigen === undefined || eigen === null) ? cfg.anteilM : eigen;
  return Math.max(0, Math.min(100, Number(wert) || 0));
};
const hatEigenenAnteil = fach => cfg.anteile && cfg.anteile[fach] !== undefined && cfg.anteile[fach] !== null;

function notenSchnitt(fach){
  const teil = art => {
    const l = notenAktiv().filter(n => n.fach === fach && n.art === art);
    return l.length ? l.reduce((sum,n) => sum + n.wert, 0) / l.length : null;
  };
  const m = teil("m"), sch = teil("s");
  const aM = anteilFuer(fach);
  if(m === null && sch === null) return {m:null, s:null, gesamt:null};
  if(m === null)   return {m:null, s:sch, gesamt:sch};
  if(sch === null) return {m, s:null, gesamt:m};
  return {m, s:sch, gesamt: (m * aM + sch * (100 - aM)) / 100};
}
const notenText = w => w === null || w === undefined ? "—"
  : (cfg.notenSystem === "punkte15" ? w.toFixed(1) : w.toFixed(2).replace(".", ","));
/** Ganze Zeugnisnote aus dem Schnitt. Bei Noten gilt: kleiner ist besser. */
const zeugnisNote = w => w === null || w === undefined ? null : Math.round(w);
const notenFaecher = () => [...new Set([...faecher(), ...notenAktiv().map(n => n.fach)])].filter(Boolean).sort();

const aktiv = () => eintraege.filter(e => !e.geloescht);
const eintraegeAm = d => aktiv()
  .filter(e => e.datum === iso(d))
  .sort((a,b) => (a.erledigt - b.erledigt) || "KHN".indexOf(a.typ) - "KHN".indexOf(b.typ));

/** Ferien oder Feiertag an diesem Tag, sonst null */
function freiAm(d){
  const s = iso(d);
  return ferien.find(f => s >= f.von && s <= f.bis) || null;
}
function hatFachAm(d, fach){
  if(!fach) return false;
  const i = tagIndex(d);
  if(i === 5) return false;
  return (plan[wocheFuer(d)][TAGE[i]] || [])
    .some(x => x && x.fach && x.fach.toUpperCase() === fach);
}
/** Nächster Schultag nach d, an dem das Fach stattfindet (Ferien übersprungen) */
function naechsterTagMitFach(d, fach){
  for(let i = 1; i <= 120; i++){
    const x = plusTage(d, i);
    if(hatFachAm(x, fach) && !freiAm(x)) return x;
  }
  return null;
}

/* ---------------------------------------------------------------
   Zeichnen
---------------------------------------------------------------- */
const $ = s => document.querySelector(s);
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function zeichne(){
  normalisiere();
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
  if(punkte) [...punkte.children].forEach((p,i) =>
    p.classList.toggle("an", typeof ANSICHTEN !== "undefined" && ANSICHTEN[i] === ansicht));
  if(ansicht === "tag") zeichneTag();
  else if(ansicht === "kalender") zeichneKalender();
  else if(ansicht === "zeugnis") zeichneZeugnis();
  else zeichneEintraege();
}

function zeichneTag(){
  const idx = tagIndex(gewaehlt);
  const woche = wocheFuer(gewaehlt);
  document.body.classList.toggle("bearbeiten", bearbeiten);
  $("#btnEdit").setAttribute("aria-pressed", bearbeiten);
  $("#editHinweis").classList.toggle("hidden", !bearbeiten);

  $("#klasseAnzeige").textContent = cfg.klasse || "Stundenplan";
  $("#titel").innerHTML = (idx === 5 ? "Wochenende" : LANG[TAGE[idx]]) +
    ` <span>${zwei(gewaehlt.getDate())}.${zwei(gewaehlt.getMonth()+1)}.</span>`;
  $("#kwLabel").textContent = "KW " + kalenderwoche(gewaehlt);
  $("#abLabel").classList.toggle("hidden", !cfg.zweiWochen);
  $("#abLabel").textContent = woche;

  const frei = freiAm(gewaehlt);
  const b = $("#freiBanner");
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
      const es = eintraegeAm(d);
      const ev = sonderFrei(d);
      const inhalt =
        ev.map(o => `<div style="margin-top:9px" data-wesonder="${o.id}">
             <span class="einmalig">Ereignis</span>
             <span style="margin-left:7px">${esc(o.titel)}</span>
             ${o.raum ? `<span class="detail" style="margin-top:2px">${esc(o.raum)}</span>` : ""}
           </div>`).join("") +
        es.map(e => `<div style="margin-top:9px"><span class="khn">${e.typ}</span>
             <span style="margin-left:7px">${e.fach ? esc(e.fach) + " — " : ""}${esc(e.titel) || ART[e.typ]}</span></div>`).join("");
      return `<div class="we-teil">
        <div class="eyebrow">${n} ${zwei(d.getDate())}.${zwei(d.getMonth()+1)}.</div>
        ${inhalt || `<div class="detail" style="margin-top:6px">frei</div>`}
        <button class="mini" data-weplus="${iso(d)}" style="margin-top:11px">+ Ereignis</button>
      </div>`;
    }).join("");
  } else {
    const tag = TAGE[idx];
    const linie = jetztLinie();          // Position der Jetzt-Marke, sonst null
    const teile = cfg.slots.map((s,i) => {
      const regulaer = plan[woche][tag][i];
      const o = sonderAn(gewaehlt, i);   // einmaliges Ereignis überschreibt die Stunde
      const f = o ? null : regulaer;
      const es = eintraegeAm(gewaehlt).filter(e => !e.erledigt && f && e.fach &&
                   e.fach.toUpperCase() === f.fach.toUpperCase());
      const zeichen = [...new Set(es.map(e => e.typ))].map(t => `<span class="khn">${t}</span>`).join("");
      const text = o ? esc(o.titel) : (f ? esc(f.fach) : "frei");
      let unten = s.std.replace(/,/g,"/");
      if(o){
        if(o.raum) unten += ` · ${esc(o.raum)}`;
        if(regulaer) unten += ` · <span class="durch">${esc(regulaer.fach)}</span>`;
      } else if(f){
        unten += ` · ${esc(f.raum) || "—"}${f.lk ? " · " + esc(f.lk) : ""}`;
      }
      return `<button type="button" class="block ${istAktuellerSlot(i) ? "jetzt" : ""} ${o ? "ersetzt" : ""}"
          data-block="${i}">
        <div class="zeit"><b>${s.von}</b>${s.bis}</div>
        <div>
          <div class="fach ${(f || o) ? "" : "leer"}">${text}</div>
          <div class="detail">${unten}</div>
          ${o ? `<div class="marker"><span class="einmalig">einmalig</span></div>` : ""}
          ${zeichen ? `<div class="marker">${zeichen}</div>` : ""}
        </div></button>`;
    });
    if(linie !== null) teile.splice(linie, 0, '<div class="jetztlinie"><span>jetzt</span></div>');
    $("#plan").innerHTML = teile.join("");
  }

  zeichneFortschritt();
  zeichneListe("#tagListe", "#tagNix", eintraegeAm(gewaehlt));
}

function jetztMinuten(){ const n = new Date(); return n.getHours()*60 + n.getMinutes(); }
function istHeuteSchultag(){
  return gleich(gewaehlt, new Date()) && tagIndex(gewaehlt) !== 5 && cfg.slots.length && !freiAm(gewaehlt);
}
function istAktuellerSlot(i){
  if(!istHeuteSchultag()) return false;
  const j = jetztMinuten();
  return j >= minuten(cfg.slots[i].von) && j < minuten(cfg.slots[i].bis);
}
/** Index, vor dem die Jetzt-Linie steht — nur außerhalb einer Stunde. */
function jetztLinie(){
  if(!istHeuteSchultag()) return null;
  const j = jetztMinuten();
  if(cfg.slots.some((s,i) => istAktuellerSlot(i))) return null;   // mitten im Unterricht
  if(j < minuten(cfg.slots[0].von)) return 0;
  for(let i = 0; i < cfg.slots.length - 1; i++)
    if(j >= minuten(cfg.slots[i].bis) && j < minuten(cfg.slots[i+1].von)) return i + 1;
  return cfg.slots.length;
}

/* Der Balken zeigt den Fortschritt der laufenden Stunde, in der Pause den
   der Pause. Nicht mehr den ganzen Tag — der sagt einem im Unterricht nichts. */
function zeichneFortschritt(){
  const box = $("#fortschritt");
  if(!istHeuteSchultag()){ box.classList.add("hidden"); return; }
  box.classList.remove("hidden");

  const j = jetztMinuten();
  const tag = TAGE[tagIndex(gewaehlt)], woche = wocheFuer(gewaehlt);
  const inhaltVon = i => sonderAn(gewaehlt, i) || plan[woche][tag][i];
  const ersteVon = minuten(cfg.slots[0].von);
  const letzteBis = minuten(cfg.slots.at(-1).bis);

  let anteil = 0, links = "", rechts = "";
  const i = cfg.slots.findIndex((s,k) => istAktuellerSlot(k));

  if(i >= 0){                                   // mitten in einer Stunde
    const s = cfg.slots[i], von = minuten(s.von), bis = minuten(s.bis);
    anteil = (j - von) / (bis - von);
    const x = inhaltVon(i);
    links = x ? `<b>${esc(x.fach || x.titel)}</b>${(x.raum ? " · " + esc(x.raum) : "")}` : "Freistunde";
    rechts = `noch ${bis - j} min`;
  } else if(j < ersteVon){                      // vor dem Unterricht
    anteil = 0;
    links = "Beginnt um " + cfg.slots[0].von;
    rechts = `in ${ersteVon - j} min`;
  } else if(j >= letzteBis){                    // nach dem Unterricht
    anteil = 1; links = "Schule aus"; rechts = "";
  } else {                                      // Pause
    let vorher = cfg.slots[0], nachher = cfg.slots.at(-1);
    for(let k = 0; k < cfg.slots.length - 1; k++)
      if(j >= minuten(cfg.slots[k].bis) && j < minuten(cfg.slots[k+1].von)){
        vorher = cfg.slots[k]; nachher = cfg.slots[k+1];
      }
    const von = minuten(vorher.bis), bis = minuten(nachher.von);
    anteil = (j - von) / (bis - von);
    const naechstes = inhaltVon(cfg.slots.indexOf(nachher));
    links = `<b>Pause</b>${naechstes ? " · dann " + esc(naechstes.fach || naechstes.titel) : ""}`;
    rechts = `weiter um ${nachher.von} · noch ${bis - j} min`;
  }

  $("#balkenFuell").style.width = (Math.max(0, Math.min(1, anteil))*100).toFixed(1) + "%";
  $("#fortLinks").innerHTML = links;
  $("#fortRechts").textContent = rechts;
}

function zeichneListe(sel, nixSel, liste, mitNotiz = true){
  $(sel).innerHTML = liste.map(e => {
    const d = new Date(e.datum + "T12:00");
    return `<li class="${e.erledigt ? "weg" : ""}">
      <input type="checkbox" class="hak" data-hak="${e.id}" ${e.erledigt ? "checked" : ""} aria-label="Erledigt">
      <div class="wachs" data-bearbeite="${e.id}">
        <div class="kopf"><span class="khn ${e.erledigt ? "aus" : ""}">${e.typ}</span>
          <span class="titel">${e.fach ? esc(e.fach) + " — " : ""}${esc(e.titel) || ART[e.typ]}</span></div>
        ${mitNotiz && e.notiz ? `<div class="notiz">${esc(e.notiz)}</div>` : ""}
        <div class="wann">${d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
      </div></li>`;
  }).join("");
  $(nixSel).hidden = liste.length > 0;
}

function zeichneKalender(){
  $("#monatLabel").textContent = kalMonat.toLocaleDateString("de-DE",{month:"long", year:"numeric"});
  const start = montagVon(new Date(kalMonat.getFullYear(), kalMonat.getMonth(), 1));
  let html = ["Mo","Di","Mi","Do","Fr","Sa","So"].map(t => `<div class="wt">${t}</div>`).join("");
  for(let i = 0; i < 42; i++){
    const d = plusTage(start, i);
    const es = eintraegeAm(d).filter(e => !e.erledigt);
    const zeichen = [...new Set(es.map(e => e.typ))].map(t => `<i>${t}</i>`).join("")
      + (sonderTag(d).length ? '<span class="quadratfach"></span>' : "");   // Projektarbeit u. Ä.
    html += `<button type="button" class="tagfeld ${d.getMonth() !== kalMonat.getMonth() ? "fremd" : ""}
       ${gleich(d, new Date()) ? "heute" : ""} ${freiAm(d) ? "ferien" : ""}"
       aria-pressed="${gleich(d, kalTag)}" data-kal="${iso(d)}">
       ${d.getDate()}<span class="zeichen">${zeichen}</span></button>`;
  }
  $("#gitter").innerHTML = html;

  $("#kalTagLabel").textContent = kalTag.toLocaleDateString("de-DE",{weekday:"long", day:"2-digit", month:"long"});
  const frei = freiAm(kalTag);
  $("#kalFerien").classList.toggle("hidden", !frei);
  if(frei) $("#kalFerien").textContent = frei.name + (frei.typ === "feiertag" ? " · Feiertag" : " · Ferien");
  /* Bewusst ohne Notiztext — die Details stehen im Eintrag selbst,
     erreichbar durch Antippen. So bleibt der Monatsüberblick lesbar. */
  zeichneListe("#kalListe", "#kalNix", eintraegeAm(kalTag), false);
  const ev = sonderTag(kalTag);
  if(ev.length){
    $("#kalListe").insertAdjacentHTML("afterbegin", ev.map(o => `<li>
      <div class="wachs" data-ereignis="${o.id}"><div class="kopf"><span class="einmalig">Ereignis</span>
        <span class="titel">${esc(o.titel)}</span></div>
        ${o.raum ? `<div class="wann">${esc(o.raum)}</div>` : ""}</div></li>`).join(""));
    $("#kalNix").hidden = true;
  }
}

let einSub = null;             // null = Menü, sonst "H" | "K" | "N" | "archiv"

const offeneListe = t => {
  const heuteIso = iso(new Date());
  return aktiv().filter(e => e.typ === t && (!e.erledigt || e.datum >= heuteIso))
    .sort((a,b) => (a.erledigt - b.erledigt) || a.datum.localeCompare(b.datum));
};
function archivListe(){
  return [
    ...eintraege.filter(e => e.geloescht).map(e => ({
      art:"eintrag", id:e.id, marke:e.typ, datum:e.datum,
      text: (e.fach ? e.fach + " — " : "") + (e.titel || ART[e.typ]) })),
    ...sonder.filter(o => o.geloescht).map(o => ({
      art:"ereignis", id:o.id, marke:"Ereignis", datum:o.datum, text:o.titel })),
    ...noten.filter(n => n.geloescht).map(n => ({
      art:"note", id:n.id, marke:"Note", datum:n.datum,
      text: `${notenText(n.wert)} · ${fachName(n.fach)}${n.titel ? " — " + n.titel : ""}` }))
  ].sort((a,b) => b.datum.localeCompare(a.datum));
}
function archivFinden(art, id){
  return art === "eintrag" ? eintraege.find(x => x.id === id)
       : art === "ereignis" ? sonder.find(x => x.id === id)
       : noten.find(x => x.id === id);
}

const kommendeEreignisse = () => sonderAktiv()
  .filter(o => o.datum >= iso(plusTage(new Date(), -7)))
  .sort((a,b) => a.datum.localeCompare(b.datum) || (a.slot ?? -1) - (b.slot ?? -1));

function zeichneEintraege(){
  $("#einMenu").classList.toggle("hidden", einSub !== null);
  $("#einDetail").classList.toggle("hidden", einSub === null);
  $("#einKopf").innerHTML = "";

  if(einSub === null){
    const offen = t => offeneListe(t).filter(e => !e.erledigt).length;
    $("#zahlH").textContent = offen("H") ? `${offen("H")} offen` : "nichts offen";
    $("#zahlK").textContent = offen("K") ? `${offen("K")} anstehend` : "nichts anstehend";
    $("#zahlN").textContent = offen("N") ? `${offen("N")} vorhanden` : "keine";
    $("#zahlE").textContent = kommendeEreignisse().length ? `${kommendeEreignisse().length} geplant` : "keine";
    $("#zahlNoten").textContent = notenAktiv().length ? `${notenAktiv().length} eingetragen` : "keine";
    $("#zahlArchiv").textContent = archivListe().length ? `${archivListe().length} im Archiv` : "leer";
    return;
  }

  const titel = {H:"Hausaufgaben", K:"Klausuren", N:"Notizen", E:"Ereignisse",
                 noten:"Noten", archiv:"Archiv"}[einSub];
  $("#einTitel").textContent = titel;
  $("#archivHinweis").classList.toggle("hidden", einSub !== "archiv");

  if(einSub === "E"){
    const liste = kommendeEreignisse();
    $("#einListe").innerHTML = liste.map(o => {
      const d = new Date(o.datum + "T12:00");
      const wann = d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"}) +
        (o.slot !== null && cfg.slots[o.slot] ? ` · ${cfg.slots[o.slot].von}` : " · ganzer Tag");
      return `<li><div class="wachs" data-ereignis="${o.id}">
        <div class="kopf"><span class="einmalig">Ereignis</span>
          <span class="titel">${esc(o.titel)}</span></div>
        ${o.notiz ? `<div class="notiz">${esc(o.notiz)}</div>` : ""}
        <div class="wann">${wann}${o.raum ? " · " + esc(o.raum) : ""}</div></div></li>`;
    }).join("");
    $("#einNix").textContent = "Keine Ereignisse geplant.";
    $("#einNix").hidden = liste.length > 0;
    return;
  }

  if(einSub === "noten"){ zeichneNoten(); return; }

  if(einSub === "archiv"){
    const liste = archivListe();
    $("#einListe").innerHTML = liste.map(e => `<li>
        <div class="wachs">
          <div class="kopf"><span class="khn aus">${esc(e.marke)}</span>
            <span class="titel" style="color:var(--muted)">${esc(e.text)}</span></div>
          <div class="wann">${zeigDatum(e.datum)}</div>
        </div>
        <button class="mini" data-zurueck="${e.art}:${e.id}">Zurück</button>
        <button class="mini" data-endgueltig="${e.art}:${e.id}" style="border-color:var(--red);color:var(--red)">Löschen</button>
      </li>`).join("");
    $("#einNix").textContent = "Archiv ist leer.";
    $("#einNix").hidden = liste.length > 0;
  } else {
    const liste = offeneListe(einSub);
    zeichneListe("#einListe", "#einNix", liste);
    $("#einNix").textContent = {H:"Keine offenen Hausaufgaben.", K:"Keine Klausuren eingetragen.",
                                N:"Keine Notizen."}[einSub];
  }
}
function zeichneNoten(){
  $("#einKopf").innerHTML =
    `<p class="hinweis">Das Verhältnis mündlich zu schriftlich lässt sich je Fach einstellen —
       auf den Wert in der Fachzeile tippen. Standard: ${Number(cfg.anteilM)||0} % mündlich.</p>
     <div class="notenchips"><button type="button" id="bNotePlus">+ Note</button></div>`;

  const liste = notenFaecher().filter(f => notenAktiv().some(n => n.fach === f));
  $("#einListe").innerHTML = liste.map(f => {
    const sch = notenSchnitt(f);
    const aM = anteilFuer(f);
    const eigene = notenAktiv().filter(n => n.fach === f).sort((a,b) => b.datum.localeCompare(a.datum));
    return `<li style="display:block;padding:0;border:0"><div class="notenkarte">
      <div class="kopfz">
        <div><div style="font-size:17px">${esc(fachName(f))}</div>
          <div class="teil">mündlich ${notenText(sch.m)} · schriftlich ${notenText(sch.s)}</div></div>
        <div class="schnitt">${notenText(sch.gesamt)}</div>
      </div>
      <div class="notenchips">
        <button type="button" class="anteilchip" data-anteil="${esc(f)}">
          ${aM} % mündlich${hatEigenenAnteil(f) ? " ·  eigen" : ""}</button>
      </div>
      ${eigene.map(n => `<div class="notenzeile" data-note="${n.id}">
          <span class="wert">${notenText(n.wert)}</span>
          <span class="art">${n.art === "m" ? "mündl." : "schriftl."}</span>
          <span class="wofuer">${esc(n.titel) || "—"}</span>
          <span class="tag">${zeigDatum(n.datum)}</span>
        </div>`).join("")}
    </div></li>`;
  }).join("");
  $("#einNix").textContent = "Noch keine Noten eingetragen.";
  $("#einNix").hidden = liste.length > 0;
}

/* --- Zeugnis: alle Fächer auf dem aktuellen Stand --- */
function zeichneZeugnis(){
  /* Bewusst alle Fächer des Plans, nicht nur die mit Noten — so siehst du
     auch, wo noch nichts eingetragen ist. */
  const liste = notenFaecher();
  const schnitte = liste.map(f => notenSchnitt(f).gesamt).filter(w => w !== null);
  const gesamt = schnitte.length ? schnitte.reduce((a,b) => a+b, 0) / schnitte.length : null;

  $("#zeuSchnitt").textContent = gesamt === null ? "" : notenText(gesamt);
  $("#zeuHinweis").textContent = notenAktiv().length
    ? `Aus ${notenAktiv().length} Noten in ${schnitte.length} von ${liste.length} Fächern.`
    : "Noch keine Noten. Die Fächer stehen trotzdem hier — tippe eines an, um das Verhältnis zu setzen.";

  $("#zeuListe").innerHTML = liste.map(f => {
    const sch = notenSchnitt(f);
    const ganz = zeugnisNote(sch.gesamt);
    const anzahl = notenAktiv().filter(n => n.fach === f).length;
    return `<button type="button" class="zeuZeile" data-zeufach="${esc(f)}">
      <div class="fach">${esc(fachName(f))}
        <small>${anzahl ? `${anzahl} ${anzahl === 1 ? "Note" : "Noten"}` : "keine Noten"}
          · ${anteilFuer(f)} % mündlich</small></div>
      <div class="roh">${notenText(sch.gesamt)}</div>
      <div class="note">${ganz === null ? "—" : ganz}</div>
    </button>`;
  }).join("");
  $("#zeuNix").hidden = liste.length > 0;
}
$("#zeuListe").onclick = e => {
  const b = e.target.closest("[data-zeufach]"); if(!b) return;
  anteilOeffnen(b.dataset.zeufach);
};

/* --- Verhältnis je Fach --- */
let anteilFach = null;
function anteilOeffnen(fach){
  anteilFach = fach;
  $("#anTitel").textContent = fachName(fach);
  anWert.value = anteilFuer(fach);
  anteilVorschau();
  dlgAnteil.showModal();
}
function anteilVorschau(){
  const m = Math.max(0, Math.min(100, Number(anWert.value) || 0));
  $("#anHinweis").textContent = `${m} % mündlich, ${100-m} % schriftlich.`
    + (hatEigenenAnteil(anteilFach) ? "" : ` Zurzeit gilt der Standard.`);
}
anWert.oninput = anteilVorschau;
$("#bAnAb").onclick = () => dlgAnteil.close();
$("#bAnStandard").onclick = () => {
  if(cfg.anteile) delete cfg.anteile[anteilFach];
  sichern(); dlgAnteil.close(); zeichne();
};
$("#bAnSpeichern").onclick = () => {
  if(!cfg.anteile) cfg.anteile = {};
  cfg.anteile[anteilFach] = Math.max(0, Math.min(100, Number(anWert.value) || 0));
  sichern(); dlgAnteil.close(); zeichne();
};

$("#einKopf").onclick = e => { if(e.target.closest("#bNotePlus")) noteOeffnen(null); };
$("#einListe").addEventListener("click", e => {
  const an = e.target.closest("[data-anteil]");
  if(an){ anteilOeffnen(an.dataset.anteil); return; }
  const b = e.target.closest("[data-note]");
  if(b) noteOeffnen(noten.find(n => n.id === b.dataset.note));
});

/* --- Noten laufen über den Eintragsdialog --- */
function noteOeffnen(n){
  if(!n) return eintragOeffnen(null, new Date(), "G", vorschlagFach());
  bearbeiteId = null; ereignisId = null; noteId = n.id;
  $("#dlgEintragTitel").textContent = "Note ändern";
  eTyp.value = "G";
  eDatum.value = n.datum;
  eText.value = n.titel || ""; eNotiz.value = n.notiz || "";
  eWert.value = String(n.wert).replace(".", ",");
  eNArt.value = n.art;
  fachAuswahlFuellen(n.fach);
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.remove("hidden");
  dlgEintrag.showModal();
}

$("#einMenu").onclick = e => {
  const b = e.target.closest("[data-sub]"); if(!b) return;
  einSub = b.dataset.sub; zeichne();
};
$("#einZurueck").onclick = () => { einSub = null; zeichne(); };

/* ---------------------------------------------------------------
   Navigation
---------------------------------------------------------------- */
$("#rTag").onclick = () => { ansicht = "tag"; zeichne(); };
$("#rKal").onclick = () => { ansicht = "kalender"; kalMonat = new Date(gewaehlt); kalTag = new Date(gewaehlt); zeichne(); };
$("#rEin").onclick = () => { ansicht = "eintraege"; einSub = null; zeichne(); };
$("#rZeu").onclick = () => { ansicht = "zeugnis"; zeichne(); };
$("#btnEdit").onclick = () => { bearbeiten = !bearbeiten; zeichne(); };
$("#btnHeute").onclick = () => { gewaehlt = new Date(); zeichne(); };
$("#wocheZurueck").onclick = () => { gewaehlt = plusTage(gewaehlt, -7); zeichne(); };
$("#wocheVor").onclick     = () => { gewaehlt = plusTage(gewaehlt,  7); zeichne(); };
$("#monatMinus").onclick = () => { kalMonat = new Date(kalMonat.getFullYear(), kalMonat.getMonth()-1, 1); zeichne(); };
$("#monatPlus").onclick  = () => { kalMonat = new Date(kalMonat.getFullYear(), kalMonat.getMonth()+1, 1); zeichne(); };
$("#tage").onclick = e => {
  const b = e.target.closest("[data-tag]"); if(!b) return;
  const i = +b.dataset.tag;
  gewaehlt = plusTage(montagVon(gewaehlt), i === 5 ? 5 : i);
  zeichne();
};
$("#gitter").onclick = e => {
  const b = e.target.closest("[data-kal]"); if(!b) return;
  kalTag = new Date(b.dataset.kal + "T12:00"); zeichne();
};

/* Wischen ---------------------------------------------------------
   Eine Geste, drei Orte: Tagesansicht blättert Tage, Kalender blättert
   Monate, die Zone unter dem Knopf wechselt die Ansicht. */
function wischen(el, beiWisch){
  if(!el) return;                      // Element nicht vorhanden: still überspringen
  let x0 = null, y0 = null;
  el.addEventListener("touchstart", e => {
    if(e.touches.length !== 1){ x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, {passive:true});
  el.addEventListener("touchend", e => {
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if(Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;   // eher gescrollt
    beiWisch(dx < 0 ? 1 : -1);
  }, {passive:true});
}
wischen($("#ansichtTag"), r => { gewaehlt = plusTage(gewaehlt, r); zeichne(); });
wischen($("#dlgEinst"), () => $("#bEinstSpeichern").click());
wischen($("#dlgProfil"), () => dlgProfil.close());
wischen($("#ansichtKal"), r => {
  kalMonat = new Date(kalMonat.getFullYear(), kalMonat.getMonth() + r, 1); zeichne();
});
const ANSICHTEN = ["tag", "kalender", "eintraege", "zeugnis"];

/* Fehlt die Wischzone im HTML — etwa weil der Browser noch eine ältere
   index.html im Speicher hat — wird sie hier angelegt. So bleibt die App
   auch bei ungleichen Dateiständen bedienbar. */
function wischzoneSichern(){
  if(!document.querySelector("style#nachtrag")){   // Stil für nachgerüstete Zone
    const st = document.createElement("style"); st.id = "nachtrag";
    st.textContent = ".wischzone{margin-top:18px;padding:16px 0 4px;display:flex;flex-direction:column;"
      + "align-items:center;gap:8px;touch-action:pan-y}"
      + ".wischzone span{font-family:var(--mono);font-size:10px;letter-spacing:.14em;"
      + "text-transform:uppercase;color:var(--dim)}"
      + ".punkte{display:flex;gap:7px}.punkte i{width:6px;height:6px;border-radius:99px;background:var(--line)}"
      + ".punkte i.an{background:var(--red)}";
    document.head.appendChild(st);
  }
  let z = $("#wischzone");
  if(!z){
    z = document.createElement("div");
    z.id = "wischzone"; z.className = "wischzone";
    z.innerHTML = '<div class="punkte" id="wischPunkte"><i></i><i></i><i></i></div><span id="wischText"></span>';
    (document.getElementById("btnEintrag") || document.body).after(z);
  }
  z.querySelector("span").id = "wischText";
  return z;
}
wischzoneSichern();
const wischzone = $("#fuss") || $("#wischzone");
wischen(wischzone, r => {
  /* Steht eine Unterliste offen, führt der erste Wisch dorthin zurück,
     statt gleich die ganze Ansicht zu wechseln. */
  if(ansicht === "eintraege" && einSub !== null){ einSub = null; zeichne(); return; }
  const i = ANSICHTEN.indexOf(ansicht);
  ansicht = ANSICHTEN[(i + r + ANSICHTEN.length) % ANSICHTEN.length];
  if(ansicht === "kalender"){ kalMonat = new Date(gewaehlt); kalTag = new Date(gewaehlt); }
  zeichne();
});
$("#wischPunkte").onclick = () => {
  if(ansicht === "eintraege" && einSub !== null){ einSub = null; zeichne(); return; }
  const i = ANSICHTEN.indexOf(ansicht);
  ansicht = ANSICHTEN[(i + 1) % ANSICHTEN.length]; zeichne();
};

/* ---------------------------------------------------------------
   Stunde antippen — bearbeiten oder schnell eintragen
   Langes Drücken öffnet stattdessen die Fach-Info.
---------------------------------------------------------------- */
let offenerBlock = 0;
let langDruck = false;

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
  flaeche.addEventListener("touchmove", stopp, {passive:true});
  flaeche.addEventListener("touchend", stopp, {passive:true});
  flaeche.addEventListener("touchcancel", stopp, {passive:true});
  flaeche.addEventListener("contextmenu", e => {          // Rechtsklick am Rechner
    const b = e.target.closest("[data-block]"); if(!b) return;
    e.preventDefault(); fachInfo(+b.dataset.block);
  });
})();

/** Alles, was die App über ein Fach weiß, auf einen Blick. */
function fachInfo(i){
  const f = plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][i];
  if(!f){ return; }
  const k = f.fach.toUpperCase();

  let stunden = 0;
  ["A","B"].forEach(w => TAGE.forEach(t =>
    (plan[w][t] || []).forEach(x => { if(x && x.fach.toUpperCase() === k) stunden++; })));
  const proWoche = cfg.zweiWochen ? (stunden / 2) : stunden;

  const naechste = [];
  let d = new Date(gewaehlt);
  for(let n = 0; n < 60 && naechste.length < 3; n++){
    d = plusTage(d, 1);
    if(hatFachAm(d, k) && !freiAm(d)) naechste.push(d.toLocaleDateString("de-DE",{weekday:"short", day:"2-digit", month:"2-digit"}));
  }
  const sch = notenSchnitt(k);
  const offen = aktiv().filter(e => !e.erledigt && e.fach === k && e.typ !== "N");

  $("#fiTitel").textContent = fachName(k);
  $("#fiKuerzel").textContent = fachName(k) === k ? "" : k;
  const zeile = (a,b) => `<div class="fiZeile"><span>${a}</span><span>${b}</span></div>`;
  $("#fiInhalt").innerHTML =
    zeile("Lehrkraft", f.lk ? esc(lehrerName(f.lk)) : "—") +
    zeile("Raum", esc(f.raum) || "—") +
    zeile("Stunden je Woche", proWoche % 1 ? proWoche.toFixed(1) : String(proWoche)) +
    zeile("Als Nächstes", naechste.join(", ") || "—") +
    zeile("Schnitt", notenText(sch.gesamt)) +
    zeile("mündlich / schriftlich", `${notenText(sch.m)} / ${notenText(sch.s)}`) +
    zeile("Offen", offen.length ? offen.map(e => e.typ).join(" ") : "nichts");
  dlgFach.showModal();
}
$("#bFachAb").onclick = () => dlgFach.close();

$("#plan").onclick = e => {
  const plus = e.target.closest("[data-weplus]");
  if(plus){ eintragOeffnen(null, new Date(plus.dataset.weplus + "T12:00"), "E", "", null); return; }
  const wes = e.target.closest("[data-wesonder]");
  if(wes){ ereignisOeffnen(wes.dataset.wesonder); return; }
  const b = e.target.closest("[data-block]"); if(!b) return;
  if(langDruck){ langDruck = false; return; }      // war ein langes Drücken
  offenerBlock = +b.dataset.block;
  if(bearbeiten){ blockDialog(); return; }
  const o = sonderAn(gewaehlt, offenerBlock);
  if(o){ eintragOeffnen(null, gewaehlt, "E", "", offenerBlock); return; }
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
  const fach = fFach.value.trim();
  plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock] =
    fach ? {fach, raum:fRaum.value.trim(), lk:fLK.value.trim()} : null;
  sichern(); dlgBlock.close(); zeichne();
};
$("#bBlockLeeren").onclick = () => {
  plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock] = null;
  sichern(); dlgBlock.close(); zeichne();
};

function schnellFach(){
  const f = plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock];
  return f ? f.fach : "";
}
function schnellDialog(){
  const fach = schnellFach();
  if(!fach){ eintragOeffnen(null, gewaehlt, "E", "", offenerBlock); return; }   // freie Stunde
  const s = cfg.slots[offenerBlock];
  $("#schnellTitel").textContent = fach;
  $("#schnellZeit").textContent = `${s.von} – ${s.bis}`;
  const vorhanden = sonderAn(gewaehlt, offenerBlock);
  $("#bSchnellErsatz").querySelector("small").textContent =
    vorhanden ? `\u201e${vorhanden.titel}\u201c ändern` : "nur an diesem Tag";
  const naechste = naechsterTagMitFach(gewaehlt, fach.toUpperCase());
  $("#bSchnellHAZiel").textContent = naechste
    ? "fällig " + naechste.toLocaleDateString("de-DE",{weekday:"short", day:"2-digit", month:"2-digit"})
    : "kein weiterer Termin gefunden";
  dlgSchnell.showModal();
}
$("#bSchnellAb").onclick = () => dlgSchnell.close();
$("#bSchnellHA").onclick = () => {
  const fach = schnellFach();
  const ziel = naechsterTagMitFach(gewaehlt, fach.toUpperCase()) || plusTage(gewaehlt, 1);
  dlgSchnell.close(); eintragOeffnen(null, ziel, "H", fach);
};
$("#bSchnellNotiz").onclick = () => {
  const fach = schnellFach();
  dlgSchnell.close(); eintragOeffnen(null, gewaehlt, "N", fach);
};
$("#bSchnellKlausur").onclick = () => {
  const fach = schnellFach();
  dlgSchnell.close(); eintragOeffnen(null, gewaehlt, "K", fach);
};
$("#bSchnellErsatz").onclick = () => {
  dlgSchnell.close(); eintragOeffnen(null, gewaehlt, "E", "", offenerBlock);
};

/* ---------------------------------------------------------------
   Einmaliges Ereignis in einer freien Stunde
---------------------------------------------------------------- */
/* ---------------------------------------------------------------
   Einträge
---------------------------------------------------------------- */
let bearbeiteId = null;

function fachAuswahlFuellen(wert){
  const liste = faecher();
  eFach.innerHTML = `<option value="">— keins —</option>` +
    liste.map(f => `<option ${f === wert ? "selected" : ""}>${esc(f)}</option>`).join("") +
    `<option value="__frei">Anderes …</option>`;
  if(wert && !liste.includes(wert)){ eFach.value = "__frei"; eFachFrei.value = wert; }
  freiUmschalten();
}
function freiUmschalten(){ $("#eFachFreiWrap").classList.toggle("hidden", eFach.value !== "__frei"); }
eFach.onchange = () => {
  freiUmschalten();
  if(!$("#eDatumWahl").classList.contains("hidden")) zeichneDatumWahl();
};
eFachFrei.oninput = () => { if(!$("#eDatumWahl").classList.contains("hidden")) zeichneDatumWahl(); };

/* Datumsauswahl mit roten Punkten an den Tagen, an denen das Fach stattfindet */
let eMonat = new Date();
function aktuellesFach(){
  return (eFach.value === "__frei" ? eFachFrei.value : eFach.value).trim().toUpperCase();
}
function datumFeldText(){
  const v = eDatum.value;
  $("#eDatumFeld").textContent = v
    ? new Date(v + "T12:00").toLocaleDateString("de-DE",
        {weekday:"short", day:"2-digit", month:"2-digit", year:"numeric"})
    : "—";
}
function zeichneDatumWahl(){
  const fach = aktuellesFach();
  $("#eMonatLabel").textContent = eMonat.toLocaleDateString("de-DE",{month:"long", year:"numeric"});
  const start = montagVon(new Date(eMonat.getFullYear(), eMonat.getMonth(), 1));
  let html = ["Mo","Di","Mi","Do","Fr","Sa","So"].map(t => `<div class="wt">${t}</div>`).join("");
  for(let i = 0; i < 42; i++){
    const d = plusTage(start, i);
    html += `<button type="button" class="tagfeld ${d.getMonth() !== eMonat.getMonth() ? "fremd" : ""}
       ${gleich(d, new Date()) ? "heute" : ""} ${freiAm(d) ? "ferien" : ""}"
       aria-pressed="${eDatum.value === iso(d)}" data-wahl="${iso(d)}">
       ${d.getDate()}${hatFachAm(d, fach) ? '<span class="punktfach"></span>' : ""}</button>`;
  }
  $("#eGitter").innerHTML = html;
  $("#eGitterHinweis").textContent = fach
    ? `Roter Punkt: ${fach} steht an diesem Tag im Plan.`
    : "Wähle oben ein Fach, dann werden die passenden Tage markiert.";
}
function datumWahlOeffnen(auf){
  $("#eDatumWahl").classList.toggle("hidden", !auf);
  $("#eDatumFeld").setAttribute("aria-expanded", auf ? "true" : "false");
  if(auf){ eMonat = new Date((eDatum.value || iso(new Date())) + "T12:00"); zeichneDatumWahl(); }
}
$("#eDatumFeld").onclick = () => datumWahlOeffnen($("#eDatumWahl").classList.contains("hidden"));
$("#eMonatMinus").onclick = () => { eMonat = new Date(eMonat.getFullYear(), eMonat.getMonth()-1, 1); zeichneDatumWahl(); };
$("#eMonatPlus").onclick  = () => { eMonat = new Date(eMonat.getFullYear(), eMonat.getMonth()+1, 1); zeichneDatumWahl(); };
$("#eGitter").onclick = e => {
  const b = e.target.closest("[data-wahl]"); if(!b) return;
  eDatum.value = b.dataset.wahl; datumFeldText(); datumWahlOeffnen(false);
};

let ereignisId = null;     // gesetzt, wenn ein Ereignis bearbeitet wird

function stundenAuswahlFuellen(slot){
  eStunde.innerHTML = `<option value="">ganzer Tag</option>` +
    cfg.slots.map((s,i) =>
      `<option value="${i}" ${i === slot ? "selected" : ""}>${s.std.replace(/,/g,"/")} · ${s.von}</option>`).join("");
  if(slot === null || slot === undefined) eStunde.value = "";
}
function artUmschalten(){
  const ev = eTyp.value === "E", note = eTyp.value === "G";
  $("#eFachWrap").classList.toggle("hidden", ev);
  $("#eEreignisWrap").classList.toggle("hidden", !ev);
  $("#eNoteWrap").classList.toggle("hidden", !note);
  $("#eWertLabel").textContent = cfg.notenSystem === "punkte15" ? "Punkte 0–15" : "Note 1–6";
  if(ev) $("#eFachFreiWrap").classList.add("hidden"); else freiUmschalten();
}
eTyp.onchange = artUmschalten;

let noteId = null;

function eintragOeffnen(e, datum, typ, fach, slot){
  bearbeiteId = e ? e.id : null;
  ereignisId = null; noteId = null;
  eWert.value = ""; eNArt.value = "s";
  const d = datum || gewaehlt;
  const vorhanden = (typ === "E" && slot !== undefined)
    ? (slot === null ? null : sonderAn(d, slot)) : null;
  if(vorhanden) ereignisId = vorhanden.id;

  $("#dlgEintragTitel").textContent = (e || vorhanden) ? "Eintrag ändern" : "Neuer Eintrag";
  eTyp.value   = e ? e.typ : (typ || "H");
  eDatum.value = e ? e.datum : iso(d);
  eText.value  = e ? (e.titel || "") : (vorhanden ? vorhanden.titel : "");
  eNotiz.value = e ? (e.notiz || "") : (vorhanden ? (vorhanden.notiz || "") : "");
  eOrt.value   = vorhanden ? (vorhanden.raum || "") : "";
  stundenAuswahlFuellen(vorhanden ? vorhanden.slot : (slot === undefined ? null : slot));
  fachAuswahlFuellen(e ? e.fach : (fach !== undefined ? fach : vorschlagFach()));
  datumFeldText(); datumWahlOeffnen(false);
  artUmschalten();
  $("#bEintragWeg").classList.toggle("hidden", !(e || vorhanden));
  dlgEintrag.showModal();
}

/** Vorhandenes Ereignis zum Bearbeiten öffnen */
function ereignisOeffnen(id){
  const o = sonder.find(x => x.id === id); if(!o) return;
  bearbeiteId = null; ereignisId = id; noteId = null;
  $("#dlgEintragTitel").textContent = "Ereignis ändern";
  eTyp.value = "E";
  eDatum.value = o.datum;
  eText.value = o.titel; eNotiz.value = o.notiz || ""; eOrt.value = o.raum || "";
  stundenAuswahlFuellen(o.slot);
  fachAuswahlFuellen("");
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.remove("hidden");
  dlgEintrag.showModal();
}
function vorschlagFach(){
  const idx = tagIndex(gewaehlt);
  if(idx === 5) return "";
  const f = (plan[wocheFuer(gewaehlt)][TAGE[idx]] || []).find(Boolean);
  return f ? f.fach : "";
}
$("#btnEintrag").onclick = () => eintragOeffnen(null, ansicht === "kalender" ? kalTag : gewaehlt);
$("#bEintragAb").onclick = () => dlgEintrag.close();
$("#bEintragSpeichern").onclick = () => {
  const datum = eDatum.value || iso(new Date());

  if(eTyp.value === "E"){                       // einmaliges Ereignis
    const titel = eText.value.trim();
    const slot = eStunde.value === "" ? null : +eStunde.value;
    if(ereignisId) sonder = sonder.filter(x => x.id !== ereignisId);
    else if(slot !== null) sonder = sonder.filter(x => !(x.datum === datum && x.slot === slot));
    if(titel) sonder.push({id:String(Date.now()), datum, slot, titel,
                           raum:eOrt.value.trim(), notiz:eNotiz.value.trim()});
    sichern(); dlgEintrag.close(); zeichne(); return;
  }

  const fach = (eFach.value === "__frei" ? eFachFrei.value : eFach.value).trim().toUpperCase();

  if(eTyp.value === "G"){                       // Note
    const wert = parseFloat(String(eWert.value).replace(",", "."));
    const grenze = cfg.notenSystem === "punkte15" ? [0,15] : [1,6];
    if(isNaN(wert) || wert < grenze[0] || wert > grenze[1]){
      alert(`Bitte einen Wert zwischen ${grenze[0]} und ${grenze[1]} eingeben.`); return;
    }
    if(!fach){ alert("Bitte ein Fach wählen."); return; }
    const nd = {fach, art:eNArt.value, wert, datum,
                titel:eText.value.trim(), notiz:eNotiz.value.trim()};
    if(noteId) Object.assign(noten.find(x => x.id === noteId), nd);
    else noten.push(Object.assign({id:String(Date.now()), geloescht:false}, nd));
    sichern(); dlgEintrag.close(); zeichne(); return;
  }

  const daten = {typ:eTyp.value, fach, datum, titel:eText.value.trim(), notiz:eNotiz.value.trim()};
  if(bearbeiteId) Object.assign(eintraege.find(x => x.id === bearbeiteId), daten);
  else eintraege.push(Object.assign({id:String(Date.now()), erledigt:false, geloescht:false}, daten));
  sichern(); dlgEintrag.close(); zeichne();
};
$("#bEintragWeg").onclick = () => {          // alles wandert ins Archiv, nichts sofort weg
  const ziel = ereignisId ? sonder.find(x => x.id === ereignisId)
             : noteId     ? noten.find(x => x.id === noteId)
             :              eintraege.find(x => x.id === bearbeiteId);
  if(ziel) ziel.geloescht = true;
  sichern(); dlgEintrag.close(); zeichne();
};

function listenKlick(e){
  const hak = e.target.closest("[data-hak]");
  if(hak){
    const it = eintraege.find(x => x.id === hak.dataset.hak);
    it.erledigt = hak.checked;
    it.erledigtAm = hak.checked ? iso(new Date()) : null;
    sichern(); zeichne(); return;
  }
  const ereignis = e.target.closest("[data-ereignis]");
  if(ereignis){ ereignisOeffnen(ereignis.dataset.ereignis); return; }
  const bea = e.target.closest("[data-bearbeite]");
  if(bea) eintragOeffnen(eintraege.find(x => x.id === bea.dataset.bearbeite));
}
["#tagListe","#kalListe","#einListe"].forEach(s => $(s).onclick = listenKlick);

/* Archiv: zurückholen oder endgültig entfernen */
$("#einListe").addEventListener("click", e => {
  const zurueck = e.target.closest("[data-zurueck]");
  if(zurueck){
    const [art, id] = zurueck.dataset.zurueck.split(":");
    const it = archivFinden(art, id);
    if(it){ it.geloescht = false; if(art === "eintrag"){ it.erledigt = false; it.erledigtAm = null; } }
    sichern(); zeichne(); return;
  }
  const weg = e.target.closest("[data-endgueltig]");
  if(weg && confirm("Endgültig löschen? Das lässt sich nicht rückgängig machen.")){
    const [art, id] = weg.dataset.endgueltig.split(":");
    if(art === "eintrag") eintraege = eintraege.filter(x => x.id !== id);
    else if(art === "ereignis") sonder = sonder.filter(x => x.id !== id);
    else noten = noten.filter(x => x.id !== id);
    sichern(); zeichne();
  }
});

/* ---------------------------------------------------------------
   Plan einfügen
---------------------------------------------------------------- */
function parseZelle(t){
  /* Erwartet:  FACH, RAUM (LEHRKRAFT)
     Steht in eckigen Klammern eine Klasse, wird sie ersatzweise übernommen. */
  const m = t.trim().match(/^(.+?),\s*(.+?)\s*([([])(.+?)[)\]]$/);
  if(!m) return null;
  const [, fach, raum, klammer, rest] = m;
  return {fach:fach.trim(), raum:raum.trim(),
          lk: klammer === "(" ? rest.trim() : "",
          klasse: klammer === "[" ? rest.trim() : ""};
}
function textLesen(text){
  const zeilen = text.split("\n").map(z => z.trim()).filter(z => z && z !== "-");
  const proStunde = {}; let std = null;
  for(const z of zeilen){
    const kopf = z.match(/^([0-9]{1,2})\s*(.*)$/);
    if(kopf && (kopf[2] === "" || parseZelle(kopf[2]))){
      std = kopf[1];
      if(kopf[2]) proStunde[std] = parseZelle(kopf[2]);
      continue;
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
      <div class="std">${sl.std.replace(/,/g,"/")}</div>
      <input type="text" data-f="fach" value="${esc(v.fach || "")}" placeholder="Fach" autocapitalize="characters">
      <input type="text" data-f="raum" value="${esc(v.raum || "")}" placeholder="Raum" autocapitalize="characters">
      <input type="text" data-f="lk"   value="${esc(v.lk   || "")}" placeholder="LK"   autocapitalize="characters">
    </div>`;
  }).join("");
}
function importAuslesen(){
  return [...document.querySelectorAll("#iTabelle .izeile")].map(z => ({
    fach: z.querySelector('[data-f=fach]').value.trim(),
    raum: z.querySelector('[data-f=raum]').value.trim(),
    lk:   z.querySelector('[data-f=lk]').value.trim()
  }));
}
function importLaden(){
  const woche = cfg.zweiWochen ? iWoche.value : "A";
  importTabelle((plan[woche][TAGE[+iTag.value]] || []).map(x => x || {}));
}
function importOeffnen(){
  iTag.innerHTML = TAGE.map((t,i) =>
    `<option value="${i}" ${i === Math.min(tagIndex(gewaehlt),4) ? "selected" : ""}>${LANG[t]}</option>`).join("");
  iWoche.value = wocheFuer(gewaehlt);
  $("#iWocheWrap").classList.toggle("hidden", !cfg.zweiWochen);
  iText.value = ""; $("#iErgebnis").textContent = "";
  importLaden();
  dlgImport.showModal();
}
iTag.onchange = importLaden;
iWoche.onchange = importLaden;

/* Text aus dem Schulportal in die Tabelle übertragen — noch nicht speichern,
   damit man vorher prüfen kann, ob alles richtig gelandet ist. */
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
$("#bImportAb").onclick = () => { dlgImport.close(); if(zurueckZuEinst){ zurueckZuEinst = false; $("#btnEinst").onclick(); } };
$("#bImportSpeichern").onclick = () => {
  const woche = cfg.zweiWochen ? iWoche.value : "A";
  const tag = TAGE[+iTag.value];
  importAuslesen().forEach((w,i) => {
    plan[woche][tag][i] = w.fach ? {fach:w.fach, raum:w.raum, lk:w.lk} : null;
  });
  sichern(); dlgImport.close();
  if(zurueckZuEinst){ zurueckZuEinst = false; zeichne(); $("#btnEinst").onclick(); return; }
  ansicht = "tag"; gewaehlt = plusTage(montagVon(gewaehlt), +iTag.value); zeichne();
};

/* ---------------------------------------------------------------
   Ferien und Feiertage — openholidaysapi.org, ohne Schlüssel
---------------------------------------------------------------- */
async function ferienLaden(land){
  const j = new Date().getFullYear();
  const von = `${j}-01-01`, bis = `${j+1}-12-31`;
  const url = a =>
    `https://openholidaysapi.org/${a}?countryIsoCode=DE&subdivisionCode=${land}` +
    `&languageIsoCode=DE&validFrom=${von}&validTo=${bis}`;
  const hole = async (a, typ) => {
    const r = await fetch(url(a), {headers:{accept:"application/json"}});
    if(!r.ok) throw new Error(a + ": " + r.status);
    return (await r.json()).map(x => ({
      von: x.startDate, bis: x.endDate, typ,
      name: (x.name.find(n => n.language === "DE") || x.name[0]).text
    }));
  };
  const [feier, schul] = await Promise.all([
    hole("PublicHolidays", "feiertag"), hole("SchoolHolidays", "ferien")
  ]);
  return [...feier, ...schul].sort((a,b) => a.von.localeCompare(b.von));
}
$("#sFerienLaden").onclick = async () => {
  const land = sLand.value;
  if(!land){ $("#sFerienStand").textContent = "Bitte zuerst ein Bundesland wählen."; return; }
  $("#sFerienStand").textContent = "Wird geladen …";
  try{
    ferien = await ferienLaden(land);
    cfg.land = land; sichern(); ferienStand(); zeichne();
  }catch(err){
    $("#sFerienStand").textContent = "Laden fehlgeschlagen. Internet prüfen und erneut versuchen.";
  }
};
$("#sFerienWeg").onclick = () => { ferien = []; sichern(); ferienStand(); zeichne(); };
const zeigDatum = s => s ? s.slice(8,10) + "." + s.slice(5,7) + "." + s.slice(0,4) : "";
function ferienStand(){
  $("#sFerienStand").textContent = ferien.length
    ? `${ferien.length} Einträge gespeichert, bis ${zeigDatum(ferien.at(-1).bis)}.`
    : "Noch nichts geladen.";
}

/* ---------------------------------------------------------------
   Einstellungen
---------------------------------------------------------------- */
function slotEditorZeichnen(slots){
  $("#slotEditor").innerHTML = slots.map((s,i) => `<div class="slot" data-slot="${i}">
    <input type="text" value="${s.std}" data-feld="std" inputmode="numeric">
    <input type="time" value="${s.von}" data-feld="von">
    <input type="time" value="${s.bis}" data-feld="bis">
    <button type="button" data-slotweg="${i}" aria-label="Zeile löschen">×</button>
  </div>`).join("");
}
function slotsAuslesen(){
  return [...document.querySelectorAll("#slotEditor .slot")].map(z => ({
    std: z.querySelector('[data-feld=std]').value.trim(),
    von: z.querySelector('[data-feld=von]').value,
    bis: z.querySelector('[data-feld=bis]').value
  })).filter(s => s.std && s.von && s.bis);
}
/* ---------------------------------------------------------------
   Profile bedienen
---------------------------------------------------------------- */
function profilKnopf(){
  $("#btnProfil").textContent = (profilName().trim()[0] || "P").toUpperCase();
  $("#btnProfil").setAttribute("aria-label", "Profil: " + profilName());
}
function zeichneProfile(){
  $("#profilListe").innerHTML = profile.map(x => `<li style="display:block;padding:0;border:0">
    <div class="profilzeile">
      <span class="name" data-wechsel="${x.id}">${esc(x.name)}</span>
      ${x.id === profilId ? '<span class="aktivmarke">aktiv</span>' : ""}
      <button class="mini" data-umbenennen="${x.id}">Name</button>
      ${profile.length > 1 ? `<button class="mini" data-profilweg="${x.id}"
         style="border-color:var(--red);color:var(--red)">×</button>` : ""}
    </div></li>`).join("");
}
$("#btnProfil").onclick = () => { pNeu.value = ""; zeichneProfile(); dlgProfil.showModal(); };
$("#bProfilAb").onclick = () => dlgProfil.close();
$("#bProfilNeu").onclick = () => {
  const name = pNeu.value.trim(); if(!name) return;
  const id = String(Date.now());
  profile.push({id, name}); profilId = id; profileSichern();
  zustandLaden(); normalisiere(); sichern();
  dlgProfil.close(); profilKnopf(); ansicht = "tag"; zeichne();
};
$("#profilListe").onclick = e => {
  const w = e.target.closest("[data-wechsel]");
  if(w){
    profilId = w.dataset.wechsel; profileSichern(); zustandLaden(); normalisiere();
    dlgProfil.close(); profilKnopf(); ansicht = "tag"; zeichne(); return;
  }
  const u = e.target.closest("[data-umbenennen]");
  if(u){
    const x = profile.find(y => y.id === u.dataset.umbenennen);
    const name = prompt("Neuer Name", x.name);
    if(name && name.trim()){ x.name = name.trim(); profileSichern(); zeichneProfile(); profilKnopf(); }
    return;
  }
  const d = e.target.closest("[data-profilweg]");
  if(d){
    const x = profile.find(y => y.id === d.dataset.profilweg);
    if(!confirm(`Profil „${x.name}" mit allen Daten löschen? Das lässt sich nicht rückgängig machen.`)) return;
    DATEN.forEach(k => { try{ localStorage.removeItem("p" + x.id + "_" + k); }catch(e){} });
    profile = profile.filter(y => y.id !== x.id);
    if(profilId === x.id) profilId = profile[0].id;
    profileSichern(); zustandLaden(); normalisiere();
    zeichneProfile(); profilKnopf(); zeichne();
  }
};

/* Aus den Einstellungen geöffnete Dialoge kehren dorthin zurück */
let zurueckZuEinst = false;

$("#btnEinst").onclick = () => {
  sKlasse.value = cfg.klasse;
  sZweiWochen.checked = cfg.zweiWochen;
  slotEditorZeichnen(cfg.slots);
  sNotenSystem.value = cfg.notenSystem || "note6";
  sAnteilM.value = Number(cfg.anteilM) || 0;
  anteilHinweis();
  anteilFaecherZeichnen();
  sLehrer.value  = paareText(cfg.lehrer);
  sFaecher.value = paareText(cfg.fachnamen);
  sLand.innerHTML = `<option value="">— wählen —</option>` +
    Object.entries(LAENDER).map(([k,v]) => `<option value="${k}" ${cfg.land === k ? "selected" : ""}>${v}</option>`).join("");
  ferienStand();
  sDaten.value = sicherungsText();
  $("#sVersion").textContent = BUILD;
  versionPruefen();
  $("#ankerJetzt").textContent =
    `Diese Woche ist KW ${kalenderwoche(new Date())}, also ${kalenderwoche(new Date()) % 2 === 1 ? "A" : "B"}.`;
  $("#ankerWrap").classList.toggle("hidden", !cfg.zweiWochen);
  dlgEinst.showModal();
};
sZweiWochen.onchange = () => $("#ankerWrap").classList.toggle("hidden", !sZweiWochen.checked);

/* Kürzel-Listen als Text: eine Zeile "KUERZEL = Name" */
function paareText(obj){
  return Object.entries(obj || {}).map(([k,v]) => `${k} = ${v}`).join("\n");
}
function textPaare(t){
  const o = {};
  String(t || "").split("\n").forEach(z => {
    const m = z.match(/^\s*([^=]+?)\s*=\s*(.+?)\s*$/);
    if(m) o[m[1].toUpperCase()] = m[2];
  });
  return o;
}
function anteilFaecherZeichnen(){
  const liste = notenFaecher();
  $("#sAnteilFaecher").innerHTML = liste.length
    ? liste.map(f => `<div class="anteilzeile">
        <span>${esc(fachName(f))}</span>
        <input type="number" min="0" max="100" step="5" data-anteilfach="${esc(f)}"
               placeholder="${Number(cfg.anteilM)||0}"
               value="${hatEigenenAnteil(f) ? cfg.anteile[f] : ""}">
      </div>`).join("")
    : `<p class="hinweis">Sobald Fächer im Plan stehen, erscheinen sie hier.</p>`;
}
function anteilFaecherLesen(){
  const o = {};
  document.querySelectorAll("[data-anteilfach]").forEach(el => {
    const v = el.value.trim();
    if(v !== "") o[el.dataset.anteilfach] = Math.max(0, Math.min(100, Number(v) || 0));
  });
  return o;
}
function anteilHinweis(){
  const m = Math.max(0, Math.min(100, Number(sAnteilM.value) || 0));
  $("#sAnteilHinweis").textContent = `${m} % mündlich, ${100 - m} % schriftlich.`;
}
sAnteilM.oninput = anteilHinweis;
sNotenSystem.onchange = () => {
  $("#eWertLabel").textContent = sNotenSystem.value === "punkte15" ? "Punkte 0–15" : "Note 1–6";
};
$("#sImport").onclick = () => { zurueckZuEinst = true; dlgEinst.close(); importOeffnen(); };
$("#slotEditor").onclick = e => {
  const b = e.target.closest("[data-slotweg]"); if(!b) return;
  const s = slotsAuslesen(); s.splice(+b.dataset.slotweg, 1); slotEditorZeichnen(s);
};
$("#sSlotPlus").onclick = () => {
  const s = slotsAuslesen();
  s.push({std:String(s.length+1), von:"15:30", bis:"16:15"});
  slotEditorZeichnen(s);
};
document.querySelectorAll("[data-vorlage]").forEach(b =>
  b.onclick = () => slotEditorZeichnen(VORLAGEN[b.dataset.vorlage]));
function sicherungsText(){ return JSON.stringify({cfg, plan, eintraege, ferien, sonder, noten}, null, 2); }
$("#sDatei").onclick = () => {
  const url = URL.createObjectURL(new Blob([sicherungsText()], {type:"application/json"}));
  const a = document.createElement("a");
  a.href = url; a.download = `stundenplan-${iso(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#sDateiWahl").onclick = () => sDateiLesen.click();
sDateiLesen.onchange = () => {
  const f = sDateiLesen.files && sDateiLesen.files[0];
  if(!f) return;
  const leser = new FileReader();
  leser.onload = () => { sDaten.value = leser.result; $("#sLaden").click(); };
  leser.onerror = () => alert("Datei ließ sich nicht lesen.");
  leser.readAsText(f);
  sDateiLesen.value = "";
};
$("#sLaden").onclick = () => {
  try{
    const d = JSON.parse(sDaten.value);
    if(d.cfg) cfg = Object.assign({}, STANDARD, d.cfg);
    if(d.plan) plan = d.plan;
    if(Array.isArray(d.eintraege)) eintraege = d.eintraege;
    if(Array.isArray(d.ferien)) ferien = d.ferien;
    if(Array.isArray(d.sonder)) sonder = d.sonder;
    if(Array.isArray(d.noten)) noten = d.noten;
    sichern(); dlgEinst.close(); zeichne();
  }catch(e){ alert("Der Text lässt sich nicht lesen."); }
};
$("#sReset").onclick = () => {
  if(!confirm("Plan, Einträge, Noten und Archiv löschen?")) return;
  cfg = Object.assign({}, STANDARD); plan = {}; eintraege = []; ferien = []; sonder = []; noten = [];
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};
$("#bEinstAb").onclick = () => dlgEinst.close();
$("#bEinstSpeichern").onclick = () => {
  const neu = slotsAuslesen();
  cfg.klasse = sKlasse.value.trim();
  cfg.zweiWochen = sZweiWochen.checked;
  if(neu.length) cfg.slots = neu;
  cfg.land = sLand.value;
  cfg.notenSystem = sNotenSystem.value;
  cfg.anteilM = Math.max(0, Math.min(100, Number(sAnteilM.value) || 0));
  cfg.anteile = anteilFaecherLesen();
  cfg.lehrer = textPaare(sLehrer.value);
  cfg.fachnamen = textPaare(sFaecher.value);
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};

/* ---------------------------------------------------------------
   Start
---------------------------------------------------------------- */
let letzterTag = iso(new Date());
setInterval(() => {
  const jetzt = iso(new Date());
  if(jetzt !== letzterTag){ letzterTag = jetzt; gewaehlt = new Date(); zeichne(); }
  else if(ansicht === "tag") zeichneFortschritt();
}, 30000);
document.addEventListener("visibilitychange", () => { if(!document.hidden) zeichne(); });

/* ---------------------------------------------------------------
   Version — eine einzige Quelle: sw.js
---------------------------------------------------------------- */
function mitZeitgrenze(versprechen, ms){
  return Promise.race([versprechen, new Promise(r => setTimeout(() => r(null), ms))]);
}
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
    const t = await (await fetch("sw.js", {cache:"no-store"})).text();
    const m = t.match(/VERSION\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
  }catch(e){ return null; }
}
async function versionPruefen(){
  const [laeuft, server] = await Promise.all([laufendeVersion(), serverVersion()]);
  BUILD = laeuft || server || "—";
  const veraltet = laeuft && server && laeuft !== server;
  const text = veraltet ? `${laeuft} · ${server} verfügbar — tippen zum Aktualisieren`
                        : "Wischen wechselt die Ansicht · " + BUILD;
  const w = $("#wischText");
  if(w){
    w.textContent = text;
    w.style.color = veraltet ? "var(--red)" : "";
    w.onclick = veraltet ? aktualisieren : null;
  }
  const v = $("#sVersion");
  if(v) v.textContent = veraltet ? `${laeuft} (neu: ${server})` : BUILD;
  return {laeuft, server, veraltet};
}
async function aktualisieren(){
  try{
    const reg = await navigator.serviceWorker.getRegistration();
    if(reg){
      await reg.update();
      if(reg.waiting) reg.waiting.postMessage("sofort");
    }
  }catch(e){}
  location.reload();
}

normalisiere();
profilKnopf();
zeichne();
versionPruefen();
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
