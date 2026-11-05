import { PEOPLE, ROOMS, STARTS, distance, corridor } from '../shared/game.js'
const fail = message => { throw new Error(message) }
const randomInt = (min, max) => {
  const size = max - min, cap = Math.floor(4294967296 / size) * size
  let value; do { value = crypto.getRandomValues(new Uint32Array(1))[0] } while (value >= cap)
  return min + value % size
}
export const makeRoom = code => ({ code, schema: 'movement-v1', status: 'lobby', players: [], log: [], updated: Date.now(), version: 0, round: 1 })
// Preserve existing room codes and player access while retiring the other modules.
function normalize(room) {
  const legacy = room.schema !== 'movement-v1'
  const playing = room.status === 'playing'
  return { code: room.code, schema: 'movement-v1', status: playing ? 'playing' : 'lobby', version: room.version, updated: room.updated,
    players: room.players.map(p => ({ id: p.id, token: p.token, name: p.name, character: p.character })),
    log: legacy ? ['Spielrunde bereit: Spielbrett, Figuren und Multiplayer.'] : room.log,
    round: room.round || 1,
    ...(playing ? { positions: room.positions, turn: room.turn || 0, dice: room.dice || null, phase: ['roll','move','action'].includes(room.phase) ? room.phase : 'roll' } : {}) }
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
  const { players, ...r } = normalize(room)
  const me = players.find(p => p.token === token)
  if (!me) fail('Dein Zugang zu diesem Raum ist ungültig.')
  return { ...r, me: me.id, players: players.map(({ token, ...p }) => p) }
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
    message = 'Die Spielrunde beginnt. Würfeln, bewegen und Zimmer betreten!'
  } else {
    if (r.status !== 'playing') fail('Das Spiel läuft gerade nicht.')
    if (r.players[r.turn].id !== p.id) fail('Du bist gerade nicht am Zug.')
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
    } else if (type === 'end') {
      r.turn = (r.turn + 1) % r.players.length
      if (!r.turn) r.round++
      r.phase = 'roll'; r.dice = null
      message = `${r.players[r.turn].name} ist am Zug.`
    } else fail('Diese Aktion gehört nicht zur Bewegung und zum Multiplayer.')
  }
  commit(room,r,message)
}
