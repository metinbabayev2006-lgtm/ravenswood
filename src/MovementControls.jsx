import { useState } from 'react'
import { PEOPLE, ROOMS, distance } from '../shared/game.js'

// Matin: movement and room entry. All moves still pass server validation.
export default function MovementControls({ state, busy, onMove, onPreview }) {
  const [selected, setSelected] = useState('')
  const me = state.players.find(p => p.id === state.me)
  const from = state.positions[me.character]
  const steps = state.remainingSteps
  const targets = ROOMS.filter(r => r.door.join() !== from.join()).map(r => ({ ...r, cost: distance(from, r.door) })).filter(r => r.cost <= steps)
  const room = targets.find(r => r.id === selected) || targets[0]
  const character = PEOPLE.find(c => c.id === me.character)
  return <section className="movement-controls" aria-label="Figur bewegen und Zimmer betreten">
    <div className="movement-budget"><span className="player-dot" style={{background:character.color}}/><strong>{character.name}</strong><span>{steps} Schritte verfügbar</span></div>
    <p className="muted">Ziehe auf ein goldenes Flurfeld oder ziehe zu einer erreichbaren Tür.</p>
    <label htmlFor="entry-room">TÜR WÄHLEN</label>
    <select id="entry-room" value={room?.id || ''} disabled={busy || !targets.length} onFocus={()=>room&&onPreview?.(room.door)} onChange={e => {setSelected(e.target.value);onPreview?.(targets.find(r=>r.id===e.target.value)?.door)}}>
      {!targets.length && <option value="">Noch kein Zimmer erreichbar</option>}
      {targets.map(r => <option key={r.id} value={r.id}>{r.name} · {r.cost} Schritte</option>)}
    </select>
    <button className="primary enter-room" disabled={busy || !room} onClick={() => onMove(room.door)}>Zur Tür gehen <span aria-hidden="true">↪</span></button>
    <p className="room-entry-hint">{room ? `${room.name}: ${room.cost} von ${steps} Schritten. Übrige Schritte bleiben verfügbar.` : 'Ziehe zuerst durch den Flur näher an eine goldene Tür.'}</p>
  </section>
}
