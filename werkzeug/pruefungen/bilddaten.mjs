/* Ohne Browser: die echten Speicher-, Import- und Dialogabläufe aus app.js
   ausführen. Bilddecodierung und Layout prüft zusätzlich bilder.mjs. */
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const quelle = fs.readFileSync(new URL("../../app.js", import.meta.url), "utf8");
const zwischen = (von,bis) => {
  const a = quelle.indexOf(von), b = quelle.indexOf(bis,a);
  assert(a >= 0 && b > a, "Quellabschnitt fehlt: " + von);
  return quelle.slice(a,b);
};
const elemente = new Map(), daten = new Map(), meldungen = [];
let voll = false, gezeichnet = 0;
const el = id => {
  if(!elemente.has(id)){
    const events = {};
    elemente.set(id,{value:"",innerHTML:"",textContent:"",style:{},disabled:false,open:false,
      addEventListener(art,fn){ (events[art] ||= []).push(fn); },
      dispatch(art,e){ for(const fn of events[art] || []) fn(e); },
      showModal(){ this.open = true; }, close(){ this.open = false; this.dispatch("close"); },
      removeAttribute(){}, click(){ this.onclick?.(); }});
  }
  return elemente.get(id);
};
const k = vm.createContext({
  console, $:el, datenZuNeu:false, profilId:"1", bilder:[],
  bearbeiteId:null, ereignisId:null, noteId:null, ereignisArt:"ereignis",
  cfg:{notenSystem:"note6"}, eintraege:[], sonder:[], noten:[],
  BILDER_MAX:30, ART:{H:"H",K:"K",N:"N",M:"M",F:"F"},
  FEHLARTEN:["entschuldigt","unentschuldigt","verspätet"], EREIGNISARTEN:["ereignis","ausfall","vertretung"],
  localStorage:{setItem(key,v){ if(voll) throw new Error("Speicher voll"); daten.set(key,v); },getItem:key=>daten.get(key)},
  zeigeFehler:t=>meldungen.push(t), alert:t=>meldungen.push(t), txt:(t,p={})=>t.replace(/\{(\w+)\}/g,(_,key)=>p[key] ?? key),
  zahl:(n,e,m)=>n+" "+(n===1?e:m), esc:s=>s, speicherWarnung:()=>"",
  aktuelleLk:()=>"", aktuellesFach:()=>"MA", serienDatumsListe:d=>[d],
  neueId:(()=>{let n=0; return ()=>String(++n);})(), iso:()=>"2026-10-08", zwei:n=>String(n).padStart(2,"0"),
  zeichne:()=>gezeichnet++, setTimeout:()=>1, clearTimeout:()=>{},
});
for(const id of ["dlgEintrag","bildDatei","eNotiz","eDatum","eTyp","eText","eStunde","eOrt","eWert","eNArt","eFehlArt","eFehlStd"])
  k[id] = el("#"+id);
vm.runInContext(zwischen("const Speicher = {", "/* Alle Schlüssel eines Profils"),k);
vm.runInContext(zwischen("/* --- Bilder: verkleinern", "/* --- Öffnen --- */"),k);
vm.runInContext(zwischen("let speichernSperre = null;", "/* Aus der Einstellung im Dialog"),k);
vm.runInContext(zwischen("const alsText    =", "const paketDatenstand ="),k);
vm.runInContext(zwischen("const SCHEMA =", "const neuereDatenText ="),k);
vm.runInContext(zwischen("const STANDARD =", "const REIHE_STANDARD ="),k);
k.LAENDER = {}; k.SPRACHEN = {de:"Deutsch",en:"English"}; k.REIHE_STANDARD = [];
k.TAGE = ["MO","DI","MI","DO","FR"];
vm.runInContext(zwischen("const paketDatenstand =", "/* =====================================================================\n   Sicherungsordner"),k);
vm.runInContext(zwischen("const sicherungsText =", "/* Nur vermerken, wenn die Daten"),k);
const fuehre = s => vm.runInContext(s,k);
k.cfg = fuehre("Object.assign({}, STANDARD)");
k.plan = {}; k.ferien = []; k.profilName = ()=>"Test";
k.profile = [{id:"1",name:"Test"},{id:"2",name:"Zweites Profil"}];
const topf = typ => typ === "E" ? k.sonder : typ === "G" ? k.noten : k.eintraege;
const gut = "data:image/png;base64,YWJj";
const oeffne = typ => {
  k.bearbeiteId = k.ereignisId = k.noteId = null;
  fuehre("speichernSperreAus(); bilderZuruecksetzen(); dlgEintrag.showModal()");
  k.eTyp.value = typ; k.eDatum.value = "2026-10-08"; k.eText.value = "Aufgabe";
  k.eStunde.value = ""; k.eWert.value = "2"; k.eNArt.value = "s";
  k.eFehlArt.value = "entschuldigt"; k.eFehlStd.value = "2";
};

for(const typ of ["H","K","N","M","F","E","G"]){
  oeffne(typ); k.bilder = [gut,gut]; el("#bEintragSpeichern").click();
  const e = topf(typ).at(-1);
  const anzahl = topf(typ).length;
  assert.equal(e.bilder.length,2,typ+" gespeichert");
  assert.equal(k.dlgEintrag.open,false);
  const key = typ === "E" ? "sonder" : typ === "G" ? "noten" : "eintraege";
  assert.equal(JSON.parse(daten.get("p1_"+key)).at(-1).bilder.length,2);
  oeffne(typ);
  k[typ === "E" ? "ereignisId" : typ === "G" ? "noteId" : "bearbeiteId"] = e.id;
  k.bilder = [gut]; el("#bEintragSpeichern").click();
  assert.equal(topf(typ).at(-1).bilder.length,1,typ+" Bild entfernt");
  assert.equal(topf(typ).length,anzahl,typ+" kein Duplikat");
}
console.log("  ok    Bilder anlegen, bearbeiten und entfernen: sieben Eintragsarten");

const sicherung = fuehre("JSON.parse(sicherungsText())");
const wiederhergestellt = fuehre("paketSaeubern(JSON.parse(sicherungsText()))");
assert.equal(wiederhergestellt.cfg.fassung,4);
assert.equal([...wiederhergestellt.eintraege,...wiederhergestellt.sonder,...wiederhergestellt.noten].length,7);
assert([...wiederhergestellt.eintraege,...wiederhergestellt.sonder,...wiederhergestellt.noten].every(e=>e.bilder.length===1));
for(const key of ["cfg","plan","ferien","eintraege","sonder","noten"])
  daten.set("p2_"+key,JSON.stringify(sicherung[key]));
const alle = fuehre("JSON.parse(sicherungAlleText())");
assert.equal(alle.profile.length,2);
assert(alle.profile.every(p=>[...p.eintraege,...p.sonder,...p.noten].every(e=>e.bilder.length===1)));
assert.equal(fuehre("planText().includes('data:image/')"),false);
console.log("  ok    Profilsicherung, Wiederherstellung, Gesamtsicherung und Planfreigabe");

for(const typ of ["H","E","G"]){
  for(const aendern of [false,true]){
    oeffne(typ);
    if(aendern) k[typ === "E" ? "ereignisId" : typ === "G" ? "noteId" : "bearbeiteId"] = topf(typ).at(-1).id;
    const vorher = JSON.stringify([k.eintraege,k.sonder,k.noten]), vorherDaten = JSON.stringify([...daten]);
    const zeichnungen = gezeichnet;
    const davor = meldungen.length;
    voll = true; k.bilder = [gut,gut]; el("#bEintragSpeichern").click(); voll = false;
    assert.equal(k.dlgEintrag.open,true);
    assert.equal(k.bilder.length,2);
    assert.equal(JSON.stringify([k.eintraege,k.sonder,k.noten]),vorher);
    assert.equal(JSON.stringify([...daten]),vorherDaten);
    assert.equal(gezeichnet,zeichnungen);
    assert.equal(meldungen.length,davor+1,"Speicherfehler ist im Dialog sichtbar");
  }
}
console.log("  ok    Speicherfehler beim Anlegen und Bearbeiten: Dialog und alte Daten erhalten");

for(const fn of ["eintragSaeubern","sonderSaeubern","noteSaeubern"]){
  k.roh = {typ:"H",fach:"MA",datum:"2026-10-08",wert:2,bilder:[gut,"https://example.org/bild.png","data:image/svg+xml;base64,PHN2Zz4=",'" onerror=alert(1)']};
  assert.deepEqual(Array.from(fuehre(fn+"(roh).bilder")),[gut]);
  k.roh.bilder = undefined; assert.equal(fuehre(fn+"(roh).bilder.length"),0);
  k.roh.bilder = Array(40).fill(gut); assert.equal(fuehre(fn+"(roh).bilder.length"),30);
}
k.roh = "data:image/png;base64,"+"A".repeat(4e6);
assert.equal(fuehre("alsBild(roh)"),null);
console.log("  ok    Import: alte Daten, Begrenzung, Fremd-URLs, SVG und HTML");

let fertig;
k.bildVerkleinern = ()=>new Promise(r=>{fertig=r;});
oeffne("N");
k.dateien = [{type:"image/png",size:100}];
const lauf = fuehre("bilderEinfuegen(dateien)");
assert.equal(el("#bEintragSpeichern").disabled,true);
assert.equal(fuehre("bilderLaufend"),1);
el("#bEintragSpeichern").click(); assert.equal(k.dlgEintrag.open,true);
k.dlgEintrag.close(); oeffne("K"); fertig(gut); await lauf;
assert.equal(k.bilder.length,0);
assert.equal(el("#bEintragSpeichern").disabled,false);
console.log("  ok    Bildverarbeitung sperrt Speichern; Abbruch erreicht keinen neuen Eintrag");

oeffne("N"); k.bildVerkleinern = async ()=>{throw new Error("kaputt");};
await fuehre("bilderEinfuegen(dateien)");
assert.equal(fuehre("bilderLaufend"),0);
assert.equal(el("#bEintragSpeichern").disabled,false);
assert.equal(k.bilder.length,0);
k.bildVerkleinern = async ()=>gut;
k.dateien = Array(40).fill({type:"image/png",size:100});
await fuehre("bilderEinfuegen(dateien)");
assert.equal(k.bilder.length,30);
assert.equal(el("#bBildWahl").disabled,true);
console.log("  ok    Lesefehler löst Sperre; Dateiauswahl hält Bildlimit ein");
console.log("\nAlle Bilddatenprüfungen bestanden.");
