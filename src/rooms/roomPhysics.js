// Kollision & „Untersuchen“-Logik der Rauminstanzen. Reine Funktionen ohne DOM – gut testbar.
import { COLS, ROWS, DOOR, SPAWN, PLAYER, REACH } from './roomData.js'

const overlaps = (x, y, o) => Math.abs(x - (o.x + o.w / 2)) < PLAYER.hx + o.w / 2 && Math.abs(y - (o.y + o.d / 2)) < PLAYER.hy + o.d / 2
export const blocked = (def, x, y) => x < PLAYER.hx || x > COLS - PLAYER.hx || y < 0.25 || y > ROWS - PLAYER.hy || def.objects.some(o => o.solid && overlaps(x, y, o))
// Bewegt in zwei getrennten Achsen, damit man an Möbeln entlanggleiten kann.
export function step(def, pos, dx, dy) {
  let { x, y } = pos
  if (!blocked(def, x + dx, y)) x += dx
  if (!blocked(def, x, y + dy)) y += dy
  return { x, y }
}
const gap = (x, y, o) => Math.hypot(Math.max(o.x - x, 0, x - (o.x + o.w)), Math.max(o.y - y, 0, y - (o.y + o.d)))
export const exitDoor = { ...DOOR, leave: true, label: 'Raum verlassen' }
// Nächster untersuchbarer Gegenstand (oder die Tür) in Reichweite.
export function nearest(def, pos) {
  let best = null, bestGap = REACH
  for (const o of [exitDoor, ...def.objects.filter(o => o.label && o.text)]) {
    const g = gap(pos.x, pos.y, o)
    if (g < bestGap) { best = o; bestGap = g }
  }
  return best
}
export const spawn = () => ({ ...SPAWN })
