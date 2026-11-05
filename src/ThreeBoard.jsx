import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { playStep } from './sound.js'
import { PEOPLE, ROOMS, STARTS, roomAt, corridor, distance, corridorPath } from '../shared/game.js'

const point = pos => { const r=typeof pos==='string'&&ROOMS.find(r=>r.id===pos); return r?[r.x+2.5-9.5,r.y+2.5-9.5]:[pos[0]-9,pos[1]-9] }
function walkPath(from,to,index) {
  const newRoom=typeof to==='string'&&ROOMS.find(r=>r.id===to)
  const route=corridorPath(from,to).map(([x,y])=>[x-9,y-9])
  if(!route.length)return [point(to)]
  if(newRoom) {const v=point(to);route.push([v[0]+(index%3-1)*.8,v[1]+(Math.floor(index/3)-.5)*.8])}
  return route
}
export default function ThreeBoard({state,onMove,busy,decorative=false,fallback,plannedTarget}) {
  const host=useRef(null),engine=useRef(null),latest=useRef({state,onMove,busy}),[failed,setFailed]=useState(false)
  const [preview,setPreview]=useState(null)
  const [follow,setFollow]=useState(()=>{try{return localStorage.getItem('ravenswood-follow')==='true'}catch{return false}})
  const [view,setView]=useState(()=>{try{return localStorage.getItem('ravenswood-camera')==='top'?'top':'3d'}catch{return '3d'}})
  latest.current={state,onMove,busy,follow}
  const cameraMode=decorative?'3d':view
  useEffect(()=>{
    if(!host.current)return
    let renderer
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'})}catch{setFailed(true);return}
    const container=host.current,scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-14,14,14,-14,.1,100)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.setClearColor(0x080f1c,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15
    container.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xb7b6d5,0x2c111d,1.35))
    const moon=new THREE.DirectionalLight(0x9bbfea,2.2);moon.position.set(-12,22,10);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);Object.assign(moon.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:65});moon.shadow.bias=-.001;moon.shadow.normalBias=.04;scene.add(moon)
    const warm=new THREE.DirectionalLight(0xffaa70,2.4);warm.position.set(10,9,-12);scene.add(warm)
    const mats=new Map(),geos=new Map(),textures=[]
    const mat=color=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.78}));return mats.get(color)}
    const box=(parent,x,y,z,w,h,d,color)=>{const key=[w,h,d].join();if(!geos.has(key))geos.set(key,new THREE.BoxGeometry(w,h,d));const m=new THREE.Mesh(geos.get(key),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
    const sphere=(parent,x,y,z,r,color)=>{const key='sphere'+r;if(!geos.has(key))geos.set(key,new THREE.SphereGeometry(r,12,9));const m=new THREE.Mesh(geos.get(key),mat(color));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
    const label=(text,color='#e5d6b1',bg='#281b24')=>{const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,96);ctx.strokeStyle='#a17b4a';ctx.lineWidth=4;ctx.strokeRect(2,2,508,92);ctx.fillStyle=color;ctx.font='bold 40px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,49,490);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t}
    const base=box(scene,0,-.38,0,20.7,.65,20.7,'#28151b');box(scene,0,-.03,0,20,.08,20,'#8e7951')
    for(let x=0;x<19;x++)for(let z=0;z<19;z++)box(scene,x-9,.025,z-9,.98,.08,.98,(x+z)%2?'#3d3035':'#8b7a71')
    const chair=(g,x,z,rotation=0)=>{const c=new THREE.Group();c.position.set(x,0,z);c.rotation.y=rotation;g.add(c);box(c,0,.32,0,.46,.12,.48,'#9e6b54');box(c,0,.65,-.22,.46,.65,.1,'#8b6255');for(const a of [-.16,.16])for(const b of [-.16,.16])box(c,a,.16,b,.06,.32,.06,'#473e37')}
    const table=(g,x,z,w=2.3,d=1.3)=>{box(g,x,.73,z,w,.14,d,'#966d48');for(const a of [-w/2+.15,w/2-.15])for(const b of [-d/2+.15,d/2-.15])box(g,x+a,.36,z+b,.12,.72,.12,'#4e3c30')}
    const plant=(g,x,z)=>{box(g,x,.22,z,.36,.44,.36,'#675043');sphere(g,x,.63,z,.35,'#3d735f');sphere(g,x-.15,.92,z,.24,'#51836a')}
    for(const r of ROOMS){const g=new THREE.Group();g.position.set(r.x-9.5,0,r.y-9.5);scene.add(g);box(g,2.5,.1,2.5,5,.14,5,r.tone)
      for(let i=0;i<5;i++)box(g,i+.5,.185,2.5,.97,.04,4.85,i%2?'#5b352f':'#654038')
      const backDoor=r.door[1]===r.y-1,leftDoor=r.door[0]===r.x-1
      if(backDoor){box(g,.9,.8,0,1.8,1.5,.16,'#632d36');box(g,4.1,.8,0,1.8,1.5,.16,'#632d36')}else box(g,2.5,.8,0,5,1.5,.16,'#632d36')
      if(leftDoor){box(g,0,.8,.9,.16,1.5,1.8,'#3e202c');box(g,0,.8,4.1,.16,1.5,1.8,'#3e202c')}else box(g,0,.8,2.5,.16,1.5,5,'#3e202c')
      box(g,2.5,1.58,0,5,.09,.2,'#ba9263');box(g,0,1.58,2.5,.2,.09,5,'#967851')
      for(const x of [1.2,3.7]){box(g,x,.95,.1,.7,.85,.06,'#497a9c');box(g,x,1.36,.14,.8,.06,.08,'#a1b8c9');box(g,x,.96,.15,.04,.8,.08,'#a1b8c9')}
      const floorLabel=new THREE.Mesh(new THREE.PlaneGeometry(3.9,.65),new THREE.MeshBasicMaterial({map:label(r.name),side:THREE.DoubleSide}));floorLabel.rotation.x=-Math.PI/2;floorLabel.position.set(2.5,.24,4.52);g.add(floorLabel)
      if(['library','study'].includes(r.id)){for(const x of [.7,2.2,3.7]){box(g,x,.95,.35,1.35,1.65,.5,'#3a302e');for(let y=.4;y<1.8;y+=.45){box(g,x,y,.64,1.3,.05,.3,'#a48c66');for(let i=0;i<6;i++)box(g,x-.49+i*.19,y+.17,.6,.12,.28,.14,['#49766e','#996c5e','#9e8e61','#696d8b'][i%4])}}table(g,2.7,2.6,1.8,1.2);chair(g,2.7,3.6);plant(g,4.5,3.5)}
      else if(r.id==='billiard'){box(g,2.5,.65,2.3,2.6,.7,1.8,'#4b382e');box(g,2.5,1.04,2.3,2.5,.12,1.7,'#92673f');box(g,2.5,1.12,2.3,2.2,.06,1.4,'#24765d');sphere(g,2.1,1.21,2.2,.08,'#e8e3cd');sphere(g,2.9,1.21,2.4,.08,'#b54749')}
      else if(r.id==='kitchen'){box(g,2.5,.55,.6,3.9,1,.9,'#798a89');box(g,.6,.55,1.6,.9,1,2,'#798a89');box(g,2.5,1.1,.6,4,.12,1,'#a9b3ae');table(g,2.9,2.8,1.7,1.1);chair(g,2.3,3.7);plant(g,4.2,.6)}
      else if(r.id==='dining'){box(g,2.5,.23,2.4,3.7,.04,3.1,'#692533');table(g,2.5,2.4,2.5,1.3);for(const x of [1.5,2.5,3.5]){chair(g,x,3.5);chair(g,x,1.2,Math.PI)}sphere(g,2.5,1.02,2.4,.16,'#c3a25e')}
      else if(r.id==='lounge'){box(g,2.5,.35,2.4,3.7,.2,3,'#6b283a');for(const x of [1.2,3.8]){box(g,x,.55,2.2,.85,.5,2.3,'#9c3549');box(g,x,.9,1.3,.85,.8,.2,'#652538')}table(g,2.5,2.6,.9,1.2);plant(g,4.2,.6)}
      else if(r.id==='garden'){for(const x of [.8,4.2])for(const z of [.8,2.3,3.5])plant(g,x,z);sphere(g,2.5,.5,2.3,.5,'#708b91');table(g,2.5,2.3,1.3,1.3);chair(g,2.5,3.4)}
      else if(r.id==='hall'){for(let i=0;i<6;i++)box(g,2.5,.2+i*.12,.5+i*.32,1.6,.2+i*.22,.33,'#818890');plant(g,.8,3.3);plant(g,4.2,3.3)}
      else{box(g,2.5,.23,2.5,3.5,.07,3.2,'#782a39');plant(g,.7,.7);plant(g,4.3,.7);chair(g,4.1,3.3);table(g,1,1.4,.8,.7)}
      // Brass candles and warm pools of light against the cool moonlit windows.
      const candle=box(g,4.2,.45,3.6,.12,.5,.12,'#d7b580');box(g,4.2,.22,3.6,.35,.08,.35,'#aa814c')
      const flame=sphere(g,4.2,.76,3.6,.065,'#ffe2a2');flame.material=new THREE.MeshStandardMaterial({color:0xffda89,emissive:0xffa84d,emissiveIntensity:3});mats.set('flame'+r.id,flame.material)
      if(['lounge','dining','ballroom'].includes(r.id)){const light=new THREE.PointLight(0xff964f,5,7,2);light.position.set(2.5,2.8,2.5);g.add(light)}
      const lamp=sphere(g,2.5,1.4,.22,.1,'#ffe4a8');lamp.material=new THREE.MeshStandardMaterial({color:0xffdf9e,emissive:0xffb95c,emissiveIntensity:2});mats.set('lamp'+r.id,lamp.material)
    }
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const figures=new Map(),ringGeo=new THREE.RingGeometry(.36,.46,32);geos.set('ring',ringGeo)
    PEOPLE.forEach((c,index)=>{const figure=new THREE.Group();scene.add(figure);const torso=box(figure,0,.94,0,.38,.5,.22,c.color);box(figure,0,1.16,-.005,.14,.13,.24,'#e0d3bd');sphere(figure,0,1.4,0,.2,'#caa486');sphere(figure,0,1.51,-.03,.19,'#322d30');box(figure,0,1.44,.16,.23,.14,.07,'#caa486');const limbs=[]
      for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.12,.7,0);figure.add(leg);box(leg,0,-.25,0,.15,.5,.17,'#26313f');box(leg,0,-.5,.04,.18,.13,.29,'#151f2a');limbs.push(leg);const arm=new THREE.Group();arm.position.set(side*.27,1.13,0);figure.add(arm);box(arm,0,-.2,0,.13,.42,.15,c.color);sphere(arm,0,-.44,0,.075,'#caa486');limbs.push(arm)}
      const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xf4d28d,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.25;figure.add(ring);ring.visible=false
      const aura=new THREE.Mesh(new THREE.RingGeometry(.48,.66,32),new THREE.MeshBasicMaterial({color:0xffd686,transparent:true,opacity:.65,side:THREE.DoubleSide}));aura.rotation.x=-Math.PI/2;aura.position.y=.27;figure.add(aura);aura.visible=false
      const arrow=new THREE.Mesh(new THREE.ConeGeometry(.12,.27,8),new THREE.MeshBasicMaterial({color:0xffd686}));arrow.rotation.z=Math.PI;arrow.position.y=2.35;figure.add(arrow);arrow.visible=false
      const player=latest.current.state?.players.find(p=>p.character===c.id),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:label(player?.name||c.name),depthTest:false}));sprite.scale.set(1.45,.27,1);sprite.position.y=1.98;figure.add(sprite)
      const initial=latest.current.state?.positions?.[c.id]||STARTS[index],p=point(initial);if(typeof initial==='string'){p[0]+=(index%3-1)*.8;p[1]+=(Math.floor(index/3)-.5)*.8}figure.position.set(p[0],.18,p[1]);figures.set(c.id,{figure,limbs,ring,sprite,aura,arrow,position:initial,route:[],index})
    })
    const markers=new THREE.Group();scene.add(markers)
    const dotGeo=new THREE.CircleGeometry(.14,16),dotMat=new THREE.MeshBasicMaterial({color:0xedc472,side:THREE.DoubleSide,transparent:true,opacity:.85});geos.set('dot',dotGeo);mats.set('dot',dotMat)
    const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.22),hit=new THREE.Vector3()
    const previewLayer=new THREE.Group();scene.add(previewLayer)
    const previewMat=new THREE.MeshBasicMaterial({color:0xffd786,depthTest:false,transparent:true,opacity:.95});mats.set('preview-line',previewMat)
    const clearPreview=()=>{if(!e.previewKey)return;e.previewKey='';e.previewTarget=null;previewLayer.clear();e.previewGeometry?.dispose();e.previewGeometry=null;setPreview(null)}
    const canAct=()=>{const s=latest.current.state;return s&&s.status==='playing'&&!latest.current.busy&&s.players[s.turn]?.id===s.me&&s.phase==='move'}
    const previewTarget=target=>{const s=latest.current.state;if(!canAct())return clearPreview();const me=s.players.find(p=>p.id===s.me),from=s.positions[me.character],cost=distance(from,target);if(JSON.stringify(from)===JSON.stringify(target)||cost>s.dice[0]+s.dice[1])return clearPreview();const key=JSON.stringify([s.version,target]);if(key===e.previewKey)return;clearPreview();e.previewKey=key;e.previewTarget=target;const f=figures.get(me.character),coords=[[f.figure.position.x,f.figure.position.z],...walkPath(from,target,f.index)],curve=new THREE.CurvePath();for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i];if(Math.hypot(a[0]-b[0],a[1]-b[1])>.001)curve.add(new THREE.LineCurve3(new THREE.Vector3(a[0],.31,a[1]),new THREE.Vector3(b[0],.31,b[1])))}if(curve.curves.length){e.previewGeometry=new THREE.TubeGeometry(curve,Math.max(12,coords.length*4),.045,6,false);const line=new THREE.Mesh(e.previewGeometry,previewMat);line.renderOrder=1000;previewLayer.add(line)}setPreview({target,cost,label:typeof target==='string'?ROOMS.find(r=>r.id===target).name:`Flurfeld ${target[0]+1}, ${target[1]+1}`})}
    const targetAt=event=>{const rect=renderer.domElement.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);if(!ray.ray.intersectPlane(ground,hit))return null;const x=Math.floor(hit.x+9.5),y=Math.floor(hit.z+9.5);if(x<0||x>18||y<0||y>18)return null;return roomAt(x,y)?.id||[x,y]}
    let press=null,dragged=false,pointerType='mouse'
    const down=event=>{press=[event.clientX,event.clientY];dragged=false;pointerType=event.pointerType||'mouse'}
    const pointerMove=event=>{if(press){if(Math.hypot(event.clientX-press[0],event.clientY-press[1])>5){dragged=true;e.trackingPause=performance.now()+1500;clearPreview()}return}if(event.pointerType==='touch')return;const target=targetAt(event);if(target!==null)previewTarget(target);else clearPreview()}
    const pointerUp=()=>{press=null}
    const pointerLeave=()=>{press=null}
    renderer.domElement.addEventListener('pointerup',pointerUp,true)
    renderer.domElement.addEventListener('pointerleave',pointerLeave)
    renderer.domElement.addEventListener('pointerdown',down,true)
    renderer.domElement.addEventListener('pointermove',pointerMove,true)
    const click=event=>{if(dragged||!canAct())return;const target=targetAt(event);if(target===null)return;if(pointerType==='touch'&&JSON.stringify(e.previewTarget)!==JSON.stringify(target)){previewTarget(target);return}const s=latest.current.state,me=s.players.find(p=>p.id===s.me),from=s.positions[me.character];if(JSON.stringify(from)!==JSON.stringify(target)&&distance(from,target)<=s.dice[0]+s.dice[1])latest.current.onMove(target)}
    renderer.domElement.addEventListener('click',click)
    const resize=()=>{const w=container.clientWidth,h=Math.max(280,w*.77);renderer.setSize(w,h);const aspect=w/h,span=11.8;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix()}
    const observer=new ResizeObserver(resize);observer.observe(container);resize()
    const controls=new OrbitControls(camera,renderer.domElement)
    controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.enableZoom=!decorative;controls.enableRotate=!decorative;controls.minZoom=.75;controls.maxZoom=2
    const setMode=mode=>{controls.stopListenToKeyEvents();camera.zoom=1;camera.up.set(0,1,0);camera.position.set(...(mode==='top'?[0,38,.01]:[21,19,25]));controls.target.set(0,0,0);controls.minPolarAngle=mode==='top'?.001:.35;controls.maxPolarAngle=mode==='top'?.001:1.25;controls.update();camera.updateProjectionMatrix()}
    const e={scene,camera,figures,markers,markerKey:'',previewKey:'',previewTarget:null,previewGeometry:null,preview:previewTarget,trackingPause:0,mode:cameraMode,setMode,rotate:angle=>{const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update()}};engine.current=e
    const pauseTracking=()=>{e.trackingPause=performance.now()+2000};renderer.domElement.addEventListener('wheel',pauseTracking,{passive:true})
    setMode(cameraMode)
    let frame,last=performance.now(),t=0
    function animate(now){const dt=Math.min((now-last)/1000,.05);last=now;t+=dt;controls.update()
      const s=latest.current.state,me=s?.players.find(p=>p.id===s.me),canMove=s?.status==='playing'&&s.players[s.turn]?.id===s.me&&s.phase==='move'&&!latest.current.busy
      if(!canMove)clearPreview()
      let movingFocus=null
      const key=canMove?JSON.stringify([s.version,me.character]):'none'
      if(key!==e.markerKey){e.markerKey=key;markers.clear();if(canMove){for(let x=0;x<19;x++)for(let y=0;y<19;y++)if(corridor(x,y)&&distance(s.positions[me.character],[x,y])<=s.dice[0]+s.dice[1]){const m=new THREE.Mesh(dotGeo,dotMat);m.rotation.x=-Math.PI/2;m.position.set(x-9,.25,y-9);markers.add(m)}for(const r of ROOMS)if(r.id!==s.positions[me.character]&&distance(s.positions[me.character],r.id)<=s.dice[0]+s.dice[1]){const m=new THREE.Mesh(ringGeo,dotMat);m.rotation.x=-Math.PI/2;m.scale.set(4,4,4);m.position.set(r.x-7,.26,r.y-7);markers.add(m)}}}
      for(const [id,f] of figures){const target=s?.positions?.[id]||STARTS[f.index];if(JSON.stringify(target)!==JSON.stringify(f.position)){const old=f.position;f.route=walkPath(old,target,f.index);f.position=target}
        if(reducedMotion&&f.route.length){const end=f.route.at(-1);f.figure.position.x=end[0];f.figure.position.z=end[1];f.route=[]}
        const next=f.route[0];if(next){movingFocus=f.figure.position;playStep();const dx=next[0]-f.figure.position.x,dz=next[1]-f.figure.position.z,len=Math.hypot(dx,dz),step=dt*5;if(len<=step){f.figure.position.x=next[0];f.figure.position.z=next[1];f.route.shift()}else{f.figure.position.x+=dx/len*step;f.figure.position.z+=dz/len*step;f.figure.rotation.y=Math.atan2(dx,dz)}f.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(t*13+(i<2?0:Math.PI))*.45)}else f.limbs.forEach(l=>l.rotation.x*=.7)
        const player=s?.players.find(p=>p.character===id),active=!decorative&&!!player&&s.players[s.turn]?.character===id;f.aura.visible=active;f.arrow.visible=active;f.aura.scale.setScalar(reducedMotion?1:1+Math.sin(t*2.5)*.1);f.arrow.position.y=2.35+(reducedMotion?0:Math.sin(t*2.5)*.09);f.ring.visible=!!player&&player.id===s.me;f.sprite.visible=!decorative&&!!player;f.sprite.position.y=1.98+(s?.players[s.turn]?.character===id?Math.sin(t*2)*.04:0)
      }
      if(!decorative&&latest.current.follow&&movingFocus&&!reducedMotion&&now>e.trackingPause){const goal=new THREE.Vector3(movingFocus.x,0,movingFocus.z),delta=goal.sub(controls.target).multiplyScalar(Math.min(1,dt*4));camera.position.add(delta);controls.target.add(delta);controls.update()}
      renderer.render(scene,camera);frame=requestAnimationFrame(animate)
    }
    frame=requestAnimationFrame(animate)
    const lost=event=>{event.preventDefault();setFailed(true)};renderer.domElement.addEventListener('webglcontextlost',lost)
    return()=>{cancelAnimationFrame(frame);e.previewGeometry?.dispose();controls.dispose();renderer.domElement.removeEventListener('wheel',pauseTracking);renderer.domElement.removeEventListener('pointerup',pointerUp,true);renderer.domElement.removeEventListener('pointerleave',pointerLeave);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',pointerMove,true);renderer.domElement.removeEventListener('click',click);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{if(o.geometry&&!Array.from(geos.values()).includes(o.geometry))o.geometry.dispose();if(o.material&&!Array.from(mats.values()).includes(o.material))o.material.dispose()});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();engine.current=null}
  },[])
  useEffect(()=>{if(engine.current){engine.current.mode=cameraMode;engine.current.setMode(cameraMode)}},[cameraMode])
  useEffect(()=>{if(plannedTarget)engine.current?.preview(plannedTarget.target)},[plannedTarget,state?.version])
  if(failed)return <div><p className="camera-caption">3D ist auf diesem Gerät nicht verfügbar. Die Brettansicht bleibt spielbar.</p>{fallback}</div>
  const change=value=>{setView(value);try{localStorage.setItem('ravenswood-camera',value)}catch{}}
  const me=state?.players.find(p=>p.id===state.me),moving=state?.phase==='move'&&state?.players[state.turn]?.id===state.me
  return <div className={`three-manor ${decorative?'three-decorative':''}`}>
    {!decorative&&<div className="camera-controls" role="group" aria-label="Brettansicht"><span>KAMERA</span>{[['3d','3D'],['top','Von oben']].map(([id,label])=><button key={id} type="button" aria-pressed={cameraMode===id} onClick={()=>change(id)}>{label}</button>)}<button type="button" aria-label="Karte nach links drehen" onClick={()=>engine.current?.rotate(Math.PI/6)}>↶</button><button type="button" aria-label="Karte nach rechts drehen" onClick={()=>engine.current?.rotate(-Math.PI/6)}>↷</button><button type="button" onClick={()=>engine.current?.setMode(cameraMode)}>Zurücksetzen</button></div>}
    <div className="three-viewport" ref={host} role="img" aria-label="Dreidimensionale Villa mit laufenden Spielfiguren"/>
    {!decorative&&<div className="board-extras"><button type="button" aria-pressed={follow} onClick={()=>{setFollow(!follow);try{localStorage.setItem('ravenswood-follow',String(!follow))}catch{}}}>Kamera folgt: {follow?'An':'Aus'}</button><span>Goldener Ring & Pfeil: aktive Figur</span></div>}
    {!decorative&&<><div className="route-preview" role="status" aria-live="polite">{preview&&moving&&!busy?<><span><strong>{preview.label}</strong> · {preview.cost} von {state.dice[0]+state.dice[1]} Schritten</span><button type="button" onClick={()=>onMove(preview.target)}>Hierhin ziehen →</button></>:<span>Wegvorschau: ein erreichbares Ziel berühren oder mit der Maus darüberfahren.</span>}</div><p className="camera-caption">{moving?'Klicke auf einen goldenen Punkt oder einen markierten Raum. Deine Figur läuft dorthin.':'Ziehen: Karte drehen · Mausrad / zwei Finger: zoomen'}</p><div className="board-keyboard-targets" aria-label="Erreichbare Ziele für Tastaturbedienung">{moving&&!busy&&Array.from({length:361},(_,i)=>[i%19,Math.floor(i/19)]).filter(p=>corridor(...p)&&JSON.stringify(p)!==JSON.stringify(state.positions[me.character])&&distance(state.positions[me.character],p)<=state.dice[0]+state.dice[1]).map(p=><button key={p.join(',')} onFocus={()=>engine.current?.preview(p)} onClick={()=>onMove(p)}>Zum Flurfeld {p[0]+1}, {p[1]+1} ziehen</button>)}</div></>}
  </div>
}
