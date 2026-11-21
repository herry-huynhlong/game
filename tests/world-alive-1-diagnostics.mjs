import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const base='http://127.0.0.1:5175/',chrome=path.join(process.env.PROGRAMFILES??'C:\\Program Files','Google','Chrome','Application','chrome.exe');
const profile=await import('node:fs').then(fs=>fs.mkdtempSync(path.join(os.tmpdir(),'world-alive-diag-'))),port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1440,900','--force-device-scale-factor=1','--use-angle=swiftshader',base],{stdio:'ignore',windowsHide:true});
let ws;
try{
  let targets=[];for(let i=0;i<120;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(t=>t.type==='page'))break}catch{}await delay(100)}
  const target=targets.find(t=>t.type==='page');if(!target)throw Error('Chrome page not found');ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let seq=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result?.value};await send('Runtime.enable');
  let ready=false;for(let i=0;i<200;i++){try{ready=await ev('!!window.__worldRebuild?.ready()')}catch{}if(ready)break;await delay(100)}if(!ready)throw Error('WorldScene failed to initialize');
  await delay(Number(process.env.ALIVE_DIAG_WAIT_MS??9000));await ev(`document.querySelector('[data-ecology-view="predator"]').click();document.querySelector('#ecology-debug button')?.click()`);await delay(1000);const ecology=await ev('window.__worldRebuild.getEcologyState()');if(process.env.ALIVE_DIAG_SCREENSHOT){await send('Page.enable');const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(process.env.ALIVE_DIAG_SCREENSHOT,Buffer.from(shot.data,'base64'))}console.log(JSON.stringify({fauna:{alive:ecology.fauna.alive,inCamera:ecology.fauna.inCamera,rendered:ecology.fauna.rendered},fish:{count:ecology.fish.count,safeWaterCells:ecology.fish.safeWaterCells},npc:{states:ecology.npcs.states,stuckExamples:ecology.npcs.diagnostics?.stuckExamples}},null,2));
}finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{(await import('node:fs')).rmSync(profile,{recursive:true,force:true})}catch{}}
