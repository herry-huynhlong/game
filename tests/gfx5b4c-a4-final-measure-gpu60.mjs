import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/?devtest=1&gfx5b4c4=1&gfx5b4c4verify=1&gfx5b4c4final=1';
const out=path.resolve('art/previews/gfx5b4c-a4-final/gpu-60');
const chrome=process.env.PROGRAMFILES+'\\Google\\Chrome\\Application\\chrome.exe';
if(!fs.existsSync(chrome))throw Error('Chrome missing');
await fetch(base).then(r=>{if(!r.ok)throw Error('Vite server unavailable')});
fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gfx5a-cdp-'));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1280,720','--force-device-scale-factor=1','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',base],{stdio:'ignore',windowsHide:true});
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
 for(let i=0;i<150;i++){if(await ev("!!window.__gfx5b4Snapshot?.().ready && !!window.__gfxA4Final && !!window.__gfxA4Verify"))break;await delay(200)}
 await ev("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Bỏ Qua'))?.click()");await ev("window.__gfx5b4Focus('qingyun-01');document.querySelector('[data-speed=\"1\"]')?.click()");
 const storageBefore=await ev("JSON.stringify({...localStorage})");if(!await ev("window.__gfxA4Verify.begin()"))throw Error('Verify control unavailable');
 const result=await ev(`(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));const dirs=[['S',0,1],['SW',-1,1],['W',-1,0],['NW',-1,-1],['N',0,-1],['NE',1,-1],['E',1,0],['SE',1,1]];
  const plans=[{name:'fixed_no_recorder',mode:'fixed',record:false,legs:dirs},{name:'fixed_recorded',mode:'fixed',record:true,legs:dirs},{name:'follow_recorded',mode:'follow',record:true,legs:dirs},{name:'follow_zoom_in',mode:'follow',record:false,legs:dirs}];const output=[];
  for(const plan of plans){
   window.__gfxA4Final.camera(plan.mode);if(plan.name==='follow_zoom_in')window.__gfxA4Final.zoom(1.12);await wait(400);
   let rec,parts=[],stream;if(plan.record){stream=document.querySelector('#game canvas').captureStream(60);rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};rec.start(200)}
   window.__gfxA4Final.start(plan.name);const legs=[];
   for(const [name,dx,dy] of plan.legs){
    const initial=window.__gfxA4Verify.snapshot(),length=Math.hypot(dx,dy),target={x:initial.x+dx/length*80,y:initial.y+dy/length*80},start=performance.now(),accepted=window.__gfxA4Verify.target(target.x,target.y);let reached=false;
    if(accepted){while(performance.now()-start<25000){await wait(70);const snap=window.__gfxA4Verify.snapshot();if(!snap.alive)break;if(Math.hypot(snap.x-target.x,snap.y-target.y)<=15){reached=true;break}}}
    const end=performance.now(),last=window.__gfxA4Verify.snapshot();legs.push({name,start,end,initial,last,target,accepted,reached});if(!accepted||!reached)break;
   }
   const samples=window.__gfxA4Final.stop();let video=null;
   if(rec)video=await new Promise((resolve,reject)=>{rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('video read failed'));reader.readAsDataURL(new Blob(parts,{type:'video/webm'}))};rec.stop()});
   output.push({name:plan.name,mode:plan.mode,record:plan.record,legs,samples,video});if(legs.length!==8||legs.some(x=>!x.accepted||!x.reached))break;
  }
  const returned=window.__gfxA4Verify.finish();return {output,returned,renderer:window.__gfxA4Final.renderer()};
 })()`);
 const storageAfter=await ev("JSON.stringify({...localStorage})");for(const phase of result.output){if(phase.video){fs.writeFileSync(path.join(out,phase.name+'.webm'),Buffer.from(phase.video.split(',')[1],'base64'));delete phase.video}}
 result.storageUnchanged=storageBefore===storageAfter;result.errors=errors;fs.writeFileSync(path.join(out,'measurement.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({phases:result.output.map(p=>({name:p.name,legs:p.legs.length,completed:p.legs.every(l=>l.accepted&&l.reached),frames:p.samples.length,ms:p.samples.length?p.samples.at(-1).time-p.samples[0].time:0,zoom:p.samples[0]?.zoom,animationUpdates:p.samples.reduce((n,s,i)=>n+(i>0&&s.frame!==p.samples[i-1].frame?1:0),0)})),returned:result.returned,renderer:result.renderer,storageUnchanged:result.storageUnchanged,errors},null,2));
 if(result.output.length!==4||result.output.some(p=>p.legs.length!==8||p.legs.some(l=>!l.accepted||!l.reached))||!result.returned||!result.storageUnchanged||errors.length)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
