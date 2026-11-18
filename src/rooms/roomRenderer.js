// Ravenswood · 2,5D-Renderer (reines Canvas 2D, keine Bibliothek).
// Schrägansicht: Boden von vorne, Möbel mit sichtbarer Oberseite + Frontfläche, Tiefensortierung nach y.
import { COLS, ROWS, DOOR, PLAYER } from './roomData.js'

export const TS = 48, K = 0.7, WALL_H = 2.7, PADX = 34, PADT = 18, PADB = 34
export const OX = PADX, OY = PADT + WALL_H * TS
export const WIDTH = COLS * TS + 2 * PADX
export const HEIGHT = Math.ceil(OY + ROWS * TS * K + PADB)
const X = x => OX + x * TS
const Y = (y, z = 0) => OY + y * TS * K - z * TS
const TAU = Math.PI * 2

// ---------- Farb- und Zeichenhelfer ----------
const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); return rgb(A.map((v, i) => v + (B[i] - v) * t)) }
const shade = (c, t) => (t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t))
const rnd = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const pal = (base, t = 0.16) => ({ front: base, top: shade(base, t) })
const rr = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath() }
const ell = (ctx, cx, cy, rx, ry, fill, rot = 0) => { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), rot, 0, TAU); ctx.fillStyle = fill; ctx.fill() }
const rect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h) }
const poly = (ctx, pts, fill) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill() }

// Quader mit Oberseite (hell) und Frontfläche; z hebt ihn an (für Dinge auf Möbeln).
function box(ctx, x, y, w, d, h, col, z = 0, shadow = true) {
  const fx = X(x), fw = w * TS, fy = Y(y + d, z + h), fh = h * TS, ty = Y(y, z + h), th = d * TS * K
  if (shadow && !z) rect(ctx, fx + 3, Y(y + d) - 1, fw + 4, Math.min(10, th * 0.5 + 4), 'rgba(0,0,0,.30)')
  rect(ctx, fx, fy, fw, fh, col.front); rect(ctx, fx, ty, fw, th, col.top)
  rect(ctx, fx, ty, fw, 1.5, 'rgba(255,255,255,.16)'); rect(ctx, fx, fy, fw, 1.5, 'rgba(255,255,255,.08)')
  rect(ctx, fx + fw - 3, fy, 3, fh, 'rgba(0,0,0,.16)'); rect(ctx, fx, fy + fh - 3, fw, 3, 'rgba(0,0,0,.2)')
  return { fx, fy, fw, fh, ty, th }
}
function cyl(ctx, cx, topCy, rx, ry, hpx, col) {
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0)
  g.addColorStop(0, 'rgba(0,0,0,.30)'); g.addColorStop(0.35, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,0,.38)')
  rect(ctx, cx - rx, topCy, rx * 2, hpx, col.front); ell(ctx, cx, topCy + hpx, rx, ry, col.front)
  rect(ctx, cx - rx, topCy, rx * 2, hpx, g); ell(ctx, cx, topCy + hpx, rx, ry, g); ell(ctx, cx, topCy, rx, ry, col.top)
}

// ---------- Boden ----------
function drawFloor(ctx, def) {
  const [a, b] = def.floor, fx = X(0), fy = Y(0), fw = COLS * TS, fh = ROWS * TS * K, th = TS * K
  rect(ctx, fx, fy, fw, fh, a)
  if (def.style === 'planks') {
    for (let r = 0; r < ROWS * 2; r++) {
      let x = -rnd(r) * 3
      for (let s = 0; x < COLS; s++) {
        const len = 2.2 + rnd(r * 17 + s) * 1.6, x0 = Math.max(x, 0), x1 = Math.min(x + len, COLS)
        rect(ctx, fx + x0 * TS, fy + r * 0.5 * th, (x1 - x0) * TS, 0.5 * th + 0.5, mix(a, b, rnd(r * 31 + s * 7)))
        rect(ctx, fx + x0 * TS, fy + r * 0.5 * th, 1, 0.5 * th, 'rgba(0,0,0,.22)')
        x += len
      }
      rect(ctx, fx, fy + r * 0.5 * th, fw, 1, 'rgba(0,0,0,.16)')
    }
    return
  }
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const px = fx + i * TS, py = fy + j * th, odd = (i + j) % 2
    if (def.style === 'checker') { if (odd) rect(ctx, px, py, TS + 0.5, th + 0.5, b); rect(ctx, px, py, TS, 1, 'rgba(0,0,0,.08)') }
    else if (def.style === 'marble') {
      rect(ctx, px, py, TS + 0.5, th + 0.5, odd ? b : mix(a, '#ffffff', rnd(i * 7 + j) * 0.18))
      ctx.strokeStyle = odd ? 'rgba(255,255,255,.10)' : 'rgba(80,70,60,.10)'; ctx.beginPath(); ctx.moveTo(px + rnd(i + j * 5) * TS, py); ctx.lineTo(px + rnd(i * 3 + j) * TS, py + th); ctx.stroke()
    } else if (def.style === 'parquet') {
      rect(ctx, px, py, TS + 0.5, th + 0.5, odd ? b : a)
      for (let k = 1; k < 4; k++) odd ? rect(ctx, px, py + (k * th) / 4, TS, 1, 'rgba(0,0,0,.2)') : rect(ctx, px + (k * TS) / 4, py, 1, th, 'rgba(0,0,0,.2)')
      rect(ctx, px, py, TS, 1, 'rgba(0,0,0,.25)')
    } else if (def.style === 'stone') {
      rect(ctx, px, py, TS + 0.5, th + 0.5, mix(a, b, rnd(i * 13 + j * 7)))
      rect(ctx, px, py, TS, 1.5, 'rgba(0,0,0,.22)'); rect(ctx, px, py, 1.5, th, 'rgba(0,0,0,.22)')
      if (rnd(i * 5 + j * 11) > 0.6) ell(ctx, px + rnd(i + j) * TS, py + th * 0.6, 7, 3, 'rgba(70,110,60,.35)')
    } else if (def.style === 'carpet') {
      ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + TS, py + th); ctx.moveTo(px + TS, py); ctx.lineTo(px, py + th); ctx.stroke()
    }
  }
  if (def.style === 'carpet') { ctx.strokeStyle = b; ctx.lineWidth = 3; ctx.strokeRect(fx + 8, fy + 6, fw - 16, fh - 12); ctx.lineWidth = 1 }
}

function drawRugs(ctx, def) {
  const mat = { x: 6.7, y: 0.55, w: 1.6, d: 0.7, c1: '#3b2f26', c2: '#8f7a52', style: 'mat' }
  const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d
  // Fußmatte nur, wenn dort nicht schon ein Teppich liegt (kein Teppich auf Teppich)
  for (const r of def.rugs.some(r => over(r, mat)) ? def.rugs : [...def.rugs, mat]) {
    const x = X(r.x), y = Y(r.y), w = r.w * TS, h = r.d * TS * K
    rect(ctx, x + 3, y + 4, w, h, 'rgba(0,0,0,.28)')
    if (r.style === 'moss') { ell(ctx, x + w / 2, y + h / 2, w / 2, h / 2, r.c1); ell(ctx, x + w / 2, y + h / 2, w / 2 - 8, h / 2 - 5, r.c2); continue }
    rect(ctx, x, y, w, h, r.c1)
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip() // Muster bleibt immer auf dem Teppich
    if (r.style === 'medallion') {
      ctx.strokeStyle = r.c2; ctx.lineWidth = 3; ctx.strokeRect(x + 6, y + 5, w - 12, h - 10); ctx.lineWidth = 1
      ell(ctx, x + w / 2, y + h / 2, w * 0.3, h * 0.36, r.c2); ell(ctx, x + w / 2, y + h / 2, w * 0.26, h * 0.31, r.c1); ell(ctx, x + w / 2, y + h / 2, w * 0.1, h * 0.12, r.c2)
    } else if (r.style === 'runner') {
      rect(ctx, x + 5, y, 3, h, r.c2); rect(ctx, x + w - 8, y, 3, h, r.c2)
      const n = Math.max(1, Math.floor((h - 8) / 14)), gap = (h - 8) / n
      for (let k = 0; k < n; k++) ell(ctx, x + w / 2, y + 4 + gap * (k + 0.5), 7, Math.min(4, gap * 0.32), r.c2)
    } else if (r.style === 'border') {
      ctx.strokeStyle = r.c2; ctx.lineWidth = 3; ctx.strokeRect(x + 7, y + 6, w - 14, h - 12); ctx.lineWidth = 1; ctx.strokeRect(x + 14, y + 12, w - 28, h - 24)
      for (let i = 1; i < w / 36; i++) for (let j = 1; j < h / 26; j++) poly(ctx, [[x + i * 36, y + j * 26 - 5], [x + i * 36 + 5, y + j * 26], [x + i * 36, y + j * 26 + 5], [x + i * 36 - 5, y + j * 26]], 'rgba(255,255,255,.08)')
    } else if (r.style === 'mat') { ctx.strokeStyle = r.c2; ctx.strokeRect(x + 4, y + 3, w - 8, h - 6) }
    ctx.restore()
    if (r.style !== 'mat') for (let k = 0; k < w; k += 5) { rect(ctx, x + k, y - 3, 1.5, 3, r.c2); rect(ctx, x + k, y + h, 1.5, 3, r.c2) }
  }
}

// ---------- Wand, Fenster, Bilder, Tür ----------
function drawWall(ctx, def, t) {
  const { base, trim, style } = def.wall, x0 = 0, y0 = PADT, w = WIDTH, h = OY - PADT
  rect(ctx, x0, y0, w, h, base)
  const wy = z => Y(0, z)
  if (style === 'glass') {
    const g = ctx.createLinearGradient(0, y0, 0, OY); g.addColorStop(0, '#0b1d2c'); g.addColorStop(1, '#244a47'); rect(ctx, X(0), y0 + 6, COLS * TS, h - 6, g)
    for (let i = 0; i < 40; i++) ell(ctx, X(rnd(i) * COLS), y0 + 12 + rnd(i + 90) * h * 0.5, 1.1, 1.1, 'rgba(255,255,255,.6)')
    ell(ctx, X(11.6), y0 + 38, 16, 16, '#eef0d8'); ell(ctx, X(11.6) + 5, y0 + 35, 14, 14, '#0f2434')
    for (let i = 0; i < 26; i++) { const tx = X(rnd(i * 3) * COLS), th = 20 + rnd(i) * 50; poly(ctx, [[tx - 14, OY - 6], [tx, OY - 6 - th], [tx + 14, OY - 6]], 'rgba(10,40,34,.75)') }
    for (let x = 0; x <= COLS; x += 2.5) rect(ctx, X(x) - 2, y0, 4, h, trim)
    rect(ctx, X(0), wy(1.5) - 2, COLS * TS, 4, trim); rect(ctx, X(0), y0, COLS * TS, 6, trim)
    rect(ctx, 0, OY - 12, w, 12, '#27413c')
  } else {
    if (style === 'tiles') { for (let r = 0; r * 12 < h - 20; r++) for (let c = -1; c < w / 24; c++) { const px = c * 24 + (r % 2) * 12, py = OY - 20 - r * 12; rect(ctx, px, py, 23, 11, mix(base, '#ffffff', 0.08 + rnd(r * 91 + c) * 0.1)) } }
    else if (style === 'paper' || style === 'damask') {
      for (let c = 0; c < w / 24; c++) rect(ctx, c * 24, y0, 12, h, 'rgba(255,255,255,.05)')
      if (style === 'damask') for (let r = 0; r < 5; r++) for (let c = 0; c < w / 38; c++) { const px = c * 38 + (r % 2) * 19, py = y0 + 30 + r * 30; poly(ctx, [[px, py - 9], [px + 6, py], [px, py + 9], [px - 6, py]], 'rgba(255,230,170,.13)') }
    } else if (style === 'panel') {
      for (let c = 0; c * 66 < w; c++) { const px = c * 66 + 6; rect(ctx, px, y0 + 26, 54, h - 60, 'rgba(0,0,0,.14)'); rect(ctx, px + 3, y0 + 29, 48, h - 66, 'rgba(255,255,255,.04)') }
    }
    if (style !== 'tiles') { rect(ctx, 0, wy(0.95), w, OY - wy(0.95), shade(base, -0.28)); for (let c = 0; c * 50 < w; c++) rect(ctx, c * 50 + 6, wy(0.82), 38, wy(0.1) - wy(0.82), 'rgba(0,0,0,.18)'); rect(ctx, 0, wy(0.95) - 3, w, 5, trim) }
    else { rect(ctx, 0, wy(0.95), w, OY - wy(0.95), mix(def.wall.trim, '#000000', 0.2)); rect(ctx, 0, wy(0.95) - 3, w, 5, '#e8eee6') }
    rect(ctx, 0, y0, w, 11, trim); rect(ctx, 0, y0 + 11, w, 3, 'rgba(0,0,0,.3)'); rect(ctx, 0, OY - 7, w, 7, shade(trim, -0.25))
  }
  const sh = ctx.createLinearGradient(0, y0, 0, OY); sh.addColorStop(0, 'rgba(0,0,0,.40)'); sh.addColorStop(0.35, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.28)'); rect(ctx, 0, y0, w, h, sh)
  // seitliche Mauerstärke
  const sw = ctx.createLinearGradient(0, 0, PADX, 0); sw.addColorStop(0, shade(base, -0.62)); sw.addColorStop(1, shade(base, -0.36))
  ctx.fillStyle = sw; ctx.fillRect(0, y0, PADX, OY - y0 + ROWS * TS * K + 8); ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1); ctx.fillStyle = sw; ctx.fillRect(0, y0, PADX, OY - y0 + ROWS * TS * K + 8); ctx.restore()
  rect(ctx, PADX - 3, y0, 3, OY - y0 + ROWS * TS * K, 'rgba(0,0,0,.35)'); rect(ctx, w - PADX, y0, 3, OY - y0 + ROWS * TS * K, 'rgba(0,0,0,.35)')
  // Fußkante des Bodens
  rect(ctx, 0, Y(ROWS), w, 9, shade(def.floor[0], -0.55)); rect(ctx, 0, Y(ROWS) + 9, w, 6, 'rgba(0,0,0,.5)')
}

const WINDOW = (ctx, def, win, t) => {
  if (win.skip || !win.w) return
  const h = win.tall ? 1.9 : 1.3, z = win.tall ? 0.75 : 1.25, px = X(win.x), py = Y(0, z + h), pw = win.w * TS, ph = h * TS, trim = def.wall.trim
  rect(ctx, px - 6, py - 6, pw + 12, ph + 12, trim)
  const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, '#0a1630'); g.addColorStop(1, '#27406a'); rect(ctx, px, py, pw, ph, g)
  for (let i = 0; i < 9; i++) ell(ctx, px + 4 + rnd(win.x * 9 + i) * (pw - 8), py + 4 + rnd(win.x + i * 5) * ph * 0.5, 1, 1, 'rgba(255,255,255,.65)')
  ell(ctx, px + pw * 0.72, py + ph * 0.28, 9, 9, '#f2f0da')
  for (let i = 0; i < 3; i++) poly(ctx, [[px + i * pw * 0.4, py + ph], [px + i * pw * 0.4 + pw * 0.2, py + ph * (0.65 - rnd(i + win.x) * 0.1)], [px + i * pw * 0.4 + pw * 0.4, py + ph]], 'rgba(8,16,28,.8)')
  rect(ctx, px + pw / 2 - 2, py, 4, ph, trim); rect(ctx, px, py + ph * 0.45, pw, 4, trim)
  rect(ctx, px - 9, py + ph + 6, pw + 18, 6, shade(trim, -0.2))
  const c = def.curtain, cw = Math.max(10, pw * 0.2)
  for (const [cx, dir] of [[px - 10, 1], [px + pw + 10 - cw, -1]]) { rect(ctx, cx, py - 8, cw, ph + 16, c); for (let k = 1; k < 4; k++) rect(ctx, cx + (k * cw) / 4, py - 8, 1.5, ph + 16, 'rgba(0,0,0,.25)'); rect(ctx, cx + (dir > 0 ? cw - 4 : 0), py - 8, 4, ph + 16, 'rgba(255,255,255,.1)') }
  rect(ctx, px - 14, py - 12, pw + 28, 5, '#b99a58')
}

const DECOR = {
  painting(ctx, d) {
    const x = X(d.x - d.w / 2), y = Y(0, d.z + d.h), w = d.w * TS, h = d.h * TS
    rect(ctx, x - 5, y - 5, w + 10, h + 10, '#b99a58'); rect(ctx, x - 2, y - 2, w + 4, h + 4, '#5a4326')
    if (d.variant === 0) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#e9c27d'); g.addColorStop(1, '#7da0a8'); rect(ctx, x, y, w, h, g); poly(ctx, [[x, y + h], [x + w * 0.3, y + h * 0.5], [x + w * 0.6, y + h * 0.72], [x + w, y + h * 0.4], [x + w, y + h]], '#3f5d44'); ell(ctx, x + w * 0.75, y + h * 0.25, 7, 7, '#fff2c0') }
    else if (d.variant === 1) { rect(ctx, x, y, w, h, '#241a18'); ell(ctx, x + w / 2, y + h * 0.4, w * 0.16, h * 0.24, '#d8b99a'); poly(ctx, [[x + w * 0.2, y + h], [x + w * 0.3, y + h * 0.66], [x + w * 0.7, y + h * 0.66], [x + w * 0.8, y + h]], '#4b2b36'); ell(ctx, x + w / 2, y + h * 0.28, w * 0.18, h * 0.12, '#3a2a22') }
    else { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#32486e'); g.addColorStop(0.6, '#6f93a6'); g.addColorStop(1, '#1c2f4d'); rect(ctx, x, y, w, h, g); for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x, y + h * (0.55 + i * 0.1)); ctx.quadraticCurveTo(x + w / 2, y + h * (0.45 + i * 0.1), x + w, y + h * (0.55 + i * 0.1)); ctx.stroke() } }
  },
  sconce(ctx, d, t) { const cx = X(d.x), cy = Y(0, 1.7); rect(ctx, cx - 6, cy, 12, 4, '#b99a58'); rect(ctx, cx - 2, cy - 14, 4, 15, '#e8dfc8'); ell(ctx, cx, cy - 18, 3.2, 5.5 + Math.sin(t * 9 + d.x) * 0.8, '#ffd978'); ell(ctx, cx, cy - 17, 1.6, 3, '#fff6cf') },
  dartboard(ctx, d) { const cx = X(d.x), cy = Y(0, d.z); [[26, '#161616'], [22, '#e9dcc0'], [18, '#b3343a'], [13, '#e9dcc0'], [9, '#2f6b45'], [4, '#b3343a']].forEach(([r, c]) => ell(ctx, cx, cy, r, r, c)); for (let i = 0; i < 3; i++) rect(ctx, cx + 4 + i * 6, cy - 6 + i * 4, 10, 2, '#cfd4d8') },
  banner(ctx, d) { const x = X(d.x - 0.35), y = Y(0, 2.35), w = 0.7 * TS; rect(ctx, x - 4, y - 3, w + 8, 5, '#b99a58'); poly(ctx, [[x, y], [x + w, y], [x + w, y + 98], [x + w / 2, y + 118], [x, y + 98]], '#7d1f2e'); poly(ctx, [[x + 5, y + 5], [x + w - 5, y + 5], [x + w - 5, y + 92], [x + w / 2, y + 108], [x + 5, y + 92]], 'rgba(0,0,0,0)'); ctx.strokeStyle = '#d1ac63'; ctx.strokeRect(x + 5, y + 5, w - 10, 86); ctx.fillStyle = '#d1ac63'; ctx.font = 'bold 22px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('R', x + w / 2, y + 52) },
  shelf(ctx, d) { const x = X(d.x), y = Y(0, d.z), w = d.w * TS; rect(ctx, x, y, w, 5, '#6b4a35'); ['#b4453f', '#e8dcc2', '#5a7d9a', '#d7b25a', '#6b8f5a'].forEach((c, i) => rect(ctx, x + 4 + i * (w - 10) / 5, y - 14 - (i % 2) * 3, (w - 10) / 5 - 3, 14 + (i % 2) * 3, c)) },
}

function drawDoor(ctx, def, t) {
  const x = X(DOOR.x), w = DOOR.w * TS, y = Y(0, 2.15), h = 2.15 * TS, trim = def.wall.trim
  rect(ctx, x - 8, y - 8, w + 16, h + 8, trim); rect(ctx, x - 3, y - 3, w + 6, h + 3, '#1a110c')
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#6b4429'); g.addColorStop(1, '#4a2e1b'); rect(ctx, x, y, w, h, g)
  for (const [px, py, pw, ph] of [[0.12, 0.08, 0.76, 0.38], [0.12, 0.52, 0.76, 0.4]]) { rect(ctx, x + w * px, y + h * py, w * pw, h * ph, 'rgba(0,0,0,.2)'); rect(ctx, x + w * px + 3, y + h * py + 3, w * pw - 6, h * ph - 6, 'rgba(255,255,255,.05)') }
  ell(ctx, x + w - 12, y + h * 0.55, 4, 4, '#d9b866'); rect(ctx, x + w - 14, y + h * 0.55 - 1, 4, 2, '#8a6b2e')
  rect(ctx, x + 8, y + h, w - 16, 3, `rgba(255,214,140,${0.25 + Math.sin(t * 2) * 0.04})`)
  rect(ctx, x + w / 2 - 28, y - 24, 56, 14, '#2a1d12'); ctx.strokeStyle = '#b99a58'; ctx.strokeRect(x + w / 2 - 28, y - 24, 56, 14)
  ctx.fillStyle = '#e5d6b1'; ctx.font = 'bold 9px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('AUSGANG', x + w / 2, y - 14)
}

// ---------- Möbel ----------
const lines = (ctx, x, y, w, h, n, vertical, c = 'rgba(0,0,0,.25)') => { for (let i = 1; i < n; i++) vertical ? rect(ctx, x + (w * i) / n, y, 1.5, h, c) : rect(ctx, x, y + (h * i) / n, w, 1.5, c) }
const books = (ctx, x, y, w, h, seed) => {
  let cx = x
  while (cx < x + w - 3) { const bw = 3 + rnd(seed + cx) * 4, bh = h * (0.62 + rnd(seed + cx * 3) * 0.36); rect(ctx, cx, y + h - bh, bw, bh, ['#49766e', '#996c5e', '#9e8e61', '#696d8b', '#7d2a38', '#c9b27a', '#3d5a45'][Math.floor(rnd(seed + cx * 7) * 7)]); rect(ctx, cx, y + h - bh, bw, 1, 'rgba(255,255,255,.2)'); cx += bw + 0.6 }
}
const flame = (ctx, x, y, t, s = 1, seed = 0) => { const f = 1 + Math.sin(t * 9 + seed) * 0.15; ell(ctx, x, y - 3 * s * f, 2.6 * s, 5.5 * s * f, '#ffb347'); ell(ctx, x, y - 2.5 * s, 1.5 * s, 3.4 * s * f, '#fff0b0') }

const KINDS = {
  counter(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: o.color || '#7d8a86', top: '#d8d2c4' })
    const n = Math.max(1, Math.round(o.w / 0.75)); lines(ctx, g.fx, g.fy + 4, g.fw, g.fh - 8, n, true)
    for (let i = 0; i < n; i++) { rect(ctx, g.fx + ((i + 0.5) * g.fw) / n - 1.5, g.fy + 8, 3, 8, '#cfd4d3') }
    if (o.sink) { rect(ctx, g.fx + g.fw * 0.2, g.ty + 4, g.fw * 0.6, g.th - 8, '#a4adb0'); rect(ctx, g.fx + g.fw * 0.24, g.ty + 7, g.fw * 0.52, g.th - 14, '#5c6a70'); rect(ctx, g.fx + g.fw / 2 - 2, g.ty - 12, 4, 14, '#cfd4d3'); rect(ctx, g.fx + g.fw / 2 - 2, g.ty - 12, 14, 3, '#cfd4d3') }
  },
  stove(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#8d9496', top: '#2b2e30' })
    for (const [a, b] of [[0.28, 0.32], [0.72, 0.32], [0.28, 0.72], [0.72, 0.72]]) { ell(ctx, g.fx + g.fw * a, g.ty + g.th * b, 9, 4.5, '#14161a'); ell(ctx, g.fx + g.fw * a, g.ty + g.th * b, 4, 2, '#3b4045') }
    rect(ctx, g.fx + 6, g.fy + 14, g.fw - 12, g.fh - 24, '#1a1d20'); rect(ctx, g.fx + 8, g.fy + 16, g.fw - 16, 9, 'rgba(255,255,255,.1)'); rect(ctx, g.fx + 6, g.fy + 8, g.fw - 12, 3, '#cfd4d3')
    for (let i = 0; i < 4; i++) ell(ctx, g.fx + 12 + (i * (g.fw - 24)) / 3, g.fy + 5, 2.5, 2.5, '#cfd4d3')
  },
  fridge(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#cfd6d8', top: '#e3e8e9' })
    rect(ctx, g.fx, g.fy + g.fh * 0.38, g.fw, 2, 'rgba(0,0,0,.3)'); rect(ctx, g.fx + g.fw - 9, g.fy + g.fh * 0.12, 3, 22, '#7d8587'); rect(ctx, g.fx + g.fw - 9, g.fy + g.fh * 0.45, 3, 36, '#7d8587')
    rect(ctx, g.fx + 8, g.fy + 20, 7, 9, '#b4453f'); rect(ctx, g.fx + 18, g.fy + 26, 8, 7, '#d7b25a'); rect(ctx, g.fx + 11, g.fy + 34, 6, 8, '#5a7d9a')
  },
  island(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#6e5440', top: '#b98b5a' })
    for (let i = 0; i < 5; i++) rect(ctx, g.fx + 6, g.ty + 5 + i * (g.th / 5), g.fw - 12, 1, 'rgba(90,50,20,.25)')
    lines(ctx, g.fx, g.fy + 4, g.fw, g.fh - 8, 5, true); rect(ctx, g.fx + g.fw * 0.18, g.ty + 6, 30, g.th - 14, '#d7bd8f'); ell(ctx, g.fx + g.fw * 0.7, g.ty + g.th * 0.5, 13, 6, '#5a7d9a'); ell(ctx, g.fx + g.fw * 0.7, g.ty + g.th * 0.5 - 2, 9, 3.5, '#b4453f')
  },
  stool(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h * 0.4, pal(o.color || '#6e2b36'), o.h * 0.6)
    for (const lx of [0.15, 0.85]) rect(ctx, g.fx + g.fw * lx - 2, Y(o.y + o.d, o.h * 0.6), 4, o.h * 0.6 * TS, '#2a1c14')
  },
  table(ctx, o, e) {
    const top = o.cloth ? { front: shade(o.cloth, -0.16), top: shade(o.cloth, -0.06) } : pal('#966d48', 0.12), fx = X(o.x), fw = o.w * TS
    if (o.round) { const cx = fx + fw / 2, cy = Y(o.y + o.d / 2, o.h), rx = fw / 2, ry = o.d * TS * K / 2; ell(ctx, cx, Y(o.y + o.d / 2) + 3, rx * 0.9, ry * 0.9, 'rgba(0,0,0,.3)'); rect(ctx, cx - 4, cy, 8, o.h * TS - 4, '#3a2a20'); ell(ctx, cx, cy + 4, rx, ry, shade('#966d48', -0.2)); ell(ctx, cx, cy, rx, ry, '#966d48'); ell(ctx, cx, cy - 4, 6, 3, '#e8dcc2'); rect(ctx, cx + 8, cy - 8, 7, 5, '#ede6d6'); return }
    if (!o.cloth) { for (const lx of [0.06, 0.94]) { rect(ctx, fx + fw * lx - 3, Y(o.y + o.d, o.h), 6, (o.h - 0.1) * TS, '#3f2f26'); rect(ctx, fx + fw * lx - 2, Y(o.y + 0.1, o.h), 4, (o.h - 0.1) * TS * 0.9, '#2a1f19') }; rect(ctx, fx + 3, Y(o.y + o.d) - 1, fw, 5, 'rgba(0,0,0,.22)') }
    const g = box(ctx, o.x, o.y, o.w, o.d, o.cloth ? 0.3 : 0.12, top, o.h - (o.cloth ? 0.3 : 0.12), !o.cloth)
    if (o.cloth) { rect(ctx, g.fx, g.fy, g.fw, g.fh, top.front); for (let i = 1; i < o.w * 2; i++) rect(ctx, g.fx + (i * g.fw) / (o.w * 2), g.fy, 1.5, g.fh, 'rgba(0,0,0,.12)'); for (const lx of [0.05, 0.95]) rect(ctx, g.fx + g.fw * lx - 2, g.fy + g.fh, 4, o.h * TS - g.fh, '#2a1f19') }
    if (o.glasses) for (let i = 0; i < 6; i++) { const px = g.fx + 14 + i * ((g.fw - 28) / 5), py = g.ty + g.th * (0.35 + (i % 2) * 0.3); ell(ctx, px, py + 1, 4, 1.8, 'rgba(0,0,0,.2)'); rect(ctx, px - 3, py - 12, 6, 11, 'rgba(210,235,250,.65)'); rect(ctx, px - 3, py - 12, 6, 4, i === 2 ? '#e6be61' : 'rgba(255,255,255,.45)') }
    if (o.items === 'book') { const cx = g.fx + g.fw * 0.4, cy = g.ty + g.th * 0.5; poly(ctx, [[cx - 20, cy], [cx, cy - 4], [cx, cy + 6], [cx - 20, cy + 10]], '#f1ead6'); poly(ctx, [[cx, cy - 4], [cx + 20, cy], [cx + 20, cy + 10], [cx, cy + 6]], '#e6dcc4'); rect(ctx, cx - 1, cy - 4, 2, 10, '#7d2a38'); rect(ctx, g.fx + g.fw * 0.8, g.ty + 3, 3, 12, '#efe7d4'); flame(ctx, g.fx + g.fw * 0.8 + 1.5, g.ty + 3, e.t, 1, 2) }
    if (o.set) {
      for (let i = 0; i < 4; i++) for (const r of [0.25, 0.78]) { const px = g.fx + g.fw * (0.1 + i * 0.22), py = g.ty + g.th * r; ell(ctx, px, py, 10, 4.6, '#a8a08c'); ell(ctx, px, py, 8.6, 3.8, '#f7f3ea'); ell(ctx, px, py, 5, 2.2, '#cfc7b2'); rect(ctx, px + 10, py - 3, 2, 6, '#cfd4d8') }
      const cx = g.fx + g.fw / 2, cy = g.ty + g.th / 2; rect(ctx, cx - 14, cy - 2, 28, 3, '#c9a35f'); for (const dx of [-12, 0, 12]) { rect(ctx, cx + dx - 1.5, cy - 20, 3, 18, '#efe7d4'); flame(ctx, cx + dx, cy - 21, e.t, 1, dx) } rect(ctx, cx - 2, cy - 4, 4, 4, '#c9a35f')
    }
  },
  chair(ctx, o) {
    const wood = o.color || '#7a4d38', cush = '#8c2f3a', f = o.face, bx = o.x + 0.05, by = o.y + 0.05
    const back = () => f === 'n' ? box(ctx, bx, o.y, 0.6, 0.1, 0.95, pal(wood), 0, false) : f === 'w' ? box(ctx, o.x, by, 0.1, 0.6, 0.95, pal(wood), 0, false) : f === 'e' ? box(ctx, o.x + 0.6, by, 0.1, 0.6, 0.95, pal(wood), 0, false) : null
    if (f !== 's') back(); box(ctx, bx, by, 0.6, 0.6, 0.45, pal(wood), 0)
    const s = box(ctx, bx + 0.04, by + 0.04, 0.52, 0.52, 0.06, pal(cush), 0.45, false)
    if (f === 's') { box(ctx, bx, o.y + 0.55, 0.6, 0.1, 0.95, pal(wood), 0, false); rect(ctx, s.fx + 3, s.fy - 6, s.fw - 6, 5, 'rgba(0,0,0,.2)') }
  },
  crates(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h * 0.6, pal('#9a6f45')); lines(ctx, g.fx, g.fy, g.fw, g.fh, 3, false, 'rgba(0,0,0,.35)'); lines(ctx, g.fx, g.fy, g.fw, g.fh, 3, true, 'rgba(0,0,0,.2)')
    const h = box(ctx, o.x + 0.2, o.y + 0.2, o.w * 0.5, o.d * 0.6, o.h * 0.4, pal('#b98b5a'), o.h * 0.6, false); lines(ctx, h.fx, h.fy, h.fw, h.fh, 2, false, 'rgba(0,0,0,.3)'); ell(ctx, g.fx + g.fw * 0.75, g.ty + g.th * 0.5, 7, 4, '#c9a36a'); ell(ctx, g.fx + g.fw * 0.85, g.ty + g.th * 0.6, 6, 3.5, '#a97d4d')
  },
  barrel(ctx, o) { const cx = X(o.x + o.w / 2), ry = o.d * TS * K / 2, top = Y(o.y + o.d / 2, o.h); cyl(ctx, cx, top, o.w * TS / 2, ry, o.h * TS, pal('#7d5233')); for (const k of [0.2, 0.75]) rect(ctx, cx - o.w * TS / 2, top + o.h * TS * k, o.w * TS, 3, '#2d2a28') },
  planter(ctx, o, e) {
    const cx = X(o.x + o.w / 2), by = Y(o.y + o.d), pot = Math.min(0.4, o.h * 0.5) * TS
    ell(ctx, cx, by - 2, o.w * TS * 0.5, 5, 'rgba(0,0,0,.3)'); cyl(ctx, cx, by - pot - 4, o.w * TS * 0.34, 4.5, pot, pal('#8a4d3b'))
    const top = by - o.h * TS, fern = o.plant === 'fern'
    for (let i = 0; i < (fern ? 9 : 6); i++) { const a = (i / (fern ? 9 : 6)) * TAU, len = (fern ? 0.72 : 0.5) * (o.h * TS - pot), sway = Math.sin(e.t * 1.2 + i) * (e.reduced ? 0 : 1.5); ctx.strokeStyle = i % 2 ? '#3d735f' : '#51836a'; ctx.lineWidth = fern ? 4 : 5; ctx.beginPath(); ctx.moveTo(cx, by - pot - 3); ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.5 + sway, top + len * 0.3, cx + Math.cos(a) * len * 0.8 + sway, by - pot - 3 - Math.abs(Math.sin(a)) * len * 0.5 - len * 0.6); ctx.stroke() }
    ctx.lineWidth = 1; if (o.plant === 'herbs') for (let i = 0; i < 7; i++) ell(ctx, cx - 14 + i * 5, top + 8 + (i % 3) * 6, 2, 2, ['#e9e4c8', '#d96464'][i % 2])
  },
  palm(ctx, o, e) {
    const cx = X(o.x + o.w / 2), by = Y(o.y + o.d); ell(ctx, cx, by - 2, o.w * TS * 0.5, 5, 'rgba(0,0,0,.3)'); cyl(ctx, cx, by - 22, 17, 5, 18, pal('#8a4d3b'))
    ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, by - 20); ctx.quadraticCurveTo(cx + 8, by - 70, cx + 2, by - o.h * TS + 22); ctx.stroke(); ctx.lineWidth = 1
    const hx = cx + 2, hy = by - o.h * TS + 22
    for (let i = 0; i < 7; i++) { const a = -Math.PI + (i / 6) * Math.PI, sw = e.reduced ? 0 : Math.sin(e.t * 1.1 + i) * 0.05; ell(ctx, hx + Math.cos(a + sw) * 24, hy + Math.sin(a + sw) * 12 + 4, 28, 6, i % 2 ? '#3d735f' : '#4e8a6c', a + sw) }
  },
  bed(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#8f8a7c', top: '#4a3426' }); lines(ctx, g.fx, g.fy, g.fw, g.fh, Math.round(o.w * 2), true, 'rgba(0,0,0,.25)')
    for (let i = 0; i < o.w * 6; i++) { const px = g.fx + 6 + rnd(o.x * 7 + i) * (g.fw - 12), py = g.ty + 3 + rnd(o.x + i * 3) * (g.th - 6); ell(ctx, px, py - 5, 3.2, 3.2, ['#d96464', '#e6be61', '#f1e5ee', '#b38ac7'][i % 4]); rect(ctx, px - 0.5, py - 4, 1.5, 5, '#3d735f') }
  },
  fountain(ctx, o, e) {
    const cx = X(o.x + o.w / 2), cy = Y(o.y + o.d / 2), rx = o.w * TS / 2, ry = o.d * TS * K / 2, top = cy - o.h * TS
    ell(ctx, cx + 4, cy + 4, rx + 3, ry + 3, 'rgba(0,0,0,.3)'); cyl(ctx, cx, top, rx, ry, o.h * TS, pal('#9aa0a0', 0.22))
    ell(ctx, cx, top + 2, rx - 9, ry - 6, '#5aa1bd'); ell(ctx, cx, top + 3, rx - 17, ry - 11, '#3f86a3')
    for (let i = 0; i < 3; i++) { const k = (e.reduced ? 0 : e.t * 0.6 + i * 0.33) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.5 - k * 0.5})`; ctx.beginPath(); ctx.ellipse(cx, top + 3, (rx - 18) * k + 8, (ry - 11) * k + 3, 0, 0, TAU); ctx.stroke() }
    cyl(ctx, cx, top - 34, 9, 3, 36, pal('#9aa0a0', 0.22)); cyl(ctx, cx, top - 52, 24, 7, 8, pal('#9aa0a0', 0.22)); ell(ctx, cx, top - 52, 20, 5, '#5aa1bd'); cyl(ctx, cx, top - 74, 5, 2, 22, pal('#9aa0a0', 0.22)); ell(ctx, cx, top - 76, 8, 8, '#b3b8b6')
    for (let i = 0; i < 8; i++) { const k = (e.reduced ? i / 8 : e.t * 0.8 + i / 8) % 1, a = (i / 8) * TAU; ell(ctx, cx + Math.cos(a) * 26 * k, top - 76 + (k * k * 70 - k * 30), 2.2, 2.2, 'rgba(210,240,255,.85)') }
  },
  bench(ctx, o) { const wood = o.color || '#8a5a3a'; box(ctx, o.x, o.y, o.w, 0.12, 0.95, pal(wood), 0, false); const g = box(ctx, o.x, o.y + 0.1, o.w, o.d - 0.1, 0.45, pal(wood)); lines(ctx, g.fx, g.ty, g.fw, g.th, 3, false, 'rgba(0,0,0,.25)'); for (const lx of [0.06, 0.94]) rect(ctx, g.fx + g.fw * lx - 3, g.fy + g.fh, 6, 6, '#2a1f19') },
  pillar(ctx, o) {
    const cx = X(o.x + o.w / 2), cy = Y(o.y + o.d / 2), rx = o.w * TS * 0.34, ry = o.d * TS * K * 0.34
    ell(ctx, cx + 3, cy + 3, rx + 8, ry + 6, 'rgba(0,0,0,.3)'); box(ctx, o.x + 0.05, o.y + 0.05, o.w - 0.1, o.d - 0.1, 0.22, pal('#cfc7b2'), 0, false)
    cyl(ctx, cx, Y(o.y + o.d / 2, o.h - 0.15), rx, ry, (o.h - 0.4) * TS, pal('#e3dccb')); box(ctx, o.x, o.y, o.w, o.d, 0.22, pal('#d3cbb6'), o.h - 0.22, false)
  },
  statue(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, 0.9, pal('#cfc7b2')), cx = g.fx + g.fw / 2, b = g.fy - 1, mar = '#ece7da'
    poly(ctx, [[cx - 12, b], [cx - 7, b - 46], [cx + 7, b - 46], [cx + 14, b]], mar); poly(ctx, [[cx - 12, b], [cx, b - 10], [cx + 14, b]], '#d8d2c2'); ell(ctx, cx, b - 54, 6.5, 7.5, mar); poly(ctx, [[cx + 5, b - 44], [cx + 28, b - 66], [cx + 31, b - 63], [cx + 9, b - 38]], mar); poly(ctx, [[cx - 7, b - 44], [cx - 22, b - 30], [cx - 18, b - 27], [cx - 5, b - 36]], mar)
    ell(ctx, cx - 1, b - 58, 5.5, 4, '#d8d2c2')
  },
  piano(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#101114', top: '#26272c' })
    poly(ctx, [[g.fx + 4, g.ty + g.th - 3], [g.fx + g.fw - 4, g.ty + g.th - 3], [g.fx + g.fw - 12, g.ty + 4], [g.fx + 12, g.ty + 4]], 'rgba(255,255,255,.07)'); rect(ctx, g.fx + 14, g.ty + 3, g.fw - 28, 2, 'rgba(255,255,255,.25)')
    const ky = g.fy + g.fh * 0.3, kh = g.fh * 0.3; rect(ctx, g.fx + 8, ky, g.fw - 16, kh, '#efe9d8'); for (let i = 0; i < 28; i++) { rect(ctx, g.fx + 8 + (i * (g.fw - 16)) / 28, ky, 1, kh, 'rgba(0,0,0,.35)'); if (i % 7 !== 2 && i % 7 !== 6) rect(ctx, g.fx + 8 + (i * (g.fw - 16)) / 28 + 5, ky, 4, kh * 0.6, '#16171a') }
    rect(ctx, g.fx + 8, ky - 3, g.fw - 16, 3, '#2c2d33'); rect(ctx, g.fx + g.fw / 2 - 18, ky - 22, 36, 18, '#efe9d8'); for (let i = 0; i < 4; i++) rect(ctx, g.fx + g.fw / 2 - 14, ky - 18 + i * 3.5, 28, 1, 'rgba(0,0,0,.4)')
    for (const lx of [0.08, 0.92]) rect(ctx, g.fx + g.fw * lx - 4, g.fy + g.fh * 0.7, 8, g.fh * 0.3, '#08080a')
  },
  gramophone(ctx, o) { const g = box(ctx, o.x, o.y, o.w, o.d, 0.55, pal('#5b3d2b')); const cx = g.fx + g.fw / 2, cy = Y(o.y + o.d / 2, 0.55); ell(ctx, cx, cy, 15, 6, '#101114'); ell(ctx, cx, cy, 3, 1.5, '#b4453f'); poly(ctx, [[cx - 2, cy - 4], [cx + 2, cy - 4], [cx + 22, cy - 38], [cx - 4, cy - 36]], '#c9a35f'); ell(ctx, cx + 9, cy - 38, 15, 5, '#e1c17a'); ell(ctx, cx + 9, cy - 38, 11, 3.2, '#6e5530') },
  console(ctx, o) { const g = box(ctx, o.x, o.y, o.w, o.d, 0.12, pal('#7a4d38'), o.h - 0.12); for (const lx of [0.08, 0.92]) rect(ctx, g.fx + g.fw * lx - 3, g.fy + g.fh, 6, (o.h - 0.12) * TS, '#3a2a20'); const cx = g.fx + g.fw / 2; poly(ctx, [[cx - 6, g.ty], [cx + 6, g.ty], [cx + 9, g.ty - 24], [cx - 9, g.ty - 24]], '#9ab3c4'); for (const dx of [-5, 0, 6]) { ctx.strokeStyle = '#3d735f'; ctx.beginPath(); ctx.moveTo(cx + dx / 2, g.ty - 22); ctx.lineTo(cx + dx * 1.6, g.ty - 44); ctx.stroke(); ell(ctx, cx + dx * 1.6, g.ty - 46, 4, 4, '#f4eee2') } },
  armor(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, 0.35, pal('#5b4636')), cx = g.fx + g.fw / 2, b = g.fy - 1, m = '#9aa3a8', d = '#6c757a'
    rect(ctx, cx - 9, b - 52, 7, 52, d); rect(ctx, cx + 2, b - 52, 7, 52, m); poly(ctx, [[cx - 17, b - 52], [cx + 17, b - 52], [cx + 13, b - 92], [cx - 13, b - 92]], m); rect(ctx, cx - 4, b - 92, 8, 40, 'rgba(255,255,255,.18)'); rect(ctx, cx - 24, b - 90, 10, 32, d); rect(ctx, cx + 14, b - 90, 10, 32, d)
    ell(ctx, cx, b - 102, 10, 11, m); rect(ctx, cx - 6, b - 104, 12, 3, '#14161a'); poly(ctx, [[cx - 2, b - 112], [cx + 2, b - 112], [cx + 6, b - 126], [cx - 6, b - 122]], '#b3343a'); rect(ctx, cx + 24, b - 122, 3, 124, '#5b4636'); poly(ctx, [[cx + 20, b - 118], [cx + 31, b - 118], [cx + 25, b - 134]], '#cfd4d8')
  },
  clock(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, pal('#4a2f20', 0.1)), cx = g.fx + g.fw / 2
    rect(ctx, g.fx + 4, g.fy + 4, g.fw - 8, 6, '#c9a35f'); ell(ctx, cx, g.fy + 30, 17, 17, '#efe5c6'); ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, g.fy + 30, 17, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, g.fy + 30); ctx.lineTo(cx - 2, g.fy + 17); ctx.moveTo(cx, g.fy + 30); ctx.lineTo(cx + 1, g.fy + 14); ctx.stroke(); ctx.lineWidth = 1
    rect(ctx, g.fx + 7, g.fy + 56, g.fw - 14, g.fh * 0.5, '#1a1511'); rect(ctx, g.fx + 9, g.fy + 58, g.fw - 18, g.fh * 0.5 - 4, 'rgba(120,160,190,.18)'); rect(ctx, cx - 1, g.fy + 60, 2, g.fh * 0.4, '#c9a35f'); ell(ctx, cx, g.fy + 60 + g.fh * 0.4, 6, 6, '#c9a35f')
  },
  stairs(ctx, o) {
    const n = 8, sd = o.d / n
    for (let i = 0; i < n; i++) { // i = 0 hinten (hoch) … n-1 vorne (niedrig)
      const hh = o.h * (1 - i / n), y = o.y + i * sd
      const g = box(ctx, o.x, y, o.w, sd, hh, { front: '#7a6f60', top: '#a89d8b' }, 0, i === n - 1)
      const rw = Math.min(o.w - 0.9, 1.7) * TS; rect(ctx, g.fx + (g.fw - rw) / 2, g.fy, rw, g.fh, '#7d1f2e'); rect(ctx, g.fx + (g.fw - rw) / 2, g.ty, rw, g.th, '#a02b3d'); rect(ctx, g.fx + (g.fw - rw) / 2, g.ty, 2, g.th + g.fh, '#d1ac63'); rect(ctx, g.fx + (g.fw + rw) / 2 - 2, g.ty, 2, g.th + g.fh, '#d1ac63')
    }
    const px = X(o.x), by = Y(o.y + o.d); rect(ctx, px, by - 62, 7, 62, '#4a2f20'); ell(ctx, px + 3.5, by - 66, 6, 6, '#c9a35f'); ctx.strokeStyle = '#4a2f20'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px + 3, by - 56); ctx.lineTo(px + 3, Y(o.y + o.d * 0.6, o.h * 0.4) - 36); ctx.stroke(); ctx.lineWidth = 1
  },
  fireplace(ctx, o, e) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#7a7068', top: '#968d84' }), cx = g.fx + g.fw / 2, ow = 2.0 * TS, oh = 0.95 * TS
    for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) rect(ctx, g.fx + c * (g.fw / 6) + (r % 2) * 8 - 6, g.fy + r * (g.fh / 8), g.fw / 6 - 2, g.fh / 8 - 2, `rgba(0,0,0,${0.05 + rnd(r * 9 + c) * 0.08})`)
    rect(ctx, cx - ow / 2, g.fy + g.fh - oh, ow, oh, '#120a07'); const gl = ctx.createRadialGradient(cx, g.fy + g.fh - 8, 4, cx, g.fy + g.fh - 8, ow * 0.7); gl.addColorStop(0, 'rgba(255,150,50,.65)'); gl.addColorStop(1, 'rgba(255,100,20,0)'); rect(ctx, cx - ow / 2, g.fy + g.fh - oh, ow, oh, gl)
    for (let i = 0; i < 5; i++) { const k = e.reduced ? 1 : 1 + Math.sin(e.t * 8 + i * 1.7) * 0.18; poly(ctx, [[cx - 30 + i * 15, g.fy + g.fh - 6], [cx - 22 + i * 15, g.fy + g.fh - 40 * k - (i % 2) * 8], [cx - 14 + i * 15, g.fy + g.fh - 6]], i % 2 ? '#ffb347' : '#ff7a30'); poly(ctx, [[cx - 26 + i * 15, g.fy + g.fh - 6], [cx - 22 + i * 15, g.fy + g.fh - 22 * k], [cx - 18 + i * 15, g.fy + g.fh - 6]], '#fff0b0') }
    rect(ctx, cx - 30, g.fy + g.fh - 9, 60, 7, '#4a2f20'); rect(ctx, cx - 36, g.fy + g.fh - 2, 72, 2, '#2a1d12')
    rect(ctx, g.fx - 8, g.fy - 4, g.fw + 16, 10, '#6b4a35'); rect(ctx, g.fx - 8, g.fy - 4, g.fw + 16, 2, 'rgba(255,255,255,.2)'); for (const dx of [0.2, 0.8]) { rect(ctx, g.fx + g.fw * dx - 1.5, g.fy - 20, 3, 16, '#efe7d4'); flame(ctx, g.fx + g.fw * dx, g.fy - 21, e.t, 1, dx * 5) }
  },
  sofa(ctx, o) {
    const c = o.color || '#9c3549'; box(ctx, o.x, o.y, o.w, 0.4, 0.95, pal(shade(c, -0.15)), 0, false); const g = box(ctx, o.x, o.y + 0.25, o.w, o.d - 0.25, 0.45, pal(c))
    const n = Math.max(1, Math.round(o.w / 1.2)); for (let i = 0; i < n; i++) { rect(ctx, g.fx + 8 + (i * (g.fw - 16)) / n, g.ty + 2, (g.fw - 16) / n - 3, g.th - 3, 'rgba(255,255,255,.07)'); rect(ctx, g.fx + 8 + ((i + 1) * (g.fw - 16)) / n - 3, g.ty, 1.5, g.th + g.fh, 'rgba(0,0,0,.25)') }
    box(ctx, o.x, o.y + 0.15, 0.28, o.d - 0.15, 0.75, pal(shade(c, -0.08)), 0, false); box(ctx, o.x + o.w - 0.28, o.y + 0.15, 0.28, o.d - 0.15, 0.75, pal(shade(c, -0.08)), 0, false)
    if (o.w > 3) { ell(ctx, g.fx + 40, g.ty + 6, 9, 5, '#e6be61'); ell(ctx, g.fx + g.fw - 44, g.ty + 6, 9, 5, '#efe7d4') }
  },
  lamp(ctx, o, e) {
    const cx = X(o.x + o.w / 2), by = Y(o.y + o.d); ell(ctx, cx, by - 2, 11, 4, 'rgba(0,0,0,.35)'); ell(ctx, cx, by - 3, 8, 3, '#3a2a20'); rect(ctx, cx - 1.5, by - o.h * TS + 22, 3, o.h * TS - 22, '#3a2a20')
    const f = e.reduced ? 1 : 1 + Math.sin(e.t * 3 + o.x) * 0.03; poly(ctx, [[cx - 9, by - o.h * TS + 24], [cx + 9, by - o.h * TS + 24], [cx + 15, by - o.h * TS], [cx - 15, by - o.h * TS]], `rgba(250,226,160,${0.95 * f})`); rect(ctx, cx - 15, by - o.h * TS - 1, 30, 2, '#c9a35f')
  },
  pool(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#4b382e', top: '#6b4a35' })
    rect(ctx, g.fx + 6, g.fy + 4, g.fw - 12, g.fh * 0.35, 'rgba(255,255,255,.07)'); for (const lx of [0.03, 0.97]) rect(ctx, g.fx + g.fw * lx - 7, g.fy + g.fh * 0.4, 14, g.fh * 0.6, '#2d2019')
    const fx = g.fx + 12, fy = g.ty + 7, fw = g.fw - 24, fh = g.th - 14; rect(ctx, fx, fy, fw, fh, '#24765d'); rect(ctx, fx, fy, fw, 3, 'rgba(0,0,0,.25)'); for (const [a, b] of [[0, 0], [0.5, 0], [1, 0], [0, 1], [0.5, 1], [1, 1]]) ell(ctx, fx + a * fw, fy + b * fh, 6.5, 4.5, '#08090a')
    ;['#e8e3cd', '#b54749', '#d7b25a', '#5a7d9a', '#6b8f5a', '#7d2a38', '#e6be61', '#b38ac7'].forEach((c, i) => ell(ctx, fx + fw * (0.55 + (i % 4) * 0.045 + (i > 3 ? 0.02 : 0)), fy + fh * (0.3 + Math.floor(i / 2) * 0.1), 3.6, 3.2, c)); ell(ctx, fx + fw * 0.2, fy + fh * 0.55, 3.6, 3.2, '#f4f0e6'); ctx.strokeStyle = '#d7bd8f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx + fw * 0.05, fy + fh * 0.85); ctx.lineTo(fx + fw * 0.38, fy + fh * 0.62); ctx.stroke(); ctx.lineWidth = 1
  },
  cuerack(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, 0.4, pal('#4a2f20')); const n = 7
    for (let i = 0; i < n; i++) { const x = g.fx + 8 + (i * (g.fw - 16)) / (n - 1), tall = (i === 3 ? 0 : 1.4 + (i % 2) * 0.12) * TS; if (tall) { rect(ctx, x - 2, g.fy - tall, 4, tall, ['#d7bd8f', '#9a6f45'][i % 2]); rect(ctx, x - 2, g.fy - tall, 4, 4, '#2a6b4e') } }
    rect(ctx, g.fx + 2, g.fy - 52, g.fw - 4, 4, '#4a2f20')
  },
  cabinet(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, pal('#6b4a35', 0.14)); const n = Math.max(1, Math.round(o.w / 1.1))
    if (o.glass) {
      const gh = g.fh * 0.62; rect(ctx, g.fx + 5, g.fy + 5, g.fw - 10, gh, '#16222c'); for (let s = 0; s < 3; s++) { rect(ctx, g.fx + 5, g.fy + 5 + ((s + 1) * gh) / 3 - 2, g.fw - 10, 2, '#7a5a3d'); for (let k = 0; k < Math.round(o.w * 2.2); k++) ell(ctx, g.fx + 14 + k * 16, g.fy + 5 + ((s + 1) * gh) / 3 - 9, 5, 7, ['#e8e3d0', '#6f93a6', '#d7b25a'][(k + s) % 3]) }
      poly(ctx, [[g.fx + 10, g.fy + 5], [g.fx + 30, g.fy + 5], [g.fx + 14, g.fy + 5 + gh], [g.fx + 5, g.fy + 5 + gh]], 'rgba(255,255,255,.12)'); lines(ctx, g.fx + 5, g.fy + 5, g.fw - 10, gh, n, true, '#6b4a35'); lines(ctx, g.fx, g.fy + gh + 8, g.fw, g.fh - gh - 12, n, true)
    } else { for (let i = 0; i < n; i++) { rect(ctx, g.fx + 5 + (i * (g.fw - 10)) / n, g.fy + 5, (g.fw - 10) / n - 3, g.fh - 10, 'rgba(0,0,0,.14)'); rect(ctx, g.fx + 8 + (i * (g.fw - 10)) / n, g.fy + 8, (g.fw - 10) / n - 9, g.fh - 16, 'rgba(255,255,255,.04)') } }
    for (let i = 0; i < n; i++) ell(ctx, g.fx + 5 + ((i + 1) * (g.fw - 10)) / n - 8, g.fy + g.fh * (o.glass ? 0.78 : 0.5), 2.2, 2.2, '#d9b866')
  },
  cart(ctx, o) {
    const x = X(o.x), w = o.w * TS, top = Y(o.y + o.d / 2, o.h)
    rect(ctx, x + 3, Y(o.y + o.d) - 2, w, 6, 'rgba(0,0,0,.3)'); for (const [lx, c] of [[0.1, '#2a1f19'], [0.9, '#2a1f19']]) rect(ctx, x + w * lx - 2, top, 4, o.h * TS - 4, c)
    box(ctx, o.x, o.y, o.w, o.d, 0.06, pal('#cfd4d8'), 0.32, false); const g = box(ctx, o.x, o.y, o.w, o.d, 0.07, pal('#c9a35f'), o.h - 0.07, false)
    for (let i = 0; i < 4; i++) { const bx = g.fx + 10 + i * 13; rect(ctx, bx, g.ty - 20, 7, 18, ['#2a6b4e', '#7d1f2e', '#b8863f', '#5a7d9a'][i]); rect(ctx, bx + 2, g.ty - 28, 3, 9, ['#2a6b4e', '#7d1f2e', '#b8863f', '#5a7d9a'][i]) }
    rect(ctx, g.fx + g.fw - 20, g.ty - 12, 9, 10, 'rgba(200,230,250,.55)'); for (const lx of [0.12, 0.88]) ell(ctx, x + w * lx, Y(o.y + o.d) - 3, 4.5, 4.5, '#14161a')
  },
  desk(ctx, o, e) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#5b3d2b', top: '#7a5338' }), n = 3
    rect(ctx, g.fx + 14, g.ty + 6, g.fw - 28, g.th - 12, '#2f5a46'); rect(ctx, g.fx + 14, g.ty + 6, g.fw - 28, 2, 'rgba(255,255,255,.14)')
    for (const lx of [0.06, 0.94]) rect(ctx, g.fx + g.fw * lx - 15, g.fy + 4, 30, g.fh - 8, 'rgba(0,0,0,.2)')
    for (let i = 0; i < n; i++) { rect(ctx, g.fx + g.fw * 0.78 - 20, g.fy + 6 + i * ((g.fh - 12) / n), 40, (g.fh - 12) / n - 3, 'rgba(255,255,255,.07)'); ell(ctx, g.fx + g.fw * 0.78, g.fy + 6 + i * ((g.fh - 12) / n) + 6, 2, 2, '#d9b866') }
    rect(ctx, g.fx + g.fw * 0.35, g.ty + 9, 30, 22, '#f1ead6'); rect(ctx, g.fx + g.fw * 0.35 + 5, g.ty + 15, 20, 1, 'rgba(0,0,0,.35)'); rect(ctx, g.fx + g.fw * 0.35 + 5, g.ty + 19, 14, 1, 'rgba(0,0,0,.35)'); ell(ctx, g.fx + g.fw * 0.65, g.ty + 18, 5, 3, '#14161a')
    const lx = g.fx + g.fw * 0.16; rect(ctx, lx - 8, g.ty + 14, 16, 4, '#c9a35f'); rect(ctx, lx - 1.5, g.ty - 6, 3, 20, '#c9a35f'); poly(ctx, [[lx - 12, g.ty - 6], [lx + 12, g.ty - 6], [lx + 8, g.ty - 20], [lx - 8, g.ty - 20]], '#2a7a54'); ell(ctx, lx, g.ty - 4, 6, 3, `rgba(255,236,160,${e.reduced ? 0.8 : 0.75 + Math.sin(e.t * 3) * 0.05})`)
  },
  safe(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#5c6168', top: '#767c85' }), cx = g.fx + g.fw / 2, cy = g.fy + g.fh / 2
    rect(ctx, g.fx + 6, g.fy + 6, g.fw - 12, g.fh - 12, '#4a4f56'); ell(ctx, cx - 4, cy, 12, 12, '#8d949c'); ell(ctx, cx - 4, cy, 9, 9, '#3b4046'); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; rect(ctx, cx - 4 + Math.cos(a) * 10 - 0.5, cy + Math.sin(a) * 10 - 0.5, 1.5, 1.5, '#cfd4d8') }
    rect(ctx, cx + 12, cy - 8, 3, 16, '#c9a35f'); for (const [a, b] of [[8, 8], [g.fw - 12, 8], [8, g.fh - 12], [g.fw - 12, g.fh - 12]]) ell(ctx, g.fx + a, g.fy + b, 1.6, 1.6, '#8d949c')
  },
  globe(ctx, o) {
    const cx = X(o.x + o.w / 2), by = Y(o.y + o.d), top = by - o.h * TS; ell(ctx, cx, by - 2, 14, 5, 'rgba(0,0,0,.3)'); cyl(ctx, cx, by - 10, 11, 4, 8, pal('#4a2f20')); rect(ctx, cx - 2, top + 22, 4, o.h * TS - 30, '#4a2f20')
    const g = ctx.createRadialGradient(cx - 7, top + 10, 2, cx, top + 20, 22); g.addColorStop(0, '#8fc2d6'); g.addColorStop(1, '#2a5a7a'); ell(ctx, cx, top + 20, 20, 20, g)
    ell(ctx, cx - 6, top + 16, 7, 5, '#6b8f5a'); ell(ctx, cx + 7, top + 24, 6, 7, '#8a9a5a'); ell(ctx, cx - 2, top + 30, 4, 3, '#6b8f5a'); ctx.strokeStyle = '#c9a35f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, top + 20, 22, 22, 0, -1.2, 1.9); ctx.stroke(); ctx.lineWidth = 1
  },
  armchair(ctx, o, e) { KINDS.sofa(ctx, o, e) },
  shelf(ctx, o) {
    const g = box(ctx, o.x, o.y, o.w, o.d, o.h, { front: '#4a3626', top: '#6b4a35' }); rect(ctx, g.fx + 5, g.fy + 5, g.fw - 10, g.fh - 8, '#1d130d')
    const rows = Math.max(3, Math.floor(o.h / 0.46)), rh = (g.fh - 8) / rows
    for (let r = 0; r < rows; r++) { books(ctx, g.fx + 8, g.fy + 5 + r * rh + 3, g.fw - 16, rh - 5, Math.floor(o.x * 100) + r * 977); rect(ctx, g.fx + 5, g.fy + 5 + (r + 1) * rh - 2, g.fw - 10, 3, '#6b4a35') }
    if (o.h > 2.3) { ell(ctx, g.fx + g.fw * 0.5, g.ty + g.th * 0.4, 8, 3, 'rgba(0,0,0,.18)') }
  },
  ladder(ctx, o) { const cx = X(o.x + o.w / 2), by = Y(o.y + o.d), top = by - o.h * TS; for (const dx of [-9, 9]) { ctx.strokeStyle = '#9a6f45'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + dx, by - 2); ctx.lineTo(cx + dx * 0.7 + 4, top); ctx.stroke() } ctx.lineWidth = 3; ctx.strokeStyle = '#b98b5a'; for (let i = 1; i < 8; i++) { const y = by - (i * (o.h * TS)) / 8; ctx.beginPath(); ctx.moveTo(cx - 9 + i * 0.5, y); ctx.lineTo(cx + 9 - i * 0.2, y); ctx.stroke() } ctx.lineWidth = 1 },
}
const FALLBACK = (ctx, o) => box(ctx, o.x, o.y, o.w, o.d, o.h, pal(o.color || '#7a5c45'))

// ---------- Figur ----------
// Ein Körperteil, das sich um einen Drehpunkt (Hüfte, Schulter) dreht: angle 0 = senkrecht nach unten.
function limb(ctx, px, py, len, w, angle, color, foot) {
  ctx.save(); ctx.translate(px, py); ctx.rotate(angle)
  rr(ctx, -w / 2, -w * 0.3, w, len + w * 0.3, w / 2); ctx.fillStyle = color; ctx.fill()
  if (foot) { rr(ctx, -w / 2, len - w * 0.55, w + foot, w * 0.75, w * 0.35); ctx.fillStyle = '#151f2a'; ctx.fill() }
  ctx.restore()
}
const HAIR = ['#322d30', '#5a3a26', '#1f1a1c', '#8a5a32', '#c9a36a', '#6b6460']
const hairOf = p => HAIR[[...(p.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % HAIR.length]

function drawPerson(ctx, p, e) {
  const sx = X(p.x), sy = Y(p.y), s = TS, walking = p.moving && !e.reduced
  const ph = p.walk || 0, swing = walking ? Math.sin(ph) : 0
  const bob = walking ? Math.abs(Math.cos(ph)) * 0.02 * s : 0 // leichtes Auf und Ab bei jedem Schritt
  const skin = '#caa486', trousers = '#2a3442', shoe = '#151b24', coat = p.color, coatShade = shade(p.color, -0.16), hair = hairOf(p)
  ell(ctx, sx, sy, 0.28 * s, 0.1 * s, 'rgba(0,0,0,.38)')
  if (p.mine || p.active) { ctx.strokeStyle = p.active ? 'rgba(255,214,134,.95)' : 'rgba(244,210,141,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, 0.38 * s, 0.15 * s, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1 }
  const top = sy - 1.2 * s - bob, hip = sy - 0.6 * s - bob, shoulder = top + 0.07 * s, hy = sy - 1.45 * s - bob, hr = 0.19 * s
  // Mantel mit Schultern und leicht ausgestelltem Saum (statt einer geraden Röhre)
  const torso = (x0, w, color) => {
    ctx.beginPath(); ctx.moveTo(x0 + w * 0.12, top); ctx.lineTo(x0 + w * 0.88, top); ctx.quadraticCurveTo(x0 + w, top, x0 + w, top + 0.1 * s)
    ctx.lineTo(x0 + w * 1.04, hip + 0.06 * s); ctx.lineTo(x0 - w * 0.04, hip + 0.06 * s); ctx.lineTo(x0, top + 0.1 * s); ctx.quadraticCurveTo(x0, top, x0 + w * 0.12, top)
    ctx.closePath(); ctx.fillStyle = color; ctx.fill()
  }

  if (p.face === 'e' || p.face === 'w') {
    // Seitenansicht im Profil; für „links“ wird gespiegelt.
    ctx.save(); ctx.translate(sx, 0); if (p.face === 'w') ctx.scale(-1, 1)
    const legA = swing * 0.42, armA = -swing * 0.38
    limb(ctx, -0.01 * s, shoulder, 0.44 * s, 0.1 * s, -armA, coatShade)                         // hinterer Arm (meist verdeckt)
    ell(ctx, Math.sin(armA) * 0.44 * s, shoulder + Math.cos(armA) * 0.44 * s, 0.045 * s, 0.045 * s, shade(skin, -0.1))
    limb(ctx, 0, hip, 0.58 * s, 0.13 * s, -legA, shade(trousers, -0.12), 0.07 * s)              // hinteres Bein
    limb(ctx, 0, hip, 0.58 * s, 0.13 * s, legA, trousers, 0.07 * s)                             // vorderes Bein
    torso(-0.15 * s, 0.3 * s, coat)
    rect(ctx, -0.15 * s, hip - 0.03 * s, 0.31 * s, 0.045 * s, 'rgba(0,0,0,.3)')                  // Gürtel
    rect(ctx, 0.1 * s, top + 0.08 * s, 0.04 * s, 0.48 * s, 'rgba(255,255,255,.1)')               // Licht auf der Vorderkante
    rect(ctx, -0.04 * s, top - 0.07 * s, 0.09 * s, 0.09 * s, skin)                               // Hals
    limb(ctx, 0, shoulder, 0.44 * s, 0.1 * s, armA, shade(coat, -0.07))                          // vorderer Arm
    ell(ctx, -Math.sin(armA) * 0.44 * s, shoulder + Math.cos(armA) * 0.44 * s, 0.05 * s, 0.05 * s, skin)
    ell(ctx, hr * 0.92, hy + hr * 0.18, hr * 0.15, hr * 0.17, shade(skin, -0.03))               // Nase (ragt etwas vor)
    ell(ctx, 0, hy, hr * 0.95, hr * 1.05, skin)                                                 // Kopf
    // Haare nur oben und hinten: auf die Kopfform beschnitten, das Gesicht vorne bleibt frei
    ctx.save(); ctx.beginPath(); ctx.ellipse(-hr * 0.03, hy - hr * 0.04, hr * 1.02, hr * 1.1, 0, 0, TAU); ctx.clip()
    rect(ctx, -hr * 1.2, hy - hr * 1.4, hr * 2.4, hr * 0.98, hair)                               // Oberkopf
    rect(ctx, -hr * 1.2, hy - hr * 1.4, hr * 0.95, hr * 2.3, hair)                               // Hinterkopf
    ell(ctx, hr * 0.55, hy - hr * 0.42, hr * 0.38, hr * 0.16, hair)                              // Stirnfransen
    ctx.restore()
    ell(ctx, -hr * 0.12, hy + hr * 0.12, hr * 0.13, hr * 0.19, shade(skin, -0.12))                // Ohr
    ell(ctx, hr * 0.46, hy + hr * 0.02, 1.6, 2, '#1d1718')                                       // Auge
    rect(ctx, hr * 0.48, hy + hr * 0.55, hr * 0.3, 1.2, 'rgba(120,60,50,.5)')                    // Mund
    ctx.restore()
    return
  }

  // Vorder- (s) und Rückansicht (n): ein Bein kommt nach vorne (tiefer im Bild), das andere geht zurück (höher).
  ctx.save(); ctx.translate(sx, 0)
  const back = p.face === 'n', fwd = swing * 0.035 * s, arm = swing * 0.04 * s
  const legL = 0.58 * s + fwd, legR = 0.58 * s - fwd
  limb(ctx, -0.085 * s, hip, legL, 0.13 * s, 0, back ? shade(trousers, swing > 0 ? 0 : -0.08) : shade(trousers, swing > 0 ? 0.04 : -0.06), 0)
  limb(ctx, 0.085 * s, hip, legR, 0.13 * s, 0, back ? shade(trousers, swing < 0 ? 0 : -0.08) : shade(trousers, swing < 0 ? 0.04 : -0.06), 0)
  rr(ctx, -0.165 * s, hip + legL - 0.05 * s, 0.16 * s, 0.07 * s, 2); ctx.fillStyle = shoe; ctx.fill()
  rr(ctx, 0.005 * s, hip + legR - 0.05 * s, 0.16 * s, 0.07 * s, 2); ctx.fill()
  // Arme schwingen gegengleich zu den Beinen
  rr(ctx, -0.32 * s, shoulder - arm, 0.1 * s, 0.47 * s, 4); ctx.fillStyle = coatShade; ctx.fill()
  rr(ctx, 0.22 * s, shoulder + arm, 0.1 * s, 0.47 * s, 4); ctx.fill()
  ell(ctx, -0.27 * s, shoulder - arm + 0.48 * s, 0.05 * s, 0.05 * s, skin); ell(ctx, 0.27 * s, shoulder + arm + 0.48 * s, 0.05 * s, 0.05 * s, skin)
  torso(-0.23 * s, 0.46 * s, coat)
  rect(ctx, -0.235 * s, hip - 0.03 * s, 0.47 * s, 0.045 * s, 'rgba(0,0,0,.3)')
  rect(ctx, -0.19 * s, top + 0.1 * s, 0.07 * s, 0.46 * s, 'rgba(255,255,255,.1)')
  if (!back) { rect(ctx, -0.012 * s, top + 0.05 * s, 0.024 * s, 0.55 * s, 'rgba(0,0,0,.18)'); for (const by of [0.25, 0.4]) ell(ctx, 0.05 * s, top + by * s, 1.5, 1.5, 'rgba(255,240,200,.5)') }
  rect(ctx, -0.05 * s, top - 0.07 * s, 0.1 * s, 0.09 * s, skin)
  ell(ctx, 0, hy, hr, hr * 1.05, skin)
  if (back) { ell(ctx, 0, hy - 1, hr * 1.05, hr * 1.08, hair); rect(ctx, -hr * 0.55, hy + hr * 0.6, hr * 1.1, hr * 0.3, hair) }
  else {
    ctx.beginPath(); ctx.ellipse(0, hy - 1, hr * 1.04, hr * 1.06, 0, Math.PI, TAU); ctx.fillStyle = hair; ctx.fill()
    rect(ctx, -hr * 1.04, hy - 3, hr * 0.3, hr * 0.7, hair); rect(ctx, hr * 0.74, hy - 3, hr * 0.3, hr * 0.7, hair)
    for (const dx of [-0.07, 0.07]) ell(ctx, dx * s, hy + 1, 1.6, 2, '#1d1718')
    rect(ctx, -2.5, hy + hr * 0.55, 5, 1.2, 'rgba(120,60,50,.5)')
  }
  ctx.restore()
}

function drawTag(ctx, p, e) {
  const sx = X(p.x), sy = Y(p.y) - 1.98 * TS, text = p.name; ctx.font = 'bold 12px Georgia, serif'; const w = Math.min(150, ctx.measureText(text).width + 24)
  rr(ctx, sx - w / 2, sy - 11, w, 20, 4); ctx.fillStyle = '#281b24'; ctx.fill(); ctx.strokeStyle = p.active ? '#ffd686' : '#a17b4a'; ctx.lineWidth = p.active ? 2 : 1.4; ctx.stroke(); ctx.lineWidth = 1
  ell(ctx, sx - w / 2 + 9, sy - 1, 3.4, 3.4, p.color); ctx.fillStyle = '#e5d6b1'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, sx + 4, sy - 0.5, w - 26); ctx.textBaseline = 'alphabetic'
}

// ---------- Licht ----------
function drawLight(ctx, def, e) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  def.lights.forEach((l, i) => {
    const f = e.reduced ? 1 : 0.9 + 0.1 * Math.sin(e.t * 6.5 + i * 2.1) + 0.04 * Math.sin(e.t * 13.7 + i), cx = X(l.x), cy = Y(l.y, l.z), r = l.r * TS
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r); g.addColorStop(0, l.fire ? `rgba(255,140,60,${0.26 * f})` : `rgba(255,205,130,${0.22 * f})`); g.addColorStop(1, 'rgba(255,180,90,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  })
  for (const w of def.windows) { if (w.skip || !w.w) continue; const g = ctx.createLinearGradient(0, Y(0), 0, Y(4.2)); g.addColorStop(0, 'rgba(120,160,235,.10)'); g.addColorStop(1, 'rgba(120,160,235,0)'); ctx.fillStyle = g; poly(ctx, [[X(w.x), Y(0.1)], [X(w.x + w.w), Y(0.1)], [X(w.x + w.w + 2.2), Y(4.2)], [X(w.x + 2.2), Y(4.2)]], g) }
  if (!e.reduced) for (let i = 0; i < 22; i++) { const x = (rnd(i) * COLS + Math.sin(e.t * 0.25 + i) * 0.6 + COLS) % COLS, z = 0.4 + rnd(i + 50) * 1.9 + Math.sin(e.t * 0.3 + i * 2) * 0.12; ell(ctx, X(x), Y(rnd(i + 99) * ROWS, z), 1.2, 1.2, 'rgba(255,240,200,.30)') }
  ctx.restore()
  const v = ctx.createRadialGradient(WIDTH / 2, Y(ROWS * 0.45), HEIGHT * 0.25, WIDTH / 2, Y(ROWS * 0.45), WIDTH * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,5,10,.58)'); rect(ctx, 0, 0, WIDTH, HEIGHT, v)
  rect(ctx, 0, 0, WIDTH, HEIGHT, def.tint)
}

// Kleines Abzeichen über bereits durchsuchten Möbeln: Haken = nichts gefunden, Ausrufezeichen = Fund.
function drawMark(ctx, o, kind) {
  const x = X(o.x + o.w) - 6, y = Y(o.y, o.h) - 4, hit = kind === 'hit'
  ell(ctx, x, y, 8, 8, hit ? '#ffd686' : 'rgba(40,27,36,.88)')
  ctx.strokeStyle = hit ? '#5a3a12' : '#b9c4b0'; ctx.lineWidth = 2; ctx.beginPath()
  if (hit) { ctx.moveTo(x, y - 4.5); ctx.lineTo(x, y + 1); ctx.stroke(); ell(ctx, x, y + 4, 1.3, 1.3, '#5a3a12') }
  else { ctx.moveTo(x - 3.5, y); ctx.lineTo(x - 1, y + 3); ctx.lineTo(x + 4, y - 3); ctx.stroke() }
  ctx.lineWidth = 1
}

function drawHighlight(ctx, o, e) {
  const pulse = e.reduced ? 0.8 : 0.65 + Math.sin(e.t * 5) * 0.25, door = o.leave
  const x0 = X(o.x) - 4, x1 = X(o.x + o.w) + 4, y0 = door ? Y(0, 2.15) - 8 : Y(o.y, o.h) - 4, y1 = door ? Y(0.6) + 2 : Y(o.y + o.d) + 3
  ctx.save(); ctx.setLineDash([6, 4]); ctx.lineDashOffset = e.reduced ? 0 : -e.t * 14; ctx.strokeStyle = `rgba(255,224,150,${pulse})`; ctx.lineWidth = 2; rr(ctx, x0, y0, x1 - x0, y1 - y0, 6); ctx.stroke(); ctx.restore()
  const bx = (x0 + x1) / 2, by = y0 - 16 - (e.reduced ? 0 : Math.sin(e.t * 4) * 2.5)
  ell(ctx, bx, by, 11, 11, '#281b24'); ctx.strokeStyle = '#ffd686'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx, by, 11, 0, TAU); ctx.stroke(); ctx.lineWidth = 1
  ctx.fillStyle = '#ffe6a8'; ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.hint || 'E', bx, by + 0.5); ctx.textBaseline = 'alphabetic'
  poly(ctx, [[bx - 4, by + 10], [bx + 4, by + 10], [bx, by + 16]], '#ffd686')
}

// ---------- Gesamtbild ----------
// e = { t, reduced, hint, near, people: [{ x, y, face, walk, moving, color, name, mine, active }], marks: Map<versteckId, 'hit'|'miss'> }
export function drawRoom(ctx, def, e) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT); rect(ctx, 0, 0, WIDTH, HEIGHT, '#070d0c')
  drawWall(ctx, def, e.t); drawFloor(ctx, def); drawRugs(ctx, def)
  for (const w of def.windows) WINDOW(ctx, def, w, e.t)
  for (const d of def.decor) DECOR[d.kind]?.(ctx, d, e.t)
  drawDoor(ctx, def, e.t)
  const ents = def.objects.map(o => ({ y: o.y + o.d, draw: () => (KINDS[o.kind] || FALLBACK)(ctx, o, e) }))
  const people = e.people || (e.person ? [e.person] : [])
  for (const p of people) ents.push({ y: p.y + (p.mine ? 0.002 : 0.001), draw: () => drawPerson(ctx, p, e) })
  ents.sort((a, b) => a.y - b.y).forEach(en => en.draw())
  drawLight(ctx, def, e)
  if (e.marks?.size) for (const o of def.objects) { const m = o.spot && e.marks.get(o.spot); if (m) drawMark(ctx, o, m) }
  if (e.near) drawHighlight(ctx, e.near, e)
  for (const p of [...people].sort((a, b) => a.y - b.y)) drawTag(ctx, p, e)
}
export const footprint = PLAYER


// Static surfaces for the 3D miniature. Reuse the actual room drawing routines,
// so floor patterns, rugs, wallpaper, windows and pictures cannot drift apart.
export function roomSurfaceCanvases(def) {
  const source = document.createElement('canvas')
  source.width = WIDTH; source.height = HEIGHT
  const ctx = source.getContext('2d')
  drawWall(ctx, def, 0)
  for (const win of def.windows) WINDOW(ctx, def, win, 0)
  for (const decor of def.decor) DECOR[decor.kind]?.(ctx, decor, 0)
  drawDoor(ctx, def, 0)
  const crop = (x, y, w, h) => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w); canvas.height = Math.ceil(h)
    canvas.getContext('2d').drawImage(source, x, y, w, h, 0, 0, canvas.width, canvas.height)
    return canvas
  }
  const wall = crop(OX, PADT, COLS * TS, WALL_H * TS)
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  drawFloor(ctx, def); drawRugs(ctx, def)
  return { wall, floor: crop(OX, OY, COLS * TS, ROWS * TS * K) }
}