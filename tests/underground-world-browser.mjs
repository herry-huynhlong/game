import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9442);
const output=resolve('art/previews/dia-mach-the-gioi');
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
  const layout=await evalScene(`
    const u=s.underground,site=u.sites.get('outer-mist'),w=s.populationWorld;
    const entitiesBefore=Object.keys(u.state.instances).length;
    w.clock.paused=true;
    u.view.show(site.id);
    u.view.el('fit').click();
    const f=u.view.floor;
    return {size:f.width,rooms:f.rooms.length,links:f.edges.length,water:f.rows.join('').split('~').length-1,
      bridges:f.rows.join('').split('=').length-1,zoom:u.view.zoom,nodes:site.map.nodes.length,
      camera:s.cameras.main.visible,entitiesBefore,entitiesAfter:Object.keys(u.state.instances).length,sites:u.sites.size};
  `);
  assert.equal(layout.size,128);
  assert.ok(layout.rooms>=10&&layout.links>=11&&layout.water>0&&layout.bridges>0);
  assert.ok(layout.zoom<.5);
  assert.equal(layout.sites,16);
  assert.equal(layout.entitiesAfter,layout.entitiesBefore);
  assert.equal(layout.camera,false);
  await shot('01-toan-canh-bach-vu');
  await evalScene("s.underground.view.el('down').click();return true");
  const layer=await evalScene("return {level:s.underground.view.level,entry:s.underground.view.floor.entry}");
  assert.equal(layer.level,1);
  await evalScene("s.underground.view.el('up').click();return true");
  const lake=await evalScene(`
    const v=s.underground.view,p=v.floor.rooms.find(r=>r.biome===2);
    const box=v.minimap.getBoundingClientRect();
    v.minimap.dispatchEvent(new MouseEvent('click',{clientX:box.left+(p.x+.5)*box.width/v.floor.width,
      clientY:box.top+(p.y+.5)*box.height/v.floor.height,bubbles:true}));
    const beforeWheel=v.zoom;
    v.canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-1400,clientX:v.canvas.width/2,clientY:v.canvas.height/2,cancelable:true}));
    const wheel=v.zoom;
    v.focus(p);
    return {zoom:v.zoom,center:v.center,biome:p.name,cache:v.chunks.size,beforeWheel,wheel};
  `);
  assert.ok(lake.zoom>=1&&lake.wheel>lake.beforeWheel);
  await shot('02-dia-tam-linh-ho');
  await evalScene(`
    const v=s.underground.view,p=v.floor.rooms.find(r=>r.biome===1);
    v.focus(p);return true;
  `);
  await shot('03-u-minh-nam-lam');
  const mining=await evalScene(`
    const u=s.underground,w=s.populationWorld,site=u.sites.get('sect-jade'),camp=s.sectCampus;
    const n=w.npcs.find(n=>n.alive&&u.canEnter(n,site)&&n.populationRole==='low_disciple');
    const advance=()=>{if(++w.clock.minute===1440){w.clock.minute=0;w.clock.day++;}u.tick();};
    const point=(n,p)=>{n.x=p.x;n.y=p.y;s.npcSprites.get(n.id).setPosition(n.x,n.y);};
    point(n,site.point);s.syncGroundOccupancy();
    const q={id:'expanded-cave-mining',veinId:site.id,status:'active',quantity:2,collected:0,assignee:n.id};
    camp.state.orders.push(q);u.workOrder(n,site.id,q);
    const first={x:n.underground.x,y:n.underground.y};
    let minutes=0;
    while(n.action!=='work'&&minutes<240){advance();minutes++;}
    u.view.locate(n);
    const worker={...n.underground},stock=Object.values(u.instance(site).stock).reduce((a,b)=>a+b,0);
    const node=site.map.nodes.find(p=>p.id===worker.nodeId);
    u.view.inspect({x:node.x*24+12,y:node.y*24+12},true);
    window.testExpandedCave={u,w,site,n,advance,q,point};
    return {minutes,worker,first,stock,amount:site.state.amount,node,worldVisible:s.npcSprites.get(n.id).visible};
  `);
  assert.ok(mining.minutes>5&&mining.minutes<240);
  assert.ok(mining.node);
  assert.equal(mining.stock,mining.amount);
  assert.equal(mining.worldVisible,false);
  await shot('04-khoang-cong-va-giam-dinh');
  const mined=await evalScene(`
    const {u,w,site,n,advance,q}=window.testExpandedCave;
    u.view.hide();
    let minutes=0;
    while(n.underground&&minutes<280){advance();minutes++;}
    const cargo=n.inventory.find(i=>i.itemId===site.item)?.count??0;
    s.sectCampus.state.orders=s.sectCampus.state.orders.filter(o=>o!==q);
    return {minutes,returned:!n.underground,stock:Object.values(u.instance(site).stock).reduce((a,b)=>a+b,0),
      amount:site.state.amount,cargo,collected:q.collected};
  `);
  assert.equal(mined.returned,true);
  assert.equal(mined.collected,2);
  assert.equal(mined.amount,mining.amount-2);
  assert.equal(mined.stock,mined.amount);
  const fauna=await evalScene(`
    const {u,w,site,n,advance,point}=window.testExpandedCave;
    point(n,site.point);s.syncGroundOccupancy();
    u.enter([n],site);
    const floor=site.map.floors[0],beast=u.instance(site).beasts[0];
    const hp=n.hp=500;
    u.view.show(site.id);u.view.focus(floor.lair);
    const cameraChange=beast.phase;
    // A controlled resident walks from the entrance to the lair before the trip sends him home.
    s.possessedNpcId=n.id;
    let distanceSteps=0;
    for(;distanceSteps<260&&beast.phase==='BURIED_IDLE';distanceSteps++){
      u.move(n,floor.lair,floor);
      advance();
    }
    const phases=[];
    for(let i=0;i<11;i++){advance();phases.push(beast.phase);}
    s.possessedNpcId=null;u.view.focus(floor.lair);
    return {cameraChange,phases,distanceSteps,damage:hp-n.hp,hp:beast.hp,beast:beast.id};
  `);
  assert.equal(fauna.cameraChange,'BURIED_IDLE');
  assert.ok(fauna.distanceSteps>10);
  assert.ok(fauna.phases.includes('GROUND_WARNING')&&fauna.phases.includes('EMERGING')&&fauna.phases.includes('COMBAT'));
  assert.ok(fauna.damage>0);
  await shot('05-hang-dia-sa-yeu-trung');
  const saved=await evalScene(`
    const {u,w,site,n}=window.testExpandedCave;
    const pos={...n.underground};
    w.clock.paused=true;s.persistPopulation();
    return {id:n.id,pos,ledger:site.state.amount,population:w.npcs.length};
  `);
  await visit('/?testMode=1',ready);
  const reloaded=await evalScene(`
    const u=s.underground,n=s.scheduler.byId.get(${JSON.stringify(saved.id)}).npc,site=u.sites.get('sect-jade');
    return {pos:n.underground,amount:site.state.amount,population:s.populationWorld.npcs.length};
  `);
  assert.deepEqual(reloaded.pos,saved.pos);
  assert.equal(reloaded.amount,saved.ledger);
  assert.equal(reloaded.population,108);
  const testInput=await evalScene(`
    const u=s.underground,w=s.populationWorld,site=u.sites.get('outer-mist'),n=w.npcs.find(n=>n.alive&&!n.underground&&n.populationRole==='independent_cultivator');
    Object.assign(n,{x:site.point.x,y:site.point.y,realmIndex:1,flight:null,skyStep:null,wallLevel:0,tribulation:null});
    site.state.discovered=true;
    s.npcSprites.get(n.id).setPosition(n.x,n.y);
    s.syncGroundOccupancy();w.heaven.divinePower=120;
    s.selectNPC(n.id);s.beginPossession();
    return {id:n.id,possessed:s.possessedNpcId};
  `);
  assert.equal(testInput.possessed,testInput.id);
  const key=async (code,number,hold=120)=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:code.toLowerCase(),code:'Key'+code,windowsVirtualKeyCode:number});
    await sleep(hold);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:code.toLowerCase(),code:'Key'+code,windowsVirtualKeyCode:number});
    await sleep(130);
  };
  await key('E',69);
  const entered=await evalScene("return s.scheduler.byId.get(s.possessedNpcId).npc.underground");
  assert.equal(entered.siteId,'outer-mist');
  await key('D',68,550);
  const moved=await evalScene("return s.scheduler.byId.get(s.possessedNpcId).npc.underground");
  assert.ok(moved.x>entered.x+1);
  await evalScene("const u=s.underground,n=s.scheduler.byId.get(s.possessedNpcId).npc;Object.assign(n.underground,u.sites.get(n.underground.siteId).map.floors[0].down);return true");
  await key('E',69);
  assert.equal(await evalScene("return s.scheduler.byId.get(s.possessedNpcId).npc.underground.floor"),1);
  await shot('06-nhap-than-tang-hai');
  await key('E',69);
  assert.equal(await evalScene("return s.scheduler.byId.get(s.possessedNpcId).npc.underground.floor"),0);
  await evalScene("const u=s.underground,n=s.scheduler.byId.get(s.possessedNpcId).npc;Object.assign(n.underground,u.sites.get(n.underground.siteId).map.floors[0].entry);return true");
  await key('E',69);
  assert.equal(await evalScene("return Boolean(s.scheduler.byId.get(s.possessedNpcId).npc.underground)"),false);
  const benchmarkStart=await evalScene(`
    s.endPossession();
    const u=s.underground,w=s.populationWorld;
    u.view.show('outer-mist');u.view.fit();
    w.clock.paused=false;w.clock.speed=1;
    window.caveTrack=w.npcs.filter(n=>n.alive&&!n.underground&&n.actionTarget).slice(0,40).map(n=>({id:n.id,x:n.x,y:n.y}));
    return {minutes:w.clock.day*1440+w.clock.minute,frame:s.game.loop.frame,at:performance.now()};
  `);
  await sleep(4500);
  const end=await evalScene(`
    const w=s.populationWorld;
    const moved=window.caveTrack.filter(p=>{const n=s.scheduler.byId.get(p.id).npc;return !n.underground&&Math.hypot(n.x-p.x,n.y-p.y)>1}).length;
    return {minutes:w.clock.day*1440+w.clock.minute,frame:s.game.loop.frame,at:performance.now(),moved};
  `);
  const benchmark={fps:Math.round((end.frame-benchmarkStart.frame)*1000/(end.at-benchmarkStart.at)),
    minutes:end.minutes-benchmarkStart.minutes,surfaceMoved:end.moved};
  assert.ok(benchmark.minutes>=2&&benchmark.surfaceMoved>0);
  const speeds=[];
  for(const rate of [0,2,4]){
    const start=await evalScene(`
      const v=s.underground.view,w=s.populationWorld;
      v.el('speed').value=String(${rate});v.el('speed').dispatchEvent(new Event('change'));
      return w.clock.day*1440+w.clock.minute;
    `);
    await sleep(3000);
    const finish=await evalScene("return s.populationWorld.clock.day*1440+s.populationWorld.clock.minute");
    speeds.push({rate,simMinutes:finish-start});
  }
  assert.equal(speeds[0].simMinutes,0);
  assert.ok(speeds[1].simMinutes>0&&speeds[2].simMinutes>speeds[1].simMinutes);
  const warrant=await evalScene(`
    const u=s.underground,c=s.civic,e=s.expeditions,w=s.populationWorld;
    const site=[...u.sites.values()].find(x=>x.kind==='iron'),floor=site.map.floors[0];
    w.clock.paused=true;u.view.hide();
    const prep=(n,p,realm)=>{Object.assign(n,{x:p.x,y:p.y,realmIndex:realm,realmLevel:4,hp:900,mp:900,hunger:0,fatigue:0,
      alive:true,ascended:false,wallLevel:0,flight:null,skyStep:null,tribulation:null,manualMeditation:false,
      convalescence:null,marketVisit:null,decisionSlot:undefined,goalAction:'idle'});
      s.npcSprites.get(n.id).setPosition(n.x,n.y);};
    const bad=w.npcs.find(n=>n.populationRole==='hunter'&&!n.underground);
    const victim=w.npcs.find(n=>n.populationRole==='commoner'&&!n.underground);
    const observer=w.npcs.filter(n=>n!==bad&&n!==victim&&!n.underground).at(-1);
    prep(bad,site.point,2);prep(victim,{x:site.point.x+15,y:site.point.y},0);
    s.syncGroundOccupancy();
    if(!u.enter([bad,victim],site))throw Error('Could not place test case within a mine');
    const camp=floor.props.find(p=>p.kind==='camp');
    let prepSteps=0;
    while((bad.underground.x!==camp.x||bad.underground.y!==camp.y)&&prepSteps++<100)u.move(bad,camp,floor);
    for(let i=0;i<30;i++)u.move(victim,{x:camp.x,y:camp.y+1},floor);
    const row=c.record({id:'underground-rescue-test',kind:'coercion',actorId:bad.id,victimId:victim.id,point:victim,severity:3});
    const knowledge=row.known.includes(observer.id);
    row.state='confirmed';c.warrant(row);
    const q=c.warrantJobs().find(j=>j.caseId===row.id);
    const crew=w.npcs.filter(n=>n.populationRole==='independent_cultivator'&&!n.underground&&!e.has(n)).slice(0,3);
    crew.forEach((n,i)=>prep(n,{x:site.point.x+16*i,y:site.point.y},3));
    const p=e.form(q,crew);
    if(!p)throw Error('Could not form underground warrant expedition');
    e.change(p,'field');p.spots=Object.fromEntries(crew.map(n=>[n.id,{x:n.x,y:n.y}]));
    e.field(p,crew);
    const same=crew.every(n=>n.underground?.siteId===site.id);
    let sim=0;
    s.possessedNpcId=bad.id;
    while(row.state!=='resolved'&&sim++<340){
      if(++w.clock.minute===1440){w.clock.day++;w.clock.minute=0;}
      u.tick();e.step(p);
    }
    s.possessedNpcId=null;
    const custody=c.state.custody[victim.id]?.status;
    const outcome={same,map:row.siteId,floor:row.floor,knowledge,sim,custody,status:row.state,
      party:p.phase,amountHeld:p.escrow,target:{...row.point},suspect:bad.underground,crew:crew.map(n=>({id:n.id,position:n.underground,route:u.routes.get(n.id)?.key,hp:n.hp,action:n.action,goal:n.shortGoal,access:u.canEnter(n,site)}))};
    u.view.show(site.id,0);u.view.focus(row.point);
    return outcome;
  `);
  assert.equal(warrant.same,true);
  assert.equal(warrant.floor,0);
  assert.equal(warrant.knowledge,false);
  assert.equal(warrant.status,'resolved',JSON.stringify(warrant));
  assert.equal(warrant.custody,'recovering');
  assert.equal(warrant.party,'returning');
  await shot('07-to-doi-giai-cuu-duoi-mo');
  const settlement=await evalScene(`
    const u=s.underground,c=s.civic,e=s.expeditions,w=s.populationWorld;
    const row=c.state.cases['underground-rescue-test'],p=e.state.parties.find(p=>p.job.caseId===row.id);
    const crew=p.members.map(id=>s.scheduler.byId.get(id).npc);
    let minutes=0;
    while(crew.some(n=>n.underground)&&minutes++<320){
      if(++w.clock.minute===1440){w.clock.day++;w.clock.minute=0;}
      u.tick();
    }
    const returned=crew.every(n=>!n.underground);
    e.deliver(p,crew);
    if(p.spots)for(const n of crew)Object.assign(n,p.spots[n.id]);
    const balance=crew.reduce((sum,n)=>sum+n.spiritStones,0);
    e.deliver(p,crew);e.deliver(p,crew);
    return {minutes,returned,status:p.phase,reward:row.warrant.reward,warrant:row.warrant.status,
      paid:crew.reduce((sum,n)=>sum+n.spiritStones,0)-balance};
  `);
  assert.equal(settlement.returned,true);
  assert.equal(settlement.status,'completed',JSON.stringify(settlement));
  assert.equal(settlement.warrant,'paid');
  assert.equal(settlement.paid,settlement.reward);

  const result={layout,layer,lake,mining,mined,fauna,saved,reloaded,entered,moved,benchmark,speeds,warrant,settlement,errors,failed};
  console.log(JSON.stringify(result,null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
