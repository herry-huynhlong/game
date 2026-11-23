import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9259);
const output=resolve('art/previews/city-redesign');
const profile=await mkdtemp(join(tmpdir(),'tvk-lod-'));
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
  await send('Page.navigate',{url:origin+'/?testMode=1'});await ready();
  const before=process.env.CITY_BEFORE==='1';
  const capture=async(name,x,y,zoom,collision=false)=>{
    await evalScene(`s.cameraTween?.stop();s.cameraTween=null;s.setCollisionVisible(${collision});s.setZoom(${zoom});s.cameras.main.centerOn(${x},${y});s.clampCamera();`);
    await sleep(500);
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,(before?'before-':'')+name+'.png'),Buffer.from(shot.data,'base64'));
  };
  await send('Emulation.setDeviceMetricsOverride',{width:1560,height:1000,deviceScaleFactor:1,mobile:false});
  await sleep(450);
  await capture('city',3456,2160,.45);
  await capture('market',4370,1920,1.18);
  if(!before){
    await capture('residences',2752,1660,.94);
    await capture('palace',3952,1620,1.24);
    await capture('navigation',4200,1960,1,true);
    await evalScene('s.populationWorld.clock.minute=1180;');
    await capture('market-night',4370,1920,1.18);
    const navigation=await evalScene(`
      const targets=s.markers.filter(m=>m.region==='city');
      const routes=[['gate-north','gate-south'],['gate-east','gate-west'],...targets.map(m=>['city-center',m.id])];
      const invalid=targets.filter(m=>!s.footprintTerrainOpen(m.x,m.y,9,5)).map(m=>m.id);
      return {targets:targets.length,invalid,unreachable:routes.filter(([a,b])=>!s.findNavigationPath(a,b)),
        detour:(()=>{
          for(const wall of s.collisionRects.filter(r=>r.kind==='city-redesign-solid'&&r.width>100&&r.height>45)){
            const y=wall.y+wall.height/2,actor={id:'test-city-detour',x:wall.x-28,y,alive:true},target={x:wall.x+wall.width+28,y};
            if(!s.canOccupy(actor.x,actor.y)||!s.canOccupy(target.x,target.y))continue;
            const deadline=s.routeDeadline;s.routeDeadline=undefined;
            const path=s.populationRoute(actor,actor,target);
            s.routeDeadline=deadline;s.npcRoutes.delete(actor.id);
            if(!path||path.length<3)continue;
            const grid=new s.groundOccupancy.constructor((x,y,w,h)=>s.footprintTerrainOpen(x,y,w,h));
            grid.sync([actor],[]);
            const body=grid.bodies.get(actor.id);
            for(const point of [...path,target])grid.advance(body,point.x,point.y,false);
            if(Math.hypot(body.x-target.x,body.y-target.y)<2)return {waypoints:path.length,building:wall.name};
          }
          return null;
        })(),
        players:s.populationWorld.npcs.length,cache:s.terrainCache?.tileVariants??0,objectCount:s.children.list.length,
        minimap:s.minimap.mapData?.tilesets.some(t=>t.name==='QingyunCourtyardGround')??false};
    `);
    assert.equal(navigation.players,108);
    assert.deepEqual(navigation.invalid,[]);
    assert.deepEqual(navigation.unreachable,[]);
    assert.ok(navigation.minimap&&navigation.cache);
    assert.ok(navigation.detour,'route and footprint go around a new building');
    const market=await run(`(async()=>{
      ${scene}
      const w=s.populationWorld,inMarket=n=>n.x>=4032&&n.x<=4736&&n.y>=1696&&n.y<=2130;
      w.clock.minute=480;w.clock.speed=4;
      const starts=new Map(w.npcs.map(n=>[n.id,{x:n.x,y:n.y}]));
      const arrived=new Set(),movers=new Set(),stationUsers=new Set(),invalid=new Set();
      let maxOverlap=0,maxBlocked=0;
      const start=s.faunaNow();
      for(let i=0;i<360;i++){
        s.updatePopulation(performance.now(),250,250);
        if(i%12===0){
          for(const npc of w.npcs.filter(n=>n.alive&&inMarket(n))){
            arrived.add(npc.id);
            const from=starts.get(npc.id),body=s.groundOccupancy.bodies.get(npc.id);
            if(Math.hypot(npc.x-from.x,npc.y-from.y)>=16)movers.add(npc.id);
            if(npc.action==='trade'&&Math.hypot(npc.x-npc.actionTarget.x,npc.y-npc.actionTarget.y)<13)stationUsers.add(npc.id);
            if(body&&!s.footprintTerrainOpen(npc.x,npc.y,body.width/2,body.height/2))invalid.add(npc.id);
          }
          maxOverlap=Math.max(maxOverlap,s.groundOccupancy.overlaps().filter(([a,b])=>inMarket(a)&&inMarket(b)).length);
          maxBlocked=Math.max(maxBlocked,w.npcs.filter(n=>n.alive&&inMarket(n)&&n.pathBlocked).length);
          await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
      w.clock.speed=1;
      return {minutes:s.faunaNow()-start,visitors:arrived.size,movers:movers.size,tradersAtStation:stationUsers.size,maxOverlap,maxBlocked,invalid:[...invalid],effectMs:s.cityFxMs};
    })()`);
    console.log('City navigation and market simulation',navigation,market);
    assert.deepEqual(market.invalid,[]);
    assert.equal(market.maxOverlap,0);
    assert.ok(market.movers>=5);
    const inspected=await evalScene(`
      const n=s.populationWorld.npcs.find(n=>n.alive&&n.populationRole==='merchant');
      s.livingWorldPanel.focus(n);return n.id;
    `);
    await sleep(500);
    const camera=await evalScene(`
      const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(inspected)});
      const view=s.cameras.main.worldView;
      return s.selectedNpcId===n.id&&n.x>=view.x&&n.x<=view.right&&n.y>=view.y&&n.y<=view.bottom;
    `);
    assert.ok(camera,'citizen inspector follows the selected NPC');
    const actor=await evalScene(`
      const candidates=s.populationWorld.npcs.filter(n=>n.alive&&n.x>2200&&n.x<4700&&n.y>1320&&n.y<2950);
      const n=candidates.find(n=>[12,24,36].every(dx=>s.groundPositionOpen(n,n.x+dx,n.y)));
      if(!n)return null;s.selectNPC(n.id);s.beginPossession();return s.getPossessionState();
    `);
    assert.ok(actor?.active);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    await sleep(250);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    const moved=await evalScene('return s.getPossessionState()');
    assert.ok(moved.x-actor.x>6,'possessed NPC walks via keyboard inside the city');
    const fixture=await evalScene(`
      s.endPossession('Kiểm thử xong');
      Object.defineProperty(document,'hidden',{get:()=>true});
      const w=s.populationWorld,n=w.npcs.find(n=>n.id===${JSON.stringify(inspected)});
      const solid=s.collisionRects.find(r=>r.kind==='city-redesign-solid'&&r.width>=110);
      n.x=solid.x+solid.width/2;n.y=solid.y+solid.height/2;
      n.inventory.push({itemId:'ration',count:7});n.xp+=17;
      if(!s.persistPopulation())throw new Error('Cannot write migration fixture');
      return {id:n.id,x:n.x,y:n.y,xp:n.xp,inventory:n.inventory,seed:w.population.spawnSeed,ids:w.npcs.map(a=>a.id)};
    `);
    await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(document,'hidden',{get:()=>true})"});
    await send('Page.reload',{ignoreCache:true});
    await ready();
    const loaded=await evalScene(`
      const w=s.populationWorld,n=w.npcs.find(n=>n.id===${JSON.stringify(fixture.id)});
      return {x:n.x,y:n.y,xp:n.xp,inventory:n.inventory,seed:w.population.spawnSeed,ids:w.npcs.map(a=>a.id),checked:s.cityMigratedResidents,
        open:s.footprintTerrainOpen(n.x,n.y,9,5),connected:s.canReachPoint(s.markers.find(m=>m.id==='city-center'),n)};
    `);
    assert.equal(loaded.seed,fixture.seed);
    assert.equal(loaded.xp,fixture.xp);
    assert.deepEqual(loaded.ids,fixture.ids);
    assert.deepEqual(loaded.inventory,fixture.inventory);
    assert.ok(loaded.open&&loaded.connected&&loaded.checked>=1,JSON.stringify({from:[fixture.x,fixture.y],to:[loaded.x,loaded.y],open:loaded.open,connected:loaded.connected,checked:loaded.checked}));
    assert.ok(Math.hypot(loaded.x-fixture.x,loaded.y-fixture.y)<=120);
    await writeFile(join(output,'verification.json'),JSON.stringify({navigation,market,camera,possessionPixels:moved.x-actor.x,migration:{moved:loaded.checked,from:[fixture.x,fixture.y],to:[loaded.x,loaded.y],progressPreserved:true},errors,failed},null,2));
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
