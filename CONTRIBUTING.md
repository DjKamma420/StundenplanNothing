# Mitmachen

Verbesserungen sind willkommen.

## Aufbau

Drei Dateien, kein Framework, kein Build-Vorgang:

- `index.html` — Aufbau und sämtliches CSS
- `app.js` — die gesamte Logik
- `sw.js` — Offline-Speicher und Versionsnummer

Dazu `.github/workflows/pruefen.yml`: prüft bei jedem Push die JavaScript-Syntax,
das Manifest und ob jede in `app.js` angesprochene Kennung in `index.html` steht.
Das ist kein Build-Vorgang — es entsteht nichts, es wird nur nachgesehen.

Zum Ausprobieren reicht es, `index.html` im Browser zu öffnen. Für Service Worker und Installation braucht es HTTPS, also GitHub Pages oder einen lokalen Server.

## Regeln

1. **Kein Build-Schritt.** Die App muss vom Handy aus bearbeitbar bleiben. Keine Abhängigkeiten, kein npm, kein Bundler.
2. **Versionsnummer hochzählen** in `sw.js` bei jeder Änderung an `index.html` oder `app.js`. Es gibt nur diese eine Stelle.
3. **Deutsche Bezeichner** im Code — der Rest ist auch auf Deutsch.
4. **Kommentare erklären das Warum**, nicht das Was.
5. **Nichts hart verdrahten**, was von der Schule abhängt. Zeiten, Fächer, Wochenrhythmus gehören in die Einstellungen.
6. **Keine Daten nach außen.** Neue Netzwerkaufrufe nur, wenn sie freiwillig sind und im README stehen.

## Vor einem Pull Request

- Läuft die App noch, wenn der Speicher leer ist? (Neues Profil anlegen und ausprobieren)
- Überlebt eine bestehende Sicherung deine Änderung?
- Landet nichts Ungeprüftes im HTML? Alles, was aus Daten kommt, gehört durch `esc()`,
  alles aus einer eingelesenen Sicherung zusätzlich durch die `…Saeubern`-Funktionen.
- Erscheint kein roter Fehlerkasten?
- Funktioniert es auf einem schmalen Handybildschirm?

## Ideen ohne Code

Auch Fehlermeldungen, Rechtschreibkorrekturen und Vorschläge sind hilfreich. Öffne einfach ein Issue.
