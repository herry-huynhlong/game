import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9471);
const output=resolve('art/previews/van-ly-son-ha');
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
  const before=process.argv.includes('--before');
  const prefix=before?'before':'after';
  const ready="Boolean(window.__worldRebuild?.ready())";
  await visit('/?testMode=1',ready);
  const mapPoints={
    'toan-canh':[5632,5024,.093],
    'tay-hoang':[2048,3200,.20],
    'tay-nam':[2420,7960,.22],
    'dong-hoang':[10400,3472,.17],
    'dong-nam':[10304,8200,.27],
    'nam-hoang':[7090,9240,.37],
  };
  for(const [label,[x,y,zoom]] of Object.entries(mapPoints)){
    await evalScene(`
      s.cameraTween?.stop();s.cameraTween=null;
      s.cameras.main.setZoom(${zoom}).centerOn(${x}-s.westOffsetX,${y});
      s.clampCamera();s.updateSceneryVisibility();s.refreshFaunaVisibility();
    `);
    await sleep(300);
    await shot(prefix+'-'+label);
  }
  await sleep(500);
  const benchmark=await run(`new Promise(resolve=>{
    const data=[];let start,last;
    const sample=t=>{
      start??=t;if(last!==undefined)data.push(t-last);last=t;
      if(t-start<2200)requestAnimationFrame(sample);
      else {data.sort((a,b)=>a-b);resolve({fps:data.length*1000/(t-start),p95:data[Math.floor(data.length*.95)]});}
    };requestAnimationFrame(sample);
  })`);
  let ecology,runStats,preservation,preview,waterMotion;
  if(!before){
    ecology=await evalScene(`
      const w=s.populationWorld, layer=name=>s.map.getObjectLayer(name)?.objects??[];
      const origin=s.markers.find(m=>m.id==='gate-south-outside');
      const marked=layer('NavigationMarkers').filter(o=>s.prop(o,'shanhe'));
      const routes=Object.fromEntries(marked.map(o=>[s.prop(o,'markerId'),s.canReachPoint(origin,o)]));
      const paths=Object.fromEntries(['sw-valley','south-flowers','se-antiquities'].map(id=>
        [id,s.findNavigationPath('gate-south-outside',id)?.length??0]));
      const zones=s.faunaZones.filter(z=>z.extraShanhe);
      const beasts=w.environment.fauna.filter(f=>zones.some(z=>z.zoneId===f.zoneId));
      return {routes,paths,population:w.npcs.length,fauna:beasts.filter(x=>x.alive).length,
        resources:s.westTreasures.system.nodes.filter(n=>n.id.startsWith('shanhe:')).length,
        waterfall:layer('FlowEffects').filter(o=>s.prop(o,'kind')==='shanhe-waterfall').length,
        waves:s.flowSprites.filter(sp=>sp.getData('waterKind')==='shanhe-ripple').length,
        cave:s.underground.describe('shanhe-linh-nham'),chest:s.objectSprites.some(sp=>sp.name==='Rương Nam Sa'),
        minimap:Boolean(s.minimap.cached?.canvas),atlas:s.terrainCache?.tileVariants??0,
        blockedByNewTerrain:w.npcs.filter(n=>n.alive&&!n.underground&&!n.wallLevel&&
          s.collisionRects.some(r=>r.kind?.startsWith('shanhe-')&&n.x>r.x&&n.x<r.x+r.width&&n.y>r.y&&n.y<r.y+r.height)).length,
      };
    `);
    console.log(JSON.stringify(ecology));
    assert.equal(ecology.population,108);
    assert.ok(Object.values(ecology.routes).every(Boolean),JSON.stringify(ecology.routes));
    assert.ok(Object.values(ecology.paths).every(Boolean));
    assert.ok(ecology.fauna>=36&&ecology.resources>=16&&ecology.waves>0);
    assert.ok(ecology.cave?.floors>0&&ecology.chest&&ecology.minimap&&ecology.atlas>0);
    assert.equal(ecology.blockedByNewTerrain,0);
    await evalScene(`
      s.cameraTween?.stop();s.cameraTween=null;
      s.cameras.main.setZoom(.58).centerOn(7770-s.westOffsetX,9228);
      s.clampCamera();
    `);
    await sleep(230);
    const waves=()=>evalScene(`
      return s.flowSprites.filter(p=>p.getData('waterKind')==='shanhe-ripple'&&p.visible)
        .map(p=>[p.texture.key,Number(p.frame.name)]);
    `);
    const waveStart=await waves();
    await shot('after-thanh-thuy-ho-1');
    await sleep(370);
    const waveEnd=await waves();
    waterMotion=waveStart.filter((p,i)=>p[0]==='rebuild-water-motion'&&waveEnd[i]?.[1]!==p[1]).length;
    assert.ok(waterMotion>0);
    await shot('after-thanh-thuy-ho-2');
    await evalScene("s.underground.view.show('shanhe-linh-nham',0);");
    await sleep(230);
    await shot('after-hang-linh-nham');
    await evalScene("s.underground.view.hide();");
    const fixture=await evalScene(`
      const w=s.populationWorld,n=w.npcs[0],cliff=s.collisionRects.find(r=>r.kind==='shanhe-cliff');
      const snapshot={id:n.id,realm:n.realmIndex,worldId:w.worldId,inventory:structuredClone(n.inventory),
        appearance:structuredClone(n.modularAppearance),relationships:structuredClone(n.relationships)};
      n.x=cliff.x+16;n.y=cliff.y+16;
      if(!s.persistPopulation())throw new Error('Could not save migration fixture');
      return snapshot;
    `);
    await visit('/?testMode=1&region=south-flowers',ready);
    preservation=await evalScene(`
      const w=s.populationWorld,n=w.npcs[0];
      const clear=s.footprintTerrainOpen(n.x,n.y,8,5);
      return {id:n.id,realm:n.realmIndex,worldId:w.worldId,inventory:n.inventory,appearance:n.modularAppearance,
        relationships:n.relationships,clear};
    `);
    assert.equal(fixture.id,preservation.id);
    assert.equal(fixture.realm,preservation.realm);
    assert.equal(fixture.worldId,preservation.worldId);
    assert.deepEqual(preservation.inventory,fixture.inventory);
    assert.deepEqual(preservation.appearance,fixture.appearance);
    assert.deepEqual(preservation.relationships,fixture.relationships);
    assert.equal(preservation.clear,true);
    for(let i=0;i<3;i++)await evalScene(`
      const w=s.populationWorld;s.sys.pause();
      w.clock.speed=4;w.clock.paused=false;
      let now=s.time.now;
      const visits=window.__shanheVisits??={};
      for(let minute=0;minute<600;minute++){
        now+=250;s.time.now=now;s.updatePopulation(now,250);
        if(minute%5===0)for(const n of w.npcs){
          const party=s.expeditions.of(n);
          if(!party||!/^(sw-|se-|south-)/.test(party.job.region??'')||
            !['outbound','field'].includes(party.phase)||Math.hypot(n.x-party.job.field.x,n.y-party.job.field.y)>92)continue;
          visits[n.id]={name:n.name,region:party.job.region,x:Math.round(n.x),y:Math.round(n.y)};
        }
      }
    `);
    runStats=await evalScene(`
      const w=s.populationWorld;
      const parties=w.expeditions.parties.filter(p=>/^(sw-|se-|south-)/.test(p.job.region??''));
      const visits=w.npcs.filter(n=>n.y>=8650);
      return {day:w.clock.day,minute:w.clock.minute,
        endPosition:visits.map(n=>[n.name,Math.round(n.x),Math.round(n.y)]),visitors:Object.values(window.__shanheVisits??{}),
        parties:parties.map(p=>({region:p.job.region,kind:p.job.kind,phase:p.phase,count:p.initialCount??p.members.length,
          paid:p.paid??0,item:p.item,reason:p.failureReason}))};
    `);
    assert.ok(runStats.visitors.length>0&&runStats.parties.some(p=>p.phase==='completed'));
    await visit('/shanhe-preview.html','Boolean(window.__shanhePreviewReady)');
    await shot('after-world-preview');
    preview=await run(`
      for(const id of ['biomes','collision','navigation','npcs','monsters','empty']){
        const box=document.querySelector('[data-layer="'+id+'"]');box.checked=true;box.dispatchEvent(new Event('change'));
      }
      document.querySelectorAll('[data-layer]').length
    `);
    assert.equal(preview,11);
    await shot('after-world-preview-debug');
  }
  await writeFile(join(output,prefix+'-benchmark.json'),JSON.stringify({benchmark,ecology,runStats,preservation,preview,waterMotion,errors,failed},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
} finally{
  if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({id:999999,method:'Browser.close'}));
  ws?.close();
  chrome.kill();
}
