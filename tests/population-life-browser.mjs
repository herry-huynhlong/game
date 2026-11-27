import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9476);
const output=resolve('art/previews/van-nhan-sinh-tuc');
const profile=await mkdtemp(join(tmpdir(),'tvk-population-profile-'));
await mkdir(output,{recursive:true});
const chrome=spawn(process.env.CHROME_EXE??'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--no-first-run','--enable-precise-memory-info',
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
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('HeapProfiler.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
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
  const isolated=Number(process.argv.find(arg=>arg.startsWith('--target='))?.split('=')[1]);
  const benchmarks=[];
  for(const target of process.argv.includes('--only-natural')?[]:isolated?[isolated]:[108,144,180,240]){
    await visit('/?testMode=1&populationTest='+target,ready);
    const state=await evalScene(`
      const w=s.populationWorld;
      const city=s.markers.find(m=>m.id==='city-center');
      s.navigateCameraTo(city.x,city.y,'benchmark',true,.95);
      s.performancePanel.setOpen(true);
      const districts={},vocations={},unsafe=[];
      const ids=new Set(),names=new Set();
      for(const n of w.npcs){
        ids.add(n.id);names.add(n.name);
        if(!n.lifeOrigin)continue;
        districts[n.residenceName]=(districts[n.residenceName]??0)+1;
        vocations[n.vocation]=(vocations[n.vocation]??0)+1;
        if(!s.canReachPoint(n.home,n.workPosition)||!s.footprintTerrainOpen(n.home.x,n.home.y,12,8))unsafe.push(n.id);
      }
      return {total:w.npcs.length,districts,vocations,unsafe,ids:ids.size,names:names.size,target:s.lifeDirector.target};
    `);
    assert.equal(state.total,target,JSON.stringify(state));
    assert.equal(state.ids,target);assert.equal(state.names,target);
    assert.deepEqual(state.unsafe,[]);
    if(target>108)assert.equal(Object.keys(state.districts).length,8);
    await send('HeapProfiler.collectGarbage');
    await sleep(2400);
    await evalScene(`
      window.__routeSamples=[];
      const sample=()=>window.__routeSamples.push(s.routeTimeThisFrame??0);
      window.__finishRouteSample=()=>s.game.events.off('postrender',sample);
      s.game.events.on('postrender',sample);
    `);
    let samples=[];
    for(let i=0;i<6;i++){
      await sleep(600);
      samples.push(await evalScene(`
        const state=s.getPopulationState(),p=s.performancePanel.snapshot();
        return {fps:p.fps,p95:p.p95,ai:p.aiMs,path:p.routeMs,pathRate:state.pathfindingCalls,
          memory:p.heapMB,saveBytes:new Blob([JSON.stringify(s.populationWorld)]).size,
          stuck:state.states.stuck,draw:p.drawCalls,far:p.levels[2],visible:p.rendered,
          aiP95:state.aiCostP95Ms,zoom:s.cameras.main.zoom};
      `));
    }
    const summary=Object.fromEntries(Object.keys(samples[0]).map(key=>{
      const values=samples.map(p=>p[key]).filter(Number.isFinite).sort((a,b)=>a-b);
      return [key,values.length?Number(values[Math.floor(values.length/2)].toFixed(2)):null];
    }));
    const path=await evalScene(`
      window.__finishRouteSample();
      const frames=window.__routeSamples,sorted=frames.filter(ms=>ms>0).sort((a,b)=>a-b);
      return {pathFrames:frames.length,routeMean:frames.reduce((a,b)=>a+b,0)/frames.length,
        routeP95Busy:sorted[Math.floor(sorted.length*.95)]??0};
    `);
    assert.ok(summary.visible>4,JSON.stringify(summary));
    benchmarks.push({target,...summary,pathFrames:path.pathFrames,routeMean:Number(path.routeMean.toFixed(2)),
      routeP95Busy:Number(path.routeP95Busy.toFixed(2)),districts:state.districts,vocations:state.vocations});
    if(target===180)await shot('180-cu-dan');
    if(target===108){
      const audit=await evalScene(`
        const w=s.populationWorld, behavior=w.events;
        return w.npcs.map(n=>({id:n.id,name:n.name,role:n.populationRole,profession:n.profession,
          origin:n.aiProfile?.origin,home:n.home,work:n.workPosition,site:n.workplaceId,
          realm:[n.realmIndex,n.realmLevel],age:n.age,lifespan:n.lifespan,assets:n.spiritStones,
          inventory:n.inventory,personality:n.personality,relationships:n.relationships,
          activity:n.action,goal:n.goalAction,knownIncome:behavior.filter(e=>e.actorId===n.id&&/wage|sale|harvest|trade/.test(e.type)).length}));
      `);
      await writeFile(join(output,'audit-108.json'),JSON.stringify(audit,null,2)+'\n');
    }
  }
  if(benchmarks.length)await writeFile(join(output,isolated?`benchmark-${isolated}.json`:'benchmark.json'),JSON.stringify({benchmarks},null,2)+'\n');
  if(process.argv.includes('--natural')){
    const naturalTarget=isolated||180;
    await visit('/?testMode=1&populationTest='+naturalTarget,ready);
    await evalScene(`
      s.sys.pause();
      s.populationWorld.clock.speed=4;
      s.populationWorld.clock.paused=false;
      window.__natural={events:new Map(),trades:new Map(),milestones:[],
        before:s.populationWorld.heaven.divineLedger.earned,
        start:s.populationWorld.clock.day*1440+s.populationWorld.clock.minute,
        actors:new Map(s.populationWorld.npcs.map(n=>[n.id,{x:n.x,y:n.y}]))};
    `);
    for(let round=0;round<12;round++){
      await evalScene(`
        const w=s.populationWorld,t=window.__natural;
        for(let i=0;i<60;i++){
          s.updatePopulation(s.time.now,1000,1000);
          if(i%12===11){
            for(const e of w.events)t.events.set(e.id,e);
            for(const tx of w.economy.transactions)t.trades.set(tx.id,tx);
          }
        }
        t.milestones.push({day:w.clock.day,minute:w.clock.minute,alive:w.npcs.filter(n=>n.alive).length,
          stuck:s.getPopulationState().states.stuck});
      `);
    }
    const natural=await evalScene(`
      const w=s.populationWorld,t=window.__natural;
      const events=[...t.events.values()].filter(e=>e.day*1440+e.minute>t.start);
      const trades=[...t.trades.values()].filter(e=>e.day*1440+e.minute>t.start);
      const counts=Object.fromEntries([...new Set(events.map(e=>e.type))].sort()
        .map(type=>[type,events.filter(e=>e.type===type).length]));
      const groups={}, cells={};
      for(const n of w.npcs){
        if(!n.alive||n.underground)continue;
        const d=s.regionAtPoint(n.x,n.y),cell=Math.floor(n.x/256)+':'+Math.floor(n.y/256);
        groups[d]=(groups[d]??0)+1;cells[cell]=(cells[cell]??0)+1;
      }
      const engaged=type=>new Set(events.filter(e=>type.test(e.type)).map(e=>e.actorId).filter(Boolean)).size;
      const tradeActors=new Set(trades.flatMap(e=>[e.buyerId,e.sellerId]).filter(id=>s.scheduler.byId.has(id))).size;
      const recipeEvents=events.filter(e=>e.type==='resident-production');
      const produced={}, consumed={};
      for(const event of recipeEvents){
        const {input,output,count}=event.data;
        produced[output]=(produced[output]??0)+count;
        for(const [id,quantity] of input)consumed[id]=(consumed[id]??0)+quantity;
      }
      const harvest=events.filter(e=>e.type==='farm-harvest');
      if(harvest.length){
        produced.ration=harvest.reduce((sum,e)=>sum+Number(/thu hoạch ([0-9]+)/.exec(e.description)?.[1]??0),0);
        consumed.rice_seed=harvest.length;
      }
      return {minutes:w.clock.day*1440+w.clock.minute-t.start,alive:w.npcs.filter(n=>n.alive).length,
        dead:w.npcs.filter(n=>!n.alive&&!n.ascended).length,
        demographics:w.populationLife.counts,eventCounts:counts,
        missionCount:(w.commissions?.length??0)+(w.sectMissions?.length??0)+(s.sectCampus.state.orders?.length??0)+Object.keys(w.civic?.contracts??{}).length,
        expeditionCount:w.expeditions?.serial??0,civic:w.civic?.stats,
        professions:w.npcs.reduce((r,n)=>(r[n.profession]=(r[n.profession]??0)+1,r),{}),
        huntsStarted:engaged(/hunt|fauna-loot-claimed/),huntsWon:events.filter(e=>e.type==='fauna-defeated').length,
        harvestWorkers:engaged(/harvest|gather/),missionActors:engaged(/mission|commission|contract|sect-campus-(accepted|completed)/),
        tradeCount:trades.length,tradeActors,resourcesExchanged:trades.reduce((by,tx)=>(by[tx.itemId]=(by[tx.itemId]??0)+tx.count,by),{}),
        totalWealth:w.npcs.reduce((sum,n)=>sum+n.spiritStones,0),
        breakthroughs:events.filter(e=>/npc-(breakthrough$|minor-advance)/.test(e.type)).length,
        gainedPower:w.heaven.divineLedger.earned-t.before,produced,consumed,
        topRegions:Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,8),
        maximumGridCrowd:Math.max(...Object.values(cells)),
        moved:w.npcs.filter(n=>t.actors.has(n.id)&&Math.hypot(n.x-t.actors.get(n.id).x,n.y-t.actors.get(n.id).y)>60).length,
        milestones:t.milestones};
    `);
    assert.ok(natural.minutes>=2880);
    assert.ok(natural.moved>=25);
    await writeFile(join(output,naturalTarget===180?'natural.json':`natural-${naturalTarget}.json`),JSON.stringify(natural,null,2)+'\n');
  }
  if(process.argv.includes('--controlled')){
    await visit('/?testMode=1&populationTest=108',ready);
    const saved=await evalScene(`
      const w=structuredClone(s.populationWorld);
      delete w.populationLife;
      for(const n of w.npcs)delete n.personalGoal;
      for(const shop of w.shops.filter(shop=>shop.id.startsWith('regional:')))w.shops.find(shop=>shop.id==='city-market').cash+=shop.cash;
      w.shops=w.shops.filter(shop=>!shop.id.startsWith('regional:'));
      const dead=w.npcs[0],holder=w.npcs[1];
      Object.assign(dead,{alive:false,hp:0});
      holder.spiritStones=321;
      holder.inventory.push({itemId:'ration',count:17});
      w.heaven.divinePower=137;
      delete w.heaven.divineLedger;
      w.clock.paused=true;
      localStorage.setItem('world-rebuild-1c-v1',JSON.stringify(w));
      return {dead:dead.id,holder:holder.id};
    `);
    await visit('/?testMode=1',ready);
    const migrated=await evalScene(`
      const w=s.populationWorld,[dead,holder]=${JSON.stringify([saved.dead,saved.holder])}.map(id=>w.npcs.find(n=>n.id===id));
      return {total:w.npcs.length,alive:w.npcs.filter(n=>n.alive).length,power:w.heaven.divinePower,
        dead:!dead.alive,purse:holder.spiritStones,inventory:holder.inventory.some(i=>i.itemId==='ration'&&i.count===17)};
    `);
    assert.deepEqual(migrated,{total:180,alive:179,power:137,dead:true,purse:321,inventory:true});
    await visit('/?testMode=1',ready);
    assert.equal(await evalScene('return s.populationWorld.populationLife.cohort;'),72);
    const sample=await evalScene(`
      const w=s.populationWorld;
      const city=w.npcs.filter(n=>n.lifeOrigin?.district==='city');
      const [a,b]=city;
      Object.assign(a,{age:26,gender:'nữ',spiritStones:20,relationships:{[b.id]:50}});
      a.aiProfile.axes.sociability=75;
      Object.assign(b,{age:27,gender:'nam',spiritStones:22,relationships:{[a.id]:50},home:{...a.home}});
      w.clock.day=7;
      s.lifeDirector.settleDaily();
      const h=Object.values(w.populationLife.households).find(h=>h.partners.includes(a.id));
      if(!h)throw Error('No household');
      w.clock.day=60;
      s.lifeDirector.settleDaily();
      const child=w.npcs.find(n=>h.children.includes(n.id));
      if(!child)throw Error('No newborn');
      s.selectNPC(a.id);
      return {child:child.id,kin:child.parents,sprite:s.npcSprites.has(child.id),
        scheduler:s.scheduler.byId.has(child.id),fund:h.fund,inRoster:w.npcs.includes(child)};
    `);
    assert.equal(sample.kin.length,2);
    assert.equal(sample.sprite,true);
    assert.equal(sample.scheduler,true);
    assert.equal(sample.inRoster,true);
    await run("document.querySelector('[data-profile=genealogy]').open=true; document.querySelector('[data-profile=biography]').open=true");
    await sleep(500);
    assert.match(await run("document.querySelector('[data-profile=genealogy]').textContent"),/Bạn đời.*Con /s);
    await shot('gia-pha-npc');
    const departure=await evalScene(`
      const w=s.populationWorld,n=w.npcs.find(n=>n.vocation==='wanderer');
      n.emigration={reason:'Tiếp tục du hành',point:{x:n.x,y:n.y},expires:w.clock.day+4};
      s.lifeDirector.tick();
      const stored=w.populationLife.departed[n.id];
      return {alive:stored?.npc.alive,removed:!s.scheduler.byId.has(n.id)&&!s.npcSprites.has(n.id),
        recorded:w.events.at(-1).type,power:w.heaven.divinePower};
    `);
    assert.deepEqual(departure,{alive:true,removed:true,recorded:'resident-emigration',power:137});
    const mining=await evalScene(`
      const w=s.populationWorld,c=s.civic,u=s.underground;
      const employer=w.npcs.find(n=>n.lifeOrigin?.district==='city');
      const employee=w.npcs.find(n=>n.vocation==='miner');
      const site=[...c.veins.sites.values()].find(v=>v.grade===1&&v.state.amount>=2&&u.sites.has(v.id));
      if(!site)throw Error('No mine to stage the contract test');
      Object.assign(site.state,{owner:employer.id,controller:employer.id,discovered:true});
      Object.assign(employee,{x:site.point.x,y:site.point.y,hunger:0,fatigue:0,hp:200,
        goalAction:'idle',decisionSlot:undefined,marketVisit:undefined,convalescence:undefined});
      const beforeEmployer=employer.spiritStones,beforeWorker=employee.spiritStones,beforeOre=site.state.amount;
      const contract=c.offer(employer,site,{mode:'wage',price:8,quantity:2});
      if(!contract||!c.accept(employee,contract))throw Error('Mining contract not accepted: '+JSON.stringify({site:site.id,busy:c.busy(employee)}));
      const local=u.sites.get(site.id),state=u.instance(local),node=local.map.nodes.find(n=>state.stock[n.id]>=2)??local.map.nodes.find(n=>state.stock[n.id]>0);
      const rem=contract.quantity-(state.stock[node.id]??0);
      for(const item of [node,...local.map.nodes.filter(o=>o!==node)]){
        if(contract.collected>=contract.quantity)break;
        employee.underground={siteId:site.id,floor:item.level,x:item.x,y:item.y,job:{type:'contract',id:contract.id}};
        contract.collected+=u.mine(employee,local,state,item,contract.quantity-contract.collected);
      }
      delete employee.underground;
      Object.assign(employee,contract.receipt);
      const payment=c.settle(employee,contract),replay=c.settle(employee,contract);
      return {payment,replay,paid:employee.spiritStones-beforeWorker,cost:beforeEmployer-employer.spiritStones,
        ore:beforeOre-site.state.amount,status:contract.status};
    `);
    assert.deepEqual(mining,{payment:true,replay:false,paid:8,cost:8,ore:2,status:'completed'});
    const smithing=await evalScene(`
      const w=s.populationWorld,n=w.npcs.find(n=>n.vocation==='smith');
      const at=n.workPosition;
      Object.assign(n,{x:at.x,y:at.y,hp:200,hunger:0,fatigue:0,goalAction:'idle',action:'idle',
        decisionSlot:undefined,marketVisit:undefined,craftOrder:undefined,craftStock:0,
        inventory:[{itemId:'iron_ore',count:1},{itemId:'boar_tusk',count:1}]});
      w.clock.minute=620;
      for(let i=0;i<127&&!n.craftStock;i++){
        s.populationLivelihoods.tick();
        w.clock.minute++;
      }
      const change=w.populationLife.recently.findLast(e=>e.actorId===n.id&&e.type==='resident-production');
      return {metal:n.inventory.find(i=>i.itemId==='iron_ore')?.count??0,
        tusk:n.inventory.find(i=>i.itemId==='boar_tusk')?.count??0,
        output:n.inventory.find(i=>i.itemId==='iron_dao')?.count??0,site:change?.data.output};
    `);
    assert.equal(smithing.output,2);
    assert.equal(smithing.metal,0);
    assert.equal(smithing.tusk,0);
    assert.equal(smithing.site,'iron_dao');
    const immigration=await evalScene(`
      const w=s.populationWorld, baseline=w.populationLife.counts.immigration;
      const gone=w.npcs.filter(n=>n.alive&&!n.authorityRole&&n.vocation==='citizen').slice(0,5);
      for(const n of gone)Object.assign(n,{alive:false,hp:0});
      w.clock.day++;
      s.lifeDirector.settleDaily();s.lifeDirector.settleDaily();
      const placed=w.npcs.filter(n=>n.lifeOrigin?.kind==='immigration');
      return {count:w.populationLife.counts.immigration-baseline,deadPreserved:gone.every(n=>!n.alive),
        registered:placed.every(n=>s.scheduler.byId.has(n.id)&&s.npcSprites.has(n.id)),placed:placed.length};
    `);
    assert.deepEqual(immigration,{count:2,deadPreserved:true,registered:true,placed:2});
    await writeFile(join(output,'controlled.json'),JSON.stringify({migrated,sample,departure,mining,smithing,immigration},null,2)+'\n');
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  console.log(JSON.stringify(benchmarks,null,2));
} finally {
  ws?.close();
  chrome.kill();
}
