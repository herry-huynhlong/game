import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const url='http://127.0.0.1:5173/gfx5b4c-a6-showcase.html';
const output=path.resolve('art/previews/gfx5b4c-a6');
const chrome=process.env.PROGRAMFILES+'\\Google\\Chrome\\Application\\chrome.exe';
if(!fs.existsSync(chrome))throw Error(`Chrome not found: ${chrome}`);
const response=await fetch(url);if(!response.ok)throw Error(`Vite response ${response.status}`);
fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'gfx5b4c-a6-'));
const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p))})});
const proc=spawn(chrome,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--headless=new','--hide-scrollbars','--window-size=1440,1800','--force-device-scale-factor=1','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--use-angle=swiftshader',url],{stdio:'ignore',windowsHide:true});
let ws,seq=0;const pending=new Map(),errors=[];
try{
 let targets=[];for(let i=0;i<100;i++){try{targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(targets.some(t=>t.type==='page'))break}catch{}await delay(200)}
 const page=targets.find(t=>t.type==='page');if(!page)throw Error('Chrome CDP page missing');
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
 ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails?.text??'runtime exception');if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result)}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description);return result.result?.value};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1800,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url});
 let state;for(let i=0;i<100;i++){state=await evaluate(`window.__gfx5b4cA6??null`);if(state?.ready)break;await delay(200)}
 await delay(700);
 const result=await evaluate(`({ready:!!window.__gfx5b4cA6?.ready,canvas:!!document.querySelector('#game canvas'),canvasSize:(()=>{const r=document.querySelector('#game canvas')?.getBoundingClientRect();return r?[Math.round(r.width),Math.round(r.height)]:[]})(),bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,threePoseFrames:window.__gfx5b4cA6?.threePoseFrames,loadedTextures:window.__gfx5b4cA6?.loadedTextures,expectedTextures:window.__gfx5b4cA6?.expectedTextures})`);
 const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(output,'C03-A6-phaser-showcase.png'),Buffer.from(shot.data,'base64'));
 fs.writeFileSync(path.join(output,'browser-check.json'),JSON.stringify({url,...result,errors},null,2));
 console.log(JSON.stringify({url,...result,errors,screenshot:path.join(output,'C03-A6-phaser-showcase.png')},null,2));
 if(!result.ready||!result.canvas||result.loadedTextures?.length!==result.expectedTextures?.length||errors.length)process.exitCode=1;
}catch(error){console.error(error.stack||error);process.exitCode=1}
finally{try{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await delay(100)}}catch{}try{proc.kill()}catch{}try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}
