import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9397);
const output=resolve('art/previews/living-breath');
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
  const check=await ask(`
    w.clock.paused=true;
    const c=s.sectCampus,v=c.spiritVeins,site=v.sites.get('sect-jade');
    const d=w.npcs.find(n=>n.populationRole==='low_disciple');
    const zones=Object.fromEntries(s.faunaZones.filter(z=>z.spread).map(z=>[z.zoneId,env.fauna.filter(f=>f.alive&&f.zoneId===z.zoneId).length]));
    return {npcCount:w.npcs.length,fauna:env.fauna.filter(f=>f.alive).length,zones,
      eagles:env.fauna.filter(f=>f.alive&&f.species==='eagle').length,
      pythons:env.fauna.filter(f=>f.species==='python').length,
      groveKinds:new Set(s.objectSprites.filter(x=>x.texture.key==='living-grove').map(x=>x.name)).size,
      forestFloorKinds:new Set(s.objectSprites.filter(x=>x.texture.key==='living-floor').map(x=>x.name)).size,
      veins:[...v.sites.values()].map(x=>[x.id,x.state.discovered,s.footprintTerrainOpen(x.point.x,x.point.y,10,7)]),
      path:s.canReachPoint(d,site.point),shops:s.merchants.shops.size};
  `);
  console.log('WorldScene',JSON.stringify(check));
  assert.equal(check.npcCount,108);assert.equal(check.fauna,77);assert.equal(check.pythons,0);
  assert.ok(check.eagles>0);assert.equal(check.groveKinds,9);assert.equal(check.forestFloorKinds,5);assert.equal(check.veins.length,4);
  assert.ok(check.veins.every(([, ,open])=>open));
  assert.ok(check.path);
  assert.deepEqual(Object.values(check.zones),[7,8,10,10,10]);
  await ask(`
    const site=s.sectCampus.spiritVeins.sites.get('sect-jade');
    s.cameraTween?.stop();s.cameras.main.setZoom(1.45).centerOn(site.point.x,site.point.y);s.clampCamera();
    s.inspector.select({kind:'spiritVein',id:site.id});
  `);
  await sleep(500);await shot('linh-mach-thanh-ngoc');
  await ask(`
    const f=env.fauna.find(f=>f.alive&&f.species==='eagle'&&f.rank==='elite');
    s.cameras.main.centerOn(f.x,f.y-25);s.clampCamera();
    s.inspector.select({kind:'fauna',id:f.id});
  `);
  await sleep(500);await shot('liet-duong-kim-dieu');
  await ask(`
    const shop=s.merchants.shops.get('city-apothecary');
    s.cameras.main.centerOn(shop.position.x,shop.position.y);s.clampCamera();
    s.inspector.select({kind:'shop',id:shop.shop.id});
  `);
  await sleep(500);await shot('giam-dinh-cua-hang');

  const ledger=await ask(`
    const c=s.sectCampus,v=c.spiritVeins,site=v.sites.get('sect-jade'),desk=c.site('counter'),clerk=c.clerk;
    const actor=w.npcs.find(n=>n.populationRole==='low_disciple'&&n.alive);
    const stranger=w.npcs.find(n=>n.faction!=='Thanh Vân Tông');
    const place=(n,p)=>{Object.assign(n,{x:p.x,y:p.y,hunger:0,fatigue:0});s.npcSprites.get(n.id).setPosition(p.x,p.y);s.syncGroundOccupancy();};
    const p=[[-29,16],[25,18],[18,-25]].map(([x,y])=>({x:desk.x+x,y:desk.y+y})).find(p=>s.merchants.line(p,desk));
    place(clerk,desk);place(actor,p);clerk.decisionSlot='sect-campus:quests';
    w.clock.minute=600;c.vault.wealth=100;c.demand();
    const order=c.state.orders.find(q=>q.veinId===site.id&&q.status==='open');
    const stock=site.state.amount,funds=c.vault.wealth,starter=actor.spiritStones;
    if(!order)return {missingOrder:true};
    const unauthorized=v.authorized(stranger,site),accepted=c.accept(actor,order.id);
    if(!accepted)return {accepted,order,deskAvailable:c.availableClerk(),reachable:s.merchants.line(actor,clerk)};
    place(actor,site.point);
    v.mine(actor,order);w.clock.minute+=site.minutes;v.mine(actor,order);
    const mined=actor.inventory.find(row=>row.itemId===site.item)?.count??0;
    place(actor,p);
    const delivered=c.deliver(actor,order.id),duplicate=c.deliver(actor,order.id);
    return {id:order.id,authorized:v.authorized(actor,site),unauthorized,accepted,mined,delivered,duplicate,
      stockUsed:stock-site.state.amount,amount:site.state.amount,vaultDelta:c.vault.wealth-funds,
      reward:actor.spiritStones-starter,left:actor.inventory.find(row=>row.itemId===site.item)?.count??0};
  `);
  console.log('Ledger',JSON.stringify(ledger));
  assert.deepEqual([ledger.authorized,ledger.unauthorized,ledger.accepted,ledger.mined,ledger.delivered,ledger.duplicate],[true,false,true,2,true,false]);
  assert.deepEqual([ledger.stockUsed,ledger.vaultDelta,ledger.reward,ledger.left],[2,1,1,0]);
  // Store this controlled fixture and reload before the independent simulation.
  await ask('s.persistPopulation();');
  await visit('/?testMode=1',ready);
  const after=await ask(`return {amount:s.sectCampus.spiritVeins.sites.get('sect-jade').state.amount,
    status:s.sectCampus.state.orders.find(q=>q.id===${JSON.stringify(ledger.id)})?.status};`);
  assert.deepEqual(after,{amount:ledger.amount,status:'completed'});

  const stats=await ask(`
    const samples=[],trades=new Set(),missions=new Set(),altitudes=[],speeds=[];
    const begin=w.clock.day*1440+w.clock.minute;
    const clock=()=>w.clock.day*1440+w.clock.minute;
    const cash=()=>w.npcs.reduce((m,n)=>m+n.spiritStones,0)+w.shops.reduce((m,shop)=>m+shop.cash,0)+w.factions.reduce((m,f)=>m+f.wealth,0)+s.sectCampus.state.orders.reduce((m,q)=>m+(q.escrow??0),0);
    let t=s.time.now;
    const startCash=cash();
    for(const speed of [0,1,2,4]){
      const at=clock();w.clock.paused=speed===0;w.clock.speed=speed||1;
      t+=1000;s.updatePopulation(t,1000,1000);speeds.push([speed,clock()-at]);
    }
    let next=begin+240;
    for(let i=0;i<1000&&clock()-begin<2880;i++){
      t+=1000;s.updatePopulation(t,1000,1000);
      if(i%15===0){
        for(const tx of w.economy.transactions)trades.add(tx.id);
        for(const q of s.sectCampus.state.orders)if(q.status==='completed')missions.add(q.id);
        altitudes.push(Math.max(...env.fauna.filter(f=>f.species==='eagle'&&f.alive).map(f=>f.altitude??0)));
      }
      if(clock()<next)continue;
      next+=240;
      const count=action=>w.npcs.filter(n=>n.alive&&n.action===action).length;
      const pop=s.getPopulationState();
      samples.push({day:w.clock.day,minute:w.clock.minute,seated:w.npcs.filter(n=>s.cultivation.isSeated(n)).length,
        work:count('work')+count('farm')+count('gather'),moving:count('travel'),activeMissions:s.sectCampus.state.orders.filter(q=>q.status==='active').length,
        stuck:pop.states.stuck,west:w.npcs.filter(n=>n.alive&&n.x<0).length,alive:pop.alive,
        stocks:w.shops.filter(s=>s.id==='city-market'||s.id==='city-apothecary').map(shop=>[shop.id,shop.stock.reduce((m,row)=>m+row.count,0)])});
    }
    w.clock.paused=true;
    return {minutes:clock()-begin,speeds,transactions:trades.size,completed:missions.size,maxEagleAltitude:Math.max(...altitudes),
      cash:[startCash,cash()],production:s.sectCampus.production.state.totals,samples,
      deaths:w.npcs.filter(n=>!n.alive).map(n=>[n.name,n.deathCause])};
  `);
  assert.deepEqual(stats.speeds,[[0,0],[1,1],[2,2],[4,4]]);
  assert.ok(stats.minutes>=2880&&stats.maxEagleAltitude>=18);
  assert.ok(stats.transactions>0&&stats.completed>0);
  const flying=await ask(`
    const f=env.fauna.find(f=>f.alive&&f.species==='eagle'&&f.altitude>=18);
    if(!f)return false;
    s.cameraTween?.stop();s.setZoom(1.7);s.cameras.main.centerOn(f.x,f.y-32);s.clampCamera();
    s.inspector.select({kind:'fauna',id:f.id});return true;
  `);
  if(flying){await sleep(400);await shot('kim-dieu-tren-khong');}
  await ask(`s.inspector.close();s.gotoRegion('city',false);s.setZoom(.95);
    w.clock.paused=false;w.clock.speed=1;s.frameSamples.length=0;`);
  await sleep(4000);
  stats.render=await ask(`return {fps:s.game.loop.actualFps,
    p95FrameMs:[...s.frameSamples].sort((a,b)=>a-b)[Math.floor(s.frameSamples.length*.95)],
    visible:s.getPopulationState().visible,viewport:[s.scale.width,s.scale.height],zoom:s.cameras.main.zoom};`);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(join(output,'simulation.json'),JSON.stringify({check,ledger,after,stats,errors,failed},null,2));
  console.log(JSON.stringify(stats,null,2));
}finally{ws?.close();chrome.kill()}
