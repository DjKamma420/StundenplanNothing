---
name: browsertest
description: Schreibt eine Browserprüfung für diese App mit dem vorhandenen Gerüst in werkzeug/browser.mjs. Benutze das, wenn du eine Änderung im Browser nachweisen willst, statt Playwright-Boilerplate neu zu tippen.
---

# Browserprüfung schreiben

Das Gerüst steht in `werkzeug/browser.mjs`. **Schreibe keinen eigenen
Playwright-Aufbau** — Server, Browsersuche, Fenstergrösse, Profilauswahl,
Dialogbestätigung und Zählwerk sind darin erledigt.

## Muster

```js
import { starte, ende, pruef, fehlerkasten } from "../browser.mjs";

const { page, kasten } = await starte();          // oder starte({ geraet: "handy" })
pruef("etwas stimmt", await page.isVisible("#ansichtTag"));
pruef("kein Fehlerkasten", (await kasten()) === null, (await kasten()) || "");
await ende();                                      // beendet mit passendem Code
```

Ablegen unter `werkzeug/pruefungen/<name>.mjs`, ausführen mit
`node werkzeug/pruefungen/<name>.mjs`.

## Was `starte()` annimmt

`verzeichnis` was ausgeliefert wird · `geraet: "handy"` · `breite`/`hoehe` ·
`profilWeg: false` wenn die Profilauswahl selbst geprüft wird ·
`dialogeJa: false` wenn eine Rückfrage geprüft wird.

## Fallen, die in dieser App wirklich zugeschlagen haben

- **Dialoge werden ohne Handler abgelehnt.** Das Gerüst bestätigt sie
  standardmäßig. Vergisst man das, läuft die geprüfte Handlung gar nicht und
  die Prüfung besteht, ohne etwas zu prüfen. Genau so wurde eine
  Sicherheitsprüfung stillschweigend wirkungslos.
- **`dblclick` greift im Kalender nicht.** Der erste Klick zeichnet das
  Gitter neu, der zweite trifft ein anderes Element. Die App erkennt den
  Doppeltipp selbst; im Test funktioniert `dblclick()` trotzdem, weil daraus
  zwei Klicks werden.
- **Langes Drücken** braucht echte Touch-Ereignisse und `geraet: "handy"`.
- **Alles hängt an `zeichne()`.** Nach einer Änderung an den Daten per
  `page.evaluate` erst `sichern(); zeichne();` aufrufen, sonst prüfst du
  einen alten Stand.
- Interne Funktionen und Zustände (`cfg`, `plan`, `eintraege`, `iso()`,
  `zeichne()`) sind in `page.evaluate` erreichbar — schneller als über die
  Oberfläche zu klicken.

## Was eine Prüfung wert ist

Prüfe die Regel, nicht die Umsetzung. Gute Beispiele aus diesem Projekt:
Fächer werden gross gespeichert · eine fremde Sicherung bringt keinen Code
in die Seite · nichts steht neben der Mitte · kein Eingabefeld unter 16 px ·
die App startet ohne Netz. Jede davon deckte einen echten Fehler auf.
