import { useEffect, useRef, useState } from 'react'
import { PEOPLE, ROOMS } from '../shared/game.js'
import Board from './Board.jsx'
import DiceTray from './DiceTray.jsx'
import FirstSteps from './FirstSteps.jsx'
import { soundEnabled, setSoundEnabled, playDice } from './sound.js'
import { FigureArt } from './Artwork.jsx'
import StartGame from './StartGame.jsx'
import MovementControls from './MovementControls.jsx'
import './App.css'
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback } }
const save = (key, value) => { try { localStorage.setItem(key,JSON.stringify(value)) } catch {} }
async function api(path, body, token, signal) {
  let response
  try { response = await fetch('/api'+path, { method:body?'POST':'GET', signal, headers:{ ...(body?{'Content-Type':'application/json'}:{}), ...(token?{Authorization:`Bearer ${token}`}:{}) }, ...(body?{body:JSON.stringify(body)}:{}) }) }
  catch(error) { if(error.name==='AbortError') throw error; throw new Error('Server nicht erreichbar. Prüfe deine Verbindung.') }
  let data; try { data=await response.json() } catch { throw new Error('Der Spielserver ist noch nicht erreichbar.') }
  if(!response.ok) throw new Error(data.error || 'Die Anfrage ist fehlgeschlagen.')
  return data
}
function Die({value}) {
  const dots={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}
  return <span className="die" role="img" aria-label={`${value} Augen`}>{Array.from({length:9},(_,i)=><i key={i} className={dots[value].includes(i)?'pip':''}/>)}</span>
}
export default function App() {
  const [session,setSession]=useState(()=>{const saved=read('ravenswood-online',null),invite=new URLSearchParams(location.search).get('room');return invite&&saved?.code!==invite?null:saved})
  const [savedSessions,setSavedSessions]=useState(()=>read('ravenswood-rooms',[]))
  const [removedRooms,setRemovedRooms]=useState(null)
  const [name,setName]=useState(()=>read('ravenswood-name','')), [code,setCode]=useState(()=>new URLSearchParams(location.search).get('room')||'')
  const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[connection,setConnection]=useState(''),[copied,setCopied]=useState(''),[rules,setRules]=useState(false)
  const [sound,setSound]=useState(soundEnabled)
  const [introRequest,setIntroRequest]=useState(0)
  const [plannedTarget,setPlannedTarget]=useState(null)
  const [roll,setRoll]=useState(null)
  const version=useRef(-1),dialog=useRef(null)
  const accept=data=>{if(data.version>=version.current){version.current=data.version;setState(data)}}
  useEffect(()=>{
    if(!session)return
    let stopped=false,timer,controller
    const poll=async()=>{
      controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000)
      try {const data=await api(`/rooms/${session.code}`,null,session.token,controller.signal);if(!stopped){accept(data);setConnection('')}}
      catch(e){if(!stopped)setConnection(e.name==='AbortError'?'Verbindung unterbrochen. Erneuter Versuch …':e.message)}
      finally{clearTimeout(timeout);if(!stopped)timer=setTimeout(poll,1200)}
    }
    poll();return()=>{stopped=true;clearTimeout(timer);controller?.abort()}
  },[session])
  useEffect(()=>{if(rules)dialog.current?.showModal();else dialog.current?.close()},[rules])
  const remember=s=>{const list=[s,...savedSessions.filter(old=>old.code!==s.code)].slice(0,6);save('ravenswood-rooms',list);setSavedSessions(list);save('ravenswood-online',s);version.current=-1;setSession(s);history.replaceState(null,'',`?room=${s.code}`)}
  const enter=async joining=>{setBusy(true);setError('');try{const data=await api(joining?`/rooms/${code.toUpperCase().trim()}/join`:'/rooms',{name});save('ravenswood-name',name.trim());version.current=-1;accept(data.state);remember({token:data.token,code:data.code,name:name.trim()})}catch(e){setError(e.message)}finally{setBusy(false)}}
  const action=async(type,extra={})=>{
    if(busy)return
    setBusy(true);setError('');setPlannedTarget(null)
    const started=performance.now(),rollId=Date.now()
    if(type==='roll'){setRoll({id:rollId,values:null});playDice()}
    try{
      const data=await api(`/rooms/${session.code}/action`,{type,...extra},session.token)
      if(type==='roll'){
        setRoll({id:rollId,values:data.dice})
        await new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1200))
      }
      accept(data)
    }catch(e){setError(e.message)}finally{setRoll(null);setBusy(false)}
  }
  const leave=()=>{save('ravenswood-online',null);setSession(null);setState(null);version.current=-1;setConnection('');setError('');history.replaceState(null,'',location.pathname)}
  const copy=async kind=>{try{await navigator.clipboard.writeText(kind==='code'?session.code:`${location.origin}${location.pathname}?room=${session.code}`);setCopied(kind);setTimeout(()=>setCopied(''),2500)}catch{setError(`Raumcode zum Weitergeben: ${session.code}`)}}
  const me=state?.players.find(p=>p.id===state.me),current=state?.players[state.turn],myTurn=current?.id===state?.me
  const place=me&&ROOMS.find(r=>r.id===state.positions?.[me.character]),figure=me&&PEOPLE.find(c=>c.id===me.character)
  const phaseText={roll:'Würfle, um deine Figur zu bewegen.',move:'Wähle ein goldenes Feld oder benutze „Zimmer betreten“.',action:'Deine Bewegung ist abgeschlossen. Beende deinen Zug.'}
  return <div className={`app-shell ${state?.status==='playing'?'at-table':''}`}>
    <header className="topbar"><div className="brand"><span className="sigil small" aria-hidden="true">R<span>✦</span></span><span>RAVENSWOOD<span className="brand-sub">DER MULTIPLAYER-SPIELTISCH</span></span></div><nav>{session&&<button className="text-button" onClick={leave}>Startseite</button>}<span className="edition">SPIELBRETT · FIGUREN · MULTIPLAYER</span><button className="text-button" onClick={()=>setRules(true)}>So spielt ihr ↗</button></nav></header>
    {state?.status==='playing'&&<div className="game-tools"><button type="button" aria-pressed={sound} onClick={()=>{setSoundEnabled(!sound);setSound(!sound)}}>Ton: {sound?'An':'Aus'}</button><button type="button" onClick={()=>setIntroRequest(n=>n+1)}>Kurze Einführung</button><span>Würfeln · Weg ansehen · Ziehen</span></div>}
    <FirstSteps active={state?.status==='playing'} request={introRequest}/>
    {error&&<div role="alert" className="notice error">{error}<button aria-label="Meldung schließen" onClick={()=>setError('')}>×</button></div>}
    {connection&&<div role="status" className="notice">{connection}<button onClick={leave}>Zur Startseite</button></div>}
    {!session?<main className="landing"><section className="intro"><div className="eyebrow"><span className="live-dot"/>1–6 PERSONEN · ONLINE MULTIPLAYER</div><h1>Ein Brett.<br/>Sechs Figuren.<br/><em>Eure Spielrunde.</em></h1><p className="lead">Lade deine Freunde an den Spieltisch ein.<br/>Würfelt, zieht durch die Villa und betretet die Zimmer.</p><StartGame name={name} setName={setName} code={code} setCode={setCode} busy={busy} onEnter={enter}/><div className="saved-rooms">{savedSessions.length>0&&<div className="saved-heading"><span>GESPEICHERTE RÄUME</span><button className="text-button" onClick={()=>{setRemovedRooms(savedSessions);save('ravenswood-rooms',[]);setSavedSessions([])}}>Liste leeren</button></div>}{savedSessions.map(s=><div className="saved-room-row" key={s.code}><button className="text-button" onClick={()=>remember(s)}>Raum {s.code} fortsetzen · {s.name} ↗</button><button className="remove-room" aria-label={`Raum ${s.code} aus Liste entfernen`} title="Aus dieser Liste entfernen" onClick={()=>{setRemovedRooms(savedSessions);const remaining=savedSessions.filter(r=>r.code!==s.code);setSavedSessions(remaining);save('ravenswood-rooms',remaining)}}>×</button></div>)}{removedRooms&&<div className="removed-room-note" role="status"><span>Zugang aus dieser Liste entfernt. Der Spielraum bleibt bestehen.</span><button onClick={()=>{setSavedSessions(removedRooms);save('ravenswood-rooms',removedRooms);setRemovedRooms(null)}}>Rückgängig</button></div>}</div><div className="intro-meta"><span>Keine Installation</span><span>Privater Raumcode</span><span>Gemeinsam im Browser</span></div></section><section className="hero-art" aria-label="Vorschau des Spielbretts"><span className="art-caption top">EUER PLATZ AM SPIELTISCH.</span><div className="hero-board"><Board decorative/></div><span className="art-caption bottom">NEUN ZIMMER · SECHS FIGUREN · ZWEI WÜRFEL</span></section><footer className="landing-footer"><span>SPIELBRETT & MULTIPLAYER</span><p>Einladen. Würfeln. Losziehen.</p><span>MAXIMAL SECHS PERSONEN.</span></footer></main>
    :!state?<main className="loading"><p>Dein Spielraum wird geladen …</p></main>
    :state.status==='lobby'?<main className="lobby-layout"><section><div className="eyebrow">EUER SPIELRAUM IST BEREIT</div><h1>Wählt eure<br/><em>Spielfiguren.</em></h1><p className="lead">Teilt den Raumcode, wählt eure Figuren und startet gemeinsam.</p><div className="invite-card"><span>EUER PRIVATER RAUMCODE</span><strong>{state.code}</strong><div className="invite-actions"><button className="secondary" onClick={()=>copy('code')}>{copied==='code'?'Code kopiert ✓':'Raumcode kopieren'}</button><button className="secondary" onClick={()=>copy('link')}>{copied==='link'?'Link kopiert ✓':'Einladungslink kopieren ↗'}</button></div><small>Öffnet den Link oder wählt auf der Startseite „Beitreten“ und gebt diesen Code ein.</small></div><p className="muted">Figur wählen · {state.players.length} von 6 Plätzen besetzt</p><div className="character-select">{PEOPLE.map(c=>{const owner=state.players.find(p=>p.character===c.id);return <button key={c.id} disabled={busy||!!owner&&owner.id!==me.id} className={me.character===c.id?'chosen':''} style={{'--player':c.color}} onClick={()=>action('character',{character:c.id})}><div className="character-portrait"><FigureArt id={c.id}/></div>{c.name}<small>{owner?owner.id===me.id?'Du':owner.name:'Frei'}</small></button>})}</div><button className="primary start" disabled={busy||state.players[0].id!==me.id} onClick={()=>action('start')}>{state.players.length===1?'Alleine starten':'Spielrunde starten'} <span>→</span></button><p className="muted">{state.players[0].id===me.id?'Du kannst direkt alleine starten oder vor dem Start bis zu fünf Freunde einladen.':`${state.players[0].name} startet die Spielrunde.`}</p><button className="text-button" onClick={leave}>Startseite öffnen</button><small className="muted leave-note">Dein Platz bleibt reserviert. Du kannst diesen Raum über die Startseite fortsetzen.</small></section><aside className="lobby-aside"><Board state={state} decorative/><div className="player-list">{state.players.map((p,i)=><div key={p.id}><span className="player-dot" style={{background:PEOPLE.find(c=>c.id===p.character).color}}/><strong>{p.name}{p.id===me.id?' (du)':''}</strong><span>{i===0?'GASTGEBER':'MITSPIELER'}</span></div>)}{Array.from({length:6-state.players.length},(_,i)=><div className="empty-seat" key={i}>＋ Ein Platz ist noch frei</div>)}</div></aside></main>
    :<main className="game-layout"><section className="game-main"><div className="game-heading"><div><div className="eyebrow">EUER SPIELTISCH · RUNDE {state.round}</div><h1>Ravenswood Manor</h1></div><button className="room-badge" onClick={()=>copy('link')}>RAUM {state.code} {copied?'✓':'↗'}</button></div><div className="turn-strip"><span className="live-dot"/><strong>{myTurn?'Du bist am Zug':`${current.name} ist am Zug`}</strong><span>{myTurn?phaseText[state.phase]:'Die Figur wird bei allen gleichzeitig bewegt.'}</span>{state.dice&&!roll&&<div className="dice" aria-label={`Gewürfelt: ${state.dice.join(' und ')}`}>{state.dice.map((d,i)=><Die key={i} value={d}/>)}</div>}</div><div className="board-frame"><Board state={state} plannedTarget={plannedTarget} busy={busy} onMove={target=>action('move',{target})}/></div><div className="board-legend"><span>◉ Deine Figur hat einen hellen Ring.</span><span>↗ Geheimgang · Gold = erreichbares Ziel</span></div><div className="players-strip">{state.players.map(p=><div key={p.id} className={current.id===p.id?'active':''}><span className="player-dot" style={{background:PEOPLE.find(c=>c.id===p.character).color}}/><strong>{p.name}{p.id===me.id?' (du)':''}</strong><small>{PEOPLE.find(c=>c.id===p.character).name}</small></div>)}</div></section><aside className="investigation"><div className="aside-heading"><span>DEINE SPIELFIGUR</span><span>♟</span></div><div className="figure-summary"><div className="figure-portrait"><FigureArt id={me.character}/></div><div><strong>{figure.name}</strong><span>{me.name}</span><small>{place?place.name:'Im Flur'}</small></div></div><div className="action-panel"><DiceTray values={roll?roll.values:state.dice} rolling={!!roll} id={roll?.id || `${state.round}-${state.turn}-${state.dice?.join('-')}`} actor={current.name} phase={state.phase}/>{myTurn?<><h2>{state.phase==='roll'?'Du bist dran!':state.phase==='move'?'Wohin ziehst du?':'Gut gezogen!'}</h2>{state.phase==='roll'&&<><p className="muted">Würfle mit zwei Würfeln. Die Summe bestimmt, wie weit du ziehen darfst.</p><button className="primary" disabled={busy} onClick={()=>action('roll')}>Würfeln <span className="dice" aria-hidden="true"><Die value={5}/><Die value={3}/></span></button>{place?.passage&&<button className="secondary passage" disabled={busy} onClick={()=>action('passage')}>Geheimgang: {ROOMS.find(r=>r.id===place.passage).name} ↗</button>}</>}{state.phase==='move'&&<MovementControls state={state} onPreview={target=>setPlannedTarget({target,id:Date.now()})} busy={busy} onMove={target=>action('move',{target})}/ >}{state.phase==='action'&&<p className="muted">{place?`Du hast das Zimmer „${place.name}“ betreten.`:'Deine Figur steht jetzt auf dem gewählten Flurfeld.'} {state.players.length===1?'Beende deinen Zug, um erneut zu würfeln.':'Gib die Würfel an die nächste Person weiter.'}</p>}<button className="secondary end-turn" disabled={busy} onClick={()=>action('end')}>Zug beenden →</button></>:<><h2>{current.name} ist dran.</h2><p className="muted">Deine Figur bleibt sichtbar. Sobald du an der Reihe bist, kannst du hier würfeln und ein Zimmer betreten.</p></>}</div><div className="turn-guide"><h3>Dein Zug in drei Schritten</h3><ol><li className={myTurn&&state.phase==='roll'?'now':''}>Würfeln</li><li className={myTurn&&state.phase==='move'?'now':''}>Flurfeld wählen oder Zimmer betreten</li><li className={myTurn&&state.phase==='action'?'now':''}>Zug beenden</li></ol></div><p className="scope-note">Spielbrett & Bewegung: Matin<br/>Multiplayer & Spielstart: Sophie</p></aside></main>}
    <dialog ref={dialog} className="modal" onCancel={()=>setRules(false)}><button className="modal-close" aria-label="Schließen" onClick={()=>setRules(false)}>×</button><div className="eyebrow">SO STARTET EURE SPIELRUNDE</div><h2>Gemeinsam an den Spieltisch.</h2><ol className="rules"><li><strong>Einladen:</strong> Einen Namen eingeben, „Neues Spiel“ wählen und den Raumcode oder Link an Freunde weitergeben. Du kannst alleine oder mit bis zu sechs Menschen spielen.</li><li><strong>Figuren wählen:</strong> Jede Person wählt eine freie Figur. Der Gastgeber startet die Runde.</li><li><strong>Würfeln:</strong> Im eigenen Zug einmal mit zwei Würfeln würfeln. Ihre Summe bestimmt die maximale Schrittzahl.</li><li><strong>Bewegen:</strong> Ein goldenes Flurfeld anklicken oder rechts ein erreichbares Zimmer auswählen und „Zimmer betreten“ drücken. Weniger Schritte sind erlaubt. Figuren blockieren sich nicht. Jede Bewegung beendet den Bewegungsteil des Zuges.</li><li><strong>Geheimgänge:</strong> Die gegenüberliegenden Eckzimmer sind verbunden. Ein Geheimgang ersetzt den Würfelwurf.</li><li><strong>Weitergeben:</strong> Mit „Zug beenden“ ist die nächste Person dran. Alle sehen denselben Spielstand.</li></ol><p className="muted">Diese Fassung enthält Matins Spielbrett und Bewegung sowie Sophies Multiplayer und Spielstart. Die weiteren Spielmodule sind nicht enthalten. Bei einer Unterbrechung neu laden; der Raumzugang bleibt auf diesem Gerät gespeichert.</p><button className="primary" onClick={()=>setRules(false)}>Los geht’s →</button></dialog>
  </div>
}
