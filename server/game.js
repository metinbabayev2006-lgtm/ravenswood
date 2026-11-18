import { PEOPLE, ROOMS, STARTS, distance, corridor } from '../shared/game.js'
import { SPOTS, CLUES_PER_ROOM, SEARCHES_PER_VISIT } from '../shared/roomSpots.js'
const fail = message => { throw new Error(message) }
const randomInt = (min, max) => {
  const size = max - min, cap = Math.floor(4294967296 / size) * size
  let value; do { value = crypto.getRandomValues(new Uint32Array(1))[0] } while (value >= cap)
  return min + value % size
}
export const makeRoom = code => ({ code, schema: 'movement-v1', status: 'lobby', players: [], log: [], updated: Date.now(), version: 0, round: 1 })
// Raum-Instanzen: { spielerId: zimmerId } – wer gerade im 2,5D-Innenraum ist. Nur gültige Einträge bleiben erhalten.
const insideOf = room => Object.fromEntries(Object.entries(room.inside || {}).filter(([id, place]) => room.players.some(p => p.id === id) && ROOMS.some(s => s.id === place)))
// Verstecke: pro Zimmer zufällig CLUES_PER_ROOM Möbel, in denen etwas liegt. Bleibt geheim auf dem Server (siehe view).
export function hideClues() {
  const hidden = {}
  for (const [place, spots] of Object.entries(SPOTS)) {
    const pool = [...spots]; hidden[place] = {}
    for (let i = 0; i < Math.min(CLUES_PER_ROOM, pool.length); i++) hidden[place][pool.splice(randomInt(0, pool.length), 1)[0]] = { kind: 'hinweis' }
  }
  return hidden
}
const objectOr = (v, fallback) => (v && typeof v === 'object' && !Array.isArray(v) ? v : fallback)
// Preserve existing room codes and player access while retiring the other modules.
function normalize(room) {
  const legacy = room.schema !== 'movement-v1'
  const playing = room.status === 'playing'
  return { code: room.code, schema: 'movement-v1', status: playing ? 'playing' : 'lobby', version: room.version, updated: room.updated,
    players: room.players.map(p => ({ id: p.id, token: p.token, name: p.name, character: p.character })),
    log: legacy ? ['Spielrunde bereit: Spielbrett, Figuren und Multiplayer.'] : room.log,
    round: room.round || 1,
    ...(playing ? { positions: room.positions, turn: room.turn || 0, dice: room.dice || null, phase: ['roll','move','action'].includes(room.phase) ? room.phase : 'roll', inside: insideOf(room),
      hidden: objectOr(room.hidden, undefined), searched: objectOr(room.searched, {}), searchesLeft: objectOr(room.searchesLeft, {}) } : {}) }
}
function commit(room, draft, message) {
  if (message) draft.log = [...draft.log, message].slice(-30)
  draft.version++; draft.updated = Date.now()
  for (const key of Object.keys(room)) delete room[key]
  Object.assign(room, draft)
}
export function join(room, name) {
  const r = normalize(room)
  if (r.status !== 'lobby') fail('Dieses Spiel hat bereits begonnen.')
  if (r.players.length >= 6) fail('Die Lobby ist voll (maximal 6 Personen).')
  name = typeof name === 'string' ? name.trim().slice(0,24) : ''
  if (!name) fail('Bitte gib einen Namen ein.')
  if (r.players.some(p => p.name.toLowerCase() === name.toLowerCase())) fail('Dieser Name ist bereits vergeben.')
  const character = PEOPLE.find(c => !r.players.some(p => p.character === c.id)).id
  const player = { id: crypto.randomUUID(), token: crypto.randomUUID(), name, character }
  r.players.push(player); commit(room, r, `${name} ist beigetreten.`)
  return player
}
export function view(room, token) {
  const { players, hidden, searched, searchesLeft, ...r } = normalize(room)
  const me = players.find(p => p.token === token)
  if (!me) fail('Dein Zugang zu diesem Raum ist ungültig.')
  // Verstecke bleiben geheim; jede Person sieht nur ihre eigenen Funde und ihre eigenen verbleibenden Versuche.
  const own = r.status === 'playing' ? { searches: searched[me.id] || [], searchesLeft: searchesLeft[me.id] || 0 } : {}
  return { ...r, ...own, me: me.id, players: players.map(({ token, ...p }) => p) }
}
export function act(room, token, input) {
  const r = normalize(room), p = r.players.find(p => p.token === token)
  if (!p) fail('Ungültiger Spielzugang.')
  const { type } = input
  let message
  if (type === 'character') {
    if (r.status !== 'lobby') fail('Das Spiel läuft bereits.')
    if (!PEOPLE.some(c => c.id === input.character) || r.players.some(q => q.id !== p.id && q.character === input.character)) fail('Diese Figur ist bereits vergeben.')
    p.character = input.character
  } else if (type === 'start') {
    if (r.status !== 'lobby' || r.players[0].id !== p.id) fail('Nur der Gastgeber kann die Lobby starten.')

    r.positions = Object.fromEntries(PEOPLE.map((c,i) => [c.id,[...STARTS[i]]]))
    r.status = 'playing'; r.turn = 0; r.round = 1; r.phase = 'roll'; r.dice = null
    r.inside = {}; r.hidden = hideClues(); r.searched = {}; r.searchesLeft = {}
    message = 'Die Spielrunde beginnt. Würfeln, bewegen und Zimmer betreten!'
  } else if (type === 'leaveRoom') {
    if (r.status !== 'playing') fail('Das Spiel läuft gerade nicht.')
    const place = r.inside[p.id]
    if (!place) fail('Du bist in keinem Raum.')
    delete r.inside[p.id]; delete r.searchesLeft[p.id]
    message = `${p.name} verlässt den Raum: ${ROOMS.find(s => s.id === place).name}.`
  } else if (type === 'search') {
    // Durchsuchen geht jederzeit, solange man im Raum ist – auch wenn gerade jemand anderes am Zug ist.
    if (r.status !== 'playing') fail('Das Spiel läuft gerade nicht.')
    const place = r.inside[p.id]
    if (!place) fail('Du bist in keinem Raum.')
    if (!SPOTS[place].includes(input.spot)) fail('Das kann man hier nicht durchsuchen.')
    const mine = r.searched[p.id] || []
    if (mine.some(f => f.room === place && f.spot === input.spot)) fail('Das hast du schon durchsucht.')
    if ((r.searchesLeft[p.id] || 0) <= 0) fail('Für diesen Besuch hast du genug durchsucht. Verlasse den Raum und komm später wieder.')
    r.hidden ||= hideClues() // Spiele, die vor dem Versteck-System gestartet wurden
    r.searchesLeft[p.id]--
    r.searched[p.id] = [...mine, { room: place, spot: input.spot, found: r.hidden[place]?.[input.spot] || null, round: r.round }]
    message = `${p.name} durchsucht etwas im Raum: ${ROOMS.find(s => s.id === place).name}.`
  } else {
    if (r.status !== 'playing') fail('Das Spiel läuft gerade nicht.')
    if (r.players[r.turn].id !== p.id) fail('Du bist gerade nicht am Zug.')
    if (r.inside[p.id]) fail('Verlasse zuerst den Raum, um weiterzuspielen.')
    if (type === 'roll') {
      if (r.phase !== 'roll') fail('Du hast bereits gewürfelt.')
      r.dice = [randomInt(1,7),randomInt(1,7)]; r.phase = 'move'
      message = `${p.name} würfelt ${r.dice.join(' + ')}.`
    } else if (type === 'move') {
      if (r.phase !== 'move') fail('Würfle zuerst.')
      const target = input.target, from = r.positions[p.character]
      if (!(typeof target === 'string' ? ROOMS.some(s => s.id === target) : Array.isArray(target) && target.length === 2 && target.every(Number.isInteger) && corridor(...target))) fail('Dieses Feld ist nicht erreichbar.')
      if (JSON.stringify(from) === JSON.stringify(target) || distance(from,target) > r.dice[0] + r.dice[1]) fail('Das Ziel ist zu weit entfernt.')
      r.positions[p.character] = target; r.phase = 'action'
      message = `${p.name} ${typeof target === 'string' ? 'betritt: ' + ROOMS.find(s => s.id === target).name : 'zieht durch den Flur'}.`
    } else if (type === 'passage') {
      if (r.phase !== 'roll') fail('Geheimgänge können nur vor dem Würfeln benutzt werden.')
      const place = ROOMS.find(s => s.id === r.positions[p.character])
      if (!place?.passage) fail('Hier gibt es keinen Geheimgang.')
      r.positions[p.character] = place.passage; r.phase = 'action'; r.dice = null
      message = `${p.name} benutzt den Geheimgang nach: ${ROOMS.find(s => s.id === place.passage).name}.`
    } else if (type === 'enterRoom') {
      if (r.phase === 'move') fail('Beende zuerst deine Bewegung.')
      const place = r.positions[p.character]
      if (typeof place !== 'string' || !ROOMS.some(s => s.id === place)) fail('Du musst dich dafür in einem Zimmer befinden.')
      r.inside[p.id] = place; r.searchesLeft[p.id] = SEARCHES_PER_VISIT
      r.turn = (r.turn + 1) % r.players.length
      if (!r.turn) r.round++
      r.phase = 'roll'; r.dice = null
      message = `${p.name} geht in den Raum: ${ROOMS.find(s => s.id === place).name}. ${r.players[r.turn].name} ist am Zug.`
    } else if (type === 'end') {
      r.turn = (r.turn + 1) % r.players.length
      if (!r.turn) r.round++
      r.phase = 'roll'; r.dice = null
      message = `${r.players[r.turn].name} ist am Zug.`
    } else fail('Diese Aktion gehört nicht zur Bewegung und zum Multiplayer.')
  }
  commit(room,r,message)
}
