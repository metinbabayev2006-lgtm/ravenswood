// Ravenswood · Gemeinsame Raum-Instanz im Browser: eigene Position senden, andere empfangen und flüssig darstellen.
// Nutzt nur fetch (keine zusätzliche Bibliothek, keine WebSockets). Server-Seite: server/presence.js.

const FAST_MS = 150, IDLE_MS = 600, RETRY_MS = 1200, TIMEOUT_MS = 4000

// Glättet die Sprünge zwischen zwei Server-Antworten, damit die anderen nicht ruckeln.
export function createRemoteFigures() {
  const figures = new Map()
  return {
    apply(list) {
      const seen = new Set()
      for (const o of list || []) {
        seen.add(o.id)
        const f = figures.get(o.id)
        if (f) Object.assign(f, { tx: o.x, ty: o.y, face: o.face, net: o.moving })
        else figures.set(o.id, { id: o.id, x: o.x, y: o.y, tx: o.x, ty: o.y, face: o.face, net: o.moving, moving: false, walk: 0 })
      }
      for (const id of figures.keys()) if (!seen.has(id)) figures.delete(id)
    },
    tick(dt) {
      const k = 1 - Math.exp(-dt * 12)
      for (const f of figures.values()) {
        const dx = f.tx - f.x, dy = f.ty - f.y, gap = Math.hypot(dx, dy)
        if (gap > 3) { f.x = f.tx; f.y = f.ty } else { f.x += dx * k; f.y += dy * k } // nach einem Aussetzer nicht durch Möbel „gleiten“
        f.moving = f.net || gap > 0.03
        if (f.moving) f.walk += dt * 11
      }
    },
    list: () => [...figures.values()],
  }
}

// Startet den Abgleich. getPos() liefert { x, y, face, moving }; onOthers(liste) bekommt die anderen in derselben Instanz.
// Gibt eine Stopp-Funktion zurück.
export function startRoomSync({ code, token, getPos, onOthers, fetchImpl = (...a) => fetch(...a) }) {
  let stopped = false, timer = 0, controller = null, othersCount = 0
  const loop = async () => {
    if (stopped) return
    let wait = RETRY_MS
    controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const pos = getPos()
      const res = await fetchImpl(`/api/rooms/${code}/presence`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(pos) })
      if (res.ok) {
        const data = await res.json()
        if (!stopped) { othersCount = data.others?.length || 0; onOthers(data.others || []) }
        wait = pos.moving || othersCount ? FAST_MS : IDLE_MS
      }
    } catch { /* kurz offline oder Raum gerade verlassen: einfach später erneut versuchen */ }
    finally { clearTimeout(timeout) }
    if (!stopped) timer = setTimeout(loop, wait)
  }
  loop()
  return () => { stopped = true; clearTimeout(timer); controller?.abort() }
}
