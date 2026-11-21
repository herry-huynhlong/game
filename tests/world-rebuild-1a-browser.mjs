import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const url='http://127.0.0.1:5175/', chrome=path.join(process.env.PROGRAMFILES??'C:\\Program Files','Google','Chrome','Application','chrome.exe');
if(!fs.existsSync(chrome))throw Error(`Chrome executable not found: ${chrome}`);
await fetch(url);const out=path.resolve('art/previews/world-rebuild-1a');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'world-rebuild-cdp-'));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1440,900','--force-device-scale-factor=1',url],{stdio:'ignore',windowsHide:true});
let ws,seq=0;const pending=new Map(),errors=[];
try{
 let targets=[];for(let i=0;i<100;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(t=>t.type==='page'))break}catch{}await delay(200)}
 const target=targets.find(t=>t.type==='page');if(!target)throw Error('Chrome page unavailable');ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.text??'exception');if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result?.value};
 await send('Page.enable');await send('Runtime.enable');
 await send('Page.navigate',{url});
 for(let i=0;i<150;i++){if(await ev("!!document.querySelector('#world-rebuild-status')"))break;await delay(100)}
 await ev(`(()=>{localStorage.removeItem('thanh-van-legacy-world-archive-v1');localStorage.setItem('thanh-van-ky-save-v1',JSON.stringify({world:'legacy',npcs:[{id:'old-city-npc'}]}));localStorage.setItem('thien-dao-world-v1',JSON.stringify({map:'QingyunWorldGFX5B5',npcs:[{id:'van-du'}]}));localStorage.setItem('thien-dao-world-devtest-v1',JSON.stringify({npcs:[{id:'qingyun-01'}]}));})()`);
 await send('Page.reload');for(let i=0;i<150;i++){if(await ev("!!document.querySelector('#world-rebuild-status')"))break;await delay(100)}
 const before=await ev(`(()=>({title:document.querySelector('#rebuild-title')?.textContent, activeNpcLabels:[...document.querySelectorAll('.rebuild-cell span')].map(x=>x.textContent), canvas:document.querySelectorAll('canvas').length,archive:JSON.parse(localStorage.getItem('thanh-van-legacy-world-archive-v1')||'null'),legacy: ['thanh-van-ky-save-v1','thien-dao-world-v1','thien-dao-world-devtest-v1'].map(k=>localStorage.getItem(k)),resources:performance.getEntriesByType('resource').map(x=>x.name).filter(x=>/\\.(tmj|png)(\\?|$)/i.test(x))}))()`);
 const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,'world-rebuild-status.png'),Buffer.from(shot.data,'base64'));
 await send('Page.reload');for(let i=0;i<150;i++){if(await ev("!!document.querySelector('#world-rebuild-status')"))break;await delay(100)}
 const after=await ev(`(()=>({status:!!document.querySelector('#world-rebuild-status'),canvas:document.querySelectorAll('canvas').length,archive:JSON.parse(localStorage.getItem('thanh-van-legacy-world-archive-v1')||'null'),legacy:['thanh-van-ky-save-v1','thien-dao-world-v1','thien-dao-world-devtest-v1'].map(k=>localStorage.getItem(k))}))()`);
 const result={before,after,reloadStable:JSON.stringify(before.archive)===JSON.stringify(after.archive)&&JSON.stringify(before.legacy)===JSON.stringify(after.legacy),browserErrors:errors};fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(before.canvas!==0||before.resources.length||before.archive?.saves?.['thien-dao-world-v1']==null||!result.reloadStable||errors.length)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
