/* =====================================================================
   Stundenplan — gesamte Logik.
   Kein Framework: ein Datensatz je Profil im localStorage. Bei jeder
   Änderung wird die sichtbare Ansicht neu gezeichnet.
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
    k.textContent = txt("Fehler") + "\n" + text + (quelle ? "\n" + quelle : "") + umgebung
      + "\n\n" + txt("Bitte diesen Text weitergeben. Deine Daten sind nicht betroffen.");
    /* Wer hier steht, kommt sonst nicht weiter. Die häufigste Ursache ist eine
       halb erneuerte Fassung — neues index.html, altes app.js. Ein Neuladen
       ohne Zwischenspeicher behebt genau das. Der Speicher bleibt unberührt. */
    const knopf = document.createElement("button");
    knopf.textContent = txt("App neu laden");
    knopf.style.cssText = "margin-top:12px;font:inherit;background:#fff;color:#e5382b;"
      + "border:0;border-radius:8px;padding:9px 14px;font-weight:700";
    knopf.onclick = async () => {
      knopf.textContent = txt("Lädt …");
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
  zeigeFehler(e.message, datei ? txt("{datei}, Zeile {zeile}", {datei, zeile:e.lineno}) : "");
});
window.addEventListener("unhandledrejection", e =>
  zeigeFehler(txt("Unerledigt") + ": " + ((e.reason && e.reason.message) || e.reason)));

/* Fassung der Daten im Speicher — nicht die der App. Sie steigt nur, wenn
   sich die Form der gespeicherten Daten ändert, und gibt späteren
   Umstellungen einen Anker. Ohne sie weiß niemand, was da liegt. */
const SCHEMA = 3;
const datenstandVon = roh => Number(roh && roh.fassung) || 0;
const neuereDatenText = stand => txt("Diese Daten stammen aus einer neueren Fassung der App "
  + "(Datenstand {stand}, diese App kennt {kennt}). Aktualisiere die App, bevor du weiterarbeitest.",
  {stand, kennt:SCHEMA});

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
  anteileLk: {},               // Verhältnis je Fach *und* Lehrkraft
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
  sprache: "de",                // Oberfläche: de | en | "" für die Gerätesprache
  stdProTag: 8,                 // Stunden je Schultag, für die Umrechnung in Fehltage
  reiheEin: null,               // Reihenfolge im Einträge-Menü
  reiheFach: null,              // Reihenfolge der Fächer im Zeugnis
  nachLehrer: false             // Fächer zusätzlich nach Lehrkraft trennen
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

/* =====================================================================
   Englische Fassung der Oberfläche
   Links steht der deutsche Satz, wie er im Quelltext aufgerufen wird,
   rechts seine Übersetzung. Was hier fehlt, erscheint auf Deutsch —
   und werkzeug/pruefen.mjs meldet es, bevor es jemand zu sehen bekommt.
   Reihenfolge: erst die Wörter, die gezählt werden, dann alles andere
   ungefähr so, wie es in der App vorkommt.
   ===================================================================== */
/* Gezählte Wörter: „1 Tag" und der Reiter „Tag" sind auf Deutsch dasselbe
   Wort, auf Englisch nicht. Deshalb eine eigene Tabelle. */
const EN_ZAHL = {
  "Tag":"day", "Tage":"days", "Tagen":"days",
  "Stunde":"lesson", "Stunden":"lessons",
  "belegte Stunde":"lesson filled in", "belegte Stunden":"lessons filled in",
  "Eintrag":"entry", "Einträge":"entries",
  "Termin":"date", "Termine":"dates",
  "Note":"grade", "Noten":"grades",
  "Klausur":"exam", "Klausuren":"exams",
  "Hausaufgabe":"homework task", "Hausaufgaben":"homework tasks",
  "Bild":"image", "Bilder":"images",
  "Fach":"subject", "Fächer":"subjects",
  "Lehrkraft":"teacher", "Lehrkräfte":"teachers",
  "Monat":"month", "Monate":"months",
  "Abschnitt":"section", "Abschnitte":"sections",
  "Sicherung":"backup", "Sicherungen":"backups",
  "alte Datei":"old file", "alte Dateien":"old files",
  "eigener Tag":"own free day", "eigene Tage":"own free days",
  "Zeitraum geladen":"period loaded", "Zeiträume geladen":"periods loaded"
};

const EN = {
  /* --- Fehlerkasten, Start, Daten --- */
  "Fehler":"Error",
  "Bitte diesen Text weitergeben. Deine Daten sind nicht betroffen.":
    "Please pass this text on. Your data is not affected.",
  "App neu laden":"Reload app",
  "Lädt …":"Loading …",
  "{datei}, Zeile {zeile}":"{datei}, line {zeile}",
  "Unerledigt":"Unhandled",
  "Ansicht „{name}“":"View “{name}”",
  "Diese Daten stammen aus einer neueren Fassung der App (Datenstand {stand}, diese App kennt {kennt}). Aktualisiere die App, bevor du weiterarbeitest.":
    "This data comes from a newer version of the app (data version {stand}, this app knows {kennt}). Update the app before carrying on.",
  "Speicher voll. Lösche Bilder aus Merkblättern oder lege eine Sicherung an.":
    "Storage full. Delete images from handouts or make a backup.",
  "Dialogfenster":"Dialog windows",
  "Dieser Browser ist zu alt für die App — es fehlt: {fehlt}.":
    "This browser is too old for the app — missing: {fehlt}.",
  "Auf dem iPhone braucht es iOS 15.4 oder neuer, sonst einen aktuellen Chrome, Firefox, Edge oder Safari.":
    "On iPhone it needs iOS 15.4 or newer, otherwise a current Chrome, Firefox, Edge or Safari.",
  "Mein Plan":"My plan", "Profil":"Profile", "Profil {n}":"Profile {n}",
  "Bild ließ sich nicht lesen.":"The image could not be read.",
  "Datei ließ sich nicht lesen.":"The file could not be read.",
  "Datei konnte nicht ausgegeben werden":"The file could not be written",

  /* --- Wochentage, Arten, Listen --- */
  "Montag":"Monday", "Dienstag":"Tuesday", "Mittwoch":"Wednesday",
  "Donnerstag":"Thursday", "Freitag":"Friday",
  "Samstag":"Saturday", "Sonntag":"Sunday", "Wochenende":"Weekend",
  "Hausaufgabe":"Homework", "Klausur":"Exam", "Notiz":"Note",
  "Merkblatt":"Handout", "Fehlzeit":"Absence", "Ereignis":"Event", "Note":"Grade",
  "Hausaufgaben":"Homework", "Klausuren":"Exams", "Notizen":"Notes",
  "Ereignisse":"Events", "Noten":"Grades", "Merkblätter":"Handouts",
  "Fehlzeiten":"Absences", "Archiv":"Archive",
  "entschuldigt":"excused", "unentschuldigt":"unexcused", "verspätet":"late",

  /* --- Kopf und Reiter --- */
  "Stundenplan":"Timetable", "Tag":"Day", "Kalender":"Calendar",
  "Einträge":"Entries", "Zeugnis":"Report",
  "Ansicht":"View", "Wochentag":"Weekday", "Inhaltsverzeichnis":"Table of contents",
  "Plan bearbeiten":"Edit timetable", "Kacheln umsortieren":"Reorder tiles",
  "Profil wechseln":"Switch profile", "Einstellungen":"Settings",
  "Woche zurück":"Previous week", "Woche vor":"Next week",
  "Monat zurück":"Previous month", "Monat vor":"Next month",
  "Woche":"Week", "Heute":"Today", "Diese Woche":"This week",
  "KW {n}":"Week {n}", "{w}-Woche":"week {w}", "A/B-Wochen":"A/B weeks",

  /* --- Tagesansicht --- */
  "Feiertag":"Public holiday", "Ferien":"Holidays", "kein Unterricht":"no lessons",
  "frei":"free", "fällt aus":"cancelled", "Ausfall":"Cancelled",
  "Vertretung":"Cover", "einmalig":"one-off", "jetzt":"now",
  "Schluss nach {zeit}":"School ends after {zeit}",
  "Freistunde":"Free period", "Pause":"Break", "Schule aus":"School's out",
  "noch {n} min":"{n} min left", "in {n} min":"in {n} min",
  "Beginnt um {zeit}":"Starts at {zeit}", "dann {fach}":"then {fach}",
  "weiter um {zeit} · noch {n} min":"continues at {zeit} · {n} min left",
  "Schulschluss in {h} h {m} min":"School ends in {h} h {m} min",
  "{name} in {dauer}":"{name} in {dauer}",
  "An diesem Tag":"On this day", "Nichts eingetragen.":"Nothing entered.",
  "Bearbeiten ist an: Antippen ändert Fach, Raum und Lehrkraft. Nochmal auf ✎ oben tippen, wenn du fertig bist.":
    "Editing is on: tapping changes subject, room and teacher. Tap ✎ at the top again when you are done.",
  "Erledigt":"Done", "Reihe":"Series",
  "Ohne Lehrkraft":"Without a teacher", "ohne Lehrkraft":"without a teacher",

  /* --- Sicherungsbanner --- */
  "Sicherung fällig":"Backup due",
  "Dieser Plan wurde noch nie gesichert.":"This plan has never been backed up.",
  "Letzte Sicherung vor {dauer}.":"Last backup {dauer} ago.",
  "Löscht der Browser seine Websitedaten, ist ohne Sicherung alles weg.":
    "If the browser clears its site data, everything is gone without a backup.",
  "Jetzt sichern":"Back up now", "Heute nicht":"Not today",

  /* --- Kalender --- */
  "Ein Feld gedrückt halten oder doppelt antippen, um etwas einzutragen.":
    "Press and hold a cell, or double-tap it, to add something.",
  "Nichts an diesem Tag.":"Nothing on this day.",
  "nichts eingetragen":"nothing entered", "eigener freier Tag":"own free day",
  "Freien Tag ändern":"Change free day", "Freier Tag":"Free day",
  "Praktikum, Ausflug, beweglicher Ferientag":"work experience, trip, floating holiday",
  "Tag markieren":"Mark day",
  "Für schuleigene freie Tage, Praktika oder Ausflüge. Der Tag wird grau dargestellt und aus dem Unterricht herausgenommen.":
    "For the school's own free days, work experience or trips. The day is shown in grey and taken out of lessons.",
  "Bezeichnung":"Label", "Beweglicher Ferientag":"Floating holiday",
  "bis einschließlich":"up to and including", "Frei":"Free",
  "Termin":"Appointment",
  "ganzer Tag oder eine bestimmte Stunde":"all day or one particular lesson",
  "mit Fälligkeit an diesem Tag":"due on this day",
  "freier Text zu diesem Tag":"free text for this day",
  "versäumte Stunden":"lessons missed",

  /* --- Einträge-Menü --- */
  "Suche":"Search", "Fach, Aufgabe, Notiz …":"Subject, task, note …",
  "Sortieren ist an: Mit den Pfeilen umstellen. Nochmal auf ✎ oben tippen, wenn du fertig bist.":
    "Sorting is on: rearrange with the arrows. Tap ✎ at the top again when you are done.",
  "{n} offen":"{n} open", "nichts offen":"nothing open",
  "{n} anstehend":"{n} coming up", "nichts anstehend":"nothing coming up",
  "{n} vorhanden":"{n} there", "keine":"none",
  "{n} geplant":"{n} planned", "{n} eingetragen":"{n} entered",
  "{n} im Archiv":"{n} in the archive", "leer":"empty",
  "Keine offenen Hausaufgaben.":"No open homework.",
  "Keine Klausuren eingetragen.":"No exams entered.",
  "Keine Notizen.":"No notes.", "Nichts vorhanden.":"Nothing there.",
  "Keine Ereignisse geplant.":"No events planned.",
  "Keine Fehlzeiten erfasst.":"No absences recorded.",
  "Noch keine Merkblätter.":"No handouts yet.",
  "Noch keine Noten eingetragen.":"No grades entered yet.",
  "Antippen zum Ansehen.":"Tap to view.",
  "ganzer Tag":"all day", "Nichts gefunden.":"Nothing found.",
  "davon {n} unentschuldigt":"{n} of them unexcused",

  /* --- Archiv --- */
  "Archiv ist leer.":"The archive is empty.",
  "gelöscht {datum}":"deleted {datum}",
  "wird beim nächsten Öffnen entfernt":"will be removed the next time you open the app",
  "noch heute":"today only", "noch {dauer}":"{dauer} left",
  "Gelöschtes bleibt hier, bis du es selbst entfernst. Eine Frist stellst du unter ⚙ → Archiv ein.":
    "Deleted things stay here until you remove them yourself. You can set a time limit under ⚙ → Archive.",
  "Gelöschtes wird {dauer} nach dem Löschen endgültig entfernt.":
    "Deleted things are removed for good {dauer} after deletion.",
  "{n} Eintrag geht in der kommenden Woche verloren.":"{n} entry will be lost in the coming week.",
  "{n} Einträge gehen in der kommenden Woche verloren.":"{n} entries will be lost in the coming week.",
  "Zum sofortigen Entfernen ein zweites Mal löschen.":"Delete a second time to remove it at once.",
  "Endgültig löschen? Das lässt sich nicht rückgängig machen.":
    "Delete for good? This cannot be undone.",
  "Löschen":"Delete", "Zurück":"Back",

  /* --- Noten, Zeugnis, Verhältnis --- */
  "Verhältnis je Fach antippbar. Standard: {n} % mündlich.":
    "Tap a subject to set its ratio. Default: {n} % oral.",
  "mündlich {m} · schriftlich {s}":"oral {m} · written {s}",
  "{n} % mündlich":"{n} % oral", "eigen":"own", "eigene Verhältnisse":"own ratios",
  "mündl.":"oral", "schriftl.":"written",
  "mündlich":"oral", "schriftlich":"written", "mündlich %":"oral %",
  "keine Noten":"no grades",
  "Aus {noten} in {a} von {b} Fächern.":"From {noten} in {a} of {b} subjects.",
  "Noch keine Noten. Tippe ein Fach an, um Verhältnis und Zielnote zu setzen.":
    "No grades yet. Tap a subject to set its ratio and a target grade.",
  "Versäumt: {text}.":"Missed: {text}.",
  "Stand heute":"As things stand",
  "Nur eine Schätzung. Die App gewichtet alle Noten einer Art gleich; Lehrkräfte rechnen oft anders. Keine amtliche Auskunft.":
    "Only an estimate. The app weights all grades of one kind equally; teachers often calculate differently. Not an official statement.",
  "Trag zuerst deinen Stundenplan ein — dann erscheinen hier die Fächer.":
    "Enter your timetable first — then the subjects appear here.",
  "Verhältnis":"Ratio", "Verhältnis je Fach":"Ratio per subject",
  "Wie stark zählt die mündliche Note in diesem Fach?":
    "How much does the oral grade count in this subject?",
  "{m} % mündlich, {s} % schriftlich.":"{m} % oral, {s} % written.",
  "Zurzeit gilt der Standard.":"The default applies at the moment.",
  "Zurzeit gilt der Wert für {fach} ({n} %).":"The value for {fach} applies at the moment ({n} %).",
  "Gilt für alle Lehrkräfte dieses Fachs, die keinen eigenen Wert haben.":
    "Applies to every teacher of this subject who has no value of their own.",
  "Zielnote":"Target grade",
  "Was müsste die nächste Note sein, um dieses Ziel zu erreichen?":
    "What would the next grade have to be to reach this target?",
  "Ziel":"Target", "als":"as", "Standard":"Default",
  "Die nächste mündliche Note müsste {note} sein.":"The next oral grade would have to be {note}.",
  "Die nächste schriftliche Note müsste {note} sein.":"The next written grade would have to be {note}.",
  "Mit einer einzelnen Note nicht erreichbar (rechnerisch {note}).":
    "Not reachable with a single grade (arithmetically {note}).",
  "Note 1–6":"Grade 1–6", "Noten 1–6":"Grades 1–6", "Punkte 0–15":"Points 0–15",

  /* --- Stunde antippen, Fach-Info --- */
  "{tag}, {std}. Stunde":"{tag}, lesson {std}",
  "Gilt nur für die {woche}-Woche.":"Applies to week {woche} only.",
  "fällig {datum}":"due {datum}", "kein weiterer Termin":"no further date",
  "Fällt aus":"Cancelled", "Sonstiges Ereignis":"Other event", "Fach-Info":"Subject info",
  "was heute dran war":"what was covered today", "Termin eintragen":"enter a date",
  "diese Stunde versäumt":"this lesson missed", "nur an diesem Tag":"on this day only",
  "anderes Fach oder Raum":"different subject or room",
  "Lehrkraft, Raum, Schnitt, Offenes":"teacher, room, average, what is open",
  "Lehrkraft":"Teacher", "Lehrer":"Teacher", "Raum":"Room", "Fach":"Subject",
  "Stunden je Woche":"Lessons per week", "Als Nächstes":"Up next",
  "Schnitt":"Average", "Offen":"Open", "nichts":"nothing",
  "In dieser Woche steht nichts im Plan.":"Nothing is in the plan this week.",
  "Eine Stunde antippen springt auf den Tag.":"Tapping a lesson jumps to its day.",

  /* --- Eintragsdialog --- */
  "Eintrag ändern":"Edit entry", "Neuer Eintrag":"New entry",
  "Ereignis ändern":"Edit event", "Note ändern":"Edit grade",
  "+ Eintrag":"+ Entry", "Art":"Kind", "Was":"What", "Wo":"Where",
  "Überschrift":"Heading", "Inhalt":"Content", "Datum":"Date",
  "Fach eintippen":"Type a subject", "keins":"none", "alle":"all",
  "Anderes …":"Something else …", "Aufgabe":"Task", "Details":"Details",
  "Raum oder Ort":"Room or place", "Stunde":"Lesson", "Stunden":"Lessons",
  "Wiederholen":"Repeat", "Wiederholen bis":"Repeat until",
  "jede Woche":"every week", "alle zwei Wochen":"every two weeks",
  "{anzahl}, jeweils {tag}, letzter am {datum}.":"{anzahl}, each on {tag}, the last on {datum}.",
  "am selben Wochentag":"on the same weekday",
  "{n} Termine — mehr legt die App auf einmal nicht an. Letzter: {datum}.":
    "{n} dates — the app does not create more at once. Last: {datum}.",
  "Roter Punkt: {fach} steht an diesem Tag im Plan.":"Red dot: {fach} is in the plan on that day.",
  "bei {wer}":"with {wer}",
  "Wähle oben ein Fach, dann werden die passenden Tage markiert.":
    "Choose a subject above and the matching days will be marked.",
  "Bild hinzufügen":"Add image", "{bilder} · ca. {kb} kB":"{bilder} · about {kb} kB",
  "Bitte ein Fach wählen.":"Please choose a subject.",
  "Bitte einen Wert zwischen {a} und {b} eingeben.":"Please enter a value between {a} and {b}.",
  "Merkblatt vom {datum}":"Handout of {datum}",
  "Dieser Eintrag gehört zu einer Reihe von {n}.":"This entry belongs to a series of {n}.",
  "OK löscht die ganze Reihe, Abbrechen nur diesen einen.":
    "OK deletes the whole series, Cancel only this one.",
  "Bearbeiten":"Edit", "Fertig":"Done", "Speichern":"Save",

  /* --- Plan einfügen --- */
  "Plan einfügen":"Paste plan", "Std.":"No.", "von":"from", "bis":"to", "LK":"Teacher",
  "Aus der Zwischenablage füllen":"Fill from the clipboard",
  "Erwartet je Stunde eine Zeile im Format <b>FACH, RAUM (LEHRKRAFT)</b>.":
    "Expects one line per lesson in the format <b>SUBJECT, ROOM (TEACHER)</b>.",
  "1 FACH, RAUM (LEHRER)":"1 SUBJECT, ROOM (TEACHER)",
  "In die Tabelle übernehmen":"Copy into the table",
  "{n} Zeilen übernommen. Prüfen und speichern.":"{n} rows taken over. Check them and save.",
  "Nichts erkannt. Die Stundennummern müssen mitkopiert sein.":
    "Nothing recognised. The lesson numbers have to be copied along too.",

  /* --- Profile --- */
  "Wer bist du?":"Who are you?", "Profile verwalten":"Manage profiles",
  "Verwalten":"Manage", "Name":"Name", "Neues Profil":"New profile", "Anlegen":"Create",
  "Name des neuen Profils":"Name of the new profile", "Neuer Name":"New name",
  "Profil: {name}":"Profile: {name}",
  "Profil „{name}“ mit allen Daten löschen? Das lässt sich nicht rückgängig machen.":
    "Delete profile “{name}” with all its data? This cannot be undone.",

  /* --- Ferien, Erinnerungen, Kalender-Export --- */
  "Ferien und Feiertage":"Holidays and public holidays", "Bundesland":"German state",
  "wählen":"choose", "Ferien laden":"Load holidays", "Entfernen":"Remove",
  "Bitte zuerst ein Bundesland wählen.":"Please choose a German state first.",
  "Wird geladen …":"Loading …",
  "Der Dienst antwortet nicht. Später noch einmal versuchen.":
    "The service is not responding. Try again later.",
  "Laden fehlgeschlagen. Internet prüfen.":"Loading failed. Check your internet connection.",
  "{n} Einträge gespeichert, bis {datum}.":"{n} entries stored, up to {datum}.",
  "Noch nichts geladen.":"Nothing loaded yet.",
  "Erinnerungen":"Reminders",
  "Die App kann sich nicht selbst wecken. Sie meldet sich beim Öffnen — für echte Wecker nutze den Kalender-Export.":
    "The app cannot wake itself. It speaks up when you open it — for real alarms use the calendar export.",
  "Beim Öffnen an Klausuren und Hausaufgaben erinnern":
    "Remind me of exams and homework when opening",
  "Benachrichtigungen erlauben":"Allow notifications",
  "Termine als .ics":"Appointments as .ics", "Stundenplan als .ics":"Timetable as .ics",
  "<b>Termine</b> sind offene Hausaufgaben, Klausuren und Ereignisse, je mit Wecker. <b>Stundenplan</b> ist der Unterricht selbst als Serientermine für ein Jahr, Ferien ausgenommen — zwei Dateien, damit im Handykalender zwei Kalender entstehen, die du einzeln ausblenden kannst.":
    "<b>Appointments</b> are open homework, exams and events, each with an alarm. <b>Timetable</b> is the lessons themselves as recurring appointments for a year, holidays excepted — two files, so that your phone calendar gets two calendars you can hide separately.",
  "Berechtigung: {stand}":"Permission: {stand}",
  "erteilt":"granted", "abgelehnt":"denied", "noch nicht gefragt":"not asked yet",
  "nicht verfügbar":"not available",
  "Morgen: {liste}":"Tomorrow: {liste}",
  "Diese Woche: {klausuren}, {hausaufgaben}":"This week: {klausuren}, {hausaufgaben}",
  "Klausur am {datum}: {fach}":"Exam on {datum}: {fach}",
  "HA":"HW", "Unterricht":"Lessons",
  "Trag zuerst deinen Stundenplan ein.":"Enter your timetable first.",

  /* --- Sicherung, Ordner, Speicher --- */
  "Sicherung":"Backup", "Als Datei sichern":"Save as file",
  "Alle Profile sichern":"Back up all profiles", "Datei einlesen":"Read file",
  "Teilen":"Share", "Stundenplan-Sicherung":"Timetable backup",
  "„Teilen\" gibt <b>alles</b> weiter — auch Noten, Fehlzeiten und Merkblätter. Für Mitschüler gibt es darunter den Plan allein.":
    "“Share” passes on <b>everything</b> — grades, absences and handouts included. For classmates there is the plan on its own below.",
  "Stundenplan weitergeben":"Pass on the timetable",
  "Nur den Plan teilen":"Share the plan only",
  "Enthält Stundenraster, Fächer, Räume, Lehrkräfte und deren Namen — sonst nichts. Beim Einlesen ersetzt eine solche Datei nur den Plan; Einträge, Noten und Merkblätter bleiben stehen.":
    "Contains the period grid, subjects, rooms, teachers and their names — nothing else. When read in, such a file replaces only the plan; entries, grades and handouts stay.",
  "Teilen ist hier nicht verfügbar — Plan-Datei heruntergeladen.":
    "Sharing is not available here — the plan file was downloaded instead.",
  "Erinnerung":"Reminder", "Sichern alle":"Back up every", "Aufheben":"Keep for",
  "nie erinnern":"never remind", "alles behalten":"keep everything",
  "7 Tage":"7 days", "14 Tage":"14 days", "28 Tage":"28 days", "30 Tage":"30 days",
  "1 Monat":"1 month", "3 Monate":"3 months", "6 Monate":"6 months", "1 Jahr":"1 year",
  "für immer":"forever",
  "Die App erinnert dich alle {dauer} in der Tagesansicht.":
    "The app reminds you every {dauer} in the day view.",
  "Es wird nicht erinnert. Ans Sichern denkst du dann selbst.":
    "There is no reminder. Remembering to back up is then up to you.",
  "Im Sicherungsordner bleiben die letzten {dauer}; ältere Sicherungen der App werden dort gelöscht.":
    "The backup folder keeps the last {dauer}; the app deletes its older backups there.",
  "Im Sicherungsordner bleibt alles liegen.":"Everything stays in the backup folder.",
  "Sicherungsordner":"Backup folder",
  "Wähle einmal einen Ordner — danach legt die App ihre Sicherungen immer dort ab, ohne zu fragen.":
    "Choose a folder once — after that the app always puts its backups there without asking.",
  "Beim Öffnen automatisch in den Ordner sichern, wenn es fällig ist":
    "Back up to the folder automatically on opening when it is due",
  "Ordner wählen":"Choose folder", "Jetzt dorthin sichern":"Back up there now",
  "Ordner lösen":"Release folder", "Ordner":"Folder",
  "Wähle zuerst einen Ordner.":"Choose a folder first.",
  "Noch kein Ordner gewählt. Sicherungen gehen in die Downloads.":
    "No folder chosen yet. Backups go to your downloads.",
  "Ordner: {name}":"Folder: {name}",
  "Zugriff muss beim nächsten Sichern einmal bestätigt werden":
    "access has to be confirmed once at the next backup",
  "{anzahl} darin":"{anzahl} in it",
  "{n} davon älter als die Haltefrist":"{n} of them older than the retention period",
  "Gesichert: {name}":"Backed up: {name}",
  "Sicherung angelegt: {name}":"Backup created: {name}",
  "{dateien} entfernt":"{dateien} removed",
  "Dieser Browser kann keinen festen Ordner vergeben — das können bislang nur Chrome und Edge auf dem Rechner. Sicherungen landen deshalb im normalen Download-Ordner.<br><br> <b>Auf dem Handy:</b> In Chrome unter <i>⋮ → Einstellungen → Downloads</i> die Option <i>Speicherort für Dateien abfragen</i> einschalten. Dann fragt jeder Download nach dem Ordner, und du kannst dort einen eigenen anlegen.":
    "This browser cannot be given a fixed folder — so far only Chrome and Edge on a computer can do that. Backups therefore end up in the normal downloads folder.<br><br> <b>On a phone:</b> in Chrome, under <i>⋮ → Settings → Downloads</i>, switch on <i>Ask where to save files</i>. Then every download asks for the folder, and you can create one of your own there.",
  "Text übernehmen":"Take over text", "Alles löschen":"Delete everything",
  "Speicher":"Storage",
  "{kb} kB von rund {grenze} kB belegt ({anteil} %) · {bilder} in Merkblättern.":
    "{kb} kB of about {grenze} kB used ({anteil} %) · {bilder} in handouts.",
  "Der Speicher ist zu {n} % voll. Lege eine Sicherung an und entferne alte Bilder aus Merkblättern, sonst gehen neue Einträge verloren.":
    "Storage is {n} % full. Make a backup and remove old images from handouts, otherwise new entries will be lost.",
  "Noch nie gesichert. Jetzt wäre ein guter Zeitpunkt.":
    "Never backed up. Now would be a good moment.",
  "Letzte Sicherung vor {dauer} — Zeit für eine neue.":
    "Last backup {dauer} ago — time for a new one.",
  "Letzte Sicherung: {datum}{zusatz}.":"Last backup: {datum}{zusatz}.",
  "(vor {dauer})":"({dauer} ago)", "(heute)":"(today)",
  "Der Text lässt sich nicht lesen. Ist es wirklich eine Sicherungsdatei?":
    "The text cannot be read. Is it really a backup file?",
  "In der Datei stecken keine lesbaren Profile.":"The file contains no readable profiles.",
  "In der Datei steckt kein erkennbarer Stundenplan.":
    "The file contains no recognisable timetable.",
  "Diese Sicherung enthält alle Profile. Sämtliche Profile auf diesem Gerät werden dadurch ersetzt. Fortfahren?":
    "This backup contains all profiles. Every profile on this device will be replaced. Continue?",
  "Das ersetzt den gesamten Plan dieses Profils — Einträge, Noten, Merkblätter und Archiv.":
    "This replaces the entire plan of this profile — entries, grades, handouts and archive.",
  "Von den jetzigen Daten gibt es noch keine Sicherung.":
    "There is no backup of the current data yet.",
  "Letzte Sicherung der jetzigen Daten: vor {dauer}.":
    "Last backup of the current data: {dauer} ago.",
  "Fortfahren?":"Continue?",
  "Das ersetzt den Stundenplan durch {stunden}.":"This replaces the timetable with {stunden}.",
  "Einträge, Noten, Fehlzeiten und Merkblätter bleiben unberührt.":
    "Entries, grades, absences and handouts are left untouched.",
  "Stundenplan übernommen. Deine Einträge und Noten sind unverändert.":
    "Timetable taken over. Your entries and grades are unchanged.",
  "Plan, Einträge, Noten, Merkblätter und Archiv dieses Profils löschen?":
    "Delete the plan, entries, grades, handouts and archive of this profile?",

  /* --- Einstellungen: Menü und Bereiche --- */
  "Anleitung und Technik":"Guide and technical notes",
  "‹ Alle Einstellungen":"‹ All settings",
  "Darstellung":"Appearance", "Schule und Stundenraster":"School and period grid",
  "Noten und Zeugnis":"Grades and report card",
  "Fehlzeiten und Archiv":"Absences and archive",
  "Erinnerungen und Kalender":"Reminders and calendar",
  "Fächer und Lehrkräfte":"Subjects and teachers",
  "Sicherung und Speicher":"Backup and storage",
  "hell":"light", "dunkel":"dark",
  "Monospace":"monospace", "Serife":"serif", "Systemschrift":"system font",
  "{n} Stunden je Schultag":"{n} lessons per school day",
  "beim Öffnen erinnern":"remind on opening",
  "keine Erinnerung beim Öffnen":"no reminder on opening",
  "kein Bundesland gewählt":"no German state chosen",
  "getrennt":"separated",
  "noch nie gesichert":"never backed up", "heute gesichert":"backed up today",
  "zuletzt vor {dauer}":"last time {dauer} ago",
  "Akzentfarbe":"Accent colour", "Hex":"Hex", "Modus":"Mode",
  "Dunkel":"Dark", "Hell":"Light", "Schrift":"Typeface",
  "System":"System", "Technisch":"Technical", "Serif":"Serif",
  "Beim Öffnen":"On opening",
  "immer zur Profilauswahl":"always show the profile picker",
  "nur bei mehreren Profilen":"only with several profiles",
  "gleich in den Plan":"straight into the plan",
  "Schule":"School", "Klasse":"Class", "Deine Klasse":"Your class",
  "Stundenraster":"Period grid",
  "„Std.\" sind die Stundennummern, die dieses Feld abdeckt.":
    "“No.” are the lesson numbers this slot covers.",
  "4 Blöcke à 90 min":"4 blocks of 90 min", "8 Einzelstunden":"8 single lessons",
  "+ Zeile":"+ Row", "Zeile löschen":"Delete row",
  "Wochenwechsel":"Week change",
  "A- und B-Woche getrennt führen":"Keep A and B weeks separately",
  "Feste Regel: ungerade Kalenderwoche = <b>A</b>, gerade = <b>B</b>.":
    "Fixed rule: odd calendar week = <b>A</b>, even = <b>B</b>.",
  "Diese Woche ist KW {kw}, also {woche}.":"This week is week {kw}, so {woche}.",
  "Die {nach}-Woche wird vollständig durch die {von}-Woche ersetzt. Fortfahren?":
    "Week {nach} will be replaced entirely by week {von}. Continue?",
  "{von}-Woche in die {nach}-Woche übernommen.":"Week {von} copied into week {nach}.",
  "Leer lassen heißt: Standard von oben.":"Leaving it empty means: the default from above.",
  "Sobald Fächer im Plan stehen, erscheinen sie hier.":
    "As soon as subjects are in the plan, they appear here.",
  "Reihenfolge der Fächer":"Order of subjects",
  "Gilt für das Zeugnis und die Liste darüber.":"Applies to the report card and the list above it.",
  "nach oben":"move up", "nach unten":"move down",
  "Stunden je Schultag":"Lessons per school day",
  "Damit rechnet das Zeugnis versäumte Stunden in Tage um.":
    "The report card uses this to convert missed lessons into days.",
  "Gelöschtes aufbewahren":"Keep deleted items",
  "Nichts wird von selbst entfernt. Das Archiv wächst, bis du einzelne Einträge endgültig löschst.":
    "Nothing is removed by itself. The archive grows until you delete individual entries for good.",
  "Gelöschtes wird {dauer} nach dem Löschen endgültig entfernt — das lässt sich nicht rückgängig machen.":
    "Deleted things are removed for good {dauer} after deletion — this cannot be undone.",
  "Beim Speichern verschwinden dadurch sofort {n}.":"Saving will immediately remove {n}.",
  "Lehrkräfte":"Teachers", "Fächer nach Lehrkraft trennen":"Separate subjects by teacher",
  "Dann sucht „Als Nächstes“ die nächste Stunde desselben Fachs <i>bei derselben Lehrkraft</i>, Einträge bekommen ein Feld dafür, und Zeugnis und Notizen zeigen Unterpunkte je Lehrkraft.":
    "Then “Up next” looks for the next lesson in the same subject <i>with the same teacher</i>, entries gain a field for it, and the report card and notes show sub-entries per teacher.",
  "Je Zeile ein Kürzel und der Name, getrennt durch ein Gleichheitszeichen.":
    "One abbreviation and name per line, separated by an equals sign.",
  "KÜRZEL = Name":"ABBR = Name", "Fachnamen":"Subject names",
  "KÜRZEL = Fachname":"ABBR = Subject name",
  "Nach Update suchen":"Check for update",
  "Du bist auf dem neuesten Stand":"You are up to date",
  "Es gibt ungespeicherte Änderungen.":"There are unsaved changes.",
  "OK = speichern und schließen":"OK = save and close",
  "Abbrechen = verwerfen":"Cancel = discard",
  "Das Raster wird kürzer. Dabei gehen {stunden} am Ende der Tage verloren.":
    "The grid gets shorter. {stunden} at the end of the days will be lost.",
  "Trotzdem speichern?":"Save anyway?",
  "MIT-Lizenz — Weiterverwendung erlaubt, Urheberhinweis behalten":
    "MIT licence — reuse permitted, keep the copyright notice",
  "von <a href=\"https://github.com/DjKamma420\" target=\"_blank\" rel=\"noopener\">DjKamma420</a> · <a href=\"https://github.com/DjKamma420/StundenplanNothing\" target=\"_blank\" rel=\"noopener\">Quellcode</a>":
    "by <a href=\"https://github.com/DjKamma420\" target=\"_blank\" rel=\"noopener\">DjKamma420</a> · <a href=\"https://github.com/DjKamma420/StundenplanNothing\" target=\"_blank\" rel=\"noopener\">Source code</a>",
  "Ferien und Feiertage von <a href=\"https://openholidaysapi.org\" target=\"_blank\" rel=\"noopener\">openholidaysapi.org</a>":
    "Holidays and public holidays from <a href=\"https://openholidaysapi.org\" target=\"_blank\" rel=\"noopener\">openholidaysapi.org</a>",
  "Entwickelt mit KI-Unterstützung":"Developed with AI assistance",

  /* --- Fuß und Anleitung --- */
  "Wischen wechselt die Ansicht":"Swipe to change the view",
  "{laeuft} · {server} verfügbar — tippen zum Aktualisieren":
    "{laeuft} · {server} available — tap to update",
  "{laeuft} (neu: {server})":"{laeuft} (new: {server})",
  "Anleitung":"Guide", "Inhalt|Verzeichnis":"Contents", "↑ Anfang":"↑ Top",
  "Stichwort suchen, etwa „Sicherung“ …":"Search for a keyword, for instance “backup” …",
  "{anzahl} zu „{wort}“":"{anzahl} for “{wort}”",
  "Nichts zu „{wort}“ gefunden.":"Nothing found for “{wort}”.",
  "2,0":"2.0", "2,3":"2.3"
};


/* =====================================================================
   Sprache
   Die Oberfläche ist auf Deutsch geschrieben, und der deutsche Satz ist
   zugleich sein eigener Schlüssel: txt("Speichern") liefert auf Deutsch
   genau diesen Satz, auf Englisch den Eintrag aus EN. Fehlt eine
   Übersetzung, erscheint der deutsche Satz — nie eine leere Stelle und
   nie ein Kürzel. werkzeug/pruefen.mjs stellt sicher, dass es zu jedem
   Schlüssel eine englische Fassung gibt; sonst veraltete die Übersetzung
   stillschweigend, sobald jemand einen deutschen Satz umformuliert.

   Gespeichert wird weiterhin Deutsch: Wochentagskürzel, Fehlzeitenarten,
   Dateinamen und das Sicherungsformat sind Daten, keine Anzeige. Eine
   Sicherung bleibt dadurch auf jedem Gerät lesbar, gleich in welcher
   Sprache sie entstanden ist.
   ===================================================================== */
const SPRACHEN = {de:"Deutsch", en:"English"};
const geraeteSprache = () => /^de/i.test(navigator.language || "") ? "de" : "en";
/* cfg gibt es beim Laden dieser Datei noch nicht — ein Fehler vor dem ersten
   Zeichnen muss trotzdem einen lesbaren Satz zeigen können. Deshalb steht
   diese Abteilung ganz vorn: alles danach darf txt() benutzen. */
function spracheJetzt(){
  try{ if(cfg && SPRACHEN[cfg.sprache]) return cfg.sprache; }catch(e){}
  return geraeteSprache();
}
const istEnglisch = () => spracheJetzt() === "en";
/* „Wort|Kontext" trennt gleiche Wörter mit verschiedener Bedeutung —
   auf Deutsch zählt nur der Teil vor dem Strich. */
const ohneKontext = s => { const i = String(s).indexOf("|"); return i < 0 ? String(s) : String(s).slice(0,i); };
/* {name} in einem Satz wird durch werte.name ersetzt. So bleibt die
   Wortstellung der Übersetzung überlassen: „vor 3 Tagen" ist im Englischen
   „3 days ago", und das lässt sich nicht aus Bausteinen zusammensetzen. */
function txt(schluessel, werte){
  const fremd = istEnglisch() && EN[schluessel];
  const text = typeof fremd === "string" ? fremd : ohneKontext(schluessel);
  return werte ? text.replace(/\{(\w+)\}/g, (ganz,k) => k in werte ? werte[k] : ganz) : text;
}
/* Ein Satz, dessen Einzahl und Mehrzahl verschieden gebaut sind. */
const txtz = (n, ein, viele, werte) => txt(n === 1 ? ein : viele, Object.assign({n}, werte));
/* Gezählte Wörter haben eine eigene Tabelle: „1 Tag" und der Reiter „Tag"
   sind auf Deutsch dasselbe Wort, auf Englisch „day" und „Day". */
const mehrzahlWort = w => {
  const fremd = istEnglisch() && EN_ZAHL[w];
  return typeof fremd === "string" ? fremd : w;
};
/* Sprache der Datums- und Zahlenausgabe. en-GB, weil dort wie hier der Tag
   vor dem Monat steht und die Uhr vierundzwanzig Stunden hat. */
const ORT = () => istEnglisch() ? "en-GB" : "de-DE";
/* Das Dezimalkomma ist deutsch. Eingelesen werden beide Zeichen. */
const kommaZahl = s => istEnglisch() ? String(s) : String(s).replace(".", ",");
/* Tag und Monat ohne Jahr, wie sie neben einer Überschrift stehen. */
const tagMonat = d => istEnglisch()
  ? `${zwei(d.getDate())}/${zwei(d.getMonth()+1)}`
  : `${zwei(d.getDate())}.${zwei(d.getMonth()+1)}.`;
/* Wochentagskürzel sind im Plan Schlüssel und dürfen sich nicht ändern —
   angezeigt wird trotzdem, was man in der jeweiligen Sprache liest. */
const TAGKURZ = {MO:"MO", DI:"TU", MI:"WE", DO:"TH", FR:"FR", WE:"WKND"};
const tagKurz = k => istEnglisch() ? (TAGKURZ[k] || k) : k;
/* Spaltenköpfe des Kalenders. */
const KALENDERKOEPFE = () => istEnglisch()
  ? ["Mo","Tu","We","Th","Fr","Sa","Su"] : ["Mo","Di","Mi","Do","Fr","Sa","So"];

/* Der Text im Markup trägt seinen deutschen Satz selbst als Schlüssel.
   Gesammelt wird er einmal, bevor das erste Mal übersetzt wird — danach
   stünde dort Englisch, und der Schlüssel wäre verloren. */
const textNorm = s => String(s == null ? "" : s).replace(/\s+/g," ").trim();
let htmlTexte = null;
function htmlTexteSammeln(){
  htmlTexte = [];
  const nimm = (auswahl, art, lies) => document.querySelectorAll(auswahl).forEach(el => {
    const schluessel = textNorm(lies(el));
    if(schluessel) htmlTexte.push({el, art, schluessel});
  });
  /* Nur der erste Textknoten: Knöpfe wie „Hausaufgabe<small id=…>" tragen
     ein Feld in sich, das die App später füllt. textContent zu setzen
     würde es mitsamt seiner Kennung entfernen. */
  nimm("[data-t]", "text", el => {
    const k = [...el.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim());
    return k ? k.nodeValue : el.textContent;
  });
  nimm("[data-t-html]", "html", el => el.innerHTML);
  nimm("[data-t-ph]", "ph", el => el.getAttribute("placeholder"));
  nimm("[data-t-al]", "al", el => el.getAttribute("aria-label"));
}
function htmlTexteSetzen(){
  if(!htmlTexte) htmlTexteSammeln();
  htmlTexte.forEach(({el, art, schluessel}) => {
    const neu = txt(schluessel);
    if(art === "html"){ el.innerHTML = neu; return; }
    if(art === "ph"){ el.setAttribute("placeholder", neu); return; }
    if(art === "al"){ el.setAttribute("aria-label", neu); return; }
    const k = [...el.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim());
    if(k) k.nodeValue = neu; else el.textContent = neu;
  });
}
/* Wird bei jedem Zeichnen aufgerufen, tut aber nur etwas, wenn sich die
   Sprache wirklich geändert hat — auch ein Profilwechsel kann sie ändern. */
let spracheAktiv = null;
function spracheAnwenden(){
  const s = spracheJetzt();
  if(s === spracheAktiv) return;
  spracheAktiv = s;
  try{ document.documentElement.lang = s; }catch(e){}
  hilfeAufbauen();
  htmlTexteSetzen();
  /* Der Hinweis unten entsteht nur bei der Versionsprüfung. Ohne diese
     Zeile bliebe genau er nach einem Sprachwechsel deutsch stehen. */
  wischTextSetzen();
}
/* Sofort einsammeln, noch bevor irgendeine Funktion einen Text überschreibt —
   danach stünde dort nicht mehr der deutsche Satz, der als Schlüssel dient.
   app.js steht am Ende des <body>; die Elemente gibt es also schon. */
htmlTexteSammeln();

/* Date.now() allein kollidiert, sobald zwei Einträge in derselben
   Millisekunde entstehen — beim Einlesen einer Sicherung passiert genau das. */
const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
/* Eine ältere App darf Daten einer neueren Datenform weder migrieren noch
   speichern. Der Schalter wird beim Laden des aktiven Profils gesetzt. */
let datenZuNeu = false;

/* --- Speicher, an das aktive Profil gebunden --- */
const Speicher = {
  puffer:{},
  pfad(k){ return "p" + profilId + "_" + k; },
  lies(k, standard){
    try{ const v = localStorage.getItem(this.pfad(k)); return v ? JSON.parse(v) : standard; }
    catch(e){ return k in this.puffer ? this.puffer[k] : standard; }
  },
  schreib(k, v){
    if(datenZuNeu) return;
    this.puffer[k] = v;
    try{ localStorage.setItem(this.pfad(k), JSON.stringify(v)); }
    catch(e){ zeigeFehler(txt("Speicher voll. Lösche Bilder aus Merkblättern oder lege eine Sicherung an.")); }
  },
  entferne(k){
    if(datenZuNeu) return;
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
  if(datenZuNeu) return;
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
    profile = [{id:"1", name: alt ? txt("Mein Plan") : txt("Profil {n}", {n:1})}];
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
const profilName = () => (profile.find(x => x.id === profilId) || {}).name || txt("Profil");

let cfg, plan, eintraege, ferien, sonder, noten;
function zustandLaden(){
  Speicher.puffer = {};
  const rohCfg = Speicher.lies("cfg", {});
  datenZuNeu = datenstandVon(rohCfg) > SCHEMA;
  cfg       = Object.assign({}, STANDARD, rohCfg);
  /* Ein frisch angelegtes Profil hat noch gar keine Einstellungen. Nur
     dort entscheidet die Gerätesprache — ein bestehendes Profil bleibt
     deutsch, auch wenn das Gerät auf Englisch steht. Eine Aktualisierung
     der App darf niemandem die Sprache umstellen. */
  if(!Object.keys(rohCfg || {}).length) cfg.sprache = "";
  plan      = Speicher.lies("plan", {});
  eintraege = Speicher.lies("eintraege", []);
  ferien    = Speicher.lies("ferien", []);
  sonder    = Speicher.lies("sonder", []);
  noten     = Speicher.lies("noten", []);
  /* Schon die alte Merkblattmigration schreibt Daten. Bei einem neueren
     Datenstand muss deshalb vor jeder Migration abgebrochen werden. */
  if(!datenZuNeu) merkblattUmziehen();
  datenMigrieren();
}
/* Bis Fassung 3 erledigen normalisiere() und merkblattUmziehen() die
   Umstellung alter Formen von selbst; hier wird nur festgehalten, worauf
   spätere Schritte aufsetzen. Wichtig ist der umgekehrte Fall: Daten aus
   einer neueren App-Fassung dürfen nicht stillschweigend beschnitten werden. */
function datenMigrieren(){
  const war = datenstandVon(cfg);
  if(war === SCHEMA) return;
  if(war > SCHEMA){
    datenZuNeu = true;
    zeigeFehler(neuereDatenText(war));
    /* Nicht nur warnen: die Oberfläche vollständig sperren. Sonst könnte
       eine Tastenkombination oder ein Klick unter dem Fehlerkasten doch noch
       eine Schreiboperation auslösen. Der Neuladen-Knopf bleibt erreichbar. */
    const k = document.getElementById("fehlerkasten");
    if(k){ k.style.bottom = "0"; k.style.maxHeight = "none"; }
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
        titel:txt("Merkblatt"), notiz:text, bilder:[], erledigt:false, geloescht:false});
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
const zeigDatum = s => !s ? ""
  : istEnglisch() ? s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4)
                  : s.slice(8,10)+"."+s.slice(5,7)+"."+s.slice(0,4);
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
  if(datenZuNeu) return;
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
  if(datenZuNeu) return;
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
/* Lehrkraft-Kürzel überall groß — sonst zählen „Mü" und „MÜ" als zwei. */
const alsLk = v => String(v == null ? "" : v).trim().toUpperCase();
const lehrerName = k => (cfg.lehrer && cfg.lehrer[k]) || k || "";
const fachName   = k => (cfg.fachnamen && cfg.fachnamen[k]) || k || "";
/* Die Lehrkraft engt Suchen nur ein, solange die Trennung eingeschaltet ist.
   So bleibt jede Ansicht ohne die Einstellung genau die von vorher. */
const lkFilter = lk => cfg.nachLehrer ? alsLk(lk) : "";
/** Lehrkraft-Kürzel, die dieses Fach im Plan unterrichten. */
function lehrerZuFach(fach){
  const s = new Set();
  ["A","B"].forEach(w => TAGE.forEach(t =>
    ((plan[w] && plan[w][t]) || []).forEach(x => {
      if(x && x.fach && x.fach.toUpperCase() === fach && x.lk) s.add(alsLk(x.lk));
    })));
  return [...s].sort();
}
const freiAm = d => { const s = iso(d); return ferien.find(f => s >= f.von && s <= f.bis) || null; };
/* Leeres lk heisst: Lehrkraft egal. Nur so bleibt die Suche die alte,
   solange niemand nach Lehrkraft trennen will. */
function hatFachAm(d, fach, lk){
  if(!fach) return false;
  const i = tagIndex(d); if(i === 5) return false;
  const woche = plan[wocheFuer(d)];
  return ((woche && woche[TAGE[i]]) || []).some(x => x && x.fach
    && x.fach.toUpperCase() === fach && (!lk || alsLk(x.lk) === lk));
}
function naechsterTagMitFach(d, fach, lk){
  for(let i = 1; i <= 120; i++){
    const x = plusTage(d, i);
    if(hatFachAm(x, fach, lk) && !freiAm(x)) return x;
  }
  return null;
}
/** Letzter belegter Block eines Tages, -1 wenn gar nichts ansteht.
    Der Schultag endet dort, wo der Unterricht endet — nicht am Rasterende. */
function letzterBlock(d){
  const i = tagIndex(d); if(i === 5) return -1;
  const woche = plan[wocheFuer(d)], tag = TAGE[i];
  let letzte = -1;
  cfg.slots.forEach((s,k) => { if((woche && woche[tag] && woche[tag][k]) || sonderAn(d,k)) letzte = k; });
  return letzte;
}

/* Wiederkehrende Einträge entstehen als echte Einträge, einer je Termin,
   mit gemeinsamer serie-Kennung. Das ist mehr Speicher als eine Regel, die
   bei Bedarf Termine erzeugt — dafür funktionieren Abhaken, Suche, Kalender,
   Archiv und der Kalender-Export ohne jede Sonderbehandlung, und jeder
   einzelne Termin lässt sich abhaken, was das eigentliche Ziel ist. */
const WDH_MAX = 60;
function serienTermine(start, takt, bis){
  const raus = [];
  if(!takt) return [iso(start)];
  const grenze = bis || iso(plusTage(start, 7 * takt * (WDH_MAX - 1)));
  for(let i = 0; i < WDH_MAX; i++){
    const d = plusTage(start, i * 7 * takt);
    if(iso(d) > grenze) break;
    raus.push(iso(d));
  }
  return raus;
}

/* --- Noten --- */
/* Schlüssel für ein Fach bei einer bestimmten Lehrkraft. Der Schrägstrich
   kommt in keinem Kürzel vor — Fächer und Lehrkräfte laufen durch alsKuerzel. */
const lkSchluessel = (fach, lk) => fach + "/" + alsLk(lk);
/* Drei Stufen: eigener Wert für dieses Fach bei dieser Lehrkraft, sonst der
   des Fachs, sonst der Standard. Wer nach Lehrkraft trennt, tut das oft
   genau deshalb — zwei Kurse desselben Fachs gewichten verschieden. */
const anteilFuer = (fach, lk) => {
  const e = (lk && cfg.anteileLk && cfg.anteileLk[lkSchluessel(fach, lk)] != null)
    ? cfg.anteileLk[lkSchluessel(fach, lk)]
    : (cfg.anteile && cfg.anteile[fach]);
  return Math.max(0, Math.min(100, Number((e === undefined || e === null) ? cfg.anteilM : e) || 0));
};
const hatEigenenAnteil = (f, lk) => lk
  ? !!(cfg.anteileLk && cfg.anteileLk[lkSchluessel(f, lk)] != null)
  : !!(cfg.anteile && cfg.anteile[f] !== undefined && cfg.anteile[f] !== null);
/* lk undefiniert: alle Noten des Fachs. lk "" : nur die ohne Lehrkraft. */
function notenSchnitt(fach, lk){
  const teil = art => {
    const l = notenAktiv().filter(n => n.fach === fach && n.art === art
      && (lk === undefined || alsLk(n.lk) === alsLk(lk)));
    return l.length ? l.reduce((s,n) => s + n.wert, 0) / l.length : null;
  };
  const m = teil("m"), sch = teil("s"), aM = anteilFuer(fach, lk);
  if(m === null && sch === null) return {m:null, s:null, gesamt:null};
  if(m === null)   return {m:null, s:sch, gesamt:sch};
  if(sch === null) return {m, s:null, gesamt:m};
  return {m, s:sch, gesamt:(m*aM + sch*(100-aM))/100};
}
const notenText = w => (w === null || w === undefined) ? "—"
  : (cfg.notenSystem === "punkte15" ? kommaZahl(w.toFixed(1)) : kommaZahl(w.toFixed(2)));
const zeugnisNote = w => (w === null || w === undefined) ? null : Math.round(w);

/* --- Werkzeug --- */
const $ = s => document.querySelector(s);
const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const zahl = (n, ein, viele) => `${n} ${mehrzahlWort(n === 1 ? ein : viele)}`;
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
  /* Reines Schwarz statt #111: bei der Standardfarbe lag #111 mit 4,435:1
     knapp unter WCAG 4,5:1. Schwarz/Weiß garantiert für jede Hex-Farbe die
     kontrastreichere der beiden Extremfarben. */
  const gegenSchwarz = (L + 0.05) / 0.05;
  document.documentElement.style.setProperty("--aufAkzent", gegenSchwarz > gegenWeiss ? "#000" : "#fff");
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
  spracheAnwenden();
  if(datenZuNeu) return;
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
  /* Beide Stifte sitzen im selben Platz im Kopf — hier entscheidet sich,
     welcher davon zu sehen ist. Nie beide. */
  $("#btnEdit").classList.toggle("hidden", ansicht !== "tag");
  $("#btnSort").classList.toggle("hidden", !(ansicht === "eintraege" && einSub === null));
  const punkte = $("#wischPunkte");
  if(punkte) [...punkte.children].forEach((p,i) => p.classList.toggle("an", ANSICHTEN[i] === ansicht));
  try{
    if(ansicht === "tag") zeichneTag();
    else if(ansicht === "kalender") zeichneKalender();
    else if(ansicht === "zeugnis") zeichneZeugnis();
    else zeichneEintraege();
  }catch(e){ zeigeFehler(txt("Ansicht „{name}“", {name:ansicht})+": "+e.message, (e.stack||"").split("\n")[1]||""); }
}

function zeichneTag(){
  const idx = tagIndex(gewaehlt), woche = wocheFuer(gewaehlt);
  document.body.classList.toggle("bearbeiten", bearbeiten);
  $("#btnEdit").setAttribute("aria-pressed", bearbeiten);
  $("#editHinweis").classList.toggle("hidden", !bearbeiten);
  $("#klasseAnzeige").textContent = cfg.klasse || txt("Stundenplan");
  $("#titel").innerHTML = (idx === 5 ? txt("Wochenende") : txt(LANG[TAGE[idx]])) +
    ` <span>${tagMonat(gewaehlt)}</span>`;
  $("#kwLabel").textContent = txt("KW {n}", {n:kalenderwoche(gewaehlt)});
  $("#abLabel").classList.toggle("hidden", !cfg.zweiWochen);
  $("#abLabel").textContent = woche;
  $("#countdown").textContent = countdownText();

  const frei = freiAm(gewaehlt), b = $("#freiBanner");
  b.classList.toggle("hidden", !frei);
  if(frei) b.innerHTML = `<b>${esc(frei.name)}</b><div>${
    frei.typ === "feiertag" ? txt("Feiertag") : txt("Ferien")} · ${txt("kein Unterricht")}</div>`;

  const mo = montagVon(gewaehlt);
  $("#tage").innerHTML = [...TAGE, "WE"].map((t,i) => {
    const d = plusTage(mo, i === 5 ? 5 : i);
    const istHeute = gleich(d, new Date()) ||
      (i === 5 && tagIndex(new Date()) === 5 && gleich(montagVon(new Date()), mo));
    const hat = (i === 5 ? [plusTage(mo,5), plusTage(mo,6)] : [d])
      .flatMap(x => eintraegeAm(x)).filter(e => !e.erledigt);
    const zeichen = [...new Set(hat.map(e => e.typ))].join("");
    return `<button type="button" data-tag="${i}" aria-pressed="${i === idx}">${tagKurz(t)}
      ${istHeute ? '<span class="punkt"></span>'
        : (zeichen ? `<span class="khn" style="border:0;padding:0;display:block;margin-top:4px">${zeichen}</span>` : "")}
    </button>`;
  }).join("");

  if(idx === 5){
    $("#plan").innerHTML = [[txt("Samstag"),plusTage(mo,5)],[txt("Sonntag"),plusTage(mo,6)]].map(([n,d]) => {
      /* sonderTag statt sonderFrei: ein Ereignis, dem jemand eine Stunde
         zugeordnet hat, war am Wochenende sonst unsichtbar. */
      const es = eintraegeAm(d), ev = sonderTag(d);
      const inhalt =
        ev.map(o => `<div style="margin-top:9px" data-wesonder="${o.id}">
             <span class="einmalig">${o.art === "vertretung" ? txt("Vertretung") : o.art === "ausfall" ? txt("Ausfall") : txt("Ereignis")}</span>
             <span style="margin-left:7px">${esc(o.titel)}${
               o.slot !== null && cfg.slots[o.slot] ? " · " + esc(cfg.slots[o.slot].von) : ""}</span></div>`).join("") +
        es.map(e => `<div style="margin-top:9px"><span class="khn">${e.typ}</span>
             <span style="margin-left:7px">${e.fach ? esc(e.fach)+" — " : ""}${esc(e.titel) || txt(ART[e.typ])}</span></div>`).join("");
      return `<div class="we-teil">
        <div class="eyebrow">${n} ${tagMonat(d)}</div>
        ${inhalt || `<div class="detail" style="margin-top:6px">${txt("frei")}</div>`}
        <button class="mini" data-weplus="${iso(d)}" style="margin-top:11px">+ ${txt("Ereignis")}</button>
      </div>`;
    }).join("");
  } else {
    const tag = TAGE[idx];
    /* Leere Stunden am Ende des Tages werden abgeschnitten — der Tag endet
       dort, wo der Unterricht endet. Freistunden mittendrin bleiben stehen. */
    const letzte = letzterBlock(gewaehlt);
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
                 : o ? esc(o.titel) : (f ? esc(f.fach) : txt("frei"));
      let unten = stdText(s);
      if(ausfall) unten += " · " + txt("fällt aus");
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
          ${o && !ausfall ? `<div class="marker"><span class="einmalig">${o.art === "vertretung" ? txt("Vertretung") : txt("einmalig")}</span></div>` : ""}
          ${zeichen ? `<div class="marker">${zeichen}</div>` : ""}
        </div></button>`;
    });
    if(linie !== null) teile.splice(linie, 0, `<div class="jetztlinie"><span>${txt("jetzt")}</span></div>`);
    if(bis < cfg.slots.length && bis > 0)
      teile.push(`<div class="schluss">${txt("Schluss nach {zeit}", {zeit:esc(cfg.slots[bis-1].bis)})}</div>`);
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
  b.innerHTML = `<b>${txt("Sicherung fällig")}</b>
    <div>${alter === null ? txt("Dieser Plan wurde noch nie gesichert.")
      : txt("Letzte Sicherung vor {dauer}.", {dauer:zahl(alter,"Tag","Tagen")})}
      ${txt("Löscht der Browser seine Websitedaten, ist ohne Sicherung alles weg.")}</div>
    <div class="chips" style="margin-top:11px">
      <button type="button" id="bSicherJetzt">${txt("Jetzt sichern")}</button>
      <button type="button" id="bSicherSpaeter">${txt("Heute nicht")}</button>
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
  /* Der Balken zeigt den eigenen Schultag. Steht an diesem Tag nichts im
     Plan, gibt es auch nichts anzuzeigen — früher lief er bis zum Ende des
     Rasters weiter und meldete Freistunden, die niemand hat. */
  const letzter = letzterBlock(gewaehlt);
  if(!istHeuteSchultag() || letzter < 0){ box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const j = jetztMin(), tag = TAGE[tagIndex(gewaehlt)], woche = wocheFuer(gewaehlt);
  const inhalt = i => sonderAn(gewaehlt,i) || plan[woche][tag][i];
  const ersteVon = minuten(cfg.slots[0].von), letzteBis = minuten(cfg.slots[letzter].bis);
  let anteil = 0, links = "", rechts = "";
  const i = cfg.slots.findIndex((s,k) => k <= letzter && istAktuellerSlot(k));
  if(i >= 0){
    const s = cfg.slots[i], von = minuten(s.von), bis = minuten(s.bis);
    anteil = (j - von)/(bis - von);
    const x = inhalt(i);
    links = x ? `<b>${esc(x.fach || x.titel)}</b>${x.raum ? " · "+esc(x.raum) : ""}` : txt("Freistunde");
    rechts = txt("noch {n} min", {n:bis - j});
  } else if(j < ersteVon){
    links = txt("Beginnt um {zeit}", {zeit:cfg.slots[0].von});
    rechts = txt("in {n} min", {n:ersteVon - j});
  } else if(j >= letzteBis){
    anteil = 1; links = txt("Schule aus"); rechts = "";
  } else {
    let vor = cfg.slots[0], nach = cfg.slots[letzter];
    for(let k = 0; k < letzter; k++)
      if(j >= minuten(cfg.slots[k].bis) && j < minuten(cfg.slots[k+1].von)){ vor = cfg.slots[k]; nach = cfg.slots[k+1]; }
    const von = minuten(vor.bis), bis = minuten(nach.von);
    anteil = (j - von)/(bis - von);
    const naechstes = inhalt(cfg.slots.indexOf(nach));
    links = `<b>${txt("Pause")}</b>${naechstes
      ? " · " + txt("dann {fach}", {fach:esc(naechstes.fach || naechstes.titel)}) : ""}`;
    rechts = txt("weiter um {zeit} · noch {n} min", {zeit:nach.von, n:bis - j});
  }
  $("#balkenFuell").style.width = (Math.max(0,Math.min(1,anteil))*100).toFixed(1) + "%";
  $("#fortLinks").innerHTML = links;
  $("#fortRechts").textContent = rechts;
}
function countdownText(){
  const heute = new Date();
  const letzter = letzterBlock(gewaehlt);
  if(istHeuteSchultag() && letzter >= 0){
    const j = jetztMin(), ende = minuten(cfg.slots[letzter].bis);
    if(j < ende){
      const rest = ende - j;
      return txt("Schulschluss in {h} h {m} min", {h:Math.floor(rest/60), m:zwei(rest%60)});
    }
  }
  const naechste = ferien.filter(f => f.typ === "ferien" && f.von > iso(heute))
    .sort((a,b) => a.von.localeCompare(b.von))[0];
  if(naechste){
    const tage = Math.round((new Date(naechste.von+"T12:00") - new Date(iso(heute)+"T12:00"))/864e5);
    return txt("{name} in {dauer}", {name:naechste.name, dauer:zahl(tage,"Tag","Tagen")});
  }
  return "";
}

function listeZeile(e, mitNotiz = true){
  const d = new Date(e.datum + "T12:00");
  const abhakbar = e.typ === "H" || e.typ === "K" || e.typ === "N";
  return `<li class="${e.erledigt ? "weg" : ""}">
      ${abhakbar ? `<input type="checkbox" class="hak" data-hak="${e.id}" ${e.erledigt ? "checked" : ""} aria-label="${txt("Erledigt")}">`
                 : `<span style="width:18px;flex:none"></span>`}
      <div class="wachs" data-bearbeite="${e.id}">
        <div class="kopf"><span class="khn ${e.erledigt ? "aus" : ""}">${e.typ}</span>
          <span class="titel">${e.fach ? esc(e.fach)+" — " : ""}${esc(e.titel) || txt(ART[e.typ])}</span></div>
        ${mitNotiz && e.notiz ? `<div class="notiz">${esc(e.notiz)}</div>` : ""}
        <div class="wann">${d.toLocaleDateString(ORT(),{weekday:"short",day:"2-digit",month:"2-digit"})}${
          e.serie ? " · " + txt("Reihe") : ""}</div>
      </div></li>`;
}
function zeichneListe(sel, nixSel, liste, mitNotiz = true){
  $(sel).innerHTML = liste.map(e => listeZeile(e, mitNotiz)).join("");
  $(nixSel).hidden = liste.length > 0;
}
/** Dieselbe Liste, aber mit einer Zwischenüberschrift je Lehrkraft.
    Bei nur einer Gruppe wäre die Überschrift eine leere Geste — dann
    bleibt es bei der schlichten Liste. */
function zeichneListeNachLehrer(sel, nixSel, liste){
  const gruppen = new Map();
  liste.forEach(e => {
    const k = alsLk(e.lk);
    if(!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  });
  if(gruppen.size < 2){ zeichneListe(sel, nixSel, liste); return; }
  /* „Ohne Lehrkraft" ganz nach unten: dort steht, was noch zuzuordnen ist. */
  const reihe = [...gruppen.keys()].sort((a,b) =>
    (a ? 0 : 1) - (b ? 0 : 1) || lehrerName(a).localeCompare(lehrerName(b)));
  $(sel).innerHTML = reihe.map(k =>
    `<li style="display:block;padding:0;border:0"><div class="eyebrow mitte" style="margin-top:18px">
       ${k ? esc(lehrerName(k)) : txt("Ohne Lehrkraft")}</div></li>`
    + gruppen.get(k).map(e => listeZeile(e)).join("")).join("");
  $(nixSel).hidden = liste.length > 0;
}

function zeichneKalender(){
  $("#monatLabel").textContent = kalMonat.toLocaleDateString(ORT(),{month:"long",year:"numeric"});
  const start = montagVon(new Date(kalMonat.getFullYear(), kalMonat.getMonth(), 1));
  let html = KALENDERKOEPFE().map(w => `<div class="wt">${w}</div>`).join("");
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
  $("#kalTagLabel").textContent = kalTag.toLocaleDateString(ORT(),{weekday:"long",day:"2-digit",month:"long"});
  const frei = freiAm(kalTag);
  $("#kalFerien").classList.toggle("hidden", !frei);
  if(frei) $("#kalFerien").textContent = frei.name
    + " · " + (frei.typ === "feiertag" ? txt("Feiertag") : txt("Ferien"));
  zeichneListe("#kalListe", "#kalNix", eintraegeAm(kalTag), false);
  const ev = sonderTag(kalTag);
  if(ev.length){
    $("#kalListe").insertAdjacentHTML("afterbegin", ev.map(o => `<li>
      <span style="width:18px;flex:none"></span>
      <div class="wachs" data-ereignis="${o.id}"><div class="kopf"><span class="einmalig">${txt("Ereignis")}</span>
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
    const knopf = `<button type="button" data-sub="${k}">${txt(ARTLANG[k])}<small id="zahl${k}"></small></button>`;
    if(!sortModus) return knopf;
    /* Im Sortiermodus zählt der Kachelklick nicht — sonst öffnet sich beim
       Umsortieren dauernd eine Liste. */
    return `<div class="kachelreihe">
      <div>${knopf}</div>
      <div class="pfeile">
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
  if(!tage) return txt("Gelöschtes bleibt hier, bis du es selbst entfernst. "
    + "Eine Frist stellst du unter ⚙ → Archiv ein.");
  const bald = liste.filter(a => a.rest !== null && a.rest <= 7).length;
  return txt("Gelöschtes wird {dauer} nach dem Löschen endgültig entfernt.", {dauer:zahl(tage,"Tag","Tage")})
    + (bald ? " " + txtz(bald, "{n} Eintrag geht in der kommenden Woche verloren.",
                               "{n} Einträge gehen in der kommenden Woche verloren.") : "")
    + " " + txt("Zum sofortigen Entfernen ein zweites Mal löschen.");
}
const archivFinden = (art,id) => art === "eintrag" ? eintraege.find(x => x.id === id)
  : art === "ereignis" ? sonder.find(x => x.id === id) : noten.find(x => x.id === id);

function zeichneEintraege(){
  $("#einMenu").classList.toggle("hidden", einSub !== null);
  $("#einDetail").classList.toggle("hidden", einSub === null);
  $("#btnSort").setAttribute("aria-pressed", sortModus);
  $("#sortHinweis").classList.toggle("hidden", !sortModus);
  $("#einSubHinweis").textContent = "";
  $("#einSubHinweis").style.color = "";

  if(einSub === null){
    kachelnZeichnen();
    const off = t => listeVonTyp(t).filter(e => !e.erledigt).length;
    const std = fehlStunden();
    const zaehler = {
      H: off("H") ? txt("{n} offen", {n:off("H")}) : txt("nichts offen"),
      K: off("K") ? txt("{n} anstehend", {n:off("K")}) : txt("nichts anstehend"),
      N: off("N") ? txt("{n} vorhanden", {n:off("N")}) : txt("keine"),
      E: kommendeEreignisse().length ? txt("{n} geplant", {n:kommendeEreignisse().length}) : txt("keine"),
      G: notenAktiv().length ? txt("{n} eingetragen", {n:notenAktiv().length}) : txt("keine"),
      M: listeVonTyp("M").length ? txt("{n} vorhanden", {n:listeVonTyp("M").length}) : txt("keine"),
      F: std ? `${zahl(std,"Stunde","Stunden")} · ${tageText(std)}` : txt("keine"),
      archiv: archivListe().length ? txt("{n} im Archiv", {n:archivListe().length}) : txt("leer")
    };
    Object.entries(zaehler).forEach(([k,v]) => { const el = $("#zahl"+k); if(el) el.textContent = v; });
    suchen();

    return;
  }
  $("#einTitel").textContent = einSub && ARTLANG[einSub] ? txt(ARTLANG[einSub]) : "";

  if(einSub === "archiv"){
    const liste = archivListe();
    const el = $("#einSubHinweis");
    el.textContent = archivHinweis(liste);
    el.style.color = archivFrist() ? "var(--akzent)" : "";
    $("#einListe").innerHTML = liste.map(e => {
      const rest = e.rest === null ? ""
        : e.rest <= 0 ? " · " + txt("wird beim nächsten Öffnen entfernt")
        : e.rest === 1 ? " · " + txt("noch heute")
        : " · " + txt("noch {dauer}", {dauer:zahl(e.rest,"Tag","Tage")});
      return `<li>
      <div class="wachs">
        <div class="kopf"><span class="khn aus">${esc(e.marke)}</span>
          <span class="titel" style="color:var(--muted)">${esc(e.text)}</span></div>
        <div class="wann">${zeigDatum(e.datum)} · ${txt("gelöscht {datum}", {datum:zeigDatum(e.seit)})}<span
          style="${e.rest !== null && e.rest <= 7 ? "color:var(--akzent)" : ""}">${rest}</span></div></div>
      <button class="mini" data-zurueck="${e.art}:${e.id}">${txt("Zurück")}</button>
      <button class="mini" data-endgueltig="${e.art}:${e.id}" style="border-color:var(--akzent);color:var(--akzent)">${txt("Löschen")}</button>
    </li>`; }).join("");
    $("#einNix").textContent = txt("Archiv ist leer.");
    $("#einNix").hidden = liste.length > 0;
    return;
  }
  if(einSub === "E"){
    const liste = kommendeEreignisse();
    $("#einListe").innerHTML = liste.map(o => {
      const d = new Date(o.datum+"T12:00");
      const wann = d.toLocaleDateString(ORT(),{weekday:"short",day:"2-digit",month:"2-digit"}) +
        (o.slot !== null && cfg.slots[o.slot] ? ` · ${esc(cfg.slots[o.slot].von)}` : " · " + txt("ganzer Tag"));
      return `<li><span style="width:18px;flex:none"></span>
        <div class="wachs" data-ereignis="${o.id}">
          <div class="kopf"><span class="einmalig">${o.art === "ausfall" ? txt("Ausfall") : o.art === "vertretung" ? txt("Vertretung") : txt("Ereignis")}</span>
            <span class="titel">${esc(o.titel)}</span></div>
          ${o.notiz ? `<div class="notiz">${esc(o.notiz)}</div>` : ""}
          <div class="wann">${wann}${o.raum ? " · "+esc(o.raum) : ""}</div></div></li>`;
    }).join("");
    $("#einNix").textContent = txt("Keine Ereignisse geplant.");
    $("#einNix").hidden = liste.length > 0;
    return;
  }
  if(einSub === "G"){ zeichneNoten(); return; }
  if(einSub === "M"){ zeichneMerk(); return; }
  if(einSub === "F"){ zeichneFehlzeiten(); return; }

  const liste = listeVonTyp(einSub);
  if(cfg.nachLehrer && einSub === "N") zeichneListeNachLehrer("#einListe", "#einNix", liste);
  else zeichneListe("#einListe", "#einNix", liste);
  $("#einNix").textContent = txt({H:"Keine offenen Hausaufgaben.",K:"Keine Klausuren eingetragen.",
                              N:"Keine Notizen."}[einSub] || "Nichts vorhanden.");
}

function zeichneNoten(){
  $("#einSubHinweis").textContent =
    txt("Verhältnis je Fach antippbar. Standard: {n} % mündlich.", {n:Number(cfg.anteilM)||0});
  const liste = alleFaecher().filter(f => notenAktiv().some(n => n.fach === f));
  $("#einListe").innerHTML = liste.map(f => {
    const sch = notenSchnitt(f), aM = anteilFuer(f);
    const eigene = notenAktiv().filter(n => n.fach === f).sort((a,b) => b.datum.localeCompare(a.datum));
    /* Wo nach Lehrkraft getrennt wird, braucht jede Lehrkraft ihren eigenen
       Chip — sonst gäbe es die Fach-Option ohne die Lehrkraft-Option. */
    const lkChips = lehrerTeileZuFach(f).filter(t => t.lk).map(t =>
      `<button type="button" class="anteilchip" data-anteil="${esc(f)}" data-anteillk="${esc(t.lk)}">
        ${esc(t.name)}: ${anteilFuer(f, t.lk)} %${hatEigenenAnteil(f, t.lk) ? " · " + txt("eigen") : ""}</button>`).join("");
    return `<li style="display:block;padding:0;border:0"><div class="notenkarte">
      <div class="kopfz">
        <div><div style="font-size:17px">${esc(fachName(f))}</div>
          <div class="teil">${txt("mündlich {m} · schriftlich {s}",
            {m:notenText(sch.m), s:notenText(sch.s)})}</div></div>
        <div class="schnitt">${notenText(sch.gesamt)}</div></div>
      <div class="notenchips"><button type="button" class="anteilchip" data-anteil="${esc(f)}">
        ${txt("{n} % mündlich", {n:aM})}${hatEigenenAnteil(f) ? " · " + txt("eigen") : ""}</button>${lkChips}</div>
      ${eigene.map(n => `<div class="notenzeile" data-note="${n.id}">
        <span class="wert">${notenText(n.wert)}</span>
        <span class="art">${n.art === "m" ? txt("mündl.") : txt("schriftl.")}</span>
        <span class="wofuer">${esc(n.titel) || "—"}</span>
        <span class="tag">${zeigDatum(n.datum)}</span></div>`).join("")}
    </div></li>`;
  }).join("");
  $("#einNix").textContent = txt("Noch keine Noten eingetragen.");
  $("#einNix").hidden = liste.length > 0;
}

function zeichneMerk(){
  /* Mit Trennung nach Lehrkraft zählt Fach *und* Lehrkraft als Überschrift —
     sonst gäbe es hier die Fach-Gliederung ohne die Lehrkraft-Gliederung. */
  const schluessel = e => cfg.nachLehrer ? e.fach + "/" + alsLk(e.lk) : e.fach;
  const liste = listeVonTyp("M").slice()
    .sort((a,b) => schluessel(a).localeCompare(schluessel(b)) || b.datum.localeCompare(a.datum));
  $("#einSubHinweis").textContent = txt("Antippen zum Ansehen.");
  let letztesFach = null;
  $("#einListe").innerHTML = liste.map(e => {
    const jetzt = schluessel(e);
    const kopf = jetzt !== letztesFach
      ? `<div class="eyebrow mitte" style="margin-top:18px">${esc(fachName(e.fach))}${
          cfg.nachLehrer && e.lk ? " · " + esc(lehrerName(alsLk(e.lk))) : ""}</div>` : "";
    letztesFach = jetzt;
    const bilder = (e.bilder || []).length;
    return `<li style="display:block;padding:0;border:0">${kopf}
      <button type="button" class="merkzeile" data-schau="${e.id}">
        <div class="mtitel">${esc(e.titel) || txt("Merkblatt")}</div>
        <div class="mstand">${zeigDatum(e.datum)}${e.zeit ? " · "+e.zeit : ""}
          ${bilder ? " · " + zahl(bilder,"Bild","Bilder") : ""}</div>
      </button></li>`;
  }).join("");
  $("#einNix").textContent = txt("Noch keine Merkblätter.");
  $("#einNix").hidden = liste.length > 0;
}

/* Fehlzeiten werden in Unterrichtsstunden gezählt, nicht je Fach —
   so steht es auch auf dem Zeugnis. */
const fehlStunden = art => listeVonTyp("F")
  .filter(e => !art || e.titel === art)
  .reduce((s,e) => s + (Number(e.stunden) || 1), 0);
const alsTage = std => {
  const p = Math.max(1, Number(cfg.stdProTag) || 8);
  const w = std / p;
  return w % 1 ? kommaZahl(w.toFixed(1)) : String(w);
};
const tageText = std => { const w = alsTage(std); return `${w} ${mehrzahlWort(w === "1" ? "Tag" : "Tage")}`; };
function fehlText(){
  const g = fehlStunden(), u = fehlStunden("unentschuldigt");
  if(!g) return "";
  return `${zahl(g,"Stunde","Stunden")} = ${tageText(g)}`
       + (u ? " · " + txt("davon {n} unentschuldigt", {n:u}) : "");
}
/** Versäumte Stunden je Fach — was ohne Fach erfasst wurde, bleibt aussen vor.
    Mit Trennung nach Lehrkraft zählt jeder Kurs für sich. */
function fehlJeFach(){
  const nach = new Map();
  listeVonTyp("F").forEach(e => {
    if(!e.fach) return;
    const k = fachName(e.fach)
      + (cfg.nachLehrer && e.lk ? " (" + lehrerName(alsLk(e.lk)) + ")" : "");
    nach.set(k, (nach.get(k) || 0) + (Number(e.stunden) || 1));
  });
  return [...nach.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
function zeichneFehlzeiten(){
  const liste = listeVonTyp("F");
  const jeFach = fehlJeFach();
  $("#einSubHinweis").textContent = fehlText()
    + (jeFach.length ? " · " + jeFach.map(([f,n]) => `${f} ${n}`).join(", ") : "");
  $("#einListe").innerHTML = liste.map(e => `<li>
    <span style="width:18px;flex:none"></span>
    <div class="wachs" data-bearbeite="${e.id}">
      <div class="kopf"><span class="khn">F</span>
        <span class="titel">${e.fach ? esc(e.fach) + (cfg.nachLehrer && e.lk ? " ("+esc(alsLk(e.lk))+")" : "") + " — " : ""}${
          zahl(Number(e.stunden)||1,"Stunde","Stunden")} ${e.titel ? esc(txt(e.titel)) : txt("Fehlzeit")}</span></div>
      ${e.notiz ? `<div class="notiz">${esc(e.notiz)}</div>` : ""}
      <div class="wann">${zeigDatum(e.datum)}</div></div></li>`).join("");
  $("#einNix").textContent = txt("Keine Fehlzeiten erfasst.");
  $("#einNix").hidden = liste.length > 0;
}

/** Fächer in der eingestellten Reihenfolge, neue hinten angehängt. */
function fachReihenfolge(){
  const alle = alleFaecher().filter(f => faecher().includes(f) || notenAktiv().some(n => n.fach === f));
  const wunsch = Array.isArray(cfg.reiheFach) ? cfg.reiheFach : [];
  return [...wunsch.filter(f => alle.includes(f)), ...alle.filter(f => !wunsch.includes(f))];
}
/** Unterpunkte eines Fachs — leer, wo es nur eine Lehrkraft gibt: dann
    wiederholte die Zeile bloss den Schnitt darüber. */
function lehrerTeileZuFach(f){
  if(!cfg.nachLehrer) return [];
  const s = new Set(lehrerZuFach(f));
  notenAktiv().forEach(n => { if(n.fach === f && n.lk) s.add(alsLk(n.lk)); });
  const teile = [...s].sort().map(k => ({lk:k, name:lehrerName(k)}));
  if(notenAktiv().some(n => n.fach === f && !n.lk)) teile.push({lk:"", name:txt("ohne Lehrkraft")});
  return teile.length > 1 ? teile : [];
}
function zeichneZeugnis(){
  const liste = fachReihenfolge();
  const schnitte = liste.map(f => notenSchnitt(f).gesamt).filter(w => w !== null);
  const gesamt = schnitte.length ? schnitte.reduce((a,b) => a+b, 0)/schnitte.length : null;
  $("#zeuSchnitt").textContent = gesamt === null ? "" : notenText(gesamt);
  const fehl = fehlText();
  $("#zeuHinweis").textContent = (notenAktiv().length
    ? txt("Aus {noten} in {a} von {b} Fächern.",
        {noten:zahl(notenAktiv().length,"Note","Noten"), a:schnitte.length, b:liste.length})
    : txt("Noch keine Noten. Tippe ein Fach an, um Verhältnis und Zielnote zu setzen."))
    + (fehl ? "  " + txt("Versäumt: {text}.", {text:fehl}) : "");
  $("#zeuListe").innerHTML = liste.map(f => {
    const sch = notenSchnitt(f), ganz = zeugnisNote(sch.gesamt);
    const anzahl = notenAktiv().filter(n => n.fach === f).length;
    const unter = lehrerTeileZuFach(f).map(t => {
      const ts = notenSchnitt(f, t.lk), tg = zeugnisNote(ts.gesamt);
      /* Auch die Unterzeile führt in den Verhältnis- und Zielnoten-Dialog —
         ohne das gäbe es die Einstellung nur für das Fach als Ganzes, und
         der Schnitt darunter wäre mit dem falschen Verhältnis gerechnet. */
      return t.lk
        ? `<button type="button" class="zeuUnter" data-zeufach="${esc(f)}" data-zeulk="${esc(t.lk)}">
             <span class="wer">${esc(t.name)}<small>${txt("{n} % mündlich", {n:anteilFuer(f, t.lk)})}</small></span>
             <span class="roh">${notenText(ts.gesamt)}</span>
             <span class="note">${tg === null ? "—" : tg}</span></button>`
        : `<div class="zeuUnter"><span class="wer">${esc(t.name)}</span>
             <span class="roh">${notenText(ts.gesamt)}</span>
             <span class="note">${tg === null ? "—" : tg}</span></div>`;
    }).join("");
    return `<button type="button" class="zeuZeile" data-zeufach="${esc(f)}">
      <div class="fachn">${esc(fachName(f))}
        <small>${anzahl ? zahl(anzahl,"Note","Noten") : txt("keine Noten")} · ${txt("{n} % mündlich", {n:anteilFuer(f)})}</small></div>
      <div class="roh">${notenText(sch.gesamt)}</div>
      <div class="note">${ganz === null ? "—" : ganz}</div></button>${unter}`;
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
/* Am Rechner gibt es kein Wischen. Die Pfeiltasten tun dasselbe — aber nur,
   wenn gerade nichts getippt wird und kein anderer Dialog offen ist, sonst
   springt die Ansicht mitten in einer Eingabe weg. */
document.addEventListener("keydown", e => {
  if(e.altKey || e.ctrlKey || e.metaKey) return;
  const ziel = e.target;
  if(ziel && (ziel.isContentEditable
    || ["INPUT","TEXTAREA","SELECT"].includes(ziel.tagName))) return;
  /* Die Profilauswahl ist kein <dialog>, verdeckt aber alles. Ohne diese
     Zeile blättert man hinter ihr durch eine Ansicht, die niemand sieht. */
  if(!$("#profilStart").classList.contains("hidden")) return;
  const offen = [...document.querySelectorAll("dialog[open]")];
  if(offen.length){
    /* Im Wochendialog blättern die Pfeile die Woche — überall sonst nichts. */
    if(offen.length === 1 && offen[0] === dlgWoche && (e.key === "ArrowLeft" || e.key === "ArrowRight")){
      wochenAnker = plusTage(wochenAnker, e.key === "ArrowLeft" ? -7 : 7);
      zeichneWoche(); e.preventDefault();
    }
    return;
  }
  if(e.key === "/"){
    e.preventDefault();
    ansicht = "eintraege"; einSub = null; zeichne();
    $("#suchFeld").focus();
    return;
  }
  if(e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const r = e.key === "ArrowLeft" ? -1 : 1;
  if(ansicht === "tag"){ gewaehlt = plusTage(gewaehlt, r); zeichne(); e.preventDefault(); }
  else if(ansicht === "kalender"){
    kalMonat = new Date(kalMonat.getFullYear(), kalMonat.getMonth()+r, 1); zeichne(); e.preventDefault();
  }
});
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
    kalTag.toLocaleDateString(ORT(),{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const dran = sonderTag(kalTag).length + eintraegeAm(kalTag).length;
  $("#kmStand").textContent = [
    frei ? frei.name + " · " + (frei.typ === "feiertag" ? txt("Feiertag")
                      : frei.typ === "eigen" ? txt("eigener freier Tag") : txt("Ferien")) : "",
    dran ? zahl(dran, "Eintrag", "Einträge") : ""
  ].filter(Boolean).join(" · ") || txt("nichts eingetragen");
  $("#bKmFreiText").textContent = eigen ? txt("Freien Tag ändern") : txt("Freier Tag");
  $("#bKmFreiKlein").textContent = eigen ? eigen.name : txt("Praktikum, Ausflug, beweglicher Ferientag");
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
  const name = tfName.value.trim() || txt("Frei");
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
  $("#dlgBlockTitel").textContent = txt("{tag}, {std}. Stunde",
    {tag:txt(LANG[tag]), std:cfg.slots[offenerBlock].std.replace(/,/g,"/")});
  $("#dlgBlockZeit").textContent = `${cfg.slots[offenerBlock].von} – ${cfg.slots[offenerBlock].bis}`;
  const h = $("#hinweisWoche");
  h.classList.toggle("hidden", !cfg.zweiWochen);
  h.textContent = txt("Gilt nur für die {woche}-Woche.", {woche});
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

const schnellBlock = () => plan[wocheFuer(gewaehlt)][TAGE[tagIndex(gewaehlt)]][offenerBlock];
const schnellFach = () => { const f = schnellBlock(); return f ? f.fach : ""; };
/* Dieselbe Stunde meint dieselbe Lehrkraft — sonst landet die Hausaufgabe
   beim Parallelkurs desselben Fachs. */
const schnellLk = () => { const f = schnellBlock(); return f ? lkFilter(f.lk) : ""; };
function schnellDialog(){
  const fach = schnellFach();
  if(!fach){ eintragOeffnen(null, gewaehlt, "E", "", offenerBlock); return; }
  const s = cfg.slots[offenerBlock];
  $("#schnellTitel").textContent = fachName(fach)
    + (schnellLk() ? " · " + lehrerName(schnellLk()) : "");
  $("#schnellZeit").textContent = `${s.von} – ${s.bis}`;
  const naechste = naechsterTagMitFach(gewaehlt, fach.toUpperCase(), schnellLk());
  $("#bSchnellHAZiel").textContent = naechste
    ? txt("fällig {datum}", {datum:naechste.toLocaleDateString(ORT(),{weekday:"short",day:"2-digit",month:"2-digit"})})
    : txt("kein weiterer Termin");
  dlgSchnell.showModal();
}
const schnell = (typ, datum, extra) => { dlgSchnell.close();
  eintragOeffnen(null, datum, typ, schnellFach(), offenerBlock,
                 Object.assign({lk:schnellLk()}, extra)); };
$("#bSchnellHA").onclick = () => {
  const fach = schnellFach();
  schnell("H", naechsterTagMitFach(gewaehlt, fach.toUpperCase(), schnellLk()) || plusTage(gewaehlt,1));
};
$("#bSchnellNotiz").onclick   = () => schnell("N", gewaehlt);
$("#bSchnellKlausur").onclick = () => schnell("K", gewaehlt);
$("#bSchnellFehl").onclick = () => {
  const std = (cfg.slots[offenerBlock].std || "1").split(",").length;
  dlgSchnell.close();
  /* Das Fach kommt aus der angetippten Stunde. Gezählt wird die Fehlzeit
     weiter in Unterrichtsstunden — aber wer eine Entschuldigung schreibt
     oder Stoff nachholt, will wissen, welche Stunden es waren. */
  eintragOeffnen(null, gewaehlt, "F", schnellFach(), offenerBlock,
                 {stunden:std, lk:schnellLk()});
};
$("#bSchnellAusfall").onclick = () => {
  dlgSchnell.close();
  const datum = iso(gewaehlt);
  sonder = sonder.filter(x => !(x.datum === datum && x.slot === offenerBlock));
  sonder.push({id:neueId(), datum, slot:offenerBlock, art:"ausfall",
               titel:txt("Fällt aus"), raum:"", notiz:"", geloescht:false});
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
  const k = f.fach.toUpperCase(), lk = lkFilter(f.lk);
  fachInfoFach = k;
  /* Mit Trennung zählen nur die Stunden bei dieser Lehrkraft — sonst wäre
     die Zahl die des ganzen Fachs und passte nicht zum Rest der Karte. */
  let stunden = 0;
  ["A","B"].forEach(w => TAGE.forEach(t =>
    (plan[w][t]||[]).forEach(x => {
      if(x && x.fach.toUpperCase() === k && (!lk || alsLk(x.lk) === lk)) stunden++;
    })));
  const proWoche = cfg.zweiWochen ? stunden/2 : stunden;
  const naechste = naechsterTagMitFach(gewaehlt, k, lk);
  const sch = notenSchnitt(k);
  const offen = aktiv().filter(e => !e.erledigt && e.fach === k && (e.typ === "H" || e.typ === "K"));
  const mb = aktiv().filter(e => e.fach === k && e.typ === "M").length;

  $("#fiTitel").textContent = fachName(k);
  $("#fiKuerzel").textContent = fachName(k) === k ? "" : k;
  const zeile = (a,b) => `<div class="fiZeile"><span>${a}</span><span>${b}</span></div>`;
  $("#fiInhalt").innerHTML =
    zeile(txt("Lehrkraft"), f.lk ? esc(lehrerName(f.lk)) : "—") +
    zeile(txt("Raum"), esc(f.raum) || "—") +
    zeile(txt("Stunden je Woche"), proWoche % 1 ? kommaZahl(proWoche.toFixed(1)) : String(proWoche)) +
    (naechste ? `<div class="fiZeile"><span>${txt("Als Nächstes")}</span>
       <span><button type="button" class="mini" data-zukalender="${iso(naechste)}">
       ${naechste.toLocaleDateString(ORT(),{weekday:"short",day:"2-digit",month:"2-digit"})}</button></span></div>`
     : zeile(txt("Als Nächstes"),"—")) +
    zeile(txt("Schnitt"), notenText(sch.gesamt)) +
    zeile(txt("Merkblätter"), mb ? String(mb) : txt("keine")) +
    zeile(txt("Offen"), offen.length ? offen.map(e => e.typ).join(" ") : txt("nichts"));
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
   Wochenansicht
   Ein Dialog statt eines fünften Reiters: die Reiterleiste ist bei 390px
   mit vier Beschriftungen schon randvoll, ein fünfter Knopf bräche sie.
   Dialoge sind ausserdem die Art, wie diese App sonst Dichtes zeigt.
   ===================================================================== */
let wochenAnker = null;

function wochenOeffnen(d){
  wochenAnker = montagVon(d || gewaehlt);
  zeichneWoche();
  dlgWoche.showModal();
}
function zeichneWoche(){
  const mo = wochenAnker, woche = wocheFuer(mo);
  $("#wochenLabel").textContent = txt("KW {n}", {n:kalenderwoche(mo)})
    + (cfg.zweiWochen ? " · " + txt("{w}-Woche", {w:woche}) : "")
    + ` · ${tagMonat(mo)}`;

  const tage = TAGE.map((t,i) => plusTage(mo, i));
  const kopf = `<tr><th class="zeitspalte"></th>` + TAGE.map((t,i) =>
    `<th class="${gleich(tage[i], new Date()) ? "heute" : ""}">${tagKurz(t)}</th>`).join("") + `</tr>`;

  /* Nur so viele Zeilen, wie in dieser Woche irgendwo Unterricht steht —
     dieselbe Regel wie im Tagesplan, sonst stehen unten leere Reihen. */
  let letzte = -1;
  cfg.slots.forEach((s,i) => {
    if(tage.some(d => (plan[wocheFuer(d)] && plan[wocheFuer(d)][TAGE[tagIndex(d)]] || [])[i]
                   || sonderAn(d,i))) letzte = i;
  });
  const bis = letzte < 0 ? 0 : letzte + 1;

  const zeilen = cfg.slots.slice(0, bis).map((s,i) => {
    const spalten = tage.map((d,ti) => {
      const frei = freiAm(d);
      const regulaer = (plan[wocheFuer(d)] && plan[wocheFuer(d)][TAGE[ti]] || [])[i];
      const o = sonderAn(d, i);
      const ausfall = o && o.art === "ausfall";
      const f = (o && !ausfall) ? null : regulaer;
      const marken = [...new Set(eintraegeAm(d)
        .filter(e => !e.erledigt && f && e.fach && e.fach.toUpperCase() === f.fach.toUpperCase())
        .map(e => e.typ))].join("");
      const text = ausfall ? esc(regulaer ? regulaer.fach : "—")
                 : o ? esc(o.titel) : (f ? esc(f.fach) : "");
      const raum = o ? o.raum : (f ? f.raum : "");
      const klassen = [frei ? "ferien" : "", gleich(d, new Date()) ? "heute" : "",
                       text ? "" : "frei"].filter(Boolean).join(" ");
      return `<td class="${klassen}"><button type="button" class="zelle ${ausfall ? "aus" : ""}"
          data-wochentag="${iso(d)}">${text || "·"}${
          raum ? `<span class="wraum">${esc(raum)}</span>` : ""}${
          marken ? `<span class="wmarke">${esc(marken)}</span>` : ""}</button></td>`;
    }).join("");
    return `<tr><td class="zeitspalte">${esc(s.von)}<br>${stdText(s)}</td>${spalten}</tr>`;
  }).join("");

  $("#wochenTab").innerHTML = bis ? kopf + zeilen : "";
  const ferienDerWoche = [...new Set(tage.map(d => freiAm(d)).filter(Boolean).map(f => f.name))];
  $("#wochenHinweis").textContent = !bis
    ? txt("In dieser Woche steht nichts im Plan.")
    : (ferienDerWoche.length ? ferienDerWoche.join(" · ") + " · " : "")
      + txt("Eine Stunde antippen springt auf den Tag.");
}
$("#btnWoche").onclick = () => wochenOeffnen(gewaehlt);
$("#bWocheAb").onclick = () => dlgWoche.close();
$("#bWocheHeute").onclick = () => { wochenAnker = montagVon(new Date()); zeichneWoche(); };
$("#wochenMinus").onclick = () => { wochenAnker = plusTage(wochenAnker, -7); zeichneWoche(); };
$("#wochenPlus").onclick  = () => { wochenAnker = plusTage(wochenAnker,  7); zeichneWoche(); };
$("#wochenTab").onclick = e => {
  const b = e.target.closest("[data-wochentag]"); if(!b) return;
  dlgWoche.close();
  gewaehlt = new Date(b.dataset.wochentag+"T12:00");
  ansicht = "tag"; zeichne();
};

/* =====================================================================
   Eintragsdialog — eine Oberfläche für alle Arten
   ===================================================================== */
let bearbeiteId = null, ereignisId = null, noteId = null, bilder = [], ereignisArt = "ereignis";
/* Die zuletzt geöffnete Lehrkraft. Ist die Trennung aus, ist das Feld
   unsichtbar — dann darf ein Speichern eine früher gesetzte Zuordnung
   trotzdem nicht wegwerfen. */
let eintragLk = "";

function fachAuswahlFuellen(wert){
  const liste = alleFaecher();
  eFach.innerHTML = `<option value="">— ${txt("keins")} —</option>` +
    liste.map(f => `<option ${f === wert ? "selected" : ""}>${esc(f)}</option>`).join("") +
    `<option value="__frei">${txt("Anderes …")}</option>`;
  if(wert && !liste.includes(wert)){ eFach.value = "__frei"; eFachFrei.value = wert; }
  else if(!wert) eFach.value = "";
  freiUmschalten();
}
const freiUmschalten = () => $("#eFachFreiWrap").classList.toggle("hidden", eFach.value !== "__frei");
const aktuellesFach = () => (eFach.value === "__frei" ? eFachFrei.value : eFach.value).trim().toUpperCase();
/* Zur Auswahl stehen die Lehrkräfte, die dieses Fach im Plan unterrichten.
   Ohne Fach die aus dem ganzen Plan — sonst bliebe das Feld leer. */
function lkAuswahlFuellen(wert){
  const fach = aktuellesFach(), w = alsLk(wert);
  const liste = [...new Set([...(fach ? lehrerZuFach(fach) : alleLehrer()), ...(w ? [w] : [])])].sort();
  eLk.innerHTML = `<option value="">— ${txt("alle")} —</option>` + liste.map(k =>
    `<option value="${esc(k)}" ${k === w ? "selected" : ""}>${esc(lehrerName(k))}</option>`).join("");
  eLk.value = liste.includes(w) ? w : "";
  lkUmschalten();
}
function lkUmschalten(){
  const aus = !cfg.nachLehrer || eTyp.value === "E" || eLk.options.length < 2;
  $("#eLkWrap").classList.toggle("hidden", aus);
}
/* Bei ausgeschalteter Trennung bleibt stehen, was schon gespeichert war. */
const aktuelleLk = () => cfg.nachLehrer ? alsLk(eLk.value) : eintragLk;
eFach.onchange = () => {
  freiUmschalten();
  lkAuswahlFuellen(eLk.value);
  if(!$("#eDatumWahl").classList.contains("hidden")) zeichneDatumWahl();
};
eLk.onchange = () => { if(!$("#eDatumWahl").classList.contains("hidden")) zeichneDatumWahl(); };
eFachFrei.oninput = () => {
  lkAuswahlFuellen(eLk.value);
  if(!$("#eDatumWahl").classList.contains("hidden")) zeichneDatumWahl();
};
eTyp.onchange = artUmschalten;

function stundenAuswahlFuellen(slot){
  eStunde.innerHTML = `<option value="">${txt("ganzer Tag")}</option>` +
    cfg.slots.map((s,i) => `<option value="${i}" ${i === slot ? "selected" : ""}>${esc(stdText(s))} · ${esc(s.von)}</option>`).join("");
  if(slot === null || slot === undefined) eStunde.value = "";
}
/* Eine Reihe ergibt es bei Terminen: Hausaufgabe, Klausur, Notiz, Ereignis.
   Eine Note wiederholt sich nicht, ein Merkblatt auch nicht, und eine
   Fehlzeit trägt man nicht auf Vorrat ein. */
const WDH_ARTEN = ["H","K","N","E"];
function wdhUmschalten(){
  const moeglich = WDH_ARTEN.includes(eTyp.value) && bearbeiteId === null && ereignisId === null;
  $("#eWdhWrap").classList.toggle("hidden", !moeglich);
  $("#eWdhBisWrap").classList.toggle("hidden", eWdh.value === "0");
  wdhStand();
}
function wdhStand(){
  const takt = Number(eWdh.value) || 0;
  if(!takt){ $("#eWdhStand").textContent = ""; return; }
  const start = new Date((eDatum.value || iso(new Date()))+"T12:00");
  const tage = serienTermine(start, takt, eWdhBis.value || "");
  const letzter = tage.at(-1);
  $("#eWdhStand").textContent = tage.length >= WDH_MAX
    ? txt("{n} Termine — mehr legt die App auf einmal nicht an. Letzter: {datum}.",
        {n:WDH_MAX, datum:zeigDatum(letzter)})
    : txt("{anzahl}, jeweils {tag}, letzter am {datum}.", {
        anzahl: zahl(tage.length,"Termin","Termine"),
        tag: LANG[TAGE[tagIndex(start)]] ? txt(LANG[TAGE[tagIndex(start)]]) : txt("am selben Wochentag"),
        datum: zeigDatum(letzter)});
}
eWdh.onchange = () => {
  $("#eWdhBisWrap").classList.toggle("hidden", eWdh.value === "0");
  if(eWdh.value !== "0" && !eWdhBis.value)
    eWdhBis.value = iso(plusTage(new Date((eDatum.value || iso(new Date()))+"T12:00"), 90));
  wdhStand();
};
eWdhBis.oninput = wdhStand;

function artUmschalten(){
  const t = eTyp.value;
  const ev = t === "E", note = t === "G", merk = t === "M", fehl = t === "F";
  $("#eFachWrap").classList.toggle("hidden", ev);
  $("#eEreignisWrap").classList.toggle("hidden", !ev);
  $("#eNoteWrap").classList.toggle("hidden", !note);
  $("#eFehlWrap").classList.toggle("hidden", !fehl);
  $("#eBildWrap").classList.toggle("hidden", !merk);
  $("#eTextWrap").classList.toggle("hidden", fehl);
  $("#eTextLabel").textContent = merk ? txt("Überschrift") : txt("Was");
  $("#eNotizLabel").textContent = merk ? txt("Inhalt") : txt("Notizen");
  eNotiz.style.minHeight = merk ? "220px" : "";
  $("#eWertLabel").textContent = cfg.notenSystem === "punkte15" ? txt("Punkte 0–15") : txt("Note 1–6");
  if(ev) $("#eFachFreiWrap").classList.add("hidden"); else freiUmschalten();
  lkUmschalten();
  wdhUmschalten();
  bilderZeichnen();
}

/* --- Datumsauswahl mit Punkten an den Tagen des gewählten Fachs --- */
let eMonat = new Date();
function datumFeldText(){
  const v = eDatum.value;
  $("#eDatumFeld").textContent = v
    ? new Date(v+"T12:00").toLocaleDateString(ORT(),{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})
    : "—";
}
function zeichneDatumWahl(){
  const fach = aktuellesFach(), lk = cfg.nachLehrer ? alsLk(eLk.value) : "";
  $("#eMonatLabel").textContent = eMonat.toLocaleDateString(ORT(),{month:"long",year:"numeric"});
  const start = montagVon(new Date(eMonat.getFullYear(), eMonat.getMonth(), 1));
  let html = KALENDERKOEPFE().map(w => `<div class="wt">${w}</div>`).join("");
  for(let i = 0; i < 42; i++){
    const d = plusTage(start, i);
    html += `<button type="button" class="tagfeld ${d.getMonth() !== eMonat.getMonth() ? "fremd" : ""}
       ${gleich(d,new Date()) ? "heute" : ""} ${freiAm(d) ? "ferien" : ""}"
       aria-pressed="${eDatum.value === iso(d)}" data-wahl="${iso(d)}">
       ${d.getDate()}${hatFachAm(d,fach,lk) ? '<span class="punktfach"></span>' : ""}</button>`;
  }
  $("#eGitter").innerHTML = html;
  $("#eGitterHinweis").textContent = fach
    ? txt("Roter Punkt: {fach} steht an diesem Tag im Plan.",
        {fach: fach + (lk ? " " + txt("bei {wer}", {wer:lehrerName(lk)}) : "")})
    : txt("Wähle oben ein Fach, dann werden die passenden Tage markiert.");
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
  eDatum.value = b.dataset.wahl; datumFeldText(); datumWahlOeffnen(false); wdhStand();
};

/* --- Bilder: verkleinern, sonst platzt der Browserspeicher --- */
function bilderZeichnen(){
  $("#eBilder").innerHTML = bilder.map((b,i) =>
    `<div class="bildweg"><img src="${esc(b)}" alt=""><button type="button" data-bildweg="${i}">×</button></div>`).join("");
  const kb = Math.round(bilder.reduce((s,b) => s + b.length, 0) / 1024 * 0.75);
  const warn = speicherWarnung();
  $("#bildStand").textContent = (bilder.length
    ? txt("{bilder} · ca. {kb} kB", {bilder:zahl(bilder.length,"Bild","Bilder"), kb}) : "")
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
    bild.onerror = () => zeigeFehler(txt("Bild ließ sich nicht lesen."));
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
  eWdh.value = "0"; eWdhBis.value = "";
  const d = datum || gewaehlt;
  const vorhanden = (typ === "E" && slot !== undefined && slot !== null) ? sonderAn(d, slot) : null;
  if(vorhanden){ ereignisId = vorhanden.id; ereignisArt = vorhanden.art || "ereignis"; }

  $("#dlgEintragTitel").textContent = (e || vorhanden) ? txt("Eintrag ändern") : txt("Neuer Eintrag");
  eTyp.value = e ? e.typ : (typ || standardArt());
  eDatum.value = e ? e.datum : iso(d);
  eText.value = e ? (e.titel || "") : (vorhanden ? vorhanden.titel : (ereignisArt === "vertretung" ? txt("Vertretung") : ""));
  eNotiz.value = e ? (e.notiz || "") : (vorhanden ? (vorhanden.notiz || "") : "");
  if(e && e.typ === "M") bilder = (e.bilder || []).slice();
  if(e && e.typ === "F"){ eFehlArt.value = e.titel || "entschuldigt"; eFehlStd.value = Number(e.stunden)||1; }
  if(!e && typ === "F" && extra && extra.stunden) eFehlStd.value = extra.stunden;
  if(vorhanden) eOrt.value = vorhanden.raum || "";
  stundenAuswahlFuellen(vorhanden ? vorhanden.slot : (slot === undefined ? null : slot));
  /* Nie ein Fach vorbelegen, außer es kommt eindeutig aus der angetippten Stunde. */
  fachAuswahlFuellen(e ? e.fach : (fach || ""));
  eintragLk = alsLk(e ? e.lk : (extra && extra.lk));
  lkAuswahlFuellen(eintragLk);
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.toggle("hidden", !(e || vorhanden));
  speichernSperreAus();
  dlgEintrag.showModal();
}
function ereignisOeffnen(id){
  const o = sonder.find(x => x.id === id); if(!o) return;
  bearbeiteId = null; noteId = null; ereignisId = id; bilder = [];
  eWdh.value = "0"; eWdhBis.value = "";
  ereignisArt = o.art || "ereignis";
  $("#dlgEintragTitel").textContent = txt("Ereignis ändern");
  eTyp.value = "E"; eDatum.value = o.datum;
  eText.value = o.titel; eNotiz.value = o.notiz || ""; eOrt.value = o.raum || "";
  stundenAuswahlFuellen(o.slot);
  fachAuswahlFuellen("");
  eintragLk = ""; lkAuswahlFuellen("");
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.remove("hidden");
  speichernSperreAus();
  dlgEintrag.showModal();
}
function noteOeffnen(n){
  if(!n) return eintragOeffnen(null, new Date(), "G", "");
  bearbeiteId = null; ereignisId = null; noteId = n.id; bilder = [];
  eWdh.value = "0"; eWdhBis.value = "";
  $("#dlgEintragTitel").textContent = txt("Note ändern");
  eTyp.value = "G"; eDatum.value = n.datum;
  eText.value = n.titel || ""; eNotiz.value = n.notiz || "";
  eWert.value = kommaZahl(String(n.wert)); eNArt.value = n.art;
  fachAuswahlFuellen(n.fach);
  eintragLk = alsLk(n.lk); lkAuswahlFuellen(eintragLk);
  datumFeldText(); datumWahlOeffnen(false); artUmschalten();
  $("#bEintragWeg").classList.remove("hidden");
  speichernSperreAus();
  dlgEintrag.showModal();
}
$("#btnEintrag").onclick = () => eintragOeffnen(null, ansicht === "kalender" ? kalTag : gewaehlt);
$("#bEintragAb").onclick = () => dlgEintrag.close();

/* Schnelles Mehrfachtippen darf keinen Eintrag verdoppeln. Timeout statt
   nur "disabled", damit ein sofort danach neu geöffneter Dialog nicht durch
   die Sperre eines vorigen Speicherns blockiert bleibt (speichernSperreAus). */
let speichernSperre = null;
function speichernSperreAus(){
  clearTimeout(speichernSperre); speichernSperre = null;
  $("#bEintragSpeichern").disabled = false;
}
$("#bEintragSpeichern").onclick = () => {
  if(speichernSperre) return;
  $("#bEintragSpeichern").disabled = true;
  speichernSperre = setTimeout(speichernSperreAus, 600);
  const datum = eDatum.value || iso(new Date());
  const fach = aktuellesFach();
  const t = eTyp.value;

  if(t === "E"){
    const titel = eText.value.trim();
    const slot = eStunde.value === "" ? null : +eStunde.value;
    if(ereignisId) sonder = sonder.filter(x => x.id !== ereignisId);
    else if(slot !== null) sonder = sonder.filter(x => !(x.datum === datum && x.slot === slot));
    if(titel){
      const tage = serienDatumsListe(datum);
      const serie = tage.length > 1 ? neueId() : null;
      tage.forEach(d => sonder.push({id:neueId(), serie, datum:d, slot, art:ereignisArt, titel,
                             raum:eOrt.value.trim(), notiz:eNotiz.value.trim(), geloescht:false}));
    }
    sichern(); dlgEintrag.close(); zeichne(); return;
  }
  if(t === "G"){
    const wert = parseFloat(String(eWert.value).replace(",", "."));
    const grenze = cfg.notenSystem === "punkte15" ? [0,15] : [1,6];
    if(isNaN(wert) || wert < grenze[0] || wert > grenze[1])
      return alert(txt("Bitte einen Wert zwischen {a} und {b} eingeben.", {a:grenze[0], b:grenze[1]}));
    if(!fach) return alert(txt("Bitte ein Fach wählen."));
    const nd = {fach, lk:aktuelleLk(), art:eNArt.value, wert, datum,
                titel:eText.value.trim(), notiz:eNotiz.value.trim()};
    const alteNote = noteId && noten.find(x => x.id === noteId);
    if(alteNote) Object.assign(alteNote, nd);
    else noten.push(Object.assign({id:neueId(), geloescht:false}, nd));
    sichern(); dlgEintrag.close(); zeichne(); return;
  }
  if(!fach && t === "M") return alert(txt("Bitte ein Fach wählen."));
  const jetzt = new Date();
  const daten = {typ:t, fach, lk: aktuelleLk(), datum,
    titel: t === "F" ? eFehlArt.value : eText.value.trim(),
    notiz: eNotiz.value.trim()};
  if(t === "F") daten.stunden = Math.max(1, Number(eFehlStd.value) || 1);
  if(t === "M"){
    daten.bilder = bilder.slice();
    daten.zeit = `${zwei(jetzt.getHours())}:${zwei(jetzt.getMinutes())}`;
    if(!daten.titel) daten.titel = txt("Merkblatt vom {datum}", {datum:zeigDatum(datum)});
  }
  const alter = bearbeiteId && eintraege.find(x => x.id === bearbeiteId);
  if(alter) Object.assign(alter, daten);
  else {
    const tage = serienDatumsListe(datum);
    const serie = tage.length > 1 ? neueId() : null;
    tage.forEach(d => eintraege.push(Object.assign(
      {id:neueId(), serie, erledigt:false, geloescht:false}, daten, {datum:d})));
  }
  sichern(); dlgEintrag.close(); zeichne();
};
/* Aus der Einstellung im Dialog werden die Datumsangaben. Ohne Wiederholung
   ist es genau eines — dann läuft alles wie vorher. */
function serienDatumsListe(datum){
  const takt = WDH_ARTEN.includes(eTyp.value) && !$("#eWdhWrap").classList.contains("hidden")
    ? (Number(eWdh.value) || 0) : 0;
  return serienTermine(new Date(datum+"T12:00"), takt, eWdhBis.value || "");
}
$("#bEintragWeg").onclick = () => {
  const ziel = ereignisId ? sonder.find(x => x.id === ereignisId)
             : noteId     ? noten.find(x => x.id === noteId)
             :              eintraege.find(x => x.id === bearbeiteId);
  if(!ziel){ dlgEintrag.close(); return; }
  /* Gehört der Eintrag zu einer Reihe, ist „löschen" zweideutig. Fragen ist
     hier besser als raten — beide Antworten sind plausibel. */
  const topf = ereignisId ? sonder : eintraege;
  const geschwister = ziel.serie
    ? topf.filter(x => x.serie === ziel.serie && !x.geloescht) : [ziel];
  if(geschwister.length > 1
     && confirm(txt("Dieser Eintrag gehört zu einer Reihe von {n}.", {n:geschwister.length}) + "\n\n"
       + txt("OK löscht die ganze Reihe, Abbrechen nur diesen einen.")))
    geschwister.forEach(insArchiv);
  else insArchiv(ziel);
  sichern(); dlgEintrag.close(); zeichne();
};

/* --- Merkblatt ansehen --- */
let schauId = null;
function schauOeffnen(id){
  const e = eintraege.find(x => x.id === id); if(!e) return;
  schauId = id;
  $("#schauTitel").textContent = e.titel || txt("Merkblatt");
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
  if(anteil){ anteilOeffnen(anteil.dataset.anteil, anteil.dataset.anteillk || ""); return; }
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
  if(weg && confirm(txt("Endgültig löschen? Das lässt sich nicht rückgängig machen."))){
    const [art,id] = weg.dataset.endgueltig.split(":");
    if(art === "eintrag") eintraege = eintraege.filter(x => x.id !== id);
    else if(art === "ereignis") sonder = sonder.filter(x => x.id !== id);
    else noten = noten.filter(x => x.id !== id);
    sichern(); zeichne();
  }
});
$("#btnSort").onclick = () => { sortModus = !sortModus; zeichne(); };
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
  anteilOeffnen(b.dataset.zeufach, b.dataset.zeulk || "");
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
  const suchtext = o => [o.fach, fachName(o.fach), o.lk, lehrerName(o.lk), o.titel, o.notiz, o.raum]
    .filter(Boolean).join(" ").toLowerCase();
  const treffer = [
    ...aktiv().filter(e => suchtext(e).includes(q)),
    ...notenAktiv().filter(n => suchtext(n).includes(q))
      .map(n => ({id:n.id, typ:"G", fach:n.fach, titel:`${notenText(n.wert)} ${n.titel || ""}`.trim(), datum:n.datum, note:true})),
    ...sonderAktiv().filter(o => suchtext(o).includes(q))
      .map(o => ({id:o.id, typ:"E", fach:"", titel:o.titel, datum:o.datum, ereignis:true}))
  ].sort((a,b) => b.datum.localeCompare(a.datum)).slice(0, 40);
  ul.innerHTML = treffer.map(e => `<li>
    <span style="width:18px;flex:none"></span>
    <div class="wachs" ${e.note ? `data-note="${e.id}"` : e.ereignis ? `data-ereignis="${e.id}"`
       : e.typ === "M" ? `data-schau="${e.id}"` : `data-bearbeite="${e.id}"`}>
      <div class="kopf"><span class="khn">${e.typ}</span>
        <span class="titel">${e.fach ? esc(e.fach)+" — " : ""}${esc(e.titel) || (ART[e.typ] ? txt(ART[e.typ]) : "")}</span></div>
      <div class="wann">${zeigDatum(e.datum)}</div></div></li>`).join("")
    || `<li><div class="wachs"><span class="titel" style="color:var(--muted)">${txt("Nichts gefunden.")}</span></div></li>`;
}

/* --- Verhältnis und Zielnote --- */
let anteilFach = null, anteilLk = "";
function anteilOeffnen(fach, lk){
  anteilFach = fach; anteilLk = alsLk(lk);
  $("#anTitel").textContent = fachName(fach) + (anteilLk ? " · " + lehrerName(anteilLk) : "");
  anWert.value = anteilFuer(fach, anteilLk);
  anZiel.value = ""; $("#anZielErgebnis").textContent = "";
  anteilVorschau();
  dlgAnteil.showModal();
}
function anteilVorschau(){
  const m = Math.max(0, Math.min(100, Number(anWert.value) || 0));
  $("#anHinweis").textContent = txt("{m} % mündlich, {s} % schriftlich.", {m, s:100-m})
    + (hatEigenenAnteil(anteilFach, anteilLk) ? ""
       : anteilLk ? " " + txt("Zurzeit gilt der Wert für {fach} ({n} %).",
                              {fach:fachName(anteilFach), n:anteilFuer(anteilFach)})
                  : " " + txt("Zurzeit gilt der Standard."))
    + (anteilLk ? "" : " " + txt("Gilt für alle Lehrkräfte dieses Fachs, die keinen eigenen Wert haben."));
}
anWert.oninput = anteilVorschau;
function zielRechnen(){
  const ziel = parseFloat(String(anZiel.value).replace(",", "."));
  const feld = $("#anZielErgebnis");
  if(isNaN(ziel)){ feld.textContent = ""; return; }
  const art = anZielArt.value;
  const eigene = notenAktiv().filter(n => n.fach === anteilFach
    && (!anteilLk || alsLk(n.lk) === anteilLk));
  const derArt = eigene.filter(n => n.art === art);
  const andere = eigene.filter(n => n.art !== art);
  const mittel = l => l.length ? l.reduce((s,n) => s+n.wert, 0)/l.length : null;
  const aM = anteilFuer(anteilFach, anteilLk)/100;
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
    ? txt(art === "m" ? "Die nächste mündliche Note müsste {note} sein."
                      : "Die nächste schriftliche Note müsste {note} sein.", {note:notenText(noetig)})
    : txt("Mit einer einzelnen Note nicht erreichbar (rechnerisch {note}).", {note:notenText(noetig)});
}
anZiel.oninput = zielRechnen; anZielArt.onchange = zielRechnen;
$("#bAnStandard").onclick = () => {
  if(anteilLk){ if(cfg.anteileLk) delete cfg.anteileLk[lkSchluessel(anteilFach, anteilLk)]; }
  else if(cfg.anteile) delete cfg.anteile[anteilFach];
  sichern(); dlgAnteil.close(); zeichne();
};
$("#bAnSpeichern").onclick = () => {
  const wert = Math.max(0, Math.min(100, Number(anWert.value) || 0));
  if(anteilLk){
    if(!cfg.anteileLk) cfg.anteileLk = {};
    cfg.anteileLk[lkSchluessel(anteilFach, anteilLk)] = wert;
  } else {
    if(!cfg.anteile) cfg.anteile = {};
    cfg.anteile[anteilFach] = wert;
  }
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
      <div class="std">${esc(stdText(sl))}</div>
      <input type="text" data-f="fach" value="${esc(v.fach||"")}" placeholder="${txt("Fach")}" autocapitalize="characters">
      <input type="text" data-f="raum" value="${esc(v.raum||"")}" placeholder="${txt("Raum")}" autocapitalize="characters">
      <input type="text" data-f="lk" value="${esc(v.lk||"")}" placeholder="${txt("LK")}" autocapitalize="characters">
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
    `<option value="${i}" ${i === Math.min(tagIndex(gewaehlt),4) ? "selected" : ""}>${txt(LANG[t])}</option>`).join("");
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
  if(treffer){ importTabelle(werte);
    $("#iErgebnis").textContent = txt("{n} Zeilen übernommen. Prüfen und speichern.", {n:treffer}); }
  else $("#iErgebnis").textContent = txt("Nichts erkannt. Die Stundennummern müssen mitkopiert sein.");
};
$("#bImportAb").onclick = () => { dlgImport.close(); if(zurueckZuEinst){ zurueckZuEinst = false; einstellungenOeffnen("schule"); } };
$("#bImportSpeichern").onclick = () => {
  const woche = cfg.zweiWochen ? iWoche.value : "A", tag = TAGE[+iTag.value];
  importAuslesen().forEach((w,i) => {
    plan[woche][tag][i] = w.fach ? {fach:w.fach.toUpperCase(), raum:w.raum, lk:w.lk} : null; });
  sichern(); dlgImport.close();
  if(zurueckZuEinst){ zurueckZuEinst = false; zeichne(); einstellungenOeffnen("schule"); return; }
  ansicht = "tag"; gewaehlt = plusTage(montagVon(gewaehlt), +iTag.value); zeichne();
};

/* =====================================================================
   Profile
   ===================================================================== */
function profilKnopf(){
  const el = $("#btnProfil"); if(!el) return;
  el.textContent = (profilName().trim()[0] || "P").toUpperCase();
  el.setAttribute("aria-label", txt("Profil: {name}", {name:profilName()}));
}
let profilVerwalten = false, profilManuell = false;
function zeichneProfilAuswahl(){
  $("#pFrage").textContent = profilVerwalten ? txt("Profile verwalten") : txt("Wer bist du?");
  $("#pVerwalten").textContent = profilVerwalten ? txt("Fertig") : txt("Verwalten");
  $("#pZurueck").classList.toggle("hidden", !profilManuell || profilVerwalten);
  const kacheln = profile.map((x,i) => `<div>
    <button type="button" class="kachel" data-wechsel="${x.id}" aria-current="${x.id === profilId}">
      <div class="feld"><span>${esc((x.name.trim()[0]||"P").toUpperCase())}</span></div>
      <div class="kname">${esc(x.name)}</div>
      <div class="knum">${txt("Profil {n}", {n:String(i+1).padStart(2,"0")})}</div></button>
    ${profilVerwalten ? `<div class="kwerkzeug">
      <button type="button" data-umbenennen="${x.id}">${txt("Name")}</button>
      ${profile.length > 1 ? `<button type="button" class="loesch" data-profilweg="${x.id}">×</button>` : ""}
    </div>` : ""}</div>`).join("");
  const neu = profilVerwalten ? `<div><button type="button" class="kachel neu" id="kachelNeu">
      <div class="feld"><span>+</span></div><div class="kname">${txt("Neues Profil")}</div>
      <div class="knum">${txt("Anlegen")}</div></button></div>` : "";
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
    const name = prompt(txt("Name des neuen Profils"), txt("Profil {n}", {n:profile.length+1}));
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
    const name = prompt(txt("Neuer Name"), x.name);
    if(name && name.trim()){ x.name = name.trim(); profileSichern(); zeichneProfilAuswahl(); profilKnopf(); }
    return;
  }
  const d = e.target.closest("[data-profilweg]");
  if(d){
    const x = profile.find(y => y.id === d.dataset.profilweg);
    if(!confirm(txt("Profil „{name}“ mit allen Daten löschen? Das lässt sich nicht rückgängig machen.",
      {name:x.name}))) return;
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
  /* Die Feiertagsnamen gibt es beim Dienst auch auf Englisch; Schulferien
     oft nur auf Deutsch. Dann bleibt der deutsche Name stehen — besser als
     gar keiner. */
  const sp = istEnglisch() ? "EN" : "DE";
  const url = a => `https://openholidaysapi.org/${a}?countryIsoCode=DE&subdivisionCode=${land}`
    + `&languageIsoCode=${sp}&validFrom=${j}-01-01&validTo=${j+1}-12-31`;
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
      const treffer = namen.find(nm => nm && nm.language === sp)
        || namen.find(nm => nm && nm.language === "DE") || namen[0];
      return {von:x && x.startDate, bis:x && x.endDate, typ,
              name:(treffer && treffer.text) || txt("Ferien")};
    }).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.von || ""));
  };
  const [feier, schul] = await Promise.all([hole("PublicHolidays","feiertag"), hole("SchoolHolidays","ferien")]);
  return [...feier, ...schul].sort((a,b) => a.von.localeCompare(b.von));
}
$("#sFerienLaden").onclick = async () => {
  const land = sLand.value;
  if(!land){ $("#sFerienStand").textContent = txt("Bitte zuerst ein Bundesland wählen."); return; }
  $("#sFerienStand").textContent = txt("Wird geladen …");
  try{
    const eigene = ferien.filter(f => f.typ === "eigen");   // selbst eingetragene behalten
    ferien = [...await ferienLaden(land), ...eigene].sort((a,b) => a.von.localeCompare(b.von));
    cfg.land = land; sichern(); ferienStand(); zeichne();
  }catch(err){
    $("#sFerienStand").textContent = (err && err.name === "AbortError")
      ? txt("Der Dienst antwortet nicht. Später noch einmal versuchen.")
      : txt("Laden fehlgeschlagen. Internet prüfen.");
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
    ? txt("{n} Einträge gespeichert, bis {datum}.", {n:ferien.length, datum:zeigDatum(ferien.at(-1).bis)})
    : txt("Noch nichts geladen."));
}

/* Benachrichtigungen: nur beim Öffnen, denn eine Web-App kann sich nicht
   selbst wecken. Für echte Wecker gibt es den Kalender-Export. */
function meldeStand(){
  const s = ("Notification" in window) ? Notification.permission : "nicht verfügbar";
  $("#sMeldeStand").textContent = txt("Berechtigung: {stand}", {stand:
    txt({granted:"erteilt", denied:"abgelehnt", default:"noch nicht gefragt",
         "nicht verfügbar":"nicht verfügbar"}[s] || s)});
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
          badge:"icon-192.png", tag:"stundenplan", lang:spracheJetzt()});
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
  if(morgen.length) text = txt("Morgen: {liste}",
    {liste:morgen.map(e => (e.fach||"")+" "+(e.titel||txt(ART[e.typ]))).join(", ")});
  else if(heute.getDay() === 0 && bisEndeWoche.length)
    text = txt("Diese Woche: {klausuren}, {hausaufgaben}", {
      klausuren: zahl(klausuren.length,"Klausur","Klausuren"),
      hausaufgaben: zahl(bisEndeWoche.length-klausuren.length,"Hausaufgabe","Hausaufgaben")});
  else if(klausuren.length && klausuren[0].datum <= inTagen(3))
    text = txt("Klausur am {datum}: {fach}",
      {datum:zeigDatum(klausuren[0].datum), fach:klausuren[0].fach||""});
  if(text && await melden(txt("Stundenplan"), text)) Speicher.schreib(key, true);
}

/* ICS-Export: damit übernimmt der Systemkalender das Erinnern. */
const icsTag  = datum => datum.replace(/-/g,"");
const icsFolgetag = datum => icsTag(iso(plusTage(new Date(datum+"T12:00"), 1)));
/* Ohne VTIMEZONE gilt eine Zeit ohne Z als „schwebend" und wird in der
   Zeitzone des Kalenders gelesen — für einen Stundenplan genau richtig. */
const icsZeit = (datum, uhr) => icsTag(datum) + "T" + uhr.replace(":","") + "00";
/* Backslash, Semikolon und Komma trennen in .ics die Felder — im Text müssen
   sie maskiert sein, sonst bricht ein Fachname die Datei auf. */
const icsRoh = t => String(t == null ? "" : t).replace(/[\\;,]/g, m => "\\"+m).replace(/\r?\n/g, "\\n");
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
  const roh = icsRoh;
  const stempel = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const zeilen = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Stundenplan//DE","CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", `X-WR-CALNAME:${roh(txt("Stundenplan") + " " + (cfg.klasse || profilName()))}`];
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
      (e.typ === "K" ? txt("Klausur") + " " : txt("HA") + " ") + (e.fach||"") + " " + (e.titel||""),
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

/* Der Stundenplan selbst als Serientermine. Bewusst eine eigene Datei: im
   Handykalender wird daraus ein eigener Kalender, den man ausblenden oder
   löschen kann, ohne die Klausurerinnerungen mitzunehmen. */
function icsPlanBauen(){
  const roh = icsRoh;
  const stempel = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const zeilen = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Stundenplan//DE","CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", `X-WR-CALNAME:${roh(txt("Unterricht") + " " + (cfg.klasse || profilName()))}`];
  const heute = new Date();
  const ende = plusTage(heute, 365);
  /* Ferien und Feiertage fallen als EXDATE heraus. Ohne das behauptet der
     Kalender Unterricht in den Sommerferien — und man glaubt ihm nicht mehr. */
  const freieTage = [];
  for(let i = 0; i <= 365; i++){
    const d = plusTage(heute, i);
    if(tagIndex(d) !== 5 && freiAm(d)) freieTage.push(d);
  }
  ["A","B"].forEach(w => {
    if(w === "B" && !cfg.zweiWochen) return;
    TAGE.forEach((t, ti) => {
      (plan[w] && plan[w][t] || []).forEach((x, i) => {
        const s = cfg.slots[i];
        if(!x || !x.fach || !s) return;
        /* Erster Termin: der nächste passende Wochentag, bei A/B zusätzlich
           in der passenden Woche. Ohne diesen Anker läge die Serie falsch. */
        let start = null;
        for(let k = 0; k <= 20; k++){
          const d = plusTage(montagVon(heute), k*7 + ti);
          if(iso(d) < iso(heute)) continue;
          if(!cfg.zweiWochen || wocheFuer(d) === w){ start = d; break; }
        }
        if(!start) return;
        const raus = freieTage.filter(d => iso(d) >= iso(start) && tagIndex(d) === ti
          && (!cfg.zweiWochen || wocheFuer(d) === w));
        zeilen.push("BEGIN:VEVENT",
          `UID:plan-${w}-${t}-${i}@stundenplan`, `DTSTAMP:${stempel}`,
          `DTSTART:${icsZeit(iso(start), s.von)}`,
          `DTEND:${icsZeit(iso(start), s.bis)}`,
          `RRULE:FREQ=WEEKLY${cfg.zweiWochen ? ";INTERVAL=2" : ""};UNTIL=${icsZeit(iso(ende), s.bis)}`,
          `SUMMARY:${roh(fachName(x.fach) + (x.raum ? " · " + x.raum : ""))}`);
        if(x.lk) zeilen.push(`DESCRIPTION:${roh(lehrerName(x.lk))}`);
        if(x.raum) zeilen.push(`LOCATION:${roh(x.raum)}`);
        if(raus.length) zeilen.push("EXDATE:" + raus.map(d => icsZeit(iso(d), s.von)).join(","));
        zeilen.push("END:VEVENT");
      });
    });
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
$("#sIcsPlan").onclick = () => {
  if(!faecher().length) return alert(txt("Trag zuerst deinen Stundenplan ein."));
  herunterladen(icsPlanBauen(), `stundenplan-unterricht-${iso(new Date())}.ics`, "text/calendar");
};

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
  c.anteileLk  = {};
  if(roh && roh.anteileLk && typeof roh.anteileLk === "object")
    Object.entries(roh.anteileLk).slice(0, 400).forEach(([k,v]) => {
      /* Zwei Kürzel mit Schrägstrich dazwischen — sonst nichts. */
      const teile = String(k).split("/");
      if(teile.length !== 2) return;
      const f = alsKuerzel(teile[0]), l = alsKuerzel(teile[1]);
      if(f && l) c.anteileLk[f + "/" + l] = alsZahl(v, 0, 100, 50);
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
  c.sprache     = SPRACHEN[c.sprache] ? c.sprache : "";
  /* Nach erfolgreicher Prüfung liegt das Paket in der aktuellen Form vor. */
  c.fassung = SCHEMA;
  c.stdProTag  = alsZahl(c.stdProTag, 1, 16, 8);
  c.reiheEin   = Array.isArray(c.reiheEin)
    ? c.reiheEin.filter(x => REIHE_STANDARD.includes(x)) : null;
  c.reiheFach  = Array.isArray(c.reiheFach)
    ? c.reiheFach.map(alsKuerzel).filter(Boolean).slice(0, 200) : null;
  c.nachLehrer = !!c.nachLehrer;
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
    serie:  e.serie ? alsId(e.serie) : null,
    typ:    e.typ,
    fach:   alsKuerzel(e.fach),
    lk:     alsKuerzel(e.lk),
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
  return {von, bis: bis >= von ? bis : von, name: alsText(f.name, 80) || txt("Frei"),
          typ: ["ferien","feiertag","eigen"].includes(f.typ) ? f.typ : "eigen"};
}
function sonderSaeubern(o){
  if(!o || typeof o !== "object") return null;
  const datum = alsDatum(o.datum); if(!datum) return null;
  return {id:alsId(o.id), serie: o.serie ? alsId(o.serie) : null, datum,
          slot: (o.slot === null || o.slot === undefined) ? null : alsZahl(o.slot, 0, 23, null),
          art:  EREIGNISARTEN.includes(o.art) ? o.art : "ereignis",
          titel:alsText(o.titel, 200) || txt("Ereignis"),
          raum: alsText(o.raum, 40), notiz: alsText(o.notiz, 4000),
          geloescht: !!o.geloescht, geloeschtAm: alsDatum(o.geloeschtAm) || null};
}
function noteSaeubern(g){
  if(!g || typeof g !== "object") return null;
  const fach = alsKuerzel(g.fach); if(!fach) return null;
  const wert = Number(g.wert); if(!Number.isFinite(wert)) return null;
  return {id:alsId(g.id), fach, lk: alsKuerzel(g.lk), art: g.art === "m" ? "m" : "s",
          wert: Math.max(0, Math.min(15, wert)),
          datum: alsDatum(g.datum) || iso(new Date()),
          titel: alsText(g.titel, 200), notiz: alsText(g.notiz, 4000),
          geloescht: !!g.geloescht, geloeschtAm: alsDatum(g.geloeschtAm) || null};
}
const paketDatenstand = d => datenstandVon(d && d.cfg);
const paketZuNeu = d => paketDatenstand(d) > SCHEMA;
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
      kurzHinweis(txt("Gesichert: {name}", {name:fertig.name})
        + (fertig.weg ? " · " + txt("{dateien} entfernt", {dateien:zahl(fertig.weg,"alte Datei","alte Dateien")}) : ""));
      return true;
    }
  }catch(e){ zeigeFehler(txt("Ordner") + ": " + ((e && e.message) || e)); return false; }
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
    if(fertig) kurzHinweis(txt("Sicherung angelegt: {name}", {name:fertig.name})
      + (fertig.weg ? " · " + txt("{dateien} entfernt", {dateien:zahl(fertig.weg,"alte Datei","alte Dateien")}) : ""));
  }catch(e){}
}


/* =====================================================================
   Anleitung
   Der Text steht als Datenstruktur, nicht als Markup: Inhaltsverzeichnis
   und Suche entstehen dadurch aus derselben Quelle und können nicht
   auseinanderlaufen. Der Inhalt ist Quelltext, keine Nutzereingabe — er
   darf deshalb Markup enthalten und geht nicht durch esc().

   Jeder Abschnitt trägt beide Sprachen. Kennung, Reihenfolge und Aufbau
   sind dadurch nur einmal vorhanden und können nicht auseinanderlaufen;
   HILFE selbst ist die Fassung in der gerade eingestellten Sprache.
   ===================================================================== */
const HILFE_QUELLE = [
{id:"was", teil:"Erste Schritte", titel:"Was diese App ist", worte:"überblick zweck",
 teilEn:"Getting started", titelEn:"What this app is", worteEn:"overview purpose",
 textEn:`<p>A timetable for your phone that shows what school portals usually hide:
   <b>real clock times</b>, every course in <b>one</b> view, plus homework,
   exams, grades, handouts and absences.</p>
  <p>Nothing here is tailored to a particular school. Subjects, rooms, teachers
   and times come solely from what you enter.</p>
  <p class="hWarn"><b>The most important thing:</b> all data lives exclusively in
   your browser's storage. There is no server, no account, no recovery. If you
   clear the site data, everything is gone — not even the developer can bring it
   back. So: back up regularly (see <i>Backup</i>).</p>`,
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
 teilEn:"Getting started", titelEn:"Put it on your home screen", worteEn:"install pwa app icon homescreen",
 textEn:`<p>The app runs in the browser but can be placed like a real app.
   After that it starts without a browser bar and works offline.</p>
  <ul>
   <li><b>Android, Chrome:</b> open the address, menu ⋮, <i>Install app</i>
     or <i>Install and create shortcut</i>.</li>
   <li><b>iPhone, Safari:</b> open the address, share button, <i>Add to Home Screen</i>.</li>
   <li><b>Desktop:</b> the install icon at the right of the address bar.</li>
  </ul>
  <p class="hWarn"><b>Especially important on iPhone:</b> if you only open the app as
   a bookmark in Safari, Safari deletes the data by itself after seven days without
   use. On the home screen it stays.</p>`,
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
 teilEn:"Getting started", titelEn:"Set up in ten minutes", worteEn:"start setup first steps class",
 textEn:`<ol>
   <li>Open <b>⚙ at the top right</b>. A menu of sections appears; each one states
     its current setting underneath.</li>
   <li><b>School and period grid</b>: enter your class — it later appears in small
     type above the weekday. Check the grid; two templates are one tap away,
     otherwise add rows by hand. If your school has A and B weeks, tick the box.</li>
   <li><b>Holidays and public holidays</b>: pick a German state, <i>Load holidays</i>.</li>
   <li>Optionally <b>Appearance</b>: accent colour, light mode, typeface.</li>
   <li><b>Save</b>, then enter your timetable (see <i>The timetable</i>).</li>
  </ol>
  <p class="hHinweis">Everything is saved at once. You can move back and forth
   between the sections and only tap <b>Save</b> at the end.</p>`,
 text:`<ol>
   <li><b>⚙ oben rechts</b> öffnen. Es erscheint ein Menü der Bereiche; jeder
     nennt darunter seinen jetzigen Stand.</li>
   <li><b>Schule und Stundenraster</b>: Klasse eintragen — sie steht später klein
     über dem Wochentag. Raster prüfen; zwei Vorlagen zum Antippen, sonst Zeilen
     von Hand. Hat deine Schule A- und B-Wochen: Haken setzen.</li>
   <li><b>Ferien und Feiertage</b>: Bundesland wählen, <i>Ferien laden</i>.</li>
   <li>Optional <b>Darstellung</b>: Akzentfarbe, heller Modus, Schrift.</li>
   <li><b>Speichern</b>, dann den Plan eintragen (siehe <i>Der Stundenplan</i>).</li>
  </ol>
  <p class="hHinweis">Gespeichert wird alles auf einmal. Du kannst zwischen den
   Bereichen hin und her gehen und erst am Ende auf <b>Speichern</b> tippen.</p>`},

{id:"sprache", teil:"Erste Schritte", titel:"Deutsch oder Englisch", worte:"sprache englisch english umstellen übersetzung",
 teilEn:"Getting started", titelEn:"German or English", worteEn:"language english german switch translation",
 textEn:`<p>The interface is available in <b>German and English</b>. The choice sits
   at the very top of ⚙, labelled in both languages, and takes effect immediately —
   there is no need to tap <i>Save</i> for it.</p>
  <ul>
   <li><b>Automatic</b> follows the language of the device. This is what a newly
     created profile starts with.</li>
   <li><b>Deutsch</b> and <b>English</b> fix the choice, whatever the device says.</li>
  </ul>
  <p>The setting belongs to the profile, so siblings sharing one device can each
   read the app in their own language.</p>
  <p>What is translated is the interface, including this guide. <b>Your own text is
   not</b>: subjects, rooms, teacher names, notes and handouts stay exactly as you
   typed them. Holiday names come from the data service and are fetched in the
   chosen language where it has them.</p>
  <p class="hHinweis">Backups are unaffected. What is stored stays German
   internally, so a file written on an English device reads back on a German one
   and the other way round.</p>`,
 text:`<p>Die Oberfläche gibt es auf <b>Deutsch und Englisch</b>. Die Wahl steht ganz
   oben unter ⚙, zweisprachig beschriftet, und wirkt sofort — dafür muss man nicht
   erst auf <i>Speichern</i> tippen.</p>
  <ul>
   <li><b>Automatisch</b> richtet sich nach der Sprache des Geräts. Damit beginnt
     ein neu angelegtes Profil.</li>
   <li><b>Deutsch</b> und <b>English</b> legen sie fest, unabhängig vom Gerät.</li>
  </ul>
  <p>Die Einstellung gehört zum Profil. Geschwister an einem Gerät können die App
   deshalb jeweils in ihrer Sprache lesen.</p>
  <p>Übersetzt ist die Oberfläche, diese Anleitung eingeschlossen. <b>Deine eigenen
   Texte nicht</b>: Fächer, Räume, Lehrernamen, Notizen und Merkblätter bleiben
   genau so stehen, wie du sie getippt hast. Ferienbezeichnungen kommen vom
   Datendienst und werden in der gewählten Sprache abgerufen, soweit er sie hat.</p>
  <p class="hHinweis">Sicherungen sind davon unberührt. Gespeichert wird intern
   weiter Deutsch; eine auf einem englischen Gerät geschriebene Datei lässt sich
   deshalb auf einem deutschen einlesen und umgekehrt.</p>`},

{id:"einstellungen", teil:"Erste Schritte", titel:"Wie die Einstellungen aufgebaut sind", worte:"einstellungen menü bereiche zahnrad struktur",
 teilEn:"Getting started", titelEn:"How the settings are organised", worteEn:"settings menu sections gear structure",
 textEn:`<p>Behind ⚙ there are eight sections. Instead of one long scroll there is
   first a <b>menu</b> — like in the <i>Entries</i> tab. Under each name, small type
   says how it is currently set, so most questions are answered without opening it.</p>
  <table class="hTab">
   <tr><th>Section</th><th>What is in it</th></tr>
   <tr><td><b>Appearance</b></td><td>accent colour, light/dark, typeface, profile picker at start</td></tr>
   <tr><td><b>School and period grid</b></td><td>class, lesson times, A/B weeks</td></tr>
   <tr><td><b>Grades and report card</b></td><td>grading system, oral/written ratio, order of subjects</td></tr>
   <tr><td><b>Absences and archive</b></td><td>lessons per school day, how long the archive keeps things</td></tr>
   <tr><td><b>Reminders and calendar</b></td><td>reminder on opening, calendar export</td></tr>
   <tr><td><b>Holidays and public holidays</b></td><td>German state and loaded periods</td></tr>
   <tr><td><b>Subjects and teachers</b></td><td>full names, separating by teacher</td></tr>
   <tr><td><b>Backup and storage</b></td><td>back up, import, share, folder, storage used</td></tr>
  </table>
  <p><b>‹ All settings</b> leads back to the menu. <b>Save</b> applies to everything
   at once, no matter which section you are standing in — the fields of the others
   keep their contents the whole time.</p>`,
 text:`<p>Hinter ⚙ liegen acht Bereiche. Statt einer langen Rolle steht dort erst
   ein <b>Menü</b> — wie im Reiter <i>Einträge</i>. Unter jedem Namen steht in
   kleiner Schrift, wie er gerade eingestellt ist, sodass man das Meiste
   beantwortet bekommt, ohne ihn zu öffnen.</p>
  <table class="hTab">
   <tr><th>Bereich</th><th>Was drinsteht</th></tr>
   <tr><td><b>Darstellung</b></td><td>Akzentfarbe, hell/dunkel, Schrift, Profilauswahl beim Start</td></tr>
   <tr><td><b>Schule und Stundenraster</b></td><td>Klasse, Zeiten der Stunden, A/B-Wochen</td></tr>
   <tr><td><b>Noten und Zeugnis</b></td><td>Notensystem, Verhältnis mündlich/schriftlich, Reihenfolge der Fächer</td></tr>
   <tr><td><b>Fehlzeiten und Archiv</b></td><td>Stunden je Schultag, Aufbewahrungsfrist des Archivs</td></tr>
   <tr><td><b>Erinnerungen und Kalender</b></td><td>Erinnerung beim Öffnen, Kalender-Export</td></tr>
   <tr><td><b>Ferien und Feiertage</b></td><td>Bundesland und geladene Zeiträume</td></tr>
   <tr><td><b>Fächer und Lehrkräfte</b></td><td>ausgeschriebene Namen, Trennung nach Lehrkraft</td></tr>
   <tr><td><b>Sicherung und Speicher</b></td><td>Sichern, einlesen, teilen, Ordner, Speicherstand</td></tr>
  </table>
  <p><b>‹ Alle Einstellungen</b> führt zurück ins Menü. <b>Speichern</b> gilt für
   alles zusammen, egal in welchem Bereich du gerade stehst — die Felder der
   anderen bleiben die ganze Zeit über bestehen.</p>`},

{id:"raster", teil:"Der Stundenplan", titel:"Stundenraster einstellen", worte:"zeiten stunden block doppelstunde pause slots",
 teilEn:"The timetable", titelEn:"Setting the period grid", worteEn:"times lessons block double period break slots",
 textEn:`<p>One row per slot in the day view. Under <b>No.</b> are the lesson numbers
   this slot covers — for double lessons separated by a comma.</p>
  <table class="hTab">
   <tr><th>No.</th><th>from</th><th>to</th></tr>
   <tr><td>1,2</td><td>08:00</td><td>09:30</td></tr>
   <tr><td>3,4</td><td>09:50</td><td>11:20</td></tr>
   <tr><td>5,6</td><td>11:40</td><td>13:10</td></tr>
  </table>
  <p>No double lessons? Then put <code>1</code>, <code>2</code>, <code>3</code> …
   in separate rows. The grid may have as many slots as you like.</p>
  <p class="hWarn"><b>Careful when shortening it:</b> if you remove rows, the lessons
   at the end of each day disappear. The app asks first and names the number of
   lessons affected.</p>`,
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
 teilEn:"The timetable", titelEn:"Entering the plan by hand", worteEn:"edit pencil subject room teacher",
 textEn:`<p><b>Tap ✎ at the top</b> — to the left of the profile and ⚙ — to switch
   editing on; a note under the plan shows this. Now tapping a lesson opens the
   fields <i>Subject</i>, <i>Room</i>, <i>Teacher</i>.</p>
  <p>Subjects are always stored in <b>capitals</b>, however you type them. Otherwise
   “Ch” and “CH” would count as two subjects and the grade average would fall apart.</p>
  <p>Tapping ✎ again ends editing. One week takes less than five minutes —
   <b>a timetable repeats itself</b>, one week is enough, two with A/B weeks.</p>`,
 text:`<p><b>✎ oben antippen</b> — links neben Profil und ⚙ — schaltet das
   Bearbeiten ein; ein Hinweis unter dem Plan zeigt das an. Jetzt öffnet ein Tipp
   auf eine Stunde die Felder <i>Fach</i>, <i>Raum</i>, <i>Lehrkraft</i>.</p>
  <p>Fächer werden immer <b>groß</b> gespeichert, egal wie du sie tippst. Sonst
   würden „Ch“ und „CH“ als zwei Fächer gelten und der Notenschnitt zerfiele.</p>
  <p>Erneut auf ✎ oben tippen beendet das Bearbeiten. Für eine Woche brauchst du keine
   fünf Minuten — <b>ein Stundenplan wiederholt sich</b>, eine Woche reicht,
   bei A/B-Wochen zwei.</p>`},

{id:"import", teil:"Der Stundenplan", titel:"Plan aus dem Schulportal einfügen", worte:"import kopieren zwischenablage einfügen portal",
 teilEn:"The timetable", titelEn:"Pasting a plan from the school portal", worteEn:"import copy clipboard paste portal",
 textEn:`<p>⚙ → <b>Paste plan</b>. Choose day and week, paste the copied table into
   <i>Fill from the clipboard</i>, tap <b>Copy into the table</b>, check it,
   <b>Save</b>.</p>
  <p>Expected is one line per lesson in the format
   <code>SUBJECT, ROOM (TEACHER)</code>, preceded by the lesson number:</p>
  <pre class="hCode">1
CH, B005 (MUEL)
2
CH, B005 (MUEL)
3
MA, B006 (SCHM)</pre>
  <p>Square brackets are recognised too; in many portals they hold the class rather
   than the teacher.</p>
  <p class="hWarn">Many portals can switch between subject, room and teacher views.
   What is needed is the view in which <b>the subject comes first</b> — otherwise
   teacher names end up as subjects in your plan.</p>
  <p>If your school's format does not fit at all: the expression is in
   <code>app.js</code>, in the function <code>parseZelle</code>.</p>`,
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
 teilEn:"The timetable", titelEn:"A and B weeks", worteEn:"alternating week odd even calendar week",
 textEn:`<p>Fixed rule: <b>odd calendar week = A, even = B.</b> Which one is running
   is shown at the top next to the week number and in the settings.</p>
  <p>If your school has it the other way round, simply enter your A week as the
   B week — the rule itself is not adjustable, the result is.</p>
  <p>If the weeks differ in only a few lessons: ⚙ → <b>Week change</b> →
   <i>A week → B week</i> copies everything over, and then you change the
   exceptions.</p>`,
 text:`<p>Feste Regel: <b>ungerade Kalenderwoche = A, gerade = B.</b> Welche gerade
   läuft, steht oben neben der Kalenderwoche und in den Einstellungen.</p>
  <p>Passt es bei deiner Schule andersherum, trag deine A-Woche einfach als
   B-Woche ein — die Regel selbst ist nicht einstellbar, das Ergebnis schon.</p>
  <p>Unterscheiden sich die Wochen nur in ein paar Stunden: ⚙ → <b>Wochenwechsel</b>
   → <i>A-Woche → B-Woche</i> kopiert alles herüber, danach änderst du die
   Abweichungen.</p>`},

{id:"namen", teil:"Der Stundenplan", titel:"Kürzel und ausgeschriebene Namen", worte:"lehrer fachnamen abkürzung",
 teilEn:"The timetable", titelEn:"Abbreviations and full names", worteEn:"teacher subject names abbreviation",
 textEn:`<p>Under ⚙ → <b>Teachers</b> and <b>Subject names</b>, one line per
   abbreviation and name, separated by an equals sign:</p>
  <pre class="hCode">WZET = Ms Wietzet
CH = Chemistry
MA = Maths</pre>
  <p>The plan keeps showing the abbreviations — otherwise it would not fit on the
   screen. The full names appear in the subject info, in the report card and in
   search: anyone searching for “Chemistry” also finds entries that only carry “CH”.</p>`,
 text:`<p>Unter ⚙ → <b>Lehrkräfte</b> und <b>Fachnamen</b> je Zeile ein Kürzel und
   der Name, getrennt durch ein Gleichheitszeichen:</p>
  <pre class="hCode">WZET = Frau Wietzet
CH = Chemie
MA = Mathematik</pre>
  <p>Der Plan zeigt weiter die Kürzel — sonst passt er nicht auf den Bildschirm.
   Die vollen Namen erscheinen in der Fach-Info, im Zeugnis und in der Suche:
   Wer „Chemie“ sucht, findet auch Einträge, die nur „CH“ tragen.</p>`},

{id:"nachlehrer", teil:"Der Stundenplan", titel:"Fächer nach Lehrkraft trennen", worte:"lehrer kurs parallelkurs trennen unterpunkte",
 teilEn:"The timetable", titelEn:"Separating subjects by teacher", worteEn:"teacher course parallel course separate sub-entries",
 textEn:`<p>If you have the same subject with <b>two teachers</b> — say sport in two
   courses or maths in alternation — tick <i>Separate subjects by teacher</i> under
   ⚙ → <b>Teachers</b>. Without the tick nothing changes.</p>
  <ul>
   <li><b>Up next</b> skips lessons in the same subject with a different teacher.
     Homework you are given on Monday by Ms Müller falls due in her next lesson —
     not on Tuesday with Mr Schmidt.</li>
   <li>The <b>entry dialog</b> gains a <i>Teacher</i> field. If you come from a
     tapped lesson, it is already filled in.</li>
   <li>The <b>report card</b> shows, under every affected subject, a separate
     average per teacher, each calculated with <i>their</i> ratio. The subject's
     own row stays and keeps averaging over everything. Both rows can be tapped and
     lead to ratio and target grade — one for the subject, the other for the teacher.</li>
   <li><b>Ratio and target grade</b> are therefore available per teacher: in the
     settings under <i>Ratio per subject</i> as an indented row, on the grade card
     as its own chip.</li>
   <li><b>Notes</b> and <b>handouts</b> gain subheadings per teacher.</li>
   <li><b>Absences</b> are broken down per course, not just per subject.</li>
   <li>The <b>red dots</b> in the date picker follow this too.</li>
  </ul>
  <p class="hHinweis">As a rule: wherever the app offers something <i>per subject</i>,
   this setting also offers it <i>per teacher</i>.</p>
  <p class="hHinweis">The tick can be removed again at any time. Whatever has been
   assigned stays stored and reappears when you tick it again.</p>`,
 text:`<p>Hast du dasselbe Fach bei <b>zwei Lehrkräften</b> — etwa Sport bei zwei
   Kursen oder Mathe im Wechsel —, setz unter ⚙ → <b>Lehrkräfte</b> den Haken
   <i>Fächer nach Lehrkraft trennen</i>. Ohne den Haken ändert sich nichts.</p>
  <ul>
   <li><b>Als Nächstes</b> überspringt Stunden desselben Fachs bei einer anderen
     Lehrkraft. Eine Hausaufgabe, die du am Montag bei Frau Müller aufbekommst,
     wird auf deren nächste Stunde fällig — nicht auf den Dienstag bei Herrn Schmidt.</li>
   <li>Der <b>Eintragsdialog</b> bekommt ein Feld <i>Lehrkraft</i>. Kommst du aus
     einer angetippten Stunde, steht sie schon darin.</li>
   <li>Das <b>Zeugnis</b> zeigt unter jedem betroffenen Fach je Lehrkraft einen
     eigenen Schnitt, jeweils mit <i>ihrem</i> Verhältnis gerechnet. Die Zeile des
     Fachs bleibt und rechnet weiter über alles. Beide Zeilen sind antippbar und
     führen in Verhältnis und Zielnote — die eine fürs Fach, die andere für die
     Lehrkraft.</li>
   <li><b>Verhältnis und Zielnote</b> gibt es damit je Lehrkraft: in den
     Einstellungen unter <i>Verhältnis je Fach</i> als eingerückte Zeile, auf der
     Notenkarte als eigener Chip.</li>
   <li><b>Notizen</b> und <b>Merkblätter</b> bekommen Zwischenüberschriften je
     Lehrkraft.</li>
   <li><b>Fehlzeiten</b> werden je Kurs aufgeteilt, nicht nur je Fach.</li>
   <li>Auch die <b>roten Punkte</b> in der Datumsauswahl richten sich danach.</li>
  </ul>
  <p class="hHinweis">Als Regel: Wo die App etwas <i>je Fach</i> anbietet, gibt es
   das mit dieser Einstellung auch <i>je Lehrkraft</i>.</p>
  <p class="hHinweis">Der Haken lässt sich jederzeit wieder entfernen. Was schon
   zugeordnet ist, bleibt gespeichert und taucht beim erneuten Setzen wieder auf.</p>`},

{id:"reiter", teil:"Täglich benutzen", titel:"Die vier Reiter", worte:"navigation wischen ansicht tag kalender einträge zeugnis",
 teilEn:"Everyday use", titelEn:"The four tabs", worteEn:"navigation swipe view day calendar entries report card",
 textEn:`<table class="hTab">
   <tr><th>Tab</th><th>Contents</th></tr>
   <tr><td><b>Day</b></td><td>the day's plan with clock times, current lesson, progress bar</td></tr>
   <tr><td><b>Calendar</b></td><td>month overview with markers, the selected day below it</td></tr>
   <tr><td><b>Entries</b></td><td>search and all lists including the archive</td></tr>
   <tr><td><b>Report</b></td><td>all subjects with average and rounded grade</td></tr>
  </table>
  <p>Switch by tapping, by tapping the four dots at the bottom, or by
   <b>swiping anywhere below the content</b> — even in the middle of the page if
   nothing is there any more. If a sub-list is open, the first swipe returns to
   the menu.</p>
  <p>In the day view you can also swipe <b>day by day</b>, in the calendar
   <b>month by month</b>.</p>
  <p>On a computer there is no swiping — there the <b>arrow keys ← →</b> do it:
   day by day in the day view, month by month in the calendar, week by week in the
   week grid. <b>/</b> jumps into the search. While a field is being typed in, the
   keys stay quiet.</p>
  <p>To the left of the profile and ⚙ there is <b>one place for the pencil ✎</b>.
   What it does depends on the view: in <b>Day</b> it edits the plan, in the
   <b>Entries</b> menu it reorders the tiles. In the other views it stays empty —
   the place itself remains so the tab bar does not jump.</p>`,
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
   Kalender <b>monatsweise</b>.</p>
  <p>Am Rechner gibt es kein Wischen — dort tun es die <b>Pfeiltasten ← →</b>:
   in der Tagesansicht tageweise, im Kalender monatsweise, im Wochenraster
   wochenweise. <b>/</b> springt in die Suche. Solange ein Feld beschrieben wird,
   bleiben die Tasten still.</p>
  <p>Links neben Profil und ⚙ liegt <b>ein Platz für den Stift ✎</b>. Was er tut,
   richtet sich nach der Ansicht: im <b>Tag</b> bearbeitet er den Plan, im
   <b>Einträge</b>-Menü sortiert er die Kacheln. In den übrigen Ansichten bleibt
   er leer — der Platz selbst bleibt, damit die Reiterleiste nicht springt.</p>`},

{id:"woche", teil:"Täglich benutzen", titel:"Die ganze Woche auf einmal", worte:"wochenansicht übersicht raster woche",
 teilEn:"Everyday use", titelEn:"The whole week at once", worteEn:"week view overview grid week",
 textEn:`<p>In the day view, next to the week number, there is <b>Week</b>. That opens
   the grid: rows are the lessons, columns Monday to Friday.</p>
  <ul>
   <li><b>Today</b> is highlighted.</li>
   <li>What is <b>cancelled</b> is struck through; cover lessons appear with their
     own title.</li>
   <li><b>Holidays and free days</b> are hatched and named below the grid.</li>
   <li>A small <b>K</b> or <b>H</b> in a cell means: an exam or an open piece of
     homework is due there.</li>
   <li>Empty lessons at the end of the day are missing, just as in the day plan.</li>
  </ul>
  <p>‹ and › page week by week, on a computer the <b>arrow keys</b> do too.
   Tapping a lesson jumps to its day.</p>
  <p class="hHinweis">Why not a tab of its own: on narrow phones the tab bar is
   already full with four labels. A fifth button would break it onto two lines.</p>`,
 text:`<p>In der Tagesansicht neben der Kalenderwoche steht <b>Woche</b>. Das öffnet
   das Raster: Zeilen sind die Stunden, Spalten Montag bis Freitag.</p>
  <ul>
   <li>Der <b>heutige Tag</b> ist hervorgehoben.</li>
   <li>Was <b>ausfällt</b>, steht durchgestrichen; Vertretungen stehen mit ihrem
     eigenen Titel da.</li>
   <li><b>Ferien und freie Tage</b> sind schraffiert und stehen unter dem Raster
     beim Namen.</li>
   <li>Ein kleines <b>K</b> oder <b>H</b> in einer Zelle heisst: dort steht eine
     Klausur oder eine offene Hausaufgabe an.</li>
   <li>Leere Stunden am Ende des Tages fehlen, genau wie im Tagesplan.</li>
  </ul>
  <p>‹ und › blättern wochenweise, am Rechner auch die <b>Pfeiltasten</b>.
   Eine Stunde antippen springt auf ihren Tag.</p>
  <p class="hHinweis">Warum kein eigener Reiter: bei schmalen Handys ist die
   Reiterleiste mit vier Beschriftungen bereits randvoll. Ein fünfter Knopf
   würde sie umbrechen.</p>`},

{id:"stundeantippen", teil:"Täglich benutzen", titel:"Eine Stunde antippen", worte:"schnellauswahl hausaufgabe fällt aus vertretung fachinfo",
 teilEn:"Everyday use", titelEn:"Tapping a lesson", worteEn:"quick menu homework cancelled cover subject info",
 textEn:`<p><b>A short tap</b> opens the quick menu for that lesson:</p>
  <ul>
   <li><b>Homework</b> — the due date is already set to the
     <i>next lesson in this subject</i>. If chemistry is on Tuesday and Friday, a
     tap on Tuesday automatically gives Friday. With ⚙ →
     <i>Separate subjects by teacher</i> only the next lesson with the same teacher
     counts.</li>
   <li><b>Note</b> — free text for this day.</li>
   <li><b>Exam</b> — a date.</li>
   <li><b>Absence</b> — the number of lessons in the block is already filled in.</li>
   <li><b>Cancelled</b> — only on this one day, the subject is struck through.</li>
   <li><b>Cover lesson</b> — a different subject or room, only on this day.</li>
   <li><b>Other event</b> — everything else.</li>
   <li><b>Subject info</b> — the same as a long press.</li>
  </ul>
  <p><b>Press and hold</b> opens the subject info directly: full name, teacher,
   room, lessons per week, next date (tappable, jumps into the calendar), grade
   average, number of handouts and what is still open.</p>
  <p class="hHinweis"><i>Cancelled</i>, <i>cover lesson</i> and events apply
   <b>only on that one day</b>. The regular plan is left untouched.</p>`,
 text:`<p><b>Kurz antippen</b> öffnet die Schnellauswahl für diese Stunde:</p>
  <ul>
   <li><b>Hausaufgabe</b> — das Fälligkeitsdatum ist schon auf die
     <i>nächste Stunde dieses Fachs</i> gesetzt. Steht Chemie am Dienstag und
     Freitag, ergibt ein Tipp am Dienstag automatisch Freitag. Mit ⚙ →
     <i>Fächer nach Lehrkraft trennen</i> zählt nur die nächste Stunde bei
     derselben Lehrkraft.</li>
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
 teilEn:"Everyday use", titelEn:"The entry button", worteEn:"plus new create kind type",
 textEn:`<p>One button for everything, at the bottom of the screen. The kind follows
   where you currently are — if you are in the grades, “Grade” is preselected.</p>
  <table class="hTab">
   <tr><th>Kind</th><th>What for</th><th>Example</th></tr>
   <tr><td>Homework</td><td>with a due date, tickable</td><td>MA — p. 42 no. 1–7</td></tr>
   <tr><td>Exam</td><td>a date, tickable</td><td>CH — redox reactions</td></tr>
   <tr><td>Note</td><td>free text for a day</td><td>presentation discussed</td></tr>
   <tr><td>Event</td><td>one-off, all day or a single lesson</td><td>dentist, 3rd/4th lesson</td></tr>
   <tr><td>Grade</td><td>oral/written, what for, notes</td><td>2.3 written</td></tr>
   <tr><td>Handout</td><td>formulas, rules, vocabulary, with images</td><td>quadratic formula</td></tr>
   <tr><td>Absence</td><td>counted in lessons; subject optional, prefilled from a lesson</td><td>2 lessons excused</td></tr>
  </table>
  <p>A <b>subject is never preselected</b> — unless you come from a tapped lesson.
   That prevents entries from quietly landing on the wrong subject.</p>
  <p>In the date picker every day on which the chosen subject appears in the plan
   gets a <b>red dot</b>. That way you find the next lesson without paging.
   If <i>Separate subjects by teacher</i> is on, only the days with the chosen
   teacher count.</p>`,
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
   <tr><td>Fehlzeit</td><td>in Unterrichtsstunden; Fach optional, aus einer Stunde vorbelegt</td><td>2 Stunden entschuldigt</td></tr>
  </table>
  <p>Ein <b>Fach ist nie vorausgewählt</b> — außer du kommst aus einer angetippten
   Stunde. Das verhindert, dass Einträge stillschweigend am falschen Fach landen.</p>
  <p>Bei der Datumsauswahl bekommt jeder Tag einen <b>roten Punkt</b>, an dem das
   gewählte Fach im Plan steht. So findest du die nächste Stunde ohne Blättern.
   Ist <i>Fächer nach Lehrkraft trennen</i> eingeschaltet, zählen nur die Tage
   bei der gewählten Lehrkraft.</p>`},

{id:"kalendermenue", teil:"Täglich benutzen", titel:"Im Kalender eintragen", worte:"doppeltippen gedrückt halten tagesmenü termin freier tag",
 teilEn:"Everyday use", titelEn:"Adding things in the calendar", worteEn:"double tap press and hold day menu appointment free day",
 textEn:`<p><b>Double-tapping</b> a calendar cell or <b>pressing and holding</b> it
   (right-click on a computer) opens the day menu: appointment, homework, exam,
   note, absence or free day.</p>
  <p>At the top of the menu it says what is already entered for that day and
   whether it is marked as free. If it is, the button reads <i>Change free day</i>
   and shows its label.</p>
  <p>A single tap still only selects the day — below it appears what is due on it.</p>`,
 text:`<p>Ein Kalenderfeld <b>doppelt antippen</b> oder <b>gedrückt halten</b>
   (am Rechner auch Rechtsklick) öffnet das Tagesmenü: Termin, Hausaufgabe,
   Klausur, Notiz, Fehlzeit oder freier Tag.</p>
  <p>Oben im Menü steht, was an dem Tag schon eingetragen ist und ob er als frei
   markiert ist. Ist er das, heißt der Knopf <i>Freien Tag ändern</i> und zeigt
   dessen Bezeichnung.</p>
  <p>Einzelnes Antippen wählt weiterhin nur den Tag aus — darunter erscheint, was
   an ihm ansteht.</p>`},

{id:"reihe", teil:"Täglich benutzen", titel:"Etwas jede Woche eintragen", worte:"wiederholen serie reihe wöchentlich ag vokabeltest",
 teilEn:"Everyday use", titelEn:"Entering something every week", worteEn:"repeat series recurring weekly club vocabulary test",
 textEn:`<p>For <b>homework</b>, <b>exam</b>, <b>note</b> and <b>event</b> the entry
   dialog offers <i>Repeat</i>: once, every week or every two weeks, plus a date up
   to which. Below it says how many dates that makes and when the last one falls.</p>
  <p>On saving, <b>real individual entries</b> are created, one per date — not a
   rule that generates dates in the background. That costs a little storage and in
   return gives exactly what matters: you can <b>tick off each date separately</b>,
   move it or delete it, and search, calendar, archive and the calendar export
   treat them like everything else.</p>
  <p>When <b>deleting</b>, the app asks whether only this date or the whole series
   should go. In the lists such entries are marked <i>Series</i>.</p>
  <p class="hHinweis">At most 60 dates at a time. Without an end date the app
   suggests three months — a number you can still take in while entering it.</p>`,
 text:`<p>Bei <b>Hausaufgabe</b>, <b>Klausur</b>, <b>Notiz</b> und <b>Ereignis</b>
   steht im Eintragsdialog <i>Wiederholen</i>: einmalig, jede Woche oder alle zwei
   Wochen, dazu ein Datum, bis wann. Darunter steht, wie viele Termine daraus
   werden und wann der letzte liegt.</p>
  <p>Beim Speichern entstehen <b>echte einzelne Einträge</b>, einer je Termin —
   keine Regel, die im Hintergrund Termine erzeugt. Das kostet etwas Speicher und
   bringt dafür genau das, worum es geht: du kannst <b>jeden Termin einzeln
   abhaken</b>, verschieben oder löschen, und Suche, Kalender, Archiv und der
   Kalender-Export behandeln sie wie alles andere.</p>
  <p>Beim <b>Löschen</b> fragt die App, ob nur dieser Termin oder die ganze Reihe
   verschwinden soll. In den Listen steht bei solchen Einträgen <i>Reihe</i>.</p>
  <p class="hHinweis">Höchstens 60 Termine auf einmal. Ohne Enddatum schlägt die
   App drei Monate vor — eine Zahl, die man beim Eintragen noch überblickt.</p>`},

{id:"kacheln", teil:"Täglich benutzen", titel:"Das Einträge-Menü umsortieren", worte:"kacheln reihenfolge sortieren stift pfeile",
 teilEn:"Everyday use", titelEn:"Reordering the entries menu", worteEn:"tiles order sort pencil arrows",
 textEn:`<p>In the <b>Entries</b> tab all lists sit as tiles below one another:
   homework, exams, notes, events, grades, handouts, absences, archive. Each names
   its current state under its title.</p>
  <p><b>Tapping ✎ at the top</b> switches reordering on — the same place in the
   header where the plan pencil sits in the day view. Next to every tile <b>↑</b>
   and <b>↓</b> appear; while sorting, tapping a tile does not open a list. Tapping
   ✎ again ends it.</p>
  <p>The order applies to this profile and is remembered. The order of the
   <i>subjects</i> in the report card is set separately under ⚙ →
   <b>Order of subjects</b>.</p>`,
 text:`<p>Im Reiter <b>Einträge</b> stehen alle Listen als Kacheln untereinander:
   Hausaufgaben, Klausuren, Notizen, Ereignisse, Noten, Merkblätter, Fehlzeiten,
   Archiv. Jede nennt unter dem Namen ihren Stand.</p>
  <p><b>✎ oben antippen</b> schaltet das Sortieren ein — derselbe Platz im Kopf,
   an dem in der Tagesansicht der Plan-Stift sitzt. Neben jeder Kachel erscheinen
   <b>↑</b> und <b>↓</b>; solange sortiert wird, öffnet ein Tipp auf eine Kachel
   keine Liste. Erneut auf ✎ tippen beendet es.</p>
  <p>Die Reihenfolge gilt für dieses Profil und bleibt gespeichert. Die der
   <i>Fächer</i> im Zeugnis stellst du getrennt davon unter ⚙ →
   <b>Reihenfolge der Fächer</b> ein.</p>`},

{id:"suchen", teil:"Täglich benutzen", titel:"Suchen", worte:"finden filter",
 teilEn:"Everyday use", titelEn:"Searching", worteEn:"find filter",
 textEn:`<p>At the very top of the <b>Entries</b> tab. The search covers subject,
   title, note and room — across events, grades, homework, exams, notes and
   handouts at the same time.</p>
  <p>An abbreviation and its full name count as the same thing, as long as the name
   is stored under ⚙. At most 40 hits, newest first.</p>`,
 text:`<p>Im Reiter <b>Einträge</b> ganz oben. Gesucht wird über Fach, Titel, Notiz
   und Raum — bei Ereignissen, Noten, Hausaufgaben, Klausuren, Notizen und
   Merkblättern gleichzeitig.</p>
  <p>Kürzel und ausgeschriebener Name gelten als dasselbe, sofern der Name unter
   ⚙ hinterlegt ist. Höchstens 40 Treffer, neueste zuerst.</p>`},

{id:"archiv", teil:"Täglich benutzen", titel:"Archiv und Löschen", worte:"papierkorb wiederherstellen zurückholen",
 teilEn:"Everyday use", titelEn:"Archive and deleting", worteEn:"bin trash restore recover",
 textEn:`<p>Deleted things do not vanish at once but land in the <b>archive</b> —
   entries, events and grades alike. From there you can bring them back or remove
   them for good. A second deletion is irreversible and is confirmed first.</p>
  <p>Ticked-off homework and exams move to the archive automatically after
   <b>seven days</b>. Notes, handouts and absences stay — those you want to keep.</p>
  <p><b>How long the archive keeps things</b> is set under ⚙ → <b>Archive</b>:
   forever (the default), 30 days, 3, 6 or 12 months. If a limit is set, the note at
   the top of the archive states it, and every row shows how long it still has.
   The last week is highlighted in colour.</p>
  <p class="hWarn">A limit removes entries <b>for good</b> — after that only a backup
   helps. The clock starts on the day of deletion; for everything that was already
   in the archive before this version it starts when you first open the app, not
   retroactively.</p>`,
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
 teilEn:"Grades and report card", titelEn:"Entering grades", worteEn:"grade points system 1-6 0-15",
 textEn:`<p>Under ⚙ → <b>Grades</b> you choose between <b>grades 1–6</b> and
   <b>points 0–15</b>. The input accepts both a comma and a point, so 2,3 as well
   as 2.3.</p>
  <p>Every grade is either <b>oral</b> or <b>written</b>. The two are averaged
   separately and only then combined.</p>
  <p class="hHinweis">The German system runs from 1 (best) to 6 (worst); the points
   scale from 0 (worst) to 15 (best) is used in the upper years.</p>`,
 text:`<p>Unter ⚙ → <b>Noten</b> wählst du zwischen <b>Noten 1–6</b> und
   <b>Punkten 0–15</b>. Die Eingabe akzeptiert Komma und Punkt, also 2,3 wie 2.3.</p>
  <p>Jede Note ist entweder <b>mündlich</b> oder <b>schriftlich</b>. Beide werden
   getrennt gemittelt und erst danach verrechnet.</p>`},

{id:"verhaeltnis", teil:"Noten und Zeugnis", titel:"Verhältnis mündlich zu schriftlich", worte:"gewichtung anteil prozent",
 teilEn:"Grades and report card", titelEn:"Ratio of oral to written", worteEn:"weighting share percent",
 textEn:`<p>Three levels, each overriding the one above:</p>
  <ol>
   <li>the <b>default</b> for all subjects (⚙ → Grades → <i>oral %</i>),</li>
   <li>the value of a <b>subject</b>,</li>
   <li>with <i>Separate subjects by teacher</i>, the value of a <b>teacher in that
     subject</b>.</li>
  </ol>
  <p>Set it under ⚙ → <i>Ratio per subject</i> — there, under every subject with
   several teachers, is one indented row each — or by tapping a row in the report
   card: the subject row sets the subject, the row below it the teacher. If a row is
   left empty, the level above applies; the grey value in the field shows which one
   that currently is.</p>
  <p class="hHinweis">Separating two courses of the same subject is worth it above
   all when they weight <i>differently</i> — which is why every sub-row in the
   report card uses its own ratio, not the subject's.</p>
  <p><b>Worked example.</b> Oral 3.0 · written 2.0 · ratio 40 % oral:</p>
  <pre class="hCode">3.0 × 0.40  +  2.0 × 0.60  =  1.2 + 1.2  =  2.40</pre>
  <p>If there is only one kind of grade, that one counts alone — the ratio then has
   no effect.</p>`,
 text:`<p>Drei Stufen, jede sticht die darüber:</p>
  <ol>
   <li>der <b>Standard</b> für alle Fächer (⚙ → Noten → <i>mündlich %</i>),</li>
   <li>der Wert eines <b>Fachs</b>,</li>
   <li>mit <i>Fächer nach Lehrkraft trennen</i> der Wert einer <b>Lehrkraft in
     diesem Fach</b>.</li>
  </ol>
  <p>Einstellbar unter ⚙ → <i>Verhältnis je Fach</i> — dort steht unter jedem Fach
   mit mehreren Lehrkräften je eine eingerückte Zeile — oder durch Antippen einer
   Zeile im Zeugnis: die Fachzeile stellt das Fach ein, die Zeile darunter die
   Lehrkraft. Bleibt eine Zeile leer, gilt die Stufe darüber; der graue Wert im
   Feld zeigt, welche das gerade ist.</p>
  <p class="hHinweis">Zwei Kurse desselben Fachs zu trennen lohnt vor allem dann,
   wenn sie <i>verschieden</i> gewichten — deshalb rechnet jede Unterzeile im
   Zeugnis mit ihrem eigenen Verhältnis, nicht mit dem des Fachs.</p>
  <p><b>Rechenbeispiel.</b> Mündlich 3,0 · schriftlich 2,0 · Verhältnis 40 % mündlich:</p>
  <pre class="hCode">3,0 × 0,40  +  2,0 × 0,60  =  1,2 + 1,2  =  2,40</pre>
  <p>Gibt es nur eine Art Noten, zählt diese allein — das Verhältnis bleibt dann
   ohne Wirkung.</p>`},

{id:"zielnote", teil:"Noten und Zeugnis", titel:"Zielnoten-Rechner", worte:"was muss ich schreiben ziel rechner",
 teilEn:"Grades and report card", titelEn:"Target grade calculator", worteEn:"what do i need target calculator",
 textEn:`<p>Tap a subject row in the report card, enter a <b>target grade</b> at the
   bottom and choose the kind. The app works out what the <i>next</i> grade of that
   kind would have to be for the average to reach the target.</p>
  <p><b>Example.</b> Two written grades, 3.0 and 3.0, target 2.5 written, no oral
   grades. We are looking for x with</p>
  <pre class="hCode">(3.0 + 3.0 + x) / 3 = 2.5   →   x = 1.5</pre>
  <p>If the result lies outside the scale, the app says so plainly: “Not reachable
   with a single grade” — together with the arithmetic value.</p>`,
 text:`<p>Eine Fachzeile im Zeugnis antippen, unten <b>Zielnote</b> eintragen und die
   Art wählen. Die App rechnet aus, was die <i>nächste</i> Note dieser Art bringen
   müsste, damit der Schnitt das Ziel erreicht.</p>
  <p><b>Beispiel.</b> Zwei schriftliche Noten 3,0 und 3,0, Ziel 2,5 schriftlich,
   keine mündlichen Noten. Gesucht ist x mit</p>
  <pre class="hCode">(3,0 + 3,0 + x) / 3 = 2,5   →   x = 1,5</pre>
  <p>Liegt das Ergebnis außerhalb der Skala, sagt die App das offen: „Mit einer
   einzelnen Note nicht erreichbar“ — samt dem rechnerischen Wert.</p>`},

{id:"zeugnis", teil:"Noten und Zeugnis", titel:"Die Zeugnis-Ansicht", worte:"schnitt gerundet durchschnitt",
 teilEn:"Grades and report card", titelEn:"The report card view", worteEn:"average rounded mean",
 textEn:`<p>Every subject with its average and rounded grade, and at the top the
   overall average across all subjects that have grades. The order of the subjects
   can be rearranged under ⚙.</p>
  <p class="hWarn"><b>This is an estimate, not an official statement.</b> The app
   weights all grades of one kind equally. Teachers often calculate differently —
   an exam rarely counts as little as a short test.</p>`,
 text:`<p>Jedes Fach mit Schnitt und gerundeter Note, dazu oben der Gesamtschnitt
   über alle Fächer, die Noten haben. Die Reihenfolge der Fächer ist unter ⚙
   umsortierbar.</p>
  <p class="hWarn"><b>Das ist eine Schätzung, keine Auskunft.</b> Die App gewichtet
   alle Noten einer Art gleich. Lehrkräfte rechnen oft anders — eine Klausur zählt
   selten so viel wie ein Test.</p>`},
{id:"merkblatt", teil:"Merkblätter, Fehlzeiten, Ferien", titel:"Merkblätter", worte:"formeln vokabeln bilder foto tafelbild lehrkraft",
 teilEn:"Handouts, absences, holidays", titelEn:"Handouts", worteEn:"formulas vocabulary images photo blackboard teacher",
 textEn:`<p>As many per subject as you like, each with date and time. Line breaks and
   indentation are preserved and shown in a monospaced font — which keeps formulas
   aligned.</p>
  <p><b>Images</b> can be added, for instance of the blackboard. They are
   automatically scaled down to 1000 px and compressed as JPEG.</p>
  <p class="hWarn">Browser storage holds about 5 MB for everything together. Under
   ⚙ → <b>Storage</b> you can see how much is used as a percentage; from 80 % on the
   app warns you, while there is still time for a backup.</p>
  <p class="hHinweis">Think about what you photograph — pictures of classmates
   belong here only with their consent.</p>`,
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

{id:"fehlzeiten", teil:"Merkblätter, Fehlzeiten, Ferien", titel:"Fehlzeiten", worte:"fehlstunden versäumt entschuldigt unentschuldigt verspätet fach",
 teilEn:"Handouts, absences, holidays", titelEn:"Absences", worteEn:"missed lessons excused unexcused late subject",
 textEn:`<p>Counted in <b>lessons</b> — that is how it appears on the report card
   too. Three kinds: excused, unexcused, late.</p>
  <p>On top of that every absence remembers its <b>subject</b>. If you come via a
   tapped lesson, it is already there. The list shows it per entry, and above the
   list it says how many lessons fall on which subject — for the note to school and
   for the question of where you have to catch up. This changes nothing on the
   report card: there only the lessons count.</p>
  <p>Under ⚙ → <b>Absences</b> you set how many lessons a school day has. From that
   the report card works out the days missed.</p>
  <p><b>Example.</b> 8 lessons per school day, 20 missed lessons make
   <code>20 / 8 = 2.5 days</code>.</p>`,
 text:`<p>Gezählt wird in <b>Unterrichtsstunden</b> — so steht es auch auf dem
   Zeugnis. Drei Arten: entschuldigt, unentschuldigt, verspätet.</p>
  <p>Dazu merkt sich jede Fehlzeit ihr <b>Fach</b>. Kommst du über eine angetippte
   Stunde, steht es schon da. Die Liste zeigt es je Eintrag, und über der Liste
   steht, wie viele Stunden auf welches Fach entfallen — für die Entschuldigung
   und für die Frage, wo du Stoff nachholen musst. Am Zeugnis ändert das nichts:
   dort zählen weiterhin nur die Stunden.</p>
  <p>Unter ⚙ → <b>Fehlzeiten</b> stellst du ein, wie viele Stunden ein Schultag hat.
   Daraus rechnet das Zeugnis die Fehltage aus.</p>
  <p><b>Beispiel.</b> 8 Stunden je Schultag, 20 versäumte Stunden ergeben
   <code>20 / 8 = 2,5 Tage</code>.</p>`},

{id:"ferien", teil:"Merkblätter, Fehlzeiten, Ferien", titel:"Ferien und eigene freie Tage", worte:"feiertage bundesland openholidays praktikum ausflug",
 teilEn:"Handouts, absences, holidays", titelEn:"Holidays and your own free days", worteEn:"public holidays german state openholidays work experience trip",
 textEn:`<p>⚙ → <b>Holidays and public holidays</b> → choose a German state →
   <b>Load holidays</b>. The dates come from openholidaysapi.org, an open data
   project. All that is transmitted is which state and which period are being asked
   for — none of your data. After that they are held locally.</p>
  <p class="hHinweis">The app is built around the German school year, so the
   holiday list covers the sixteen German states. If your school is elsewhere, enter
   free days yourself through the day menu — everything else works the same.</p>
  <p><b>Your own free days</b> you enter in the calendar through the day menu:
   work experience, a trip, a floating holiday, also across several days. They are
   shown in grey like holidays and <b>survive reloading</b> the official dates.</p>`,
 text:`<p>⚙ → <b>Ferien und Feiertage</b> → Bundesland wählen → <b>Ferien laden</b>.
   Die Termine kommen von openholidaysapi.org, einem offenen Datenprojekt.
   Übertragen wird nur, welches Bundesland und welcher Zeitraum gefragt sind —
   keine deiner Daten. Danach liegen sie lokal.</p>
  <p><b>Eigene freie Tage</b> trägst du im Kalender über das Tagesmenü ein:
   Praktikum, Ausflug, beweglicher Ferientag, auch über mehrere Tage. Sie werden
   grau dargestellt wie Ferien und <b>überleben ein erneutes Laden</b> der
   offiziellen Termine.</p>`},

{id:"warumsichern", teil:"Sicherung", titel:"Warum du sichern musst", worte:"datenverlust backup verloren",
 teilEn:"Backup", titelEn:"Why you have to back up", worteEn:"data loss backup lost",
 textEn:`<p class="hWarn">Your data lives on this device only. In concrete terms:</p>
  <ul>
   <li>If you clear <b>cookies and site data</b> in Chrome, the whole plan is gone —
     along with grades, homework and handouts.</li>
   <li>If you uninstall the app or change phones, everything is gone.</li>
   <li>Private browsing forgets everything when it closes.</li>
   <li>In Safari the system deletes the data after seven days without use if the
     app is not on the home screen.</li>
   <li><b>Nobody can restore anything</b> — the data was never anywhere else.</li>
  </ul>`,
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
 teilEn:"Backup", titelEn:"Backing up and reading back in", worteEn:"file json export import share",
 textEn:`<p>⚙ → <b>Backup</b>:</p>
  <ul>
   <li><b>Save as file</b> — a JSON file of this profile into your downloads.</li>
   <li><b>Back up all profiles</b> — a single file for the whole device.
     Appears only from two profiles on.</li>
   <li><b>Share</b> — through the system share menu, for example to yourself by
     mail. If the device cannot share files, the backup is downloaded instead; a
     cancelled share does not count as a backup.</li>
   <li><b>Read file</b> — restores.</li>
  </ul>
  <p class="hWarn"><b>Reading in replaces, it does not merge.</b> The entire plan of
   the profile is overwritten. The app asks first and tells you when the last backup
   was made.</p>
  <p>Only what the app writes itself is read back in: every field is checked for
   form and range, everything unknown is discarded. A foreign or damaged file
   therefore cannot confuse the app.</p>`,
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
 teilEn:"Backup", titelEn:"Backup folder and automation", worteEn:"automatic folder rhythm reminder retention",
 textEn:`<p><b>On a computer (Chrome, Edge):</b> ⚙ → <b>Backup folder</b> → choose a
   folder once. After that the app always puts its backups there without asking.
   With the tick <i>Back up automatically on opening</i> this happens by itself as
   soon as it is due.</p>
  <p><b>Retention:</b> the folder keeps the last 1, 3, 6 or 12 months. Older backups
   are cleared away by the app — but <b>only its own</b>, recognised by their name
   pattern. Other files in the folder are left untouched.</p>
  <p><b>Rhythm:</b> ⚙ → <i>Reminder</i> → every 7, 14, 28 days, every 3 months or
   never. When it is due, a banner appears at the top of the day view with
   <i>Back up now</i> and <i>Not today</i>.</p>
  <p class="hHinweis"><b>On a phone there is no folder choice</b> — no mobile
   browser lets a page write into a folder permanently. Backups go to the downloads
   there. If you want them tidy, switch on <i>Ask where to save files</i> in Chrome
   under <i>⋮ → Settings → Downloads</i>.</p>`,
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
 teilEn:"Backup", titelEn:"Profiles", worteEn:"several people siblings switch",
 textEn:`<p>Several data sets on one device. Every profile has its own plan, its own
   entries, grades, handouts and settings — <b>nothing is shared</b>, the language
   included.</p>
  <p>On opening, the picker comes first, even with only one profile: that way you
   always see which data set you are about to write into. Under ⚙ → <i>On opening</i>
   this can be changed to <i>only with several profiles</i> or <i>straight into the
   plan</i>.</p>
  <p>It is reachable at any time through the letter at the top right. <i>Manage</i>
   is there too, for creating, renaming and deleting.</p>`,
 text:`<p>Mehrere Datensätze auf einem Gerät. Jedes Profil hat eigenen Plan, eigene
   Einträge, Noten, Merkblätter und Einstellungen — <b>nichts wird geteilt</b>.</p>
  <p>Beim Öffnen steht die Auswahl am Anfang, auch bei nur einem Profil: So siehst
   du immer, in welchen Datensatz du gleich schreibst. Unter ⚙ → <i>Beim Öffnen</i>
   umstellbar auf <i>nur bei mehreren Profilen</i> oder <i>gleich in den Plan</i>.</p>
  <p>Jederzeit über den Buchstaben oben rechts erreichbar. Dort auch <i>Verwalten</i>
   zum Anlegen, Umbenennen und Löschen.</p>`},

{id:"erinnerungen", teil:"Erinnerungen", titel:"Warum sich die App nicht selbst weckt", worte:"benachrichtigung push melden",
 teilEn:"Reminders", titelEn:"Why the app cannot wake itself", worteEn:"notification push alert",
 textEn:`<p>A web app cannot wake itself. So there are two routes:</p>
  <ol>
   <li><b>On opening.</b> The app tells you when something is coming up — on Sundays
     with an overview of the week, on the day before an exam, and for exams in the
     next three days. At most once a day. Permission under ⚙ → Reminders.</li>
   <li><b>Calendar export.</b> The reliable route — see the next section.</li>
  </ol>
  <p class="hHinweis">On iPhone there are notifications only if the app is on the
   home screen.</p>`,
 text:`<p>Eine Web-App kann sich nicht selbst wecken. Es gibt deshalb zwei Wege:</p>
  <ol>
   <li><b>Beim Öffnen.</b> Die App meldet sich, wenn etwas ansteht — sonntags mit
     einem Wochenüberblick, am Tag vor einer Klausur, bei Klausuren in den nächsten
     drei Tagen. Höchstens einmal täglich. Berechtigung unter ⚙ → Erinnerungen.</li>
   <li><b>Kalender-Export.</b> Der zuverlässige Weg — siehe nächster Abschnitt.</li>
  </ol>
  <p class="hHinweis">Auf dem iPhone gibt es Benachrichtigungen nur, wenn die App
   auf dem Startbildschirm liegt.</p>`},

{id:"ics", teil:"Erinnerungen", titel:"Kalender-Export (.ics)", worte:"google apple outlook termine wecker stundenplan serie",
 teilEn:"Reminders", titelEn:"Calendar export (.ics)", worteEn:"google apple outlook appointments alarm timetable series",
 textEn:`<p>⚙ → Reminders. There are <b>two</b> buttons there, and they produce two
   different files. You import both into Google Calendar, Apple Calendar or Outlook;
   there you get <b>real reminders</b>, even when the app is closed.</p>
  <p><b>Appointments as .ics</b> — what is coming up:</p>
  <ul>
   <li>Homework and exams: all-day, reminder <b>15 hours before</b> — so the
     evening before, around nine.</li>
   <li>Events with a fixed lesson: as a timed appointment, <b>30 minutes before</b>.</li>
   <li>“Cancelled” is not exported, that would only clutter the calendar.</li>
  </ul>
  <p><b>Timetable as .ics</b> — the lessons themselves, one recurring appointment
   per lesson over <b>one year</b>, with the room as location and the teacher in the
   description. With A/B weeks the series runs fortnightly. <b>Holidays and free
   days are excluded</b> — otherwise the calendar would claim lessons during the
   summer holidays, and then you stop believing it. Without alarms: nobody wants
   thirty reminders a week.</p>
  <p class="hHinweis">Two files instead of one, because in a phone calendar they
   become two calendars. You can hide or delete the lessons without losing the exam
   reminders.</p>
  <p>On a repeated import the same appointments are updated instead of duplicated —
   each carries a fixed identifier.</p>`,
 text:`<p>⚙ → Erinnerungen. Dort liegen <b>zwei</b> Knöpfe, und sie erzeugen zwei
   verschiedene Dateien. Beide importierst du in Google Kalender, Apple Kalender
   oder Outlook; dort bekommst du <b>echte Erinnerungen</b>, auch wenn die App
   geschlossen ist.</p>
  <p><b>Termine als .ics</b> — was ansteht:</p>
  <ul>
   <li>Hausaufgaben und Klausuren: ganztags, Erinnerung <b>15 Stunden vorher</b> —
     also am Vorabend gegen neun.</li>
   <li>Ereignisse mit fester Stunde: als Termin von/bis, <b>30 Minuten vorher</b>.</li>
   <li>„Fällt aus“ wird nicht exportiert, das würde den Kalender zumüllen.</li>
  </ul>
  <p><b>Stundenplan als .ics</b> — der Unterricht selbst, je Stunde ein
   Serientermin über <b>ein Jahr</b>, mit Raum als Ort und Lehrkraft in der
   Beschreibung. Bei A/B-Wochen läuft die Serie zweiwöchentlich. <b>Ferien und
   freie Tage sind ausgenommen</b> — sonst behauptete der Kalender Unterricht in
   den Sommerferien, und dann glaubt man ihm nicht mehr. Ohne Wecker: dreissig
   Erinnerungen die Woche will niemand.</p>
  <p class="hHinweis">Zwei Dateien statt einer, weil daraus im Handykalender
   zwei Kalender werden. Den Unterricht kannst du ausblenden oder löschen, ohne
   die Klausurerinnerungen zu verlieren.</p>
  <p>Bei einem erneuten Import werden dieselben Termine aktualisiert statt
   verdoppelt — jeder trägt eine feste Kennung.</p>`},
{id:"planteilen", teil:"Sicherung", titel:"Den Plan an Mitschüler geben", worte:"teilen weitergeben klasse mitschüler datenschutz",
 teilEn:"Backup", titelEn:"Giving the plan to classmates", worteEn:"share pass on class classmates privacy",
 textEn:`<p>⚙ → <b>Pass on the timetable</b> → <i>Share the plan only</i>. The file
   contains the period grid, subjects, rooms, teachers and their full names —
   nothing else.</p>
  <p class="hWarn">The <b>Share</b> button further up is something different: it
   passes on the <b>complete backup</b>, including grades, absences and photos in
   handouts. For classmates, the plan button is always the one you want.</p>
  <p>When reading in, the app recognises such a file and replaces <b>only the
   timetable</b>. Entries, grades, absences and handouts stay, as do colour, grading
   system and all other settings. Foreign subject and teacher names are added; your
   own keep priority.</p>`,
 text:`<p>⚙ → <b>Stundenplan weitergeben</b> → <i>Nur den Plan teilen</i>. Die Datei
   enthält Stundenraster, Fächer, Räume, Lehrkräfte und deren ausgeschriebene
   Namen — sonst nichts.</p>
  <p class="hWarn">Der Knopf <b>Teilen</b> weiter oben ist etwas anderes: er gibt
   die <b>vollständige Sicherung</b> weiter, also auch Noten, Fehlzeiten und
   Merkblattfotos. Für Mitschüler ist immer der Plan-Knopf gemeint.</p>
  <p>Beim Einlesen erkennt die App eine solche Datei und ersetzt <b>nur den
   Stundenplan</b>. Einträge, Noten, Fehlzeiten und Merkblätter bleiben stehen,
   ebenso Farbe, Notensystem und alle übrigen Einstellungen. Fremde Fach- und
   Lehrernamen kommen dazu, deine eigenen behalten Vorrang.</p>`},

{id:"aufbau", teil:"Technik: wie es funktioniert", titel:"Aufbau — drei Dateien, kein Server", worte:"architektur html js quelltext",
 teilEn:"Technical: how it works", titelEn:"Structure — three files, no server", worteEn:"architecture html js source code",
 textEn:`<p>The whole app consists of three text files and two images:</p>
  <table class="hTab">
   <tr><th>File</th><th>Contents</th></tr>
   <tr><td><code>index.html</code></td><td>structure and all the CSS, all dialogs</td></tr>
   <tr><td><code>app.js</code></td><td>the entire logic, including this text here</td></tr>
   <tr><td><code>sw.js</code></td><td>offline storage, version number, file list</td></tr>
  </table>
  <p><b>No server, no database, no build step, no libraries.</b>
   Nothing is fetched at runtime. It is delivered through GitHub Pages, which only
   sends finished files and computes nothing itself.</p>
  <p>Going without is deliberate: the app stays editable from a phone, and what does
   not exist cannot fail, go out of date or be switched off.</p>`,
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
 teilEn:"Technical: how it works", titelEn:"Where the data lives", worteEn:"localstorage storage keys json",
 textEn:`<p>Everything in the browser's <code>localStorage</code> — a store that
   belongs to exactly one web address and never leaves the device. One set of keys
   per profile, with the prefix <code>p&lt;id&gt;_</code>:</p>
  <table class="hTab">
   <tr><th>Key</th><th>Contents</th></tr>
   <tr><td><code>cfg</code></td><td>settings, period grid, abbreviation tables</td></tr>
   <tr><td><code>plan</code></td><td><code>plan[A|B][MO..FR][slot]</code> = subject, room, teacher</td></tr>
   <tr><td><code>eintraege</code></td><td>homework H, exams K, notes N, handouts M, absences F</td></tr>
   <tr><td><code>sonder</code></td><td>one-off events, cancellations, cover lessons</td></tr>
   <tr><td><code>noten</code></td><td>all grades</td></tr>
   <tr><td><code>ferien</code></td><td>holidays, public holidays and your own free days</td></tr>
  </table>
  <p>All as JSON. Deleted things only get the marker
   <code>geloescht: true</code> and stay in the archive until removed for good.</p>
  <p><code>cfg.fassung</code> holds the <b>data version</b>. If an older app meets
   newer data, it says so instead of quietly trimming it.</p>
  <p>The keys and the values stored in them are German — <code>MO</code> to
   <code>FR</code>, <code>entschuldigt</code>, and so on. That is deliberate: a
   backup written in English stays readable on a German device and the other way
   round, because only the display is translated, never the data.</p>`,
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
 teilEn:"Technical: how it works", titelEn:"How the display is built", worteEn:"render draw rebuild",
 textEn:`<p>There is no framework and no data binding. After every change a function
   <code>zeichne()</code> runs and rebuilds the visible area completely. Before that
   <code>normalisiere()</code> tidies the data: fill in missing fields, capitalise
   subjects, archive ticked-off tasks after seven days.</p>
  <p>That is deliberately blunt. The entire state sits in a handful of variables,
   and every view is a pure function of it — there is no intermediate state that
   could go stale.</p>
  <p>A timer runs every 30 seconds and refreshes the progress bar and the countdown;
   if the date changes while it does, the app jumps to the new day.</p>`,
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
 teilEn:"Technical: how it works", titelEn:"Offline and updating", worteEn:"service worker cache update version",
 textEn:`<p>A <b>service worker</b> puts the five files into a cache on the first
   visit. After that requests are answered <b>from the cache first</b> and refreshed
   in the background. That is why the app starts instantly, even without a network
   and even on poor Wi-Fi.</p>
  <p>The <b>version number</b> lives in exactly one place in <code>sw.js</code> and
   is visible at the bottom under the four dots. The app asks the service worker
   which version is running and compares it with the one on the server; if they
   differ, <i>tap to update</i> appears there.</p>
  <p>When installing, the service worker fetches its files explicitly from the
   network. Without that the browser could serve some of them from its own cache —
   then a new <code>index.html</code> would meet an old <code>app.js</code> and the
   app would break. That happened once.</p>`,
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
 teilEn:"Technical: how it works", titelEn:"Security", worteEn:"xss esc sanitizer csp protection",
 textEn:`<p>The app displays a lot of text you typed yourself. Three layers keep that
   from turning into executable code:</p>
  <ol>
   <li><b><code>esc()</code></b> — every value from the data is escaped before it
     goes into the HTML. An angle bracket becomes text, not an element.</li>
   <li><b>Checking on import</b> — a backup file can come from anywhere. Only what
     is known is taken over, and only in the expected form: dates as dates, colours
     as hex values, images only as embedded image data.</li>
   <li><b>Content Security Policy</b> — the page may not load code from foreign
     addresses and may not execute any from the document itself. What the app does
     not need, it cannot do either.</li>
  </ol>
  <p>There are no credentials, no keys and no sign-in — so there is nothing that
   could be stolen.</p>`,
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
 teilEn:"Technical: how it works", titelEn:"Date, week number, A/B", worteEn:"time zone iso week calculation",
 textEn:`<p>Dates are kept as <code>YYYY-MM-DD</code> and always read as
   <b>local time</b>. The obvious route through the built-in ISO conversion would
   shift the time zone and, depending on the hour, hand back the previous day —
   which is why the app does the arithmetic itself.</p>
  <p>The week number follows the ISO rule: week 1 is the one with the first Thursday
   of the year. The A/B week follows from its parity.</p>`,
 text:`<p>Datumsangaben werden als <code>JJJJ-MM-TT</code> geführt und stets als
   <b>lokale Zeit</b> gelesen. Der naheliegende Weg über die eingebaute
   ISO-Umwandlung würde die Zeitzone verschieben und je nach Uhrzeit den Vortag
   liefern — deshalb rechnet die App selbst.</p>
  <p>Die Kalenderwoche folgt der ISO-Regel: Woche 1 ist die mit dem ersten
   Donnerstag des Jahres. Daraus folgt die A/B-Woche über die Parität.</p>`},

{id:"grenzen", teil:"Technik: wie es funktioniert", titel:"Grenzen und warum es sie gibt", worte:"portal abruf same-origin speicherplatz",
 teilEn:"Technical: how it works", titelEn:"Limits and why they exist", worteEn:"portal fetch same-origin storage space",
 textEn:`<p><b>Why no automatic fetch from the school portal?</b> The app sits on a
   different address from your portal. The browser forbids access across domain
   boundaries unless the other side explicitly allows it. This <i>same-origin
   rule</i> cannot be programmed away. It would take an intermediary service or a
   script on the portal's page — both need credentials or the school's consent.</p>
  <p>In practice it hardly matters: the plan holds for half a year. Only cover
   lessons have to be looked up, and those you enter with two taps.</p>
  <p><b>Why about 5 MB?</b> That is the usual limit of browser storage. Browsers
   count in two-byte characters, which is why the display under ⚙ → Storage counts
   the same way. Images in handouts are by far the largest item.</p>`,
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
 teilEn:"Technical: how it works", titelEn:"What the app never does", worteEn:"privacy tracking advertising server",
 textEn:`<ul>
   <li>It sends none of your data anywhere.</li>
   <li>It has no account, no password, no sign-in.</li>
   <li>It does not track, advertise or analyse.</li>
   <li>It loads no foreign code; everything is in the source.</li>
  </ul>
  <p>The <b>only</b> connection to the outside is the voluntary fetch of the holiday
   dates. The service does not even learn which page the request comes from.</p>`,
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
 teilEn:"When something goes wrong", titelEn:"The red error box", worteEn:"crash error message reload",
 textEn:`<p>If something breaks off, a red box appears at the top with the message,
   the place in the source, the version and details about the device. <b>Your data
   is not affected</b> — the display crashed, not the storage.</p>
  <p>In the box there is a <b>Reload app</b> button. It empties the caches and
   restarts without touching the data. That fixes the most common cause: a
   half-updated version.</p>
  <p>If it stays that way, pass the text on — it contains everything needed to look
   into it. Without a server there is no log; your report is the only source.</p>`,
 text:`<p>Bricht etwas ab, erscheint oben ein roter Kasten mit der Meldung, der
   Stelle im Quelltext, der Version und Angaben zum Gerät. <b>Deine Daten sind
   dabei nicht betroffen</b> — die Anzeige ist abgestürzt, nicht der Speicher.</p>
  <p>Im Kasten steht der Knopf <b>App neu laden</b>. Er leert die Zwischenspeicher
   und startet neu, ohne die Daten anzurühren. Das behebt die häufigste Ursache:
   eine halb erneuerte Fassung.</p>
  <p>Bleibt es dabei, gib den Text weiter — er enthält alles, was zur Suche nötig
   ist. Ohne Server gibt es kein Protokoll; deine Meldung ist die einzige Quelle.</p>`},

{id:"problemdaten", teil:"Wenn etwas klemmt", titel:"Häufige Fälle", worte:"probleme hilfe funktioniert nicht leer",
 teilEn:"When something goes wrong", titelEn:"Common cases", worteEn:"problems help does not work empty",
 textEn:`<table class="hTab">
   <tr><th>What you see</th><th>Cause and remedy</th></tr>
   <tr><td>Plan is empty</td><td>A different profile active? Check the letter at the top right.</td></tr>
   <tr><td>Everything gone</td><td>Site data cleared or storage reclaimed by the system. Without a backup it cannot be restored.</td></tr>
   <tr><td>“Storage full”</td><td>Remove images from old handouts, back up first.</td></tr>
   <tr><td>No reminders</td><td>Check the permission under ⚙. On iPhone only if the app is on the home screen. The calendar export is the reliable route.</td></tr>
   <tr><td>New version does not arrive</td><td>⚙ → <i>Check for update</i>, otherwise close the app and open it again.</td></tr>
   <tr><td>Loading holidays fails</td><td>Check your internet. If the service does not answer, the app gives up after 15 seconds and says so.</td></tr>
   <tr><td>Subject appears twice in the report</td><td>Should not happen any more; subjects are unified on opening. If it does, please report it.</td></tr>
  </table>`,
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

/* Die Anleitung in der eingestellten Sprache. Fehlt eine Übersetzung,
   steht dort der deutsche Abschnitt — lieber ein Text, den man notfalls
   übersetzen lassen muss, als eine Lücke im Inhaltsverzeichnis. */
let HILFE = [];
function hilfeAufbauen(){
  const en = istEnglisch();
  HILFE = HILFE_QUELLE.map(a => ({
    id:    a.id,
    teil:  (en && a.teilEn)  || a.teil,
    titel: (en && a.titelEn) || a.titel,
    /* Auf Englisch zählen beide Stichwortlisten: wer „Sicherung" sucht,
       weil er den Begriff von der deutschen Fassung kennt, soll ihn finden. */
    worte: en ? ((a.worteEn || "") + " " + (a.worte || "")) : (a.worte || ""),
    text:  (en && a.textEn)  || a.text
  }));
}
hilfeAufbauen();

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
    verz.innerHTML = `<div class="eyebrow">${txt("Inhalt|Verzeichnis")}</div>` + HILFE.map(a => {
      const kopf = a.teil !== letzterTeil
        ? `<div class="hvTeil">${esc(a.teil)}</div>` : "";
      letzterTeil = a.teil;
      return kopf + `<button type="button" class="hvZeile" data-zu="${esc(a.id)}">${esc(a.titel)}</button>`;
    }).join("");
  }

  $("#hilfeStand").textContent = klein
    ? (treffer.length
        ? txt("{anzahl} zu „{wort}“", {anzahl:zahl(treffer.length,"Abschnitt","Abschnitte"), wort})
        : txt("Nichts zu „{wort}“ gefunden.", {wort}))
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
    <input type="time" value="${esc(s.von)}" data-feld="von">
    <input type="time" value="${esc(s.bis)}" data-feld="bis">
    <button type="button" data-slotweg="${i}" aria-label="${txt("Zeile löschen")}">×</button></div>`).join("");
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
    <button type="button" data-hoch="${i}" ${i === 0 ? "disabled style=opacity:.3" : ""} aria-label="${txt("nach oben")}">↑</button>
    <button type="button" data-runter="${i}" ${i === liste.length-1 ? "disabled style=opacity:.3" : ""} aria-label="${txt("nach unten")}">↓</button>
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
  if(!liste.length){
    $("#sAnteilFaecher").innerHTML = `<p class="hinweis">${txt("Sobald Fächer im Plan stehen, erscheinen sie hier.")}</p>`;
    return;
  }
  $("#sAnteilFaecher").innerHTML = liste.map(f => {
    /* Unter jedem Fach seine Lehrkräfte — eingerückt, damit sichtbar bleibt,
       dass der Fachwert gilt, solange die Zeile darunter leer ist. */
    const unter = lehrerTeileZuFach(f).filter(t => t.lk).map(t =>
      `<div class="anteilzeile unter"><span>${esc(t.name)}</span>
        <input type="number" min="0" max="100" step="5" data-anteillkfach="${esc(lkSchluessel(f, t.lk))}"
          placeholder="${anteilFuer(f)}" value="${
            hatEigenenAnteil(f, t.lk) ? esc(cfg.anteileLk[lkSchluessel(f, t.lk)]) : ""}"></div>`).join("");
    return `<div class="anteilzeile"><span>${esc(fachName(f))}</span>
        <input type="number" min="0" max="100" step="5" data-anteilfach="${esc(f)}"
          placeholder="${Number(cfg.anteilM)||0}" value="${hatEigenenAnteil(f) ? esc(cfg.anteile[f]) : ""}"></div>`
      + unter;
  }).join("");
}
const anteilFelderLesen = merkmal => {
  const o = {};
  document.querySelectorAll("[data-"+merkmal+"]").forEach(el => {
    const v = el.value.trim();
    if(v !== "") o[el.dataset[merkmal]] = Math.max(0, Math.min(100, Number(v)||0));
  });
  return o;
};
const anteilFaecherLesen = () => anteilFelderLesen("anteilfach");
const anteilLehrerLesen  = () => anteilFelderLesen("anteillkfach");
const anteilHinweis = () => {
  const m = Math.max(0, Math.min(100, Number(sAnteilM.value)||0));
  $("#sAnteilHinweis").textContent = txt("{m} % mündlich, {s} % schriftlich.", {m, s:100-m});
};
sAnteilM.oninput = anteilHinweis;
sNotenSystem.onchange = () => {
  $("#eWertLabel").textContent = sNotenSystem.value === "punkte15" ? txt("Punkte 0–15") : txt("Note 1–6");
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
  return a >= 80 ? txt("Der Speicher ist zu {n} % voll. Lege eine Sicherung an und "
    + "entferne alte Bilder aus Merkblättern, sonst gehen neue Einträge verloren.", {n:a}) : "";
};
function speicherStand(){
  const kb = belegteKb(), warn = speicherWarnung();
  const bilderZahl = eintraege.reduce((s,e) => s + ((e.bilder||[]).length), 0);
  const el = $("#sSpeicher");
  el.textContent = txt("{kb} kB von rund {grenze} kB belegt ({anteil} %) · {bilder} in Merkblättern.",
    {kb, grenze:GRENZE_KB, anteil:speicherAnteil(), bilder:zahl(bilderZahl,"Bild","Bilder")})
    + (warn ? " " + warn : "");
  el.style.color = warn ? "var(--akzent)" : "";
}
function sicherungStand(){
  const l = sicherungDatum(), alter = sicherungAlter();
  const el = $("#sSicherStand");
  if(!l){ el.textContent = txt("Noch nie gesichert. Jetzt wäre ein guter Zeitpunkt."); return; }
  el.textContent = sicherungFaellig()
    ? txt("Letzte Sicherung vor {dauer} — Zeit für eine neue.", {dauer:zahl(alter,"Tag","Tagen")})
    : txt("Letzte Sicherung: {datum}{zusatz}.", {datum:zeigDatum(l), zusatz: alter
        ? " " + txt("(vor {dauer})", {dauer:zahl(alter,"Tag","Tagen")}) : " " + txt("(heute)")});
}
function archivHinweisEinstellung(){
  const tage = Math.max(0, Number(sArchivTage.value) || 0);
  const el = $("#sArchivHinweis");
  if(!tage){
    el.textContent = txt("Nichts wird von selbst entfernt. Das Archiv wächst, bis du "
      + "einzelne Einträge endgültig löschst.");
    el.style.color = "";
    return;
  }
  /* Vor dem Speichern zeigen, was diese Wahl sofort kosten würde. */
  const jetzt = archivListe();
  const weg = jetzt.filter(a => {
    const alter = Math.round((new Date() - new Date(a.seit+"T12:00"))/864e5);
    return alter >= tage;
  }).length;
  el.textContent = txt("Gelöschtes wird {dauer} nach dem Löschen endgültig entfernt — "
    + "das lässt sich nicht rückgängig machen.", {dauer:zahl(tage,"Tag","Tage")})
    + (weg ? " " + txt("Beim Speichern verschwinden dadurch sofort {n}.",
        {n:zahl(weg,"Eintrag","Einträge")}) : "");
  el.style.color = weg ? "var(--akzent)" : "";
}
sArchivTage.onchange = archivHinweisEinstellung;

function rhythmusHinweis(){
  const tage = Math.max(0, Number(sRhythmus.value) || 0);
  const monate = Math.max(0, Number(sHalten.value) || 0);
  $("#sRhythmusHinweis").textContent = (tage
    ? txt("Die App erinnert dich alle {dauer} in der Tagesansicht.", {dauer:zahl(tage,"Tag","Tage")})
    : txt("Es wird nicht erinnert. Ans Sichern denkst du dann selbst."))
    + " " + (monate
      ? txt("Im Sicherungsordner bleiben die letzten {dauer}; ältere Sicherungen der App "
          + "werden dort gelöscht.", {dauer:zahl(monate,"Monat","Monate")})
      : txt("Im Sicherungsordner bleibt alles liegen."));
}
sRhythmus.onchange = rhythmusHinweis;
sHalten.onchange = rhythmusHinweis;

/* --- Ordner: Anzeige und Knöpfe --- */
async function ordnerStand(){
  const el = $("#sOrdnerStand");
  if(!el) return;
  if(!ordner){ el.textContent = txt("Noch kein Ordner gewählt. Sicherungen gehen in die Downloads."); return; }
  const frei = await ordnerBereit(false);
  let zusatz = "";
  if(frei){
    try{
      const liste = await ordnerSicherungen();
      const grenze = haltegrenze();
      const alt = grenze ? liste.filter(x => x.datum < grenze).length : 0;
      zusatz = " · " + txt("{anzahl} darin", {anzahl:zahl(liste.length,"Sicherung","Sicherungen")})
        + (alt ? ", " + txt("{n} davon älter als die Haltefrist", {n:alt}) : "");
    }catch(e){}
  }
  el.textContent = txt("Ordner: {name}", {name:ordner.name})
    + (frei ? "" : " · " + txt("Zugriff muss beim nächsten Sichern einmal bestätigt werden"))
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
  if(!ordner) return alert(txt("Wähle zuerst einen Ordner."));
  await jetztSichern(true);
  ordnerStand();
};
/* Die Einstellungen sind über die Fassungen auf achtzehn Überschriften
   gewachsen — als eine Rolle war das nicht mehr zu überblicken. Jetzt
   dieselbe Zweistufigkeit wie im Einträge-Reiter: erst ein Menü, das den
   Stand jedes Bereichs nennt, dann der Bereich selbst.

   Die Bereiche stehen in index.html ohne „hidden" — versteckt werden sie
   erst hier. Nach einer Aktualisierung trifft kurzzeitig neues index.html
   auf altes app.js; wären sie in der Vorgabe versteckt, stünde dort dann
   gar nichts mehr. So sieht man in dem Fall die alte lange Liste. */
const EINST_TEILE = [
  {id:"darstellung",  titel:"Darstellung",
   stand: () => [txt(cfg.modus === "hell" ? "hell" : "dunkel"),
                 txt({mono:"Monospace", serif:"Serife"}[cfg.schrift] || "Systemschrift"),
                 cfg.akzent].join(" · ")},
  {id:"schule",       titel:"Schule und Stundenraster",
   stand: () => (cfg.klasse ? cfg.klasse + " · " : "")
     + zahl(cfg.slots.length, "Stunde", "Stunden")
     + (cfg.zweiWochen ? " · " + txt("A/B-Wochen") : "")},
  {id:"noten",        titel:"Noten und Zeugnis",
   stand: () => txt(cfg.notenSystem === "punkte15" ? "Punkte 0–15" : "Noten 1–6")
     + " · " + txt("{n} % mündlich", {n:Number(cfg.anteilM)||0})
     + (Object.keys(cfg.anteile||{}).length + Object.keys(cfg.anteileLk||{}).length
        ? " · " + txt("eigene Verhältnisse") : "")},
  {id:"fehlzeiten",   titel:"Fehlzeiten und Archiv",
   stand: () => txt("{n} Stunden je Schultag", {n:cfg.stdProTag}) + " · " + txt("Archiv") + " "
     + (archivFrist() ? zahl(archivFrist(), "Tag", "Tage") : txt("für immer"))},
  {id:"erinnerungen", titel:"Erinnerungen und Kalender",
   stand: () => txt(cfg.melden ? "beim Öffnen erinnern" : "keine Erinnerung beim Öffnen")},
  {id:"ferien",       titel:"Ferien und Feiertage",
   stand: () => { const n = ferien.filter(f => f.typ !== "eigen").length;
     return n ? zahl(n, "Zeitraum geladen", "Zeiträume geladen")
              : (LAENDER[cfg.land] || txt("kein Bundesland gewählt")); }},
  {id:"namen",        titel:"Fächer und Lehrkräfte",
   stand: () => `${zahl(alleFaecher().length, "Fach", "Fächer")} · `
     + zahl(alleLehrer().length, "Lehrkraft", "Lehrkräfte")
     + (cfg.nachLehrer ? " · " + txt("getrennt") : "")},
  {id:"sicherung",    titel:"Sicherung und Speicher",
   stand: () => { const a = sicherungAlter();
     return a === null ? txt("noch nie gesichert")
          : a === 0 ? txt("heute gesichert")
          : txt("zuletzt vor {dauer}", {dauer:zahl(a, "Tag", "Tagen")}); }}
];
/* Beides wird auch nach einem Sprachwechsel neu gesetzt — deshalb je eine
   Funktion statt zweier Stellen, die auseinanderlaufen können. */
function laenderFuellen(wert){
  sLand.innerHTML = `<option value="">— ${txt("wählen")} —</option>` +
    Object.entries(LAENDER).map(([k,v]) =>
      `<option value="${k}" ${wert === k ? "selected":""}>${v}</option>`).join("");
}
function ankerStand(){
  const kw = kalenderwoche(new Date());
  $("#ankerJetzt").textContent = txt("Diese Woche ist KW {kw}, also {woche}.",
    {kw, woche: kw % 2 === 1 ? "A" : "B"});
}
let einstTeil = null;
function einstZeigen(id){
  einstTeil = id;
  $("#einstMenu").classList.toggle("hidden", id !== null);
  $("#einstZurueckZeile").classList.toggle("hidden", id === null);
  $("#einstTeilTitel").classList.toggle("hidden", id === null);
  /* Die Anleitung gehört zur obersten Ebene — in einem Bereich wäre sie nur
     ein Knopf, der von ihm wegführt. Für die Sprachwahl gilt dasselbe, und
     sie steht bewusst vor allem anderen. */
  $("#einstHilfeZeile").classList.toggle("hidden", id !== null);
  $("#einstSprachZeile").classList.toggle("hidden", id !== null);
  const teil = EINST_TEILE.find(t => t.id === id);
  $("#einstTeilTitel").textContent = teil ? txt(teil.titel) : "";
  document.querySelectorAll(".einstTeil").forEach(el => {
    el.classList.toggle("hidden", el.dataset.einst !== id);
    /* „Noten und Zeugnis" über „Noten" liest sich wie ein Stottern. Die erste
       innere Überschrift verschwindet, wenn der Bereichstitel mit ihr beginnt —
       im Markup bleibt sie stehen, damit die Liste ohne diese Ebene vollständig
       ist (altes app.js, neues index.html). */
    const erste = el.querySelector(".eyebrow");
    if(erste) erste.classList.toggle("hidden",
      el.dataset.einst === id && teil && txt(teil.titel).startsWith(erste.textContent.trim()));
  });
  if(id === null) einstMenuZeichnen();
  /* Nach dem Wechsel oben anfangen — sonst steht man mitten im neuen Bereich. */
  dlgEinst.scrollTop = 0;
}
function einstMenuZeichnen(){
  $("#einstMenu").innerHTML = EINST_TEILE.map(t => {
    let stand = "";
    /* Ein Bereich, dessen Stand nicht zu ermitteln ist, darf nicht den
       ganzen Dialog mitreissen. */
    try{ stand = t.stand(); }catch(e){ stand = ""; }
    return `<button type="button" data-einstteil="${t.id}">${esc(txt(t.titel))}<small>${esc(stand)}</small></button>`;
  }).join("");
}
$("#einstMenu").onclick = e => {
  const b = e.target.closest("[data-einstteil]"); if(!b) return;
  einstZeigen(b.dataset.einstteil);
};
$("#bEinstZurueck").onclick = () => einstZeigen(null);

/* Merkt sich beim Öffnen den Zustand aller Felder. Beim Schließen wird
   verglichen — nur dann fragt die App nach. */
let einstStand = null;
function einstFelder(){
  /* Die Sprache wird sofort gespeichert, sobald sie gewählt ist. Sie darf
     deshalb nicht als ungesicherte Änderung gelten. */
  return [...dlgEinst.querySelectorAll("input,select,textarea")]
    .filter(el => el.id && el.type !== "file" && el.id !== "sSprache")
    .map(el => el.id + "=" + (el.type === "checkbox" ? el.checked : el.value)).join("\u0001")
    + "\u0001reihe=" + (reiheFachListe || []).join(",");
}
const einstGeaendert = () => einstStand !== null && einstFelder() !== einstStand;

function einstellungenOeffnen(teil){
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
  sSprache.value = SPRACHEN[cfg.sprache] ? cfg.sprache : "";
  sMelden.checked = !!cfg.melden; meldeStand();
  sNachLehrer.checked = !!cfg.nachLehrer;
  /* Alle im Plan vorkommenden Kürzel stehen schon da — eingetragen werden
     muss nur der Name dahinter. Vorhandene Zuordnungen bleiben erhalten. */
  sLehrer.value  = paareVorbelegt(cfg.lehrer, alleLehrer());
  sFaecher.value = paareVorbelegt(cfg.fachnamen, alleFaecher());
  laenderFuellen(cfg.land);
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
  ankerStand();
  $("#ankerWrap").classList.toggle("hidden", !cfg.zweiWochen);
  $("#sWocheKopieren").classList.toggle("hidden", !cfg.zweiWochen);
  $("#sWocheStand").textContent = "";
  $("#sDateiAlle").classList.toggle("hidden", profile.length < 2);
  sicherungStand(); speicherStand(); versionPruefen();
  einstZeigen(EINST_TEILE.some(t => t.id === teil) ? teil : null);
  dlgEinst.showModal();
  einstStand = einstFelder();
}
$("#btnEinst").onclick = einstellungenOeffnen;
/* Die Sprache wirkt sofort und wird sofort gespeichert. Ein Wechsel ist
   meist das Erste, was jemand tut — ihn bis zum „Speichern" aufzuheben
   hieße, die halbe Oberfläche in einer Sprache zu lassen, die der oder
   die Betreffende gerade nicht lesen kann. */
sSprache.onchange = () => {
  cfg.sprache = SPRACHEN[sSprache.value] ? sSprache.value : "";
  sichern();
  zeichne();
  einstTexteAuffrischen();
};
/* Nach dem Wechsel stehen die festen Beschriftungen schon in der neuen
   Sprache; die berechneten Texte im Dialog werden hier nachgezogen. Was
   getippt, aber noch nicht gespeichert wurde, bleibt dabei stehen. */
function einstTexteAuffrischen(){
  const fachWerte = anteilFaecherLesen(), lkWerte = anteilLehrerLesen();
  const land = sLand.value;
  einstZeigen(einstTeil);
  anteilHinweis(); archivHinweisEinstellung(); rhythmusHinweis();
  meldeStand(); ferienStand(); sicherungStand(); speicherStand();
  anteilFaecherZeichnen();
  document.querySelectorAll("[data-anteilfach]").forEach(el => {
    const v = fachWerte[el.dataset.anteilfach];
    if(v !== undefined) el.value = v;
  });
  document.querySelectorAll("[data-anteillkfach]").forEach(el => {
    const v = lkWerte[el.dataset.anteillkfach];
    if(v !== undefined) el.value = v;
  });
  reihenZeichnen();
  laenderFuellen(land);
  ankerStand();
  if(ordnerMoeglich()) ordnerStand();
}

/* Schließen mit ungesicherten Änderungen: fragen statt verwerfen.
   Betrifft Zurück-Geste, Hintergrundtipp und Wischen gleichermaßen. */
function einstSchliessen(){
  if(!einstGeaendert()){ einstStand = null; dlgEinst.close(); return; }
  if(confirm(txt("Es gibt ungespeicherte Änderungen.") + "\n\n"
    + txt("OK = speichern und schließen") + "\n" + txt("Abbrechen = verwerfen"))){
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
  if(!confirm(txt("Die {nach}-Woche wird vollständig durch die {von}-Woche ersetzt. Fortfahren?",
    {nach, von}))) return;
  TAGE.forEach(t => plan[nach][t] = ((plan[von] && plan[von][t]) || [])
    .map(x => x ? Object.assign({}, x) : null));
  sichern(); zeichne();
  $("#sWocheStand").textContent = txt("{von}-Woche in die {nach}-Woche übernommen.", {von, nach});
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
/* Nur der Stundenplan, für Mitschüler. Eine volle Sicherung enthält Noten,
   Fehlzeiten und Merkblattfotos — die verschickt man nicht versehentlich,
   nur weil jemand nach dem Plan gefragt hat. Namen von Fächern und
   Lehrkräften gehören dagegen dazu, sonst stehen dort nur Kürzel. */
const planText = () => JSON.stringify(
  {fassung:2, art:"plan", erstellt:new Date().toISOString(),
   cfg:{slots:cfg.slots, zweiWochen:cfg.zweiWochen,
        fachnamen:cfg.fachnamen, lehrer:cfg.lehrer},
   plan}, null, 2);
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
  leser.onerror = () => alert(txt("Datei ließ sich nicht lesen."));
  leser.readAsText(f); sDateiLesen.value = "";
};
$("#sTeilen").onclick = async () => {
  await weitergeben(profile.length > 1 ? sicherungAlleText() : sicherungsText(),
    `stundenplan-${profile.length > 1 ? "alle" : dateiName()}-${iso(new Date())}.json`,
    txt("Stundenplan-Sicherung"), true);
};
/* Teilen oder als Datei speichern. Ein Plan muss am Ende immer als echte
   .json-Datei herauskommen: Text in der Zwischenablage ist für Mitschüler
   praktisch nicht importierbar und wirkte auf Geräten ohne Datei-Share wie
   ein kaputter Knopf. „istSicherung" sagt, ob der Vorgang als Sicherung zählt. */
async function weitergeben(text, name, titel, istSicherung){
  const datei = typeof File === "function"
    ? new File([text], name, {type:"application/json"}) : null;
  if(datei && typeof navigator.share === "function" && typeof navigator.canShare === "function"){
    let kannDatei = false;
    try{ kannDatei = navigator.canShare({files:[datei]}); }catch(e){}
    if(kannDatei){
      try{
        await navigator.share({files:[datei], title:titel});
        if(istSicherung) sicherungNotiert();
        return;
      }catch(e){
        if(e && e.name === "AbortError") return;  // bewusst abgebrochen
        /* Einige Browser melden canShare=true und lehnen denselben Dateityp
           erst beim eigentlichen Teilen ab. Dann nicht im Fehlerkasten enden,
           sondern zuverlässig auf einen normalen Download zurückfallen. */
      }
    }
  }
  try{
    herunterladen(text, name, "application/json");
    if(istSicherung) sicherungNotiert();
    else kurzHinweis(txt("Teilen ist hier nicht verfügbar — Plan-Datei heruntergeladen."));
  }catch(e){
    zeigeFehler(txt("Datei konnte nicht ausgegeben werden") + ": " + ((e && e.message) || e));
  }
}
/* Ersetzt sämtliche Profile des Geräts durch die aus der Datei. */
function alleProfileUebernehmen(liste){
  /* Es werden höchstens 20 Profile übernommen. Auch die Prüfung bleibt auf
     diese Grenze beschränkt: ein riesiges manipuliertes Array darf weder
     unnötig komplett durchlaufen noch über Spread-Argumente den Stack sprengen. */
  const begrenzt = liste.slice(0, 20);
  const neuerStand = begrenzt.reduce((m,p) => Math.max(m, paketDatenstand(p)), 0);
  if(neuerStand > SCHEMA) return alert(neuereDatenText(neuerStand));
  if(!confirm(txt("Diese Sicherung enthält alle Profile. Sämtliche Profile auf diesem "
    + "Gerät werden dadurch ersetzt. Fortfahren?"))) return;
  const vorher = profile.map(p => p.id), neu = [];
  begrenzt.forEach((p, i) => {
    const id = alsId(p && p.id);
    if(neu.some(x => x.id === id)) return;
    const rein = paketSaeubern(p);
    /* Auch Profile mit derselben ID werden wirklich ersetzt. Alte Nebenwerte
       wie gemeldet_... oder sicherSpaeter dürfen nicht in den Restore hineinragen. */
    profilSchluessel(id).forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    DATEN.filter(k => k !== "merkblatt").forEach(k => {
      const wert = rein[k] !== undefined ? rein[k]
                 : (k === "cfg" || k === "plan") ? {} : [];
      try{ localStorage.setItem("p"+id+"_"+k, JSON.stringify(wert)); }catch(e){}
    });
    neu.push({id, name: alsText(p && p.name, 40).trim() || txt("Profil {n}", {n:i+1})});
  });
  if(!neu.length) return alert(txt("In der Datei stecken keine lesbaren Profile."));
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
  catch(e){ return alert(txt("Der Text lässt sich nicht lesen. Ist es wirklich eine Sicherungsdatei?")); }
  if(d && Array.isArray(d.profile)) return alleProfileUebernehmen(d.profile);
  if(d && d.art === "plan") return planUebernehmen(d);
  if(paketZuNeu(d)) return alert(neuereDatenText(paketDatenstand(d)));
  const teil = paketSaeubern(d);
  if(!Object.keys(teil).length) return alert(txt("In der Datei steckt kein erkennbarer Stundenplan."));
  /* Einlesen ersetzt, es ergänzt nicht. Wer das übersieht, verliert einen
     Plan, den es nirgends sonst gibt. */
  if(hatEchteDaten()){
    const alter = sicherungAlter();
    if(!confirm(txt("Das ersetzt den gesamten Plan dieses Profils — Einträge, Noten, "
      + "Merkblätter und Archiv.") + "\n"
      + (alter === null ? txt("Von den jetzigen Daten gibt es noch keine Sicherung.")
                        : txt("Letzte Sicherung der jetzigen Daten: vor {dauer}.",
                              {dauer:zahl(alter,"Tag","Tagen")}))
      + "\n\n" + txt("Fortfahren?"))) return;
  }
  if(teil.cfg)       cfg       = teil.cfg;
  if(teil.plan)      plan      = teil.plan;
  if(teil.eintraege) eintraege = teil.eintraege;
  if(teil.ferien)    ferien    = teil.ferien;
  if(teil.sonder)    sonder    = teil.sonder;
  if(teil.noten)     noten     = teil.noten;
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
};
/* Ein Plan-Paket ersetzt nur den Stundenplan. Liefe es durch den normalen
   Weg, würde seine abgespeckte cfg die ganzen Einstellungen überschreiben —
   Notensystem, Farbe, Verhältnisse, alles. */
function planUebernehmen(d){
  const teil = paketSaeubern(d);
  if(!teil.plan) return alert(txt("In der Datei steckt kein erkennbarer Stundenplan."));
  const roh = (d.cfg && typeof d.cfg === "object") ? d.cfg : {};
  const wochen = roh.zweiWochen ? ["A","B"] : ["A"];
  const belegt = wochen.flatMap(w => Object.values(teil.plan[w] || {}))
    .flat().filter(Boolean).length;
  if(!confirm(txt("Das ersetzt den Stundenplan durch {stunden}.", {stunden:zahl(belegt,"belegte Stunde","belegte Stunden")}) + "\n"
    + txt("Einträge, Noten, Fehlzeiten und Merkblätter bleiben unberührt.") + "\n\n" + txt("Fortfahren?"))) return;
  const c = cfgSaeubern(Object.assign({}, cfg, {
    slots: roh.slots, zweiWochen: roh.zweiWochen,
    /* Zusammenführen statt ersetzen: eigene Namen sind mehr wert als fremde. */
    fachnamen: Object.assign({}, paareSaeubern(roh.fachnamen), cfg.fachnamen),
    lehrer:    Object.assign({}, paareSaeubern(roh.lehrer),    cfg.lehrer)
  }));
  cfg = c; plan = teil.plan;
  normalisiere(); sichern(); dlgEinst.close(); zeichne();
  kurzHinweis(txt("Stundenplan übernommen. Deine Einträge und Noten sind unverändert."));
}
$("#sTeilenPlan").onclick = async () => {
  if(!faecher().length) return alert(txt("Trag zuerst deinen Stundenplan ein."));
  await weitergeben(planText(), `stundenplan-nur-plan-${iso(new Date())}.json`,
                    txt("Stundenplan"), false);
};
$("#sReset").onclick = () => {
  if(!confirm(txt("Plan, Einträge, Noten, Merkblätter und Archiv dieses Profils löschen?"))) return;
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
  else alert(txt("Du bist auf dem neuesten Stand") + (s && s.laeuft ? " (" + s.laeuft + ")." : "."));
};
$("#bEinstSpeichern").onclick = () => {
  const neu = slotsAuslesen();
  /* normalisiere() kürzt den Plan hart auf die Zahl der Zeilen. Das ist
     richtig — aber nicht kommentarlos, wenn dort noch Unterricht steht. */
  if(neu.length && neu.length < cfg.slots.length){
    let verlust = 0;
    ["A","B"].forEach(w => TAGE.forEach(t =>
      ((plan[w] && plan[w][t]) || []).slice(neu.length).forEach(x => { if(x) verlust++; })));
    if(verlust && !confirm(txt("Das Raster wird kürzer. Dabei gehen {stunden} am Ende der Tage verloren.",
      {stunden:zahl(verlust,"belegte Stunde","belegte Stunden")}) + " " + txt("Trotzdem speichern?"))) return;
  }
  cfg.klasse = sKlasse.value.trim();
  cfg.zweiWochen = sZweiWochen.checked;
  if(neu.length) cfg.slots = neu;
  cfg.land = sLand.value;
  cfg.notenSystem = sNotenSystem.value;
  cfg.anteilM = Math.max(0, Math.min(100, Number(sAnteilM.value)||0));
  cfg.anteile = anteilFaecherLesen();
  cfg.anteileLk = anteilLehrerLesen();
  cfg.nachLehrer = sNachLehrer.checked;
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
/* Was die letzte Prüfung ergeben hat. Ein Sprachwechsel muss denselben
   Stand noch einmal schreiben können, ohne erneut ans Netz zu gehen. */
let versionStand = {laeuft:null, server:null, veraltet:false};
function wischTextSetzen(){
  const {laeuft, server, veraltet} = versionStand;
  const w = $("#wischText");
  if(w){
    w.textContent = veraltet
      ? txt("{laeuft} · {server} verfügbar — tippen zum Aktualisieren", {laeuft, server})
      : txt("Wischen wechselt die Ansicht") + " · " + BUILD;
    w.style.color = veraltet ? "var(--akzent)" : "";
    w.onclick = veraltet ? aktualisieren : null;
  }
  const v = $("#sVersion");
  if(v) v.textContent = veraltet ? txt("{laeuft} (neu: {server})", {laeuft, server}) : BUILD;
}
async function versionPruefen(){
  const [laeuft, server] = await Promise.all([laufendeVersion(), serverVersion()]);
  BUILD = laeuft || server || "—";
  versionStand = {laeuft, server, veraltet: !!(laeuft && server && laeuft !== server)};
  wischTextSetzen();
  return versionStand;
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
  if(!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) fehlt.push(txt("Dialogfenster"));
  try{ if(!window.localStorage) fehlt.push(txt("Speicher")); }catch(e){ fehlt.push(txt("Speicher")); }
  if(!fehlt.length) return true;
  zeigeFehler(txt("Dieser Browser ist zu alt für die App — es fehlt: {fehlt}.", {fehlt:fehlt.join(", ")})
    + "\n" + txt("Auf dem iPhone braucht es iOS 15.4 oder neuer, sonst einen aktuellen "
    + "Chrome, Firefox, Edge oder Safari."));
  return false;
}

function starten(){
  if(datenZuNeu){ browserPruefen(); return; }
  if(!cfg || !Array.isArray(cfg.slots) || !cfg.slots.length){
    cfg = Object.assign({}, STANDARD, cfg || {});
    cfg.slots = STANDARD.slots.slice();
  }
  browserPruefen();
  spracheAnwenden();
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
