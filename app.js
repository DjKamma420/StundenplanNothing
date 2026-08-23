/* =====================================================================
   Stundenplan — gesamte Logik
   Alles Schulspezifische steht in STANDARD und lässt sich in den
   Einstellungen ändern. Für eine andere Schule muss hier nichts
   angefasst werden.
   ===================================================================== */

const STANDARD = {
  klasse: "FOT25-2",
  /* std = welche Stundennummern dieses Feld abdeckt.
     "1,2" = ein 90-Minuten-Block. "1" = eine Einzelstunde. */
  slots: [
    {std:"1,2", von:"08:10", bis:"09:40"},
    {std:"3,4", von:"10:00", bis:"11:30"},
    {std:"5,6", von:"11:45", bis:"13:15"},
    {std:"7,8", von:"13:45", bis:"15:15"}
  ],
  zweiWochen: true,
  ankerA: "2026-08-24"   // ein Montag, der zur A-Woche gehört
};

const VORLAGEN = {
  block90: STANDARD.slots,
  einzel45: [
    {std:"1", von:"08:10", bis:"08:55"}, {std:"2", von:"08:55", bis:"09:40"},
    {std:"3", von:"10:00", bis:"10:45"}, {std:"4", von:"10:45", bis:"11:30"},
    {std:"5", von:"11:45", bis:"12:30"}, {std:"6", von:"12:30", bis:"13:15"},
    {std:"7", von:"13:45", bis:"14:30"}, {std:"8", von:"14:30", bis:"15:15"}
  ]
};

const TAGE = ["MO","DI","MI","DO","FR"];
const LANG = {MO:"Montag", DI:"Dienstag", MI:"Mittwoch", DO:"Donnerstag", FR:"Freitag", WE:"Wochenende"};
const ART = {H:"Hausaufgabe", K:"Klausur", N:"Notiz"};

/* ---------------------------------------------------------------
   Speicher — localStorage, mit Rückfall auf den Arbeitsspeicher
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

let ansicht   = "tag";
let gewaehlt  = new Date();     // gewählter Tag in der Tagesansicht
let kalMonat  = new Date();     // angezeigter Monat im Kalender
let kalTag    = new Date();     // angetipptes Feld im Kalender

/* ---------------------------------------------------------------
   Datum — bewusst ohne toISOString(), das verschiebt die Zeitzone
---------------------------------------------------------------- */
const zwei = n => String(n).padStart(2,"0");
const iso  = d => `${d.getFullYear()}-${zwei(d.getMonth()+1)}-${zwei(d.getDate())}`;
const heute = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const gleich = (a,b) => iso(a) === iso(b);

function montagVon(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  const wt = x.getDay() === 0 ? 7 : x.getDay();   // Mo=1 … So=7
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

/** "A" oder "B" für das Datum, gemessen am gesetzten Anker */
function wocheFuer(d){
  if(!cfg.zweiWochen) return "A";
  const diff = Math.round((montagVon(d) - montagVon(new Date(cfg.ankerA + "T12:00"))) / (7*864e5));
  return ((diff % 2) + 2) % 2 === 0 ? "A" : "B";
}

const minuten = s => { const [h,m] = s.split(":").map(Number); return h*60 + m; };
const alsZeit = m => `${zwei(Math.floor(m/60))}:${zwei(m%60)}`;

/* ---------------------------------------------------------------
   Datenpflege
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
}
function sichern(){ Speicher.schreib("cfg", cfg); Speicher.schreib("plan", plan); Speicher.schreib("eintraege", eintraege); }

function faecher(){
  const s = new Set();
  ["A","B"].forEach(w => TAGE.forEach(t => plan[w][t].forEach(x => x && x.fach && s.add(x.fach))));
  return [...s].sort();
}
const eintraegeAm = d => eintraege
  .filter(e => e.datum === iso(d))
  .sort((a,b) => (a.erledigt - b.erledigt) || "KHN".indexOf(a.typ) - "KHN".indexOf(b.typ));

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
  $("#rTag").setAttribute("aria-pressed", ansicht === "tag");
  $("#rKal").setAttribute("aria-pressed", ansicht === "kalender");
  ansicht === "tag" ? zeichneTag() : zeichneKalender();
}

function zeichneTag(){
  const idx = tagIndex(gewaehlt);
  const woche = wocheFuer(gewaehlt);

  $("#klasseAnzeige").textContent = cfg.klasse || "—";
  $("#titel").innerHTML = (idx === 5 ? "Wochenende" : LANG[TAGE[idx]]) +
    ` <span>${zwei(gewaehlt.getDate())}.${zwei(gewaehlt.getMonth()+1)}.</span>`;
  $("#kwLabel").textContent = "KW " + kalenderwoche(gewaehlt);
  $("#abLabel").classList.toggle("hidden", !cfg.zweiWochen);
  $("#abLabel").textContent = woche;

  /* Tagesreiter */
  const mo = montagVon(gewaehlt);
  const marken = [...TAGE, "WE"].map((t,i) => {
    const d = plusTage(mo, i === 5 ? 5 : i);
    const istHeute = gleich(d, new Date()) || (i === 5 && tagIndex(new Date()) === 5 && gleich(montagVon(new Date()), mo));
    const hat = (i === 5 ? [plusTage(mo,5), plusTage(mo,6)] : [d])
                  .flatMap(x => eintraegeAm(x)).filter(e => !e.erledigt);
    const zeichen = [...new Set(hat.map(e => e.typ))].join("");
    return `<button type="button" data-tag="${i}" aria-pressed="${i === idx}">${t}
      ${istHeute ? '<span class="punkt"></span>' : (zeichen ? `<span class="khn" style="border:0;padding:0;display:block;margin-top:4px">${zeichen}</span>` : "")}
    </button>`;
  }).join("");
  $("#tage").innerHTML = marken;

  /* Blöcke oder Wochenende */
  if(idx === 5){
    const sa = plusTage(mo,5), so = plusTage(mo,6);
    $("#plan").innerHTML = [["Samstag",sa],["Sonntag",so]].map(([n,d]) => {
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
      const zeichen = [...new Set(es.map(e => e.typ))]
        .map(t => `<span class="khn">${t}</span>`).join("");
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
  const jetzt = new Date().getHours()*60 + new Date().getMinutes();
  const s = cfg.slots[i];
  return jetzt >= minuten(s.von) && jetzt < minuten(s.bis);
}

function zeichneFortschritt(){
  const box = $("#fortschritt");
  const idx = tagIndex(gewaehlt);
  if(!gleich(gewaehlt, new Date()) || idx === 5 || !cfg.slots.length){ box.classList.add("hidden"); return; }
  box.classList.remove("hidden");

  const n = new Date(); const jetzt = n.getHours()*60 + n.getMinutes();
  const start = minuten(cfg.slots[0].von), ende = minuten(cfg.slots.at(-1).bis);
  const anteil = Math.max(0, Math.min(1, (jetzt - start) / (ende - start)));
  $("#balkenFuell").style.width = (anteil*100).toFixed(1) + "%";

  const tag = TAGE[idx], woche = wocheFuer(gewaehlt);
  const belegt = cfg.slots.map((s,i) => ({s, f: plan[woche][tag][i]})).filter(x => x.f);
  const letzte = belegt.length ? minuten(belegt.at(-1).s.bis) : ende;

  let links, rechts;
  if(jetzt < start){
    links = "Beginnt um " + cfg.slots[0].von;
    rechts = `noch ${start - jetzt} min`;
  } else if(jetzt >= letzte){
    links = "Schule aus"; rechts = "";
  } else {
    const i = cfg.slots.findIndex(s => jetzt >= minuten(s.von) && jetzt < minuten(s.bis));
    if(i >= 0){
      const f = plan[woche][tag][i];
      links = f ? `<b>${esc(f.fach)}</b>${f.raum ? " · " + esc(f.raum) : ""}` : "Freistunde";
      rechts = `noch ${minuten(cfg.slots[i].bis) - jetzt} min`;
    } else {
      const naechster = cfg.slots.find(s => minuten(s.von) > jetzt);
      links = "Pause";
      rechts = naechster ? `weiter um ${naechster.von}` : "";
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
  const erster = new Date(kalMonat.getFullYear(), kalMonat.getMonth(), 1);
  const start = montagVon(erster);

  let html = ["Mo","Di","Mi","Do","Fr","Sa","So"].map(t => `<div class="wt">${t}</div>`).join("");
  for(let i = 0; i < 42; i++){
    const d = plusTage(start, i);
    const fremd = d.getMonth() !== kalMonat.getMonth();
    const es = eintraegeAm(d).filter(e => !e.erledigt);
    const zeichen = [...new Set(es.map(e => e.typ))].map(t => `<i>${t}</i>`).join("");
    html += `<button type="button" class="tagfeld ${fremd ? "fremd" : ""} ${gleich(d, new Date()) ? "heute" : ""}"
       aria-pressed="${gleich(d, kalTag)}" data-kal="${iso(d)}">
       ${d.getDate()}<span class="zeichen">${zeichen}</span></button>`;
  }
  $("#gitter").innerHTML = html;

  $("#kalTagLabel").textContent = kalTag.toLocaleDateString("de-DE",
    {weekday:"long", day:"2-digit", month:"long"});
  zeichneListe("#kalListe", "#kalNix", eintraegeAm(kalTag));

  const ab = iso(heute());
  zeichneListe("#naechste", "#naechsteNix",
    eintraege.filter(e => !e.erledigt && e.datum >= ab)
             .sort((a,b) => a.datum.localeCompare(b.datum)).slice(0,12));
}

/* ---------------------------------------------------------------
   Bedienung — Ansicht und Navigation
---------------------------------------------------------------- */
$("#rTag").onclick = () => { ansicht = "tag"; zeichne(); };
$("#rKal").onclick = () => { ansicht = "kalender"; kalMonat = new Date(gewaehlt); kalTag = new Date(gewaehlt); zeichne(); };
$("#btnHeute").onclick = () => { gewaehlt = new Date(); zeichne(); };
$("#wochePlus").onclick  = () => { gewaehlt = plusTage(gewaehlt, -7); zeichne(); };
$("#wocheMinus").onclick = () => { gewaehlt = plusTage(gewaehlt,  7); zeichne(); };
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
  kalTag = new Date(b.dataset.kal + "T12:00");
  zeichne();
};

/* ---------------------------------------------------------------
   Block bearbeiten
---------------------------------------------------------------- */
let offenerBlock = 0;
$("#plan").onclick = e => {
  const b = e.target.closest("[data-block]"); if(!b) return;
  offenerBlock = +b.dataset.block;
  const woche = wocheFuer(gewaehlt), tag = TAGE[tagIndex(gewaehlt)];
  const f = plan[woche][tag][offenerBlock] || {};
  fFach.value = f.fach || ""; fRaum.value = f.raum || ""; fLK.value = f.lk || "";
  $("#dlgBlockTitel").textContent = `${LANG[tag]}, ${cfg.slots[offenerBlock].std.replace(/,/g,"/")}. Stunde`;
  $("#dlgBlockZeit").textContent = `${cfg.slots[offenerBlock].von} – ${cfg.slots[offenerBlock].bis}`;
  const h = $("#hinweisWoche");
  h.classList.toggle("hidden", !cfg.zweiWochen);
  h.textContent = `Gilt nur für die ${woche}-Woche. Die andere Woche hat einen eigenen Eintrag.`;
  dlgBlock.showModal();
};
$("#bBlockAb").onclick = () => dlgBlock.close();
$("#bBlockSpeichern").onclick = () => {
  const woche = wocheFuer(gewaehlt), tag = TAGE[tagIndex(gewaehlt)];
  const fach = fFach.value.trim();
  plan[woche][tag][offenerBlock] = fach ? {fach, raum:fRaum.value.trim(), lk:fLK.value.trim()} : null;
  sichern(); dlgBlock.close(); zeichne();
};
$("#bBlockLeeren").onclick = () => {
  plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock] = null;
  sichern(); dlgBlock.close(); zeichne();
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
eFach.onchange = freiUmschalten;

function eintragOeffnen(e, datum){
  bearbeiteId = e ? e.id : null;
  $("#dlgEintragTitel").textContent = e ? "Eintrag ändern" : "Neuer Eintrag";
  eTyp.value   = e ? e.typ : "H";
  eDatum.value = e ? e.datum : iso(datum || gewaehlt);
  eText.value  = e ? (e.titel || "") : "";
  eNotiz.value = e ? (e.notiz || "") : "";
  fachAuswahlFuellen(e ? e.fach : vorschlagFach());
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
  const fach = eFach.value === "__frei" ? eFachFrei.value.trim().toUpperCase()
             : eFach.value.trim().toUpperCase();
  const daten = {typ:eTyp.value, fach, datum:eDatum.value || iso(new Date()),
                 titel:eText.value.trim(), notiz:eNotiz.value.trim()};
  if(bearbeiteId){
    Object.assign(eintraege.find(x => x.id === bearbeiteId), daten);
  } else {
    eintraege.push(Object.assign({id:String(Date.now()), erledigt:false}, daten));
  }
  sichern(); dlgEintrag.close(); zeichne();
};
$("#bEintragWeg").onclick = () => {
  eintraege = eintraege.filter(x => x.id !== bearbeiteId);
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
["#tagListe","#kalListe","#naechste"].forEach(s => $(s).onclick = listenKlick);

/* ---------------------------------------------------------------
   Plan einfügen
   Erkennt "WZET, B005 (CH)"        → Lehrkraft in runden Klammern
   und     "SOET, C107 [FOS25_PO_A]" → Klasse in eckigen Klammern
---------------------------------------------------------------- */
function parseZelle(t){
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
$("#btnImport").onclick = () => {
  iTag.innerHTML = TAGE.map((t,i) => `<option value="${i}" ${i === Math.min(tagIndex(gewaehlt),4) ? "selected" : ""}>${LANG[t]}</option>`).join("");
  iWoche.value = wocheFuer(gewaehlt);
  $("#iWocheWrap").classList.toggle("hidden", !cfg.zweiWochen);
  iText.value = ""; $("#iErgebnis").textContent = "";
  dlgImport.showModal();
};
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
  if(treffer){ dlgImport.close(); gewaehlt = plusTage(montagVon(gewaehlt), +iTag.value); zeichne(); }
  else $("#iErgebnis").textContent = "Nichts erkannt. Die Stundennummern müssen mitkopiert sein.";
};

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
  sDaten.value = JSON.stringify({cfg, plan, eintraege});
  $("#ankerWrap").classList.toggle("hidden", !cfg.zweiWochen);
  dlgEinst.showModal();
};
sZweiWochen.onchange = () => $("#ankerWrap").classList.toggle("hidden", !sZweiWochen.checked);
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
    sichern(); dlgEinst.close(); zeichne();
  }catch(e){ alert("Der Text lässt sich nicht lesen."); }
};
$("#sReset").onclick = () => {
  if(!confirm("Plan und alle Einträge löschen?")) return;
  cfg = Object.assign({}, STANDARD); plan = {}; eintraege = [];
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};
$("#bEinstAb").onclick = () => dlgEinst.close();
$("#bEinstSpeichern").onclick = () => {
  const neu = slotsAuslesen();
  cfg.klasse = sKlasse.value.trim();
  cfg.zweiWochen = sZweiWochen.checked;
  if(neu.length) cfg.slots = neu;
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};

/* ---------------------------------------------------------------
   Start und Selbstaktualisierung
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
