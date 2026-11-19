import { useEffect, useRef, useState } from 'react'
import { PEOPLE, ROOMS } from '../../shared/game.js'
import { ROOM_MAPS } from './roomData.js'
import { drawRoom, WIDTH, HEIGHT } from './roomRenderer.js'

export default function SecurityRoom({ busy, loadCamera, onLeave }) {
  const [selected, setSelected] = useState('study')
  const [error, setError] = useState('')
  const canvas = useRef(null), load = useRef(loadCamera)
  load.current = loadCamera

  useEffect(() => {
    const controller = new AbortController()
    const context = canvas.current.getContext('2d')
    let timer
    const poll = async () => {
      try {
        const feed = await load.current(selected, controller.signal)
        if (controller.signal.aborted) return
        const people = feed.people.map(player => ({ ...player, color: PEOPLE.find(c => c.id === player.character)?.color, walk: player.moving ? performance.now() / 120 : 0 }))
        drawRoom(context, ROOM_MAPS[selected], { t: performance.now() / 1000, people })
        setError('')
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.message)
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 250)
      }
    }
    drawRoom(context, ROOM_MAPS[selected], { t: 0, people: [] })
    poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [selected])

  const room = ROOMS.find(room => room.id === selected)
  return <section className="ri-shell security-room" role="dialog" aria-modal="true" aria-label="Security Room">
    <header className="ri-top"><div className="ri-title"><h2>Security Room</h2></div><button className="ri-leave" disabled={busy} onClick={onLeave}>Zurück ins Arbeitszimmer</button></header>
    <div className="security-layout">
      <div className="security-map" role="group" aria-label="Überwachungskarte">
        {ROOMS.map(room => <button key={room.id} className="secondary" aria-pressed={selected === room.id} style={{ gridColumn: room.x / 7 + 1, gridRow: room.y / 7 + 1 }} onClick={() => setSelected(room.id)}>{room.name}</button>)}
      </div>
      <figure className="security-feed"><figcaption>Kamera · {room.name}</figcaption><canvas ref={canvas} width={WIDTH} height={HEIGHT} role="img" aria-label={`Livebild: ${room.name}`}/>{error && <p role="alert">{error}</p>}</figure>
    </div>
  </section>
}
