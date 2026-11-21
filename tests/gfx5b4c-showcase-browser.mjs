import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/gfx5b4b-showcase.html?gfx5b4c=1';
const out=path.resolve('art/previews/gfx5b4c-showcase');
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
 for(let i=0;i<120;i++){if(await ev("window.__gfx5b4bShowcase?.().sprites.length===5"))break;await delay(200)}
 const first=await ev("window.__gfx5b4bShowcase?.()");if(!first)throw Error('Showcase not ready: '+JSON.stringify(errors));
 const storageBefore=await ev("JSON.stringify({...localStorage})");const seen=[];
 for(const action of ['idle','walk'])for(const direction of ['down','down_right','right','up_right','up','up_left','left','down_left']){
  await ev(`document.querySelector('[data-action=${action}]').click();document.querySelector('[data-direction=${direction}]').click()`);await delay(150);
  const state=await ev("window.__gfx5b4bShowcase()");if(state.action!==action||state.direction!==direction||state.sprites.some((s,i)=>s.animation!==`C0${i+1}_${action}_${direction}`))throw Error('Animation selection mismatch '+JSON.stringify(state));seen.push(action+'_'+direction);
 }
 await ev("document.querySelector('[data-action=walk]').click();document.querySelector('[data-direction=down_right]').click()");
 const frames=[];for(let i=0;i<9;i++){frames.push((await ev("window.__gfx5b4bShowcase()")).sprites.map(s=>s.frame));await delay(110)}
 await capture('five-walk-diagonal.png');await ev("document.querySelector('[data-zoom=\"2\"]').click()");await capture('five-zoom-2.png');
 const storageAfter=await ev("JSON.stringify({...localStorage})");console.log(JSON.stringify({cases:seen,first,walkFrames:frames.map(x=>x[0]),storageUnchanged:storageBefore===storageAfter,errors},null,2));if(storageBefore!==storageAfter||errors.length||new Set(frames.map(x=>x[0])).size<3)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
