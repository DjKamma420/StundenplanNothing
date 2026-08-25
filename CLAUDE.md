# Stundenplan — Kontext für Claude

Statische PWA, kein Server, keine Datenbank, keine Abhängigkeiten zur
Laufzeit. Ausgeliefert über GitHub Pages. Alle Nutzerdaten liegen im
`localStorage` des Geräts und existieren nirgendwo sonst.

## Harte Regeln — Verstösse kosten eine ganze Runde

1. **Versionsnummer in `sw.js` hochzählen**, sobald `index.html` oder `app.js`
   geändert werden. Einzige Stelle. Ohne das holen die Geräte nichts.
2. **Keine Kennung aus `index.html` entfernen.** Nach einer Aktualisierung
   trifft kurzzeitig neues `index.html` auf altes `app.js`; fehlt dann eine
   `id`, bricht die App ab. Genau so entstand der Absturz in v32. Ungenutzte
   Elemente bleiben stehen.
3. **Kein Build-Schritt, keine Laufzeit-Abhängigkeit.** Die App muss vom Handy
   aus bearbeitbar bleiben. `werkzeug/` und `.github/` sind Entwicklerwerkzeug
   und werden nie ausgeliefert.
4. **Alles aus Daten durch `esc()`**, alles aus einer eingelesenen Sicherung
   zusätzlich durch die `…Saeubern`-Funktionen.
5. **Deutsche Bezeichner. Kommentare erklären das Warum**, nicht das Was.
6. **Nichts hart verdrahten, was von der Schule abhängt** — Zeiten, Fächer,
   Wochenrhythmus gehören in die Einstellungen.

## Wo was steht

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau **und sämtliches CSS**, alle Dialoge |
| `app.js` | die gesamte Logik |
| `sw.js` | Offline-Speicher, Versionsnummer, Dateiliste der Auslieferung |
| `werkzeug/` | Prüfungen, wird nicht ausgeliefert |
| `DEPLOYMENT.md` | Veröffentlichen, Zurückrollen, Selbsthosten |

`app.js` ist nach Abschnitten gegliedert (`/* ===== Name ===== */`):
Fehleranzeige · Voreinstellungen · Speicher/Profile · Datum · Daten pflegen ·
Noten · Werkzeug · Zeichnen · Navigation · Stunde antippen · Eintragsdialog ·
Plan einfügen · Profile · Ferien/Erinnerungen/ICS · Sicherungen prüfen ·
Sicherungsordner · Einstellungen · Version · Start.

Bei Suchen nach Bezeichnern lohnt `grep -n` gegen `app.js` mehr als das
Lesen ganzer Bereiche — die Datei hat über 2500 Zeilen.

## Begriffe im Code

`cfg` Einstellungen · `plan[A|B][MO..FR][slot]` Stundenplan · `eintraege`
Hausaufgaben/Klausuren/Notizen/Merkblätter/Fehlzeiten (Typ `H K N M F`) ·
`sonder` einmalige Ereignisse · `noten` · `ferien` (auch eigene freie Tage) ·
`SCHEMA` Datenstand im Speicher · `slots` Stundenraster.

## Prüfen

```
node werkzeug/pruefen.mjs --basis origin/main   # statisch, Sekunden
node werkzeug/pruefungen/grund.mjs              # Browser, Kernprüfung
node werkzeug/pruefungen/layout.mjs             # Ausrichtung, 3 Breiten
```

Skills: `/pruefen`, `/browsertest`, `/freigeben`.
