# Änderungen

Die Versionsnummer steht in `sw.js` und ist die einzige Stelle, an der sie gepflegt wird.

## v40

**Neu**
- Die Einstellungen fragen beim Verlassen nach, wenn etwas geändert und nicht
  gespeichert wurde — OK speichert, Abbrechen verwirft. Gilt für die
  Zurück-Geste, das Tippen daneben und das Wischen gleichermaßen
- Lehrkraft- und Fachkürzel stehen in den Einstellungen schon da; einzutragen
  ist nur noch der Name dahinter. Zeilen ohne Namen werden nicht gespeichert
- Reihenfolge der Kacheln: ✎ neben der Suche im Einträge-Reiter, nicht mehr in
  den Einstellungen

**Geändert**
- Hell-Modus überarbeitet: `--dim` war in beiden Modi zu blass (1,7:1 bzw.
  1,9:1), jetzt über 3:1. Der Schleier hinter Dialogen passt sich an
- Die Textfarbe auf dem Akzent wird berechnet statt geraten. Bei Gold oder
  Türkis stand vorher weiße Schrift mit 2,2:1 darauf, jetzt schwarze mit 8,5:1
- Am Rechner gibt es Rückmeldung beim Überfahren mit dem Zeiger
- Die Fußleiste bleibt auf breiten Bildschirmen in der Spaltenbreite

## v39

**Neu**
- **Aufbewahrungsfrist fürs Archiv:** ⚙ → *Archiv* → für immer, 30 Tage,
  3, 6 oder 12 Monate. Voreingestellt bleibt **für immer** — eine
  Aktualisierung nimmt niemandem Daten weg
- Oben im Archiv steht, wann Gelöschtes endgültig entfernt wird, und wie viele
  Einträge in der kommenden Woche verloren gehen
- Jede Zeile zeigt Löschdatum und Restzeit; die letzte Woche farbig
- Die Liste ist nach Restzeit sortiert — was zuerst geht, steht oben
- Die Auswahl in den Einstellungen sagt vorher, wie viele Einträge beim
  Speichern sofort verschwänden

**Geändert**
- Archivierte Einträge halten jetzt fest, **wann** sie gelöscht wurden. Für
  alles, was schon vorher im Archiv lag, beginnt die Frist beim ersten Öffnen —
  nicht rückwirkend

## v38

**Neu**
- **Anleitung in der App:** ⚙ → *Anleitung und Technik*. 37 Abschnitte in neun
  Teilen, mit Inhaltsverzeichnis zum Anspringen und Suche nach Stichwörtern —
  Treffer werden im Text hervorgehoben
- Darin ein eigener Teil **wie die App technisch funktioniert**: Aufbau, wo die
  Daten liegen, wie die Anzeige entsteht, Offline und Aktualisieren, die drei
  Sicherheitsschichten, Datums- und Notenrechnung, und warum es kein
  Portal-Abruf gibt
- Dazu Beispiele: Importformat, Notenverrechnung, Zielnoten-Rechner,
  Umrechnung von Fehlstunden in Tage — und eine Tabelle häufiger Probleme

## v37

**Behoben**
- Der Abruf der Ferientermine konnte ewig auf einen hängenden Dienst warten;
  „Wird geladen …" blieb dann für immer stehen. Jetzt bricht er nach 15
  Sekunden ab und sagt, was los ist
- Eine unvollständige Antwort des Ferien-Dienstes konnte die Einstellungen
  abstürzen lassen. Fehlende Felder werden übersprungen
- Auch die Versionsabfrage hat jetzt eine Zeitgrenze
- Zwei Zugriffe auf den Plan waren nicht abgesichert, wenn sie vor dem
  ersten Zeichnen liefen

**Neu**
- Der Datenstand steht jetzt in den gespeicherten Daten. Trifft eine ältere
  App auf neuere Daten, sagt sie das, statt sie stillschweigend zu beschneiden
- Einlesen einer Sicherung fragt nach, bevor es einen vorhandenen Plan
  ersetzt — und nennt dabei, wann zuletzt gesichert wurde
- Der rote Fehlerkasten nennt Version, Sprache, Bildschirmgröße und Browser.
  Ohne Server gibt es kein Protokoll; eine Meldung ist die einzige Quelle
- Beim Abruf der Ferientermine erfährt der Dienst nicht mehr, von welcher
  Seite die Anfrage kommt

**Betrieb**
- `.gitignore`: Sicherungsdateien der App gehören nie ins Repository — sie
  enthalten Noten, Fehlzeiten und Fotos
- Veröffentlichen läuft über GitHub Actions und erst nach bestandener
  Prüfung. Bisher ging jeder Push live, auch ein kaputter
- Die Prüfung schlägt fehl, wenn `index.html` oder `app.js` geändert wurden,
  ohne die Versionsnummer in `sw.js` hochzuzählen
- `DEPLOYMENT.md` beschreibt Veröffentlichen, Zurückrollen und Selbsthosten
- Kein Jekyll: veröffentlicht werden nur die sechs Dateien der App, und die
  Liste stammt aus `sw.js` selbst — Auslieferung und Zwischenspeicher können
  so nicht auseinanderlaufen

## v36

**Behoben (Darstellung am Rechner)**
- Der Eintragsknopf stand links statt mittig. Er ist ein `<button>` und damit
  von Haus aus inline — `margin:auto` zentriert daran nichts. Auf dem Handy
  fiel es nicht auf, weil die Spalte dort die volle Breite hat
- Die Reiterleiste sprang bei jedem Ansichtswechsel um 44 px, weil der Stift
  nur in der Tagesansicht steht. Sein Platz bleibt jetzt reserviert
- Der Monatstitel im Kalender stand 87 px neben der Mitte

**Behoben (iPhone und iPad)**
- Eingabefelder unter 16 px ließen Safari beim Antippen in die Seite zoomen,
  ohne wieder herauszukommen. Stundenraster, Importtabelle, Merkblatt-Text
  und Verhältnisfelder sind jetzt bei 16 px
- Langes Drücken legte unter iOS das eigene Auswahlmenü über die Geste
- Ankreuzfelder brauchen vor Safari 15.4 die Herstellerschreibweise
- Safari vergrößerte die Schrift im Querformat eigenmächtig
- Auf schmalen Geräten (360–375 px) liefen die Zeilen des Stundenrasters aus
  dem Dialog heraus, weil `1fr` nicht unter die Inhaltsbreite schrumpft
- Ein zu alter Browser zeigt jetzt einen klaren Satz statt stummer Knöpfe

## v35

**Neu**
- Beim Öffnen steht die **Profilauswahl** am Anfang, auch bei nur einem Profil —
  wer sie sieht, weiß, in welchen Datensatz er gleich schreibt. Unter ⚙ → Darstellung
  umstellbar auf „nur bei mehreren Profilen" oder „gleich in den Plan"
- Im Kalender öffnet **Doppeltippen oder gedrückt halten** ein Tagesmenü: Termin,
  Hausaufgabe, Klausur, Notiz, Fehlzeit oder freier Tag. Bisher gab es dort nur
  den freien Tag
- Das Menü zeigt, was an dem Tag schon steht, und ob er als frei markiert ist

## v34

**Neu**
- **Sicherungsordner:** einmal einen Ordner wählen, danach legt die App ihre
  Sicherungen immer dort ab, ohne zu fragen. Das können nur Chrome und Edge
  auf dem Rechner; wo es fehlt, sagt die App das und erklärt den Weg über
  die Download-Einstellungen des Browsers
- **Automatisch sichern:** beim Öffnen von selbst in den Ordner schreiben,
  sobald es fällig ist. Ein kurzer Hinweis zeigt, dass es passiert ist
- **Rhythmus einstellbar:** erinnern alle 7, 14, 28 Tage, alle 3 Monate —
  oder gar nicht. Bisher waren es feste vier Wochen
- **Haltefrist:** im Sicherungsordner bleiben die letzten 1, 3, 6 oder 12
  Monate, ältere Sicherungen werden dort entfernt. Angefasst wird nur, was
  die App selbst geschrieben hat — fremde Dateien im Ordner bleiben liegen

**Geändert**
- Wann zuletzt gesichert wurde, gilt jetzt für das Gerät statt für ein
  einzelnes Profil. Eine Sicherung über alle Profile zählt für alle

## v33

**Behoben**
- Beim Wechsel auf den Einträge-Reiter erschien der rote Fehlerkasten
  („Cannot set properties of null"). In v32 war ein ungenutztes Element aus
  `index.html` verschwunden, auf das ältere Fassungen von `app.js` noch
  zugreifen. Traf ein neues `index.html` auf ein altes `app.js` — was der
  Browser-Zwischenspeicher zehn Minuten lang zulässt —, brach die Ansicht ab.
  Das Element steht wieder, und der Service Worker holt seine Dateien jetzt
  ausdrücklich vom Netz, damit nie wieder zwei Fassungen zusammen im
  Zwischenspeicher landen

**Neu**
- Der Fehlerkasten hat einen Knopf *App neu laden*. Er leert die
  Zwischenspeicher und startet neu; die Daten bleiben unberührt. Bisher war
  der rote Kasten eine Sackgasse
- Die Prüfung bei jedem Push schlägt Alarm, wenn eine Kennung aus
  `index.html` verschwindet

## v32

**Behoben**
- Erinnerungen erscheinen jetzt auch auf Android. Sie liefen dort über einen Weg,
  den Chrome verbietet, und schlugen still fehl — der Tag galt trotzdem als gemeldet
- „Teilen" vermerkte eine Sicherung, auch wenn nur die Adresse der App geteilt wurde.
  Der Vermerk entsteht jetzt nur noch, wenn die Daten das Gerät wirklich verlassen haben
- Fächer werden im Plan groß gespeichert. „Ch" und „CH" galten als zwei Fächer:
  das Zeugnis zeigte beide, der Notenschnitt zerfiel. Bestehende Pläne werden beim
  Öffnen einmalig zusammengeführt
- Eingelesene Sicherungen werden geprüft, statt ungesehen übernommen zu werden.
  Eine fremde Datei konnte Text in die Oberfläche schleusen
- Der Speicherstand zählt wie der Browser in Zwei-Byte-Zeichen — er zeigte bisher
  die Hälfte, und der Speicher war schon bei angezeigten 2500 kB voll
- Kalender-Export: Ganztagstermine enden am Folgetag und lange Zeilen werden
  umgebrochen, wie es der ICS-Standard verlangt
- Wird das Stundenraster kürzer, fragt die App nach, statt den Unterricht am
  Tagesende kommentarlos zu löschen
- Zwei offene Tabs desselben Profils überschreiben sich nicht mehr gegenseitig
- Stundengebundene Ereignisse am Wochenende sind wieder sichtbar

**Neu**
- Erinnerung an die Sicherung steht in der Tagesansicht, nicht mehr nur in den
  Einstellungen — dort sah sie niemand, der nicht ohnehin gerade sicherte
- „Alle Profile sichern": eine Datei für das ganze Gerät statt eine je Profil
- A-Woche in die B-Woche kopieren (und umgekehrt) unter ⚙ → Wochenwechsel
- Warnung, bevor der Browserspeicher voll ist, statt erst danach
- Ereignisse wandern mit in den Kalender-Export
- Fach-Info über die Schnellauswahl erreichbar — bisher ging das nur durch
  langes Drücken und damit nicht mit Tastatur

**Geändert**
- Offline zuerst: die App startet aus ihrem Zwischenspeicher und erneuert im
  Hintergrund. Bei schlechtem Netz wartet sie nicht mehr auf den Zeitablauf
- Die Seite erlaubt sich selbst keine fremden Quellen mehr (Content-Security-Policy)

## v31

**Geändert**
- Fehlzeiten zählen Unterrichtsstunden statt Fächer; das Zeugnis rechnet sie in Tage um
- Wischen zum Ansichtswechsel funktioniert in jedem freien Bereich unterhalb des Inhalts

**Neu**
- Eigene freie Tage: Kalenderfeld gedrückt halten
- „Heute" im Kalender
- Reihenfolge der Einträge-Kacheln und der Fächer im Zeugnis einstellbar
- Suche findet Kürzel und ausgeschriebenen Namen gleichermaßen
- Stunden je Schultag einstellbar

## v30

**Neu**
- Profile: mehrere Datensätze auf einem Gerät, Auswahl im Vollbild beim Öffnen
- Merkblätter: beliebig viele je Fach, mit Datum, Uhrzeit und Bildern
- Fehlzeiten je Fach, im Zeugnis mitgezählt
- Suche über alle Einträge, Notizen, Merkblätter, Noten und Ereignisse
- Zielnoten-Rechner: was muss die nächste Arbeit bringen?
- Kalender-Export als .ics mit echten Erinnerungen
- Erinnerungen beim Öffnen: sonntags Wochenüberblick, am Tag vor einer Klausur
- Darstellung frei wählbar: Akzentfarbe als Hex, heller Modus, drei Schriftarten
- „Fällt aus" und „Vertretung" als Schnellaktionen, jeweils nur für einen Tag
- Countdown bis Schulschluss und bis zu den nächsten Ferien
- Teilen der Sicherung über das System-Teilen-Menü
- Sicherungserinnerung nach vier Wochen
- Verknüpfungen beim langen Druck aufs App-Icon

**Geändert**
- Der Eintragsknopf richtet seine Voreinstellung nach der aktuellen Ansicht
- Ein Fach ist nie vorausgewählt, außer beim Antippen einer Stunde
- Der Tagesplan endet nach der letzten belegten Stunde; Freistunden mittendrin bleiben
- Unterlisten schließen sich durch Wischen oder Tippen daneben, der Zurück-Knopf entfiel
- Merkblätter werden zuerst angesehen, nicht bearbeitet
- Einstellungen öffnen ohne Tastatur im Klassenfeld
- Gelöschte Ereignisse und Noten landen ebenfalls im Archiv
- Merkblätter aus früheren Fassungen werden automatisch übernommen

## v27–v29
- Vollbild-Profilauswahl, Merkblätter je Fach, Merkblatt in den Eintragsdialog verlagert

## v24–v26
- Zeugnis-Reiter, Verhältnis mündlich/schriftlich je Fach, sichtbare Fehleranzeige,
  Versionsabfrage beim laufenden Service Worker

## v20–v23
- Einmalige Ereignisse, Wochenend-Ereignisse, Einträge-Menü mit Unterlisten,
  Sicherung als Datei, feste A/B-Regel nach Kalenderwoche

## v10–v19
- Noten, Kalenderansicht, Archiv, Ferien und Feiertage nach Bundesland,
  Fach-Info beim langen Drücken, Import als Tabelle

## v1–v9
- Erste Fassung: Blockplan mit Uhrzeiten, Hausaufgaben, Klausuren, Notizen,
  A/B-Wochen, Wischen, Offline-Betrieb
