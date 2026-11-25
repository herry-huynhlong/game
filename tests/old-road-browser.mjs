import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9357);
const output=resolve('art/previews/old-road');
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
  const layout=await evalScene(`
    const marks=Object.fromEntries(s.markers.map(m=>[m.id,m])), world=s.populationWorld;
    const city=marks['gate-south'],sect=marks['sect-gate'],n=world.npcs.find(n=>n.alive);
    s.routeDeadline=undefined;
    const connection=s.populationRoute(n,city,sect)?.map(p=>({x:p.x,y:p.y}));
    s.npcRoutes.delete(n.id);
    const back=s.populationRoute(n,sect,city)?.length??0;
    s.npcRoutes.delete(n.id);
    return {width:s.worldWidth,height:s.worldHeight,layoutVersion:world.layoutVersion,actors:world.npcs.length,
      fauna:world.environment.fauna.length,newFauna:world.environment.fauna.filter(f=>f.zoneId.startsWith('old-road-')),
      nodes:world.environment.resourceNodes.filter(n=>n.id.startsWith('old-road-')).length,
      timber:world.environment.timberSources.filter(x=>x.region==='outer-wood').length,
      city,sect,connection,back,atlas:s.terrainCache?.tileVariants??0,
      sites:['old-road','outer-wood','old-road-pavilion','sect-gate','sect-counter','quest-office','sect-ore-0','sect-ore-1','sect-ore-2']
        .map(id=>({id,reachable:s.canReachPoint(city,marks[id])}))};
  `);
  await writeFile(join(output,'layout.json'),JSON.stringify(layout,null,2));
  console.log('layout',layout.width,layout.height,layout.layoutVersion,layout.actors,layout.fauna,layout.nodes,layout.timber,layout.connection?.length,layout.back,layout.atlas);
  assert.deepEqual([layout.width,layout.height,layout.layoutVersion,layout.actors],[7168,5888,2,108]);
  assert.equal(layout.newFauna.length,8);
  assert.ok(layout.newFauna.every(f=>f.rank==='normal'));
  assert.ok(layout.connection?.length>1&&layout.back>1&&layout.sites.every(row=>row.reachable));
  assert.ok(layout.timber>0&&layout.nodes===8);
  const frame=async(name,position,zoom)=>{
    await evalScene(`
      const p=${JSON.stringify(position)};
      s.setZoom(${zoom});s.cameraTween?.stop();s.cameraTween=null;
      s.cameras.main.centerOn(p.x,p.y);s.clampCamera();
    `);
    await sleep(400);await shot(name);
  };
  await evalScene('s.showWorldOverview();');
  await sleep(350);await shot('01-world');
  await frame('02-old-road',{x:3570,y:4210},.96);
  await frame('03-outer-wood',{x:3040,y:4160},1.27);
  await frame('04-pavilion',{x:3820,y:4305},1.6);
  await frame('05-fauna',layout.newFauna.find(f=>f.species==='boar'),1.43);
  await frame('06-sect-gate',{x:3552,y:5260},1.07);
  await frame('07-pond',{x:4550,y:4218},1.25);
  const mapPanel=await evalScene(`
    const canvas=s.minimap.cached.canvas,block=s.minimap.root.querySelector('.wm-stage').getBoundingClientRect();
    const checked=[['Thanh Vân Cổ Đạo',3701,4600],['Thanh Vân Ngoại Lâm',3070,4092],
      ['Sơn Môn',3552,5319],['Thanh Vân Tông',3552,5630]];
    return {dimensions:[canvas.width,canvas.height],ratio:block.width/block.height,
      titles:checked.map(([name,x,y])=>[name,s.minimap.regionAt(x,y)?.name])};
  `);
  assert.deepEqual(mapPanel.dimensions,[448,368]);
  assert.ok(Math.abs(mapPanel.ratio-224/184)<.02&&mapPanel.titles.every(([expected,actual])=>expected===actual));

  const walk=await evalScene(`
    s.sys.pause();
    const w=s.populationWorld;
    let now=s.time.now;
    w.clock.speed=4;
    for(let i=0;i<120;i++){now+=250;s.time.now=now;s.updatePopulation(now,250);}
    w.clock.speed=1;
    const n=w.npcs.find(x=>x.populationRole==='independent_cultivator'&&x.alive&&!x.flight&&!x.skyStep&&!x.tribulation);
    const from=${JSON.stringify(layout.city)},to=${JSON.stringify(layout.sect)};
    Object.assign(n,{x:from.x,y:from.y,flight:undefined,skyStep:undefined,hp:100});
    s.npcSprites.get(n.id).setPosition(n.x,n.y);
    w.heaven.divinePower=100;s.selectNPC(n.id);s.beginPossession();s.syncGroundOccupancy();
    s.routeDeadline=undefined;
    let path=s.populationRoute(n,n,to)?.concat(to)??[];
    let i=0,steps=0,minGap=0,maxStep=0,repaths=0,best=Infinity,withoutProgress=0;
    while(i<path.length&&steps<3600){
      const dx=path[i].x-n.x,dy=path[i].y-n.y;
      const gap=Math.hypot(dx,dy);
      if(gap<6){i++;best=Infinity;withoutProgress=0;continue;}
      if(gap<best-5){best=gap;withoutProgress=0;}else withoutProgress++;
      const prev={x:n.x,y:n.y};
      s.keys.A.isDown=dx<-3;s.keys.D.isDown=dx>3;s.keys.W.isDown=dy<-3;s.keys.S.isDown=dy>3;
      now+=24;s.time.now=now;s.updatePopulation(now,24);
      const delta=Math.hypot(n.x-prev.x,n.y-prev.y);
      maxStep=Math.max(delta,maxStep);
      minGap=delta<.05?minGap+1:0;
      if(minGap>=35||withoutProgress>55){
        s.npcRoutes.delete(n.id);s.routeDeadline=undefined;
        const alternative=s.populationRoute(n,n,to,true);
        if(alternative?.length&&repaths<22){
          path=alternative.concat(to);repaths++;i=0;minGap=0;withoutProgress=0;best=Infinity;continue;
        }
        const body=s.groundOccupancy.bodies.get(n.id);
        const index=s.groundOccupancy.near(n.x,n.y,75);
        return {y:n.y,distance:Math.hypot(n.x-to.x,n.y-to.y),steps,maxStep,blocked:{p:path[i],neighbors:[...index].filter(b=>b.id!==body.id).map(b=>[b.id,b.x,b.y])}};
      }
      steps++;
    }
    return {x:n.x,y:n.y,distance:Math.hypot(n.x-to.x,n.y-to.y),steps,maxStep,repaths,region:s.regionAtCamera()};
  `);
  console.log('walk',JSON.stringify(walk));
  assert.ok(walk.distance<16&&walk.steps>650&&walk.maxStep<3.1);
  await evalScene(`
    for(const k of ['A','D','W','S'])s.keys[k].isDown=false;
    s.endPossession();
  `);
  await run('localStorage.clear()');
  await visit('/?testMode=1',ready);

  await evalScene(`
    s.sys.pause();s.populationWorld.clock.speed=4;
    window.roadTime=s.time.now;
    window.travelers={};
    window.advanceRoad=mins=>{
      const world=s.populationWorld;
      for(let i=0;i<mins;i++){
        window.roadTime+=250;s.time.now=window.roadTime;s.updatePopulation(s.time.now,250);
        if(i%4!==0)continue;
        for(const n of world.npcs)if(n.alive&&n.y>=3904&&n.y<5184&&n.x>2050&&n.x<4950){
          const track=window.travelers[n.id]??={role:n.populationRole,visits:0,first:{x:n.x,y:n.y}};
          track.visits++;track.last={x:n.x,y:n.y};
        }
      }
      const campus=s.sectCampus;
      const motion=s.getPopulationState();
      return {day:world.clock.day,minute:world.clock.minute,
        orders:campus.state.orders.map(q=>({type:q.type,outside:q.outside,status:q.status,assignee:q.assignee,collected:q.collected,
          dispatched:q.dispatched,held:q.progress,turnedIn:q.turnedIn,defeated:q.defeated,prey:q.prey})),
        nodes:world.environment.resourceNodes.filter(n=>n.id.startsWith('old-road-')).map(n=>({id:n.id,harvests:n.harvestCount??0})),
        trades:world.economy.transactions.filter(t=>t.shopId==='sect-treasure-pavilion'),travelers:window.travelers,
        living:world.environment.fauna.filter(f=>f.alive).length,stuck:motion.states.stuck,
        stuckExamples:motion.diagnostics.stuckExamples};
    };
  `);
  let simulation;
  for(let day=0;day<4;day++){
    for(let step=0;step<8;step++)simulation=await evalScene('return window.advanceRoad(180);');
    console.log('day',day+1,JSON.stringify(simulation.orders));
  }
  const saved=await evalScene(`
    const w=s.populationWorld,n=w.npcs.find(n=>n.populationRole==='low_disciple');
    s.persistPopulation();
    const raw=localStorage.getItem('world-rebuild-1c-v1');
    const save=JSON.parse(raw),a=save.npcs.find(npc=>npc.id===n.id);
    return {raw,id:n.id,home:a.home,inventory:a.inventory,layout:save.layoutVersion};
  `);
  assert.equal(saved.layout,2);
  await run('localStorage.setItem("world-rebuild-1c-v1",'+JSON.stringify(saved.raw)+')');
  await visit('/?testMode=1',ready);
  const reload=await evalScene(`
    const w=s.populationWorld,n=w.npcs.find(n=>n.id===${JSON.stringify(saved.id)});
    return {home:n.home,inventory:n.inventory,layout:w.layoutVersion,orders:w.sectCampus.orders.length};
  `);
  assert.deepEqual(reload.home,saved.home);
  assert.deepEqual(reload.inventory,saved.inventory);
  assert.equal(reload.layout,2);
  assert.equal(reload.orders,simulation.orders.length);
  await writeFile(join(output,'verification.json'),JSON.stringify({layout,mapPanel,walk,simulation,reload,errors,failed},null,2));
  assert.ok(simulation.orders.some(q=>q.type==='herbs'&&q.outside&&q.status==='completed'&&q.collected>=2));
  assert.ok(simulation.nodes.some(n=>n.harvests>0));
  assert.ok(simulation.orders.some(q=>q.type==='hunt'&&q.status==='completed'&&q.prey?.includes('old-road-')&&q.defeated>0));
  assert.ok(simulation.orders.some(q=>q.type==='city-courier'&&q.status==='completed'&&q.dispatched));
  assert.ok(Object.values(simulation.travelers).some(t=>t.role==='commoner'&&t.visits>4));
  assert.ok(simulation.trades.some(t=>t.buyerId.includes(':merchant:')||t.sellerId.includes(':merchant:')));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
