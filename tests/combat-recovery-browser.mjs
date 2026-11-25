import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9384);
const output=resolve('art/previews/combat-recovery');
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




  const ask=code=>evalScene('const w=s.populationWorld,env=w.environment;'+code);
  const initial=await ask(`
    w.clock.paused=true;
    const f=env.fauna.find(f=>f.species==='flower'),tree=env.fauna.find(f=>f.species==='millennial');
    const visitor=w.npcs.find(n=>n.alive&&n.populationRole==='hunter');
    const rest=w.npcs.find(n=>n.alive&&n.populationRole==='commoner'&&s.monsterSafe(n));
    return {flower:f.id,tree:tree.id,visitor:visitor.id,rest:rest.id};
  `);
  const fixture=`
    const f=env.fauna.find(a=>a.id===${JSON.stringify(initial.flower)}),n=w.npcs.find(a=>a.id===${JSON.stringify(initial.visitor)});
    const rest=w.npcs.find(a=>a.id===${JSON.stringify(initial.rest)});
    const tree=env.fauna.find(a=>a.id===${JSON.stringify(initial.tree)});
    const place=(actor,p)=>{Object.assign(actor,p);s.npcSprites.get(actor.id).setPosition(p.x,p.y);s.syncGroundOccupancy();};
    const nextTo=(beast,actor)=>[86,78,68,45,38].flatMap(r=>Array.from({length:16},(_,i)=>({x:beast.x+Math.cos(i*Math.PI/8)*r,y:beast.y+Math.sin(i*Math.PI/8)*r})))
      .find(p=>s.groundPositionOpen(actor,p.x,p.y)&&s.monsterLine(beast,p)&&s.monsterMovement.terrain(s.groundOccupancy.bodies.get(beast.id),p.x,p.y));
    const safe=s.markerRegion('city');
  `;
  const trial=code=>ask(fixture+code);
  const npcRest=await trial(`
    const max=s.recovery.status(rest).maximum;
    rest.hp=max*.37;rest.goalAction='idle';rest.action='idle';rest.inventory=rest.inventory.filter(i=>i.itemId!=='healing_pill');
    rest.inventory.push({itemId:'healing_pill',count:1});
    rest.combatHealth={lastTakenAt:env.faunaClockMs};
    s.tickFauna(400);
    const first={hp:rest.hp,phase:rest.convalescence?.phase,remaining:rest.inventory.find(i=>i.itemId==='healing_pill')?.count??0};
    s.tickFauna(7600);
    const before=rest.hp;
    s.tickFauna(4200);
    const after=rest.hp;
    s.selectNPC(rest.id);
    return {max,first,before,after,phase:rest.convalescence?.phase??null,text:document.querySelector('[data-profile="recovery"]').textContent};
  `);
  assert.equal(npcRest.first.phase,'resting');
  assert.equal(npcRest.first.remaining,0);
  assert.ok(npcRest.first.hp>=npcRest.max*.71&&npcRest.before===npcRest.first.hp&&npcRest.after>npcRest.before&&npcRest.phase===null,JSON.stringify(npcRest));
  assert.ok(npcRest.text.includes('Sinh lực'));
  const retreat=await trial(`
    const p=nextTo(f,n);
    if(!p)return null;
    const max=s.recovery.status(n).maximum;
    n.hp=max*.19;n.convalescence=undefined;
    place(n,p);f.targetNpcId=n.id;
    s.tickFauna(450);
    const a=n.actionTarget;
    return {action:n.goalAction,phase:n.convalescence?.phase,delta:Math.hypot(a.x-n.x,a.y-n.y),underPursuit:s.recovery.status(n).engaged};
  `);
  assert.deepEqual([retreat?.phase,retreat?.action,retreat?.underPursuit],['escaping','flee',true],JSON.stringify(retreat));
  assert.ok(retreat.delta>20);
  const awakened=await trial(`
    const p=nextTo(f,n);
    if(!p)return null;
    n.hp=s.recovery.status(n).maximum;n.convalescence=undefined;n.goalAction='idle';n.action='idle';
    place(n,p);f.attackReadyAt=env.faunaClockMs+10000;
    const before=f.hp;const hit=s.applyFaunaDamage(f,n,40,'recovery:flower-hit');
    s.tickFauna(2400);
    s.inspector.select({kind:'fauna',id:f.id});s.inspector.locate();
    return {before,hp:f.hp,phase:f.flower.phase,box:s.groundOccupancy.bodies.get(f.id).width,state:f.state,id:f.id,hit:hit.ok};
  `);
  assert.ok(awakened?.hit&&awakened.hp<awakened.before);
  assert.equal(awakened.phase,'mobile');assert.ok(awakened.box>=22);
  await sleep(495);await shot('flower-combat');
  const interrupted=await trial(`
    place(n,safe);
    for(let i=0;i<100&&f.flower.phase!=='rooting';i++)s.tickFauna(50);
    const form=f.flower.phase,hp=f.hp;
    const p=nextTo(f,n);
    if(!p)return null;
    place(n,p);s.tickFauna(450);
    return {form,phase:f.flower.phase,hp,before:f.hp,focus:f.targetNpcId};
  `);
  assert.equal(interrupted?.form,'rooting');
  assert.ok(['waking','mobile'].includes(interrupted.phase)&&interrupted.focus===initial.visitor&&interrupted.hp===interrupted.before);
  const mortality=await trial(`
    for(let i=0;i<35&&f.flower.phase!=='mobile';i++)s.tickFauna(50);
    const fighting=f.flower.phase;
    const real=f.hp;
    s.monsterHitNpc(n,50000,f.id,'recovery:npc-down');
    s.syncGroundOccupancy();
    for(let i=0;i<130&&f.flower.phase!=='rooting';i++)s.tickFauna(50);
    const hp=f.hp,point={x:f.x,y:f.y},form=f.flower.phase;
    s.persistPopulation();
    return {f:f.id,npcAlive:n.alive,hp,point,form,before:real,fighting};
  `);
  assert.deepEqual([mortality.fighting,mortality.npcAlive,mortality.form],['mobile',false,'rooting']);
  assert.equal(mortality.hp,mortality.before);
  await visit('/?testMode=1&region=west-poison',ready);
  const restored=await trial(`
    const before={id:f.id,hp:f.hp,phase:f.flower.phase,x:f.x,y:f.y};
    s.tickFauna(1450);
    const rooted={phase:f.flower.phase,hp:f.hp,footprint:s.groundOccupancy.bodies.get(f.id).width};
    s.tickFauna(9800);
    s.inspector.select({kind:'fauna',id:f.id});s.inspector.locate();
    return {before,rooted,healed:f.hp,text:document.querySelector('[data-fields]').textContent};
  `);
  assert.deepEqual(restored.before,{id:mortality.f,hp:mortality.hp,phase:'rooting',...mortality.point});
  assert.deepEqual(restored.rooted,{phase:'rooted',hp:mortality.hp,footprint:16});
  assert.ok(restored.healed>mortality.hp&&restored.text.includes('2,5%'),JSON.stringify(restored));
  await sleep(495);await shot('flower-healing');
  const blocked=await trial(`
    const actor=w.npcs.find(a=>a.alive&&a.populationRole==='hunter');
    const p=nextTo(f,actor);
    if(!p)return null;
    actor.hp=s.recovery.status(actor).maximum;place(actor,p);
    f.attackReadyAt=env.faunaClockMs+9000;s.tickFauna(2750);
    const mobile=f.flower.phase, start={x:f.x,y:f.y},home={...f.home};
    const movement=s.monsterMovement, route=movement.route;
    movement.route=function(a,...args){return a===f&&a.recovery?.phase==='returning'?'unreachable':route.call(this,a,...args);};
    place(actor,safe);
    try{s.tickFauna(2500);}finally{movement.route=route;}
    return {mobile,phase:f.flower.phase,home,position:{x:f.x,y:f.y},start,homePreserved:f.home.x===home.x&&f.home.y===home.y};
  `);
  assert.equal(blocked?.mobile,'mobile');
  assert.deepEqual([blocked.phase,blocked.homePreserved,blocked.position],['rooted',true,blocked.start],JSON.stringify(blocked));
  const trees=await trial(`
    const actor=w.npcs.find(a=>a.alive&&a.populationRole==='independent_cultivator');
    const p=nextTo(tree,actor);
    if(!p)return null;
    actor.hp=s.recovery.status(actor).maximum;place(actor,p);
    s.applyFaunaDamage(tree,actor,44,'recovery:tree');
    const hurt=tree.hp;tree.attackReadyAt=env.faunaClockMs+10000;
    s.tickFauna(2750);
    const active=tree.growth.phase;
    place(actor,safe);s.tickFauna(4450);
    const returned=tree.growth.phase,hp=tree.hp;
    s.tickFauna(10500);
    return {active,returned,hurt,hp,healed:tree.hp,max:tree.maxHp};
  `);
  assert.deepEqual([trees?.active,trees?.returned],['active','dormant']);
  assert.equal(trees.hp,trees.hurt);assert.ok(trees.healed>trees.hp&&trees.healed<=trees.max,JSON.stringify(trees));
  const speeds=await trial(`
    const ui=document.querySelector('#world-clock-speed');
    const set=value=>{ui.value=value;ui.dispatchEvent(new Event('change'));};
    const values=['0','1','2','4'].map(v=>{
      set(v);const at=env.faunaClockMs;s.updatePopulation(s.time.now,100);return env.faunaClockMs-at;
    });
    set('0');return values;
  `);
  assert.deepEqual(speeds,[0,100,200,400]);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const result={npcRest,retreat,awakened,interrupted,mortality,restored,blocked,trees,speeds};
  await writeFile(join(output,'validation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{ws?.close();chrome.kill()}
