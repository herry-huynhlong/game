import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/?devtest=1&gfx5b4c4=1&gfx5b4c4verify=1';
const out=path.resolve('art/previews/gfx5b4c-a4-verify');
const chrome=process.env.PROGRAMFILES+'\\Google\\Chrome\\Application\\chrome.exe';
if(!fs.existsSync(chrome))throw Error('Chrome missing');
await fetch(base).then(r=>{if(!r.ok)throw Error('Vite server unavailable')});
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gfx5a-cdp-'));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1280,720','--force-device-scale-factor=1','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--use-angle=swiftshader',base],{stdio:'ignore',windowsHide:true});
let ws,seq=0;const pending=new Map(),errors=[];
try{
 let targets=[];for(let i=0;i<100;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(x=>x.type==='page'))break}catch{}await delay(200)}
 const target=targets.find(x=>x.type==='page');if(!target)throw Error('Chrome CDP page unavailable');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.text??'exception');if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result?.value};
 const capture=async name=>{await delay(1800);const s=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,name),Buffer.from(s.data,'base64'))};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:base});
 for(let i=0;i<150;i++){if(await ev("!!window.__gfx5b4Snapshot?.().ready && !!window.__gfxA4Verify"))break;await delay(200)}
 await ev("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Bỏ Qua'))?.click()");
 await ev("window.__gfx5b4Focus('qingyun-01');window.__gfx5b4Follow('qingyun-01');document.querySelector('[data-speed=\"1\"]')?.click()");
 const storageBefore=await ev("JSON.stringify({...localStorage})");if(!await ev("window.__gfxA4Verify.begin()"))throw Error('Verify control not available');await ev('window.__gfxA4Verify.marker(true)');
 const result=await ev(`(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),canvas=document.querySelector('#game canvas');
  const stream=canvas.captureStream(15),parts=[],rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};rec.start(200);
  let hold=[];const directions=[['S',0,1],['SW',-1,1],['W',-1,0],['NW',-1,-1],['N',0,-1],['NE',1,-1],['E',1,0],['SE',1,1]],legs=[];
  for(const [name,dx,dy] of directions){
   const initial=window.__gfxA4Verify.snapshot(),len=Math.hypot(dx,dy),target={x:initial.x+dx/len*80,y:initial.y+dy/len*80};
   const accepted=window.__gfxA4Verify.target(target.x,target.y);let trace=[],reached=false;
   if(accepted){const start=performance.now();while(performance.now()-start<20000){await wait(100);const snap=window.__gfxA4Verify.snapshot();trace.push({time:Math.round(performance.now()-start),...snap});if(Math.hypot(snap.x-target.x,snap.y-target.y)<=15){reached=true;break}}}
   legs.push({name,initial,target,accepted,reached,trace});if(!accepted||!reached)break;if(name==='NW'){const stop=window.__gfxA4Verify.snapshot();window.__gfxA4Verify.target(stop.x,stop.y);for(let i=0;i<12;i++){await wait(100);hold.push(window.__gfxA4Verify.snapshot())}}
  }
  const returned=window.__gfxA4Verify.finish();await wait(500);
  const video=await new Promise((resolve,reject)=>{rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('read failed'));reader.readAsDataURL(new Blob(parts,{type:'video/webm'}))};rec.stop()});
  return {legs,hold,returned,video};
 })()`);
 const after=await ev("JSON.stringify({...localStorage})"),video=Buffer.from(result.video.split(',')[1],'base64');fs.writeFileSync(path.join(out,'world-controlled-marker.webm'),video);delete result.video;result.storageUnchanged=storageBefore===after;result.errors=errors;fs.writeFileSync(path.join(out,'controlled-marker-trace.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({legs:result.legs.map(x=>({name:x.name,accepted:x.accepted,reached:x.reached,samples:x.trace.length,animations:[...new Set(x.trace.map(v=>v.animation))],blocked:x.trace.some(v=>Object.values(v.blocked).some(Boolean))})),idleSamples:result.hold.filter(x=>x.animation?.includes('_idle_')).length,returned:result.returned,storageUnchanged:result.storageUnchanged,videoBytes:video.length,errors},null,2));
 if(result.legs.length!==8||result.legs.some(x=>!x.accepted||!x.reached)||result.hold.filter(x=>x.animation?.includes('_idle_')).length<3||!result.returned||!result.storageUnchanged||errors.length)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
