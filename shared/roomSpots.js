// Ravenswood · Verstecke in den Raum-Instanzen (gemeinsam für Server und Browser).
//
// Jedes untersuchbare Möbel hat eine feste ID. Zu Beginn jedes Spiels wählt der Server zufällig aus, wo etwas
// versteckt ist (server/game.js → hideClues). Das bleibt geheim auf dem Server; jede Person sieht nur ihre eigenen Funde.
//
// FÜR DIE KARTEN SPÄTER: Ein Fund ist im Moment nur { kind: 'hinweis' }. Wer die Karten baut, ändert hideClues so,
// dass dort z. B. { kind: 'karte', card: 'seil' } steht – Browser und Server reichen das Objekt unverändert durch.

export const SPOTS = {
  kitchen: ['spuele', 'herd', 'kuehlschrank', 'arbeitsplatte', 'kochinsel', 'vorratskisten'],
  ballroom: ['fluegel', 'bufett', 'statue', 'grammophon'],
  garden: ['brunnen', 'blumenbeet', 'rosenbeet', 'bistrotisch'],
  dining: ['festtafel', 'anrichte', 'vitrine', 'servierwagen'],
  billiard: ['billardtisch', 'queuestaender', 'pokalschrank', 'barwagen'],
  lounge: ['kamin', 'buecherregal', 'sofa', 'couchtisch'],
  hall: ['standuhr', 'konsolentisch', 'ruestung', 'treppe'],
  study: ['buecherwand', 'aktenregal', 'schreibtisch', 'tresor', 'globus', 'aktenschrank'],
  library: ['chroniken', 'naturkunde', 'landkarten', 'gesellschaft', 'lesetisch', 'globus'],
}

export const CLUES_PER_ROOM = 1      // wie viele Verstecke pro Zimmer etwas enthalten
export const SEARCHES_PER_VISIT = 2  // wie viele Möbel man pro Raumbesuch durchsuchen darf
