<p align="center">
  <img src="icon-192.png" width="96" height="96" alt="Stundenplan App Icon">
</p>

<h1 align="center">Stundenplan</h1>

<p align="center">
  Eine lokale, installierbare Stundenplan-App für Schüler — mit Hausaufgaben, Klausuren, Noten, Kalender und Offline-Modus.
</p>

<p align="center">
  <strong><a href="https://djkamma420.github.io/StundenplanNothing/">App öffnen</a></strong>
  ·
  <a href="PRIVACY.md">Datenschutz</a>
  ·
  <a href="SECURITY.md">Sicherheit</a>
  ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## Was die App macht

Stundenplan ersetzt keinen Schulserver. Sie ist eine persönliche Übersicht auf deinem eigenen Gerät.

- Tagesansicht mit echten Uhrzeiten und aktueller Stunde
- Wochenansicht für Montag bis Freitag
- A-/B-Wochen
- Hausaufgaben, Klausuren, Notizen und Ereignisse
- Ausfall und Vertretung für einzelne Stunden
- Notenübersicht und Zeugnis-Schätzung
- Fehlzeiten und Archiv
- Merkblätter mit Bildern
- Ferien und Feiertage
- Kalender-Export als `.ics`
- mehrere Profile
- Stundenplan gezielt an Mitschüler weitergeben
- Sicherungen als JSON-Datei
- installierbar als PWA und nach dem ersten Laden weitgehend offline nutzbar

## Grundprinzip

**Kein Konto. Keine Datenbank. Kein Tracking. Keine Cloud-Synchronisierung.**

Die persönlichen Daten liegen im `localStorage` des Browsers auf dem jeweiligen Gerät. Die App selbst wird über GitHub Pages ausgeliefert. Für das optionale Laden deutscher Ferien wird `openholidaysapi.org` angesprochen.

Das bedeutet auch: Wenn Browser- oder Websitedaten gelöscht werden, können die lokalen Daten verloren gehen. Deshalb regelmäßig eine Sicherung erstellen.

Mehr dazu: [PRIVACY.md](PRIVACY.md)

---

## Schnellstart

### 1. App öffnen

**https://djkamma420.github.io/StundenplanNothing/**

### 2. Installieren

| Gerät | Installation |
|---|---|
| Android / Chrome | Menü → **App installieren** |
| iPhone / Safari | Teilen → **Zum Home-Bildschirm** |
| Desktop | Installationssymbol in der Adressleiste, sofern vom Browser angeboten |

Die App funktioniert auch direkt im Browser. Als installierte PWA ist sie für den täglichen Einsatz sinnvoller.

### 3. Stundenplan einrichten

1. Einstellungen öffnen.
2. Stundenraster festlegen.
3. Falls nötig A-/B-Woche aktivieren.
4. Stunden von Hand eintragen oder einen kopierten Plan importieren.
5. Optional Fachnamen, Lehrkräfte und Bundesland ergänzen.
6. Erste Sicherung erstellen.

Eine Woche reicht; bei A-/B-Wochen werden zwei Wochen gepflegt.

---

## Stundenplan importieren

Beim Import aus einem Schulportal erwartet die App pro Stunde ungefähr dieses Format:

```text
1
CH, B005 (MUEL)
2
CH, B005 (MUEL)
3
MA, B006 (SCHM)
```

Dabei steht zuerst das Fach, danach Raum und optional die Lehrkraft.

Der Import ist absichtlich überprüfbar: Die erkannten Daten werden vor dem Speichern in einer Tabelle angezeigt.

---

## Einen Plan an Mitschüler weitergeben

Unter **Einstellungen → Sicherung und Speicher → Nur den Plan teilen** wird eine eigene JSON-Datei erzeugt.

Diese Plan-Datei enthält nur die für den Stundenplan benötigten Informationen, insbesondere:

- Stundenraster
- Fächer
- Räume
- Lehrkräfte
- Fach- und Lehrkraftnamen

Persönliche Einträge wie Noten, Fehlzeiten, Hausaufgaben oder Merkblattbilder werden dabei nicht mitgegeben.

Kann der Browser Dateien direkt teilen, öffnet die App das Teilen-Menü. Andernfalls wird die Plan-Datei heruntergeladen. Der Empfänger liest sie über **Datei einlesen** ein; bestehende persönliche Einträge bleiben dabei erhalten.

---

## Sicherungen

Da die Daten nicht auf einem Server liegen, ist die Sicherung Teil des Nutzungskonzepts.

Unter **Einstellungen → Sicherung und Speicher** stehen je nach Gerät unter anderem zur Verfügung:

- aktuelles Profil sichern
- alle Profile sichern
- Sicherungsdatei wieder einlesen
- Sicherungs-Erinnerung
- auf unterstützten Desktop-Browsern ein fester Sicherungsordner

Eine vollständige Sicherung kann persönliche Daten enthalten. Sie sollte entsprechend behandelt werden.

---

## Kalender

Die App kann zwei Arten von Kalenderdaten exportieren:

- persönliche Termine, Hausaufgaben und Klausuren
- den wiederkehrenden Unterrichtsplan

Der Unterrichts-Export berücksichtigt A-/B-Wochen sowie bekannte Ferien und freie Tage.

Die `.ics`-Dateien können beispielsweise in Apple Kalender, Google Kalender oder Outlook importiert werden.

---

## Unterstützte Umgebung

Die App ist als moderne Web-App gebaut und auf aktuelle Browser ausgelegt.

Typische Zielgeräte:

- Android mit Chrome
- iPhone/iPad mit Safari
- Windows, macOS und Linux mit modernen Browsern

Einige Browserfunktionen sind systembedingt nicht überall identisch. Dazu gehören insbesondere Datei-Share, Dateisystemzugriff, Installation und Benachrichtigungen. Für nicht verfügbare Funktionen verwendet die App nach Möglichkeit einen Fallback.

---

## Technischer Aufbau

Das Projekt ist bewusst klein gehalten:

```text
index.html              Oberfläche und Styles
app.js                  Anwendungslogik
sw.js                   Service Worker und App-Version
manifest.webmanifest    PWA-Metadaten
icon-192.png
icon-512.png

.github/workflows/      Prüfung und GitHub-Pages-Deployment
werkzeug/               Prüf- und Deployment-Werkzeuge
```

Es gibt im Browserbetrieb:

- kein Framework
- keinen App-Server
- keine Datenbank
- keine Runtime-Paketabhängigkeiten

Die Anwendung wird statisch ausgeliefert. Persönliche Daten werden im Browser gespeichert.

## Entwicklung

Änderungen an `index.html` oder `app.js` benötigen eine neue Versionsnummer in `sw.js`, damit installierte PWAs zuverlässig aktualisiert werden.

Die GitHub Actions prüfen Änderungen vor der Veröffentlichung. Deployment nach GitHub Pages erfolgt automatisiert über den `main`-Branch.

Weitere Hinweise:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [SECURITY.md](SECURITY.md)
- [CHANGELOG.md](CHANGELOG.md)

---

## Datenschutz

Die App sammelt keine Nutzungsstatistiken und betreibt kein eigenes Backend für persönliche Stundenplandaten.

Wichtige Details, einschließlich lokaler Speicherung, Ferien-API und Bildern in Merkblättern, stehen in [PRIVACY.md](PRIVACY.md).

## Lizenz

Veröffentlicht unter der [MIT License](LICENSE).
