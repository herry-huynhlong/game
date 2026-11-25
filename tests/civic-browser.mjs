import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9435);
const output=resolve('art/previews/thien-ac-nhan-qua');
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
    return new Promise((ok,fail)=>{
      const request=++id, timer=setTimeout(()=>{pending.delete(request);fail(Error('Chrome timeout '+method));},60000);
      pending.set(request,{ok:value=>{clearTimeout(timer);ok(value);},fail:error=>{clearTimeout(timer);fail(error);}});
      ws.send(JSON.stringify({id:request,method,params}));
    });
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
    (()=>{const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}})();
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
  const contracts=await evalScene(`
    const c=s.civic,u=s.underground,w=s.populationWorld;
    w.clock.paused=true;w.clock.minute=605;
    const old=[...c.veins.sites.values()].filter(site=>site.state.owner==='qingyun-sect').map(site=>[site.id,site.grade,site.state.amount]);
    const site=c.veins.sites.get('outer-mist'),a=w.npcs.find(n=>n.populationRole==='independent_cultivator');
    const b=w.npcs.find(n=>n.populationRole==='commoner'&&n!==a);
    const pawn=(n,p)=>{Object.assign(n,{x:p.x,y:p.y,alive:true,ascended:false,wallLevel:0,flight:null,skyStep:null,tribulation:null,convalescence:null,
      hunger:1,fatigue:0,hp:900,mp:900,goalAction:'idle',decisionSlot:undefined,marketVisit:null,lawResponse:null,
      spiritStones:40,realmIndex:1,realmLevel:4,manualMeditation:false});
      s.npcSprites.get(n.id).setPosition(n.x,n.y);
    };
    pawn(a,site.point);pawn(b,{x:site.point.x+18,y:site.point.y});
    site.state.discovered=true;
    b.aiProfile.axes.courage=90;
    s.syncGroundOccupancy();
    const claim=c.claim(a,site),balance=a.spiritStones,amount=site.state.amount;
    const low=c.offer(a,site,{mode:'wage',price:1,quantity:4});
    const refusal=!c.accept(b,low);
    c.cancelContract(low,'Đối chiếu lương thấp');
    const contract=c.offer(a,site,{mode:'wage',price:10,quantity:2});
    const accepted=c.accept(b,contract),before=b.spiritStones;
    c.tickContracts();
    const underground=b.underground?.job?.id;
    for(let i=0;i<125;i++){w.clock.minute++;u.tick();}
    c.tickContracts();
    const arrivedAbove=!b.underground,target=b.actionTarget;
    const carried=b.inventory.find(row=>row.itemId===site.item)?.count??0;
    const beforeDelivery=c.settle(b,contract);
    pawn(b,contract.receipt);s.syncGroundOccupancy();
    const paid=c.settle(b,contract),repeated=c.settle(b,contract);
    window.civicLabor={a,b,site,contract};
    s.inspector.select({kind:'spiritVein',id:site.id});
    return {claim,old,refusal,accepted,underground,arrivedAbove,target,carried,beforeDelivery,paid,repeated,amount,remaining:site.state.amount,
      held:a.inventory.find(row=>row.itemId===site.item)?.count??0,payment:b.spiritStones-before,employerCost:balance-a.spiritStones};
  `);
  assert.deepEqual(contracts.old,[['sect-jade',1,92]]);
  for(const name of ['claim','refusal','accepted','arrivedAbove','paid'])assert.equal(contracts[name],true,name+': '+JSON.stringify(contracts));
  assert.equal(contracts.beforeDelivery,false);
  assert.equal(contracts.repeated,false);
  assert.ok(contracts.underground?.startsWith('mining-contract-'));
  assert.equal(contracts.amount-contracts.remaining,2);
  assert.equal(contracts.payment,10);
  assert.equal(contracts.employerCost,10);
  assert.ok(contracts.held>=2);
  await shot('01-giam-dinh-chu-mo');
  const law=await evalScene(`
    const c=s.civic,w=s.populationWorld,base=c.hall;
    const bad=w.npcs.find(n=>n.populationRole==='hunter');
    const victim=w.npcs.filter(n=>n.populationRole==='commoner').at(-1);
    const near=c.officers[1],other=c.officers[0],far=w.npcs.find(n=>n.populationRole==='low_disciple');
    const place=(n,p,realm=0)=>{Object.assign(n,{x:p.x,y:p.y,alive:true,ascended:false,wallLevel:0,flight:null,skyStep:null,tribulation:null,
      convalescence:null,marketVisit:null,lawResponse:null,manualMeditation:false,decisionSlot:undefined,goalAction:'idle',realmIndex:realm,realmLevel:3,
      hp:900,mp:900,hunger:1,fatigue:0});s.npcSprites.get(n.id).setPosition(n.x,n.y);};
    const offsets=[base,...Array.from({length:12},(_,i)=>({x:base.x+Math.cos(i*Math.PI/6)*24,y:base.y+Math.sin(i*Math.PI/6)*24}))]
      .filter(p=>s.footprintTerrainOpen(p.x,p.y,9,6)&&s.monsterLine(p,base));
    if(offsets.length<4)throw Error('Could not arrange civic fixture at the hall');
    [bad,victim,near,other].forEach((n,i)=>place(n,offsets[i],i===0?3:0));
    place(far,{x:base.x+420,y:base.y+420},1);
    near.aiProfile.axes.discipline=99;near.aiProfile.axes.courage=87;
    const balance=c.city.wealth;
    const row=c.record({id:'controlled-rescue',kind:'coercion',actorId:bad.id,victimId:victim.id,point:victim,severity:3});
    const initial=row.state,stateVictim=c.state.custody[victim.id]?.status;
    const omniscient=row.known.includes(far.id);
    c.report(row,near);
    const reported=row.state;
    c.tickCases();
    const firstPhase=row.state,marked=row.responders.map(id=>c.npc(id).decisionSlot);
    for(const id of row.responders){const guard=c.npc(id),goal=guard.actionTarget;Object.assign(guard,goal);s.npcSprites.get(id).setPosition(guard.x,guard.y);}
    w.clock.minute+=4;c.tickCases();w.clock.minute+=4;c.tickCases();
    const wanted=row.state,held=row.warrant?.escrow??0;
    const outsiders=c.knowsWarrant(far,{key:row.warrant?.id});
    s.inspector.select({kind:'palace',id:'qingyun-city'});
    window.civicLaw={row,bad,victim,far,balance,offsets};
    return {initial,stateVictim,omniscient,reported,firstPhase,wanted,held,loss:balance-c.city.wealth,
      evidence:row.evidence,marked,outsiders,source:row.reports[0],palace:s.inspector.selected?.kind,notice:row.warrant?.id};
  `);
  assert.equal(law.initial,'undetected');
  assert.equal(law.stateVictim,'awaiting-rescue');
  assert.equal(law.omniscient,false);
  assert.equal(law.reported,'reported');
  assert.ok(law.marked.some(slot=>slot==='civic:investigate'));
  assert.equal(law.wanted,'wanted',JSON.stringify(law));
  assert.equal(law.held,law.loss);
  assert.ok(law.held>0);
  assert.equal(law.outsiders,false);
  assert.equal(law.palace,'palace');
  await shot('02-phu-thanh-chu-truy-na');
  const outcome=await evalScene(`
    const c=s.civic,w=s.populationWorld,e=s.expeditions,{row,bad,victim,far,balance,offsets}=window.civicLaw;
    const crew=w.npcs.filter(n=>n.populationRole==='independent_cultivator'&&n!==bad&&n!==far&&n.id!==window.civicLabor.a.id).slice(0,3);
    crew.forEach((n,i)=>{Object.assign(n,offsets[4+i],{realmIndex:3,realmLevel:5,hunger:0,fatigue:0,hp:900,mp:900,wallLevel:0,
      flight:null,skyStep:null,tribulation:null,decisionSlot:undefined,goalAction:'idle',marketVisit:null});
      s.npcSprites.get(n.id).setPosition(n.x,n.y);});
    const social=s.society.social;
    const notice=w.events.find(x=>x.id===row.warrant.id);
    for(const n of crew)notice.data.knownBy.push(n.id);
    social.observe();
    // A different resident learns the announcement through an actual tea-table conversation.
    social.start('tea:test-table',[crew[0],far],c.now);
    const conversation=social.state.active['tea:test-table'];
    const topic=social.line(conversation,0);
    delete social.state.active['tea:test-table'];
    const job=c.warrantJobs()[0],allowed=crew.every(n=>e.allowed(n,job)),paidBefore=crew.reduce((sum,n)=>sum+n.spiritStones,0);
    const party=e.form(job,crew);
    if(!party)throw Error('Could not form legal expedition');
    function reach(){
      if(party.spots)for(const n of crew)if(party.spots[n.id])Object.assign(n,party.spots[n.id]);
    }
    reach();e.step(party);
    e.step(party);reach();e.step(party);
    const fieldPhase=party.phase;
    e.field(party,crew);
    const recovery=c.state.custody[victim.id]?.status??null,resolved=row.state;
    e.deliver(party,crew);reach();e.deliver(party,crew);
    const paid=crew.reduce((sum,n)=>sum+n.spiritStones,0)-paidBefore;
    e.deliver(party,crew);
    c.returnWarrant(job,0);
    for(let i=0;i<51;i++){w.clock.minute++;c.tickCases();}
    const recovered=!c.state.custody[victim.id]&&victim.alive&&!victim.decisionSlot?.startsWith('civic:');
    s.persistPopulation();
    return {fieldPhase,allowed,topic,newsId:conversation.news?.id,paid,recovery,resolved,recovered,party:party.phase,
      warrant:row.warrant.status,cityCost:balance-c.city.wealth,records:c.state.stats,population:w.npcs.length};
  `);
  assert.equal(outcome.fieldPhase,'field',JSON.stringify(outcome));
  assert.equal(outcome.allowed,true);
  assert.ok(outcome.topic.includes('Lệnh truy nã'),JSON.stringify(outcome));
  assert.equal(outcome.newsId,law.notice);
  assert.equal(outcome.resolved,'resolved',JSON.stringify(outcome));
  assert.equal(outcome.recovery,'recovering');
  assert.equal(outcome.recovered,true);
  assert.equal(outcome.party,'completed');
  assert.equal(outcome.warrant,'paid');
  assert.equal(outcome.paid,law.held);
  assert.equal(outcome.cityCost,outcome.paid);
  assert.equal(outcome.population,108);
  await shot('03-sau-giai-cuu');
  await visit('/?testMode=1',ready);
  const reloaded=await evalScene(`
    const c=s.civic,row=c.state.cases['controlled-rescue'],site=c.veins.sites.get('outer-mist');
    return {case:row?.state,paid:row?.warrant?.status,owner:site.state.owner,completed:c.contracts.filter(row=>row.status==='completed').length,
      roster:s.populationWorld.npcs.length};
  `);
  assert.equal(reloaded.case,'resolved');
  assert.equal(reloaded.paid,'paid');
  assert.ok(reloaded.owner?.startsWith('population:'));
  assert.equal(reloaded.completed,1);
  assert.equal(reloaded.roster,108);
  const rates=[];
  for(const mode of [0,1,2,4]){
    const start=await evalScene(`
      const select=document.getElementById('world-clock-speed');select.value=String(${mode});select.dispatchEvent(new Event('change'));
      const {day,minute}=s.populationWorld.clock;
      return {minutes:day*1440+minute,frames:s.game.loop.frame,wall:performance.now(),civicNext:s.civic.next??0};
    `);
    await sleep(3500);
    const end=await evalScene(`
      const {day,minute}=s.populationWorld.clock;
      return {minutes:day*1440+minute,frames:s.game.loop.frame,wall:performance.now(),civicNext:s.civic.next??0,stuck:s.getPopulationState().states.stuck};
    `);
    rates.push({mode,minutes:end.minutes-start.minutes,civicNext:end.civicNext-start.civicNext,
      fps:Math.round((end.frames-start.frames)*1000/(end.wall-start.wall)),stuck:end.stuck});
  }
  assert.equal(rates[0].minutes,0);
  assert.equal(rates[0].civicNext,0);
  assert.ok(rates[1].minutes>0&&rates[1].minutes<rates[2].minutes&&rates[2].minutes<rates[3].minutes);
  assert.ok(rates.slice(1).every(r=>r.civicNext>0));
  console.log(JSON.stringify({contracts,law,outcome,reloaded,rates,errors,failed},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
