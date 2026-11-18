import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ROOMS } from '../shared/game.js'
import { ROOM_MAPS, COLS, ROWS, REACH } from '../src/rooms/roomData.js'
import { blocked, spawn, step, nearest } from '../src/rooms/roomPhysics.js'

// Alle begehbaren Punkte (Raster 0,25) ab dem Startpunkt – so findet man zugestellte Ecken und unerreichbare Gegenstände.
const reachable = def => {
  const g = 0.25, s = spawn(), key = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`, seen = new Set([key(s.x, s.y)]), queue = [[s.x, s.y]]
  for (let i = 0; i < queue.length; i++) for (const [a, b] of [[g, 0], [-g, 0], [0, g], [0, -g]]) {
    const x = queue[i][0] + a, y = queue[i][1] + b
    if (!blocked(def, x, y) && !seen.has(key(x, y))) { seen.add(key(x, y)); queue.push([x, y]) }
  }
  return queue
}
const gap = (x, y, o) => Math.hypot(Math.max(o.x - x, 0, x - (o.x + o.w)), Math.max(o.y - y, 0, y - (o.y + o.d)))

test('Raum-Karten: jedes der neun Zimmer hat eine Karte', () => {
  for (const r of ROOMS) assert.ok(ROOM_MAPS[r.id], `Keine 2,5D-Karte für ${r.id}`)
  assert.equal(Object.keys(ROOM_MAPS).length, ROOMS.length)
})

test('Raum-Karten: Startpunkt frei, alle Gegenstände liegen im Raum, untersuchbare haben Text', () => {
  for (const [id, def] of Object.entries(ROOM_MAPS)) {
    const s = spawn(); assert.ok(!blocked(def, s.x, s.y), `${id}: Startpunkt ist zugestellt`)
    for (const o of def.objects) {
      assert.ok(o.x >= 0 && o.y >= 0 && o.x + o.w <= COLS && o.y + o.d <= ROWS, `${id}: ${o.kind} (${o.x}, ${o.y}) ragt aus dem Raum`)
      assert.ok(!o.label === !o.text, `${id}: ${o.kind} braucht label UND text (oder keins von beiden)`)
    }
  }
})

test('Raum-Karten: jeder untersuchbare Gegenstand und die Tür sind erreichbar', () => {
  for (const [id, def] of Object.entries(ROOM_MAPS)) {
    const points = reachable(def)
    assert.ok(points.length > 800, `${id}: zu wenig begehbare Fläche`)
    for (const o of def.objects.filter(o => o.label)) assert.ok(points.some(([x, y]) => gap(x, y, o) < REACH), `${id}: „${o.label}“ ist nicht erreichbar`)
    const near = points.some(([x, y]) => nearest(def, { x, y })?.leave)
    assert.ok(near, `${id}: die Tür ist nicht erreichbar`)
  }
})

test('Raum-Kollision: Möbel blockieren, an Kanten wird entlanggeglitten', () => {
  const def = ROOM_MAPS.library, table = def.objects.find(o => o.label === 'Lesetisch')
  // direkt über dem Tisch stehen und nach unten drücken → bleibt stehen
  const above = { x: table.x + table.w / 2, y: table.y - 0.2 }
  assert.deepEqual(step(def, above, 0, 0.3), above)
  // schräg gegen den Tisch → die freie Achse darf trotzdem laufen (Gleiten)
  const slid = step(def, above, 0.3, 0.3); assert.ok(slid.x > above.x && slid.y === above.y)
  // Raumgrenzen
  assert.deepEqual(step(def, { x: 0.3, y: 5 }, -1, 0), { x: 0.3, y: 5 })
})

test('Verstecke: die Möbel in den Raumdaten passen genau zur Liste auf dem Server', async () => {
  const { SPOTS } = await import('../shared/roomSpots.js')
  for (const [id, def] of Object.entries(ROOM_MAPS)) {
    const spots = def.objects.filter(o => o.spot).map(o => o.spot)
    assert.deepEqual([...spots].sort(), [...SPOTS[id]].sort(), `${id}: Versteck-IDs stimmen nicht überein`)
    assert.equal(new Set(spots).size, spots.length, `${id}: doppelte Versteck-ID`)
    for (const o of def.objects.filter(o => o.label)) assert.ok(o.spot, `${id}: „${o.label}“ hat keine Versteck-ID`)
  }
})
