# Betrieb

Diese App hat keinen Server. Sie besteht aus statischen Dateien, die GitHub
Pages ausliefert; alles Weitere passiert im Browser des Nutzers. Vieles, was
ein Deployment sonst braucht, entfällt deshalb — und zwar begründet, nicht
aus Nachlässigkeit.

| Übliches Thema | Hier |
|---|---|
| Dockerfile, Ports, Prozessverwaltung | entfällt — es läuft kein Prozess |
| Laufzeitumgebung, Node-Version | entfällt — der Browser ist die Laufzeit |
| Abhängigkeiten, Lockfile | keine. `app.js`, `index.html`, `sw.js`, drei Bilder |
| `.env`, Secrets, Schlüsselrotation | keine vorhanden. Die App kennt keine Zugangsdaten |
| Datenbank, Migrationen | keine. Die Daten liegen im `localStorage` des Geräts |
| Serverprotokolle, APM | entfällt. Fehler erscheinen im roten Kasten beim Nutzer |

Node wird nur in der Prüfung auf GitHub gebraucht, nie zum Bauen.

## Veröffentlichen

Der Ablauf steht in `.github/workflows/deploy.yml`. Bei jedem Push auf `main`:

1. `pruefen.yml` läuft: JavaScript-Syntax, Manifest, alle in `app.js`
   angesprochenen Kennungen sind in `index.html` vorhanden, keine Kennung
   gegenüber dem Vorgänger verschwunden.
2. Die Versionsnummer in `sw.js` muss sich geändert haben, sobald
   `index.html` oder `app.js` angefasst wurden. Sonst holen die Geräte die
   Änderung nicht.
3. Erst danach wird auf Pages veröffentlicht.

**Einmalige Einstellung:** unter *Settings → Pages → Build and deployment →
Source* muss **GitHub Actions** stehen. Steht dort „Deploy from a branch",
läuft dieser Weg ins Leere und jeder Push geht ungeprüft live — genau so kam
in v32 ein Absturz auf die Geräte.

## Eine Änderung herausgeben

1. Auf einem Zweig arbeiten, nie direkt auf `main`.
2. **Versionsnummer in `sw.js` hochzählen.** Die einzige Stelle.
3. `CHANGELOG.md` ergänzen.
4. Zusammenführen. Die Prüfung entscheidet, ob veröffentlicht wird.
5. Nach ein bis zwei Minuten die Adresse öffnen und nachsehen, ob unten die
   neue Nummer steht.

## Zurückrollen

Es gibt keine Datenbank und keinen Zustand auf dem Server, deshalb ist ein
Rückzug vollständig:

```
git revert --no-edit <commit>      # oder mehrere
# In sw.js eine NEUE, höhere Nummer setzen — nicht die alte wiederherstellen.
git commit --amend                  # Versionsänderung in denselben Commit
git push origin main
```

Warum eine neue Nummer statt der alten: Die App vergleicht die laufende
Fassung mit der auf dem Server und bietet bei jedem Unterschied das
Aktualisieren an. Eine niedrigere Nummer würde zwar erkannt, sorgt aber für
verwirrende Anzeigen („v37 · v35 verfügbar"). Eine höhere ist eindeutig.

Geräte holen die neue Fassung beim nächsten Öffnen. Wer festhängt, hat im
roten Fehlerkasten den Knopf **App neu laden**, der die Zwischenspeicher
leert.

**Was ein Rückzug nicht rückgängig macht:** Daten, die eine neuere Fassung
bereits im Speicher der Nutzer angelegt hat. Deshalb steht in `cfg.fassung`
ein Datenstand (`SCHEMA` in `app.js`). Trifft eine ältere App auf neuere
Daten, sagt sie das, statt sie stillschweigend zu beschneiden.

## Daten der Nutzer

Es gibt nichts zentral zu sichern — die Daten liegen ausschließlich auf den
Geräten. Die Sicherung ist eine JSON-Datei, die der Nutzer selbst anlegt
(⚙ → Sicherung), auf Wunsch automatisch in einen gewählten Ordner.

Das Format ist mit `fassung: 2` gekennzeichnet und wird beim Einlesen
geprüft: nur bekannte Felder in erwarteter Form werden übernommen
(`paketSaeubern` in `app.js`). Einlesen **ersetzt** den Datensatz, es ergänzt
ihn nicht; die App fragt vorher nach.

Sicherungsdateien enthalten Noten, Fehlzeiten, Namen von Lehrkräften und
Fotos. Sie stehen in `.gitignore` und gehören niemals ins Repository.

## Wenn du selbst hostest

Jeder Webserver, der statische Dateien mit HTTPS ausliefert, genügt. Nötig:

- HTTPS — ohne das kein Service Worker und keine Installation
- `sw.js` mit kurzer oder ohne Zwischenspeicherung ausliefern, damit die
  Versionsprüfung greift
- die Dateien im selben Verzeichnis belassen; die Pfade sind relativ

Zum Ausprobieren genügt lokal:

```
python3 -m http.server 8000
```

und `http://localhost:8000` öffnen — `localhost` gilt als sicherer Kontext,
der Service Worker läuft dort also auch ohne Zertifikat.
