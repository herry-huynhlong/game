import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9452);
const output=resolve('art/previews/mat-bang-thanh-van-tong');
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

  const ready="Boolean(window.__worldRebuild?.ready())";
  async function frame(name,x,y,zoom) {
    await evalScene(`
      const camera=s.cameras.main;
      s.cameraTween?.stop();s.cameraTween=null;
      camera.setZoom(${zoom}).centerOn(${x},${y});
      s.clampCamera();s.updateSceneryVisibility();
    `);
    await sleep(350);
    await shot(name);
  }
  const beforeCommit=process.env.TVK_PRIOR_MAP_REF;
  const beforePath=process.env.TVK_PRIOR_MAP_PATH;
  const baseline=beforePath||beforeCommit;
  const hallFrame=async(name)=>evalScene(`
    const p=s.sectCampus.site('leader'),c=s.cameras.main;
    s.cameraTween?.stop();s.cameraTween=null;
    c.setZoom(.72).centerOn(p.x,p.y+18);s.clampCamera();
    s.updateSceneryVisibility();
  `).then(()=>sleep(400)).then(()=>shot(name));
  let beforeFps;
  const fps=async()=>evalScene(`
    const samples=[...s.frameSamples].sort((a,b)=>a-b);
    return {fps:s.game.loop.actualFps,screen:[s.scale.width,s.scale.height],zoom:s.cameras.main.zoom,
      p95:samples[Math.floor(samples.length*.95)]??null};
  `);
  if(baseline){
    const oldMap=beforePath?await readFile(beforePath):
      execFileSync('git',['show',beforeCommit+':maps/world-rebuild-1b.tmj'],{maxBuffer:16*1024*1024});
    const receive=ws.onmessage;
    ws.onmessage=event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Fetch.requestPaused')send('Fetch.fulfillRequest',{
        requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:oldMap.toString('base64'),
      });
      else receive(event);
    };
    await send('Fetch.enable',{patterns:[{urlPattern:'*/maps/world-rebuild-1b.tmj'}]});
    await visit('/?testMode=1',ready);
    await evalScene(`
      s.populationWorld.clock.paused=true;
      s.worldHeight=10048;
      s.cameras.main.setBounds(s.worldMinX,0,s.worldWidth,s.worldHeight);
    `);
    await frame('01-toan-canh-truoc',3656,7616,.18);
    await hallFrame('02-tong-chu-dien-truoc');
    await evalScene('s.populationWorld.clock.paused=false;');
    await sleep(2500);
    beforeFps=await fps();
    await evalScene(`
      const w=s.populationWorld;
      w.clock.paused=true;
      const herb=w.environment.resourceNodes.find(n=>n.id==='sect-plot-0');
      Object.assign(herb,{amount:2,harvestCount:7});
      const house=w.environment.objects.find(o=>o.id==='sect-campus-forge');
      house.hp=103;house.status='damaged';
      w.npcs[0].relationships['campus-test']=51;
      w.npcs[0].inventory.push({itemId:'wood',count:5});
      s.persistPopulation();
    `);
    await send('Fetch.disable');
    ws.onmessage=receive;
  }
  await visit('/?testMode=1&campus=2d',ready+`&&(()=>{${scene}return s.prop(s.map,'sectLayoutVersion')===3&&s.minimap?.regions?.length>22})()`);
  const initial=await evalScene(`
    const c=s.sectCampus,w=s.populationWorld,g=c.site('gate'),jade=s.underground.sites.get('sect-jade');
    s.populationWorld.clock.paused=true;
    const markers=s.markers.filter(m=>m.id.startsWith('sect-')&&m.id.endsWith('-approach'));
    const courts=s.map.getObjectLayer('SectCourtyards').objects;
    const gap=(a,b)=>Math.hypot(Math.max(0,a.x-b.x-b.width,b.x-a.x-a.width),Math.max(0,a.y-b.y-b.height,b.y-a.y-a.height));
    const nearest=courts.map(a=>[a.name,Math.round(Math.min(...courts.filter(b=>b!==a).map(b=>gap(a,b))))]);
    return {world:[s.worldWidth,s.worldHeight],population:w.npcs.length,
      courts:{nearest,coverage:courts.reduce((area,c)=>area+c.width*c.height,0)/
        (s.markerRegion('sect-central').width*s.markerRegion('sect-central').height)},
      connected:markers.map(m=>[m.id,s.minimap.regionAt(m.x,m.y)?.id,s.footprintTerrainOpen(m.x,m.y,9,5),
        Boolean(s.findNavigationPath('sect-gate',m.id))]),
      blocked:[...c.points].filter(([,p])=>!s.canReachPoint(g,p)||!s.footprintTerrainOpen(p.x,p.y,9,5)).map(([id])=>id),
      bridge:s.footprintTerrainOpen(c.site('bridge').x,c.site('bridge').y,9,5),
      wet:s.footprintTerrainOpen(7038-s.westOffsetX,8000,9,5),
      jade:{id:jade.id,x:jade.point.x,y:jade.point.y,floors:jade.map.floors.length},
      migration:w.population.sectLayoutVersion,legacy: {
        herbs:w.environment.resourceNodes.find(n=>n.id==='sect-plot-0'),
        house:w.environment.objects.find(o=>o.id==='sect-campus-forge'),
        relation:w.npcs[0].relationships['campus-test'],
        inventory:w.npcs[0].inventory,
      },
    };
  `);
  console.log('layout',JSON.stringify(initial));
  assert.equal(initial.population,108);
  assert.equal(initial.connected.length,14);
  assert.deepEqual(initial.blocked,[]);
  assert.ok(initial.connected.every(([id,district,open,path])=>district===id.replace(/-approach$/,'')&&open&&path),JSON.stringify(initial.connected));
  assert.equal(initial.bridge,true);
  assert.equal(initial.wet,false);
  assert.equal(initial.jade.y,7560);
  assert.ok(initial.jade.floors>=1);
  await evalScene("s.gotoRegion('sect');");
  await sleep(500);
  const fit=await evalScene(`
    const r=s.markerRegion('sect'),v=s.cameras.main.worldView;
    return {zoom:s.cameras.main.zoom,allVisible:v.left<=r.x-r.width/2&&v.right>=r.x+r.width/2&&v.top<=r.y-r.height/2&&v.bottom>=r.y+r.height/2};
  `);
  assert.equal(fit.allVisible,true);
  if(baseline){
    assert.equal(initial.legacy.house.hp,103);
    assert.equal(initial.legacy.house.status,'damaged');
    assert.equal(initial.legacy.herbs.harvestCount,7);
    assert.equal(initial.legacy.herbs.amount,2);
    assert.equal(initial.legacy.herbs.y,7692);
    assert.equal(initial.legacy.relation,51);
    assert.ok(initial.legacy.inventory.some(i=>i.itemId==='wood'&&i.count===5));
  }
  await frame('03-toan-canh-sau',3120,6888,.18);
  await hallFrame('04-tong-chu-dien-sau');
  await frame('05-mat-bang-gan',3120,6810,.27);
  await frame('06-canh-tay',1940,7050,.62);
  await frame('07-canh-dong',4530,6490,.58);
  const boardWorks=await evalScene(`
    const c=s.sectCampus,p=c.site('quest-board'),n=c.disciples.find(n=>n.alive);
    const opened=c.interact({...n,x:p.x,y:p.y});
    const visible=opened&&c.panel.open&&c.panel.querySelector('h2')?.textContent==='Nhiệm Vụ Điện';
    if(c.panel.open)c.panel.close();
    return visible;
  `);
  assert.equal(boardWorks,true);

  const underground=await evalScene(`
    const u=s.underground,site=u.sites.get('sect-jade');
    const n=s.sectCampus.disciples.find(n=>n.alive&&!n.tribulation);
    const original={x:n.x,y:n.y,goal:n.actionTarget,action:n.action,short:n.shortGoal};
    Object.assign(n,{x:site.point.x+16,y:site.point.y});
    const sprite=s.npcSprites.get(n.id);sprite.setPosition(n.x,n.y);s.syncGroundOccupancy();
    const entered=u.enter([n],site),floor=n.underground?.floor??null;
    const {day,minute}=s.populationWorld.clock;
    if(entered)s.populationSimulation.tickNpc(n,1,day,minute);
    const isolated=entered&&n.actionTarget===null;
    const exited=entered&&u.exit(n,site),distance=Math.hypot(n.x-site.point.x,n.y-site.point.y);
    Object.assign(n,{x:original.x,y:original.y,actionTarget:original.goal,action:original.action,shortGoal:original.short});
    sprite.setPosition(n.x,n.y);s.syncGroundOccupancy();
    return {entered,floor,exited,distance,isolated};
  `);
  assert.ok(underground.entered&&underground.exited&&underground.isolated&&underground.floor===0&&underground.distance<=32,JSON.stringify(underground));
  await hallFrame('08-khung-so-sanh-hieu-nang');
  await evalScene('s.populationWorld.clock.paused=false;');
  await sleep(2500);
  const afterFps=await fps();
  await evalScene(`
    s.sys.pause();s.populationWorld.clock.speed=4;
    window.campusEvidence={time:s.time.now,arrivals:{},flow:{},patrols:{},stuck:{},campusStalls:{},doubleClaims:0,time0:s.populationWorld.clock.day*1440+s.populationWorld.clock.minute};
    window.campusSim=minutes=>{
      const test=window.campusEvidence,w=s.populationWorld;
      for(let i=0;i<minutes;i++){
        test.time+=250;s.time.now=test.time;s.updatePopulation(test.time,250);
        if(i%4!==0)continue;
        const p=s.getPopulationState();
        const seatIds=[...s.sectCampus.activityClaims.values()].map(c=>c.point.id);
        test.doubleClaims+=seatIds.length-new Set(seatIds).size;
        for(const sample of p.diagnostics.stuckExamples){
          test.stuck[sample.id]=(test.stuck[sample.id]??0)+1;
          const slot=s.scheduler.byId.get(sample.id)?.npc.decisionSlot;
          if(slot?.startsWith('sect-campus:')&&sample.noProgressMs>(test.campusStalls[slot]?.noProgressMs??0))
            test.campusStalls[slot]=sample;
        }
        for(const n of w.npcs){
          const slot=n.decisionSlot?.replace('sect-campus:','');
          const target=n.actionTarget;
          if(!n.decisionSlot?.startsWith('sect-campus:')||!target)continue;
          test.flow[slot]=(test.flow[slot]??0)+1;
          if(Math.hypot(n.x-target.x,n.y-target.y)>16||n.flight||n.underground||n.action==='travel')continue;
          (test.arrivals[slot]??={})[n.id]=true;
          if(slot==='gate-duty')(test.patrols[n.id]??={})[Math.round(target.x)+','+Math.round(target.y)]=true;
        }
      }
      return {elapsed:w.clock.day*1440+w.clock.minute-test.time0,
        arrivals:Object.fromEntries(Object.entries(test.arrivals).map(([k,ids])=>[k,Object.keys(ids).length])),
        flow:test.flow,patrols:Object.fromEntries(Object.entries(test.patrols).map(([id,v])=>[id,Object.keys(v)])),
        stuck:test.stuck,campusStalls:test.campusStalls,doubleClaims:test.doubleClaims,
        production:s.sectCampus.production.state.totals,population:w.npcs.length};
    };
  `);
  let simulation;
  for(let i=0;i<12;i++)simulation=await evalScene('return window.campusSim(120);');
  console.log('simulation',JSON.stringify(simulation));
  const report={initial,fit,boardWorks,underground,simulation,beforeFps,afterFps,errors,failed};
  await writeFile(join(output,'bao-cao-chrome.json'),JSON.stringify(report,null,2));
  await evalScene('s.populationWorld.clock.paused=true;s.sys.resume();s.drawSectCourtyards();');
  await frame('09-debug-dau-vet-va-san-vien',3120,6810,.23);
  assert.equal(simulation.elapsed,1440);
  assert.ok(simulation.arrivals['gate-duty']>=2);
  assert.ok(Object.values(simulation.patrols).some(points=>points.length>=2));
  assert.equal(simulation.doubleClaims,0);
  for(const service of ['training','lesson','library','alchemy','forge','quests','farm','law-duty','vault-duty'])
    assert.ok(simulation.arrivals[service]>0,service);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
} finally {
  ws?.close();
  chrome.kill();
}
