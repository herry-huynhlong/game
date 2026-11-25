import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9372);
const output=resolve('art/previews/fauna-ecology');
const profile=await mkdtemp(join(tmpdir(),'tvk-resident-profile-'));
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

  const ready="Boolean(window.__worldRebuild?.ready())";


  await visit('/?testMode=1',ready);
  const flower="const w=s.populationWorld, f=w.environment.fauna.find(a=>a.species==='flower'&&a.alive), z=s.faunaTerritories.find(h=>h.species==='flower');";
  const examine=code=>evalScene(flower+code);
  const census=await examine(`
    w.clock.paused=true;w.clock.minute=1240;
    const live=w.environment.fauna.filter(a=>a.alive);const west=live.filter(a=>a.zoneId.startsWith('west-'));
    const within=west.every(a=>{const h=s.faunaTerritories.find(o=>o.species===a.species&&o.zoneId===a.zoneId);return h&&a.x>=h.x&&a.x<h.x+h.width&&a.y>=h.y&&a.y<h.y+h.height;});
    s.cameraTween?.stop();s.cameras.main.setZoom(1.55).centerOn(f.x,f.y);s.clampCamera();
    const before={x:f.x,y:f.y};s.tickFauna(700);
    return {living:live.length,west:west.length,territories:s.faunaTerritories.length,within,phase:f.flower?.phase,
      before,after:{x:f.x,y:f.y},route:s.findNavigationPath('gate-west','west-poison')?.length};
  `);
  assert.deepEqual([census.living,census.west,census.territories,census.within,census.phase],[77,45,20,true,'rooted']);
  assert.deepEqual(census.before,census.after);
  assert.ok(census.route>0);
  await sleep(480);await shot('rooted');
  const actor=await examine(`
    const n=w.npcs.find(a=>a.equippedWeapon==='iron_dao')??w.npcs.find(a=>a.equippedWeapon==='iron_sword');
    const before={x:n.x,y:n.y};
    s.selectNPC(n.id);s.beginPossession();
    return {id:n.id,home:before,active:s.possessedNpcId};
  `);
  assert.equal(actor.id,actor.active);
  const near=await examine(`
    const npc=w.npcs.find(n=>n.id===s.possessedNpcId),body=s.groundOccupancy.bodies.get(f.id);
    const pts=[90,80,69,59].flatMap(length=>Array.from({length:16},(_,i)=>({x:f.x+Math.cos(i*Math.PI/8)*length,y:f.y+Math.sin(i*Math.PI/8)*length})));
    const point=pts.find(p=>s.footprintTerrainOpen(p.x,p.y,8,4)&&s.clearFaunaLine(f,p)&&s.monsterMovement.terrain(body,p.x,p.y));
    if(!point)return null;
    Object.assign(npc,point);s.npcSprites.get(npc.id).setPosition(npc.x,npc.y);s.syncGroundOccupancy();
    f.attackReadyAt=w.environment.faunaClockMs+8000;
    s.tickFauna(650);return {point,phase:f.flower.phase,clock:w.environment.faunaClockMs,at:f.flower.at};
  `);
  assert.equal(near?.phase,'waking');
  const pause=await examine(`
    s.cameraFollowSuspended=true;s.cameraTween?.stop();s.cameras.main.setZoom(1.38).centerOn(f.x,f.y);s.clampCamera();
    const before=w.environment.faunaClockMs;s.updatePopulation(s.time.now,100);s.persistPopulation();
    return {delta:w.environment.faunaClockMs-before,phase:f.flower.phase,id:f.id};
  `);
  assert.deepEqual([pause.delta,pause.phase],[0,'waking']);
  await sleep(380);await shot('awakening');
  await visit('/?testMode=1',ready);
  const restored=await examine(`return {phase:f.flower.phase,at:f.flower.at,id:f.id,clock:w.environment.faunaClockMs,possessed:s.possessedNpcId};`);
  assert.deepEqual(restored,{phase:'waking',at:near.at,id:pause.id,clock:near.clock,possessed:actor.id});
  const moveVisitor=point=>`
    const n=w.npcs.find(n=>n.id===s.possessedNpcId);Object.assign(n,${JSON.stringify(point)});
    s.npcSprites.get(n.id).setPosition(n.x,n.y);s.syncGroundOccupancy();
  `;
  const cancelled=await examine(moveVisitor(actor.home)+"s.tickFauna(400);return f.flower.phase;");
  assert.equal(cancelled,'rooted');
  const mobile=await examine(moveVisitor(near.point)+`
    s.cameraFollowSuspended=true;s.cameraTween?.stop();s.cameras.main.setZoom(1.38).centerOn(f.x,f.y);s.clampCamera();
    const original={x:f.x,y:f.y};s.tickFauna(2550);
    return {phase:f.flower.phase,travel:Math.hypot(f.x-original.x,f.y-original.y),inside:s.monsterMovement.terrain(s.groundOccupancy.bodies.get(f.id),f.x,f.y)};
  `);
  assert.equal(mobile.phase,'mobile');
  assert.ok(mobile.travel>4&&mobile.inside);
  await sleep(380);await shot('mobile');
  const down=await examine(moveVisitor(actor.home)+"s.tickFauna(3800);return {phase:f.flower.phase,distance:Math.hypot(f.x-f.home.x,f.y-f.home.y)};");
  assert.equal(down.phase,'rooted');assert.ok(down.distance<9);
  const respawn=await examine(`
    const hunter=w.npcs.find(n=>n.id===s.possessedNpcId);
    const {drops}=s.applyFaunaDamage(f,hunter,10000,'ecology-preview:kill');
    const job=w.environment.faunaRespawns.find(r=>r.sourceDeathId===f.id);
    const wasDead=!f.alive,delay=job.dueAtMs-w.environment.faunaClockMs;
    w.environment.faunaClockMs=job.dueAtMs;s.tickFaunaRespawns(500);s.tickFauna(300);
    const fresh=w.environment.fauna.filter(a=>a.species==='flower'&&a.alive).at(-1);
    return {wasDead,delay,newId:fresh.id!==f.id,phase:fresh.flower.phase,loot:drops[0].itemId,count:w.environment.fauna.filter(a=>a.alive).length};
  `);
  assert.deepEqual(respawn,{wasDead:true,delay:75000,newId:true,phase:'rooted',loot:'flower_stamen',count:77});
  const speeds=await examine(`
    const control=document.querySelector('#world-clock-speed');
    const setSpeed=value=>{control.value=value;control.dispatchEvent(new Event('change'));};
    const elapsed=['0','1','2','4'].map(value=>{
      setSpeed(value);const before=w.environment.faunaClockMs;
      s.updatePopulation(s.time.now,100);return w.environment.faunaClockMs-before;
    });
    setSpeed('0');return elapsed;
  `);
  assert.deepEqual(speeds,[0,100,200,400]);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const result={census,near,pause,restored,cancelled,mobile,down,respawn,speeds};
  await writeFile(join(output,'world-test.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{ws?.close();chrome.kill()}
