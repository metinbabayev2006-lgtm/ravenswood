import { useId, useState } from 'react'
import { PEOPLE, ROOMS, STARTS, corridor, distance } from '../shared/game.js'
import { RoomArt } from './Artwork.jsx'

export default function Board({ state, onMove, busy, decorative = false }) {
  const id = useId().replace(/:/g, ''), me = state?.players.find(p => p.id === state.me)
  const canMove = state?.status === 'playing' && state.players[state.turn]?.id === state.me && state.phase === 'move' && !busy
  const from = me && state.positions?.[me.character]
  const reachable = target => canMove && JSON.stringify(target) !== JSON.stringify(from) && distance(from, target) <= state.dice.reduce((a, b) => a + b, 0)
  const activate = (event, target) => { if (reachable(target) && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onMove(target) } }
  const [view, setView] = useState(() => { try { return localStorage.getItem('ravenswood-camera') || '2.5d' } catch { return '2.5d' } })
  const camera = view==='top'?'top':'3d'
  const changeView = value => { setView(value); try { localStorage.setItem('ravenswood-camera',value) } catch {} }
  return <div className={`manor-scene ${decorative ? 'scene-decorative' : ''}`} data-view={decorative ? '3d' : camera}>
    {!decorative && <div className="camera-controls" role="group" aria-label="Brettansicht"><span>ANSICHT</span>{[['3d','3D'],['top','Von oben']].map(([value,label]) => <button type="button" key={value} aria-pressed={camera===value} onClick={()=>changeView(value)}>{label}</button>)}</div>}
    <div className="manor-camera"><div className="manor-model">
    <div className="manor-foundation" aria-hidden="true"/>
    <svg className={`board ${decorative ? 'decorative' : ''}`} viewBox="-1.2 -1.2 21.4 21.4" role="group" aria-label="Spielbrett von Ravenswood mit neun Räumen" aria-hidden={decorative || undefined}>
    <defs>
      <pattern id={`${id}-tiles`} width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#73818b"/><path d="M0 0H1V1H0ZM1 1H2V2H1Z" fill="#3b4c5a"/><path d="M0 0H2V2H0Z" fill="none" stroke="#796e58" strokeWidth=".035"/><path d="M1 0V2M0 1H2" stroke="#96886c" strokeWidth=".035"/></pattern>
      <pattern id={`${id}-wood`} width=".65" height="2" patternUnits="userSpaceOnUse"><path d="M0 0H.65V2H0Z" fill="#72695f"/><path d="M0 0V2M0 .6H.65M.1 .1V.5M.4 .8V1.8" stroke="#7b5a3b" strokeWidth=".04" opacity=".45"/></pattern>
      <linearGradient id={`${id}-frame`} x2="1" y2="1"><stop stopColor="#526575"/><stop offset=".4" stopColor="#172331"/><stop offset=".7" stopColor="#304454"/><stop offset="1" stopColor="#101923"/></linearGradient>
      <filter id={`${id}-shadow`} x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx=".06" dy=".12" stdDeviation=".06" floodOpacity=".55"/></filter>
      {PEOPLE.map(c => <linearGradient key={c.id} id={`${id}-${c.id}`}><stop stopColor="#fff" stopOpacity=".7"/><stop offset=".25" stopColor={c.color}/><stop offset=".7" stopColor={c.color}/><stop offset="1" stopColor="#17282a"/></linearGradient>)}
    </defs>
    <rect x="-1.13" y="-.97" width="21.25" height="21.25" rx=".25" fill="#1d1714"/>
    <rect x="-1.13" y="-1.13" width="21.25" height="21.25" rx=".25" fill={`url(#${id}-frame)`} stroke="#b59660" strokeWidth=".06"/>
    <rect x="-.65" y="-.65" width="20.3" height="20.3" rx=".1" fill="#172635" stroke="#d0b778" strokeWidth=".065"/>
    <rect x="-.1" y="-.1" width="19.2" height="19.2" fill={`url(#${id}-tiles)`} stroke="#202f29" strokeWidth=".12"/>
    {Array.from({length:361}, (_, i) => [i % 19, Math.floor(i / 19)]).filter(([x,y]) => corridor(x,y)).map(([x,y]) => <g key={`${x},${y}`}><rect x={x+.035} y={y+.035} width=".93" height=".93" rx=".05" className={reachable([x,y]) ? 'reachable-cell' : ''} fill={reachable([x,y]) ? '#f5ce65' : 'transparent'} role={reachable([x,y]) ? 'button' : undefined} tabIndex={reachable([x,y]) ? 0 : undefined} aria-label={reachable([x,y]) ? `Zum Flurfeld ${x+1}, ${y+1} ziehen` : undefined} onClick={() => reachable([x,y]) && onMove([x,y])} onKeyDown={e => activate(e,[x,y])}/>{reachable([x,y]) && <circle cx={x+.5} cy={y+.5} r=".1" fill="#967137" pointerEvents="none"/>}</g>)}
    {ROOMS.map(r => <g key={r.id} className={`board-room ${reachable(r.id) ? 'reachable' : ''}`} role={reachable(r.id) ? 'button' : undefined} tabIndex={reachable(r.id) ? 0 : undefined} aria-label={`${r.name}${reachable(r.id) ? ', hierhin ziehen' : ''}`} onClick={() => reachable(r.id) && onMove(r.id)} onKeyDown={e => activate(e,r.id)}>
      <rect x={r.x} y={r.y} width="5" height="5" fill={`url(#${id}-wood)`}/><rect x={r.x+.16} y={r.y+.16} width="4.68" height="4.68" fill={r.tone} fillOpacity=".35"/>
      <rect x={r.x+.2} y={r.y+.2} width="4.6" height="3.6" fill="#0b1825" opacity=".2" pointerEvents="none"/>
      <g transform={`translate(${r.x} ${r.y})`}><RoomArt id={r.id}/></g>
      <path d={`M${r.x} ${r.y+5}V${r.y}H${r.x+5}V${r.y+5}Z`} fill="none" stroke="#26352c" strokeWidth=".2"/><rect x={r.x+.12} y={r.y+.12} width="4.76" height="4.76" fill="none" stroke="#e1cda1" strokeWidth=".055"/>
      {[.85,3.25].map(offset => <g key={offset}><rect x={r.x+offset} y={r.y+.02} width=".9" height=".12" fill="#afd2c5" stroke="#536f61" strokeWidth=".025"/><path d={`M${r.x+offset+.45} ${r.y}v.16`} stroke="#e5dbc0" strokeWidth=".04"/></g>)}
      <rect x={r.x+.25} y={r.y+3.95} width="4.5" height=".65" rx=".08" fill="#1a2b3a" stroke="#8f7956" strokeWidth=".035"/><text x={r.x+2.5} y={r.y+4.37} textAnchor="middle" fontFamily="Georgia, serif" fontSize=".37" fontWeight="bold" fill="#e9d8b0">{r.name}</text>
      {r.passage && <g><circle cx={r.x+4.4} cy={r.y+3.42} r=".25" fill="#293b30"/><text x={r.x+4.4} y={r.y+3.56} textAnchor="middle" fontSize=".4" fill="#efce7a">↗</text></g>}
      <rect x={r.door[0]+.12} y={r.door[1]+.12} width=".76" height=".76" rx=".08" fill="#714f30" stroke="#fae3a6" strokeWidth=".065"/><path d={`M${r.door[0]+.25} ${r.door[1]+.28}h.5m-.5 .2h.5m-.5 .2h.5`} stroke="#b8955c" strokeWidth=".04"/>
      {reachable(r.id) && <rect x={r.x+.08} y={r.y+.08} width="4.84" height="4.84" rx=".06" fill="#f5d17d" fillOpacity=".16" stroke="#ffe5a2" strokeWidth=".16"/>}
    </g>)}
    {PEOPLE.map((c,i) => { const pos = state?.positions?.[c.id] || STARTS[i], room = typeof pos === 'string' && ROOMS.find(r => r.id === pos), player = state?.players.find(p => p.character === c.id), mine = player && player.id === state?.me; const x = room ? room.x+.8+(i%3)*1.65 : pos[0]+.5, y = room ? room.y+1.25+Math.floor(i/3)*1.55 : pos[1]+.65; return <g key={c.id} className="board-pawn" transform={`translate(${x} ${y})`} pointerEvents="none"><title>{c.name}{player ? ` · ${player.name}` : ' · unbesetzt'}</title>{mine && <ellipse cy=".2" rx=".52" ry=".3" fill="#fff0a0" opacity=".9"/>}<ellipse cy=".15" rx=".34" ry=".2" fill="#24352d"/><path d="M-.3 .12Q-.32-.02-.17-.12L-.1-.48H.1L.17-.12Q.32-.02.3.12Z" fill={c.color} stroke="#283c31" strokeWidth=".035"/><path d="M-.3 .12Q-.32-.02-.17-.12L-.1-.48H.1L.17-.12Q.32-.02.3.12Z" fill={`url(#${id}-${c.id})`}/><circle cy="-.55" r=".2" fill={c.color} stroke="#334334" strokeWidth=".035"/><circle cx="-.065" cy="-.63" r=".07" fill="#fff" opacity=".5"/>{mine && <path d="M-.1-.98H.1L0-.8Z" fill="#fff2ae"/>}</g> })}
    <text x="9.5" y="19.53" textAnchor="middle" fontFamily="Georgia, serif" fontSize=".23" letterSpacing=".16" fill="#cdb786">RAVENSWOOD · DER MULTIPLAYER-SPIELTISCH</text>
  </svg>
  <div className="room-volumes" aria-hidden="true">{ROOMS.map(r=><div className="room-volume" key={r.id} style={{left:`${(r.x+1.2)/21.4*100}%`,top:`${(r.y+1.2)/21.4*100}%`,width:`${5/21.4*100}%`,height:`${5/21.4*100}%`}}><div className="wall-back"/><div className="wall-left"/><div className="manor-lamp"/></div>)}</div>
  </div></div>
  {!decorative && <div className="camera-caption">{camera==='3d'?'3D-Perspektive · räumliche Wände, offenes Dach':camera==='top'?'Draufsicht · alle Felder direkt im Blick':'2,5D · die Villa als räumliches Spielbrett'}</div>}
  </div>
}
