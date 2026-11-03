# Ravenswood

Ein deutsches Detektivspiel: sechs Räume erkunden, drei Verdächtige befragen und den Mord an Reginald Blackwood aufklären.

## Herunterladen und spielen

**[SPIEL HERUNTERLADEN – Ravenswood-Offline.zip](https://github.com/metinbabayev2006-lgtm/ravenswood/releases/latest/download/Ravenswood-Offline.zip)**

1. ZIP herunterladen.
2. ZIP vollständig entpacken (Windows: Rechtsklick → **Alle extrahieren**).
3. **Ravenswood.html** im entpackten Ordner doppelt anklicken und mit Chrome, Edge oder Firefox öffnen.
4. Auf **Spiel starten** klicken.

Keine Installation, kein Konto, kein Python, kein Node und kein lokaler Server zum Spielen nötig. Bilder und Musik sind enthalten. Nicht die ZIP-Vorschau oder den GitHub-Quelltext öffnen.

Falls der direkte Download noch nicht bereitsteht: Unter **[Releases](https://github.com/metinbabayev2006-lgtm/ravenswood/releases)** die neueste veröffentlichte Version öffnen und **Ravenswood-Offline.zip** herunterladen. **Source code (zip)** ist für die Entwicklung gedacht.

Spielstände werden lokal gespeichert, soweit der Browser lokalen Dateien Speicher erlaubt. Verschieben oder Umbenennen der HTML-Datei kann zu einem anderen Spielstand führen. Notizen und Spielstände werden nicht zu GitHub übertragen.

## Entwickeln

Voraussetzung: Node.js 24 und Git.

```powershell
git clone https://github.com/metinbabayev2006-lgtm/ravenswood.git
cd ravenswood
npm ci
npm run dev -- --host 127.0.0.1
```

Die im Terminal angezeigte lokale Adresse öffnen.

- `src/App.jsx`: Oberfläche und Spielstand
- `src/case.js`: Räume, Aussagen und Falllösung (Spoiler)
- `src/App.css`: Gestaltung und Animationen
- `src/assets/`: benötigte Originalbilder und Musik
- `scripts/build-offline.mjs`: exportiert die eigenständige HTML-Datei

`npm run offline` erstellt den Produktionsbuild und den Ordner `offline/` mit der HTML-Datei und Anleitung.

## Änderungen hochladen

Änderungen werden im Projektordner bearbeitet. Mit PowerShell:

```powershell
.\Aktualisieren.ps1 -Nachricht "Raumwechsel verbessert"
```

Das Skript prüft den Build, erstellt einen Git-Commit und lädt Änderungen in dieses Repository. GitHub Actions erzeugt nach einem Push auf `main` automatisch eine neue Download-Version. Der oben stehende Download-Link bleibt gleich. GitHub-Anmeldung und Schreibzugriff sind zum Hochladen nötig.

Alternativ:

```powershell
npm run offline
git add .
git commit -m "Spiel verbessert"
git push
```

Der Fortschritt des Download-Builds ist unter **[Actions](https://github.com/metinbabayev2006-lgtm/ravenswood/actions)** sichtbar. Die bestehende Sites-Webseite wird dadurch nicht automatisch aktualisiert.

## Herkunft und Stand

Originalprojekt, Originalbilder und Musik: [Apollo-Blaze/Murder-Mystery](https://github.com/Apollo-Blaze/Murder-Mystery). Diese Fassung ergänzt deutsche feste Dialoge, einen vollständig spielbaren Fall, Hinweise, Notizen, Raumkarte und Animationen. Es wird kein externer KI-Dienst benötigt. Die Originaldateien enthalten keine Lizenzdatei; dieses Repository vergibt keine zusätzliche Lizenz für fremde Inhalte.

Der Produktionsbuild, zentrale Spielablauf und die Raumnavigation wurden geprüft. Der Offline-Export wurde auf JavaScript-Syntax und eingebettete Ressourcen geprüft; ein direkter file:-Browserdurchlauf war im verwendeten Browserwerkzeug gesperrt. Die Falllösung ist im Frontend lesbar.
