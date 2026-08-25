# Mitmachen

Verbesserungen sind willkommen.

## Aufbau

Drei Dateien, kein Framework, kein Build-Vorgang:

- `index.html` — Aufbau und sämtliches CSS
- `app.js` — die gesamte Logik
- `sw.js` — Offline-Speicher und Versionsnummer

Dazu Entwicklerwerkzeug, das **nie ausgeliefert** wird (`werkzeug/seite-bauen.mjs`
kopiert nur die sechs Dateien der App):

- `werkzeug/pruefen.mjs` — alle statischen Prüfungen. Dieselbe Datei benutzen
  die Workflows und wer von Hand prüft.
- `werkzeug/browser.mjs` + `werkzeug/pruefungen/` — Prüfungen im Browser.
  Brauchen Playwright, aber nur zum Prüfen; die App selbst hat keine
  Abhängigkeit.
- `werkzeug/seite-bauen.mjs` — stellt zusammen, was veröffentlicht wird.
- `.github/workflows/` — Prüfen und Veröffentlichen.
- `CLAUDE.md`, `.claude/skills/` — Kontext und Abläufe für die Arbeit mit
  Claude Code.

Das ist kein Build-Vorgang: für die App entsteht nichts, es wird nur
nachgesehen und kopiert.

Betrieb, Veröffentlichung und Rückzug stehen in [DEPLOYMENT.md](DEPLOYMENT.md).

Zum Ausprobieren reicht es, `index.html` im Browser zu öffnen. Für Service Worker und Installation braucht es HTTPS, also GitHub Pages oder einen lokalen Server.

## Regeln

1. **Kein Build-Schritt.** Die App muss vom Handy aus bearbeitbar bleiben. Keine Abhängigkeiten, kein npm, kein Bundler.
2. **Versionsnummer hochzählen** in `sw.js` bei jeder Änderung an `index.html` oder `app.js`. Es gibt nur diese eine Stelle.
3. **Deutsche Bezeichner** im Code — der Rest ist auch auf Deutsch.
4. **Kommentare erklären das Warum**, nicht das Was.
5. **Nichts hart verdrahten**, was von der Schule abhängt. Zeiten, Fächer, Wochenrhythmus gehören in die Einstellungen.
6. **Keine Daten nach außen.** Neue Netzwerkaufrufe nur, wenn sie freiwillig sind und im README stehen.
7. **Kennungen aus `index.html` nie entfernen.** Nach einer Aktualisierung kann für
   kurze Zeit ein neues `index.html` auf ein altes `app.js` treffen. Fehlt dann ein
   `id`, bricht die App ab. Ein ungenutztes Element bleibt stehen — auch wenn es
   niemand mehr befüllt.

## Prüfen

```
node werkzeug/pruefen.mjs --basis origin/main
node werkzeug/pruefungen/grund.mjs
node werkzeug/pruefungen/layout.mjs
```

## Vor einem Pull Request

- Läuft die App noch, wenn der Speicher leer ist? (Neues Profil anlegen und ausprobieren)
- Überlebt eine bestehende Sicherung deine Änderung?
- Landet nichts Ungeprüftes im HTML? Alles, was aus Daten kommt, gehört durch `esc()`,
  alles aus einer eingelesenen Sicherung zusätzlich durch die `…Saeubern`-Funktionen.
- Erscheint kein roter Fehlerkasten?
- Funktioniert es auf einem schmalen Handybildschirm?

## Ideen ohne Code

Auch Fehlermeldungen, Rechtschreibkorrekturen und Vorschläge sind hilfreich. Öffne einfach ein Issue.
