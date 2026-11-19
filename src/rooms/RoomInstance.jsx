// Ravenswood · 2,5D-Raum-Instanz: Vollbild-Ansicht eines Zimmers. Alle, die dasselbe Zimmer betreten haben,
// sind in derselben Instanz und sehen sich gegenseitig laufen (Live-Positionen über roomSync.js / server/presence.js).
// Laufen und Kollision rechnet jeder Browser selbst; Untersuchen bleibt lokal.
import { useEffect, useRef, useState } from 'react'
import { PEOPLE, ROOMS } from '../../shared/game.js'
import { SEARCHES_PER_VISIT } from '../../shared/roomSpots.js'
import { ROOM_MAPS } from './roomData.js'
import { step, nearest, spawn } from './roomPhysics.js'
import { drawRoom, WIDTH, HEIGHT } from './roomRenderer.js'
import { occupantsByRoom } from './roomPresence.js'
import { createRemoteFigures, startRoomSync } from './roomSync.js'
import './RoomInstance.css'

const SPEED = 4.2 // Kacheln pro Sekunde
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }

// Props: state (Spielstand), session ({ code, token } für den Live-Abgleich), busy/error/connection (aus App, da die
// normale Anzeige verdeckt ist), onLeave() (Raum verlassen), onSearch(versteckId) (Möbel durchsuchen, prüft der Server),
// onInteract(gegenstand, raum, fund) (optional – Hook für spätere Karten, wird nach jedem Ergebnis aufgerufen).
export default function RoomInstance({ state, session, busy, error, connection, onDismissError, onLeave, onSearch, onInteract, onSecurity, onEliminate }) {
  const me = state?.players?.find(p => p.id === state.me), roomId = me && state.inside?.[me.id], room = ROOMS.find(r => r.id === roomId)
  if (!room || !ROOM_MAPS[room.id]) return null
  const current = state.players[state.turn], figure = PEOPLE.find(c => c.id === me.character)
  const others = (occupantsByRoom(state)[room.id] || []).filter(o => o.id !== me.id)
  return <RoomScene key={room.id} room={room} def={ROOM_MAPS[room.id]} name={me.name} color={figure?.color} myTurn={current?.id === me.id} currentName={current?.name}
    others={others} code={session?.code} token={session?.token} onSearch={onSearch}
    onSecurity={room.id === 'study' && state.securityUnlocked ? onSecurity : undefined}
    victims={others.filter(player => state.victims.includes(player.id))} onEliminate={onEliminate}
    searches={(state.searches || []).filter(f => f.room === room.id)} searchesLeft={state.searchesLeft || 0} log={state.log || []} busy={busy} error={error} connection={connection} onDismissError={onDismissError} onLeave={onLeave} onInteract={onInteract}/>
}

function RoomScene({ room, def, name, color, myTurn, currentName, others, code, token, onSearch, searches, searchesLeft, log, busy, error, connection, onDismissError, onLeave, onInteract, onSecurity, victims, onEliminate }) {
  const canvasRef = useRef(null), shellRef = useRef(null), nearRef = useRef(null)
  const pad = useRef({ up: false, down: false, left: false, right: false })
  const live = useRef({}); live.current = { myTurn, name, color, onLeave, onInteract, onSearch, others, searches, searchesLeft, marks: new Map(searches.map(f => [f.spot, f.found ? 'hit' : 'miss'])) }
  const me = useRef({ ...spawn(), face: 's', walk: 0, moving: false }), remote = useRef(createRemoteFigures())
  const [near, setNear] = useState(null), [found, setFound] = useState(null), [pending, setPending] = useState(null)
  const pendingRef = useRef(null)
  const resultOf = (n, f) => ({ label: n.label, text: f.found?.kind === 'security' ? 'Hinter der Bücherwand öffnet sich ein Zugang zum Security Room.' : n.text, id: Date.now(), kind: f.found ? 'hit' : 'miss',
    note: f.found ? 'Hier ist etwas versteckt! Was genau, entscheiden später die Karten.' : 'Hier ist nichts Verdächtiges.' })

  const interact = () => {
    const n = nearRef.current
    if (!n) return
    const L = live.current
    if (n.leave) return L.onLeave?.()
    if (!n.spot) return setFound({ label: n.label, text: n.text, id: Date.now() })
    const done = L.searches.find(f => f.spot === n.spot)
    if (done) return setFound(resultOf(n, done))
    if (L.searchesLeft <= 0) return setFound({ label: n.label, text: n.text, id: Date.now(), kind: 'limit', note: 'Für diesen Besuch hast du genug durchsucht. Verlasse den Raum und komm später wieder.' })
    if (pendingRef.current || !L.onSearch) return
    pendingRef.current = n; setPending(n); setFound(null)
    L.onSearch(n.spot)
  }
  // Ergebnis vom Server: sobald der Fund im Spielstand auftaucht, anzeigen
  useEffect(() => {
    const n = pendingRef.current
    if (!n) return
    const f = searches.find(x => x.spot === n.spot)
    if (f) { pendingRef.current = null; setPending(null); setFound(resultOf(n, f)); live.current.onInteract?.(n, room, f.found) }
  }, [searches]) // eslint-disable-line react-hooks/exhaustive-deps
  // Abgelehnt (z. B. Verbindung weg): Warten beenden, die Fehlermeldung erscheint oben
  useEffect(() => { if (error && pendingRef.current) { pendingRef.current = null; setPending(null) } }, [error])
  useEffect(() => { if (!pending) return; const t = setTimeout(() => { pendingRef.current = null; setPending(null) }, 8000); return () => clearTimeout(t) }, [pending])
  const interactRef = useRef(interact); interactRef.current = interact

  // Spiel-Schleife: Bewegung, Kollision, Zeichnen
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches, touch = window.matchMedia('(pointer: coarse)').matches
    const p = me.current
    let raf = 0, last = performance.now(), scale = 1
    const fit = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth; if (!w) return; scale = (w * dpr) / WIDTH; canvas.width = Math.round(w * dpr); canvas.height = Math.round(HEIGHT * scale) }
    const observer = new ResizeObserver(fit); observer.observe(canvas); fit()
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const k = pad.current, dx = (k.right ? 1 : 0) - (k.left ? 1 : 0), dy = (k.down ? 1 : 0) - (k.up ? 1 : 0)
      p.moving = false
      if (dx || dy) {
        const s = (SPEED * dt) / Math.hypot(dx, dy), np = step(def, p, dx * s, dy * s)
        p.moving = Math.hypot(np.x - p.x, np.y - p.y) > 1e-4; p.x = np.x; p.y = np.y
        p.face = dx ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n'
        if (p.moving) p.walk += dt * 11
      }
      remote.current.tick(dt)
      const n = nearest(def, p)
      if (n !== nearRef.current) { nearRef.current = n; setNear(n) }
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      const L = live.current
      // Andere nur zeigen, solange der Spielstand sie in diesem Zimmer führt (Name/Farbe kommen aus dem Spielstand).
      const meta = new Map(L.others.map(o => [o.id, o]))
      const people = remote.current.list().filter(f => meta.has(f.id)).map(f => ({ x: f.x, y: f.y, face: f.face, walk: f.walk, moving: f.moving, color: meta.get(f.id).color, name: meta.get(f.id).name, active: meta.get(f.id).active }))
      for (const bot of L.others.filter(player => player.bot)) people.push({ ...spawn(), face: 's', walk: 0, ...bot })
      people.push({ x: p.x, y: p.y, face: p.face, walk: p.walk, moving: p.moving, color: L.color || '#d96464', name: L.name, mine: true, active: L.myTurn })
      drawRoom(ctx, def, { t: now / 1000, reduced, hint: touch ? '✦' : 'E', near: n, people, marks: L.marks })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [def])

  // Live-Abgleich mit allen anderen in diesem Zimmer
  useEffect(() => {
    if (!code || !token) return
    const p = me.current
    return startRoomSync({ code, token, getPos: () => ({ x: p.x, y: p.y, face: p.face, moving: p.moving }), onOthers: list => remote.current.apply(list) })
  }, [code, token])

  // Tastatur
  useEffect(() => {
    const keys = pad.current
    const down = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const dir = KEYS[e.code]
      if (dir) { keys[dir] = true; e.preventDefault() } else if (e.code === 'KeyE' && !e.repeat) interactRef.current()
    }
    const up = e => { const dir = KEYS[e.code]; if (dir) keys[dir] = false }
    const clear = () => { for (const k in keys) keys[k] = false }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); clear() }
  }, [])

  // Vollbild: Seite dahinter nicht scrollen, Fokus auf den Dialog
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; shellRef.current?.focus(); return () => { document.body.style.overflow = old } }, [])
  // Fundstück-Text nach einer Weile ausblenden
  useEffect(() => { if (!found) return; const t = setTimeout(() => setFound(null), 9000); return () => clearTimeout(t) }, [found])

  const hold = dir => ({
    onPointerDown: e => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); pad.current[dir] = true },
    onPointerUp: () => { pad.current[dir] = false }, onPointerCancel: () => { pad.current[dir] = false }, onLostPointerCapture: () => { pad.current[dir] = false },
    onContextMenu: e => e.preventDefault(),
  })

  return <div className="ri-shell" ref={shellRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Raum: ${room.name}`}>
    <header className="ri-top">
      <div className="ri-title"><span className="ri-eyebrow">RAUM-INSTANZ</span><h2>{room.name}</h2></div>
      <ul className="ri-who" aria-label="Im Raum">
        <li><span className="ri-dot" style={{ background: color }}/>{name} (du)</li>
        {others.map(o => <li key={o.id}><span className="ri-dot" style={{ background: o.color }}/>{o.name}</li>)}
      </ul>
      <span className={`ri-searches${searchesLeft ? '' : ' empty'}`} title="So viele Möbel darfst du bei diesem Besuch noch durchsuchen.">Durchsuchen: {searchesLeft} von {SEARCHES_PER_VISIT}</span>
      {onSecurity && <button type="button" className="ri-leave" disabled={busy} onClick={onSecurity}>Geheimer Zugang · Security Room</button>}
      {victims.map(victim => <button type="button" key={victim.id} className="ri-leave" disabled={busy} onClick={() => onEliminate(victim.id)}>{victim.name} eliminieren</button>)}
      <button type="button" className={`ri-leave${myTurn ? ' urgent' : ''}`} disabled={busy} onClick={() => onLeave?.()}>Raum verlassen <span aria-hidden="true">↩</span></button>
    </header>
    <p className={`ri-banner${myTurn ? ' turn' : ''}`} role="status" aria-live="polite">
      {myTurn ? <><strong>Du bist wieder am Zug.</strong> Die anderen warten auf dich – verlasse den Raum, um weiterzuspielen.</>
        : <><strong>{currentName} ist am Zug.</strong> Hier drin gilt kein Würfellimit. Sobald du wieder dran bist, warten die anderen auf dich.</>}
    </p>
    <div className="ri-stage">
      <canvas ref={canvasRef} className="ri-canvas" role="img" aria-label={`Raum ${room.name} in 2,5D. Mit WASD oder den Pfeiltasten laufen, mit E Möbel durchsuchen.`}/>
      {(error || connection) && <div className={`ri-notice${error ? ' error' : ''}`} role={error ? 'alert' : 'status'}>{error || connection}{error && <button type="button" aria-label="Meldung schließen" onClick={onDismissError}>×</button>}</div>}
      {pending && <div className="ri-found" role="status"><strong>{pending.label}</strong><p>Du durchsuchst …</p></div>}
      {found && !pending && <div className={`ri-found${found.kind ? ' ' + found.kind : ''}`} role="status" key={found.id}><strong>{found.label}</strong><p>{found.text}</p>{found.note && <p className="ri-note">{found.note}</p>}<button type="button" aria-label="Schließen" onClick={() => setFound(null)}>×</button></div>}
    </div>
    <footer className="ri-foot">
      <div className="ri-pad" aria-hidden="true">
        <button type="button" tabIndex={-1} className="up" {...hold('up')}>▲</button>
        <button type="button" tabIndex={-1} className="left" {...hold('left')}>◀</button>
        <button type="button" tabIndex={-1} className="right" {...hold('right')}>▶</button>
        <button type="button" tabIndex={-1} className="down" {...hold('down')}>▼</button>
      </div>
      <div className="ri-prompt">
        {near ? <button type="button" className="ri-act" disabled={!!pending} onClick={interact}><kbd>E</kbd>{near.leave ? 'Raum verlassen' : searches.some(f => f.spot === near.spot) ? `${near.label} (durchsucht)` : searchesLeft > 0 ? `${near.label} durchsuchen` : `${near.label} ansehen`}</button>
          : <span className="ri-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> oder Pfeiltasten: laufen · <kbd>E</kbd> durchsuchen</span>}
      </div>
      <ul className="ri-log" aria-label="Spielgeschehen">{log.slice(-3).map((l, i) => <li key={log.length - 3 + i}>{l}</li>)}</ul>
    </footer>
  </div>
}
