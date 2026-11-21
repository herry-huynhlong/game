import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/?devtest=1';
const out=path.resolve('art/previews/gfx5b-tree-browser');
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
 for(let i=0;i<120;i++){if(await ev("!!document.querySelector('canvas')&&[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Đốn cây, nhặt gỗ'))"))break;await delay(200)}
 await delay(7000);await ev("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Bỏ Qua'))?.click()");await delay(500);
 await ev("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đốn cây, nhặt gỗ'))?.click()");await delay(600);
 const read=async()=>JSON.parse(await ev("localStorage.getItem('thien-dao-world-devtest-v1')||'null'"));let w=await read();
 if(w?.heaven?.possession?.npcId!=='van-du'){await capture('00-setup-failed.png');throw Error('Tree setup failed: '+JSON.stringify({possession:w?.heaven?.possession,toast:await ev("document.querySelector('#toast')?.textContent"),errors}))};
 await capture('01-intact.png');
 const key=async(letter)=>{const u=letter.toUpperCase(),vk=u.charCodeAt(0);await send('Page.bringToFront');await send('Input.dispatchKeyEvent',{type:'keyDown',key:letter,code:'Key'+u,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});await delay(100);await send('Input.dispatchKeyEvent',{type:'keyUp',key:letter,code:'Key'+u,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});await delay(450)};
 const obj=w=>w.environment.objects.find(x=>x.kind==='tree');let history=[];for(let i=0;i<12;i++){await key('j');w=await read();history.push({hp:obj(w).hp,status:obj(w).status});if(obj(w).status==='damaged')await capture('02-damaged.png');if(obj(w).status==='destroyed')break}w=await read();await capture('03-felled.png');if(obj(w).status!=='destroyed')throw Error('Tree was not felled: '+JSON.stringify(history));
 await key('e');w=await read();const drops=w.environment.drops.filter(x=>x.sourceId===obj(w).id);if(!drops.some(d=>d.status==='claimed'))throw Error('Wood pickup did not claim a drop: '+JSON.stringify(drops));await capture('04-picked-up.png');await send('Page.reload');await delay(2200);w=await read();const tree=obj(w);await capture('04-reloaded.png');console.log(JSON.stringify({history,treeAfterReload:{status:tree.status,hp:tree.hp},dropsBeforeReload:drops,dropsAfterReload:w.environment.drops.filter(x=>x.sourceId===tree.id),consoleErrors:errors},null,2));if(tree.status!=='destroyed'||errors.length||!w.environment.drops.some(d=>d.sourceId===tree.id&&d.status==='claimed')||w.environment.drops.filter(d=>d.sourceId===tree.id).length!==drops.length)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
