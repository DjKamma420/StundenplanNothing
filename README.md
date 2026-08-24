# Stundenplan

Ein Stundenplan fürs Handy, der zeigt, was viele Schulportale nicht zeigen: Uhrzeiten, alle Kurse in einer Ansicht, Hausaufgaben, Klausuren und Notizen.

Läuft als Web-App im Browser, lässt sich auf den Startbildschirm legen und funktioniert offline. Kein Server, kein Konto, keine Zugangsdaten. Alle Daten bleiben auf dem Gerät.

Nichts ist auf eine bestimmte Schule zugeschnitten. Fächer, Räume und Lehrkräfte entstehen allein aus dem, was du einträgst.

## Was sie kann

**Tag**
- Blöcke mit echten Uhrzeiten statt bloßer Stundennummern
- Fortschrittsbalken mit laufendem Fach und verbleibenden Minuten
- Wischen nach links oder rechts wechselt den Tag
- A- und B-Woche getrennt, für Pläne mit wechselnden Räumen im Zweiwochentakt
- Wochenendreiter, damit samstags nicht der Montag ausgewählt ist
- Ferien und Feiertage werden als solche angezeigt

**Stunde antippen**
- Normal: Hausaufgabe für die nächste Stunde dieses Fachs, Notiz für heute, oder Klausurtermin
- Mit ✎ im Kopf: Fach, Raum und Lehrkraft ändern

**Einträge**
- Getrennt nach Hausaufgaben, Klausuren und Notizen
- Jeder Eintrag mit Fach, Datum, Text und Notizfeld
- Bei der Datumsauswahl bekommt jeder Tag einen roten Punkt, an dem das gewählte Fach im Plan steht
- Archiv: Gelöschtes bleibt erst einmal erhalten und muss zum endgültigen Entfernen ein zweites Mal gelöscht werden

**Kalender**
- Monatsübersicht mit K, H und N in Rot
- Ferienzeiten hinterlegt
- Darunter die Einträge des angetippten Tages

## Einrichten

1. Auf GitHub ein **öffentliches** Repository anlegen.
2. Alle Dateien hochladen: `index.html`, `app.js`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → **Save**.
4. Nach ein bis zwei Minuten ist die Adresse erreichbar: `https://BENUTZERNAME.github.io/REPOSITORY/`
5. Öffnen und installieren:
   - **Android/Chrome:** Menü → *App installieren*
   - **iPhone/Safari:** Teilen → *Zum Home-Bildschirm*
   - **Desktop:** Installationssymbol in der Adressleiste

## Erste Schritte

1. **⚙ oben rechts** → Klasse eintragen und Stundenraster prüfen.
2. Wer wechselnde Wochen hat: *A- und B-Woche getrennt führen* anhaken und einmal **„Diese Woche ist A"** antippen. Danach rechnet die App selbst weiter.
3. Bundesland wählen und **Ferien laden** — Schulferien und Feiertage kommen dann automatisch in den Plan.
4. Plan füllen: **✎** antippen, dann jedes Feld ausfüllen. Oder in den Einstellungen **Plan einfügen** und eine kopierte Tabelle übernehmen.

## An eine andere Schule anpassen

Alles über **⚙ Einstellungen**, ohne Code:

**Stundenraster.** Eine Zeile pro Feld im Plan. Die Spalte *Std.* sagt, welche Stundennummern das Feld abdeckt — daran erkennt der Import die richtige Zeile.

| Std. | von | bis |
|---|---|---|
| 1,2 | 08:00 | 09:30 |
| 3,4 | 09:50 | 11:20 |

Wer keine Doppelstunden hat, trägt `1`, `2`, `3` … in einzelne Zeilen ein. Zwei Vorlagen sind hinterlegt: **4 Blöcke à 90 min** und **8 Einzelstunden**. Zeilen lassen sich hinzufügen und löschen, das Raster darf beliebig viele Felder haben.

**Wochenwechsel.** Wer keine A/B-Wochen hat, lässt den Haken einfach weg.

## Plan einfügen

Der Import erwartet je Zeile eine Stundennummer und darunter oder daneben eine Zelle im Format `FACH, RAUM (LEHRKRAFT)`:

```
1
CH, B005 (MUEL)
2
CH, B005 (MUEL)
3
MA, B006 (SCHM)
```

Achte darauf, in welcher Reihenfolge dein Schulportal die Zellen ausgibt. Viele Portale können zwischen Fach-, Raum- und Lehrkraftansicht umschalten — gebraucht wird die Ansicht, bei der **das Fach zuerst** steht. Steht in eckigen Klammern eine Klasse statt einer Lehrkraft, wird sie ersatzweise übernommen.

Wer ein abweichendes Format hat, ändert den Ausdruck in `app.js` in der Funktion `parseZelle`.

## Ferien und Feiertage

Kommen von [openholidaysapi.org](https://openholidaysapi.org), einem offenen Datenprojekt. Kein Schlüssel, keine Anmeldung. Geladen werden das laufende und das kommende Jahr, danach liegt alles lokal — die App braucht dafür kein Internet mehr.

## Warum kein automatischer Abruf vom Schulportal

Die App liegt auf `github.io`, das Portal auf einem anderen Server. Der Browser verbietet den Zugriff über Domaingrenzen hinweg — das ist die Same-Origin-Regel und lässt sich nicht wegprogrammieren. Nötig wäre ein Vermittler-Dienst oder ein Skript, das direkt auf der Portalseite läuft.

Praktisch fällt das kaum ins Gewicht: Ein Stundenplan gilt ein halbes Jahr. Zwei Wochen einmal eintragen deckt das gesamte Halbjahr ab, weil sich der Rhythmus wiederholt. Nur Vertretungen musst du weiter im Portal nachsehen.

## Ändern

Datei auf GitHub antippen → Stift → bearbeiten → **Commit changes**.

Danach in `sw.js` die Zeile `const VERSION = "v8"` hochzählen, sonst zeigt der Offline-Speicher weiter die alte Fassung.

## Daten

Alles liegt im `localStorage` des Browsers. Nichts wird übertragen, nichts außerhalb des Geräts gespeichert. Achtung: „Browserdaten löschen" löscht auch den Plan — vorher unter **⚙ → Sicherung** den Text kopieren und ablegen.
