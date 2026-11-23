import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const output = resolve('art/previews/npc-xianxia-phase15');
const profile = await mkdtemp(join(tmpdir(), 'thanh-van-heaven-'));
await mkdir(output, { recursive: true });
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5175';
const debugPort = Number(process.env.RIG_DEBUG_PORT ?? 9251);
const chrome = spawn(process.env.CHROME_EXE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-first-run',
  '--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'--window-size=1320,1050',origin+'/npc-xianxia-editor.html',
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
 await send('Page.navigate',{url:origin+'/npc-xianxia-editor.html'});
 await until(()=>run('Boolean(window.__characterEditor)'),30000);
 const status=()=>run('window.__characterEditor.status()');
 const pick=(id,value)=>run(`(()=>{const el=document.getElementById('${id}');el.value='${value}';el.dispatchEvent(new Event('change'));})()`);
 assert.equal((await status()).textureFrames,176);
 await pick('motion','walk');
 await until(async()=> (await status()).motion==='walk');
 await shot('A-dao-bao-di-bo');
 await pick('motion','run');
 await until(async()=> (await status()).motion==='run');
 const checks=await run(`(()=>{const api=window.__characterEditor;const before=api.status();for(const [id,value] of [['bodyType','male_strong'],['outfit','monk'],['outfit','demon'],['face','thanh_y'],['hair','loose'],['hairColor','silver'],['weapon','sword']]) {const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('change'));}return {before,after:api.status()};})()`);
 assert.equal(checks.before.elapsed,checks.after.elapsed);
 assert.equal(checks.before.frame,checks.after.frame);
 assert.equal(checks.after.appearance.bodyType,'male_strong');
 assert.equal(checks.after.appearance.outfit,'demon');
 assert.equal(checks.after.appearance.hair,'loose');
 assert.equal(checks.after.appearance.weapon,'sword');
 await shot('B-C-ma-tu');
 await pick('outfit','monk');await shot('C-vo-tang');
 assert.equal(await run("document.querySelector('#hair option[value=bun]').disabled"),true);
 await pick('bodyType','female_slender');
 assert.equal((await status()).appearance.outfit,'fairy');
 await pick('face','cold');await pick('expression','cold');await pick('hair','loose');await pick('weapon','sword');
 await shot('D-E-tien-tu');
 for(const direction of ['down','up','left','right']) {
   await pick('direction',direction);
   await until(async()=> (await status()).direction===direction && (await status()).motion==='run');
   await shot('F-'+direction);
 }
 await pick('bodyType','male_elder');await shot('truong-lao');
 await pick('compare-field','outfit');await run("document.querySelector('.compare').scrollIntoView()");await shot('so-sanh-trang-phuc');
 await pick('compare-field','bodyType');await shot('so-sanh-hinh-the');
 await pick('weapon','saber');assert.equal((await status()).appearance.weapon,'saber');
 await run("document.querySelector('#save').click()");
 const saved=(await status()).appearance;
 await send('Page.reload');await until(()=>run('Boolean(window.__characterEditor)'),30000);
 await run("document.querySelector('#load').click()");
 assert.deepEqual((await status()).appearance,saved);
 await until(async()=> (await status()).motion==='run'&&(await status()).direction==='right');
 const transfer=await run(`(async()=>{const f=document.getElementById('file');const value=window.__characterEditor.status().appearance;const t=new DataTransfer();t.items.add(new File([JSON.stringify({...value,hair:'short'})],'npc.json',{type:'application/json'}));f.files=t.files;await f.onchange();return window.__characterEditor.status().appearance.hair;})()`);
 assert.equal(transfer,'short');
 await pick('motion','idle');
 await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65});
 await until(async()=> (await status()).motion==='walk'&&(await status()).direction==='left');
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65});
 await run("document.querySelector('#stress').click()");
 await delay(1200);
 const crowd=await status();assert.equal(crowd.crowd,60);
 await shot('crowd');
 await send('Page.navigate',{url:origin+'/?characterRig=1&testMode=1'});
 await until(()=>run('window.__worldRebuild?.ready()'),40000);
 const world=()=>run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');const r=s.characterRigPreview;return r&&{id:r.npc.id,x:r.sprite.x,y:r.sprite.y,alpha:r.sprite.alpha,visible:r.character.root.visible,motion:r.character.motion,appearance:r.character.appearance,roster:s.populationWorld.npcs.length}})()`);
 await until(async()=> (await world())?.visible).catch(async error=>{console.log(await world(),errors,missing);await shot('worldscene-diagnostic');throw error;});
 const autonomous=await world();assert.equal(autonomous.roster,108);
 assert.equal(autonomous.appearance.bodyType,saved.bodyType);
 await shot('worldscene-npc');
 await run("document.querySelector('#possess-start').click()");
 await until(()=>run('window.__worldRebuild.getPossessionState().active'));
 const player=(await world());assert.equal(player.alpha,0);
 const directionKey=await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');const p=s.characterRigPreview.sprite;return [['d',18,0],['a',-18,0],['s',0,18],['w',0,-18]].find(([,x,y])=>s.canOccupy(p.x+x,p.y+y))?.[0];})()`);
 assert.ok(directionKey);
 const keyCode=directionKey.toUpperCase().charCodeAt(0);
 const key={key:directionKey,code:'Key'+directionKey.toUpperCase(),windowsVirtualKeyCode:keyCode};
 await send('Input.dispatchKeyEvent',{...key,type:'rawKeyDown'});
 await until(async()=>{const moving=await world();return moving.motion==='walk'&&Math.hypot(moving.x-player.x,moving.y-player.y)>3;});
 await shot('worldscene-nhap-than');
 await send('Input.dispatchKeyEvent',{...key,type:'keyUp'});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(join(output,'verification.json'),JSON.stringify({checks,crowd,autonomous,player,errors,missing},null,2));
 console.log('PASS editor, live customization, reload and WorldScene',crowd.fps);
} finally {
  socket?.close();
  chrome.kill();
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150}).catch(()=>{});
}
