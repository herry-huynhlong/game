import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const base='http://127.0.0.1:5173/';
const out=path.resolve('art/previews/gfx5a/browser');
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
 for(let i=0;i<100;i++){if(await ev("!!document.querySelector('canvas')&&document.querySelector('#camera-center-town')"))break;await delay(200)}
 const skipped=await ev("(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Bỏ Qua'));if(!b)return false;b.click();return true})()");
 if(skipped)await delay(500);
 await ev("document.querySelector('#collapse-directory')?.click();document.querySelector('#collapse-detail')?.click()");await delay(300);
 await capture('01-sect.png');
 await ev("document.querySelector('#camera-center-town').click()");await delay(300);
 await send('Page.bringToFront');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await delay(130);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40,nativeVirtualKeyCode:40});await delay(470);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40,nativeVirtualKeyCode:40});await capture('02-city-house-match.png');
 await ev("document.querySelector('#camera-center-town').click()");await delay(300);
 await ev("document.querySelector('#camera-zoom-out').click();document.querySelector('#camera-zoom-out').click()");await delay(350);
 await send('Page.bringToFront');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await delay(2400);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});
 await capture('03-forest.png');
 const state=await ev("(()=>{const s=JSON.parse(localStorage.getItem('thien-dao-world-v1')||'null');return {npcCount:s?.npcs?.length,styled:s?.npcs?.filter(n=>n.visualStyleId).length,styles:[...new Set(s?.npcs?.map(n=>n.visualStyleId).filter(Boolean))].length,styleIds:s?.npcs?.filter(n=>n.visualStyleId).map(n=>[n.id,n.visualStyleId])}})()");
 await send('Page.reload');await delay(2300);
 const afterReload=await ev("(()=>{const s=JSON.parse(localStorage.getItem('thien-dao-world-v1')||'null');return s?.npcs?.filter(n=>n.visualStyleId).map(n=>[n.id,n.visualStyleId])})()");
 console.log(JSON.stringify({screenshots:out,sect:await ev("document.querySelector('#world-area')?.textContent"),appearance:state,stylesStableAfterReload:JSON.stringify(state.styleIds)===JSON.stringify(afterReload),consoleErrors:errors},null,2));
 if(!state.styled||state.styles<20||JSON.stringify(state.styleIds)!==JSON.stringify(afterReload)||errors.length)process.exitCode=1;
}catch(e){console.error(e.stack||e);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
