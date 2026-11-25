import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9378);
const output=resolve('art/previews/west-treasures');
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


  if(process.env.PERF_LABEL){
    await evalScene(`s.gotoRegion('west-poison',false);s.setZoom(.35);s.cameras.main.centerOn(-2050,2840);s.clampCamera();return true;`);
    await sleep(2200);
    const perf=await run(`new Promise(done=>{const t=[];let previous;const sample=now=>{if(previous)t.push(now-previous);previous=now;
      if(t.length<180)requestAnimationFrame(sample);else { t.sort((a,b)=>a-b);done({fps:1000/(t.reduce((a,b)=>a+b,0)/t.length),p95:t[170]}); }};requestAnimationFrame(sample);})`);
    const alive=await evalScene(`return s.getFaunaState().alive;`);
    await writeFile(join(output,(process.env.PERF_LABEL??'before')+'.json'),JSON.stringify({perf,alive},null,2));
    await shot(process.env.PERF_LABEL??'before');
    console.log({perf,alive});
  }else{
  const examine=code=>evalScene('const w=s.populationWorld,t=s.westTreasures,sys=t.system,env=w.environment;'+code);
  const census=await examine(`
    w.clock.paused=true;
    const west=s.faunaZones.filter(z=>z.spread);
    const fauna=env.fauna.filter(f=>f.alive);
    const zones=Object.fromEntries(west.map(z=>[z.zoneId,fauna.filter(f=>f.zoneId===z.zoneId).length]));
    const guarded=sys.nodes.filter(n=>n.guardSpecies);
    return {zones,count:fauna.length,flower:fauna.filter(f=>f.species==='flower').length,nodes:sys.nodes.length,guarded:guarded.length,
      types:new Set(sys.nodes.map(n=>n.itemId)).size,guardLinks:guarded.every(n=>sys.guardian(n)),
      open:sys.nodes.every(n=>!s.monsterWater(n.x,n.y,5,5)&&s.canOccupy(n.x,n.y)),
      route:s.findNavigationPath('gate-west','west-forbidden')?.length};
  `);
  assert.deepEqual(census.zones,{'west-outer':10,'west-inner':10,'west-poison':10,'west-ancient':8,'west-forbidden':7});
  assert.deepEqual([census.count,census.flower,census.nodes,census.types],[77,3,30,15]);
  assert.ok(census.guarded>0&&census.guarded<30&&census.guardLinks&&census.open&&census.route>0,JSON.stringify(census));
  await examine(`s.cameraTween?.stop();s.cameras.main.setZoom(.177).centerOn(-2048,2912);s.clampCamera();return true;`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'F3',code:'F3',windowsVirtualKeyCode:114});
  await sleep(185);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'F3',code:'F3',windowsVirtualKeyCode:114});
  assert.equal(await examine('return t.overlay.visible;'),true);
  await shot('west-overview');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'F3',code:'F3',windowsVirtualKeyCode:114});
  await sleep(135);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'F3',code:'F3',windowsVirtualKeyCode:114});
  assert.equal(await examine('return t.overlay.visible;'),false);
  const setup=await examine(`
    const node=sys.nodes.find(n=>n.guardSpecies&&sys.guardian(n));
    const guard=sys.guardian(node),n=w.npcs.find(n=>n.equippedWeapon==='iron_dao');
    Object.assign(n,{x:node.x,y:node.y});s.npcSprites.get(n.id).setPosition(n.x,n.y);s.syncGroundOccupancy();
    node.plantedAt=env.faunaClockMs-500000;
    s.selectNPC(n.id);s.beginPossession();s.cameraTween?.stop();s.cameras.main.setZoom(1.35).centerOn(node.x,node.y-14);s.clampCamera();
    t.visuals(true);
    return {id:node.id,npc:n.id,item:node.itemId,guard:guard.id,plantTexture:t.sprites.get(node.id).plant.texture.key,pos:{x:node.x,y:node.y}};
  `);
  assert.equal(setup.plantTexture,'west-treasure');
  await sleep(210);await shot('guarded-treasure');
  const tapE=async()=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE',windowsVirtualKeyCode:69});
    await sleep(95);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE',windowsVirtualKeyCode:69});
    await sleep(60);
  };
  await tapE();await tapE();
  const collected=await examine(`
    const n=w.npcs.find(n=>n.id===${JSON.stringify(setup.npc)}),node=sys.nodes.find(n=>n.id===${JSON.stringify(setup.id)});
    return {possessed:s.possessedNpcId,item:n.inventory.find(i=>i.itemId===node.itemId)?.count??0,status:node.harvestedAt,
      eventCount:w.events.filter(e=>e.targetId===node.id&&e.type==='west-treasure-harvested').length,guardian:sys.guardian(node)?.alive};
  `);
  assert.equal(collected.possessed,setup.npc);assert.equal(collected.item,1);assert.equal(collected.eventCount,1);assert.ok(collected.guardian);
  await visit('/?testMode=1',ready);
  const saved=await examine(`
    const n=w.npcs.find(n=>n.id===${JSON.stringify(setup.npc)}),node=sys.nodes.find(n=>n.id===${JSON.stringify(setup.id)});
    const repeat=t.harvest(n,node);
    const onFailure=() => {
      const sample=sys.nodes.find(candidate=>candidate.harvestedAt===undefined);
      sample.plantedAt=env.faunaClockMs-500000;
      const probe={...n,x:sample.x,y:sample.y,inventory:[]};
      const rejected=sys.harvest(probe,sample,env.faunaClockMs,()=>true,()=>false);
      return {rejected:!rejected,inventory:probe.inventory.length,plantAvailable:sample.harvestedAt===undefined,
        recorded:w.events.some(e=>e.targetId===sample.id&&e.actorId===n.id)};
    };
    const failedSave=onFailure();
    const unchanged={x:node.x,y:node.y,claimedBy:node.claimedBy,item:n.inventory.find(i=>i.itemId===node.itemId)?.count};
    const regrown=sys.update((node.harvestedAt??0)+1000000);
    return {repeat,failedSave,unchanged,regrown,cycle:node.cycle,moved:Math.hypot(node.x-unchanged.x,node.y-unchanged.y)};
  `);
  assert.deepEqual(saved.unchanged,{...setup.pos,claimedBy:setup.npc,item:1});
  assert.deepEqual(saved.failedSave,{rejected:true,inventory:0,plantAvailable:true,recorded:false});
  assert.ok(!saved.repeat&&saved.regrown&&saved.cycle===1&&saved.moved>=38);
  const npcCases=await examine(`
    w.clock.paused=true;
    const n=w.npcs.find(n=>n.alive&&n.populationRole==='hunter'&&n.id!==s.possessedNpcId);
    const reset=()=>{Object.assign(n,{alive:true,hp:10000,mp:10000,hunger:12,fatigue:0,realmIndex:4,realmLevel:8,goalAction:'idle',action:'idle',
      decisionSlot:undefined,faunaHuntTargetId:undefined,assignedMissionId:undefined,assignedCommissionId:undefined,marketVisit:undefined,lawResponse:undefined,
      tribulation:undefined,wallLevel:undefined,westPoison:0,meditationSpot:undefined,manualMeditation:undefined,flight:undefined,skyStep:undefined});
      t.jobs.clear();t.retry.clear();t.nextTick=0; };
    const move=p=>{n.x=p.x;n.y=p.y;s.npcSprites.get(n.id).setPosition(n.x,n.y);s.syncGroundOccupancy();};
    reset();
    const natural=sys.nodes.find(n=>!n.guardSpecies&&n.harvestedAt===undefined);
    natural.plantedAt=env.faunaClockMs-500000;
    const start=Array.from({length:12},(_,i)=>({x:natural.x+Math.cos(i*Math.PI/6)*70,y:natural.y+Math.sin(i*Math.PI/6)*70}))
      .find(p=>s.canOccupy(p.x,p.y)&&s.monsterLine(p,natural)&&s.canReachPoint(p,natural));
    if(!start)return {error:'fixture-no-approach'};
    move(start);t.tick();
    w.clock.paused=false;
    for(let step=0;step<70&&natural.claimedBy!==n.id;step++)s.updatePopulation(s.time.now,100);
    w.clock.paused=true;
    const automatic=natural.claimedBy===n.id;
    const walkDistance=Math.hypot(start.x-n.x,start.y-n.y);
    reset();
    const node=sys.nodes.find(n=>n.guardSpecies&&sys.guardian(n)&&n.harvestedAt===undefined);
    const guard=sys.guardian(node);node.plantedAt=env.faunaClockMs-500000;
    const point=[[-25,0],[25,0],[0,-25],[0,25]].map(([dx,dy])=>({x:guard.x+dx,y:guard.y+dy})).find(p=>s.canOccupy(p.x,p.y)&&s.monsterLine(p,guard));
    if(!point)return {automatic,error:'fixture-no-position'};
    guard.state='idle';guard.targetNpcId=n.id;move(point);
    const before=guard.hp;
    const job={node,until:t.now+16000,cooldown:0,phase:'approach'};t.jobs.set(n.id,job);t.advance(n,job);
    const combat={fought:guard.hp<before,phase:job.phase};
    reset();n.realmIndex=0;n.realmLevel=1;n.hp=6;n.mp=5;move(point);guard.targetNpcId=n.id;
    const fleeJob={node,until:t.now+16000,cooldown:0,phase:'approach'};t.jobs.set(n.id,fleeJob);t.advance(n,fleeJob);
    return {automatic,walkDistance,combat,retreat:n.goalAction==='flee'&&fleeJob.phase==='retreat',stillUnclaimed:node.harvestedAt===undefined};
  `);
  assert.ok(npcCases.automatic&&npcCases.walkDistance>32&&npcCases.combat?.fought&&npcCases.retreat&&npcCases.stillUnclaimed,JSON.stringify(npcCases));
  const speeds=await examine(`
    const control=document.querySelector('#world-clock-speed');
    const set=value=>{control.value=value;control.dispatchEvent(new Event('change'));};
    const samples=['0','1','2','4'].map(value=>{set(value);const at=t.now;s.updatePopulation(s.time.now,100);return t.now-at;});set('0');return samples;
  `);
  assert.deepEqual(speeds,[0,100,200,400]);
  const medicine=await examine(`
    const venue=s.merchants.shops.get('city-apothecary'), {shop,owner,position}=venue;
    w.clock.minute=720;
    Object.assign(owner,position,{goalAction:'work',action:'work',decisionSlot:'shop-shift:'+shop.id,alive:true,flight:undefined,
      hunger:0,fatigue:0,safety:100,mp:1000,hp:1000,marketVisit:undefined,lawResponse:undefined,manualMeditation:undefined});
    shop.stock=[{itemId:'millennial_spirit_ginseng',count:1}];
    const price=shop.buyPrices.millennial_spirit_ginseng;
    s.merchants.tick((s.merchants.next??0)+1000);
    return {material:shop.stock.find(i=>i.itemId==='millennial_spirit_ginseng')?.count??0,
      remedy:shop.stock.find(i=>i.itemId==='healing_pill')?.count??0,price};
  `);
  assert.deepEqual(medicine,{material:0,remedy:2,price:125});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const result={census,setup,collected,saved,npcCases,speeds,medicine};
  await writeFile(join(output,'validation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  }
}finally{ws?.close();chrome.kill()}
