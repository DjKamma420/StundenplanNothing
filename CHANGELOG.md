# Änderungen

Die Versionsnummer steht in `sw.js` und ist die einzige Stelle, an der sie gepflegt wird.

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
