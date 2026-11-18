import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeRoom, join, act, view } from './game.js'

const game = (n = 3) => { const r = makeRoom('ABC234'); for (let i = 0; i < n; i++) join(r, `Gast ${i}`); act(r, r.players[0].token, { type: 'start' }); return r }
// Setzt die aktuelle Person direkt in ein Zimmer (wie nach „Zimmer betreten“) in die Phase „action“.
const inRoom = (r, player, room = 'kitchen') => { r.positions[player.character] = room; r.phase = 'action' }

test('Raum-Instanz: Betreten nur aus einem Zimmer, nur im eigenen Zug, nicht mitten in der Bewegung', () => {
  const r = game(), [a, b] = r.players
  assert.throws(() => act(r, b.token, { type: 'enterRoom' }), /nicht am Zug/)
  assert.throws(() => act(r, a.token, { type: 'enterRoom' }), /Zimmer/) // Startfeld liegt im Flur
  r.positions[a.character] = 'kitchen'; r.phase = 'move'; r.dice = [3, 4]
  assert.throws(() => act(r, a.token, { type: 'enterRoom' }), /Bewegung/)
})

test('Raum-Instanz: Betreten merkt sich die Brettposition und gibt den Zug weiter', () => {
  const r = game(), [a, b] = r.players
  inRoom(r, a, 'library')
  act(r, a.token, { type: 'enterRoom' })
  assert.deepEqual(view(r, b.token).inside, { [a.id]: 'library' })
  assert.equal(r.positions[a.character], 'library') // Position bleibt gespeichert
  assert.equal(r.players[r.turn].id, b.id)
  assert.equal(r.phase, 'roll'); assert.equal(r.dice, null)
  // Die anderen spielen normal weiter …
  act(r, b.token, { type: 'roll' })
  assert.ok(r.dice.length === 2)
  // … und Tokens bleiben geheim.
  assert.ok(view(r, b.token).players.every(p => p.token === undefined))
})

test('Raum-Instanz: Wenn die Person wieder dran ist, müssen alle warten, bis sie den Raum verlässt', () => {
  const r = game(), [a, b, c] = r.players
  inRoom(r, a, 'dining'); act(r, a.token, { type: 'enterRoom' })
  act(r, b.token, { type: 'end' }); act(r, c.token, { type: 'end' })
  assert.equal(r.players[r.turn].id, a.id); assert.equal(r.round, 2)
  // a ist wieder dran, aber noch im Raum: nichts geht, bis sie/er den Raum verlässt.
  assert.throws(() => act(r, a.token, { type: 'roll' }), /Verlasse zuerst/)
  assert.throws(() => act(r, a.token, { type: 'end' }), /Verlasse zuerst/)
  assert.throws(() => act(r, b.token, { type: 'roll' }), /nicht am Zug/)
  act(r, a.token, { type: 'leaveRoom' })
  assert.deepEqual(r.inside, {})
  assert.equal(r.positions[a.character], 'dining') // Figur steht wieder an der gespeicherten Stelle
  act(r, a.token, { type: 'roll' }) // kein Würfellimit im Raum, danach normales Spiel
  assert.equal(r.phase, 'move')
})

test('Raum-Instanz: Verlassen ist auch außerhalb des eigenen Zugs möglich, aber nur wenn man drin ist', () => {
  const r = game(), [a, b] = r.players
  assert.throws(() => act(r, b.token, { type: 'leaveRoom' }), /keinem Raum/)
  inRoom(r, a); act(r, a.token, { type: 'enterRoom' })
  act(r, a.token, { type: 'leaveRoom' }) // b ist am Zug, a darf trotzdem raus
  assert.deepEqual(r.inside, {})
  assert.equal(r.players[r.turn].id, b.id)
  assert.equal(r.positions[a.character], 'kitchen')
})

test('Raum-Instanz: Alleine spielen – Zug kommt direkt zurück, Weiterspielen erst nach dem Verlassen', () => {
  const r = game(1), [a] = r.players
  inRoom(r, a, 'study'); act(r, a.token, { type: 'enterRoom' })
  assert.equal(r.players[r.turn].id, a.id); assert.equal(r.round, 2)
  assert.throws(() => act(r, a.token, { type: 'roll' }), /Verlasse zuerst/)
  act(r, a.token, { type: 'leaveRoom' }); act(r, a.token, { type: 'roll' })
  assert.equal(r.phase, 'move')
})

test('Raum-Instanz: Geheimgang und Bewegung sind im Raum gesperrt; ungültige Einträge werden bereinigt', () => {
  const r = game(), [a] = r.players
  inRoom(r, a, 'kitchen'); act(r, a.token, { type: 'enterRoom' })
  r.turn = 0; r.phase = 'roll'
  assert.throws(() => act(r, a.token, { type: 'passage' }), /Verlasse zuerst/)
  r.inside = { [a.id]: 'kitchen', fremd: 'library', [r.players[1].id]: 'keller' }
  assert.deepEqual(view(r, a.token).inside, { [a.id]: 'kitchen' })
})

test('Raum-Instanz: Lobby kennt keine Räume', () => {
  const r = makeRoom('ABC234'), a = join(r, 'Matin')
  assert.throws(() => act(r, a.token, { type: 'enterRoom' }), /nicht|Spiel/)
  assert.throws(() => act(r, a.token, { type: 'leaveRoom' }), /Spiel/)
  assert.equal(view(r, a.token).inside, undefined)
})
