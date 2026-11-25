import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9402);
const output=resolve('art/previews/nhan-gian-yen-hoa');
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
    for(let i=0;i<240;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };

  const ready="Boolean(window.__worldRebuild?.ready())";


  await visit('/?testMode=1',ready);




  const ask=code=>evalScene('const w=s.populationWorld,env=w.environment;'+code);
  const fixture=await ask(`
    const o=s.society,ex=s.expeditions,tea=o.places.get('tea'),clinic=o.places.get('clinic');
    w.clock.paused=true;w.clock.minute=642;
    const partyPeople=w.npcs.filter(n=>['hunter','independent_cultivator'].includes(n.populationRole)).slice(0,3);
    const patient=w.npcs.find(n=>n.populationRole==='commoner'&&!o.staffIds.has(n.id));
    const place=(n,p)=>{Object.assign(n,{x:p.x,y:p.y});s.npcSprites.get(n.id).setPosition(p.x,p.y);};
    s.socialFixture={partyPeople:partyPeople.map(n=>n.id),patient:patient.id};
    for(const v of [tea,clinic]){
      Object.assign(v.staff,{alive:true,decisionSlot:'society:staff',goalAction:'work',hunger:0,fatigue:0});
      place(v.staff,v.staffSlot);
    }
    const prepare=(n)=>Object.assign(n,{hp:1000,mp:1000,inventory:[],spiritStones:28,hunger:12,fatigue:8,alive:true,goalAction:'idle',
      wallLevel:0,flight:undefined,skyStep:undefined,decisionSlot:undefined,faunaHuntTargetId:undefined});
    const assigned=[];
    tea.ledger.stock=7;tea.ledger.cash=0;tea.ledger.revenue=0;
    for(const n of partyPeople){
      prepare(n);n.aiProfile.axes.sociability=68;n.aiProfile.axes.courage=68;
      place(n,{x:tea.counter.x-41,y:tea.counter.y+39});s.syncGroundOccupancy();
      if(!o.start(n,tea))throw new Error('Tea start');
      const seat=o.seatFor(n);place(n,seat);assigned.push(seat);
      const visit=o.visits[n.id];o.pursue(n,visit);o.paid(n,tea,visit);
    }
    prepare(patient);patient.hp=30;
    const approach=clinic.queue.find(p=>s.footprintTerrainOpen(p.x,p.y,10,7)&&clinic.seats.some(q=>s.canReachPoint(p,q)))??clinic.counter;
    place(patient,approach);s.syncGroundOccupancy();
    if(!o.seekClinic(patient))throw new Error('Clinic start '+JSON.stringify({duty:o.onDuty(clinic),stock:o.stock(clinic),free:o.available(patient),
      reachable:clinic.seats.map(p=>[s.canReachPoint(patient,p),s.groundPositionOpen(patient,p.x,p.y)]),retry:o.account(patient).retryAt}));
    const medical=o.seatFor(patient);place(patient,medical);o.pursue(patient,o.visits[patient.id]);
    s.syncGroundOccupancy();
    return {tables:assigned.map(s=>s.table),seated:partyPeople.every(n=>o.isSeated(n)),teaCash:tea.ledger.cash,
      teaStock:tea.ledger.stock,wallets:partyPeople.map(n=>n.spiritStones),
      clinic:o.visits[patient.id].phase,doctorCash:clinic.ledger.cash};
  `);
  assert.deepEqual(fixture,{tables:[0,0,0],seated:true,teaCash:6,teaStock:4,wallets:[26,26,26],clinic:'waiting-care',doctorCash:0});
  await ask(`
    const v=s.society.places.get('clinic');s.cameraTween?.stop();s.cameraTween=null;
    s.setZoom(1.2);s.cameras.main.centerOn(v.landmark.x,v.landmark.y);s.clampCamera();
    s.inspector.select({kind:'venue',id:v.id});
  `);
  await sleep(350);await shot('clinic-controlled');
  const resolved=await ask(`
    const {partyPeople,patient}=s.socialFixture,o=s.society,ex=s.expeditions;
    const crew=partyPeople.map(id=>s.scheduler.byId.get(id).npc);
    const n=s.scheduler.byId.get(patient).npc;
    const tea=o.places.get('tea'),clinic=o.places.get('clinic');
    const event={id:'fixture-real-market',type:'market-trade',day:w.clock.day,minute:w.clock.minute,
      description:'Đã bán linh thảo tại Phường Thị.',actorId:crew[0].id};
    w.events.push(event);o.social.observe();
    const knownBefore=crew.map(n=>(o.account(n).news??[]).some(x=>x.id===event.id&&x.verified));
    o.social.tick();
    const first=o.social.current('tea')[0];
    for(let i=0;i<38;i++){w.clock.minute++;o.pursue(n,o.visits[patient]);o.social.tick();}
    const pact=w.expeditions.parties.find(p=>p.conversationId===first.id);
    if(pact){
      for(const id of pact.members){const member=ex.npc(id);Object.assign(member,pact.spots[id]);s.npcSprites.get(id).setPosition(member.x,member.y);}
      ex.step(pact);
    }
    for(let i=0;i<38;i++){if(!o.visits[patient])break;w.clock.minute++;o.pursue(n,o.visits[patient]);}
    const c=o.social.state.history.find(c=>c.id===first.id);
    const result={topic:c?.topic,turns:c?.lines.map(l=>l.speaker),knownBefore,
      paidClinic:clinic.ledger.revenue,hp:n.hp,freeSeat:!o.visits[patient],wallet:n.spiritStones,
      party:pact&&{phase:pact.phase,source:pact.source,n:pact.members.length},
      roomFreed:crew.every(n=>!o.visits[n.id]),relations:crew.map(n=>crew.filter(m=>m!==n&&(n.relationships[m.id]??0)>0).length)};
    s.persistPopulation();return result;
  `);
  console.log(JSON.stringify({fixture,resolved}));
  assert.equal(resolved.topic,'Bàn việc xuất hành');
  assert.equal(resolved.turns.length,4);assert.equal(new Set(resolved.turns).size,3);
  assert.deepEqual(resolved.party,{phase:'outbound',source:'tea',n:3});
  assert.ok(resolved.hp>30&&resolved.freeSeat&&resolved.roomFreed);
  assert.deepEqual([resolved.paidClinic,resolved.wallet],[11,17]);
  const journey=await ask(`
    const p=w.expeditions.parties.find(p=>p.source==='tea'),ex=s.expeditions;
    let t=s.time.now,west=false;
    w.clock.speed=4;w.clock.paused=false;
    for(let i=0;i<165;i++){
      t+=1000;s.updatePopulation(t,1000,1000);
      if((p.members??[]).some(id=>ex.npc(id)?.x<2000))west=true;
      if(p.hits||p.finished)break;
    }
    w.clock.paused=true;
    return {west,phase:p.phase,hits:p.hits,completed:w.expeditions.counters.completed??0};
  `);
  assert.ok(journey.west);
  await writeFile(join(output,'controlled.json'),JSON.stringify({fixture,resolved,journey},null,2));
}finally{ws?.close();chrome.kill()}
