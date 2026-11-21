import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const port='9226',profile='C:/Users/LONG_IT/AppData/Local/Temp/gfx5b5-water-cdp';
const url='http://127.0.0.1:5175/gfx5b5-water-preview.html';
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-sandbox','--window-size=1536,1024',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,url],{stdio:'ignore',windowsHide:true});
let targets;
for(let i=0;i<80;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();break}catch{await new Promise(r=>setTimeout(r,250))}}
const page=targets?.find(t=>t.type==='page'&&t.url.includes('gfx5b5-water-preview.html'));if(!page)throw new Error('No water preview page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
let id=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}});
const send=(method,params={})=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method,params}))});
await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1536,height:1024,deviceScaleFactor:1,mobile:false});
await new Promise(r=>setTimeout(r,6500));
const expr='JSON.stringify({ready:document.documentElement.dataset.waterReady,error:document.documentElement.dataset.waterError||document.documentElement.dataset.waterLoadError,snapshot:window.__waterSnapshot?.(),viewport:[innerWidth,innerHeight]})';
const first=await send('Runtime.evaluate',{expression:expr,returnByValue:true});await new Promise(r=>setTimeout(r,700));const second=await send('Runtime.evaluate',{expression:expr,returnByValue:true});
const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});if(shot.result?.data)await writeFile('art/previews/gfx5b5-water-a-phaser.png',Buffer.from(shot.result.data,'base64'));
console.log(JSON.stringify({first:first.result?.result?.value,second:second.result?.result?.value,screenshot:!!shot.result?.data}));
ws.close();try{await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`)}catch{}chrome.kill();
