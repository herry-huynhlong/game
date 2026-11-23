import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';

const output = resolve('art/previews/npc-xianxia-12');
const profile = await mkdtemp(join(tmpdir(), 'thanh-van-heaven-'));
await mkdir(output, { recursive: true });
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5175';
const debugPort = Number(process.env.HEAVEN_DEBUG_PORT ?? 9237);
const chrome = spawn(process.env.CHROME_EXE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-first-run',
  '--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'--window-size=1320,1050',origin+'/npc-xianxia-gallery.html',
], { stdio:'ignore', windowsHide:true });
let socket;

async function until(fn, ms=20000) {
  const end=Date.now()+ms;
  while (Date.now()<end) {
    const result=await fn();
    if (result) return result;
    await delay(90);
  }
  throw new Error('Timeout: '+fn.toString());
}

try {
  const page=await until(async()=>{
    try {return (await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()).find(t=>t.type==='page');}
    catch {return null;}
  });
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail;});
  let sequence=0;
  const pending=new Map(), errors=[], missing=[], frames=[];
  socket.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if (msg.id) {
      const {ok,fail}=pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) fail(Error(msg.error.message)); else ok(msg.result);
    }
    if (msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
    if (msg.method==='Page.screencastFrame') {
      frames.push({data:msg.params.data,time:msg.params.metadata.timestamp});
      void send('Page.screencastFrameAck',{sessionId:msg.params.sessionId});
    }
    if (msg.method==='Network.responseReceived' && msg.params.response.status>=400 &&
        !msg.params.response.url.includes('favicon')) missing.push(msg.params.response.url);
  };
  function send(method,params={}) {
    const id=++sequence;
    return new Promise((ok,fail)=>{pending.set(id,{ok,fail});socket.send(JSON.stringify({id,method,params}));});
  }
  async function run(expression) {
    const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async function shot(name) {
    const result=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(result.data,'base64'));
  }

 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Page.navigate',{url:origin+'/npc-xianxia-gallery.html'});
 await until(()=>run('Boolean(window.__npcGallery?.ready)'),30000);
 assert.equal((await run('window.__npcGallery.frames')).length,12);
 await send('Emulation.setDeviceMetricsOverride',{width:1200,height:1300,deviceScaleFactor:1,mobile:false});
 for(const zoom of [1,2,3]) {await run(`window.__npcGallery.setZoom(${zoom})`);await delay(500);await shot(zoom+'x');}
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(join(output,'verification.json'),JSON.stringify({frames:12,zooms:[1,2,3],errors,missing,saveAccess:false},null,2));
 console.log('PASS Phaser atlas 12 sprites, zoom 1/2/3, no texture or runtime errors');
} finally {
  socket?.close();
  chrome.kill();
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150}).catch(()=>{});
}
