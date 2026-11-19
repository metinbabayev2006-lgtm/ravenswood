import { PEOPLE, ROOMS, STARTS, distance, corridor, corridorPath, atDoor, moveTarget, SECURITY_ROOM, SECURITY_SPOT } from '../shared/game.js'
import { SPOTS, CLUES_PER_ROOM, SEARCHES_PER_VISIT } from '../shared/roomSpots.js'
const fail = message => { throw new Error(message) }
const randomInt = (min, max) => {
  const size = max - min, cap = Math.floor(4294967296 / size) * size
  let value; do { value = crypto.getRandomValues(new Uint32Array(1))[0] } while (value >= cap)
  return min + value % size
}
export const makeRoom = (code, mode) => ({ code, mode: mode === 'imposter' ? 'imposter' : 'normal', schema: 'movement-v1', status: 'lobby', players: [], log: [], updated: Date.now(), version: 0, round: 1 })
// Raum-Instanzen: { spielerId: zimmerId } – wer gerade im 2,5D-Innenraum ist. Nur gültige Einträge bleiben erhalten.
const insideOf = room => Object.fromEntries(Object.entries(room.inside || {}).filter(([id, place]) => room.players.some(p => p.id === id) && (ROOMS.some(s => s.id === place) || (room.mode === 'imposter' && place === SECURITY_ROOM && room.securityFound?.[id]))))
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
  const mode = room.mode === 'imposter' ? 'imposter' : 'normal'
  return { code: room.code, mode, schema: 'movement-v1', status: playing ? 'playing' : 'lobby', version: room.version, updated: room.updated,
    players: room.players.map(p => ({ id: p.id, token: p.token, name: p.name, character: p.character, ...(p.bot ? { bot: true } : {}), ...(mode === 'imposter' && p.eliminated ? { eliminated: true } : {}) })),
    log: legacy ? ['Spielrunde bereit: Spielbrett, Figuren und Multiplayer.'] : room.log,
    round: room.round || 1,
    ...(playing ? { positions: Object.fromEntries(Object.entries(room.positions || {}).map(([id, pos]) => [id, moveTarget(pos)])), turn: room.turn || 0, dice: room.dice || null, phase: ['roll','move','action'].includes(room.phase) ? room.phase : 'roll', inside: insideOf(room),
      remainingSteps: room.phase === 'move' ? room.remainingSteps ?? room.dice?.reduce((sum, die) => sum + die, 0) ?? 0 : 0,
      killer: room.killer, winner: room.winner, securityFound: { ...room.securityFound },
      hidden: objectOr(room.hidden, undefined), searched: { ...room.searched }, searchesLeft: { ...room.searchesLeft } } : {}) }
}
function resetMovement(room) {
  room.phase = 'roll'; room.dice = null; room.remainingSteps = 0
}
function advance(room) {
  do {
    room.turn = (room.turn + 1) % room.players.length
    if (!room.turn) room.round++
  } while (room.players[room.turn].eliminated)
  resetMovement(room)
}
function checkWinner(room) {
  if (room.mode !== 'imposter') return
  if (!room.players.some(player => player.id === room.killer && !player.eliminated)) room.winner = 'investigators'
  else if (!room.players.some(player => player.id !== room.killer && !player.eliminated)) room.winner = 'imposter'
}
export function leaveGame(room, token) {
  const r = normalize(room), index = r.players.findIndex(player => player.token === token)
  if (index < 0) fail('Ungültiger Spielzugang.')
  const [player] = r.players.splice(index, 1)
  if (r.status === 'lobby' && r.players[0]?.bot) {
    const hostIndex = r.players.findIndex(candidate => !candidate.bot)
    if (hostIndex >= 0) r.players.unshift(...r.players.splice(hostIndex, 1))
  }
  if (r.status === 'playing') {
    delete r.positions[player.character]; delete r.inside[player.id]; delete r.securityFound[player.id]
    delete r.searched[player.id]; delete r.searchesLeft[player.id]
    checkWinner(r)
    if (index < r.turn) r.turn--
    else if (index === r.turn && !r.winner && r.players.length) {
      r.turn--; advance(r)
    } else if (r.turn >= r.players.length) r.turn = 0
  }
  commit(room, r, `${player.name} hat das Spiel verlassen.`)
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
  const { players, hidden, searched, searchesLeft, killer, securityFound, ...r } = normalize(room)
  const me = players.find(p => p.token === token)
  if (!me) fail('Dein Zugang zu diesem Raum ist ungültig.')
  // Verstecke bleiben geheim; jede Person sieht nur ihre eigenen Funde und ihre eigenen verbleibenden Versuche.
  const own = r.status === 'playing' ? { searches: searched[me.id] || [], searchesLeft: searchesLeft[me.id] || 0 } : {}
  const victims = r.mode === 'imposter' && me.id === killer && !r.winner && r.inside?.[me.id] && r.inside[me.id] !== SECURITY_ROOM
    ? players.filter(p => p.id !== me.id && !p.eliminated && r.inside[p.id] === r.inside[me.id]).map(p => p.id) : []
  const inside = r.inside && Object.fromEntries(Object.entries(r.inside).map(([id, place]) => [id, id !== me.id && place === SECURITY_ROOM ? 'study' : place]))
  return { ...r, inside, ...own, me: me.id, role: r.mode === 'imposter' && r.status === 'playing' ? (me.id === killer ? 'imposter' : 'investigator') : undefined,
    securityUnlocked: !!securityFound?.[me.id], victims, players: players.map(({ token, ...p }) => p) }
}
export function act(room, token, input) {
  const r = normalize(room), p = r.players.find(p => p.token === token)
  if (!p) fail('Ungültiger Spielzugang.')
  const { type } = input
  if (r.winner || p.eliminated) fail('Du kannst nur noch zuschauen.')
  let message
  if (type === 'addBot' || type === 'removeBot') {
    if (r.status !== 'lobby' || r.players[0].id !== p.id) fail('Nur der Gastgeber kann Bots in der Lobby verwalten.')
    if (type === 'addBot') {
      const character = PEOPLE.find(candidate => !r.players.some(player => player.character === candidate.id))
      if (!character) fail('Die Lobby ist voll.')
      let number = 1
      while (r.players.some(player => player.name.toLowerCase() === `bot ${number}`)) number++
      r.players.push({ id: crypto.randomUUID(), token: crypto.randomUUID(), name: `Bot ${number}`, character: character.id, bot: true })
    } else {
      const bot = r.players.find(player => player.id === input.target && player.bot)
      if (!bot) fail('Dieser Bot ist nicht in der Lobby.')
      r.players = r.players.filter(player => player !== bot)
    }
  } else if (type === 'character') {
    if (r.status !== 'lobby') fail('Das Spiel läuft bereits.')
    if (!PEOPLE.some(c => c.id === input.character) || r.players.some(q => q.id !== p.id && q.character === input.character)) fail('Diese Figur ist bereits vergeben.')
    p.character = input.character
  } else if (type === 'start') {
    if (r.status !== 'lobby' || r.players[0].id !== p.id) fail('Nur der Gastgeber kann die Lobby starten.')
    if (r.mode === 'imposter' && r.players.length < 2) fail('Für den Imposter-Modus braucht ihr mindestens zwei Spieler.')

    r.positions = Object.fromEntries(PEOPLE.map((c,i) => [c.id,[...STARTS[i]]]))
    r.status = 'playing'; r.turn = 0; r.round = 1; r.phase = 'roll'; r.dice = null
    r.inside = {}; r.hidden = hideClues(); r.searched = {}; r.searchesLeft = {}
    if (r.mode === 'imposter') r.killer = r.players[randomInt(0, r.players.length)].id
    message = 'Die Spielrunde beginnt. Würfeln, bewegen und Zimmer betreten!'
  } else if (type === 'leaveRoom') {
    if (r.status !== 'playing') fail('Das Spiel läuft gerade nicht.')
    const place = r.inside[p.id]
    if (!place) fail('Du bist in keinem Raum.')
    if (place === SECURITY_ROOM) { r.inside[p.id] = 'study'; commit(room, r); return }
    delete r.inside[p.id]; delete r.searchesLeft[p.id]
    message = `${p.name} verlässt den Raum: ${ROOMS.find(s => s.id === place).name}.`
  } else if (type === 'search') {
    // Durchsuchen geht jederzeit, solange man im Raum ist – auch wenn gerade jemand anderes am Zug ist.
    if (r.status !== 'playing') fail('Das Spiel läuft gerade nicht.')
    const place = r.inside[p.id]
    if (!place) fail('Du bist in keinem Raum.')
    if (!SPOTS[place]?.includes(input.spot)) fail('Das kann man hier nicht durchsuchen.')
    const mine = r.searched[p.id] || []
    if (mine.some(f => f.room === place && f.spot === input.spot)) fail('Das hast du schon durchsucht.')
    if ((r.searchesLeft[p.id] || 0) <= 0) fail('Für diesen Besuch hast du genug durchsucht. Verlasse den Raum und komm später wieder.')
    r.hidden ||= hideClues() // Spiele, die vor dem Versteck-System gestartet wurden
    r.searchesLeft[p.id]--
    const secret = r.mode === 'imposter' && place === 'study' && input.spot === SECURITY_SPOT
    if (secret) r.securityFound[p.id] = true
    r.searched[p.id] = [...mine, { room: place, spot: input.spot, found: secret ? { kind: 'security' } : r.hidden[place]?.[input.spot] || null, round: r.round }]
    message = `${p.name} durchsucht etwas im Raum: ${ROOMS.find(s => s.id === place).name}.`
  } else if (type === 'openSecurity') {
    if (r.mode !== 'imposter' || r.inside?.[p.id] !== 'study' || !r.securityFound[p.id]) fail('Der geheime Zugang ist nicht verfügbar.')
    r.inside[p.id] = SECURITY_ROOM
  } else if (type === 'eliminate') {
    const victim = r.players.find(player => player.id === input.target)
    const place = r.inside?.[p.id]
    if (r.mode !== 'imposter' || p.id !== r.killer || !place || place === SECURITY_ROOM || !victim || victim.id === p.id || victim.eliminated || r.inside[victim.id] !== place) fail('Diese Figur kann nicht eliminiert werden.')
    victim.eliminated = true; delete r.inside[victim.id]; delete r.positions[victim.character]
    checkWinner(r)
    if (!r.winner && r.players[r.turn].id === victim.id) advance(r)
    message = `${victim.name} ist ausgeschieden.`
  } else {
    if (r.status !== 'playing') fail('Das Spiel läuft gerade nicht.')
    if (r.players[r.turn].id !== p.id) fail('Du bist gerade nicht am Zug.')
    if (r.inside[p.id]) fail('Verlasse zuerst den Raum, um weiterzuspielen.')
    if (type === 'roll') {
      if (r.phase !== 'roll') fail('Du hast bereits gewürfelt.')
      r.dice = [randomInt(1,7),randomInt(1,7)]; r.phase = 'move'
      r.remainingSteps = r.dice[0] + r.dice[1]
      message = `${p.name} würfelt ${r.dice.join(' + ')}.`
    } else if (type === 'move') {
      if (r.phase !== 'move') fail('Würfle zuerst.')
      const target = moveTarget(input.target), from = r.positions[p.character]
      if (!(Array.isArray(target) && target.length === 2 && target.every(Number.isInteger) && corridor(...target))) fail('Dieses Feld ist nicht erreichbar.')
      const cost = distance(from, target)
      if (!cost || cost > r.remainingSteps) fail('Das Ziel ist zu weit entfernt.')
      r.positions[p.character] = target; r.remainingSteps -= cost
      if (!r.remainingSteps) r.phase = 'action'
      message = `${p.name} zieht durch den Flur.`
    } else if (type === 'passage') {
      if (r.phase !== 'roll') fail('Geheimgänge können nur vor dem Würfeln benutzt werden.')
      const place = atDoor(r.positions[p.character])
      if (!place?.passage) fail('Hier gibt es keinen Geheimgang.')
      r.positions[p.character] = moveTarget(place.passage); r.phase = 'action'; r.dice = null
      message = `${p.name} benutzt den Geheimgang nach: ${ROOMS.find(s => s.id === place.passage).name}.`
    } else if (type === 'enterRoom') {
      const place = atDoor(r.positions[p.character])
      if (!place) fail('Du musst direkt vor der Tür zum Zimmer stehen.')
      r.inside[p.id] = place.id; r.searchesLeft[p.id] = SEARCHES_PER_VISIT
      advance(r)
      message = `${p.name} geht in den Raum: ${place.name}. ${r.players[r.turn].name} ist am Zug.`
    } else if (type === 'end') {
      if (r.phase === 'move' && r.remainingSteps > 0) fail('Verbrauche deine restlichen Schritte oder untersuche ein Zimmer.')
      advance(r)
      message = `${r.players[r.turn].name} ist am Zug.`
    } else fail('Diese Aktion gehört nicht zur Bewegung und zum Multiplayer.')
  }
  commit(room,r,message)
}

export function playBot(room) {
  if (room.status !== 'playing' || room.winner) return false
  const murderer = room.players.find(player => player.bot && player.id === room.killer)
  const location = murderer && room.inside?.[murderer.id]
  const victim = location && room.players.find(player => player !== murderer && !player.eliminated && room.inside[player.id] === location)
  if (victim) { act(room, murderer.token, { type: 'eliminate', target: victim.id }); return true }
  const bot = room.players[room.turn]
  if (!bot?.bot || bot.eliminated) return false
  const from = moveTarget(room.positions[bot.character])
  const door = atDoor(from)
  let input
  if (room.inside?.[bot.id]) input = { type: 'leaveRoom' }
  else if (room.phase === 'roll') input = { type: 'roll' }
  else if (room.phase === 'action') input = { type: door ? 'enterRoom' : 'end' }
  else if (door && Object.values(room.inside || {}).includes(door.id)) input = { type: 'enterRoom' }
  else {
    const rooms = ROOMS.filter(candidate => candidate !== door)
    const occupied = Object.values(room.inside || {})
    const target = rooms.find(candidate => bot.id === room.killer && occupied.includes(candidate.id)) || rooms.sort((a, b) => distance(from, a.door) - distance(from, b.door))[0]
    const path = corridorPath(from, target.door)
    const remaining = room.remainingSteps ?? room.dice.reduce((sum, die) => sum + die, 0)
    input = { type: 'move', target: path[Math.min(remaining, path.length - 1)] }
  }
  act(room, bot.token, input)
  return true
}
