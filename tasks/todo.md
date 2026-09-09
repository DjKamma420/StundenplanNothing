# v44 — die fünf Lücken schliessen (ohne Samstag)

Ausgangspunkt ist die Bestandsaufnahme am Ende von v43. Punkt 6 (Samstag im
Plan) bleibt bewusst liegen.

## Reihenfolge

Klein und gut prüfbar zuerst, damit jeder Schritt einzeln nachweisbar ist.

- [x] **1. Fehlzeit weiss, welche Stunde gefehlt hat**
      `eintragSaeubern` erlaubt `fach`/`lk` auch bei Typ `F`; der Schnelldialog
      gibt das Fach der angetippten Stunde mit; der Eintragsdialog zeigt das
      Feld; Liste und Hinweis zeigen es. Das Zeugnis zählt weiter in Stunden —
      daran ändert sich nichts.

- [x] **2. Nur den Stundenplan teilen**
      Heute schickt „Teilen" die vollständige Sicherung: Noten, Fehlzeiten,
      Merkblattfotos. Neuer Knopf, der ein Paket `art:"plan"` baut — nur
      `slots`, `zweiWochen`, `fachnamen`, `lehrer` und `plan`.
      Beim Einlesen ein eigener Weg: nur diese Felder übernehmen, alles andere
      stehen lassen, und eine andere Rückfrage stellen. Ohne das ersetzt ein
      Plan-Paket über `paketSaeubern` die ganze `cfg`.

- [x] **3. Stundenplan als .ics**
      `icsBauen()` bleibt wie es ist (Termine). Daneben `icsPlanBauen()`:
      je belegter Stunde ein `VEVENT` mit `RRULE:FREQ=WEEKLY`, bei A/B-Wochen
      `INTERVAL=2` ab der passenden Woche. Ferien und Feiertage als `EXDATE`,
      sonst behauptet der Kalender Unterricht, den es nicht gibt.
      Zwei Knöpfe statt einem: getrennte Dateien werden zu getrennten
      Kalendern, die man einzeln ausblenden kann.

- [x] **4. Wiederkehrende Einträge**
      Bewusst **keine** virtuellen Vorkommen: beim Speichern entstehen echte
      Einträge, einer je Termin, mit gemeinsamer `serie`-Kennung. Damit
      funktionieren Abhaken, Suche, Kalender, Archiv und der ICS-Export ohne
      eine einzige Änderung an ihren Lesewegen, und jeder Termin lässt sich
      einzeln abhaken — was bei einem virtuellen Modell das eigentliche
      Problem wäre. Löschen fragt „nur diesen oder die ganze Reihe?".
      Deckel bei 60 Terminen, Zahl vorher anzeigen.

- [x] **5. Wochenansicht**
      Kein fünfter Reiter: bei 390px ist die Leiste mit vier Beschriftungen
      schon randvoll (226px), ein fünfter Knopf bricht sie. Stattdessen ein
      Dialog, geöffnet über einen Knopf in der KW-Zeile der Tagesansicht —
      dieselbe Art, wie die App sonst Dichtes zeigt (Fach-Info, Merkblatt).
      Raster: Zeilen = Stunden, Spalten = MO–FR, heute hervorgehoben,
      Ausfall/Vertretung/Ferien sichtbar, Marken für Klausuren und
      Hausaufgaben. Antippen springt auf den Tag. Querlauf **im Dialog**,
      nie auf der Seite.

- [x] **6. Pfeiltasten am Rechner**
      ← → blättern: Tagesansicht tageweise, Kalender monatsweise, Wochendialog
      wochenweise. Nicht, während ein Feld den Fokus hat oder ein anderer
      Dialog offen ist. `/` springt in die Suche.

- [x] **7. Anleitung, CHANGELOG, README, `sw.js` auf v44, alle Prüfungen**

## Ergebnis

Alle sechs Punkte umgesetzt, `sw.js` auf v44.

**Die Entscheidung, auf die es ankam** — wiederkehrende Einträge. Der
naheliegende Weg wäre eine Regel am Eintrag gewesen, aus der die Ansichten
bei Bedarf Termine erzeugen. Daran scheitert aber genau das, wofür man die
Wiederholung will: `erledigt` ist ein Feld am Datensatz, also hätte das
Abhaken eines Freitags alle Freitage abgehakt. Ausserdem hätte jeder
Leseweg — Tagesplan, Kalenderpunkte, Listen, Suche, Archiv, ICS — die
virtuellen Vorkommen selbst auffalten müssen. Stattdessen entstehen beim
Speichern echte Einträge mit gemeinsamer `serie`-Kennung: mehr Speicher
(60 Termine ≈ 9 kB), dafür null Änderungen an den Lesewegen und ein
Abhaken, das sich richtig verhält. Die Kennung braucht es nur für die
Rückfrage beim Löschen.

**Die Entscheidung, die Arbeit gespart hat** — die Wochenansicht ist ein
Dialog. Ein fünfter Reiter hätte die Leiste gesprengt (226px, vier
Beschriftungen, „EINTRÄGE" allein misst schon rund 50px) und hätte
Wischgesten, Wischpunkte und `ANSICHTEN` mitgezogen. Als Dialog kostet sie
einen Knopf in der KW-Zeile und nichts sonst.

**Beim Bauen aufgefallen und mitgenommen**

| Fund | Behandlung |
|---|---|
| `.ics`-Maskierer stand zweimal wortgleich da | einmal als `icsRoh` |
| Teilen-Ablauf war an die Sicherung genagelt | `weitergeben()` bedient beide Wege; nur die volle Sicherung setzt die Erinnerung zurück |
| Ein Plan-Paket wäre über `paketSaeubern` gelaufen und hätte die ganze `cfg` ersetzt — Farbe, Notensystem, Verhältnisse | eigener Weg `planUebernehmen()` mit eigener Rückfrage |
| Die Profilauswahl ist kein `<dialog>`, verdeckt aber alles | Pfeiltasten prüfen sie ausdrücklich |
| Die Freitagsspalte lief im Wochenraster aus dem Dialog | kein `min-width`, schmalere Zeitspalte — passt bei 390px |
| „jede zweite Woche" wurde in der Auswahl abgeschnitten | die zwei Felder stehen untereinander statt nebeneinander |

**Zwei Fehlschläge in der eigenen Prüfdatei** waren die Prüfung, nicht die
App: die Ferien lagen an einem festen Datum in der Vergangenheit, der
Export blickt aber vom heutigen Tag ein Jahr voraus. Die Testdaten rechnen
jetzt relativ zu heute.

**Nachweis.** `werkzeug/pruefungen/v44.mjs`, 51 Prüfungen: Fach an der
Fehlzeit vom Antippen bis in den Speicher, Inhalt des Plan-Pakets (dass
Noten und Einträge *nicht* darin sind) und sein Einlesen ohne Kollateral-
schaden, Aufbau des Plan-ICS samt `EXDATE` in der Ferienspanne und
`INTERVAL=2` bei A/B, Anlegen und einzelnes Abhaken einer Reihe, das
Löschen der ganzen Reihe, Aufbau des Wochenrasters mit Ferien und
Blättern, sowie die Pfeiltasten inklusive der Stille im Eingabefeld.
Alle neun Prüfdateien: 199 Prüfungen, 0 Fehler.


---

# v45 — Lehrer-Optionen überall dort, wo es Fach-Optionen gibt

## Plan

- [x] 1. Alle Stellen durchgehen, an denen die App etwas je Fach anbietet
      oder gliedert, und die Lücken auflisten.
- [x] 2. Verhältnis und Zielnote je Lehrkraft (`cfg.anteileLk`).
- [x] 3. Merkblätter und Fehlzeiten nachziehen.
- [x] 4. Anleitung, Prüfdatei, v45.

## Ergebnis

**Die Bestandsaufnahme** — je Fach gibt es: den Eintragsdialog (hatte die
Lehrkraft schon), das Zeugnis (Unterzeilen seit v43), die Notizen (seit
v43), die Suche und die Datumspunkte (seit v43) — und ohne Lehrkraft-Ebene:
**Verhältnis/Zielnote**, **Merkblätter**, **Fehlzeiten**.

**Der eigentliche Fund war kein fehlender Knopf, sondern eine falsche
Zahl.** Das Zeugnis rechnete den Schnitt je Lehrkraft mit dem Verhältnis
des Fachs. Wer zwei Kurse trennt, tut das häufig, weil sie verschieden
gewichten — dann war die Unterzeile für mindestens einen der beiden falsch.
Ohne die Lehrkraft-Option gab es gar keine Möglichkeit, das richtigzustellen.

**Die Form der Lösung** — drei Stufen mit Rückfall, kein viertes Konzept:

    anteileLk["MA/MÜ"]  →  anteile["MA"]  →  anteilM

Eigene Map statt zusammengesetzter Schlüssel in `cfg.anteile`: dort hätten
„MA" und „MA/MÜ" nebeneinander gelegen und jede Schleife über die Fächer
hätte sie auseinanderhalten müssen. Der Säuberer nimmt nur Schlüssel aus
genau zwei Kürzeln.

**Sichtbar wird die Stufe im leeren Feld:** der Platzhalter einer
Lehrkraft-Zeile ist der Wert des Fachs, nicht der Standard. So sieht man
ohne Nachdenken, was gerade gilt.

**Ein Fehlschlag in `lehrer.mjs`** war die Prüfung, nicht die App: sie las
den Namen der Unterzeile über `textContent` und bekam seit v45 das
Verhältnis mit dazu. Sie liest jetzt den ersten Textknoten.

**Nachweis.** `werkzeug/pruefungen/lehreroptionen.mjs`, 25 Prüfungen.
Alle zehn Prüfdateien: 224 Prüfungen, 0 Fehler.


---

# v46 — Struktur für die Einstellungen

## Ergebnis

**Der Befund:** 18 Überschriften, 46 Bedienelemente, 220 Zeilen Markup in
einer Rolle. Gewachsen ist das über v43 bis v45.

**Die Form ist nicht neu erfunden**, sondern aus dem Reiter *Einträge*
übernommen: Menü mit Stand je Kachel, dann der Bereich, dazu ein Weg
zurück. Wer die eine Stelle kennt, kennt die andere.

**Die Falle, die es zu umgehen galt** — die Bereiche in `index.html` mit
`hidden` zu markieren wäre naheliegend gewesen und hätte genau den Absturz
aus v32 wiederholt: nach einer Aktualisierung trifft kurzzeitig neues
`index.html` auf altes `app.js`, und das kennt `einstZeigen` nicht. Die
Einstellungen wären in diesem Moment leer gewesen. Sie stehen deshalb
sichtbar in der Vorgabe; versteckt wird erst zur Laufzeit. Eine Prüfung
liest `index.html` roh und hält das fest.

**Beim Prüfen aufgefallen:** fünf bestehende Prüfdateien fielen aus, weil
sie `#sDaten`, `#sNachLehrer` oder `#sReset` direkt nach dem Öffnen
befüllten — Felder, die jetzt in einem geschlossenen Bereich liegen. Das
war kein Testproblem, sondern der Beweis, dass sich der Weg für einen
Menschen geändert hat: die Prüfungen gehen jetzt erst in den Bereich. Aus
demselben Fund entstand die Rückkehr in den Ausgangsbereich nach *Plan
einfügen* — vorher wäre man dort im Menü gelandet.

**Nachweis.** `werkzeug/pruefungen/einstellungen.mjs`, 34 Prüfungen: dass
kein Bedienelement ausserhalb eines Bereichs liegt, dass die Vorgabe
sichtbar ist, Menü und Stand je Kachel, jeder Bereich einzeln offen und
nicht leer, Speichern über zwei Bereiche hinweg, die Rückkehr aus dem
Import und der Rückfall bei unbekanntem Bereichsnamen.
Alle elf Prüfdateien: 255 Prüfungen, 0 Fehler.
