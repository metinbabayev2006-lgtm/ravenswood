// Ravenswood · Live-Positionen in den Raum-Instanzen.
//
// Alle, die dasselbe Zimmer betreten haben (room.inside), teilen sich eine Instanz und sehen sich gegenseitig laufen.
// Die Positionen sind bewusst NUR im Arbeitsspeicher: Sie ändern sich mehrmals pro Sekunde, gehören nicht zum
// Spielstand, werden nicht in rooms.json geschrieben und erhöhen die Spielstand-Version nicht.
// Nach einem Serverneustart starten alle einfach wieder an der Tür.

const COLS = 15, ROWS = 10, STALE_MS = 6000, MIN_GAP_MS = 60
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const FACES = new Set(['n', 's', 'e', 'w'])

// store: Map<raumcode, Map<spielerId, { place, x, y, face, moving, at }>>
export const createPresence = () => new Map()

export function cameraFeed(store, room, place, now = Date.now()) {
  const positions = store.get(room.code)
  return Object.entries(room.inside || {}).filter(([, location]) => location === place).map(([id]) => {
    const position = positions?.get(id)
    const player = room.players.find(candidate => candidate.id === id)
    if (!player || player.eliminated) return null
    const live = position?.place === place && now - position.at <= STALE_MS
    return { id, character: player.character, name: player.name, x: live ? position.x : 7.5, y: live ? position.y : 1.5,
      face: live ? position.face : 's', moving: live && position.moving }
  }).filter(Boolean)
}

// Liest die eigene Position aus der Anfrage, speichert sie und gibt alle anderen in derselben Instanz zurück.
// Fehler werden als Error mit deutscher Meldung geworfen (wie in game.js).
export function updatePresence(store, room, token, input = {}, now = Date.now()) {
  const p = room.players.find(q => q.token === token)
  if (!p) throw new Error('Dein Raumzugang ist ungültig.')
  if (room.status !== 'playing') throw new Error('Das Spiel läuft gerade nicht.')
  const place = room.inside?.[p.id]
  if (!place) throw new Error('Du bist in keinem Raum.')

  let byPlayer = store.get(room.code)
  if (!byPlayer) store.set(room.code, (byPlayer = new Map()))
  const old = byPlayer.get(p.id)

  if (Number.isFinite(input.x) && Number.isFinite(input.y) && (!old || old.place !== place || now - old.at >= MIN_GAP_MS)) {
    byPlayer.set(p.id, {
      place,
      x: Math.round(clamp(input.x, 0, COLS) * 100) / 100,
      y: Math.round(clamp(input.y, 0, ROWS) * 100) / 100,
      face: FACES.has(input.face) ? input.face : 's',
      moving: input.moving === true,
      at: now,
    })
  } else if (old && old.place === place) old.at = now // nur „noch da“, Position unverändert

  // Aufräumen: wer das Zimmer gewechselt/verlassen hat, das Spiel verlassen hat oder sich länger nicht meldet.
  for (const [id, entry] of byPlayer) if (room.inside?.[id] !== entry.place || now - entry.at > STALE_MS) byPlayer.delete(id)
  if (!byPlayer.size) store.delete(room.code)

  const others = [...byPlayer]
    .filter(([id, e]) => id !== p.id && e.place === place)
    .map(([id, e]) => ({ id, x: e.x, y: e.y, face: e.face, moving: e.moving }))
  return { place, others }
}

// Ein eigenes, großzügigeres Anfragelimit pro Zugang, damit das Laufen nicht das normale Limit (180/min je IP) aufbraucht –
// sonst würden z. B. mehrere Tabs am selben Rechner sich gegenseitig ausbremsen.
export function presenceLimiter(perMinute = 900) {
  const windows = new Map()
  return (key, now = Date.now()) => {
    for (const [k, w] of windows) if (w.until < now) windows.delete(k)
    const w = windows.get(key)
    if (!w && windows.size >= 10000) return false // Schutz gegen sehr viele erfundene Zugänge
    if (!w) { windows.set(key, { count: 1, until: now + 60000 }); return true }
    return ++w.count <= perMinute
  }
}
