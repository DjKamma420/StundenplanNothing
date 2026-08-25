---
name: pruefen
description: Führt die Prüfungen dieses Projekts aus — statisch (Syntax, Manifest, Kennungen, Versionsnummer) und im Browser. Benutze das vor jedem Commit, vor jedem Merge und immer wenn du index.html, app.js oder sw.js angefasst hast.
---

# Prüfen

## Statisch — erst das, es dauert Sekunden

```
node werkzeug/pruefen.mjs --basis origin/main
```

Ohne `--basis` entfallen die beiden Vergleiche gegen den Vorgänger; mit
Vergleich prüft es zusätzlich, ob eine Kennung aus `index.html` verschwunden
ist und ob die Versionsnummer steigen musste. Beides sind Fehler, die schon
einmal live gegangen sind.

Schlägt „Versionsnummer gestiegen" fehl: Zahl in `sw.js` erhöhen, nicht die
Prüfung umgehen.

Schlägt „Keine Kennung entfernt" fehl: das Element in `index.html`
wiederherstellen. Auch wenn es niemand mehr befüllt — siehe Regel 2 in
`CLAUDE.md`.

## Im Browser

```
node werkzeug/pruefungen/grund.mjs     # Ansichten, Grossschreibung, fremde Sicherung
node werkzeug/pruefungen/layout.mjs    # Ausrichtung und Schriftgrössen, 3 Breiten
```

Braucht Playwright und Chromium. Sind sie nicht da, meldet das Gerüst das
und du sagst es weiter, statt die Prüfung stillschweigend auszulassen.

## Was noch keine Datei hat

Nicht jeder Bereich ist abgedeckt. Für Sicherungsordner, Profile, Kalender-
menü und Netzfehler schreibst du eine neue Datei in `werkzeug/pruefungen/`
nach dem Muster von `grund.mjs` — das Gerüst nimmt dir Server, Browserstart,
Profilauswahl und Zählwerk ab. Siehe `/browsertest`.

## Reihenfolge

1. statisch
2. Browser
3. erst dann committen

Melde Ergebnisse mit Zahlen („25 bestanden"), nicht mit „läuft".
