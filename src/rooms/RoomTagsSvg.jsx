// Gleiche Namensschilder für das 2D-Ersatzbrett (FlatBoard, wenn WebGL nicht verfügbar ist).
import { ROOMS } from '../../shared/game.js'
import { occupantsByRoom } from './roomPresence.js'

export default function RoomTagsSvg({ state }) {
  const occ = occupantsByRoom(state)
  return <g className="room-presence-tags" pointerEvents="none">{ROOMS.filter(r => occ[r.id]?.length).map(r => {
    const text = occ[r.id].map(o => o.name).join(' · '), w = Math.min(4.5, 1.1 + text.length * 0.2), active = occ[r.id].some(o => o.active)
    return <g key={r.id} transform={`translate(${r.x + 2.5} ${r.y + 0.55})`}>
      <rect x={-w / 2} y="-.42" width={w} height=".84" rx=".1" fill="#281b24" stroke={active ? '#ffd686' : '#a17b4a'} strokeWidth={active ? '.1' : '.06'}/>
      <text y="-.14" textAnchor="middle" fontFamily="Georgia, serif" fontSize=".2" letterSpacing=".08" fill="#a17b4a">IM RAUM</text>
      <text y=".2" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize=".34" fill="#e5d6b1" textLength={text.length > 9 ? w - 0.5 : undefined} lengthAdjust="spacingAndGlyphs">{text}</text>
    </g>
  })}</g>
}
