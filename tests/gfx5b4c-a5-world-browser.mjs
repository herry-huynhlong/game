import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/?devtest=1&gfx5b4c5=1';
const out=path.resolve('art/previews/gfx5b4c-a5');
const chrome=path.join(process.env.PROGRAMFILES??'C:\\Program Files','Google','Chrome','Application','chrome.exe');
if(!fs.existsSync(chrome))throw Error(`Chrome not found: ${chrome}`);
const health=await fetch(base);if(!health.ok)throw Error(`Vite server HTTP ${health.status}`);
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gfx5b4c-a5-'));
const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1440,900','--force-device-scale-factor=1','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',base],{stdio:'ignore',windowsHide:true});
let ws,seq=0;const pending=new Map(),errors=[],failed=[];
try{
  let targets=[];for(let i=0;i<100;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(x=>x.type==='page'))break}catch{}await delay(200)}
  const target=targets.find(x=>x.type==='page');if(!target)throw Error('Chrome CDP page unavailable');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails?.text??'exception');if(message.method==='Network.loadingFailed')failed.push(message.params.errorText);if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result)}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description);return result.result?.value};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base});
  let ready=false;for(let i=0;i<200;i++){ready=await ev("!!window.__gfx5b4Snapshot?.().ready&&!!window.__gfxA5Verify");if(ready)break;await delay(200)}if(!ready)throw Error('A5 test API/game did not become ready');
  await ev('window.__gfxA5Verify.startWorld()');
  await delay(2500);
  const initial=await ev("window.__gfx5b4Snapshot()");
  const actor=initial.npcs.find(n=>n.id==='qingyun-01');if(!actor)throw Error('qingyun-01 not found');
  const a5Frames=actor.texture==='prototype8-C03'&&actor.frameWidth===48&&actor.frameHeight===64;
  await ev("window.__gfx5b4Focus('qingyun-01')");await delay(600);
  const screenshot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,'C03-A5-in-Phaser-world.png'),Buffer.from(screenshot.data,'base64'));
  const before=await ev("localStorage.getItem('thien-dao-world-devtest-v1')");
  const began=await ev("window.__gfxA5Verify.begin()");if(!began)throw Error('Could not begin isolated route test');
  await ev('window.__gfxA5Verify.run(false)');
  const samples=[],routes=[],plans=[['down',0,1],['down_right',1,1],['right',1,0],['up_right',1,-1],['up',0,-1],['up_left',-1,-1],['left',-1,0],['down_left',-1,1]];
  const recordUntil=performance.now()+14500;
  const moviePromise=ev(`new Promise((resolve,reject)=>{const canvas=document.querySelector('#game canvas');if(!canvas?.captureStream||!window.MediaRecorder){reject(Error('captureStream unavailable'));return}const stream=canvas.captureStream(15),parts=[];let recorder;try{recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'})}catch(e){reject(e);return}const start=performance.now();recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};recorder.onerror=()=>reject(Error('MediaRecorder failed'));recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Blob read failed'));reader.readAsDataURL(new Blob(parts,{type:'video/webm'}))};recorder.start(250);const timer=setInterval(()=>{if(performance.now()-start>=14500){clearInterval(timer);recorder.stop()}},200)})`);
  for(const [name,ux,uy] of plans){
    await ev('window.__gfxA5Verify.run(false)');const at=await ev('window.__gfxA5Verify.snapshot()');let accepted=0,chosenDistance=0;
    for(const distance of [40,52,64]){const ok=await ev(`window.__gfxA5Verify.target(${at.x+ux*distance},${at.y+uy*distance})`);if(ok){accepted=1;chosenDistance=distance;break}}
    const routeSamples=[];
    if(accepted){await ev('window.__gfxA5Verify.run(true)');const until=performance.now()+1150;while(performance.now()<until){const state=await ev('window.__gfxA5Verify.snapshot()');if(state)routeSamples.push(state);samples.push(state);await delay(140)}await ev('window.__gfxA5Verify.run(false)')}
    routes.push({requested:name,accepted:!!accepted,distance:chosenDistance,animations:[...new Set(routeSamples.map(s=>s?.animation))],moved:routeSamples.length>1?Math.hypot(routeSamples.at(-1).x-routeSamples[0].x,routeSamples.at(-1).y-routeSamples[0].y):0});
  }
  while(performance.now()<recordUntil){samples.push(await ev("window.__gfxA5Verify.snapshot()"));await delay(180)}
  const movie=await moviePromise;
  const videoBytes=Buffer.from(movie.split(',')[1],'base64');fs.writeFileSync(path.join(out,'C03-A5-world-walk.webm'),videoBytes);
  await ev("window.__gfxA5Verify.finish()");
  const after=await ev("localStorage.getItem('thien-dao-world-devtest-v1')");
  const final=await ev("window.__gfx5b4Snapshot()");
  const result={ready,a5Frames,initialActor:actor,displaySize:samples[0]?{width:samples[0].displayWidth,height:samples[0].displayHeight}:null,routes,walkDirectionsObserved:[...new Set(samples.map(s=>s?.animation).filter(key=>key?.includes('_walk_')).map(key=>key.split('_walk_')[1]))],moved:routes.reduce((sum,r)=>sum+r.moved,0),animations:[...new Set(samples.map(s=>s?.animation))],textureFailures:failed,errors,storageUnchanged:before===after,videoBytes:videoBytes.length,finalActor:final.npcs.find(n=>n.id==='qingyun-01')};
  fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  if(!a5Frames||result.moved<10||result.walkDirectionsObserved.length<8||videoBytes.length<1000||failed.length||errors.length||before!==after)process.exitCode=1;
}catch(error){console.error(error.stack||error);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
