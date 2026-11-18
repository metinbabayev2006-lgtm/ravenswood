import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeRoom, join, act } from './game.js'
import { createPresence, updatePresence, presenceLimiter } from './presence.js'

const game = (n = 3) => { const r = makeRoom('ABC234'); for (let i = 0; i < n; i++) join(r, `Gast ${i}`); act(r, r.players[0].token, { type: 'start' }); return r }
const enter = (r, i, place) => { (r.inside ||= {})[r.players[i].id] = place }

test('Gemeinsame Instanz: wer im selben Zimmer ist, sieht die anderen laufen', () => {
  const r = game(), store = createPresence(), [a, b, c] = r.players
  enter(r, 0, 'kitchen'); enter(r, 1, 'kitchen'); enter(r, 2, 'library')
  updatePresence(store, r, a.token, { x: 3, y: 4, face: 'e', moving: true }, 1000)
  const seenByB = updatePresence(store, r, b.token, { x: 7, y: 2 }, 1100)
  assert.equal(seenByB.place, 'kitchen')
  assert.deepEqual(seenByB.others, [{ id: a.id, x: 3, y: 4, face: 'e', moving: true }])
  const seenByA = updatePresence(store, r, a.token, { x: 3.5, y: 4 }, 1200)
  assert.deepEqual(seenByA.others.map(o => o.id), [b.id])
  // c ist in einem anderen Zimmer: sieht niemanden und wird nicht gesehen
  assert.deepEqual(updatePresence(store, r, c.token, { x: 1, y: 1 }, 1300).others, [])
  assert.ok(!updatePresence(store, r, a.token, {}, 1400).others.some(o => o.id === c.id))
})

test('Gemeinsame Instanz: Verlassen, Zimmerwechsel und Funkstille entfernen Personen', () => {
  const r = game(), store = createPresence(), [a, b] = r.players
  enter(r, 0, 'kitchen'); enter(r, 1, 'kitchen')
  updatePresence(store, r, a.token, { x: 3, y: 4 }, 1000); updatePresence(store, r, b.token, { x: 5, y: 5 }, 1000)
  delete r.inside[a.id]
  assert.deepEqual(updatePresence(store, r, b.token, {}, 1200).others, [], 'a hat den Raum verlassen')
  r.inside[a.id] = 'kitchen'
  updatePresence(store, r, a.token, { x: 2, y: 2 }, 1300)
  assert.equal(updatePresence(store, r, b.token, {}, 1400).others.length, 1)
  assert.deepEqual(updatePresence(store, r, b.token, {}, 1300 + 6001).others, [], 'a meldet sich nicht mehr (Tab zu)')
})

test('Gemeinsame Instanz: Eingaben werden begrenzt, nur Personen im Raum dürfen senden', () => {
  const r = game(), store = createPresence(), [a, b] = r.players
  assert.throws(() => updatePresence(store, r, a.token, { x: 1, y: 1 }), /keinem Raum/)
  assert.throws(() => updatePresence(store, r, 'falsch', { x: 1, y: 1 }), /ungültig/)
  enter(r, 0, 'kitchen'); enter(r, 1, 'kitchen')
  updatePresence(store, r, a.token, { x: 999, y: -5, face: 'oben', moving: 'ja' }, 1000)
  const [seen] = updatePresence(store, r, b.token, {}, 1100).others
  assert.deepEqual(seen, { id: a.id, x: 15, y: 0, face: 's', moving: false })
  // Spieler-Tokens tauchen nie in der Antwort auf
  assert.ok(!JSON.stringify(updatePresence(store, r, b.token, {}, 1200)).includes(a.token))
  const lobby = makeRoom('ZZZ222'), l = join(lobby, 'Solo')
  assert.throws(() => updatePresence(store, lobby, l.token, {}), /Spiel läuft/)
})

test('Gemeinsame Instanz: eigenes Anfragelimit pro Zugang', () => {
  const allow = presenceLimiter(3)
  assert.deepEqual([1, 2, 3, 4].map(() => allow('A', 0)), [true, true, true, false])
  assert.equal(allow('B', 0), true, 'andere Person ist nicht betroffen')
  assert.equal(allow('A', 60001), true, 'nach einer Minute wieder frei')
})
