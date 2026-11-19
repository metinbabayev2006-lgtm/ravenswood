import { test } from 'node:test'
import assert from 'node:assert/strict'
import { act, join, leaveGame, makeRoom, playBot, view } from './game.js'
import { cameraFeed, createPresence, updatePresence } from './presence.js'
import { moveTarget, SECURITY_ROOM, SECURITY_SPOT } from '../shared/game.js'

function start(mode, names = ['Ada', 'Ben', 'Cem']) {
  const room = makeRoom('ABC234', mode)
  for (const name of names) join(room, name)
  act(room, room.players[0].token, { type: 'start' })
  return room
}

function study(room, player) {
  room.positions[player.character] = moveTarget('study')
  act(room, player.token, { type: 'enterRoom' })
}

test('Nur der Mörder kann eine Figur im selben Raum eliminieren; Ausgeschiedene bleiben Zuschauer', () => {
  const room = start('imposter')
  const [a, b, c] = room.players
  assert.equal(room.players.filter(p => view(room, p.token).role === 'imposter').length, 1)
  assert.equal(view(room, a.token).killer, undefined)
  room.killer = a.id
  study(room, a)
  assert.throws(() => act(room, a.token, { type: 'eliminate', target: b.id }), /nicht eliminiert/)
  study(room, b)
  assert.throws(() => act(room, b.token, { type: 'eliminate', target: a.id }), /nicht eliminiert/)
  act(room, a.token, { type: 'eliminate', target: b.id })
  assert.equal(view(room, b.token).players.find(p => p.id === b.id).eliminated, true)
  assert.equal(room.positions[b.character], undefined)
  assert.equal(room.inside[b.id], undefined)
  assert.throws(() => act(room, b.token, { type: 'roll' }), /zuschauen/)
  study(room, c)
  act(room, a.token, { type: 'eliminate', target: c.id })
  assert.equal(view(room, b.token).winner, 'imposter')
})

test('Geheimer Zugang ist persönlich, an die Bücherwand gebunden und nur im Imposter-Modus aktiv', () => {
  for (const mode of ['normal', 'imposter']) {
    const room = start(mode)
    const [a, b] = room.players
    study(room, a); study(room, b)
    assert.throws(() => act(room, a.token, { type: 'openSecurity' }), /nicht verfügbar/)
    act(room, a.token, { type: 'search', spot: SECURITY_SPOT })
    assert.equal(view(room, a.token).securityUnlocked, mode === 'imposter')
    assert.equal(view(room, b.token).securityUnlocked, false)
    assert.throws(() => act(room, b.token, { type: 'openSecurity' }), /nicht verfügbar/)
    if (mode === 'normal') {
      assert.throws(() => act(room, a.token, { type: 'openSecurity' }), /nicht verfügbar/)
      assert.throws(() => act(room, a.token, { type: 'eliminate', target: b.id }), /nicht eliminiert/)
    } else {
      const presence = createPresence()
      updatePresence(presence, room, b.token, { x: 3, y: 4, moving: true }, 1000)
      act(room, a.token, { type: 'openSecurity' })
      assert.equal(view(room, a.token).inside[a.id], SECURITY_ROOM)
      assert.equal(cameraFeed(presence, room, 'study', 1100)[0].x, 3)
      assert.deepEqual(cameraFeed(presence, room, 'library', 1100), [])
      act(room, a.token, { type: 'leaveRoom' })
      assert.equal(room.inside[a.id], 'study')
    }
  }
})

test('Verlassen entfernt die Figur und bewahrt den aktuellen Zug bei früherem Listenplatz', () => {
  const room = start('normal')
  const [a, b, c] = room.players
  act(room, a.token, { type: 'end' })
  act(room, b.token, { type: 'roll' })
  const steps = room.remainingSteps
  leaveGame(room, a.token)
  assert.equal(room.players[room.turn].id, b.id)
  assert.equal(room.remainingSteps, steps)
  assert.equal(room.positions[a.character], undefined)
  assert.throws(() => view(room, a.token), /ungültig/)
  leaveGame(room, b.token)
  assert.equal(room.players[room.turn].id, c.id)
  assert.equal(room.phase, 'roll')
})

test('Bots können in beiden Modi würfeln und ihre Züge abgeben', () => {
  for (const mode of ['normal', 'imposter']) {
    const room = makeRoom('ABC234', mode), host = join(room, 'Ada')
    act(room, host.token, { type: 'addBot' })
    act(room, host.token, { type: 'start' })
    act(room, host.token, { type: 'end' })
    assert.equal(playBot(room), true)
    assert.equal(room.phase, 'move')
    for (let i = 0; i < 15 && room.turn === 1; i++) assert.equal(playBot(room), true)
    assert.equal(room.turn, 0)
  }
})
