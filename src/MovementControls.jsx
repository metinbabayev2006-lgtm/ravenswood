import { useState } from 'react'
import { PEOPLE, ROOMS, distance } from '../shared/game.js'

// Matin: movement and room entry. All moves still pass server validation.
export default function MovementControls({ state, busy, onMove, onPreview }) {
  const [selected, setSelected] = useState('')
  const me = state.players.find(p => p.id === state.me)
  const from = state.positions[me.character]
  const steps = state.dice?.reduce((sum, die) => sum + die, 0) || 0
  const targets = ROOMS.filter(r => r.id !== from).map(r => ({ ...r, cost: distance(from, r.id) })).filter(r => r.cost <= steps)
  const room = targets.find(r => r.id === selected) || targets[0]
  const character = PEOPLE.find(c => c.id === me.character)
  return <section className="movement-controls" aria-label="Figur bewegen und Zimmer betreten">
    <div className="movement-budget"><span className="player-dot" style={{background:character.color}}/><strong>{character.name}</strong><span>{steps} Schritte verfügbar</span></div>
    <p className="muted">Ziehe auf ein goldenes Flurfeld oder betrete direkt eines der erreichbaren Zimmer.</p>
    <label htmlFor="entry-room">ZIMMER WÄHLEN</label>
    <select id="entry-room" value={room?.id || ''} disabled={busy || !targets.length} onFocus={()=>room&&onPreview?.(room.id)} onChange={e => {setSelected(e.target.value);onPreview?.(e.target.value)}}>
      {!targets.length && <option value="">Noch kein Zimmer erreichbar</option>}
      {targets.map(r => <option key={r.id} value={r.id}>{r.name} · {r.cost} Schritte</option>)}
    </select>
    <button className="primary enter-room" disabled={busy || !room} onClick={() => onMove(room.id)}>Zimmer betreten <span aria-hidden="true">↪</span></button>
    <p className="room-entry-hint">{room ? `${room.name}: ${room.cost} von ${steps} Schritten. Damit endet deine Bewegung.` : 'Ziehe zuerst durch den Flur näher an eine goldene Tür. Du musst nicht alle Schritte verbrauchen.'}</p>
  </section>
}
