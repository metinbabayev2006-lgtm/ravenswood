import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRemoteFigures, startRoomSync } from '../src/rooms/roomSync.js'

test('Live-Abgleich: andere Figuren gleiten zur neuen Position und laufen dabei', () => {
  const f = createRemoteFigures()
  f.apply([{ id: 'b', x: 2, y: 2, face: 's', moving: false }])
  f.apply([{ id: 'b', x: 3, y: 2, face: 'e', moving: true }])
  f.tick(0.05)
  const [b] = f.list()
  assert.ok(b.x > 2 && b.x < 3, 'bewegt sich schrittweise statt zu springen')
  assert.equal(b.face, 'e'); assert.ok(b.moving && b.walk > 0)
  for (let i = 0; i < 60; i++) f.tick(0.05)
  assert.ok(Math.abs(f.list()[0].x - 3) < 0.01, 'kommt am Ziel an')
  f.apply([{ id: 'b', x: 12, y: 8, face: 's', moving: false }]); f.tick(0.016)
  assert.deepEqual([f.list()[0].x, f.list()[0].y], [12, 8], 'großer Sprung (Aussetzer) wird direkt übernommen')
  f.apply([]); assert.equal(f.list().length, 0, 'wer weg ist, verschwindet')
})

test('Live-Abgleich: sendet die eigene Position, liefert andere und hört sauber auf', async () => {
  const calls = [], seen = []
  const fetchImpl = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body), auth: opts.headers.Authorization }); return { ok: true, json: async () => ({ others: [{ id: 'b', x: 1, y: 1, face: 's', moving: false }] }) } }
  const stop = startRoomSync({ code: 'ABC234', token: 'geheim', getPos: () => ({ x: 7.5, y: 2, face: 'n', moving: true }), onOthers: l => seen.push(l), fetchImpl })
  await new Promise(r => setTimeout(r, 400))
  stop()
  const n = calls.length
  await new Promise(r => setTimeout(r, 400))
  assert.ok(n >= 2, `mehrere Abgleiche in 0,4 s (waren ${n})`)
  assert.equal(calls.length, n, 'nach stop() keine weiteren Anfragen')
  assert.equal(calls[0].url, '/api/rooms/ABC234/presence'); assert.equal(calls[0].auth, 'Bearer geheim')
  assert.deepEqual(calls[0].body, { x: 7.5, y: 2, face: 'n', moving: true })
  assert.equal(seen[0][0].id, 'b')
})

test('Live-Abgleich: Netzwerkfehler bringen nichts zum Absturz', async () => {
  let n = 0
  const stop = startRoomSync({ code: 'ABC234', token: 't', getPos: () => ({ x: 1, y: 1 }), onOthers: () => {}, fetchImpl: async () => { n++; throw new Error('offline') } })
  await new Promise(r => setTimeout(r, 100)); stop()
  assert.equal(n, 1, 'nach einem Fehler wird erst nach einer Pause erneut versucht')
})
