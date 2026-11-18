import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ROOM_MAPS, DOOR } from '../src/rooms/roomData.js'
import { TS, K, OX, OY } from '../src/rooms/roomRenderer.js'
const X = x => OX + x * TS, Y = (y, z = 0) => OY + y * TS * K - z * TS
// Wie hoch Dinge auf/an Möbeln über die Box hinausragen (in Kacheln)
const EXTRA = { console: 1.0, fireplace: 0.5, armor: 0.7, cuerack: 1.1, statue: 1.4, gramophone: 0.8, desk: 0.45, cart: 0.6, piano: 0.1, stairs: 0.2, table: 0.45 }
const wallSpan = d => {
  if (d.kind === 'sconce') return [X(d.x) - 7, X(d.x) + 7, Y(0, 1.7) - 26, Y(0, 1.7) + 4]
  if (d.kind === 'painting') return [X(d.x - d.w / 2) - 5, X(d.x + d.w / 2) + 5, Y(0, d.z + d.h) - 5, Y(0, d.z) + 5]
  if (d.kind === 'shelf') return [X(d.x), X(d.x + d.w), Y(0, d.z) - 18, Y(0, d.z) + 5]
  if (d.kind === 'banner') return [X(d.x - 0.35), X(d.x + 0.35), Y(0, 2.35), Y(0, 2.35) + 118]
  if (d.kind === 'dartboard') return [X(d.x) - 26, X(d.x) + 26, Y(0, d.z) - 26, Y(0, d.z) + 26]
  if (d.kind === 'window') { const h = d.tall ? 1.9 : 1.3, z = d.tall ? 0.75 : 1.25, cw = Math.max(10, d.w * TS * 0.2); return [X(d.x) - 14, X(d.x + d.w) + 14, Y(0, z + h) - 12, Y(0, z) + 12] }
  if (d.kind === 'door') return [X(DOOR.x) - 8, X(DOOR.x + DOOR.w) + 8, Y(0, 2.15) - 26, Y(0)]
}
const objSpan = o => [X(o.x), X(o.x + o.w), Y(o.y, o.h + (EXTRA[o.kind] || 0)), Y(o.y + o.d)]
const hit = (a, b, pad = 0) => a[0] < b[1] - pad && b[0] < a[1] - pad && a[2] < b[3] - pad && b[2] < a[3] - pad
const rect = r => ({ x0: r.x, x1: r.x + r.w, y0: r.y, y1: r.y + r.d })
const rOver = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05

// Gewollte Fälle: freie Tanzfläche, Läufer zur Tür (die Fußmatte wird dort ausgeblendet),
// Teppich unter der ganzen Sitzgruppe, Bild über dem Kamin (die Kerzen stehen links und rechts davon).
const ALLOWED = [
  'ballroom: Teppich medallion@4.3,3.1 liegt unter keinem großen Möbel',
  'hall: Teppich auf Teppich: runner@6.3,0.6 & mat',
  'hall: Teppich runner@6.3,0.6 liegt unter keinem großen Möbel',
  'lounge: Teppich border@1.9,3.4 nicht mittig unter sofa (dx -3.50, dy -0.20)',
  'lounge: Wand: painting@3.3 wird verdeckt von fireplace@1.3',
]

test('Raum-Gestaltung: nichts verdeckt Wandschmuck, kein Teppich auf Teppich, Teppiche liegen mittig', () => {
  const found = []
  for (const [id, def] of Object.entries(ROOM_MAPS)) {
    const walls = [...def.decor, ...def.windows.filter(w => w.w).map(w => ({ ...w, kind: 'window' })), { kind: 'door' }]
    const near = def.objects.filter(o => o.y < 1.3)
    for (const d of walls) for (const o of near) { const a = wallSpan(d), b = objSpan(o); if (a && hit(a, b, 2)) found.push(`${id}: Wand: ${d.kind}${d.x !== undefined ? '@' + d.x : ''} wird verdeckt von ${o.kind}@${o.x}`) }
    for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) { const a = wallSpan(walls[i]), b = wallSpan(walls[j]); if (a && b && hit(a, b, 1)) found.push(`${id}: Wand: ${walls[i].kind}@${walls[i].x} überlappt ${walls[j].kind}@${walls[j].x}`) }
    const mat = { x: 6.7, y: 0.55, w: 1.6, d: 0.7, style: 'mat' }, rugs = [...def.rugs, mat]
    for (let i = 0; i < rugs.length; i++) for (let j = i + 1; j < rugs.length; j++) if (rOver(rect(rugs[i]), rect(rugs[j]))) found.push(`${id}: Teppich auf Teppich: ${rugs[i].style}@${rugs[i].x},${rugs[i].y} & ${rugs[j].style}`)
    for (const r of def.rugs) {
      const R = rect(r), on = def.objects.filter(o => { const c = { x: o.x + o.w / 2, y: o.y + o.d / 2 }; return c.x > R.x0 && c.x < R.x1 && c.y > R.y0 && c.y < R.y1 && o.w * o.d > 1.5 })
      if (!on.length) { found.push(`${id}: Teppich ${r.style}@${r.x},${r.y} liegt unter keinem großen Möbel`); continue }
      const big = on.sort((a, b) => b.w * b.d - a.w * a.d)[0], dx = (big.x + big.w / 2) - (r.x + r.w / 2), dy = (big.y + big.d / 2) - (r.y + r.d / 2)
      if (Math.abs(dx) > 0.25 || Math.abs(dy) > 0.35) found.push(`${id}: Teppich ${r.style}@${r.x},${r.y} nicht mittig unter ${big.kind} (dx ${dx.toFixed(2)}, dy ${dy.toFixed(2)})`)
    }
  }
  assert.deepEqual(found.filter(f => !ALLOWED.includes(f)), [])
})
