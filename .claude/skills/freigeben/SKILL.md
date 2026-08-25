---
name: freigeben
description: Bringt Änderungen dieses Projekts nach main und damit live auf GitHub Pages. Benutze das, wenn zusammengeführt, veröffentlicht oder zurückgerollt werden soll.
---

# Freigeben

Live geht, was auf `main` liegt. Die Pipeline steht in
`.github/workflows/deploy.yml`, Einzelheiten in `DEPLOYMENT.md`.

## Vor dem Zusammenführen

1. **Versionsnummer in `sw.js`** erhöht? Nur nötig, wenn `index.html` oder
   `app.js` geändert wurden — die Prüfung erzwingt es.
2. `CHANGELOG.md` ergänzt, oberster Abschnitt.
3. `node werkzeug/pruefen.mjs --basis origin/main`
4. Die Browserprüfungen aus `/pruefen`.

## Zusammenführen

```
git fetch origin main
git checkout -B main origin/main
git merge --no-ff <zweig>
node werkzeug/pruefen.mjs --basis origin/main    # auf dem Merge-Stand
git push origin main
```

Prüfe vorher, dass der Merge inhaltlich nichts verliert:
`git diff --stat <zweig> HEAD` muss leer sein.

## Danach nachsehen, nicht annehmen

Der Push allein ist kein Nachweis. Über die GitHub-Actions-Werkzeuge den Lauf
„Veröffentlichen" holen und beide Jobs auf `success` prüfen. Im Log des
Jobs `veroeffentlichen` steht, welche Dateien hochgeladen wurden — es müssen
genau die sechs der App plus `.nojekyll` sein.

Die Live-Adresse ist aus dieser Umgebung nicht abrufbar (der Proxy lehnt
`github.io` ab). Sag das offen und bitte um eine Sichtprüfung der
Versionsnummer in der Fusszeile, statt „ist live" zu behaupten.

## Zurückrollen

```
git revert --no-edit <commit>
# In sw.js eine NEUE, HÖHERE Nummer setzen — nicht die alte wiederherstellen.
git push origin main
```

Warum höher: Die App vergleicht laufende und Server-Fassung und bietet bei
jedem Unterschied das Aktualisieren an; eine niedrigere Nummer erzeugt
verwirrende Anzeigen. Was ein Rückzug nicht rückgängig macht, sind Daten,
die eine neuere Fassung schon im Speicher der Nutzer angelegt hat — dafür
gibt es `SCHEMA` in `app.js`.

## Nicht tun

- Kein Jekyll-Workflow. Schlägt GitHub einen vor: löschen. Er kennt die
  Prüfungen nicht und konkurriert mit `deploy.yml` um dieselbe Gruppe.
- Pages-Quelle bleibt **GitHub Actions**, nicht „Deploy from a branch".
- Nie auf `main` entwickeln.
