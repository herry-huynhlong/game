import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const output = resolve('art/previews/performance/1.8');
const label = process.env.BENCH_LABEL ?? 'after';
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const reps = Number(process.env.BENCH_REPS ?? 2);
const targets = (process.env.BENCH_COUNTS ?? 'normal,10,30,60,108').split(',');
const hardware = process.env.BENCH_GPU === 'hardware';
const port = Number(process.env.PERF_DEBUG_PORT ?? 9251);
const profile = await mkdtemp(join(tmpdir(),'tvk-18-'));
await mkdir(output,{recursive:true});
const launch = [
  '--headless=new','--no-first-run','--force-device-scale-factor=1','--hide-scrollbars',
  '--remote-debugging-port='+port,'--window-size=1320,1050','--user-data-dir='+profile,
];
if (!hardware) launch.push('--use-angle=swiftshader','--enable-unsafe-swiftshader');
const chrome = spawn(process.env.CHROME_EXE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',[...launch,'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
const errors = [], pending = new Map();
let id = 0;
function send(method,params={}) {
  return new Promise((ok,fail) => {pending.set(++id,{ok,fail});ws.send(JSON.stringify({id,method,params}));});
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
try {
  let page;
  for (let i=0;i<100&&!page;i++) {
    try {page=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(tab=>tab.type==='page');} catch {}
    if (!page) await sleep(100);
  }
  assert.ok(page,'Chrome CDP page');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id){const task=pending.get(m.id);pending.delete(m.id);if(m.error)task?.fail(Error(m.error.message));else task?.ok(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1304,height:955,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    if(location.search.includes('perf='))localStorage.clear();
    const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}
  `});
  const rows=[];
  for(let rep=0;rep<reps;rep++) {
    for(const target of targets) {
      await send('Page.navigate',{url:origin+'/?testMode=1&perf='+rep+'-'+target});
      let ready=false;
      for(let attempt=0;attempt<170&&!ready;attempt++){
        ready=Boolean(await evaluate(`location.search.includes('perf=${rep}-${target}')&&window.__worldRebuild?.ready()`));
        if(!ready) await sleep(100);
      }
      assert.ok(ready,errors.join('\n'));
      const environment=await evaluate(`(()=>{
        const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b'),r=s.game.renderer;
        window.performanceScene=s;
        s.gotoMarker('city-center',.95);
        if(${Boolean(process.env.BENCH_TILES)}&&s.terrainCache){
          s.terrainCache.setActive(false);
          s.terrainCache.update=()=>{};
        }
        const gl=r.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
        if(${JSON.stringify(target)}!=='normal'){
          const count=Number(${JSON.stringify(target)}), npcs=s.populationWorld.npcs;
          const points=[];
          for(let y=1812;y<=2470;y+=40)for(let x=3100;x<3920;x+=58){
            if(s.canOccupy(x,y)&&s.canOccupy(x+19,y)&&s.canOccupy(x-19,y)&&s.clearFaunaLine({x:x-19,y},{x:x+19,y}))points.push({x,y});
          }
          if(points.length<108)throw Error('Insufficient benchmark positions');
          const anchors=new Map();window.stressAnchors=anchors;
          npcs.slice(0,count).forEach((npc,i)=>{
            const point=points[i];anchors.set(npc.id,point);
            const actor=s.npcSprites.get(npc.id);
            npc.x=point.x;npc.y=point.y;actor.setPosition(point.x,point.y).setDepth(point.y);
            npc.actionTarget={x:point.x+19,y:point.y};
          });
          s.npcRoutes.clear();
          const advance=s.scheduler.advance;
          s.scheduler.advance=function(...args){
            const state=advance.apply(this,args);
            for(const entry of this.byId.values())entry.visible=anchors.has(entry.npc.id)&&entry.npc.alive;
            return state;
          };
          const move=s.moveAutonomousNpc;
          s.moveAutonomousNpc=function(entry){
            const anchor=anchors.get(entry.npc.id);
            if(anchor){
              const offset=(Math.floor(this.scheduler.time/650)+entry.index)%2?19:-19;
              entry.npc.actionTarget={x:anchor.x+offset,y:anchor.y};
            }
            return move.call(this,entry);
          };
        }
        return {browser:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,
          phaser:s.game.constructor.VERSION??null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};
      })()`);
      if(hardware) assert.ok(environment.renderer&&!/swiftshader|llvmpipe|software|warp|basic render/i.test(environment.renderer),'No hardware WebGL: '+environment.renderer);
      await sleep(1700);
      if(process.env.BENCH_ISOLATION==='1'){
        const isolation=await evaluate(`(()=>{
          const s=performanceScene, before=JSON.stringify(s.populationWorld), camera=s.cameras.main;
          s.terrainCache.setActive(false);
          camera.setZoom(.49);s.updateSceneryVisibility();s.npcAppearanceFleet.update(s.time.now,32);
          const distant=s.npcAppearanceFleet.distant;
          camera.setZoom(.95);s.updateSceneryVisibility();s.terrainCache.update(camera);
          s.npcAppearanceFleet.update(s.time.now,32);
          return {savedStateEqual:before===JSON.stringify(s.populationWorld),distant,near:!s.npcAppearanceFleet.distant};
        })()`);
        assert.deepEqual(isolation,{savedStateEqual:true,distant:true,near:true});
        console.log('Renderer path and visual LOD leave the simulation save byte-for-byte unchanged.');
      }
      const record=await evaluate(`(()=>{
        const s=performanceScene,r=s.game.renderer,gl=r.gl, totals={},counts={};
        const wrap=(object,method,key)=>{const original=object?.[method];if(typeof original!=='function')return;
          object[method]=function(...args){const start=performance.now();try{return original.apply(this,args)}
          finally{totals[key]=(totals[key]||0)+performance.now()-start;counts[key]=(counts[key]||0)+1;}};};
        const countCalls=(object,method,key)=>{const original=object?.[method];if(typeof original!=='function')return;
          object[method]=function(...args){counts[key]=(counts[key]||0)+1;return original.apply(this,args);};};
        for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced'])countCalls(gl,name,'drawCalls');
        countCalls(gl,'bindTexture','bindTextureCalls');
        for(const [object,method,key] of [
          [s.sys,'sceneUpdate','sceneUpdate'],[s,'updatePopulation','simulation'],[s,'populationRoute','route'],
          [s.populationSimulation,'tickNpc','decisions'],[s.populationSimulation,'tickShared','shared'],
          [s.npcAppearanceFleet,'update','appearance'],[s,'syncWeaponVisuals','weapon'],
          [s,'syncNPCModularVisuals','legacyParts'],[s.children,'depthSort','depthSort'],
          [s,'refreshProfessionVisuals','environmentGraphics'],[s,'refreshHud','hud'],[s.minimap,'update','minimap'],
          [s.livingWorldPanel,'update','livingUI'],[r,'render','cameraRender']
        ])wrap(object,method,key);
        for(const layer of s.children.list)if(layer.type==='TilemapLayer')wrap(layer,'cull','tileCull');
        window.runProfile={totals,counts};
        return Boolean(gl);
      })()`);
      assert.equal(record,true,'Expected WebGL renderer');
      const trace=Boolean(process.env.BENCH_TRACE)&&rep===0&&target==='60';
      if(trace){await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});await send('Profiler.start');}
      const result=await evaluate(`new Promise(resolve=>{
        const times=[];let started,last,firstHeap,firstCounts,firstTotals,visible=0,moving=0,maxVisible=0,groundMs=0;
        function frame(now){
          const s=performanceScene;
          if(started===undefined){
            started=last=now;firstHeap=performance.memory?.usedJSHeapSize;
            firstCounts={...runProfile.counts};firstTotals={...runProfile.totals};
          }else{
            times.push(now-last);last=now;
            const seen=s.npcAppearanceFleet?.visible??0;
            visible+=seen;maxVisible=Math.max(maxVisible,seen);
            let walking=0;
            for(const actor of s.npcSprites.values())if(actor.visible&&actor.getData('moving'))walking++;
            moving+=walking;groundMs+=s.groundCollisionMs??0;
          }
          if(now-started<${Number(process.env.BENCH_MS??4800)})return requestAnimationFrame(frame);
          times.sort((a,b)=>a-b);
          const delta=(object,first)=>Object.fromEntries(Object.entries(object).map(([key,value])=>[key,value-(first[key]??0)]));
          resolve({frames:times.length,fps:1000*times.length/(now-started),p95:times[Math.ceil(times.length*.95)-1],
            p99:times[Math.ceil(times.length*.99)-1],visible:visible/times.length,maxVisible,moving:moving/times.length,groundMs:groundMs/times.length,
            cpu:delta(runProfile.totals,firstTotals),calls:delta(runProfile.counts,firstCounts),
            phaserTextures:s.textures.getTextureKeys().length,objects:s.children.list.length,
            terrainVariants:s.terrainCache?.tileVariants??0,terrainCached:s.terrainCache?.active??false,
            heapStartMB:firstHeap/1048576,heapEndMB:performance.memory?.usedJSHeapSize/1048576});
        }
        requestAnimationFrame(frame);
      })`);
      if(trace){
        const {profile:cpu}=await send('Profiler.stop');
        await writeFile(join(output,label+'-60.cpuprofile'),JSON.stringify(cpu));
      }
      if(rep===0&&target==='60'){
        const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        await writeFile(join(output,label+'-60.png'),Buffer.from(image.data,'base64'));
      }
      if(process.env.BENCH_PIXELS&&rep===0&&target==='60'){
        assert.ok(await evaluate("performanceScene.terrainCache?.active"),'Visible terrain has finished caching');
        await evaluate("void performanceScene.scene.pause()");
        for(const [name,x,y,zoom] of [['city',3552,2176,.95],['river',5520,2160,.95],['forest',1250,2140,.95],['city-1x',3552,2176,1]]){
          await evaluate(`(()=>{const s=performanceScene;s.cameras.main.setZoom(${zoom}).centerOn(${x},${y});
            s.updateSceneryVisibility();s.terrainCache.update(s.cameras.main);
            if(s.terrainCache.active===Number.isInteger(${zoom}))throw Error('wrong terrain rendering path');})()`);
          await sleep(180);
          const cached=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64');
          await evaluate("performanceScene.terrainCache.setActive(false)");
          await sleep(180);
          const tiles=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64');
          const a=PNG.sync.read(cached),b=PNG.sync.read(tiles);
          let changed=0;
          for(let i=0;i<a.data.length;i+=4){
            if(Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]))>3)changed++;
          }
          const difference=changed/(a.width*a.height);
          console.log('Paired pixels',name,changed,'of',a.width*a.height);
          await writeFile(join(output,'pixels-'+name+'-tiles.png'),tiles);
          await writeFile(join(output,'pixels-'+name+'-cache.png'),cached);
          assert.ok(difference<(zoom===1?.0005:.012),'terrain mismatch '+name+' '+difference);
        }
        await evaluate("performanceScene.terrainCache.update(performanceScene.cameras.main);void performanceScene.scene.resume()");
      }
      if(target!=='normal') {
        const actual=await evaluate("({actors:[...performanceScene.npcSprites.values()].filter(a=>a.visible).length, reasons:performanceScene.npcAppearanceFleet.fallbacks,alive:performanceScene.populationWorld.npcs.filter(n=>n.alive).length})");
        assert.equal(actual.actors,Number(target),JSON.stringify(actual));
        assert.ok(result.maxVisible>=Number(target)-2,JSON.stringify({maxVisible:result.maxVisible,...actual}));
      }
      rows.push({rep,target,environment,...result});
      console.log(label,target,rep+1,result.fps.toFixed(1)+' FPS',result.p95.toFixed(1)+' ms p95',result.visible.toFixed(1)+' visible',result.moving.toFixed(1)+' moving','draws/frame',((result.calls.drawCalls??0)/result.frames).toFixed(1));
    }
  }
  assert.deepEqual(errors,[]);
  const file=join(output,label+'.json');
  await writeFile(file,JSON.stringify(rows,null,2));
  console.log(file);
} finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++id,method:'Browser.close'}));await sleep(150);ws.close();}
  chrome.kill();
}
