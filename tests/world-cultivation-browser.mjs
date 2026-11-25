import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9286);
const output=resolve('art/previews/world-cultivation');
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
  const shot=async(name,profile=false)=>{
    const clip=profile?await run(`(()=>{
      const r=document.querySelector('#possession-panel').getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};
    })()`):undefined;
    const image=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };

  await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
  const sites=await run('window.__worldRebuild.getCultivationState().sites');
  assert.ok(sites.length>=2,JSON.stringify(sites));
  const fixture=await evalScene(`
    const w=s.populationWorld, site=s.cultivation.sites[0];
    const npc=w.npcs.find(n=>n.alive&&n.populationRole==='low_disciple'&&n.id!==s.characterRigPreview?.npc.id);
    const start=[[48,0],[-48,0],[0,48],[0,-48],[34,30],[-34,30]].map(([x,y])=>({x:site.x+x,y:site.y+y}))
      .find(p=>s.groundPositionOpen(npc,p.x,p.y)&&s.canReachPoint(p,site));
    const partner=w.npcs.find(n=>n.id!==npc.id&&n.populationRole==='low_disciple');
    Object.assign(npc,{...start,realmIndex:0,realmLevel:9,xp:10000,hp:150,mp:78,talent:100,hunger:4,fatigue:0,safety:100,
      actionCooldown:0,action:'cultivate',goalAction:'cultivate',actionProgress:59,
      inventory:[{itemId:'qi_pill',count:1},{itemId:'wood',count:3},{itemId:'spirit_herb',count:2}],
      marketVisit:undefined});
    s.npcSprites.get(npc.id).setPosition(npc.x,npc.y).setData('moving',false);
    s.populationSimulation.meditateAtRest(npc,w.clock.day,w.clock.minute);
    const t=npc.tribulation;
    if(!t)return {start,noTrial:true};
    const peer=[[38,0],[-38,0],[0,38],[0,-38]].map(([x,y])=>({x:t.site.x+x,y:t.site.y+y})).find(p=>s.groundPositionOpen(partner,p.x,p.y));
    Object.assign(partner,{...peer,goalAction:'idle',action:'idle',actionTarget:peer});
    s.npcSprites.get(partner.id).setPosition(peer.x,peer.y);
    s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.35);s.cameras.main.centerOn(t.site.x,t.site.y-46);
    return {npc:npc.id,site:t.site,start,partner:partner.id,phase:t.phase,pill:npc.inventory[0].count,count:w.npcs.length,
      uniqueInventories:new Set(w.npcs.map(n=>n.inventory)).size};
  `);
  assert.equal(fixture.count,108);
  assert.equal(fixture.uniqueInventories,108);
  assert.equal(fixture.phase,'travel',JSON.stringify(fixture));
  assert.equal(fixture.pill,1);
  const actor=`const w=s.populationWorld,n=w.npcs.find(row=>row.id===${JSON.stringify(fixture.npc)});`;
  const state=()=>evalScene(actor+`return {id:n.id,hp:n.hp,mp:n.mp,realm:n.realmIndex,level:n.realmLevel,
    trial:n.tribulation,pill:n.inventory.find(i=>i.itemId==='qi_pill')?.count??0,dist:Math.hypot(n.x-${fixture.site.x},n.y-${fixture.site.y}),
    pose:s.cultivation.poseFor(n,s.time.now),seated:s.npcAppearanceFleet.entries.get(n.id)?.renderer.seated?.visible,
    actorVisible:s.npcSprites.get(n.id).visible,renderer:s.npcAppearanceFleet.report(),
    camera:{x:s.cameras.main.worldView.x,y:s.cameras.main.worldView.y}};`);
  let cloud;
  for(let i=0;i<80;i++){
    await sleep(125);
    cloud=await state();
    if(cloud.trial?.phase==='cloud'&&cloud.seated)break;
  }
  assert.equal(cloud.trial?.phase,'cloud',JSON.stringify({cloud,errors:errors.slice(0,4)}));
  assert.equal(cloud.pill,0);
  assert.equal(cloud.realm,0);
  assert.equal(cloud.seated,true);
  assert.ok(cloud.dist<=9);
  await shot('01-cloud-meditation');
  const advance=async phase=>evalScene(actor+`
    w.clock.day=Math.floor(n.tribulation.nextAt/1440);w.clock.minute=n.tribulation.nextAt%1440;
    s.cultivation.tick();return n.tribulation?.phase;
  `);
  assert.equal(await advance('warning'),'warning');
  await shot('02-warning');
  assert.equal(await evalScene(actor+`return w.npcs.find(row=>row.id===${JSON.stringify(fixture.partner)}).memories.some(m=>m.sourceId===n.tribulation.id);`),true);
  assert.equal(await evalScene(actor+'s.persistPopulation();return true;'),true);
  await send('Page.reload');await sleep(1000);await ready();
  await evalScene(actor+'s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.35);s.cameras.main.centerOn(n.tribulation.site.x,n.tribulation.site.y-46);');
  await sleep(200);
  const reloaded=await state();
  assert.equal(reloaded.trial.id,cloud.trial.id);
  assert.equal(reloaded.trial.roll,cloud.trial.roll);
  assert.equal(reloaded.pill,0);
  assert.equal(reloaded.trial.strikes,0);
  assert.equal(await advance('strike'),'strike');
  await sleep(32);
  await shot('03-lightning-impact');
  const impact=await state();
  assert.equal(impact.trial.strikes,1);
  assert.ok(impact.hp<cloud.hp);
  assert.equal(impact.realm,0);
  await advance('strike');
  await advance('success');
  const completed=await state();
  assert.equal(completed.realm,completed.trial?.roll<completed.trial?.chance?1:0);
  assert.equal(completed.pill,0);
  const entries=await evalScene(actor+'return w.events.filter(e=>e.id.startsWith(n.tribulation.id));');
  assert.equal(entries.length,2);
  assert.equal(await evalScene(actor+'s.selectNPC(n.id);return true;'),true);
  await run("document.querySelector('[data-profile=inventory]').open=true");
  assert.equal(await run("document.querySelectorAll('[data-profile=inventory] .resident-item-icon').length"),2);
  await shot('04-resident-inventory');
  const advanced=await evalScene(`
    const w=s.populationWorld,n=w.npcs.find(n=>n.populationRole==='elder'&&n.alive);
    const site=s.cultivation.sites.at(-1);
    Object.assign(n,{...site,realmIndex:2,realmLevel:9,xp:100000,hp:340,mp:200,talent:85,hunger:3,fatigue:0,
      flight:undefined,tribulation:undefined,actionCooldown:0,action:'cultivate',goalAction:'cultivate',
      actionProgress:59,inventory:[{itemId:'qi_pill',count:1}]});
    s.npcSprites.get(n.id).setPosition(n.x,n.y).setData('moving',false);
    s.cultivation.request(n);const t=n.tribulation;
    if(!t)return null;
    Object.assign(n,{x:t.site.x,y:t.site.y});s.npcSprites.get(n.id).setPosition(n.x,n.y);
    s.closeNpcCard();s.cameraTween?.stop();s.cameraTween=null;s.cameras.main.centerOn(n.x,n.y-65);
    s.cultivation.tick();
    const step=()=>{w.clock.day=Math.floor(t.nextAt/1440);w.clock.minute=t.nextAt%1440;s.cultivation.tick();};
    step();const hp=n.hp;step();
    return {id:n.id,phase:t.phase,damage:hp-n.hp,strikes:t.strikes,idEvent:t.id};
  `);
  assert.equal(advanced?.phase,'strike');
  assert.ok(advanced.damage>cloud.hp-impact.hp);
  await sleep(40);
  await shot('05-advanced-tribulation');
  const frames=await run(`new Promise(resolve=>{
    const frames=[];let last=0;
    function tick(t){if(last)frames.push(t-last);last=t;
      if(frames.length<120){requestAnimationFrame(tick);return;}
      const sorted=[...frames].sort((a,b)=>a-b);
      const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
      const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(advanced.id)});
      resolve({fps:120000/frames.reduce((x,y)=>x+y,0),p95:sorted[113],width:innerWidth,height:innerHeight,
        zoom:s.cameras.main.zoom,phase:n.tribulation?.phase,visible:s.npcSprites.get(n.id).visible});
    }
    requestAnimationFrame(tick);
  })`);
  assert.equal(frames.phase,'strike');
  assert.equal(frames.visible,true);
  const advancedOutcome=await evalScene(`
    const w=s.populationWorld,n=w.npcs.find(n=>n.id===${JSON.stringify(advanced.id)}),t=n.tribulation;
    s.cameras.main.centerOn(500,550);
    while(n.tribulation&&t.phase==='strike'){w.clock.day=Math.floor(t.nextAt/1440);w.clock.minute=t.nextAt%1440;s.cultivation.tick();}
    return {phase:t.phase,strikes:t.strikes,hp:n.hp,realm:n.realmIndex};
  `);
  assert.equal(advancedOutcome.strikes,4);
  const pillPurchase=await evalScene(`
    const w=s.populationWorld,m=s.merchants,v=m.shops.get('city-apothecary'),o=v.owner;
    const n=w.npcs.find(n=>n.alive&&n.populationRole==='low_disciple'&&n.id!==${JSON.stringify(fixture.npc)});
    w.clock.minute=615;
    Object.assign(o,{...v.position,hunger:8,fatigue:8,safety:100,decisionSlot:undefined,actionProgress:0});
    v.retryAt=0;s.populationSimulation.tickNpc(o,1,w.clock.day,w.clock.minute,0);
    s.npcSprites.get(o.id).setPosition(o.x,o.y);
    const p=v.queue.find(p=>s.groundPositionOpen(n,p.x,p.y))??v.counter[0];
    const stock=v.shop.stock.find(i=>i.itemId==='qi_pill');
    if(!stock)return null;
    stock.count=4;
    m.nextDecision=new Map(w.npcs.filter(other=>other!==n).map(other=>[other.id,Infinity]));
    Object.assign(n,{x:p.x,y:p.y,realmIndex:1,realmLevel:8,hp:220,hunger:3,fatigue:6,mp:120,xp:100000,
      goalAction:'shop',action:'travel',actionProgress:0,actionCooldown:0,inventory:[],spiritStones:64,
      marketRetryAt:undefined,marketVisit:undefined,tribulation:undefined});
    s.npcSprites.get(n.id).setPosition(p.x,p.y);
    s.syncGroundOccupancy();
    const picked=m.propose(n);m.start(n,picked);
    for(let i=0;i<800&&n.marketVisit;i++){
      s.scheduler.time+=50;s.syncGroundOccupancy();s.routesStartedThisFrame=0;s.routeLimit=12;s.routeDeadline=Infinity;s.worldMoveBudget=100;
      m.tick(s.scheduler.time);s.moveAutonomousNpc(s.scheduler.byId.get(n.id));
    }
    const cost=64-n.spiritStones,bought=n.inventory.find(i=>i.itemId==='qi_pill')?.count??0;
    Object.assign(n,{goalAction:'cultivate',action:'cultivate',actionProgress:59});
    s.populationSimulation.meditateAtRest(n,w.clock.day,w.clock.minute);
    return {item:picked?.itemId,cost,price:v.shop.sellPrices.qi_pill,bought,left:!n.marketVisit,level:n.realmLevel,
      stock:stock.count,remaining:n.inventory.find(i=>i.itemId==='qi_pill')?.count??0,tribulation:Boolean(n.tribulation)};
  `);
  assert.equal(pillPurchase?.item,'qi_pill',JSON.stringify(pillPurchase));
  assert.equal(pillPurchase?.bought,1,JSON.stringify(pillPurchase));
  assert.equal(pillPurchase.cost,pillPurchase.price);
  assert.equal(pillPurchase.remaining,0);
  assert.equal(pillPurchase.stock,3);
  assert.equal(pillPurchase.level,9);
  assert.equal(pillPurchase.tribulation,false);
  const poses=await evalScene(`
    const types=['male_slim','male_strong','female_slender','male_elder'];
    const directions=['down','left','up','right'];
    const Renderer=s.npcAppearanceFleet.entries.get(${JSON.stringify(fixture.npc)}).renderer.constructor;
    const rows=[];
    for(const [i,type] of types.entries()){
      const source=s.populationWorld.npcs.find(n=>n.modularAppearance?.look.bodyType===type);
      if(!source)continue;
      for(const [col,dir] of directions.entries()){
        const sprite=new Renderer(s,3480+col*58,4040+i*41,source.modularAppearance.look);
        sprite.root.setDepth(6502).setScale(.52);
        sprite.meditation={amount:1,name:'MeditationIdle',breath:0};
        sprite.advance(80,'idle',dir,0);
        rows.push({type,dir,look:source.modularAppearance.look.outfit,seated:sprite.seated?.visible,texture:sprite.seated?.texture.key});
      }
    }
    s.setZoom(1.8);s.cameras.main.centerOn(3570,4078);
    return rows;
  `);
  assert.equal(poses.length,16);
  assert.ok(poses.every(p=>p.seated));
  assert.equal(new Set(poses.map(p=>p.texture)).size,16);
  await sleep(150);
  await shot('06-meditation-bodies-directions');
  await run("localStorage.removeItem('world-rebuild-1c-v1')");
  await send('Page.reload');await sleep(1050);await ready();
  await evalScene(`
    const w=s.populationWorld;w.clock.speed=4;
    window.simMetrics={times:0,meditators:new Set(),events:new Map(),trades:new Map(),maxBlocked:0,days:[],startDay:w.clock.day,
      blockedWindows:new Map(),longBlocked:new Set(),longSeatedBlocked:new Set()};
  `);
  for(let batch=0;batch<36;batch++)await evalScene(`
    const w=s.populationWorld,m=window.simMetrics;
    for(let i=0;i<120;i++){
      s.updatePopulation(performance.now(),250);
      if(i%15)continue;
      for(const n of w.npcs)if(n.alive&&n.action==='cultivate')m.meditators.add(n.id);
      for(const e of w.events)m.events.set(e.id,e);
      for(const t of w.economy.transactions)m.trades.set(t.id,t);
      m.maxBlocked=Math.max(m.maxBlocked,w.npcs.filter(n=>n.alive&&n.pathBlocked).length);
      for(const n of w.npcs){
        const e=s.scheduler.byId.get(n.id),last=m.blockedWindows.get(n.id);
        const wanted=n.actionTarget&&Math.hypot(n.x-n.actionTarget.x,n.y-n.actionTarget.y)>20;
        if(!n.alive||!wanted||!n.pathBlocked||e.waitingForSlot||e.passageWait||s.cultivation.isSeated(n)){
          m.blockedWindows.delete(n.id);continue;
        }
        const seatRelated=e.seatedWaitUntil>s.scheduler.time;
        const record=last&&Math.hypot(n.x-last.x,n.y-last.y)<22&&n.goalAction===last.goal&&seatRelated===last.seatRelated?
          last:{at:m.times+i,x:n.x,y:n.y,goal:n.goalAction,seatRelated};
        m.blockedWindows.set(n.id,record);
        if(m.times+i-record.at>=30){
          m.longBlocked.add(n.id+' · '+n.goalAction);
          if(seatRelated)m.longSeatedBlocked.add(n.id);
        }
      }
    }
    if((m.times+=120)%1440===0)m.days.push({day:w.clock.day,alive:w.npcs.filter(n=>n.alive).length,
      trading:w.npcs.filter(n=>n.marketVisit).length,cultivating:w.npcs.filter(n=>n.action==='cultivate').length});
  `);
  const simulation=await evalScene(`
    const w=s.populationWorld,m=window.simMetrics,events=[...m.events.values()],trades=[...m.trades.values()];
    return {startDay:m.startDay,days:m.days,roster:w.npcs.length,uniqueInventories:new Set(w.npcs.map(n=>n.inventory)).size,
      meditators:m.meditators.size,harvests:events.filter(e=>e.type==='herb-node-harvest').length,
      levelUps:events.filter(e=>e.type==='npc-breakthrough'&&!e.id.startsWith('tribulation:')).length,
      attempts:events.filter(e=>e.type==='npc-tribulation-start').length,passed:events.filter(e=>e.type==='npc-breakthrough'&&e.id.startsWith('tribulation:')).length,
      failed:events.filter(e=>e.type==='npc-breakthrough-failed').length,
      trades:trades.length,stonesTraded:trades.reduce((sum,t)=>sum+t.unitPrice*t.count,0),
      pillsTraded:trades.filter(t=>t.itemId==='qi_pill').reduce((sum,t)=>sum+t.count,0),
      pillsConsumed:events.filter(e=>e.type==='npc-tribulation-start'||e.type==='npc-breakthrough'&&!e.id.startsWith('tribulation:')).length,
      invalid:w.npcs.filter(n=>n.spiritStones<0||n.inventory.some(i=>i.count<0)).length,
      longBlocked:[...m.longBlocked],longSeatedBlocked:[...m.longSeatedBlocked],
      maxBlocked:m.maxBlocked,blocked:w.npcs.filter(n=>n.alive&&n.pathBlocked).length};
  `);
  assert.equal(simulation.roster,108);
  assert.equal(simulation.uniqueInventories,108);
  assert.ok(simulation.meditators>=8,JSON.stringify(simulation));
  assert.equal(simulation.invalid,0);
  await visit('/?cultivationDemo=1','Boolean(window.__worldRebuild?.ready())');
  assert.equal(await run("Boolean(sessionStorage.getItem('world-rebuild-1c-v1'))"),true);
  await run("document.querySelector('#cultivation-demo [data-rank=\"0\"]').click()");
  const demo=await run("window.__worldRebuild.getCultivationState().npcs.find(n=>n.phase==='cloud')");
  assert.equal(demo?.phase,'cloud');
  await writeFile(join(output,'browser.json'),JSON.stringify({fixture,cloud,reloaded,impact,completed,entries,advanced,advancedOutcome,pillPurchase,poses,frames,simulation,demo,errors,failed},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  console.log(JSON.stringify({phase:completed.trial?.phase,realm:completed.realm,damage:cloud.hp-impact.hp,advancedOutcome,frames,simulation}));
}finally{ws?.close();chrome.kill();}
