import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/?devtest=1&gfx5b4c4=1&gfx5b4c4verify=1&gfx5b4c4final=1';
const out=path.resolve('art/previews/gfx5b4c-a4-final');
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
 for(let i=0;i<150;i++){if(await ev("!!window.__gfx5b4Snapshot?.().ready && !!window.__gfxA4Final && !!window.__gfxA4Verify"))break;await delay(200)}
 await ev("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Bỏ Qua'))?.click()");await ev("window.__gfx5b4Focus('qingyun-01');document.querySelector('[data-speed=\"1\"]')?.click()");const storageBefore=await ev("JSON.stringify({...localStorage})");if(!await ev("window.__gfxA4Verify.begin()"))throw Error('Verify control unavailable');
 const result=await ev(`(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),dirs=[['S',0,1,'down'],['SW',-1,1,'down_left'],['W',-1,0,'left'],['NW',-1,-1,'up_left'],['N',0,-1,'up'],['NE',1,-1,'up_right'],['E',1,0,'right'],['SE',1,1,'down_right']],output=[];
  for(const mode of ['fixed','follow']){
   window.__gfxA4Final.camera(mode);await wait(350);window.__gfxA4Final.start('snapshots-'+mode);const legs=[];
   for(const [name,dx,dy,dir] of dirs){
    const initial=window.__gfxA4Verify.snapshot(),len=Math.hypot(dx,dy),target={x:initial.x+dx/len*80,y:initial.y+dy/len*80},accepted=window.__gfxA4Verify.target(target.x,target.y),captures=[],seen=new Set(),start=performance.now();let reached=false;
    if(accepted){while(performance.now()-start<25000){await wait(40);const s=window.__gfxA4Verify.snapshot();if(s.animation==='prototype8-C03_walk_'+dir&&!seen.has(s.frame)){const shot=await window.__gfxA4Final.capture();captures.push(shot);if(shot.requested.frame===shot.callback.frame&&shot.requested.animation===shot.callback.animation)seen.add(shot.requested.frame)}if(Math.hypot(s.x-target.x,s.y-target.y)<=15){reached=true;break}}}
    legs.push({name,accepted,reached,captures});if(!accepted||!reached)break;
   }
   const samples=window.__gfxA4Final.stop();output.push({mode,legs,samples});if(legs.length!==8||legs.some(x=>!x.accepted||!x.reached))break;
  }
  return {output,returned:window.__gfxA4Verify.finish()};
 })()`);
 const storageAfter=await ev("JSON.stringify({...localStorage})");for(const phase of result.output)for(const leg of phase.legs)for(let i=0;i<leg.captures.length;i++){const c=leg.captures[i],name=`snapshot-${phase.mode}-${leg.name}-${String(i+1).padStart(2,'0')}.png`;fs.writeFileSync(path.join(out,name),Buffer.from(c.data.split(',')[1],'base64'));delete c.data;c.file=name}
 result.storageUnchanged=storageBefore===storageAfter;result.errors=errors;fs.writeFileSync(path.join(out,'render-snapshots.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({phases:result.output.map(p=>({mode:p.mode,legs:p.legs.map(l=>({name:l.name,reached:l.reached,captures:l.captures.length,frameStable:l.captures.filter(c=>c.requested.frame===c.callback.frame&&c.requested.animation===c.callback.animation).length}))})),storageUnchanged:result.storageUnchanged,errors},null,2));
 if(result.output.length!==2||result.output.some(p=>p.legs.length!==8||p.legs.some(l=>!l.accepted||!l.reached))||!result.returned||!result.storageUnchanged||errors.length)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
