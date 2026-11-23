import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9267);
const output=resolve('art/previews/monster-movement');
const profile=await mkdtemp(join(tmpdir(),'tvk-monster-movement-'));
await mkdir(output,{recursive:true});
const chrome=spawn(process.env.CHROME_EXE??'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--no-first-run',
  '--remote-debugging-port='+port,'--window-size=1600,1050','--user-data-dir='+profile,'about:blank',
],{stdio:'ignore',windowsHide:true});
let ws;
try {
  let target;
  for(let i=0;i<100&&!target;i++){
    try{target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(page=>page.type==='page')}catch{}
    if(!target)await sleep(100);
  }
  assert.ok(target);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
  let id=0;
  const pending=new Map(),errors=[],failed=[];
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id){const req=pending.get(m.id);pending.delete(m.id);if(req)m.error?req.fail(Error(m.error.message)):req.ok(m.result)}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
    if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!m.params.response.url.endsWith('/favicon.ico'))failed.push(m.params.response.url);
  };
  function send(method,params={}) {
    return new Promise((ok,fail)=>{pending.set(++id,{ok,fail});ws.send(JSON.stringify({id,method,params}))});
  }
  async function run(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  }
  const scene="const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');";
  const evalScene=code=>run(`(()=>{${scene}${code}})()`);
  async function ready(){
    for(let i=0;i<100;i++){if(await run('Boolean(window.__worldRebuild?.ready())'))return;await sleep(125)}
    throw Error('WorldScene not ready: '+JSON.stringify(errors));
  }
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<100;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };
  await visit('/monster-movement.html','Boolean(window.__monsterMovementLab)');
  const cases=await run("Array.from(document.querySelector('#case').options,o=>o.value)");
  const steps=[210,170,300,70,72,210,210,220,220,480,220,140];
  assert.equal(cases.length,steps.length);
  const scenarios=[];
  for(const [i,key] of cases.entries()){
    const result=await run("window.__monsterMovementLab.configure("+JSON.stringify(key)+"); window.__monsterMovementLab.advance("+steps[i]+")");
    assert.equal(result.invalidTicks,0,key);
    assert.equal(result.teleports,0,key);
    assert.equal(result.remainingOverlap,0,key);
    if(key!=='old-overlap')assert.equal(result.peakOverlap,0,key);
    if(key==='passage')assert.equal(result.arrived,10);
    if(key==='crowd')assert.equal(result.arrived,30);
    if(key==='tree')assert.equal(result.arrived,1);
    if(key==='head-on'||key==='elites')assert.equal(result.arrived,2);
    if(key==='pack')assert.equal(result.slots,5);
    if(key==='unreachable')assert.equal(result.abandoned,1);
    if(key==='return')assert.equal(result.returned,true);
    scenarios.push(result);
  }
  const otherSeeds=[];
  for(const seed of [27182,27184,27185,27186]){
    const result=await run("window.__monsterMovementLab.configure('crowd',"+seed+"); window.__monsterMovementLab.advance(480)");
    assert.equal(result.peakOverlap,0);
    assert.equal(result.invalidTicks,0);
    assert.equal(result.teleports,0);
    assert.ok(result.arrived===30&&result.abandoned===0&&result.maxTurns<=15);
    otherSeeds.push(result);
  }
  const comparison=[];
  for(const [label,old] of [['before-tree',true],['after-tree',false]]){
    await run("window.__monsterMovementLab.configure('tree',27183,"+old+"); window.__monsterMovementLab.advance(53)");
    await sleep(200);await shot(label);
    comparison.push(await run('window.__monsterMovementLab.advance(157)'));
  }
  assert.ok(comparison[0].firstArrival>comparison[1].firstArrival);
  for(const [key,ticks] of [['passage',30],['crowd',71],['shore',31]]){
    await run("window.__monsterMovementLab.configure("+JSON.stringify(key)+"); window.__monsterMovementLab.advance("+ticks+")");
    await sleep(200);await shot('stress-'+key);
  }
  await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
  await sleep(320);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'F4',code:'F4',windowsVirtualKeyCode:115});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'F4',code:'F4',windowsVirtualKeyCode:115});
  assert.equal(await run("document.querySelector('#monster-movement-debug')?.hidden"),false);
  const world=[];
  for(const species of ['wolf','boar','toad']){
    const data=await evalScene(`
      const f=s.populationWorld.environment.fauna.find(a=>a.species===${JSON.stringify(species)}&&a.alive),p=s.populationWorld;
      s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.18);s.cameras.main.centerOn(f.x,f.y);
      s.syncGroundOccupancy();
      const fauna=p.environment.fauna.filter(x=>x.alive);
      return {species:f.species,npcs:p.npcs.length,fauna:fauna.length,seed:p.population.spawnSeed,
        invalid:fauna.filter(x=>!s.monsterMovement.terrain(s.groundOccupancy.bodies.get(x.id),x.x,x.y)).map(x=>x.id),
        overlaps:s.groundOccupancy.overlaps().filter(pair=>pair.every(b=>b.actor.species)).map(pair=>pair.map(b=>b.id))};
    `);
    assert.equal(data.npcs,108);assert.equal(data.fauna,24);assert.deepEqual(data.invalid,[]);assert.deepEqual(data.overlaps,[]);
    await sleep(300);
    await shot('world-'+species);
    world.push(data);
  }
  const eliteAttack=await evalScene(`
    const w=s.populationWorld,e=w.environment,hunter=w.npcs.find(n=>n.alive&&n.populationRole==='hunter');
    s.syncGroundOccupancy();
    for(const beast of e.fauna.filter(f=>f.alive&&f.species==='wolf'&&f.rank==='elite')){
      const body=s.groundOccupancy.bodies.get(beast.id);
      const zone=s.faunaZones.find(z=>z.zoneId===beast.zoneId);
      const point=[[-65,0],[65,0],[0,65],[0,-65],[-49,-49],[49,49]].map(([dx,dy])=>({x:beast.x+dx,y:beast.y+dy}))
        .find(p=>p.x>zone.x+15&&p.x<zone.x+zone.width-15&&p.y>zone.y+15&&p.y<zone.y+zone.height-15&&
          s.groundPositionOpen(hunter,p.x,p.y)&&s.monsterMovement.line(body,beast,p));
      if(!point)continue;
      const initialHp=hunter.hp;
      Object.assign(hunter,point);
      Object.assign(beast,{state:'chase',targetNpcId:hunter.id,cast:undefined,cooldowns:{},attackReadyAt:0,nextThinkAt:0});
      s.syncGroundOccupancy();s.tickFauna(50);
      const skill=beast.cast?.skillId;
      for(let i=0;i<22;i++)s.tickFauna(50);
      s.setZoom(1.18);s.cameras.main.centerOn(beast.x,beast.y);
      return {id:beast.id,skill,initialHp,endHp:hunter.hp,valid:s.monsterMovement.terrain(body,beast.x,beast.y)};
    }
  `);
  assert.ok(eliteAttack?.valid&&eliteAttack.skill==='phantom-pounce'&&eliteAttack.initialHp>eliteAttack.endHp,JSON.stringify(eliteAttack));
  await sleep(95);await shot('world-elite-pounce');
  const respawn=await evalScene(`
    const w=s.populationWorld,e=w.environment,f=e.fauna.find(a=>a.alive&&a.species==='wolf'&&a.rank==='normal');
    const hunter=w.npcs.find(n=>n.alive&&n.populationRole==='hunter'),ids=new Set(e.fauna.map(a=>a.id));
    const h=s.applyFaunaDamage(f,hunter,f.hp+100,'test-movement-respawn');
    const request=e.faunaRespawns.find(q=>q.sourceDeathId===f.id),dropIds=e.drops.filter(d=>d.sourceId===f.id).map(d=>d.id);
    if(!request)return {killed:h.killed,request:false};
    while(e.faunaClockMs<request.dueAtMs+1500){e.faunaClockMs+=500;s.tickFaunaRespawns(500);}
    s.persistPopulation();
    const next=e.fauna.find(a=>a.alive&&a.zoneId===f.zoneId&&!ids.has(a.id));
    return {oldId:f.id,next:next?.id,zone:f.zoneId,nextSpecies:next?.species,killed:!f.alive,
      queued:e.faunaRespawns.some(q=>q.sourceDeathId===f.id),
      valid:!!next&&s.monsterMovement.terrain(s.groundOccupancy.bodies.get(next.id),next.x,next.y),dropIds};
  `);
  assert.ok(respawn.killed&&respawn.valid&&respawn.next&&!respawn.queued&&respawn.dropIds.length,JSON.stringify(respawn));
  await send('Page.reload',{ignoreCache:true});await ready();
  const persisted=await evalScene(`
    const e=s.populationWorld.environment,original=${JSON.stringify(respawn)};
    return {newAlive:e.fauna.some(a=>a.id===original.next&&a.alive),oldAlive:e.fauna.some(a=>a.id===original.oldId&&a.alive),
      repeated:e.faunaRespawns.some(q=>q.sourceDeathId===original.oldId),
      dropIds:e.drops.filter(d=>d.sourceId===original.oldId).map(d=>d.id)};
  `);
  assert.deepEqual(persisted,{newAlive:true,oldAlive:false,repeated:false,dropIds:respawn.dropIds});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(join(output,'verification.json'),JSON.stringify({scenarios,otherSeeds,comparison,world,eliteAttack,respawn,persisted,errors,failed},null,2));
  console.log(JSON.stringify({cases:scenarios.map(({debug,...r})=>r),world,eliteAttack,respawn,persisted}));
}finally{ws?.close();chrome.kill();}
