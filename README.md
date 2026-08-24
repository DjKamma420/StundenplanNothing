# Stundenplan

Ein Stundenplan fürs Handy, der zeigt, was viele Schulportale nicht zeigen: Uhrzeiten, alle Kurse in einer Ansicht, Hausaufgaben, Klausuren und Notizen.

Läuft als Web-App im Browser, lässt sich auf den Startbildschirm legen und funktioniert offline. Kein Server, kein Konto, keine Zugangsdaten. Alle Daten bleiben auf dem Gerät.

Nichts ist auf eine bestimmte Schule zugeschnitten. Fächer, Räume und Lehrkräfte entstehen allein aus dem, was du einträgst.

## Was sie kann

**Tag**
- Blöcke mit echten Uhrzeiten statt bloßer Stundennummern
- Fortschrittsbalken der **laufenden Stunde** mit Fach, Raum und verbleibenden Minuten
- In der Pause ein eigener Balken mit Countdown bis zur nächsten Stunde
- Laufende Stunde rot hervorgehoben; außerhalb des Unterrichts markiert eine rote Linie die aktuelle Stelle im Plan
- Wischen nach links oder rechts wechselt den Tag
- A- und B-Woche getrennt, für Pläne mit wechselnden Räumen im Zweiwochentakt
- Einmalige Ereignisse für Projektarbeit, Vortrag oder Ausflug — in freien Stunden, als Ersatz einer belegten Stunde oder für einen ganzen Tag, auch am Wochenende
- Wochenendreiter, damit samstags nicht der Montag ausgewählt ist
- Ferien und Feiertage werden als solche angezeigt

**Stunde antippen**
- Belegte Stunde: Hausaufgabe für die nächste Stunde dieses Fachs, Notiz für heute, Klausurtermin oder Stunde einmalig ersetzen
- Freie Stunde: einmaliges Ereignis nur für diesen Tag
- **Gedrückt halten**: Fach-Info mit ausgeschriebenem Namen, Lehrkraft, Wochenstunden, nächsten Terminen, Notenschnitt und Offenem
- Mit ✎ im Kopf: Fach, Raum und Lehrkraft dauerhaft ändern

**Profile**
- Mehrere Profile auf einem Gerät, wie bei Streamingdiensten
- Jedes Profil hat eigenen Plan, eigene Einträge, eigene Noten und eigene Einstellungen — nichts wird geteilt
- Beim Öffnen erscheint eine Auswahl im Vollbild, sobald es mehr als ein Profil gibt — Kacheln mit Punktraster und Initial
- Jederzeit erreichbar über den Buchstaben oben rechts
- Unter „Verwalten" lassen sich Profile anlegen, umbenennen und samt Daten löschen

**Noten und Zeugnis**
- Noten je Fach, getrennt nach mündlich und schriftlich, mit Feld für „wofür" und Notizen
- Das Verhältnis mündlich zu schriftlich lässt sich **je Fach einzeln** einstellen, mit einem Standardwert für den Rest
- Umschaltbar zwischen Noten 1–6 und Punkten 0–15
- Noten legst du über denselben Knopf an wie alles andere
- Eigener Zeugnis-Reiter mit dem Stand aller Fächer, gerundeter Zeugnisnote und Gesamtschnitt — auch ohne eingetragene Noten sichtbar

**Merkblätter**
- Ein freier Textbereich je Fach — Formeln, Regeln, Vokabeln, Laborvorschriften
- Zeilenumbrüche und Einrückungen bleiben erhalten, Darstellung in Monospace
- Erreichbar über die Fach-Info (Stunde gedrückt halten) oder den Einträge-Reiter
- Eine Vorschau steht direkt in der Fach-Info

**Einträge**
- Getrennt nach Hausaufgaben, Klausuren und Notizen
- Jeder Eintrag mit Fach, Datum, Text und Notizfeld
- Bei der Datumsauswahl bekommt jeder Tag einen roten Punkt, an dem das gewählte Fach im Plan steht
- Archiv: Gelöschtes bleibt erst einmal erhalten — Einträge, Ereignisse und Noten gleichermaßen — und muss zum endgültigen Entfernen ein zweites Mal gelöscht werden
- Abgehakte Hausaufgaben und Klausuren wandern nach sieben Tagen von selbst ins Archiv, Notizen bleiben stehen

**Kalender**
- Monatsübersicht mit K, H und N in Rot
- Wischen blättert durch die Monate
- Ferienzeiten hinterlegt
- Darunter die Einträge des angetippten Tages

**Zwischen den Ansichten**
- Wischen im Bereich unter dem Eintragsknopf wechselt zwischen Tag, Kalender, Einträgen und Zeugnis
- Die vier Punkte zeigen, wo du gerade bist, und lassen sich auch antippen
- Steht eine Unterliste offen, führt der erste Wisch zurück ins Menü
- Der Eintragsknopf steht fest am unteren Rand und wandert nicht mit dem Inhalt
- In Einstellungen und Profilen wischt du zum Schließen; aus den Einstellungen geöffnete Dialoge kehren dorthin zurück

## Was du brauchst

Nichts außer einem Browser und einem GitHub-Konto. Kein Server, kein Geld, kein Programm auf dem Rechner. Im Einzelnen:

| | |
|---|---|
| **Gerät** | Handy, Tablet oder Rechner. Android, iOS, Windows, Mac, Linux — die App läuft im Browser. |
| **Browser** | Chrome, Edge, Firefox, Safari, jeweils aktuell. Für die Installation auf dem Startbildschirm: Chrome auf Android, Safari auf iOS. |
| **GitHub-Konto** | Kostenlos, um die Dateien abzulegen und über GitHub Pages auszuliefern. Wer schon eine eigene Webadresse hat, kann die Dateien auch dort hinlegen. |
| **Internet** | Beim Einrichten und für das Laden der Ferientermine. Danach läuft die App offline. |
| **Deinen Stundenplan** | Auf Papier oder als kopierbare Tabelle aus dem Schulportal. Zwei Wochen reichen für ein ganzes Halbjahr. |

Nicht nötig: Programmierkenntnisse, ein Editor, Node.js, ein Build-Vorgang, ein Konto bei der App, eine Datenbank.

Das Einrichten dauert etwa zehn Minuten, das Eintragen des Plans noch einmal so lange.

## Einrichten

https://djkamma420.github.io/StundenplanNothing/ Öffnen und installieren:
   - **Android/Chrome:** Menü → *App installieren*
   - **iPhone/Safari:** Teilen → *Zum Home-Bildschirm*
   - **Desktop:** Installationssymbol in der Adressleiste

## Erste Schritte

1. **⚙ oben rechts** → Klasse eintragen und Stundenraster prüfen.
   Der Buchstabe daneben führt zu den Profilen.
2. Wer wechselnde Wochen hat: *A- und B-Woche getrennt führen* anhaken. Welche Woche welche ist, steht fest: **ungerade Kalenderwoche = A, gerade = B**.
3. Bundesland wählen und **Ferien laden** — Schulferien und Feiertage kommen dann automatisch in den Plan.
   Ebenfalls dort: das Verhältnis mündlich zu schriftlich, allgemein und je Fach.
4. Plan füllen: **✎** antippen, dann jedes Feld ausfüllen. Oder in den Einstellungen **Plan einfügen** und eine kopierte Tabelle übernehmen.

## Namen statt Kürzel

Unter **⚙ → Lehrkräfte** und **⚙ → Fachnamen** trägst du je Zeile ein Kürzel und den Namen ein:

```
WZET = Frau Wietzet
CH = Chemie
```

Der Plan zeigt weiter die kurzen Kürzel — sonst passt er nicht auf den Bildschirm. Die ausgeschriebenen Namen erscheinen in der Fach-Info und im Zeugnis.

## An eine andere Schule anpassen

Alles über **⚙ Einstellungen**, ohne Code:

**Stundenraster.** Eine Zeile pro Feld im Plan. Die Spalte *Std.* sagt, welche Stundennummern das Feld abdeckt — daran erkennt der Import die richtige Zeile.

| Std. | von | bis |
|---|---|---|
| 1,2 | 08:00 | 09:30 |
| 3,4 | 09:50 | 11:20 |

Wer keine Doppelstunden hat, trägt `1`, `2`, `3` … in einzelne Zeilen ein. Zwei Vorlagen sind hinterlegt: **4 Blöcke à 90 min** und **8 Einzelstunden**. Zeilen lassen sich hinzufügen und löschen, das Raster darf beliebig viele Felder haben.

**Wochenwechsel.** Wer keine A/B-Wochen hat, lässt den Haken einfach weg. Ist er gesetzt, gilt: ungerade Kalenderwoche = A, gerade = B. Trage deinen Plan entsprechend ein — die App zeigt dir in den Einstellungen, welche Woche gerade läuft.

## Plan einfügen

Unter **⚙ → Stundenplan → Plan einfügen**. Dort steht eine Tabelle mit einer Zeile je Feld deines Rasters: Fach, Raum, Lehrkraft. Tag und Woche oben wählen, ausfüllen, speichern. Bereits eingetragene Stunden stehen schon drin und lassen sich überschreiben.

Wer die Daten aus einem Schulportal hat, klappt **„Aus der Zwischenablage füllen"** auf und fügt die kopierte Tabelle ein. Erwartet wird je Stunde eine Zeile im Format `FACH, RAUM (LEHRKRAFT)`:

```
1
CH, B005 (MUEL)
2
CH, B005 (MUEL)
3
MA, B006 (SCHM)
```

Der Text landet zunächst nur in der Tabelle — erst nach dem Prüfen speicherst du.

Achte darauf, in welcher Reihenfolge dein Schulportal die Zellen ausgibt. Viele Portale können zwischen Fach-, Raum- und Lehrkraftansicht umschalten — gebraucht wird die Ansicht, bei der **das Fach zuerst** steht. Steht in eckigen Klammern eine Klasse statt einer Lehrkraft, wird sie ersatzweise übernommen.

Wer ein abweichendes Format hat, ändert den Ausdruck in `app.js` in der Funktion `parseZelle`.

## Ferien und Feiertage

Kommen von [openholidaysapi.org](https://openholidaysapi.org), einem offenen Datenprojekt. Kein Schlüssel, keine Anmeldung. Geladen werden das laufende und das kommende Jahr, danach liegt alles lokal — die App braucht dafür kein Internet mehr.

## Warum kein automatischer Abruf vom Schulportal

Die App liegt auf `github.io`, das Portal auf einem anderen Server. Der Browser verbietet den Zugriff über Domaingrenzen hinweg — das ist die Same-Origin-Regel und lässt sich nicht wegprogrammieren. Nötig wäre ein Vermittler-Dienst oder ein Skript, das direkt auf der Portalseite läuft.

Praktisch fällt das kaum ins Gewicht: Ein Stundenplan gilt ein halbes Jahr. Zwei Wochen einmal eintragen deckt das gesamte Halbjahr ab, weil sich der Rhythmus wiederholt. Nur Vertretungen musst du weiter im Portal nachsehen.


## Daten
‼️WICHTIG‼️
Alles liegt im `localStorage` des Browsers. Nichts wird übertragen, nichts außerhalb des Geräts gespeichert. Achtung: „Browserdaten löschen" löscht auch den Plan — vorher unter **⚙ → Sicherung** entweder den Text kopieren oder **Als Datei sichern** antippen. Zurück geht es über **Datei einlesen**.
