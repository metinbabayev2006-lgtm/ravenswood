import { useState } from 'react'

// Sophie: entry to a shared game. The invitation selects the join flow.
export default function StartGame({ name, setName, code, setCode, busy, onEnter }) {
  const [mode, setMode] = useState(() => code ? 'join' : 'create')
  const joining = mode === 'join'
  return <form className="entry-card" onSubmit={event => { event.preventDefault(); onEnter(joining) }}>
    <div className="entry-modes" role="group" aria-label="Spiel erstellen oder beitreten">
      <button type="button" aria-pressed={!joining} className={!joining ? 'selected' : ''} disabled={busy} onClick={() => setMode('create')}>Neues Spiel</button>
      <button type="button" aria-pressed={joining} className={joining ? 'selected' : ''} disabled={busy} onClick={() => setMode('join')}>Beitreten</button>
    </div>
    <label htmlFor="name">DEIN NAME</label>
    <input id="name" value={name} maxLength={24} autoComplete="nickname" required disabled={busy} placeholder="Wie heißt du?" onChange={e => setName(e.target.value)}/>
    {joining && <div className="entry-room-field"><label htmlFor="join-code">RAUMCODE</label><input id="join-code" value={code} maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} required minLength={6} disabled={busy} placeholder="Z. B. ABC234" onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}/></div>}
    <p className="entry-description">{joining ? 'Den Raumcode bekommst du von der Person, die das Spiel erstellt hat.' : 'Erstelle einen Spielraum: direkt alleine starten oder bis zu fünf Freunde einladen.'}</p>
    <button className="primary" type="submit" disabled={busy || !name.trim() || joining && code.length !== 6}>{busy ? 'Einen Moment …' : joining ? 'Spiel beitreten' : 'Spiel erstellen'}<span aria-hidden="true">→</span></button>
    <div className="start-steps" aria-label="So startet ihr"><span><b>1</b> Raum erstellen</span><span><b>2</b> Alleine oder mit Freunden</span><span><b>3</b> Figur wählen & starten</span></div>
  </form>
}
