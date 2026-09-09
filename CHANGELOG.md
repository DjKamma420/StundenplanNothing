# Änderungen

Die Versionsnummer steht in `sw.js` und ist die einzige Stelle, an der sie gepflegt wird.

## v46

Die Einstellungen waren über die letzten Fassungen auf **achtzehn
Überschriften und sechsundvierzig Bedienelemente in einer einzigen Rolle**
gewachsen. Sie sind jetzt zweistufig — dieselbe Form wie im Reiter
*Einträge*: erst ein Menü, dann ein Bereich.

**Neu**
- **Acht Bereiche** statt einer Liste: Darstellung · Schule und Stundenraster ·
  Noten und Zeugnis · Fehlzeiten und Archiv · Erinnerungen und Kalender ·
  Ferien und Feiertage · Fächer und Lehrkräfte · Sicherung und Speicher
- Jede Menükachel nennt darunter **ihren jetzigen Stand** („10b · 4 Stunden",
  „Archiv 90 Tage", „zuletzt vor 3 Tagen"). Das Meiste beantwortet sich damit,
  ohne den Bereich zu öffnen
- **‹ Alle Einstellungen** führt zurück. **Speichern** gilt weiterhin für
  alles zusammen, egal in welchem Bereich man steht — die Felder der anderen
  Bereiche bleiben im Dokument und werden mitgelesen
- Wer aus einem Bereich heraus *Plan einfügen* öffnet, landet beim Zurück
  wieder in **diesem** Bereich, nicht im Menü
- Wiederholt sich die erste innere Überschrift im Bereichstitel („Noten und
  Zeugnis" über „Noten"), entfällt sie beim Anzeigen
- Neuer Anleitungs-Abschnitt *Wie die Einstellungen aufgebaut sind*, und
  *Einrichten in zehn Minuten* führt jetzt durch die Bereiche
- `werkzeug/pruefungen/einstellungen.mjs` prüft die Struktur fest nach
  (34 Prüfungen)

**Wichtig für die Aktualisierung**
- Die Bereiche stehen in `index.html` **ohne** `hidden`; versteckt werden sie
  erst durch `app.js`. Nach einer Aktualisierung trifft kurzzeitig neues
  `index.html` auf altes `app.js` — wären sie in der Vorgabe versteckt,
  stünden die Einstellungen in diesem Moment leer da. So sieht man dort
  weiterhin die alte lange Liste. Eine Prüfung hält das fest

## v45

Nachtrag zu v43: die Trennung nach Lehrkraft war an mehreren Stellen nur
halb durchgezogen. Die Regel lautet jetzt — **wo die App etwas je Fach
anbietet, gibt es das bei eingeschalteter Trennung auch je Lehrkraft.**

**Behoben**
- **Der Schnitt je Lehrkraft war mit dem falschen Verhältnis gerechnet.**
  Das Zeugnis zeigte seit v43 einen eigenen Schnitt je Lehrkraft, benutzte
  dafür aber das mündlich/schriftlich-Verhältnis des ganzen Fachs. Wer zwei
  Kurse trennt, tut das oft genau deshalb, weil sie verschieden gewichten —
  die Zahl war damit für mindestens einen der beiden falsch

**Neu**
- **Verhältnis und Zielnote je Lehrkraft.** `anteilFuer` kennt drei Stufen:
  Wert der Lehrkraft in diesem Fach, sonst Wert des Fachs, sonst Standard.
  Erreichbar über die Unterzeile im Zeugnis (jetzt antippbar, nennt ihr
  eigenes Verhältnis), über einen eigenen Chip auf der Notenkarte und über
  eine eingerückte Zeile unter jedem Fach in ⚙ → *Verhältnis je Fach*.
  Der graue Wert im leeren Feld zeigt, welche Stufe gerade greift
- **Merkblätter** gliedern nach Fach *und* Lehrkraft, wie die Notizen seit v43
- **Fehlzeiten** teilen ihre Stunden je Kurs auf, nicht nur je Fach, und
  nennen die Lehrkraft in der Zeile
- `werkzeug/pruefungen/lehreroptionen.mjs` prüft die Regel fest nach: die
  drei Stufen einzeln, ihre Wirkung auf den Schnitt, beide Klickwege in den
  Dialog, dass „Standard" nur die eigene Stufe zurücknimmt, die Einstellungen,
  die Gliederung der Merkblätter und die Aufteilung der Fehlzeiten — jeweils
  auch der Nachweis, dass ohne die Einstellung alles beim Alten bleibt

## v44

Fünf Lücken aus der Bestandsaufnahme nach v43. Der sechste Punkt von damals —
Samstagsunterricht — bleibt bewusst offen.

**Neu**
- **Wochenansicht.** In der Tagesansicht neben der Kalenderwoche der Knopf
  *Woche*: Zeilen sind Stunden, Spalten Montag bis Freitag. Heute
  hervorgehoben, Ausfall durchgestrichen, Ferien schraffiert und benannt,
  Marken für anstehende Klausuren und offene Hausaufgaben. ‹ › und die
  Pfeiltasten blättern wochenweise, Antippen springt auf den Tag.
  Bewusst ein Dialog und kein fünfter Reiter: bei 390px ist die Reiterleiste
  mit vier Beschriftungen bereits randvoll (226px)
- **Stundenplan als .ics.** Neben dem bisherigen Termine-Export ein zweiter
  für den Unterricht selbst: je Stunde ein Serientermin über ein Jahr, Raum
  als Ort, Lehrkraft in der Beschreibung, bei A/B-Wochen `INTERVAL=2`.
  Ferien und freie Tage fallen als `EXDATE` heraus — sonst behauptete der
  Kalender Unterricht in den Sommerferien. Zwei Dateien, weil daraus im
  Handykalender zwei Kalender werden, die man einzeln ausblenden kann
- **Wiederkehrende Einträge.** Bei Hausaufgabe, Klausur, Notiz und Ereignis
  eine Wiederholung wöchentlich oder zweiwöchentlich mit Enddatum; darunter
  steht, wie viele Termine daraus werden. Beim Speichern entstehen **echte
  einzelne Einträge** mit gemeinsamer Reihen-Kennung, keine Regel, die
  Termine erzeugt. Damit lässt sich jeder Termin einzeln abhaken — der
  eigentliche Zweck — und Suche, Kalender, Archiv und Export brauchen keine
  Sonderbehandlung. Löschen fragt: nur dieser oder die ganze Reihe
- **Nur den Stundenplan teilen.** Der Knopf *Teilen* gab bisher immer die
  vollständige Sicherung weiter — mit Noten, Fehlzeiten und Merkblattfotos.
  Wer einem Mitschüler „seinen Stundenplan" schickte, verschenkte all das
  mit. Jetzt gibt es daneben ein Paket, das nur Raster, Fächer, Räume und
  Lehrkräfte enthält. Beim Einlesen erkennt die App es und ersetzt **nur**
  den Plan; Einträge, Noten und sämtliche übrigen Einstellungen bleiben
  stehen, fremde Fach- und Lehrernamen kommen dazu, eigene behalten Vorrang
- **Fehlzeiten kennen ihr Fach.** Kommt die Fehlzeit aus einer angetippten
  Stunde, steht das Fach schon da; die Liste zeigt es, und darüber steht die
  Aufteilung je Fach. Am Zeugnis ändert das nichts — dort zählen weiterhin
  nur Unterrichtsstunden
- **Pfeiltasten am Rechner.** ← → blättern: Tagesansicht tageweise, Kalender
  monatsweise, Wochenraster wochenweise. `/` springt in die Suche. Solange
  ein Feld beschrieben wird oder die Profilauswahl offen ist, bleiben sie still
- `werkzeug/pruefungen/v44.mjs` prüft alles davon fest nach (51 Prüfungen)

**Aufgeräumt**
- Der `.ics`-Maskierer stand zweimal wortgleich da; jetzt einmal als `icsRoh`
- Teilen, Zwischenablage und Herunterladen liegen in `weitergeben()`, das
  beide Wege bedient. Nur eine vollständige Sicherung setzt dabei die
  Sicherungserinnerung zurück — ein geteilter Plan rettet nichts

## v43

**Neu**
- **Fächer nach Lehrkraft trennen** (⚙ → Lehrkräfte, standardmäßig aus).
  Wer dasselbe Fach bei zwei Lehrkräften hat, arbeitete bisher mit einem
  Topf für beide Kurse. Mit dem Haken:
  - „Als Nächstes" sucht die nächste Stunde desselben Fachs **bei derselben
    Lehrkraft** — im Schnelldialog, in der Fach-Info und bei den roten
    Punkten der Datumsauswahl
  - Einträge und Noten bekommen ein Feld *Lehrkraft*, aus der angetippten
    Stunde vorbelegt
  - Das Zeugnis zeigt unter betroffenen Fächern je Lehrkraft einen eigenen
    Schnitt; die Zeile des Fachs bleibt und rechnet weiter über alles
  - Die Notizen bekommen Zwischenüberschriften je Lehrkraft
  - Die Fach-Info zählt die Wochenstunden nur noch für diese Lehrkraft
- `werkzeug/pruefungen/lehrer.mjs` prüft beides fest nach

**Einheitlich**
- Der **Stift ✎ steht jetzt in jeder Ansicht an derselben Stelle** im Kopf,
  links neben Profil und ⚙. Bisher saß der Plan-Stift oben, der Sortier-Stift
  der Einträge dagegen neben dem Suchfeld. Beide teilen sich denselben Platz;
  sichtbar ist nie mehr als einer, und der Platz bleibt auch leer bestehen,
  damit die Reiterleiste nicht springt
- Beide Stifte verhalten sich gleich: `aria-pressed` und der Hinweis werden
  beim Zeichnen gesetzt statt im Klick, und beide Hinweise enden mit
  demselben Satz („Nochmal auf ✎ oben tippen, wenn du fertig bist.")
- Neuer Anleitungs-Abschnitt *Das Einträge-Menü umsortieren* — das Sortieren
  der Kacheln war bisher nirgends beschrieben. Der Stiftplatz steht jetzt
  auch bei *Die vier Reiter*
- `werkzeug/pruefungen/kopf.mjs` prüft den Kopf fest nach

**Behoben**
- Der Schultag endete rechnerisch immer am Ende des **Stundenrasters**,
  nicht am Ende des eigenen Unterrichts. „Schulschluss in …" nannte damit
  an einem kurzen Tag eine Zeit, zu der man längst zu Hause war, und der
  Fortschrittsbalken meldete danach „Freistunde" statt „Schule aus". Der
  Tagesplan schnitt leere Stunden am Ende schon richtig ab — jetzt rechnen
  Balken und Countdown mit demselben letzten belegten Block. An einem Tag
  ganz ohne Unterricht verschwindet der Balken
- Die Suche prüfte das **Fachkürzel** gegen die Tabelle der Lehrkräfte
  (`lehrerName(o.fach)`) — dabei kam nie etwas heraus. Jetzt wird die
  Lehrkraft des Eintrags gesucht, mit Kürzel und ausgeschriebenem Namen
- Im **Sortiermodus** der Einträge-Kacheln zerfiel das Layout: die Pfeile
  erbten von `.stapel button` die Kachelform und wurden selbst zu Kacheln,
  während die echte Kachel daneben auf ihre Textbreite schrumpfte — bei
  jeder Zeile auf eine andere. Die Reihe heißt jetzt `.kachelreihe` mit
  eigenen Regeln; `.reihe` war schon die Knopfzeile der Dialoge und machte
  aus jeder Kachel zusätzlich eine Versalienschaltfläche

## v42

Gefunden durch einen Backtest über den ganzen Code (Angriffsflächen und
mehrere Nutzerprofile: alt, jung, Tastatur-only, Screenreader-nah).
Sicherheit war bereits sauber — nur `werkzeug/pruefungen/angriff.mjs` neu
dazugekommen, um das auch künftig automatisch zu prüfen. Drei echte Fehler
gefunden und behoben:

**Behoben**
- Dreifaches schnelles Tippen auf „Speichern" im Eintragsdialog konnte
  denselben Eintrag mehrfach anlegen. Die Sperre war nur eine bloße
  `disabled`-Markierung ohne Zeitrückstellung; sie blieb außerdem stehen,
  wenn kurz danach ein neuer Dialog geöffnet wurde, und blockierte dort
  jedes Tippen. Jetzt eine benannte, löschbare Sperre, die beim Öffnen
  jedes Eintrags-, Ereignis- und Notendialogs zurückgesetzt wird
- Ein sehr langer Titel (getestet: 5000 Zeichen) lief in Listen seitlich
  über den Bildschirm hinaus. `overflow-wrap:break-word` allein reichte
  nicht — als Flex-Kind hatte `.titel` weiterhin `min-width:auto` und
  durfte dadurch nicht unter seine Inhaltsbreite schrumpfen. Jetzt mit
  `min-width:0`
- Regression aus v41: Der Monatstitel im Kalender saß am Rechner (1280px)
  13px neben der Mitte. Ursache war `.monat{grid-template-columns:1fr auto
  1fr}` — bei ungleich breiten Nachbarspalten zieht `1fr` (= `minmax(auto,
  1fr)`) nicht gleich. Jetzt `minmax(0,1fr) auto minmax(0,1fr)`, wie schon
  an anderer Stelle in v36

**Neu**
- `werkzeug/pruefungen/angriff.mjs` (Angriffsflächen: XSS über jedes Feld,
  bösartige Sicherung, Prototype-Pollution, URL-Parameter-Whitelist,
  ICS-Injektion) und `werkzeug/pruefungen/personas.mjs` (Tap-Ziele,
  Kontrast, Tastaturbedienung, Mehrfachtippen, lange Titel, Emoji, 500
  Einträge, Abbrechen-Rückfrage) als feste Prüfungen

## v41

**Sicherheit**
- Zeitwerte und Stundennummern aus dem Rastereditor wurden ungeschützt in
  HTML eingesetzt. Ein Eintrag wie `<b>` in der Spalte „Std." hätte das
  Markup zerlegt. Alle Einsetzungen laufen jetzt durch `esc()`
- Der Prüf-Workflow bekommt ausdrücklich nur Leserechte

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
