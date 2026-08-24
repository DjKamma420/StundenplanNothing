# Mitmachen

Verbesserungen sind willkommen.

## Aufbau

Drei Dateien, kein Framework, kein Build-Vorgang:

- `index.html` — Aufbau und sämtliches CSS
- `app.js` — die gesamte Logik
- `sw.js` — Offline-Speicher und Versionsnummer

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
- Erscheint kein roter Fehlerkasten?
- Funktioniert es auf einem schmalen Handybildschirm?

## Ideen ohne Code

Auch Fehlermeldungen, Rechtschreibkorrekturen und Vorschläge sind hilfreich. Öffne einfach ein Issue.
