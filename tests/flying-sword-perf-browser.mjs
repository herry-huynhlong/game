import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9276);
const output=resolve('art/previews/flying-sword');
const profile=await mkdtemp(join(tmpdir(),'tvk-flying-sword-perf-'));
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
    if(location.search.includes('flightBench='))localStorage.removeItem('world-rebuild-1c-v1:flight-arena');
    const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<100;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  await send('Emulation.setDeviceMetricsOverride',{width:1304,height:955,deviceScaleFactor:1,mobile:false});
  await visit('/?flightTest=1&flightBench=1','Boolean(window.__worldRebuild?.ready())');
  const camera=await evalScene(`
    const from=s.markers.find(m=>m.id==='forest-outer');s.cameraTween?.stop();s.cameraTween=null;
    s.setZoom(.95);s.cameras.main.centerOn(from.x+260,from.y+230);
    return {x:from.x+260,y:from.y+230,zoom:.95};
  `);
  const sample=async label=>run(`new Promise(resolve=>{
    const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b'),gl=s.game.renderer.gl;
    const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer=gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):'canvas';
    const elapsed=[],visible=[];let last=0,start=0,draws=0;
    const methods=['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'];
    const originals=new Map();
    for(const name of methods)if(typeof gl?.[name]==='function'){
      const original=gl[name];
      originals.set(name,original);gl[name]=function(...args){draws++;return original.apply(this,args)};
    }
    const record=t=>{
      if(!start){start=last=t;requestAnimationFrame(record);return;}
      elapsed.push(t-last);last=t;visible.push(s.flightVisuals.visible);
      if(t-start<2500){requestAnimationFrame(record);return;}
      for(const [name,fn] of originals)gl[name]=fn;
      const sorted=[...elapsed].sort((a,b)=>a-b);
      resolve({label:${JSON.stringify(label)},fps:elapsed.length*1000/(t-start),
        p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],
        renderer,drawsPerFrame:draws/elapsed.length,peakVisible:Math.max(...visible),
        meanVisible:visible.reduce((a,b)=>a+b,0)/visible.length,active:s.flyingSword.active.size});
    };
    requestAnimationFrame(record);
  })`);
  await sleep(4200);
  let warm=false;
  for(let i=0;i<15&&!warm;i++){
    warm=await evalScene("return Boolean(s.terrainCache?.active)");
    if(!warm)await sleep(200);
  }
  assert.ok(warm,'terrain warmed before measurement');
  const baseline=await sample('baseline');
  assert.ok(baseline.fps>10,JSON.stringify(baseline));
  const ids=await evalScene(`
    const ids=s.launchFlightArena(6);
    s.flightArena.follow=null;
    const camera=${JSON.stringify(camera)};s.cameras.main.centerOn(camera.x,camera.y);
    return ids;
  `);
  assert.equal(ids.length,6);
  const group=await sample('six');
  assert.equal(group.peakVisible,6);
  const offscreen=await evalScene(`
    const ids=${JSON.stringify(ids)};
    const n=s.populationWorld.npcs.find(n=>n.id===ids[0]);
    s.cameraTween?.stop();s.cameraTween=null;s.cameras.main.centerOn(s.worldWidth-200,500);
    return {id:n.id,x:n.x,y:n.y};
  `);
  await sleep(800);
  const advanced=await evalScene(`
    const previous=${JSON.stringify(offscreen)},n=s.populationWorld.npcs.find(n=>n.id===previous.id);
    return {distance:Math.hypot(n.x-previous.x,n.y-previous.y),visible:s.flightVisuals.visible};
  `);
  assert.ok(advanced.distance>30&&advanced.visible===0,JSON.stringify(advanced));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={resolution:[1304,955],camera,baseline,group,offscreen:advanced};
  await writeFile(join(output,'performance.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{ws?.close();chrome.kill();}
