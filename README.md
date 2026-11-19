# Ravenswood · Spielbrett & Multiplayer

Diese Fassung enthält ausschließlich die Aufgabenbereiche **Matin und Sophie**.

## Matin
Spielbrett und Spielfiguren
- Drehbares 3D-Spielbrett mit neun Zimmern, sichtbaren Türen und einer Draufsicht.
- Sechs farbige Spielfiguren mit Markierung der eigenen und der aktiven Figur.
- Animierte Bewegungen entlang der Flurwege und hervorgehobene erreichbare Felder.
- Zimmer auf dem Spielbrett an die Einrichtung der begehbaren 2,5D-Räume angepasst.
- Dächer nach einem ersten Entwurf wieder entfernt. Figuren in Zimmern bleiben auf dem Brett ausgeblendet.
Würfel, Bewegung und Türen
- Zwei serverseitig gewürfelte Würfel mit Wurfanimation und Anzeige der verfügbaren Schritte.
- Verbleibende Schritte nach einem Teilzug gespeichert und angezeigt.
- Zugwechsel und Geheimgänge zwischen den gegenüberliegenden Eckzimmern umgesetzt.
- Figuren halten vor der Zimmertür. „Untersuchen“ erscheint nur direkt am Eingang und der Spieler entscheidet selbst, ob er hineingeht.
Erweiterungen für die aktuelle lokale Fassung
- Normalmodus ohne Mörder und Imposter-Modus mit geheimer Mörderrolle vorgesehen.
- Regeln für das Ausscheiden, den Zuschauermodus und das Entfernen der Figur beim Verlassen der Partie festgelegt.
- Einen versteckten Security Room hinter der Bücherwand im Arbeitszimmer vorgesehen. Wer den Eingang entdeckt, kann im Imposter-Modus die Kameras der neun Zimmer aufrufen.
- Anforderungen für flüssigere Multiplayer-Bewegungen und die Tests mit mehreren Spielern und Bots formuliert.
Veröffentlichung und Zusammenarbeit
- Erste Demo als Ravenswood auf GitHub bereitgestellt und den automatischen Offline-Download eingerichtet.
- Den Pull Request für die 2,5D-Raum-Instanzen übernommen und die Darstellung auf dem Spielbrett daran angepasst.
- Die Online-Fassung für den Multiplayer-Test aktualisieren lassen und den neuen Namen Case Unknown festgelegt.
- Die jüngsten Änderungen zur lokalen Erprobung vorgesehen.

## Sophie

- Klarer Start mit **Neues Spiel / Beitreten**, Name und Raumcode.
- Private Lobbys für 1–6 Menschen; Code und Einladungslink lassen sich kopieren.
- Einladungslinks öffnen direkt den Beitrittsmodus.
- Exklusive Figurenauswahl; nur der Gastgeber startet die Runde.
- Gemeinsamer, servergespeicherter Spielstand; Synchronisierung ca. alle 1,2 Sekunden.
- Rückkehr nach Neuladen und gespeicherte Räume auf demselben Gerät.
- Auf Wunsch des Nutzers **keine KI-Mitspieler**.

**Jason und Max:** Karten, Kartenauswahl, Notizen, Verdacht und Anklage sind aus der aktiven Oberfläche und Serverlogik entfernt. Die Zimmerflächen bleiben für Matins Spielbrett und Zimmerzutritt nötig. Diese Fassung ist eine spielbare Multiplayer-Bewegungsdemo und kein vollständiges Detektivspiel mit Falllösung oder Siegbedingung.

## Raum-Instanzen (2,5D)

- Steht die eigene Figur in einem Zimmer, öffnet **„Raum untersuchen“** (im eigenen Zug) eine 2,5D-Ansicht dieses Zimmers. Alle neun Zimmer sind eingerichtet (Möbel mit Kollision, Licht, Fenster, Tür).
- Laufen mit **WASD / Pfeiltasten** (am Handy per Steuerkreuz), **E** durchsucht Möbel, die Tür verlässt den Raum.
- **Verstecke:** Zu Beginn jedes Spiels lost der Server pro Zimmer aus, in welchem Möbel etwas liegt (`shared/roomSpots.js`: `CLUES_PER_ROOM`). Pro Raumbesuch darf man `SEARCHES_PER_VISIT` (2) Möbel durchsuchen. Verstecke und Funde bleiben auf dem Server; jede Person sieht nur ihre eigenen Ergebnisse. Ein Fund ist derzeit `{ kind: 'hinweis' }` – für die Karten später `hideClues()` in `server/game.js` anpassen.
- Im Raum gilt **kein Würfellimit**. Die Figur verschwindet vom Brett, ihre Position bleibt gespeichert. Auf dem Brett werden keine Namen über den Zimmern angezeigt. Der Zug geht an die Nächsten weiter – kommt man wieder an die Reihe, **warten alle**, bis man den Raum verlassen hat.
- Neue Gegenstände: `src/rooms/roomData.js` (eine Zeile je Gegenstand). Ein neues Versteck braucht ein Feld `spot` und denselben Eintrag in `shared/roomSpots.js` – ein Test prüft, dass beide übereinstimmen. Die Texte sind nur Stimmung und sollen keine falsche Spur legen.
- **Gemeinsame Instanz:** Alle, die dasselbe Zimmer betreten, sind in derselben Instanz und sehen sich live herumlaufen. Wer in einem anderen Zimmer ist, hat seine eigene Instanz.
- Server: Aktionen `enterRoom` / `leaveRoom` in `server/game.js`, Zustand `inside` (`{ spielerId: zimmerId }`). Live-Positionen über `POST /api/rooms/:code/presence` (`server/presence.js`): nur im Arbeitsspeicher, nicht in `rooms.json`, eigenes Anfragelimit, ca. 6–7 Abgleiche pro Sekunde und Person, solange sich jemand bewegt.

## Zimmergestaltung und verdeckte Räume

- Die 3D-Miniaturen verwenden die Einrichtung aus `src/rooms/roomData.js`. Möbelpositionen und Farben entsprechen den begehbaren Räumen; Böden, Teppiche und Wandbilder verwenden die gemeinsamen Zeichenroutinen.
- Dunkle Walmdächer mit Schieferziegeln, Kupferkanten und Schornsteinen verdecken die Zimmer während des Spiels, auch in der Draufsicht. Fenster und Dächer verändern sich nicht durch die Belegung.
- **Villa ansehen** öffnet die Dächer auf der Startseite und in der Lobby. Nach Spielbeginn ist die Einrichtung auf dem Brett immer verdeckt.
- Nur beigetretene Spieler erhalten sichtbare Brettfiguren. Personen in Zimmern werden auf dem Brett einschließlich Namen, Ring und Pfeil ausgeblendet. Innerhalb derselben begehbaren Rauminstanz bleiben Mitspieler sichtbar.
- `src/rooms/boardVisibility.js` regelt die Sichtbarkeit für das 3D-Brett und das Ersatzbrett; `server/boardVisibility.test.js` prüft Teilnehmerzahl, Zimmerwechsel und die Sperre der Einrichtungsvorschau im laufenden Spiel.

## Online spielen

[Spielbrett öffnen](https://ravenswood.dazzlingelk.chatgpt.site)

## Lokal entwickeln

Node.js 24 verwenden. Im Projektordner:

```powershell
npm ci
npm run build
npm start
```

Dann [localhost:3001](http://localhost:3001) öffnen. Im selben WLAN `http://<IP-des-Rechners>:3001` verwenden; der Node-Server muss erreichbar sein. Ein localhost-Link funktioniert nur auf dem eigenen Gerät. Für Internet-Spiele den veröffentlichten Link nutzen.

Für HMR: Terminal 1 `npm run server`, Terminal 2 `npm run dev`. Vite leitet `/api` an Port 3001 weiter.

## Prüfen

```powershell
npm test
npm run build
node scripts/check-multiplayer.mjs http://127.0.0.1:3001
```

Tests: Lobbygrenze, eindeutige Figuren, Gastgeberrechte, Zugangsschutz, 1–6 Teilnehmer, Würfeln, Schrittgrenzen, Zimmerzutritt, Geheimgang, Zugwechsel und Übernahme bestehender Räume. Der HTTP-Test prüft sechs gleichzeitige Zugänge und dass entfernte Aktionen nicht mehr verfügbar sind. Er erzeugt einen eigenen Testraum.

## Dateien

- `src/Board.jsx`, `src/Artwork.jsx`: Brett, Möbel als Spielbrettgestaltung, Figurenbilder.
- `src/MovementControls.jsx`: Matins Zimmerauswahl und Eintrittsknopf.
- `src/StartGame.jsx`: Sophies Start- und Beitrittsformular.
- `src/App.jsx`: Lobby, Spieltisch und Anleitung.
- `src/rooms/`: 2,5D-Raum-Instanzen (`RoomInstance.jsx` Ansicht, `roomData.js` Einrichtung, `roomRenderer.js` Zeichnen, `roomPhysics.js` Kollision, `roomTags3D.js`/`RoomTagsSvg.jsx` Namensschilder auf dem Brett).
- `shared/game.js`: Figuren, Brettfelder und Wegberechnung.
- `server/game.js`: erlaubte Lobby- und Bewegungsaktionen; keine Fall- oder Kartenlogik.
- `server/index.js`: lokaler Node-Server, Speicherung in ignorierter Datei `data/rooms.json`.
- `../ravenswood-online/`: Sites-Arbeitskopie mit D1-Speicher. `node scripts/sync-hosting.mjs` übernimmt die aktiven Spielfiles dorthin. Anschließend über den Sites-Workflow bauen und veröffentlichen.

Alte Raumcodes und Spielzugänge bleiben gültig. Alte Kartendaten werden nicht ausgeliefert und bei der nächsten erfolgreichen Aktion aus dem aktiven Raum entfernt. Ein zuvor abgeschlossener Fall wird wieder als Lobby angeboten. Vorhandene frühere ZIPs und ungenutzte Originaldateien sind keine Bestandteile des aktuellen Builds.

Raumzugänge liegen im Browser; auf anderen Geräten sind sie nicht automatisch verfügbar. Notwendige Rückkehr bei Verbindungsunterbrechung erfolgt durch Neuladen. Nach Spielstart keine neuen Beitritte oder automatischer Spielerersatz. Lokal nur eine Serverinstanz pro Datenverzeichnis. Ohne Aktionen sieben Tage alte Räume werden bei einer späteren Raumerstellung bereinigt.

## Räumliche Ansicht

Die aktive Ansicht verwendet echte WebGL-3D-Geometrie (Three.js): Zimmerwände, Möbel und menschliche Spielfiguren. Kamera: 3D oder von oben. Im eigenen Zug würfeln und einen goldenen Zielpunkt oder einen erreichbaren Raum anklicken. Die Figur läuft entlang des Flurwegs; Mitspieler sehen die Animation aus demselben serverseitigen Positionswechsel. Der Knopf „Zimmer betreten“ bleibt verfügbar. Die Kamera ist gerätespezifisch gespeichert. Ohne WebGL bleibt eine spielbare Brettansicht als Rückfall erhalten. Stil: vereinfachte 3D-Figuren, keine fotorealistischen Charaktere oder freie Ich-Perspektive.

## Velvet Noir und Würfelteller

Weinrote Oberfläche, dunkles Holz, Samtfarben und warme Kerzenbeleuchtung. Die beiden räumlichen Würfel rollen im schwarzen Würfelteller und landen auf dem serverseitig bestimmten Ergebnis. Während des eigenen Wurfs sind Bewegung und weitere Aktionen kurz gesperrt. Danach erscheinen Schrittzahl und erreichbare Ziele. Die Animation berücksichtigt reduzierte Bewegung in den Systemeinstellungen. Es wird kein Ton automatisch abgespielt.

## Solo, Raumliste und Kamerasteuerung

In einer Lobby mit nur einer Person ist „Alleine starten“ verfügbar. Es spielen keine Bots mit; nach „Zug beenden“ beginnt direkt der nächste eigene Zug. Multiplayer funktioniert weiterhin für bis zu sechs Menschen, Beitritte sind vor Spielstart möglich.

Auf der Startseite entfernt das × einen gespeicherten Raumzugang vom Gerät. „Liste leeren“ entfernt alle Listeneinträge; „Rückgängig“ stellt den letzten Löschstand wieder her, solange diese Seite offen bleibt. Der Serverraum und die Zugänge anderer Mitspieler bleiben bestehen. Nach Neuladen eines gelöschten Zugangs ist dieser ohne Sicherung nicht wiederherstellbar.

Das Brett lässt sich mit Maus oder Finger ziehen und drehen. Mausrad / zwei Finger zoomen, die Pfeiltasten neben der Ansicht drehen in Schritten, „Zurücksetzen“ stellt die Kamera wieder her. „Von oben“ bleibt erhalten. Eine Drehgeste wird nicht als Spielzug gewertet; erst ein normaler Klick kann eine Figur bewegen. Der zusätzliche 2,5D-Schalter entfällt.
## Zusätzliche Spielhilfen

- **Wegvorschau:** Bei erreichbaren Zielen zeigt eine goldene Linie den Laufweg und die vom Server verwendete Schrittzahl. Maus: darüberfahren und klicken; Touch: Ziel antippen, dann erneut antippen oder „Hierhin ziehen“. Die Zimmerauswahl und Tastaturziele lösen ebenfalls eine Vorschau aus. Eine Vorschau löst noch keinen Zug aus.
- **Aktive Figur:** Ein pulsierender goldener Außenring und ein schwebender Pfeil markieren die Person am Zug; die eigene Figur behält ihre persönliche Markierung.
- **Ton:** Unter „Ton: Aus/An“ einschalten. Würfelklackern und leise Schritte werden lokal erzeugt; keine Mediendownloads, standardmäßig ausgeschaltet. Browserdaten speichern die Einstellung. Hintergrundseiten bleiben stumm.
- **Kamera-Verfolgung:** „Kamera folgt: An“ bewegt die Kamera während einer Figurenbewegung mit. Manuelles Drehen oder Zoomen hat Vorrang. Über „Zurücksetzen“ wird wieder die ganze Villa gezeigt. Standardmäßig ausgeschaltet, pro Gerät gespeichert.
- **Erste Schritte:** Beim ersten Spielstart werden drei kurze Erklärungen angezeigt. Überspringen ist möglich; später über „Kurze Einführung“ wieder aufrufen. Die Einführung bewegt keine Figur und löst keine Würfelaktion aus.

Reduzierte Bewegung in den Systemeinstellungen unterdrückt pulsierende Markierungen und Kameraverfolgung und überspringt das Ablaufen des Wegs. Würfelergebnisse bleiben unverändert serverseitig bestimmt. Automatisierte Routentests prüfen für Zimmer und Flurfelder, dass Vorschau und Server dieselbe Schrittzahl verwenden.
