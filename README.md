# Stundenplan

Ein Stundenplan fürs Handy, der zeigt, was der offizielle Plan nicht zeigt: Uhrzeiten, alle Kurse in einer Ansicht, Hausaufgaben, Klausuren und Notizen.

Läuft als Web-App im Browser, lässt sich auf den Startbildschirm legen und funktioniert offline. Kein Server, kein Konto, keine Zugangsdaten. Alle Daten bleiben auf dem Gerät.

## Was sie kann

- **Tagesansicht** mit echten Uhrzeiten statt bloßer Stundennummern
- **Tagesfortschritt** — Balken, laufendes Fach und verbleibende Minuten
- **A- und B-Woche** getrennt, für Pläne mit wechselnden Räumen im Zweiwochentakt
- **Ein Plan für mehrere Klassen** — du bestimmst selbst, was in welchem Feld steht
- **Hausaufgaben, Klausuren, Notizen** mit Fach, Datum, Text und Notizfeld
- **K / H / N** in Rot am Tag, am Fach und im Kalender
- **Kalender** mit Monatsübersicht und Liste dessen, was als Nächstes ansteht
- **Wochenendreiter**, damit samstags nicht der Montag ausgewählt ist
- **Import** aus dem virtuellen Stundenplan per Kopieren und Einfügen
- **Sicherung** als Text zum Kopieren und Zurückspielen

## Einrichten

1. Auf GitHub ein **öffentliches** Repository anlegen.
2. Alle Dateien hochladen: `index.html`, `app.js`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → **Save**.
4. Nach ein bis zwei Minuten ist die Adresse erreichbar: `https://BENUTZERNAME.github.io/REPOSITORY/`
5. Im Browser öffnen, Menü → **App installieren**.

## Erste Schritte

1. **⚙ oben rechts** → Klasse eintragen, Stundenraster prüfen, A/B-Woche einstellen.
2. Steht der Wochenwechsel an, einmal **„Diese Woche ist A"** oder **„… ist B"** antippen. Danach rechnet die App selbst weiter.
3. Plan füllen: Feld antippen und Fach, Raum, Lehrkraft eintragen — oder **Plan einfügen** und die kopierte Tabelle übernehmen.
4. Bei zwei Wochen beide Wochen einmal durchgehen. Mit **›** wechselst du zur nächsten Woche.

## An eine andere Schule anpassen

Alles über **⚙ Einstellungen**, ohne Code:

**Stundenraster.** Eine Zeile pro Feld im Plan. Die Spalte *Std.* sagt, welche Stundennummern das Feld abdeckt — daran erkennt der Import die richtige Zeile.

| Std. | von | bis |
|---|---|---|
| 1,2 | 08:10 | 09:40 |
| 3,4 | 10:00 | 11:30 |

Wer keine Doppelstunden hat, trägt `1`, `2`, `3` … in einzelne Zeilen ein. Zwei Vorlagen sind hinterlegt: **4 Blöcke à 90 min** und **8 Einzelstunden**. Zeilen lassen sich hinzufügen und löschen, das Raster darf beliebig viele Felder haben.

**Wochenwechsel.** Wer keine A/B-Wochen hat, schaltet sie einfach ab.

Für abweichende Zellformate im Import: Der Ausdruck steht in `app.js` in der Funktion `parseZelle`. Erkannt werden `FACH, RAUM (LEHRER)` und `FACH, RAUM [KLASSE]`.

## Warum kein automatischer Abruf

Die App liegt auf `github.io`, der Stundenplan auf einem anderen Server. Der Browser verbietet den Zugriff über Domaingrenzen hinweg — das ist die Same-Origin-Regel und lässt sich nicht wegprogrammieren. Nötig wäre entweder ein Vermittler-Dienst oder ein Skript, das direkt auf der Schulseite läuft.

Praktisch fällt das kaum ins Gewicht: Ein Stundenplan gilt ein halbes Jahr. Zwei Wochen einmal eintragen deckt das gesamte Halbjahr ab, weil sich der Rhythmus wiederholt. Nur Vertretungen musst du weiter auf der Schulseite nachsehen.

## Ändern

Datei auf GitHub antippen → Stift → bearbeiten → **Commit changes**.

Danach in `sw.js` die Zeile `const VERSION = "v2"` auf `"v3"` hochsetzen, sonst zeigt der Offline-Speicher weiter die alte Fassung.

## Daten

Alles liegt im `localStorage` des Browsers. Nichts wird übertragen, nichts gespeichert außerhalb des Geräts. Achtung: „Browserdaten löschen" löscht auch den Plan — vorher unter **⚙ → Sicherung** den Text kopieren und irgendwo ablegen.
