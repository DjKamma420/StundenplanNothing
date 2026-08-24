# Stundenplan

Ein Stundenplan fürs Handy, der zeigt, was Schulportale meist nicht zeigen: **echte Uhrzeiten**, alle Kurse in **einer** Ansicht, dazu Hausaufgaben, Klausuren, Noten, Merkblätter und Fehlzeiten.

Läuft im Browser, lässt sich auf den Startbildschirm legen und funktioniert offline. Kein Server, kein Konto, keine Zugangsdaten. **Alle Daten bleiben auf deinem Gerät.**

**Zum Ausprobieren: https://djkamma420.github.io/StundenplanNothing/**

Nichts ist auf eine bestimmte Schule zugeschnitten. Fächer, Räume, Lehrkräfte und Zeiten entstehen allein aus dem, was du einträgst.

---

## Das Wichtigste zuerst

**Deine Daten liegen ausschließlich im Speicher deines Browsers.**

Das heißt konkret:

- Löschst du in Chrome die **Cookies und Websitedaten**, ist dein kompletter Plan weg. Samt Noten, Hausaufgaben und Merkblättern. Unwiederbringlich.
- Deinstallierst du die App oder wechselst das Handy, ist alles weg.
- Der private oder Inkognito-Modus vergisst alles beim Schließen.
- Niemand kann dir die Daten wiederherstellen – auch ich nicht, denn sie waren nie irgendwo anders.

**Deshalb: Mach regelmäßig eine Sicherung.** ⚙ → Sicherung → *Als Datei sichern*. Die Datei landet in deinen Downloads; schick sie dir selbst per Mail oder leg sie in eine Cloud. Die App erinnert dich nach vier Wochen daran.

Zurückholen geht über ⚙ → Sicherung → *Datei einlesen*.

---

## Einrichten Schritt für Schritt

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

- Deinstallierst du die App oder wechselst das Handy, ist alles weg.
- Der private oder Inkognito-Modus vergisst alles beim Schließen.
- Niemand kann dir die Daten wiederherstellen” auch ich nicht, denn sie waren nie irgendwo anders.

**Deshalb: Mach regelmäßig eine Sicherung.** âš™ â†’ Sicherung â†’ *Als Datei sichern*. Die Datei landet in deinen Downloads; schick sie dir selbst per Mail oder leg sie in eine Cloud. Die App erinnert dich nach vier Wochen daran.

Zurückholen geht aber âš™ â†’ Sicherung â†’ *Datei einlesen*.

---

## Einrichten Schritt für Schritt

Du brauchst **keine Programmierkenntnisse**. Zehn Minuten, alles am Handy.

### Was du brauchst

| | |
|---|---|
| **GerÃ¤t** | Handy, Tablet oder Rechner â€” Android, iOS, Windows, Mac, Linux |
| **Browser** | Chrome, Edge, Firefox oder Safari, jeweils aktuell |
| **GitHub-Konto** | kostenlos, um die Dateien abzulegen |
| **Internet** | beim Einrichten und zum Laden der Ferientermine. Danach lÃ¤uft alles offline |
| **Deinen Stundenplan** | auf Papier oder als Tabelle zum Kopieren |

Nicht nÃ¶tig: ein Editor, Node.js, ein Build-Vorgang, eine Datenbank, ein Konto bei der App.

### Schritt 1 â€” Dateien besorgen

Oben auf dieser Seite auf den grÃ¼nen Knopf **Code** â†’ **Download ZIP**. Entpacken. Du brauchst diese Dateien:

```
index.html   manifest.webmanifest   icon-192.png
app.js       sw.js                  icon-512.png
```

### Schritt 2 â€” Eigenes Repository anlegen

1. Auf **github.com** einloggen.
2. Oben rechts **+** â†’ **New repository**.
3. Name frei wÃ¤hlen, z. B. `stundenplan`.
4. Sichtbarkeit: **Public**. (Muss Ã¶ffentlich sein â€” GitHub Pages ist bei privaten Repositories kostenpflichtig.)
5. **Create repository**.

### Schritt 3 â€” Dateien hochladen

1. Auf der leeren Seite **uploading an existing file** antippen.
2. **choose your files** â†’ alle sechs Dateien auswÃ¤hlen.
3. Unten **Commit changes**.

Achte darauf, dass die Dateien **direkt im Repository** liegen, nicht in einem Unterordner.

### Schritt 4 â€” VerÃ¶ffentlichen

1. **Settings** (ggf. hinter dem `â€¦`-MenÃ¼) â†’ links **Pages**.
2. Source: **Deploy from a branch**
3. Branch: **main**, Ordner: **/ (root)** â†’ **Save**.
4. Ein bis zwei Minuten warten, Seite neu laden. Oben steht deine Adresse:
   `https://DEINNAME.github.io/stundenplan/`

### Schritt 5 â€” Installieren

- **Android/Chrome:** Adresse Ã¶ffnen â†’ MenÃ¼ â‹® â†’ *Installieren und VerknÃ¼pfen* bzw. *App installieren*
- **iPhone/Safari:** Adresse Ã¶ffnen â†’ Teilen â†’ *Zum Home-Bildschirm*
- **Rechner:** Installationssymbol rechts in der Adressleiste

Das Icon liegt jetzt neben deinen anderen Apps und startet ohne Browserleiste.

### Schritt 6 â€” Einrichten

1. **âš™ oben rechts** Ã¶ffnen.
2. **Klasse** eintragen.
3. **Stundenraster** prÃ¼fen. Zwei Vorlagen zum Antippen: *4 BlÃ¶cke Ã  90 min* und *8 Einzelstunden*. Sonst Zeilen von Hand anpassen â€” â€žStd." sind die Stundennummern, die ein Feld abdeckt.
4. Wenn deine Schule **A- und B-Wochen** hat: Haken setzen. Feste Regel: **ungerade Kalenderwoche = A, gerade = B**. Die App zeigt dir, welche gerade lÃ¤uft.
5. **Bundesland** wÃ¤hlen und **Ferien laden**.
6. Optional **Akzentfarbe**, **heller Modus** und **Schriftart** einstellen.

### Schritt 7 â€” Plan eintragen

Zwei Wege:

**Von Hand:** âœŽ oben antippen, dann jedes Feld ausfÃ¼llen. FÃ¼r eine Woche brauchst du keine fÃ¼nf Minuten.

**Aus dem Schulportal kopieren:** âš™ â†’ **Plan einfÃ¼gen**. Tag und Woche wÃ¤hlen, die kopierte Tabelle in *Aus der Zwischenablage fÃ¼llen* einfÃ¼gen, **In die Tabelle Ã¼bernehmen**, prÃ¼fen, **Speichern**.

Der Import erwartet je Stunde eine Zeile im Format `FACH, RAUM (LEHRKRAFT)`:

```
1
CH, B005 (MUEL)
2
CH, B005 (MUEL)
3
MA, B006 (SCHM)
```

Viele Portale kÃ¶nnen zwischen Fach-, Raum- und Lehrkraftansicht umschalten. Gebraucht wird die Ansicht, bei der **das Fach zuerst** steht â€” sonst landen Lehrernamen als FÃ¤cher in deinem Plan.

**Du musst kein halbes Jahr eintragen.** Ein Stundenplan wiederholt sich. Eine Woche reicht, bei A/B-Wochen zwei.

---

## Bedienung

### Die vier Reiter

| Reiter | Inhalt |
|---|---|
| **Tag** | Der Plan des Tages mit Uhrzeiten, laufender Stunde und Fortschrittsbalken |
| **Kalender** | MonatsÃ¼bersicht mit Markierungen, darunter der angetippte Tag |
| **EintrÃ¤ge** | Suche und alle Listen: Hausaufgaben, Klausuren, Notizen, Ereignisse, Noten, MerkblÃ¤tter, Fehlzeiten, Archiv |
| **Zeugnis** | Alle FÃ¤cher mit Schnitt und gerundeter Note |

Wechseln durch Antippen, durch **Wischen im Bereich unter dem Eintragsknopf** oder durch Antippen der vier Punkte. Steht eine Unterliste offen, fÃ¼hrt der erste Wisch zurÃ¼ck ins MenÃ¼.

### Eine Stunde antippen

- **Kurz antippen** Ã¶ffnet die Schnellauswahl: Hausaufgabe fÃ¼r die nÃ¤chste Stunde dieses Fachs, Notiz, Klausur, Fehlzeit, *FÃ¤llt aus*, *Vertretung* oder ein sonstiges Ereignis.
- **GedrÃ¼ckt halten** Ã¶ffnet die Fach-Info: ausgeschriebener Name, Lehrkraft, Raum, Wochenstunden, nÃ¤chster Termin (antippbar â†’ springt in den Kalender), Notenschnitt, Fehlzeiten, MerkblÃ¤tter, Offenes.
- **Mit âœŽ oben** Ã¤ndert Antippen dauerhaft Fach, Raum und Lehrkraft.

*FÃ¤llt aus*, *Vertretung* und Ereignisse gelten **nur an diesem einen Tag**. Der Regelplan bleibt unangetastet.

### Der Eintragsknopf

Ein Knopf fÃ¼r alles. Die Art richtet sich danach, wo du gerade bist â€” bist du in den Noten, ist â€žNote" vorausgewÃ¤hlt.

| Art | WofÃ¼r |
|---|---|
| Hausaufgabe | mit FÃ¤lligkeitsdatum, abhakbar |
| Klausur | Termin, abhakbar |
| Notiz | freier Text zu einem Tag |
| Ereignis | einmalig, ganzer Tag oder eine bestimmte Stunde |
| Note | mit mÃ¼ndlich/schriftlich, WofÃ¼r und Notizen |
| Merkblatt | Formeln, Regeln, Vokabeln â€” mit Bildern |
| Fehlzeit | entschuldigt, unentschuldigt oder verspÃ¤tet |

Ein **Fach ist nie vorausgewÃ¤hlt** â€” auÃŸer du kommst aus einer angetippten Stunde.

Bei der Datumsauswahl bekommt jeder Tag einen **roten Punkt**, an dem das gewÃ¤hlte Fach im Plan steht. So findest du die nÃ¤chste Stunde, ohne zu blÃ¤ttern.

### MerkblÃ¤tter

Beliebig viele je Fach, jedes mit Datum und Uhrzeit. ZeilenumbrÃ¼che und EinrÃ¼ckungen bleiben erhalten, Darstellung in Monospace â€” Formeln bleiben ausgerichtet.

**Bilder** lassen sich einfÃ¼gen (Screenshot vom Tafelbild, Foto einer Seite). Sie werden automatisch auf 1000 px verkleinert und komprimiert. Trotzdem gilt: Der Browserspeicher fasst rund 5 MB. Unter âš™ â†’ Speicher siehst du den Stand.

### Noten und Zeugnis

M¼ndlich und schriftlich werden getrennt gemittelt und nach einem einstellbaren VerhÃ¤ltnis verrechnet â€” **je Fach einzeln** einstellbar, mit einem Standardwert fÃ¼r den Rest. Umschaltbar zwischen Noten 1â€“6 und Punkten 0â€“15.

Im Zeugnis-Reiter steht jedes Fach mit Schnitt und gerundeter Note. Eine Zeile antippen Ã¶ffnet VerhÃ¤ltnis und **Zielnoten-Rechner**: Zielnote eingeben, die App sagt dir, was die nÃ¤chste Arbeit bringen mÃ¼sste.

Die Zeugnisansicht ist eine **SchÃ¤tzung**. LehrkrÃ¤fte gewichten oft anders.

### Erinnerungen

Eine Web-App kann sich **nicht selbst wecken**. Deshalb zwei Wege:

1. **Beim Ã–ffnen** meldet sich die App, wenn etwas ansteht â€” sonntags mit einem WochenÃ¼berblick, am Tag vor einer Klausur, bei Klausuren in den nÃ¤chsten drei Tagen. Einmal tÃ¤glich, nicht Ã¶fter. Berechtigung erteilen unter âš™ â†’ Erinnerungen.
2. **Kalender-Export (.ics)** unter âš™ â†’ Erinnerungen. Die Datei importierst du in Google Kalender, Apple Kalender oder Outlook. Dort bekommst du **echte Erinnerungen**, 15 Stunden vorher, auch wenn die App geschlossen ist. Das ist der zuverlÃ¤ssige Weg.

### Profile

Mehrere Profile auf einem GerÃ¤t. Jedes hat eigenen Plan, eigene EintrÃ¤ge, Noten, MerkblÃ¤tter und Einstellungen â€” nichts wird geteilt. Bei mehr als einem Profil erscheint beim Ã–ffnen eine Auswahl. Jederzeit Ã¼ber den Buchstaben oben rechts erreichbar.

### Archiv

GelÃ¶schtes verschwindet nicht sofort, sondern landet im Archiv â€” EintrÃ¤ge, Ereignisse und Noten gleichermaÃŸen. Von dort zurÃ¼ckholen oder endgÃ¼ltig entfernen. Abgehakte Hausaufgaben und Klausuren wandern nach sieben Tagen automatisch dorthin.

---

## An eine andere Schule anpassen

Alles Ã¼ber **âš™ Einstellungen**, ohne eine Zeile Code:

**Stundenraster.** Eine Zeile pro Feld im Plan.

| Std. | von | bis |
|---|---|---|
| 1,2 | 08:00 | 09:30 |
| 3,4 | 09:50 | 11:20 |

Keine Doppelstunden? Dann `1`, `2`, `3` â€¦ in einzelne Zeilen. Das Raster darf beliebig viele Felder haben.

**Namen statt KÃ¼rzel.** Unter *LehrkrÃ¤fte* und *Fachnamen* je Zeile ein KÃ¼rzel und der Name:

```
WZET = Frau Wietzet
CH = Chemie
```

Der Plan zeigt weiter die KÃ¼rzel â€” sonst passt er nicht auf den Bildschirm. Die vollen Namen erscheinen in der Fach-Info und im Zeugnis.

**Anderes Importformat?** Der Ausdruck steht in `app.js` in der Funktion `parseZelle`.

---

## Warum kein automatischer Abruf vom Schulportal

Die App liegt auf `github.io`, dein Portal auf einem anderen Server. Der Browser verbietet Zugriffe Ã¼ber Domaingrenzen hinweg, solange die Gegenseite das nicht ausdrÃ¼cklich erlaubt. Diese **Same-Origin-Regel** lÃ¤sst sich nicht wegprogrammieren.

NÃ¶tig wÃ¤re ein Vermittler-Dienst oder ein Skript, das direkt auf der Portalseite lÃ¤uft. Beides braucht Zugangsdaten oder die Zustimmung der Schule.

Praktisch fÃ¤llt es kaum ins Gewicht: Der Plan gilt ein halbes Jahr. Nur Vertretungen musst du im Portal nachsehen â€” und die trÃ¤gst du mit zwei Tipps als *FÃ¤llt aus* oder *Vertretung* ein.

Die Ferientermine kommen dagegen automatisch, weil [openholidaysapi.org](https://openholidaysapi.org) den Zugriff erlaubt.

---

## Ã„nderungen am Code

Datei auf GitHub antippen â†’ Stift â†’ bearbeiten â†’ **Commit changes**.

Danach in `sw.js` die Zeile `const VERSION = "v30"` hochzÃ¤hlen. Das ist die **einzige** Stelle mit einer Versionsnummer. Die App fragt sie beim laufenden Service Worker ab und vergleicht sie mit der auf dem Server. Unten in der App steht die laufende Fassung; weicht sie ab, erscheint dort *Update verfÃ¼gbar* und ein Tipp darauf lÃ¤dt neu.

**Wenn du eine Ã„nderung nicht siehst**, hÃ¤ngt dein GerÃ¤t am Zwischenspeicher: Version unten prÃ¼fen, notfalls Icon entfernen und neu installieren. Die Daten Ã¼berleben das, weil sie an der Adresse hÃ¤ngen, nicht am Icon.

---

## Datenschutz

Nichts verlÃ¤sst dein GerÃ¤t. Es gibt keinen Server, keine Anmeldung, kein Tracking, keine Werbung, keine Analyse. Die einzige Verbindung nach auÃŸen ist der freiwillige Abruf der Ferientermine.

Siehe [PRIVACY.md](PRIVACY.md).

## Lizenz

[MIT](LICENSE) â€” Weiterverwendung, VerÃ¤nderung und Weitergabe sind erlaubt, solange der Urheberhinweis erhalten bleibt.

Entwickelt von **DjKamma420**, mit KI-UnterstÃ¼tzung (Claude).
