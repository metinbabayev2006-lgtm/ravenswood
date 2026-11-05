import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeRoom, join, act, view } from './game.js'
import { PEOPLE, ROOMS, distance } from '../shared/game.js'
const game=(n=3)=>{const r=makeRoom('ABC234');for(let i=0;i<n;i++)join(r,`Gast ${i}`);act(r,r.players[0].token,{type:'start'});return r}
test('Sophie: Lobbygrenze, eindeutige Namen/Figuren und Gastgeber',()=>{
  const r=makeRoom('ABC234'),a=join(r,'Matin')
  assert.equal(r.status,'lobby')
  assert.throws(()=>join(r,'matin'),/vergeben/)
  const b=join(r,'Sophie')
  assert.throws(()=>act(r,b.token,{type:'start'}),/Gastgeber/)
  assert.throws(()=>act(r,b.token,{type:'character',character:a.character}),/vergeben/)
  act(r,a.token,{type:'character',character:'ivory'});assert.equal(r.players[0].character,'ivory')
  for(let i=2;i<6;i++)join(r,`Gast ${i}`)
  assert.equal(new Set(r.players.map(p=>p.character)).size,6)
  assert.throws(()=>join(r,'Siebte'),/voll/)
})
test('Sophie: 1–6 Menschen starten, persönliche Tokens bleiben geheim',()=>{
  for(let n=1;n<=6;n++){
    const r=game(n),v=view(r,r.players[0].token)
    assert.equal(v.status,'playing');assert.equal(v.players.length,n)
    assert.equal(Object.keys(v.positions).length,6)
    assert.ok(v.players.every(p=>p.token===undefined))
    for(const field of ['solution','hand','reveals','pending','suggestion'])assert.equal(v[field],undefined)
    assert.throws(()=>view(r,'falsch'),/ungültig/)
    assert.throws(()=>join(r,'Zu spät'),/begonnen/)
  }
})
test('Matin: nur aktuelle Person würfelt einmal, nur erreichbare Ziele erlaubt',()=>{
  const r=game(),[a,b]=r.players
  assert.throws(()=>act(r,b.token,{type:'roll'}),/nicht am Zug/)
  assert.throws(()=>act(r,a.token,{type:'move',target:'kitchen'}),/Würfle/)
  act(r,a.token,{type:'roll'});assert.ok(r.dice.every(n=>n>=1&&n<=6))
  assert.throws(()=>act(r,a.token,{type:'roll'}),/bereits/)
  assert.throws(()=>act(r,a.token,{type:'move',target:[0,0]}),/nicht erreichbar/)
  assert.throws(()=>act(r,a.token,{type:'move',target:'study'}),/weit/)
  act(r,a.token,{type:'move',target:[6,1]});assert.equal(r.phase,'action')
  assert.throws(()=>act(r,a.token,{type:'move',target:[6,2]}),/Würfle/)
})
test('Matin: Zimmerzutritt mit exakter Schrittzahl und Geheimgang',()=>{
  const r=game(),a=r.players[0]
  r.positions[a.character]=[5,5];r.dice=[1,1];r.phase='move'
  assert.equal(distance([5,5],'kitchen'),2)
  act(r,a.token,{type:'move',target:'kitchen'})
  assert.equal(r.positions[a.character],'kitchen');assert.equal(r.phase,'action')
  act(r,a.token,{type:'end'});for(let i=1;i<r.players.length;i++)act(r,r.players[i].token,{type:'end'})
  assert.equal(r.round,2)
  act(r,a.token,{type:'passage'});assert.equal(r.positions[a.character],'study')
  for(const room of ROOMS)assert.ok(Number.isFinite(distance([6,0],room.id)))
})
test('Nur Matin und Sophie: entfernte Aktionen sind nicht verfügbar',()=>{
  const r=game(),token=r.players[0].token
  for(const type of ['suggest','accuse','refute'])assert.throws(()=>act(r,token,{type}),/gehört nicht/)
})
test('Bestehende Räume und Zugänge bleiben nutzbar; alte Module verschwinden',()=>{
  const r=game(),a=r.players[0]
  delete r.schema;r.solution=['ruby','rope','kitchen'];r.pending={responder:a.id};r.phase='respond';a.hand=['dagger'];a.reveals=[{card:'ruby'}];a.eliminated=true
  const v=view(r,a.token);assert.equal(v.phase,'roll');assert.equal(v.me,a.id);assert.equal(v.code,'ABC234')
  assert.equal(v.solution,undefined);assert.equal(v.players[0].hand,undefined);assert.equal(v.players[0].reveals,undefined)
  act(r,a.token,{type:'roll'});assert.equal(r.schema,'movement-v1');assert.equal(r.solution,undefined);assert.equal(r.pending,undefined)
  assert.ok(r.players.every(p=>p.hand===undefined&&p.eliminated===undefined))
})

test('Solo: würfeln, ziehen und einen weiteren eigenen Zug beginnen',()=>{
  const r=game(1),p=r.players[0]
  act(r,p.token,{type:'roll'})
  act(r,p.token,{type:'move',target:[6,1]})
  act(r,p.token,{type:'end'})
  assert.equal(r.turn,0);assert.equal(r.round,2);assert.equal(r.phase,'roll')
  act(r,p.token,{type:'roll'});assert.equal(r.phase,'move')
})
test('Wegvorschau: Türen, kürzeste Flurwege und Server-Schrittzahl stimmen überein',async()=>{
  const {corridorPath,corridor}=await import('../shared/game.js')
  const starts=[[6,0],[5,5],...ROOMS.map(r=>r.id)]
  const targets=[[6,1],[9,6],...ROOMS.map(r=>r.id)]
  for(const from of starts)for(const to of targets){
    const route=corridorPath(from,to)
    assert.ok(route.length)
    for(const tile of route)assert.ok(corridor(...tile))
    for(let i=1;i<route.length;i++)assert.equal(Math.abs(route[i][0]-route[i-1][0])+Math.abs(route[i][1]-route[i-1][1]),1)
    assert.equal(route.length-1+(typeof from==='string'?1:0)+(typeof to==='string'?1:0),distance(from,to))
  }
  assert.deepEqual(corridorPath([0,0],[6,1]),[])
  assert.deepEqual(corridorPath('unbekannt','kitchen'),[])
})
