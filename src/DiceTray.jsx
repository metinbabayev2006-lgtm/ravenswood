import { useEffect, useRef } from 'react'
const dots={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}
const rotation={1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]}
export default function DiceTray({values,rolling,id,actor,phase}) {
  const cubes=useRef([]),initial=useRef(true),lastResult=useRef(null)
  useEffect(()=>{
    const resultKey=values?.join('-') || null
    if(!rolling && resultKey && resultKey===lastResult.current)return
    lastResult.current=resultKey
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animations=cubes.current.map((cube,i)=>{
      if(!cube)return null
      const [x,y]=rotation[values?.[i]||1]
      const end=`translate3d(0,0,0) rotateX(${x}deg) rotateY(${y}deg)`
      if(reduced||initial.current&&!rolling){cube.style.transform=end;return null}
      if(!values&&rolling)return cube.animate([{transform:'translate3d(-12px,-25px,0) rotateX(0deg) rotateY(0deg)'},{transform:'translate3d(12px,-45px,20px) rotateX(720deg) rotateY(540deg)'}],{duration:650,iterations:Infinity})
      cube.style.transform=end
      return cube.animate([
        {transform:`translate3d(${i?-70:70}px,-48px,70px) rotateX(${x+650}deg) rotateY(${y+540}deg)`,offset:0},
        {transform:`translate3d(${i?-10:10}px,4px,0) rotateX(${x+300}deg) rotateY(${y+260}deg)`,offset:.46},
        {transform:`translate3d(${i?8:-8}px,-18px,18px) rotateX(${x+110}deg) rotateY(${y+90}deg)`,offset:.7},
        {transform:end,offset:1}
      ],{duration:1100,easing:'cubic-bezier(.15,.65,.35,1)',fill:'forwards'})
    })
    initial.current=false
    return()=>animations.forEach(a=>a?.cancel())
  },[id,values?.[0],values?.[1]])
  const total=values?.reduce((a,b)=>a+b,0)
  return <section className={`dice-tray ${rolling?'is-rolling':''}`} aria-label="Würfelteller"><div className="tray-topline"><span>RAVENSWOOD</span><span>♢</span></div><div className="tray-stage" aria-hidden="true">{[0,1].map(i=><div className="cube-camera" key={i}><div ref={el=>cubes.current[i]=el} className={`throw-cube ${!values&&!rolling?'cube-idle':''}`}>{[1,2,3,4,5,6].map(n=><div className={`cube-face face-${n}`} key={n}>{Array.from({length:9},(_,p)=><i key={p} className={dots[n].includes(p)?'cube-pip':''}/>)}</div>)}</div></div>)}</div><div className="tray-result" role="status" aria-live="polite">{rolling?<><strong>Die Würfel rollen …</strong><small>Einen Moment, {actor}.</small></>:values?<><strong>{values[0]} + {values[1]} = <b>{total} Schritte</b></strong><small>{phase==='move'?'Wohin möchtest du ziehen?':'Letzter Wurf dieses Zuges.'}</small></>:<><strong>Dein Glück liegt auf dem Tisch.</strong><small>Würfle, wenn du an der Reihe bist.</small></>}</div></section>
}
