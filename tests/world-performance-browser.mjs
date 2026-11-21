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
    for(const method of ${JSON.stringify(baseline?['tick']:['tickShared','tickNpc'])}){
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
        loadMs:s.populationLoadMs??null,heapMB:performance.memory?.usedJSHeapSize/1048576,lod:s.performancePanel?.snapshot().levels??null});
    }
    requestAnimationFrame(step);
  })`);
  await writeFile(join(output,baseline?'before.json':'after.json'),JSON.stringify(metrics,null,2));
  console.log('Metrics',metrics);
  if(!baseline){
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
