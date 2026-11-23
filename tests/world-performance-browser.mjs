import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9249);
const output=resolve('art/previews/world-performance');
const profile=await mkdtemp(join(tmpdir(),'tvk-lod-'));
await mkdir(output,{recursive:true});
const chrome=spawn(process.env.CHROME_EXE??'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-first-run',
  '--remote-debugging-port='+port,'--window-size=1320,1050','--user-data-dir='+profile,'about:blank',
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
  const pending=new Map(),errors=[],failed=[],frames=[];
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id){const req=pending.get(m.id);pending.delete(m.id);if(req)m.error?req.fail(Error(m.error.message)):req.ok(m.result)}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
    if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!m.params.response.url.endsWith('/favicon.ico'))failed.push(m.params.response.url);
    if(m.method==='Page.screencastFrame'){frames.push(m.params);void send('Page.screencastFrameAck',{sessionId:m.params.sessionId})}
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
  await evalScene('s.setZoom(.95);');
  await sleep(1600);
  const baseline=Boolean(process.env.PERF_BASELINE);
  await evalScene(`
    window.perfProbe={route:0,routeCalls:0,astar:0,npc:0,updates:0,ai:0,peakUpdate:0,saves:0,saveMs:0,render:0,renderFrames:0,longTasks:0};
    const probe=window.perfProbe;
    for(const [key,total,count] of [['populationRoute','route','routeCalls'],['updatePopulation','updates',null],['persistPopulation','saveMs','saves']]){
      const original=s[key];
      s[key]=function(...args){const started=performance.now(),prior=s.pathfindingCalls;try{return original.apply(this,args)}
        finally{const elapsed=performance.now()-started;probe[total]+=elapsed;if(count)probe[count]++;
          if(key==='populationRoute')probe.astar+=Math.max(0,s.pathfindingCalls-prior);
          if(key==='updatePopulation'){probe.peakUpdate=Math.max(elapsed,probe.peakUpdate);
            probe.npc+=s.lastNpcUpdates?.moved??108;}
        }
      };
    }
    const model=s.populationSimulation;
    for(const method of ${JSON.stringify(['tickShared','tickNpc'])}){
      const original=model[method];
      model[method]=function(...args){const started=performance.now();
        try{return original.apply(this,args)}finally{probe.ai+=performance.now()-started}
      };
    }
    let renderStart;
    s.game.events.on('prerender',()=>{renderStart=performance.now()});
    s.game.events.on('postrender',()=>{probe.render+=performance.now()-renderStart;probe.renderFrames++});
    if(PerformanceObserver.supportedEntryTypes.includes('longtask'))new PerformanceObserver(list=>probe.longTasks+=list.getEntries().length).observe({type:'longtask'});
  `);
  const metrics=await run(`new Promise(resolve=>{
    const frames=[];let start,last;
    function step(t){if(start===undefined){start=last=t}else{frames.push(t-last);last=t}
      if(t-start<6200)return requestAnimationFrame(step);
      frames.sort((a,b)=>a-b);const at=p=>frames[Math.ceil(frames.length*p)-1];
      ${scene}
      resolve({...perfProbe,build:window.__worldBoot.buildId,frames:frames.length,fps:1000*frames.length/(t-start),
        minFps:1000/frames.at(-1),dimensions:[innerWidth,innerHeight],
        p50:at(.50),p95:at(.95),p99:at(.99),objects:s.children.list.length,textures:s.textures.getTextureKeys().length,
        loadMs:s.populationLoadMs??null,heapMB:performance.memory?.usedJSHeapSize/1048576,lod:s.performancePanel?.snapshot().levels??null,
        simulationLastMs:s.simulationMs,animationLastMs:s.animationMs,uiLastMs:s.worldUiMs});
    }
    requestAnimationFrame(step);
  })`);
  await writeFile(join(output,baseline?'before.json':'after.json'),JSON.stringify(metrics,null,2));
  console.log('Metrics',metrics);
  if(process.env.LIVING_WORLD_CHECK){
    await run("document.querySelector('#toggle-world-performance').click()");
    await sleep(850);
    assert.match(await run("document.querySelector('#world-performance pre').textContent"),/WebGL draw calls [0-9]+/);
    const overlay=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,'1.8-overlay.png'),Buffer.from(overlay.data,'base64'));
    await run("document.querySelector('#world-performance button').click()");
    await run("document.getElementById('open-living-world').click()");
    assert.equal(await run("document.querySelector('.living-world-panel header strong').textContent"),'Nhật ký thế giới');
    await run("document.querySelectorAll('.living-world-panel nav button')[1].click()");
    assert.equal(await run("document.querySelectorAll('.living-world-body .living-row').length"),24);
    assert.match(await run("document.querySelector('.living-pages span').textContent"),/108 cư dân/);
    assert.ok(await evalScene("const row=document.querySelector('.living-row');s.livingWorldPanel.render();return row===document.querySelector('.living-row')"),'Dashboard update reuses rows');
    await run("document.querySelector('.living-pages button:last-child').click()");
    assert.match(await run("document.querySelector('.living-pages span').textContent"),/2\/5/);
    await run("document.querySelector('.living-pages button:first-child').click()");
    const dashboard=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,'living-world-dashboard.png'),Buffer.from(dashboard.data,'base64'));
    await run("document.querySelector('.living-world-body .living-row').click()");
    assert.match(await run("document.querySelector('.living-world-body').textContent"),/Ký ức/);
    assert.match(await run("document.querySelector('.living-world-body').textContent"),/Quan hệ/);
    const inspector=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,'living-world-inspector.png'),Buffer.from(inspector.data,'base64'));
    await evalScene("s.setCollisionVisible(true); s.gotoMarker('city-center',.95)");
    await sleep(500);
    const groundShot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,'living-world-ground.png'),Buffer.from(groundShot.data,'base64'));
    await evalScene("s.setCollisionVisible(false)");
    const longRun=await run(`(async()=>{
      ${scene}
      const w=s.populationWorld, minutes=${Number(process.env.LIVING_DAYS??4)*1440}, saveKey='world-rebuild-1c-v1';
      const initial=new Map(w.npcs.map(n=>[n.id,{x:n.x,y:n.y,style:n.visualStyleId,profession:n.profession,xp:n.xp,look:JSON.stringify(n.modularAppearance??n.xianxiaAppearance??n.visualParts)}]));
      const speed=w.clock.speed;if(minutes>5760)w.clock.speed=4;
      const before=s.faunaNow(), offTerrain=new Set(), stalled=new Map(), switches=new Map(), seenEvents=new Map();
      const previousGoals=new Map(), movedFromStart=new Set();
      let worstHungry=0, worstFatigue=0;
      document.querySelector('.living-world-panel header button').click();
      while(s.faunaNow()-before<minutes){
        for(let i=0;i<80&&s.faunaNow()-before<minutes;i++)s.updatePopulation(performance.now(),250,250);
        for(const n of w.npcs){
          if(!n.alive)continue;
          const spawn=initial.get(n.id);
          if(Math.hypot(n.x-spawn.x,n.y-spawn.y)>24)movedFromStart.add(n.id);
          const body=s.groundOccupancy.bodies.get(n.id);
          if(body&&!s.footprintTerrainOpen(n.x,n.y,body.width/2,body.height/2))offTerrain.add(n.id);
          if(n.pathBlocked)stalled.set(n.id,(stalled.get(n.id)??0)+1);
          if(previousGoals.has(n.id)&&previousGoals.get(n.id)!==n.goalAction)switches.set(n.id,(switches.get(n.id)??0)+1);
          previousGoals.set(n.id,n.goalAction);
        }
        for(const event of w.events)seenEvents.set(event.id,event.type);
        worstHungry=Math.max(worstHungry,w.npcs.filter(n=>n.alive&&n.hunger>=75).length);
        worstFatigue=Math.max(worstFatigue,w.npcs.filter(n=>n.alive&&n.fatigue>=90).length);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      w.clock.speed=speed;
      s.persistPopulation();
      const saved=JSON.parse(localStorage.getItem(saveKey)), byType={};
      for(const type of seenEvents.values())byType[type]=(byType[type]??0)+1;
      return {seed:w.population.spawnSeed,before,after:s.faunaNow(),count:w.npcs.length,moved:movedFromStart.size,awayAtEnd:w.npcs.filter(n=>Math.hypot(n.x-initial.get(n.id).x,n.y-initial.get(n.id).y)>24).length,
        cultivationChanged:w.npcs.filter(n=>n.xp!==initial.get(n.id).xp).length,events:byType,offTerrain:[...offTerrain],
        blockedSnapshots:[...stalled.values()].sort((a,b)=>b-a).slice(0,10),maxObservedGoalChanges:Math.max(0,...switches.values()),worstHungry,worstFatigue,alive:w.npcs.filter(n=>n.alive).length,deaths:w.npcs.filter(n=>!n.alive).map(n=>({role:n.populationRole,reason:n.deathCause})),
        hungry:w.npcs.filter(n=>n.alive&&n.hunger>=75).length,exhausted:w.npcs.filter(n=>n.alive&&n.fatigue>=90).length,
        herbs:w.environment.resourceNodes.map(n=>({id:n.id,amount:n.amount,max:n.maxAmount,hits:n.harvestCount??0})),
        timber:w.environment.timberSources.map(n=>({id:n.id,cuts:n.cuts??0,renewAt:n.renewAt})),
        savesMatch:JSON.stringify(w.npcs.map(n=>[n.id,n.inventory,n.xp,n.profession,n.socialNeed,n.memories]))===JSON.stringify(saved.npcs.map(n=>[n.id,n.inventory,n.xp,n.profession,n.socialNeed,n.memories])),
        identityPreserved:w.npcs.every(n=>initial.get(n.id).profession===n.profession&&initial.get(n.id).style===n.visualStyleId&&initial.get(n.id).look===JSON.stringify(n.modularAppearance??n.xianxiaAppearance??n.visualParts)),
        collision:s.getGroundDiagnostics(),sampleBlocked:w.npcs.filter(n=>n.alive&&n.pathBlocked).slice(0,10).map(n=>({id:n.id,x:n.x,y:n.y,target:n.actionTarget,goal:n.goalAction,route:s.npcRoutes.get(n.id)?.points?.slice(n.routeIndex,n.routeIndex+3)})),savedClock:saved.clock.day*1440+saved.clock.minute};
    })()`);
    console.log('Living world '+(process.env.LIVING_DAYS??4)+'-day simulation',longRun);
    await writeFile(join(output,'living-world-'+(process.env.LIVING_DAYS??4)+'-days.json'),JSON.stringify(longRun,null,2));
    await run("document.getElementById('open-living-world').click()");
    assert.ok(await run("Boolean(document.querySelector('.living-world-body button'))"));
    const journal=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,'living-world-journal.png'),Buffer.from(journal.data,'base64'));
    await run("document.querySelector('.living-world-body button').click()");
    assert.equal(await run("document.querySelector('.living-world-panel header strong').textContent"),'Hồ sơ sinh hoạt');
    await send('Page.reload',{ignoreCache:true});
    await ready();
    const loaded=await evalScene("return {now:s.faunaNow(),count:s.populationWorld.npcs.length,timber:s.populationWorld.environment.timberSources.map(n=>n.cuts??0),herbs:s.populationWorld.environment.resourceNodes.map(n=>n.harvestCount??0)}");
    assert.ok(loaded.now>=longRun.savedClock && loaded.now<=longRun.savedClock+3);
    assert.equal(loaded.count,108);
    assert.deepEqual(loaded.timber,longRun.timber.map(n=>n.cuts));
    assert.deepEqual(loaded.herbs,longRun.herbs.map(n=>n.hits));
    await writeFile(join(output,'living-world-'+(process.env.LIVING_DAYS??4)+'-days.json'),JSON.stringify({...longRun,reload:loaded},null,2));
    assert.equal(longRun.count,108);
    assert.equal(longRun.after-longRun.before,Number(process.env.LIVING_DAYS??4)*1440);
    assert.deepEqual(longRun.offTerrain,[]);
    assert.deepEqual(longRun.collision.overlaps,[]);
    assert.ok(longRun.moved>=50,'at least half the population travels during the run');
    assert.ok(longRun.cultivationChanged>0);
    assert.ok(longRun.identityPreserved&&longRun.savesMatch);
    assert.ok(longRun.herbs.every(n=>n.amount>=0&&n.amount<=n.max));
    assert.ok(longRun.events['herb-node-harvest']>0 && longRun.events['npc-timber-cut']>0);
    assert.ok(longRun.events['farm-harvest']>0 && longRun.events['npc-provisions']>0);
    assert.ok(longRun.timber.some(n=>n.cuts>1),'at least one tree must regrow before a repeat harvest');
    assert.deepEqual(errors,[]);
    assert.deepEqual(failed,[]);
  }
  if(process.env.GROUND_CHECK){
    const checks=await evalScene(`
      const LiveGrid=s.groundOccupancy.constructor, Traffic=s.passageTraffic.constructor;
      const results=[];
      for(const gate of s.passageTraffic.gates)for(const speed of [1,2,4])for(const perSide of [1,5]){
        const point=(along,side=0)=>gate.horizontal?{x:gate.x+along,y:gate.y+side}:{x:gate.x+side,y:gate.y+along};
        const actors=[-1,1].flatMap(dir=>Array.from({length:perSide},(_,rank)=>({
          id:dir+':'+rank,alive:true,source:dir,
          goal:point(-dir*(perSide===1?64:130+(perSide-rank)*21)),...point(dir*(60+rank*21))
        })));
        const traffic=new Traffic([{a:point(-54),b:point(54),id:gate.id}]);
        const grid=new LiveGrid((x,y,w,h)=>s.footprintTerrainOpen(x,y,w,h));
        grid.sync(actors,[]);
        let overlaps=0,stepExceeded=0;
        for(let time=0;time<(perSide===1?16000:35000);time+=40*speed){
          for(const n of actors){
            const body=grid.bodies.get(n.id), intent=traffic.guide(n,n.goal,time);
            const target=intent?.target??n.goal;
            if(intent?.wait&&!grid.open(body,target.x,target.y))continue;
            const dx=target.x-n.x,dy=target.y-n.y,d=Math.hypot(dx,dy);
            if(d<1)continue;
            const step=Math.min(d,44*40*speed/1000);
            const position=grid.advance(body,n.x+dx/d*step,n.y+dy/d*step);
            if(position){if(Math.hypot(position.x-n.x,position.y-n.y)>step+.01)stepExceeded++;Object.assign(n,position);}
          }
          overlaps+=grid.overlaps().length;
        }
        results.push({gate:gate.id,speed,actors:actors.length,overlaps,stepExceeded,crossed:actors.filter(n=>(gate.horizontal?n.x-gate.x:n.y-gate.y)*n.source<=-56).length,completed:actors.filter(n=>Math.hypot(n.x-n.goal.x,n.y-n.goal.y)<4).length,stalled:actors.filter(n=>Math.hypot(n.x-n.goal.x,n.y-n.goal.y)>=4).map(n=>({id:n.id,x:n.x,y:n.y,goal:n.goal}))});
      }
      return results;
    `);
    assert.equal(checks.length,24,'four gates, three speeds and two population sizes');
    const save=await evalScene("s.persistPopulation(); const w=s.populationWorld; return {seed:w.population.spawnSeed,count:w.npcs.length, identities:w.npcs.map(n=>[n.id,n.profession,JSON.stringify(n.modularAppearance)]), stock:w.npcs.map(n=>n.inventory)}");
    await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(document,'hidden',{get:()=>true})"});
    await send('Page.reload',{ignoreCache:true});
    await ready();
    const restored=await evalScene("const w=s.populationWorld; return {seed:w.population.spawnSeed,count:w.npcs.length, identities:w.npcs.map(n=>[n.id,n.profession,JSON.stringify(n.modularAppearance)]), stock:w.npcs.map(n=>n.inventory)}");
    const matches=JSON.stringify(save)===JSON.stringify(restored);
    console.log('WorldScene Tiled gate footprint fixtures',checks,'save restored',matches);
    await writeFile(join(output,'living-world-gates.json'),JSON.stringify({checks,matches},null,2));
    assert.ok(matches,'a paused reload preserves the roster, appearances and inventory');
    assert.ok(checks.every(r=>r.overlaps===0&&r.stepExceeded===0&&r.crossed===r.actors),'both directions exit all four narrow passages');
  }
  if(!baseline&&!process.env.LIVING_WORLD_CHECK&&!process.env.GROUND_CHECK){
    const before=await evalScene(`
      const distant=[...s.scheduler.byId.values()].filter(e=>e.level===2&&e.npc.alive);
      return distant.map(({npc})=>({id:npc.id,x:npc.x,y:npc.y,hunger:npc.hunger}));
    `);
    assert.ok(before.length>0);
    await sleep(7500);
    const advanced=await evalScene(`
      return ${JSON.stringify(before)}.map(before=>{
        const npc=s.scheduler.byId.get(before.id).npc;
        return {id:npc.id,distance:Math.hypot(npc.x-before.x,npc.y-before.y),valid:s.canOccupy(npc.x,npc.y),
          before:before.hunger,after:npc.hunger,level:s.scheduler.byId.get(npc.id).level};
      }).filter(n=>n.distance>1&&n.valid&&n.level===2);
    `);
    assert.ok(advanced.length>0,'distant NPC walks along valid terrain');
    await run("document.querySelector('#toggle-world-performance').click()");
    await sleep(400);
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,'dev-performance.png'),Buffer.from(image.data,'base64'));
    if(process.env.RECORD_PERF)await send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:950,maxHeight:690,everyNthFrame:2});
    const regions=await evalScene('return s.getMinimapState().markers');
    const seen=[];
    for(const region of ['city','forest-outer','sect','river']){
      const marker=region==='river'?await evalScene('const p=s.riverFishSystem.closestFishPosition;return {...p,width:0,height:0}') : regions.find(item=>item.id===region);
      assert.ok(marker,region);
      const point=await evalScene(`const m=s.minimap,c=m.canvases[0].canvas,b=c.getBoundingClientRect();
        const point=m.transform.worldToMap(${marker.x+marker.width/2},${marker.y+marker.height/2});
        return {x:Math.round(b.left+point.x*b.width),y:Math.round(b.top+point.y*b.height)};`);
      for(const type of ['mouseMoved','mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
      await sleep(850);
      seen.push({region,...await evalScene('return {view:s.getMinimapState().worldView,stats:s.performancePanel.snapshot().levels};')});
    }
    assert.ok(new Set(seen.map(o=>Math.round(o.view.x/100)+':'+Math.round(o.view.y/100))).size>2);
    const saved=await evalScene('s.persistPopulation(); return {count:s.populationWorld.npcs.length,seed:s.populationWorld.population.spawnSeed}');
    const clockBefore=await evalScene('return {...s.populationWorld.clock}');
    const extra=await send('Target.createTarget',{url:'about:blank',background:false});
    await sleep(250);
    const frozenClock=await evalScene('return {...s.populationWorld.clock}');
    await sleep(1400);
    const tabHidden=await run('document.hidden');
    const clockHidden=await evalScene('return {...s.populationWorld.clock}');
    assert.equal(tabHidden,true);
    assert.deepEqual(clockHidden,frozenClock);
    assert.ok(frozenClock.day*1440+frozenClock.minute-(clockBefore.day*1440+clockBefore.minute)<=1);
    await send('Target.closeTarget',{targetId:extra.targetId});
    await send('Page.bringToFront');
    await sleep(600);
    const recovered=await evalScene('return {frame:s.game.loop.frame,npcs:s.populationWorld.npcs.length}');
    assert.equal(recovered.npcs,108);
    await send('Page.reload');await sleep(700);await ready();
    const reloaded=await evalScene('return {count:new Set(s.populationWorld.npcs.map(n=>n.id)).size,seed:s.populationWorld.population.spawnSeed}');
    assert.deepEqual(reloaded,saved);
    const verification={advanced,seen,tabHidden,recovered,reloaded};
    console.log('Verification',JSON.stringify(verification));
    await writeFile(join(output,'verification.json'),JSON.stringify(verification,null,2));
    if(frames.length){
      await send('Page.stopScreencast');
      const files=await mkdtemp(join(tmpdir(),'tvk-lod-video-'));
      const timeline=['ffconcat version 1.0'];
      for(let i=0;i<frames.length;i++){
        const file=String(i).padStart(5,'0')+'.jpg';
        await writeFile(join(files,file),Buffer.from(frames[i].data,'base64'));
        const duration=Math.min(1,Math.max(.05,(frames[i+1]?.metadata.timestamp??frames[i].metadata.timestamp+.1)-frames[i].metadata.timestamp));
        timeline.push("file '"+file+"'",'duration '+duration);
      }
      await writeFile(join(files,'frames.ffconcat'),timeline.join('\n'));
      const ff=execFileSync('python',['-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
      execFileSync(ff,['-y','-loglevel','error','-f','concat','-safe','0','-i','frames.ffconcat','-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6',join(output,'minimap.webm')],{cwd:files,stdio:'inherit'});
    }
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
