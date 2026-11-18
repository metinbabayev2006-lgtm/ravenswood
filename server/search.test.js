import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeRoom, join, act, view, hideClues } from './game.js'
import { SPOTS, CLUES_PER_ROOM, SEARCHES_PER_VISIT } from '../shared/roomSpots.js'

const game = (n = 2) => { const r = makeRoom('ABC234'); for (let i = 0; i < n; i++) join(r, `Gast ${i}`); act(r, r.players[0].token, { type: 'start' }); return r }
const goIn = (r, player, place) => { r.turn = r.players.findIndex(q => q.id === player.id); r.phase = 'action'; r.positions[player.character] = place; act(r, player.token, { type: 'enterRoom' }) }

test('Verstecke: jedes Zimmer bekommt zufällig genau CLUES_PER_ROOM Verstecke aus seiner Liste', () => {
  const layouts = new Set()
  for (let i = 0; i < 40; i++) {
    const h = hideClues()
    for (const [place, spots] of Object.entries(SPOTS)) {
      assert.equal(Object.keys(h[place]).length, CLUES_PER_ROOM)
      for (const s of Object.keys(h[place])) assert.ok(spots.includes(s))
    }
    layouts.add(JSON.stringify(h))
  }
  assert.ok(layouts.size > 30, `Verteilung ist zufällig (${layouts.size} verschiedene in 40 Spielen)`)
})

test('Verstecke: niemand sieht über den Server, wo etwas liegt – nur die eigenen Funde', () => {
  const r = game(), [a, b] = r.players
  goIn(r, a, 'kitchen')
  const spot = SPOTS.kitchen[0]
  act(r, a.token, { type: 'search', spot })
  const forA = view(r, a.token), forB = view(r, b.token)
  for (const v of [forA, forB]) { assert.equal(v.hidden, undefined); assert.equal(v.searched, undefined); assert.ok(!('searchesLeft' in v && typeof v.searchesLeft === 'object')) }
  assert.equal(forA.searches.length, 1); assert.equal(forA.searches[0].spot, spot)
  assert.deepEqual(forB.searches, [], 'b sieht nicht, was a gefunden hat')
  assert.equal(forA.searchesLeft, SEARCHES_PER_VISIT - 1)
  assert.ok(!JSON.stringify(forB).includes('hinweis') || !forB.searches.length)
  assert.ok(!r.log.at(-1).includes(spot), 'das Spielgeschehen verrät nicht, welches Möbel')
})

test('Verstecke: Treffer und Nieten stimmen mit der geheimen Verteilung überein', () => {
  const r = game(1), [a] = r.players
  goIn(r, a, 'study')
  const hit = Object.keys(r.hidden.study)[0], miss = SPOTS.study.find(s => s !== hit)
  act(r, a.token, { type: 'search', spot: hit }); act(r, a.token, { type: 'search', spot: miss })
  const [f1, f2] = view(r, a.token).searches
  assert.deepEqual(f1.found, { kind: 'hinweis' }); assert.equal(f2.found, null)
})

test('Verstecke: nur im Raum, nur gültige Möbel, nicht doppelt, begrenzt pro Besuch', () => {
  const r = game(), [a, b] = r.players
  assert.throws(() => act(r, a.token, { type: 'search', spot: 'herd' }), /keinem Raum/)
  goIn(r, a, 'kitchen')
  assert.throws(() => act(r, a.token, { type: 'search', spot: 'tresor' }), /kann man hier nicht/)
  assert.throws(() => act(r, a.token, { type: 'search' }), /kann man hier nicht/)
  // durchsuchen geht auch, wenn b am Zug ist
  assert.equal(r.players[r.turn].id, b.id)
  act(r, a.token, { type: 'search', spot: 'herd' })
  assert.throws(() => act(r, a.token, { type: 'search', spot: 'herd' }), /schon durchsucht/)
  act(r, a.token, { type: 'search', spot: 'spuele' })
  assert.throws(() => act(r, a.token, { type: 'search', spot: 'kuehlschrank' }), /genug durchsucht/)
  // Neuer Besuch: wieder Versuche, alte Funde bleiben gemerkt
  act(r, a.token, { type: 'leaveRoom' }); assert.equal(view(r, a.token).searchesLeft, 0)
  goIn(r, a, 'kitchen')
  assert.equal(view(r, a.token).searchesLeft, SEARCHES_PER_VISIT)
  act(r, a.token, { type: 'search', spot: 'kuehlschrank' })
  assert.equal(view(r, a.token).searches.length, 3)
})

test('Verstecke: jedes Spiel neu verteilt, alte Spiele ohne Verstecke funktionieren trotzdem', () => {
  const r = game(1), [a] = r.players
  delete r.hidden // wie ein Spiel, das vor dem Versteck-System gestartet wurde
  goIn(r, a, 'hall')
  act(r, a.token, { type: 'search', spot: 'standuhr' })
  assert.ok(r.hidden.hall, 'Verstecke werden nachträglich angelegt')
})
