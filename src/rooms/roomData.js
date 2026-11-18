// Ravenswood · 2,5D-Rauminstanzen – Daten der neun Zimmer.
//
// Alles ist in „Kacheln“ angegeben (1 Kachel ≈ 1 m). x läuft nach rechts, y nach vorne (zum Betrachter),
// h ist die Höhe. Die Rückwand (mit Tür) liegt bei y = 0.
//
// VERSTECKE: Jeder Gegenstand mit `spot` ist ein mögliches Versteck (Taste E / Knopf „durchsuchen“). Die IDs müssen
// mit shared/roomSpots.js übereinstimmen (ein Test prüft das). Wo in einem Spiel wirklich etwas liegt, entscheidet
// zufällig der Server. `text` ist nur Stimmung und darf deshalb keine falsche Spur legen.
// Neue Gegenstände: einfach eine Zeile in `objects` ergänzen (Kollision kommt automatisch aus x, y, w, d).

export const COLS = 15
export const ROWS = 10
export const DOOR = { x: 6.8, y: 0, w: 1.4, d: 0.6 }
export const SPAWN = { x: 7.5, y: 1.9 }
export const PLAYER = { hx: 0.22, hy: 0.14 } // halbe Größe der Standfläche
export const REACH = 0.85 // wie nah man für „untersuchen“ sein muss

const o = (kind, x, y, w, d, h, extra = {}) => ({ kind, x, y, w, d, h, solid: true, ...extra })
const chair = (x, y, face, extra = {}) => o('chair', x, y, 0.7, 0.7, 0.95, { face, ...extra })

export const ROOM_MAPS = {
  kitchen: {
    style: 'checker', floor: ['#d9d2c0', '#8fa092'], wall: { style: 'tiles', base: '#cdd5cb', trim: '#7d9487' },
    tint: 'rgba(60,90,70,.10)', curtain: '#4f7a62',
    windows: [{ x: 0.9, w: 1.7 }, { x: 11.6, w: 1.7 }],
    decor: [{ kind: 'shelf', x: 4.6, z: 1.45, w: 1.1 }, { kind: 'sconce', x: 6.1 }],
    rugs: [{ x: 0.55, y: 4.35, w: 3.3, d: 3.75, c1: '#3f5f66', c2: '#e8dcc2', style: 'border' }],
    lights: [{ x: 7.5, y: 1.0, z: 1.9, r: 4.2 }, { x: 2.0, y: 3, z: 2.2, r: 3 }],
    objects: [
      o('counter', 0.3, 0, 2.7, 1, 0.95, { sink: true, spot: 'spuele', label: 'Spüle', text: 'Ein Stapel Teller wartet auf den Abwasch. Das Wasser im Becken ist längst kalt.' }),
      o('stove', 3.0, 0, 1.4, 1, 0.95, { spot: 'herd', label: 'Herd', text: 'Vier gusseiserne Platten, ein schwerer Topf mit Deckel. Es riecht nach Rosmarin.' }),
      o('counter', 4.4, 0, 1.4, 1, 0.95),
      o('fridge', 9.4, 0, 1.3, 1, 2.0, { spot: 'kuehlschrank', label: 'Kühlschrank', text: 'Kalte Luft schlägt dir entgegen. Butter, Milch, eine Schale Pudding.' }),
      o('counter', 10.7, 0, 4.0, 1, 0.95, { spot: 'arbeitsplatte', label: 'Arbeitsplatte', text: 'Messerblock, Schneidebrett, Brotkrümel – die übliche Unordnung einer großen Küche.' }),
      o('island', 5.2, 4.3, 4.2, 1.6, 0.95, { spot: 'kochinsel', label: 'Kochinsel', text: 'Eine Schicht Mehl liegt auf dem Holz. Daneben eine Schüssel mit Teig, der langsam aufgeht.' }),
      o('stool', 5.7, 6.3, 0.6, 0.6, 0.7), o('stool', 7.1, 6.3, 0.6, 0.6, 0.7), o('stool', 8.4, 6.3, 0.6, 0.6, 0.7),
      o('table', 1.0, 5.6, 2.4, 1.5, 0.8, { cloth: '#b4413f' }),
      chair(1.2, 4.75, 'n'), chair(2.4, 4.75, 'n'),
      o('crates', 12.2, 6.6, 1.8, 1.4, 1.0, { spot: 'vorratskisten', label: 'Vorratskisten', text: 'Kartoffeln, Zwiebeln, ein Sack Mehl, alles sorgfältig in Stroh gepackt.' }),
      o('barrel', 11.3, 7.6, 0.8, 0.8, 0.9),
      o('planter', 13.3, 3.2, 0.8, 0.8, 0.7, { plant: 'herbs' }),
    ],
  },

  ballroom: {
    style: 'parquet', floor: ['#b68b57', '#a47a49'], wall: { style: 'paper', base: '#d8c8a0', trim: '#a8864f' },
    tint: 'rgba(120,80,30,.08)', curtain: '#8c2b3a',
    windows: [{ x: 1.8, w: 1.3, tall: true }, { x: 3.9, w: 1.3, tall: true }, { x: 9.8, w: 1.3, tall: true }, { x: 11.9, w: 1.3, tall: true }],
    decor: [{ kind: 'sconce', x: 6.35 }, { kind: 'sconce', x: 8.65 }],
    rugs: [{ x: 4.3, y: 3.1, w: 6.4, d: 4.4, c1: '#7d2a38', c2: '#d8b66a', style: 'medallion' }],
    lights: [{ x: 7.5, y: 4, z: 2.4, r: 6.5 }, { x: 6.35, y: 1, z: 1.7, r: 2.6 }, { x: 8.65, y: 1, z: 1.7, r: 2.6 }],
    objects: [
      o('piano', 0.8, 1.3, 3.3, 2.0, 1.1, { spot: 'fluegel', label: 'Flügel', text: 'Ein schwarzer Konzertflügel. Auf dem Notenpult liegt ein Walzer, aufgeschlagen bei Seite drei.' }),
      o('stool', 2.0, 3.7, 1.2, 0.6, 0.5),
      o('pillar', 0.7, 6.3, 0.9, 0.9, 2.4), o('pillar', 13.4, 6.3, 0.9, 0.9, 2.4),
      o('table', 9.9, 1.3, 2.1, 1.1, 0.85, { cloth: '#efe7d4', glasses: true, spot: 'bufett', label: 'Büfett', text: 'Sektgläser, Canapés und ein Silbertablett mit Pralinen. Das Fest hat gerade erst begonnen.' }),
      o('statue', 13.6, 1.1, 1.1, 1.1, 1.9, { spot: 'statue', label: 'Marmorstatue', text: 'Eine Tänzerin aus weißem Marmor, den Arm in einer anmutigen Drehung erhoben.' }),
      o('bench', 1.0, 8.4, 3.0, 0.8, 0.7), o('bench', 11.0, 8.4, 3.0, 0.8, 0.7),
      o('gramophone', 12.2, 3.7, 0.9, 0.8, 1.0, { spot: 'grammophon', label: 'Grammophon', text: 'Eine Schellackplatte liegt auf dem Teller. Leise knistert die Nadel.' }),
    ],
  },

  garden: {
    style: 'stone', floor: ['#9aa38f', '#7f8a77'], wall: { style: 'glass', base: '#2c4a43', trim: '#d6e0d2' },
    tint: 'rgba(40,110,90,.10)', curtain: '#3d6b55',
    windows: [], decor: [{ kind: 'sconce', x: 4.2 }, { kind: 'sconce', x: 10.8 }],
    rugs: [{ x: 4.7, y: 3.6, w: 5.6, d: 3.6, c1: '#6b8f5a', c2: '#8cae74', style: 'moss' }],
    lights: [{ x: 4.2, y: 1, z: 1.7, r: 3 }, { x: 10.8, y: 1, z: 1.7, r: 3 }, { x: 7.5, y: 5, z: 1.5, r: 4 }],
    objects: [
      o('fountain', 5.6, 4.2, 3.8, 2.4, 0.9, { spot: 'brunnen', label: 'Springbrunnen', text: 'Das Wasser plätschert gleichmäßig. Ein paar Münzen glitzern auf dem Grund.' }),
      o('palm', 0.5, 0.9, 1.0, 0.9, 2.4), o('palm', 13.5, 0.9, 1.0, 0.9, 2.4),
      o('bed', 2.2, 0.3, 3.0, 0.9, 0.5, { spot: 'blumenbeet', label: 'Blumenbeet', text: 'Tulpen, Narzissen und Vergissmeinnicht. Die Erde ist feucht und dunkel.' }),
      o('bed', 9.8, 0.3, 3.0, 0.9, 0.5, { spot: 'rosenbeet', label: 'Rosenbeet', text: 'Sorgfältig geschnittene Rosen in drei Farben. Der Duft ist beinahe zu stark.' }),
      o('bench', 1.0, 5.2, 2.8, 0.8, 0.7), o('bench', 11.2, 5.2, 2.8, 0.8, 0.7),
      o('table', 11.5, 7.5, 1.3, 1.3, 0.8, { round: true, spot: 'bistrotisch', label: 'Bistrotisch', text: 'Zwei Teetassen, eine Zuckerdose, ein zusammengefaltetes Taschentuch.' }),
      chair(10.3, 7.8, 'w'), chair(12.9, 7.8, 'e'),
      o('planter', 1.8, 7.8, 0.9, 0.9, 0.8, { plant: 'fern' }), o('planter', 4.4, 8.3, 0.9, 0.9, 0.8, { plant: 'fern' }),
    ],
  },

  dining: {
    style: 'planks', floor: ['#6b4a35', '#5d3f2c'], wall: { style: 'damask', base: '#8c3b3d', trim: '#c9a35f' },
    tint: 'rgba(110,40,30,.10)', curtain: '#a8962f',
    windows: [],
    decor: [{ kind: 'painting', x: 5.2, z: 1.45, w: 1.2, h: 0.9, variant: 0 }, { kind: 'painting', x: 9.8, z: 1.45, w: 1.2, h: 0.9, variant: 1 }, { kind: 'sconce', x: 6.35 }, { kind: 'sconce', x: 8.65 }],
    rugs: [{ x: 2.4, y: 2.7, w: 10.2, d: 4.9, c1: '#6e1f2c', c2: '#d1ac63', style: 'border' }],
    lights: [{ x: 7.5, y: 4.8, z: 2.2, r: 6 }, { x: 6.35, y: 1, z: 1.6, r: 2.4 }, { x: 8.65, y: 1, z: 1.6, r: 2.4 }],
    objects: [
      o('table', 3.4, 3.7, 8.2, 2.4, 0.85, { cloth: '#efe9dc', set: true, spot: 'festtafel', label: 'Festtafel', text: 'Für acht Personen gedeckt: Porzellan, Silberbesteck und drei brennende Kerzen.' }),
      chair(4.0, 3.0, 'n'), chair(5.8, 3.0, 'n'), chair(7.6, 3.0, 'n'), chair(9.4, 3.0, 'n'),
      chair(4.0, 6.2, 's'), chair(5.8, 6.2, 's'), chair(7.6, 6.2, 's'), chair(9.4, 6.2, 's'),
      chair(2.55, 4.5, 'w'), chair(11.75, 4.5, 'e'),
      o('cabinet', 0.5, 0, 4.2, 1.0, 1.1, { spot: 'anrichte', label: 'Anrichte', text: 'Schubladen voller Servietten, Kerzen und poliertem Besteck.' }),
      o('cabinet', 11.0, 0, 3.4, 1.0, 2.2, { glass: true, spot: 'vitrine', label: 'Vitrine', text: 'Feines Porzellan hinter geschliffenem Glas. Jedes Stück hat seinen festen Platz.' }),
      o('cart', 0.6, 8.0, 1.5, 0.9, 0.95, { spot: 'servierwagen', label: 'Servierwagen', text: 'Karaffen mit Wein und Wasser, daneben ein Korb mit frischem Brot.' }),
      o('planter', 13.6, 8.2, 0.9, 0.9, 0.9, { plant: 'fern' }),
    ],
  },

  billiard: {
    style: 'carpet', floor: ['#2f5c4c', '#274d40'], wall: { style: 'panel', base: '#3e4a3f', trim: '#a9824f' },
    tint: 'rgba(20,70,60,.12)', curtain: '#6d2a33',
    windows: [{ x: 1.0, w: 1.4 }, { x: 13.2, w: 1.3 }],
    decor: [{ kind: 'dartboard', x: 6.05, z: 1.9 }, { kind: 'painting', x: 9.5, z: 1.3, w: 1.2, h: 0.9, variant: 1 }],
    rugs: [{ x: 3.4, y: 2.9, w: 8.2, d: 4.6, c1: '#2a4e44', c2: '#b79a58', style: 'border' }],
    lights: [{ x: 7.5, y: 5.2, z: 2.2, r: 6 }, { x: 7.5, y: 0.9, z: 1.7, r: 3 }],
    objects: [
      o('pool', 4.2, 3.5, 6.6, 3.4, 0.95, { spot: 'billardtisch', label: 'Billardtisch', text: 'Die Kugeln liegen mitten im Spiel. Auf der Bande steht ein halb volles Glas.' }),
      o('cuerack', 10.9, 0, 1.9, 0.6, 1.9, { spot: 'queuestaender', label: 'Queueständer', text: 'Sechs polierte Queues, ordentlich aufgereiht, daneben ein Würfel blaue Kreide.' }),
      o('cabinet', 2.9, 0, 2.6, 1.0, 1.4, { glass: true, spot: 'pokalschrank', label: 'Pokalschrank', text: 'Pokale des „Ravenswood Billard Clubs“, jeder mit Jahreszahl und Namen.' }),
      o('armchair', 0.8, 2.4, 1.3, 1.2, 1.0, { color: '#7b3b2e' }), o('armchair', 0.8, 4.8, 1.3, 1.2, 1.0, { color: '#7b3b2e' }),
      o('cart', 12.6, 3.2, 1.5, 0.9, 0.95, { spot: 'barwagen', label: 'Barwagen', text: 'Eine Karaffe Whisky, Kristallgläser und ein Eiskübel aus Silber.' }),
      o('planter', 13.4, 8.3, 0.9, 0.9, 0.9, { plant: 'fern' }),
    ],
  },

  lounge: {
    style: 'carpet', floor: ['#6d3a4c', '#5d2f40'], wall: { style: 'damask', base: '#6f4458', trim: '#c9a35f' },
    tint: 'rgba(110,40,80,.10)', curtain: '#3d2a55',
    windows: [],
    decor: [{ kind: 'painting', x: 3.3, z: 2.08, w: 1.8, h: 0.5, variant: 2 }, { kind: 'sconce', x: 6.2 }],
    rugs: [{ x: 1.9, y: 3.4, w: 11.2, d: 5.2, c1: '#4a2437', c2: '#c9a35f', style: 'border' }],
    lights: [{ x: 3.3, y: 1.2, z: 0.6, r: 5, fire: true }, { x: 0.7, y: 5, z: 1.9, r: 3 }, { x: 13.8, y: 5, z: 1.9, r: 3 }],
    objects: [
      o('fireplace', 1.3, 0, 4.0, 1.2, 2.0, { spot: 'kamin', label: 'Kamin', text: 'Das Feuer knackt und wärmt den ganzen Raum. Auf dem Sims stehen zwei Kerzen.' }),
      o('shelf', 10.0, 0, 3.6, 0.9, 2.2, { spot: 'buecherregal', label: 'Bücherregal', text: 'Romane, Gedichtbände und eine kleine Spieldose zwischen den Büchern.' }),
      o('sofa', 2.2, 5.2, 3.6, 1.2, 0.95, { color: '#9c3549', spot: 'sofa', label: 'Sofa', text: 'Weiche Samtkissen in Gold und Creme. Man versinkt fast darin.' }),
      o('sofa', 9.2, 5.2, 3.6, 1.2, 0.95, { color: '#9c3549' }),
      o('table', 6.3, 5.5, 2.4, 1.2, 0.5, { spot: 'couchtisch', label: 'Couchtisch', text: 'Zwei Gläser, ein Aschenbecher und eine Schale mit Nüssen.' }),
      o('armchair', 6.3, 7.8, 1.5, 1.2, 1.0, { color: '#583a77' }),
      o('lamp', 0.7, 4.8, 0.6, 0.6, 2.0), o('lamp', 13.8, 4.8, 0.6, 0.6, 2.0),
      o('planter', 13.5, 8.2, 0.9, 0.9, 0.9, { plant: 'fern' }),
    ],
  },

  hall: {
    style: 'marble', floor: ['#d6d0c4', '#716b63'], wall: { style: 'panel', base: '#7d725f', trim: '#c9b27a' },
    tint: 'rgba(90,70,40,.10)', curtain: '#6d2a33',
    windows: [],
    decor: [{ kind: 'banner', x: 5.5 }, { kind: 'banner', x: 9.5 }, { kind: 'sconce', x: 6.35 }, { kind: 'sconce', x: 8.65 }],
    rugs: [{ x: 6.3, y: 0.6, w: 2.4, d: 8.8, c1: '#7d1f2e', c2: '#d1ac63', style: 'runner' }],
    lights: [{ x: 7.5, y: 4.5, z: 2.4, r: 6.5 }, { x: 6.35, y: 1, z: 1.7, r: 2.4 }, { x: 8.65, y: 1, z: 1.7, r: 2.4 }],
    objects: [
      o('clock', 0.6, 0, 1.0, 0.8, 2.4, { spot: 'standuhr', label: 'Standuhr', text: 'Das Pendel schwingt gleichmäßig. Jede Viertelstunde schlägt die Uhr mit tiefem Klang.' }),
      o('console', 1.9, 0, 1.3, 0.7, 0.9, { spot: 'konsolentisch', label: 'Konsolentisch', text: 'Eine Vase mit frischen Lilien und eine Schale für Visitenkarten.' }),
      o('armor', 3.5, 0, 1.0, 0.9, 2.2, { spot: 'ruestung', label: 'Rüstung', text: 'Eine polierte Ritterrüstung mit Lanze. Das Visier ist geschlossen.' }),
      o('stairs', 10.2, 0, 4.4, 2.4, 1.9, { spot: 'treppe', label: 'Treppe', text: 'Ein roter Läufer führt die breite Treppe hinauf ins Obergeschoss.' }),
      o('bench', 1.2, 6.4, 2.6, 0.8, 0.7), o('bench', 11.2, 6.4, 2.6, 0.8, 0.7),
      o('planter', 0.5, 8.4, 0.9, 0.9, 1.0, { plant: 'fern' }), o('planter', 13.7, 8.4, 0.9, 0.9, 1.0, { plant: 'fern' }),
    ],
  },

  study: {
    style: 'planks', floor: ['#5a3d2b', '#4e3324'], wall: { style: 'panel', base: '#4a5070', trim: '#b8a06a' },
    tint: 'rgba(30,40,90,.12)', curtain: '#2f3b63',
    windows: [],
    decor: [{ kind: 'sconce', x: 5.6 }, { kind: 'sconce', x: 9.4 }],
    rugs: [{ x: 3.9, y: 2.3, w: 6.2, d: 4.4, c1: '#2c3558', c2: '#b79a58', style: 'border' }],
    lights: [{ x: 5.6, y: 1, z: 1.7, r: 2.6 }, { x: 9.4, y: 1, z: 1.7, r: 2.6 }, { x: 6.9, y: 4, z: 1.4, r: 3.4 }],
    objects: [
      o('shelf', 0.5, 0, 4.6, 0.9, 2.3, { spot: 'buecherwand', label: 'Bücherwand', text: 'Ledergebundene Bände über Recht, Geschichte und Landwirtschaft.' }),
      o('shelf', 10.0, 0, 4.5, 0.9, 2.3, { spot: 'aktenregal', label: 'Aktenregal', text: 'Ordner, sauber nach Jahren beschriftet.' }),
      o('desk', 5.2, 3.6, 3.6, 1.7, 0.9, { spot: 'schreibtisch', label: 'Schreibtisch', text: 'Ein Briefbeschwerer, ein Tintenfass und ein Stapel Briefpapier mit dem Wappen von Ravenswood.' }),
      chair(6.5, 2.75, 'n', { color: '#3d2a24' }),
      o('safe', 12.6, 3.2, 1.2, 1.0, 1.1, { spot: 'tresor', label: 'Tresor', text: 'Ein schwerer Stahltresor mit Zahlenschloss.' }),
      o('globe', 1.0, 3.4, 0.9, 0.9, 1.2, { spot: 'globus', label: 'Globus', text: 'Ein alter Globus, der sich aufklappen lässt. Innen ist Platz für Karaffen.' }),
      o('armchair', 1.2, 6.2, 1.5, 1.3, 1.0, { color: '#3d4a6d' }),
      o('table', 3.0, 6.5, 0.8, 0.8, 0.7),
      o('cabinet', 13.1, 6.3, 1.3, 0.9, 1.3, { spot: 'aktenschrank', label: 'Aktenschrank', text: 'Drei Schubladen mit Messinggriffen, die unterste klemmt ein wenig.' }),
    ],
  },

  library: {
    style: 'planks', floor: ['#7a5a3d', '#6b4d33'], wall: { style: 'panel', base: '#5a4638', trim: '#b8965a' },
    tint: 'rgba(80,50,20,.12)', curtain: '#5a2a33',
    windows: [],
    decor: [{ kind: 'sconce', x: 5.9 }, { kind: 'sconce', x: 9.1 }],
    rugs: [{ x: 4.1, y: 5.4, w: 5.0, d: 3.9, c1: '#4f2330', c2: '#c9a35f', style: 'border' }],
    lights: [{ x: 5.9, y: 1, z: 1.7, r: 2.6 }, { x: 9.1, y: 1, z: 1.7, r: 2.6 }, { x: 6.6, y: 7.0, z: 1.2, r: 3.4 }, { x: 0.9, y: 6.0, z: 1.6, r: 2.6 }],
    objects: [
      o('shelf', 0.4, 0, 4.4, 0.9, 2.4, { spot: 'chroniken', label: 'Regal: Chroniken', text: 'Die Familienchronik von Ravenswood, Band für Band, zurück bis ins Jahr 1702.' }),
      o('ladder', 4.9, 0, 0.5, 0.6, 2.1),
      o('shelf', 9.6, 0, 5.0, 0.9, 2.4, { spot: 'naturkunde', label: 'Regal: Naturkunde', text: 'Bücher über Pflanzen, Vögel und Pilze der Region, reich bebildert.' }),
      o('shelf', 2.4, 3.5, 4.2, 0.8, 2.2, { spot: 'landkarten', label: 'Regal: Landkarten', text: 'Zusammengerollte Pläne des Anwesens und Karten der Umgebung.' }),
      o('shelf', 8.6, 3.5, 4.2, 0.8, 2.2, { spot: 'gesellschaft', label: 'Regal: Gesellschaft', text: 'Gästebücher vergangener Feste, voller Unterschriften und kleiner Widmungen.' }),
      o('table', 5.2, 6.6, 2.8, 1.4, 0.8, { items: 'book', spot: 'lesetisch', label: 'Lesetisch', text: 'Ein aufgeschlagenes Buch über die Geschichte des Hauses, daneben eine brennende Kerze.' }),
      chair(5.5, 5.85, 'n'), chair(7.1, 8.05, 's'),
      o('armchair', 1.2, 6.4, 1.5, 1.3, 1.0, { color: '#7a3b3b' }), o('lamp', 0.5, 5.4, 0.6, 0.6, 1.9),
      o('globe', 12.6, 6.8, 0.9, 0.9, 1.2, { spot: 'globus', label: 'Globus', text: 'Ein alter Globus, der sich aufklappen lässt. Innen ist Platz für Karaffen.' }),
      o('planter', 13.5, 8.4, 0.9, 0.9, 1.0, { plant: 'fern' }),
    ],
  },
}

export const roomMap = id => ROOM_MAPS[id]
