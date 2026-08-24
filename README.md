# Stundenplan

Ein Stundenplan fürs Handy, der zeigt, was Schulportale meist nicht zeigen: **echte Uhrzeiten**, alle Kurse in **einer** Ansicht, dazu Hausaufgaben, Klausuren, Noten, Merkblätter und Fehlzeiten.

Läuft im Browser, lässt sich auf den Startbildschirm legen und funktioniert offline. Kein Server, kein Konto, keine Zugangsdaten. **Alle Daten bleiben auf deinem Gerät.**

**➡️ Zum Ausprobieren: https://djkamma420.github.io/StundenplanNothing/**

Nichts ist auf eine bestimmte Schule zugeschnitten. Fächer, Räume, Lehrkräfte und Zeiten entstehen allein aus dem, was du einträgst.

---

## ⚠️ Das Wichtigste zuerst

**Deine Daten liegen ausschließlich im Speicher deines Browsers.**

Das heißt konkret:

- Löschst du in Chrome die **„Cookies und Websitedaten"**, ist dein kompletter Plan weg. Samt Noten, Hausaufgaben und Merkblättern. Unwiederbringlich.
- Deinstallierst du die App oder wechselst das Handy, ist alles weg.
- Der private oder Inkognito-Modus vergisst alles beim Schließen.
- Niemand kann dir die Daten wiederherstellen — auch ich nicht, denn sie waren nie irgendwo anders.

**Deshalb: Mach regelmäßig eine Sicherung.** ⚙ → Sicherung → *Als Datei sichern*. Die Datei landet in deinen Downloads; schick sie dir selbst per Mail oder leg sie in eine Cloud. Die App erinnert dich nach vier Wochen daran.

Zurückholen geht über ⚙ → Sicherung → *Datei einlesen*.

---

## Einrichten — Schritt für Schritt

Du brauchst **keine Programmierkenntnisse**. Zehn Minuten, alles am Handy.

### Was du brauchst

| | |
|---|---|
| **Gerät** | Handy, Tablet oder Rechner — Android, iOS, Windows, Mac, Linux |
| **Browser** | Chrome, Edge, Firefox oder Safari, jeweils aktuell |
| **GitHub-Konto** | kostenlos, um die Dateien abzulegen |
| **Internet** | beim Einrichten und zum Laden der Ferientermine. Danach läuft alles offline |
| **Deinen Stundenplan** | auf Papier oder als Tabelle zum Kopieren |

Nicht nötig: ein Editor, Node.js, ein Build-Vorgang, eine Datenbank, ein Konto bei der App.

### Schritt 1 — Dateien besorgen

Oben auf dieser Seite auf den grünen Knopf **Code** → **Download ZIP**. Entpacken. Du brauchst diese Dateien:

```
index.html   manifest.webmanifest   icon-192.png
app.js       sw.js                  icon-512.png
```

### Schritt 2 — Eigenes Repository anlegen

1. Auf **github.com** einloggen.
2. Oben rechts **+** → **New repository**.
3. Name frei wählen, z. B. `stundenplan`.
4. Sichtbarkeit: **Public**. (Muss öffentlich sein — GitHub Pages ist bei privaten Repositories kostenpflichtig.)
5. **Create repository**.

### Schritt 3 — Dateien hochladen

1. Auf der leeren Seite **uploading an existing file** antippen.
2. **choose your files** → alle sechs Dateien auswählen.
3. Unten **Commit changes**.

Achte darauf, dass die Dateien **direkt im Repository** liegen, nicht in einem Unterordner.

### Schritt 4 — Veröffentlichen

1. **Settings** (ggf. hinter dem `…`-Menü) → links **Pages**.
2. Source: **Deploy from a branch**
3. Branch: **main**, Ordner: **/ (root)** → **Save**.
4. Ein bis zwei Minuten warten, Seite neu laden. Oben steht deine Adresse:
   `https://DEINNAME.github.io/stundenplan/`

### Schritt 5 — Installieren

- **Android/Chrome:** Adresse öffnen → Menü ⋮ → *Installieren und Verknüpfen* bzw. *App installieren*
- **iPhone/Safari:** Adresse öffnen → Teilen → *Zum Home-Bildschirm*
- **Rechner:** Installationssymbol rechts in der Adressleiste

Das Icon liegt jetzt neben deinen anderen Apps und startet ohne Browserleiste.

### Schritt 6 — Einrichten

1. **⚙ oben rechts** öffnen.
2. **Klasse** eintragen.
3. **Stundenraster** prüfen. Zwei Vorlagen zum Antippen: *4 Blöcke à 90 min* und *8 Einzelstunden*. Sonst Zeilen von Hand anpassen — „Std." sind die Stundennummern, die ein Feld abdeckt.
4. Wenn deine Schule **A- und B-Wochen** hat: Haken setzen. Feste Regel: **ungerade Kalenderwoche = A, gerade = B**. Die App zeigt dir, welche gerade läuft.
5. **Bundesland** wählen und **Ferien laden**.
6. Optional **Akzentfarbe**, **heller Modus** und **Schriftart** einstellen.

### Schritt 7 — Plan eintragen

Zwei Wege:

**Von Hand:** ✎ oben antippen, dann jedes Feld ausfüllen. Für eine Woche brauchst du keine fünf Minuten.

**Aus dem Schulportal kopieren:** ⚙ → **Plan einfügen**. Tag und Woche wählen, die kopierte Tabelle in *Aus der Zwischenablage füllen* einfügen, **In die Tabelle übernehmen**, prüfen, **Speichern**.

Der Import erwartet je Stunde eine Zeile im Format `FACH, RAUM (LEHRKRAFT)`:

```
1
CH, B005 (MUEL)
2
CH, B005 (MUEL)
3
MA, B006 (SCHM)
```

Viele Portale können zwischen Fach-, Raum- und Lehrkraftansicht umschalten. Gebraucht wird die Ansicht, bei der **das Fach zuerst** steht — sonst landen Lehrernamen als Fächer in deinem Plan.

**Du musst kein halbes Jahr eintragen.** Ein Stundenplan wiederholt sich. Eine Woche reicht, bei A/B-Wochen zwei.

---

## Bedienung

### Die vier Reiter

| Reiter | Inhalt |
|---|---|
| **Tag** | Der Plan des Tages mit Uhrzeiten, laufender Stunde und Fortschrittsbalken |
| **Kalender** | Monatsübersicht mit Markierungen, darunter der angetippte Tag |
| **Einträge** | Suche und alle Listen: Hausaufgaben, Klausuren, Notizen, Ereignisse, Noten, Merkblätter, Fehlzeiten, Archiv |
| **Zeugnis** | Alle Fächer mit Schnitt und gerundeter Note |

Wechseln durch Antippen, durch Antippen der vier Punkte oder durch **Wischen in jedem freien Bereich unterhalb des Inhalts** — auch mitten auf der Seite, wenn dort nichts mehr steht. Steht eine Unterliste offen, führt der erste Wisch zurück ins Menü.

### Eine Stunde antippen

- **Kurz antippen** öffnet die Schnellauswahl: Hausaufgabe für die nächste Stunde dieses Fachs, Notiz, Klausur, Fehlzeit, *Fällt aus*, *Vertretung* oder ein sonstiges Ereignis.
- **Gedrückt halten** öffnet die Fach-Info: ausgeschriebener Name, Lehrkraft, Raum, Wochenstunden, nächster Termin (antippbar → springt in den Kalender), Notenschnitt, Fehlzeiten, Merkblätter, Offenes.
- **Mit ✎ oben** ändert Antippen dauerhaft Fach, Raum und Lehrkraft.

*Fällt aus*, *Vertretung* und Ereignisse gelten **nur an diesem einen Tag**. Der Regelplan bleibt unangetastet.

### Der Eintragsknopf

Ein Knopf für alles. Die Art richtet sich danach, wo du gerade bist — bist du in den Noten, ist „Note" vorausgewählt.

| Art | Wofür |
|---|---|
| Hausaufgabe | mit Fälligkeitsdatum, abhakbar |
| Klausur | Termin, abhakbar |
| Notiz | freier Text zu einem Tag |
| Ereignis | einmalig, ganzer Tag oder eine bestimmte Stunde |
| Note | mit mündlich/schriftlich, Wofür und Notizen |
| Merkblatt | Formeln, Regeln, Vokabeln — mit Bildern |
| Fehlzeit | in Unterrichtsstunden, entschuldigt/unentschuldigt/verspätet — ohne Fach |

Ein **Fach ist nie vorausgewählt** — außer du kommst aus einer angetippten Stunde.

Bei der Datumsauswahl bekommt jeder Tag einen **roten Punkt**, an dem das gewählte Fach im Plan steht. So findest du die nächste Stunde, ohne zu blättern.

### Merkblätter

Beliebig viele je Fach, jedes mit Datum und Uhrzeit. Zeilenumbrüche und Einrückungen bleiben erhalten, Darstellung in Monospace — Formeln bleiben ausgerichtet.

**Bilder** lassen sich einfügen (Screenshot vom Tafelbild, Foto einer Seite). Sie werden automatisch auf 1000 px verkleinert und komprimiert. Trotzdem gilt: Der Browserspeicher fasst rund 5 MB. Unter ⚙ → Speicher siehst du den Stand.

### Fehlzeiten

Werden in **Unterrichtsstunden** gezählt, nicht je Fach — so steht es auch auf dem Zeugnis. Unter ⚙ → Fehlzeiten stellst du ein, wie viele Stunden ein Schultag hat; daraus rechnet das Zeugnis die Fehltage aus.

Tippst du eine Stunde im Plan an und wählst *Fehlzeit*, ist die Stundenzahl des Blocks schon eingetragen.

### Eigene freie Tage

Im Kalender ein Feld **gedrückt halten** öffnet „Tag markieren". Damit trägst du schuleigene freie Tage, Praktika oder Ausflüge ein, auch über mehrere Tage. Sie werden grau dargestellt wie Ferien und überleben ein erneutes Laden der offiziellen Ferientermine.

### Reihenfolge anpassen

Unter ⚙ lässt sich die Reihenfolge der Kacheln im Einträge-Menü und die Reihenfolge der Fächer im Zeugnis mit Pfeilen umsortieren.

### Noten und Zeugnis

Mündlich und schriftlich werden getrennt gemittelt und nach einem einstellbaren Verhältnis verrechnet — **je Fach einzeln** einstellbar, mit einem Standardwert für den Rest. Umschaltbar zwischen Noten 1–6 und Punkten 0–15.

Im Zeugnis-Reiter steht jedes Fach mit Schnitt und gerundeter Note. Eine Zeile antippen öffnet Verhältnis und **Zielnoten-Rechner**: Zielnote eingeben, die App sagt dir, was die nächste Arbeit bringen müsste.

Die Zeugnisansicht ist eine **Schätzung**. Lehrkräfte gewichten oft anders.

### Erinnerungen

Eine Web-App kann sich **nicht selbst wecken**. Deshalb zwei Wege:

1. **Beim Öffnen** meldet sich die App, wenn etwas ansteht — sonntags mit einem Wochenüberblick, am Tag vor einer Klausur, bei Klausuren in den nächsten drei Tagen. Einmal täglich, nicht öfter. Berechtigung erteilen unter ⚙ → Erinnerungen.
2. **Kalender-Export (.ics)** unter ⚙ → Erinnerungen. Die Datei importierst du in Google Kalender, Apple Kalender oder Outlook. Dort bekommst du **echte Erinnerungen**, 15 Stunden vorher, auch wenn die App geschlossen ist. Das ist der zuverlässige Weg.

### Profile

Mehrere Profile auf einem Gerät. Jedes hat eigenen Plan, eigene Einträge, Noten, Merkblätter und Einstellungen — nichts wird geteilt. Bei mehr als einem Profil erscheint beim Öffnen eine Auswahl. Jederzeit über den Buchstaben oben rechts erreichbar.

### Archiv

Gelöschtes verschwindet nicht sofort, sondern landet im Archiv — Einträge, Ereignisse und Noten gleichermaßen. Von dort zurückholen oder endgültig entfernen. Abgehakte Hausaufgaben und Klausuren wandern nach sieben Tagen automatisch dorthin.

---

## An eine andere Schule anpassen

Alles über **⚙ Einstellungen**, ohne eine Zeile Code:

**Stundenraster.** Eine Zeile pro Feld im Plan.

| Std. | von | bis |
|---|---|---|
| 1,2 | 08:00 | 09:30 |
| 3,4 | 09:50 | 11:20 |

Keine Doppelstunden? Dann `1`, `2`, `3` … in einzelne Zeilen. Das Raster darf beliebig viele Felder haben.

**Namen statt Kürzel.** Unter *Lehrkräfte* und *Fachnamen* je Zeile ein Kürzel und der Name:

```
WZET = Frau Wietzet
CH = Chemie
```

Der Plan zeigt weiter die Kürzel — sonst passt er nicht auf den Bildschirm. Die vollen Namen erscheinen in der Fach-Info und im Zeugnis.

**Anderes Importformat?** Der Ausdruck steht in `app.js` in der Funktion `parseZelle`.

---

## Warum kein automatischer Abruf vom Schulportal

Die App liegt auf `github.io`, dein Portal auf einem anderen Server. Der Browser verbietet Zugriffe über Domaingrenzen hinweg, solange die Gegenseite das nicht ausdrücklich erlaubt. Diese **Same-Origin-Regel** lässt sich nicht wegprogrammieren.

Nötig wäre ein Vermittler-Dienst oder ein Skript, das direkt auf der Portalseite läuft. Beides braucht Zugangsdaten oder die Zustimmung der Schule.

Praktisch fällt es kaum ins Gewicht: Der Plan gilt ein halbes Jahr. Nur Vertretungen musst du im Portal nachsehen — und die trägst du mit zwei Tipps als *Fällt aus* oder *Vertretung* ein.

Die Ferientermine kommen dagegen automatisch, weil [openholidaysapi.org](https://openholidaysapi.org) den Zugriff erlaubt.

---

## Änderungen am Code

Datei auf GitHub antippen → Stift → bearbeiten → **Commit changes**.

Danach in `sw.js` die Zeile `const VERSION = "v31"` hochzählen. Das ist die **einzige** Stelle mit einer Versionsnummer. Die App fragt sie beim laufenden Service Worker ab und vergleicht sie mit der auf dem Server. Unten in der App steht die laufende Fassung; weicht sie ab, erscheint dort *Update verfügbar* und ein Tipp darauf lädt neu.

**Wenn du eine Änderung nicht siehst**, hängt dein Gerät am Zwischenspeicher: Version unten prüfen, notfalls Icon entfernen und neu installieren. Die Daten überleben das, weil sie an der Adresse hängen, nicht am Icon.

---

## Datenschutz

Nichts verlässt dein Gerät. Es gibt keinen Server, keine Anmeldung, kein Tracking, keine Werbung, keine Analyse. Die einzige Verbindung nach außen ist der freiwillige Abruf der Ferientermine.

Siehe [PRIVACY.md](PRIVACY.md).

## Lizenz

[MIT](LICENSE) — Weiterverwendung, Veränderung und Weitergabe sind erlaubt, solange der Urheberhinweis erhalten bleibt.

Entwickelt von **DjKamma420**, mit KI-Unterstützung (Claude).
