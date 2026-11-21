import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/?devtest=1&gfx5b4b=1';
const out=path.resolve('art/previews/gfx5b4b-meditation');
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
 for(let i=0;i<150;i++){if(await ev("!!window.__gfx5b4Snapshot?.().ready && window.__gfx5b4Snapshot().npcs.every(n=>n.texture)"))break;await delay(200)}
 const first=await ev("window.__gfx5b4Snapshot?.()");if(!first?.ready)throw Error('Scene not ready: '+JSON.stringify(errors));
 await ev("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Bỏ Qua'))?.click()");await delay(500);
 await ev(`(()=>{const k='thien-dao-world-devtest-v1';const w=JSON.parse(localStorage.getItem(k));const n=w.npcs.find(x=>x.id==='qingyun-01');n.x=650;n.y=685;w.clock.minute=425;w.clock.paused=false;w.heaven.introSeen=true;localStorage.setItem(k,JSON.stringify(w))})()`);
 await send('Page.reload');for(let i=0;i<150;i++){if(await ev("!!window.__gfx5b4Snapshot?.().ready && window.__gfx5b4Snapshot().npcs.every(n=>n.texture)"))break;await delay(200)}
 await ev("document.querySelector('[data-speed=\"4\"]')?.click()");
 for(const id of ['qingyun-07','qingyun-01','qingyun-12']){await ev(`window.__gfx5b4Focus(${JSON.stringify(id)})`);await capture(id+'.png')}
 const seen=[];let found=null;
 for(let i=0;i<80;i++){let snap=await ev("window.__gfx5b4Snapshot()"), n=snap.npcs.find(n=>n.id==='qingyun-01');if(i%10===0)seen.push(n);if(n.action==='cultivate'&&n.animation==='prototype8-C03_cultivate'){found=n;break}await delay(500)}
 if(!found)throw Error('Natural cultivation not observed: '+JSON.stringify({seen,errors}));
 await ev("window.__gfx5b4Focus('qingyun-01')");await capture('actual-cultivation.png');
 let stopped=await ev("window.__gfx5b4Snapshot().npcs.find(n=>n.id==='qingyun-01')");await delay(800);let stopped2=await ev("window.__gfx5b4Snapshot().npcs.find(n=>n.id==='qingyun-01')");
 console.log(JSON.stringify({observed:found,stationary:stopped.x===stopped2.x&&stopped.y===stopped2.y,seen,errors},null,2));if(errors.length||stopped.action!=='cultivate'||stopped2.action!=='cultivate'||stopped.x!==stopped2.x||stopped.y!==stopped2.y)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
