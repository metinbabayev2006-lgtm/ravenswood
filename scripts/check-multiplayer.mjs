import assert from 'node:assert/strict'
import { corridor, distance } from '../shared/game.js'
const base=process.argv[2]||'http://127.0.0.1:3001'
async function call(path,body,token){const res=await fetch(base+'/api'+path,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:`Bearer ${token}`}:{})},body:body&&JSON.stringify(body)});return {status:res.status,data:await res.json()}}
const created=await call('/rooms',{name:'Test Matin'});assert.equal(created.status,201,JSON.stringify(created.data))
const {code,token}=created.data,prefix=`/rooms/${code}`
const attempts=await Promise.all(Array.from({length:7},(_,i)=>call(prefix+'/join',{name:`Test Gast ${i}`})))
const joined=attempts.filter(r=>r.status===201);assert.equal(joined.length,5);assert.equal(attempts.filter(r=>r.data.error?.includes('voll')).length,2)
const clients=[created.data,...joined.map(r=>r.data)]
assert.notEqual((await call(prefix)).status,200)
assert.equal((await call(prefix+'/action',{type:'start'},clients[1].token)).status,400)
const start=await call(prefix+'/action',{type:'start'},token);assert.equal(start.status,200);assert.equal(start.data.status,'playing')
assert.equal((await call(prefix+'/join',{name:'Zu spät'})).status,400)
for(const client of clients){const r=await call(prefix,null,client.token);assert.equal(r.status,200,JSON.stringify({error:r.data,player:client.state.me}));for(const key of ['solution','hand','reveals','pending','suggestion'])assert.equal(r.data[key],undefined);assert.ok(r.data.players.every(p=>p.token===undefined&&p.hand===undefined))}
assert.equal((await call(prefix+'/action',{type:'roll'},clients[1].token)).status,400)
const rolled=await call(prefix+'/action',{type:'roll'},token);assert.equal(rolled.status,200);assert.ok(rolled.data.dice.every(n=>n>=1&&n<=6))
const moved=await call(prefix+'/action',{type:'move',target:[6,1]},token);assert.equal(moved.status,200)
for(const client of clients){const r=await call(prefix,null,client.token);assert.deepEqual(r.data.positions.ruby,[6,1]);assert.equal(r.data.phase,'move');assert.equal(r.data.remainingSteps,rolled.data.remainingSteps-1)}
const finishTarget = state => Array.from({length:361}, (_, i) => [i % 19, Math.floor(i / 19)]).find(tile => corridor(...tile) && distance(state.positions.ruby, tile) === state.remainingSteps)
assert.equal((await call(prefix+'/action',{type:'end'},token)).status,400)
const finished=await call(prefix+'/action',{type:'move',target:finishTarget(moved.data)},token)
assert.equal(finished.status,200);assert.equal(finished.data.remainingSteps,0)
for(const type of ['suggest','accuse','refute'])assert.equal((await call(prefix+'/action',{type},token)).status,400)
assert.equal((await call(prefix+'/action',{type:'end'},token)).status,200)
for(const client of clients){const r=await call(prefix,null,client.token);assert.equal(r.data.turn,1);assert.equal(r.data.phase,'roll')}
console.log('OK: 6 gleichzeitige Zugänge, Lobbygrenze, Zugangsschutz, Würfeln, Bewegung und synchroner Zugwechsel. Entfernte Spielmodule nicht verfügbar.')
const solo=await call('/rooms',{name:'Test Solo'});assert.equal(solo.status,201)
const soloPath=`/rooms/${solo.data.code}`,soloToken=solo.data.token
assert.equal((await call(soloPath+'/action',{type:'start'},soloToken)).status,200)
const soloRoll=await call(soloPath+'/action',{type:'roll'},soloToken);assert.equal(soloRoll.status,200)
assert.equal((await call(soloPath+'/action',{type:'move',target:finishTarget(soloRoll.data)},soloToken)).status,200)
const again=await call(soloPath+'/action',{type:'end'},soloToken)
assert.equal(again.data.round,2);assert.equal(again.data.turn,0);assert.equal(again.data.phase,'roll')
assert.equal((await call(soloPath+'/action',{type:'roll'},soloToken)).status,200)
console.log('OK: Solo starten, bewegen und wiederholt alleine würfeln.')
