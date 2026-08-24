/* =====================================================================
   Stundenplan — gesamte Logik
   Nichts ist auf eine bestimmte Schule zugeschnitten. Fächer entstehen
   allein aus dem, was eingetragen wird. Raster, Klasse, Wochenwechsel
   und Bundesland stehen in den Einstellungen.
   ===================================================================== */

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
  ankerA: null,      // ISO-Montag der A-Woche; wird beim ersten Antippen gesetzt
  land: ""           // z.B. "DE-NI"
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
  lies(k, standard){
    try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : standard; }
    catch(e){ return k in this.puffer ? this.puffer[k] : standard; }
  },
  schreib(k, v){
    this.puffer[k] = v;
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
  }
};

let cfg       = Object.assign({}, STANDARD, Speicher.lies("cfg", {}));
let plan      = Speicher.lies("plan", {});
let eintraege = Speicher.lies("eintraege", []);
let ferien    = Speicher.lies("ferien", []);   // [{von,bis,name,typ}]

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
function wocheFuer(d){
  if(!cfg.zweiWochen || !cfg.ankerA) return "A";
  const diff = Math.round((montagVon(d) - montagVon(new Date(cfg.ankerA + "T12:00"))) / (7*864e5));
  return ((diff % 2) + 2) % 2 === 0 ? "A" : "B";
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
  eintraege.forEach(e => { if(e.geloescht === undefined) e.geloescht = false; });
}
function sichern(){
  Speicher.schreib("cfg", cfg); Speicher.schreib("plan", plan);
  Speicher.schreib("eintraege", eintraege); Speicher.schreib("ferien", ferien);
}
function faecher(){
  const s = new Set();
  ["A","B"].forEach(w => TAGE.forEach(t => (plan[w][t]||[]).forEach(x => x && x.fach && s.add(x.fach))));
  return [...s].sort();
}
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
  $("#rTag").setAttribute("aria-pressed", ansicht === "tag");
  $("#rKal").setAttribute("aria-pressed", ansicht === "kalender");
  $("#rEin").setAttribute("aria-pressed", ansicht === "eintraege");
  $("#btnEdit").classList.toggle("hidden", ansicht !== "tag");
  if(ansicht === "tag") zeichneTag();
  else if(ansicht === "kalender") zeichneKalender();
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
      return `<div class="we-teil"><div class="eyebrow">${n} ${zwei(d.getDate())}.${zwei(d.getMonth()+1)}.</div>
        ${es.length ? es.map(e => `<div style="margin-top:8px"><span class="khn">${e.typ}</span>
          <span style="margin-left:7px">${e.fach ? esc(e.fach) + " — " : ""}${esc(e.titel) || ART[e.typ]}</span></div>`).join("")
        : `<div class="detail" style="margin-top:6px">frei</div>`}</div>`;
    }).join("");
  } else {
    const tag = TAGE[idx];
    $("#plan").innerHTML = cfg.slots.map((s,i) => {
      const f = plan[woche][tag][i];
      const es = eintraegeAm(gewaehlt).filter(e => !e.erledigt && f && e.fach &&
                   e.fach.toUpperCase() === f.fach.toUpperCase());
      const zeichen = [...new Set(es.map(e => e.typ))].map(t => `<span class="khn">${t}</span>`).join("");
      return `<button type="button" class="block ${istAktuellerSlot(i) ? "jetzt" : ""}" data-block="${i}">
        <div class="zeit"><b>${s.von}</b>${s.bis}</div>
        <div>
          <div class="fach ${f ? "" : "leer"}">${f ? esc(f.fach) : "frei"}</div>
          <div class="detail">${s.std.replace(/,/g,"/")}${f ? ` · ${esc(f.raum) || "—"}${f.lk ? " · " + esc(f.lk) : ""}` : ""}</div>
          ${zeichen ? `<div class="marker">${zeichen}</div>` : ""}
        </div></button>`;
    }).join("");
  }

  zeichneFortschritt();
  zeichneListe("#tagListe", "#tagNix", eintraegeAm(gewaehlt));
}

function istAktuellerSlot(i){
  if(!gleich(gewaehlt, new Date())) return false;
  const n = new Date(), jetzt = n.getHours()*60 + n.getMinutes();
  return jetzt >= minuten(cfg.slots[i].von) && jetzt < minuten(cfg.slots[i].bis);
}

function zeichneFortschritt(){
  const box = $("#fortschritt");
  const idx = tagIndex(gewaehlt);
  if(!gleich(gewaehlt, new Date()) || idx === 5 || !cfg.slots.length || freiAm(gewaehlt)){
    box.classList.add("hidden"); return;
  }
  box.classList.remove("hidden");
  const n = new Date(), jetzt = n.getHours()*60 + n.getMinutes();
  const start = minuten(cfg.slots[0].von), ende = minuten(cfg.slots.at(-1).bis);
  $("#balkenFuell").style.width = (Math.max(0, Math.min(1, (jetzt-start)/(ende-start)))*100).toFixed(1) + "%";

  const tag = TAGE[idx], woche = wocheFuer(gewaehlt);
  const belegt = cfg.slots.map((s,i) => ({s, f: plan[woche][tag][i]})).filter(x => x.f);
  const letzte = belegt.length ? minuten(belegt.at(-1).s.bis) : ende;

  let links, rechts;
  if(jetzt < start){ links = "Beginnt um " + cfg.slots[0].von; rechts = `noch ${start - jetzt} min`; }
  else if(jetzt >= letzte){ links = "Schule aus"; rechts = ""; }
  else {
    const i = cfg.slots.findIndex(s => jetzt >= minuten(s.von) && jetzt < minuten(s.bis));
    if(i >= 0){
      const f = plan[woche][tag][i];
      links = f ? `<b>${esc(f.fach)}</b>${f.raum ? " · " + esc(f.raum) : ""}` : "Freistunde";
      rechts = `noch ${minuten(cfg.slots[i].bis) - jetzt} min`;
    } else {
      const naechster = cfg.slots.find(s => minuten(s.von) > jetzt);
      links = "Pause"; rechts = naechster ? `weiter um ${naechster.von}` : "";
    }
  }
  $("#fortLinks").innerHTML = links;
  $("#fortRechts").textContent = rechts;
}

function zeichneListe(sel, nixSel, liste){
  $(sel).innerHTML = liste.map(e => {
    const d = new Date(e.datum + "T12:00");
    return `<li class="${e.erledigt ? "weg" : ""}">
      <input type="checkbox" class="hak" data-hak="${e.id}" ${e.erledigt ? "checked" : ""} aria-label="Erledigt">
      <div class="wachs" data-bearbeite="${e.id}">
        <div class="kopf"><span class="khn ${e.erledigt ? "aus" : ""}">${e.typ}</span>
          <span class="titel">${e.fach ? esc(e.fach) + " — " : ""}${esc(e.titel) || ART[e.typ]}</span></div>
        ${e.notiz ? `<div class="notiz">${esc(e.notiz)}</div>` : ""}
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
    const zeichen = [...new Set(es.map(e => e.typ))].map(t => `<i>${t}</i>`).join("");
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
  zeichneListe("#kalListe", "#kalNix", eintraegeAm(kalTag));
}

function zeichneEintraege(){
  const heuteIso = iso(new Date());
  const sortiert = t => aktiv()
    .filter(e => e.typ === t && (!e.erledigt || e.datum >= heuteIso))
    .sort((a,b) => (a.erledigt - b.erledigt) || a.datum.localeCompare(b.datum));
  zeichneListe("#listeH", "#nixH", sortiert("H"));
  zeichneListe("#listeK", "#nixK", sortiert("K"));
  zeichneListe("#listeN", "#nixN", sortiert("N"));

  const archiv = eintraege.filter(e => e.geloescht)
    .sort((a,b) => b.datum.localeCompare(a.datum));
  $("#listeArchiv").innerHTML = archiv.map(e => {
    const d = new Date(e.datum + "T12:00");
    return `<li>
      <div class="wachs">
        <div class="kopf"><span class="khn aus">${e.typ}</span>
          <span class="titel" style="color:var(--muted)">${e.fach ? esc(e.fach) + " — " : ""}${esc(e.titel) || ART[e.typ]}</span></div>
        <div class="wann">${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>
      </div>
      <button class="mini" data-zurueck="${e.id}">Zurück</button>
      <button class="mini" data-endgueltig="${e.id}" style="border-color:var(--red);color:var(--red)">Löschen</button>
    </li>`;
  }).join("");
  $("#nixArchiv").hidden = archiv.length > 0;
}

/* ---------------------------------------------------------------
   Navigation
---------------------------------------------------------------- */
$("#rTag").onclick = () => { ansicht = "tag"; zeichne(); };
$("#rKal").onclick = () => { ansicht = "kalender"; kalMonat = new Date(gewaehlt); kalTag = new Date(gewaehlt); zeichne(); };
$("#rEin").onclick = () => { ansicht = "eintraege"; zeichne(); };
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

/* Wischen zwischen den Tagen -------------------------------------- */
(function(){
  let x0 = null, y0 = null;
  const flaeche = $("#ansichtTag");
  flaeche.addEventListener("touchstart", e => {
    if(e.touches.length !== 1){ x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, {passive:true});
  flaeche.addEventListener("touchend", e => {
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if(Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;  // eher gescrollt
    gewaehlt = plusTage(gewaehlt, dx < 0 ? 1 : -1);
    zeichne();
  }, {passive:true});
})();

/* ---------------------------------------------------------------
   Stunde antippen — bearbeiten oder schnell eintragen
---------------------------------------------------------------- */
let offenerBlock = 0;

$("#plan").onclick = e => {
  const b = e.target.closest("[data-block]"); if(!b) return;
  offenerBlock = +b.dataset.block;
  bearbeiten ? blockDialog() : schnellDialog();
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
  if(!fach){ blockDialog(); return; }   // leeres Feld: direkt zum Ausfüllen öffnen
  const s = cfg.slots[offenerBlock];
  $("#schnellTitel").textContent = fach;
  $("#schnellZeit").textContent = `${s.von} – ${s.bis}`;
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

function eintragOeffnen(e, datum, typ, fach){
  bearbeiteId = e ? e.id : null;
  $("#dlgEintragTitel").textContent = e ? "Eintrag ändern" : "Neuer Eintrag";
  eTyp.value   = e ? e.typ : (typ || "H");
  eDatum.value = e ? e.datum : iso(datum || gewaehlt);
  eText.value  = e ? (e.titel || "") : "";
  eNotiz.value = e ? (e.notiz || "") : "";
  fachAuswahlFuellen(e ? e.fach : (fach !== undefined ? fach : vorschlagFach()));
  datumFeldText(); datumWahlOeffnen(false);
  $("#bEintragWeg").classList.toggle("hidden", !e);
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
  const fach = (eFach.value === "__frei" ? eFachFrei.value : eFach.value).trim().toUpperCase();
  const daten = {typ:eTyp.value, fach, datum:eDatum.value || iso(new Date()),
                 titel:eText.value.trim(), notiz:eNotiz.value.trim()};
  if(bearbeiteId) Object.assign(eintraege.find(x => x.id === bearbeiteId), daten);
  else eintraege.push(Object.assign({id:String(Date.now()), erledigt:false, geloescht:false}, daten));
  sichern(); dlgEintrag.close(); zeichne();
};
$("#bEintragWeg").onclick = () => {                 // ins Archiv, nicht endgültig
  const e = eintraege.find(x => x.id === bearbeiteId);
  if(e) e.geloescht = true;
  sichern(); dlgEintrag.close(); zeichne();
};

function listenKlick(e){
  const hak = e.target.closest("[data-hak]");
  if(hak){
    const it = eintraege.find(x => x.id === hak.dataset.hak);
    it.erledigt = hak.checked; sichern(); zeichne(); return;
  }
  const bea = e.target.closest("[data-bearbeite]");
  if(bea) eintragOeffnen(eintraege.find(x => x.id === bea.dataset.bearbeite));
}
["#tagListe","#kalListe","#listeH","#listeK","#listeN"].forEach(s => $(s).onclick = listenKlick);

/* Archiv */
$("#btnArchiv").onclick = () => {
  const box = $("#archivBox"), auf = box.classList.contains("hidden");
  box.classList.toggle("hidden", !auf);
  $("#btnArchiv").textContent = auf ? "Verbergen" : "Anzeigen";
};
$("#listeArchiv").onclick = e => {
  const zurueck = e.target.closest("[data-zurueck]");
  if(zurueck){
    const it = eintraege.find(x => x.id === zurueck.dataset.zurueck);
    if(it) it.geloescht = false;
    sichern(); zeichne(); return;
  }
  const weg = e.target.closest("[data-endgueltig]");
  if(weg && confirm("Endgültig löschen? Das lässt sich nicht rückgängig machen.")){
    eintraege = eintraege.filter(x => x.id !== weg.dataset.endgueltig);
    sichern(); zeichne();
  }
};

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
function importOeffnen(){
  iTag.innerHTML = TAGE.map((t,i) =>
    `<option value="${i}" ${i === Math.min(tagIndex(gewaehlt),4) ? "selected" : ""}>${LANG[t]}</option>`).join("");
  iWoche.value = wocheFuer(gewaehlt);
  $("#iWocheWrap").classList.toggle("hidden", !cfg.zweiWochen);
  iText.value = ""; $("#iErgebnis").textContent = "";
  dlgImport.showModal();
}
$("#bImportAb").onclick = () => dlgImport.close();
$("#bImportLesen").onclick = () => {
  const proStunde = textLesen(iText.value);
  const woche = cfg.zweiWochen ? iWoche.value : "A";
  const tag = TAGE[+iTag.value];
  let treffer = 0;
  cfg.slots.forEach((s,i) => {
    const z = s.std.split(",").map(x => proStunde[x.trim()]).find(Boolean);
    if(z){ plan[woche][tag][i] = {fach:z.fach, raum:z.raum, lk:z.lk || z.klasse}; treffer++; }
  });
  sichern();
  if(treffer){
    dlgImport.close();
    ansicht = "tag"; gewaehlt = plusTage(montagVon(gewaehlt), +iTag.value); zeichne();
  } else $("#iErgebnis").textContent = "Nichts erkannt. Die Stundennummern müssen mitkopiert sein.";
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
function ferienStand(){
  $("#sFerienStand").textContent = ferien.length
    ? `${ferien.length} Einträge gespeichert, bis ${ferien.at(-1).bis}.`
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
$("#btnEinst").onclick = () => {
  sKlasse.value = cfg.klasse;
  sZweiWochen.checked = cfg.zweiWochen;
  slotEditorZeichnen(cfg.slots);
  sLand.innerHTML = `<option value="">— wählen —</option>` +
    Object.entries(LAENDER).map(([k,v]) => `<option value="${k}" ${cfg.land === k ? "selected" : ""}>${v}</option>`).join("");
  ferienStand();
  sDaten.value = JSON.stringify({cfg, plan, eintraege, ferien});
  $("#ankerWrap").classList.toggle("hidden", !cfg.zweiWochen);
  dlgEinst.showModal();
};
sZweiWochen.onchange = () => $("#ankerWrap").classList.toggle("hidden", !sZweiWochen.checked);
$("#sImport").onclick = () => { dlgEinst.close(); importOeffnen(); };
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
$("#sAnkerA").onclick = () => { cfg.ankerA = iso(montagVon(new Date())); sichern();
  $("#sAnkerA").style.color = "var(--red)"; $("#sAnkerB").style.color = ""; };
$("#sAnkerB").onclick = () => { cfg.ankerA = iso(plusTage(montagVon(new Date()), -7)); sichern();
  $("#sAnkerB").style.color = "var(--red)"; $("#sAnkerA").style.color = ""; };
$("#sLaden").onclick = () => {
  try{
    const d = JSON.parse(sDaten.value);
    if(d.cfg) cfg = Object.assign({}, STANDARD, d.cfg);
    if(d.plan) plan = d.plan;
    if(Array.isArray(d.eintraege)) eintraege = d.eintraege;
    if(Array.isArray(d.ferien)) ferien = d.ferien;
    sichern(); dlgEinst.close(); zeichne();
  }catch(e){ alert("Der Text lässt sich nicht lesen."); }
};
$("#sReset").onclick = () => {
  if(!confirm("Plan, Einträge und Archiv löschen?")) return;
  cfg = Object.assign({}, STANDARD); plan = {}; eintraege = []; ferien = [];
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};
$("#bEinstAb").onclick = () => dlgEinst.close();
$("#bEinstSpeichern").onclick = () => {
  const neu = slotsAuslesen();
  cfg.klasse = sKlasse.value.trim();
  cfg.zweiWochen = sZweiWochen.checked;
  if(cfg.zweiWochen && !cfg.ankerA) cfg.ankerA = iso(montagVon(new Date()));
  if(neu.length) cfg.slots = neu;
  cfg.land = sLand.value;
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

normalisiere();
zeichne();
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
