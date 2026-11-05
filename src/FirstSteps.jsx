import {useEffect,useRef,useState} from 'react'
const steps=[
  {icon:'⚄',title:'1. Würfeln',text:'Wenn du dran bist, drücke „Würfeln“. Beide Würfel rollen auf dem Teller. Ihre Summe bestimmt deine maximale Schrittzahl.'},
  {icon:'⌁',title:'2. Weg ansehen und ziehen',text:'Goldene Punkte und Ringe markieren erreichbare Ziele. Fahre mit der Maus darüber: Die Linie zeigt den Weg und die Schrittzahl. Auf dem Handy ein Ziel antippen und danach „Hierhin ziehen“ wählen. Zimmer kannst du auch rechts auswählen.'},
  {icon:'↪',title:'3. Zug beenden',text:'Nach deiner Bewegung drückst du „Zug beenden“. Alleine bist du sofort wieder dran. Mit Freunden würfelt die nächste Person. Ziehen dreht die Karte; Ton und Kamera-Verfolgung sind freiwillig einschaltbar.'}
]
export default function FirstSteps({active,request}){
  const ref=useRef(null),[step,setStep]=useState(0),[open,setOpen]=useState(false)
  useEffect(()=>{if(!active)return;let seen=false;try{seen=localStorage.getItem('ravenswood-intro-complete')==='true'}catch{};if(!seen){setStep(0);setOpen(true)}},[active])
  useEffect(()=>{if(request){setStep(0);setOpen(true)}},[request])
  useEffect(()=>{if(open)ref.current?.showModal();else ref.current?.close()},[open])
  const finish=()=>{try{localStorage.setItem('ravenswood-intro-complete','true')}catch{};setOpen(false)}
  const current=steps[step]
  return <dialog className="modal first-steps" ref={ref} onCancel={event=>{event.preventDefault();finish()}} aria-labelledby="intro-title"><div className="eyebrow">DEIN ERSTER BESUCH · {step+1} / 3</div><div className="intro-symbol" aria-hidden="true">{current.icon}</div><h2 id="intro-title">{current.title}</h2><p>{current.text}</p><div className="intro-progress" aria-hidden="true">{steps.map((_,i)=><i key={i} className={i===step?'current':''}/>)}</div><button className="primary" onClick={()=>step===2?finish():setStep(step+1)}>{step===2?'Los geht’s':'Weiter'} →</button><div className="intro-actions">{step>0&&<button className="text-button" onClick={()=>setStep(step-1)}>Zurück</button>}<button className="text-button" onClick={finish}>Einführung überspringen</button></div></dialog>
}
