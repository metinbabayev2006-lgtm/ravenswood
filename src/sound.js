// Small synthesized effects: no media downloads and no autoplay.
let enabled=false,context=null,master=null,lastStep=0
try { enabled=JSON.parse(localStorage.getItem('ravenswood-sound')||'false')===true } catch {}
export const soundEnabled=()=>enabled
export function unlockSound(){
  if(!enabled)return
  try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();master.gain.value=.22;master.connect(context.destination)}if(context.state==='suspended')context.resume().catch(()=>{})}catch{}
}
export function setSoundEnabled(value){enabled=value;try{localStorage.setItem('ravenswood-sound',JSON.stringify(value))}catch{};if(master&&context)master.gain.setTargetAtTime(value ? .22 : 0,context.currentTime,.015);if(value)unlockSound()}
function impact(delay,duration,frequency,volume){
  if(!enabled||!context||context.state!=='running'||document.visibilityState!=='visible')return
  const start=context.currentTime+delay,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),samples=buffer.getChannelData(0)
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.pow(1-i/samples.length,2)
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.001,start+duration);source.connect(filter);filter.connect(gain);gain.connect(master);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};source.start(start)
}
export function playDice(){unlockSound();const schedule=()=>{for(let i=0;i<7;i++)impact(i*.105,.07,1300+i*70,.7-i*.06)};if(context?.state==='suspended')context.resume().then(schedule).catch(()=>{});else schedule()}
export function playStep(){if(!enabled||performance.now()-lastStep<210)return;lastStep=performance.now();impact(0,.055,420,.4)}
