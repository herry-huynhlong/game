import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';

const output = resolve('art/previews/heaven-interaction');
const profile = await mkdtemp(join(tmpdir(), 'thanh-van-heaven-'));
await mkdir(output, { recursive: true });
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5175';
const debugPort = Number(process.env.HEAVEN_DEBUG_PORT ?? 9237);
const chrome = spawn(process.env.CHROME_EXE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-first-run',
  '--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'--window-size=1320,1050',origin+'/?testMode=1',
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
  const click = async selector => {await delay(700); return run(`document.querySelector(${JSON.stringify(selector)}).click()`);};
  const choose = (selector,value) => run(`(()=>{const select=document.querySelector(${JSON.stringify(selector)});select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const key = async key=>{
    for (const type of ['rawKeyDown','keyUp']) {
      await send('Input.dispatchKeyEvent',{type,key:key.toLowerCase(),code:'Key'+key,windowsVirtualKeyCode:key.charCodeAt(0),nativeVirtualKeyCode:key.charCodeAt(0)});
      await delay(150);
    }
  };
  const aim = async position => send('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(position.x),y:Math.round(position.y)});
  const save = () => run("JSON.parse(localStorage.getItem('world-rebuild-1c-v1'))");
  const metrics={};
  const measure=async name=>{
    metrics[name]=await run(`new Promise(resolve=>{
      const samples=[];
      requestAnimationFrame(start=>{
        let previous=start;
        const collect=now=>{
          samples.push(now-previous);previous=now;
          if(now-start<900) return requestAnimationFrame(collect);
          samples.sort((a,b)=>a-b);
          resolve({fps:1000*samples.length/(now-start),avgMs:(now-start)/samples.length,
            p95Ms:samples[Math.min(samples.length-1,Math.floor(samples.length*.95))]});
        };
        requestAnimationFrame(collect);
      });
    })`);
  };
  const ready = () => until(async()=>{
    if (errors.length) throw Error(JSON.stringify(errors[0]));
    return run('Boolean(window.__worldRebuild?.ready())');
  }).catch(async error=>{
    console.error(await run('({url:location.href,boot:window.__worldBoot?.snapshot(),title:document.title})'),missing);
    throw error;
  });
  await send('Page.enable');await send('Network.enable');await send('Runtime.enable');
  await send('Page.navigate',{url:origin+'/?testMode=1'});
  await send('Page.bringToFront');
  await delay(700);
  await ready();
  if (process.env.RECORD_HEAVEN) await send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:960,maxHeight:720,everyNthFrame:3});
  const sceneFixture = npcId => `const scene=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
    const actor=scene.populationWorld.npcs.find(n=>n.id===${npcId});
    const place=(x,y)=>{actor.x=x;actor.y=y;scene.npcSprites.get(actor.id).setPosition(x,y);scene.cameras.main.centerOn(x,y);scene.setZoom(1.2)};
    const screen=(x,y)=>{const c=scene.cameras.main;return {x:(x-c.worldView.x)*c.zoom,y:(y-c.worldView.y)*c.zoom}};`;

  const initial=await save(), npc=initial.npcs.find(n=>n.alive&&n.populationRole==='low_disciple'&&(n.realmIndex>0||n.realmLevel>=2));
  const id=JSON.stringify(npc.id);
  await run(`window.__worldRebuild.selectNPC(${id})`);
  assert.equal(await run("Boolean(document.querySelector('#npc-gift')&&document.querySelector('#possess-start'))"),true);
  assert.equal(await run('window.__worldRebuild.getPossessionState().active'),false);
  await shot('01-npc-actions');await click('#npc-gift');await shot('02-gift-empty-shop');
  const balance=(await save()).heaven.divinePower;
  await click('[data-heaven-list] article button');
  await run("document.querySelector('[data-heaven-list] article button').click()");
  let data=await save();
  assert.equal(data.heaven.divinePower,balance-4);
  assert.equal(data.npcs.find(n=>n.id===npc.id).inventory.find(i=>i.itemId==='fishing_rod_basic').count,1);
  assert.equal(data.heaven.shopLedger.filter(r=>r.owner==='heaven').length,0);
  await shot('03-bought-gifted-rod');
  await click('[data-heaven-tab=skills]');await click('[data-heaven-list] article button');
  await click('[data-heaven-tab=vault]');await shot('04-owned-book');
  await click('[data-close-heaven]');await click('#npc-gift');await shot('05-gift-owned-book');
  const beforeGift=(await save()).heaven.divinePower;
  await click('[data-heaven-list] article button');data=await save();
  assert.equal(data.heaven.divinePower,beforeGift);
  assert.ok(data.npcs.find(n=>n.id===npc.id).inventory.some(i=>i.itemId==='book_qingyun_wave'));
  await click('[data-close-heaven]');await click('#possess-start');data=await save();
  const cost=[5,10,20,35,50][Math.min(4,npc.realmIndex)];
  assert.equal(data.heaven.divinePower,beforeGift-cost);await shot('06-possession-shared-wallet');
  await run("Array.from(document.querySelectorAll('#possession-panel button')).find(b=>b.textContent.startsWith('Lĩnh ngộ')).click()");
  await key('J');await key('E');await key('D');await click('#possess-end');
  const learned=await save();await send('Page.reload');await delay(800);await ready();data=await save();
  assert.equal(data.npcs.length,108);assert.equal(data.heaven.divinePower,learned.heaven.divinePower);
  assert.ok(data.npcs.find(n=>n.id===npc.id).skills.includes('qingyun_wave'));
  assert.ok(!data.npcs.find(n=>n.id===npc.id).inventory.some(i=>i.itemId==='book_qingyun_wave'));
  await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');s.populationWorld.heaven.divinePower=0;s.selectNPC(${id});s.openNpcGift(${id});})()`);
  assert.equal(await run("Array.from(document.querySelectorAll('[data-heaven-list] article button')).every(b=>b.disabled)"),true);
  await shot('07-insufficient-power');await measure('gift-panel');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  await writeFile(join(output,'verification.json'),JSON.stringify({passed:['NPC card','atomic rod purchase and gift','double click','owned book free transfer','shared wallet possession','learn and reload','insufficient power','108 NPC'],metrics,errors,missing},null,2));
  if (frames.length) {
    await send('Page.stopScreencast');
    const frameDir=join(profile,'frames');
    await mkdir(frameDir,{recursive:true});
    const timeline=['ffconcat version 1.0'];
    for (let i=0;i<frames.length;i++) {
      const name=String(i).padStart(5,'0')+'.jpg';
      await writeFile(join(frameDir,name),Buffer.from(frames[i].data,'base64'));
      timeline.push("file '"+name+"'",'duration '+Math.max(.05,Math.min(1,(frames[i+1]?.time ?? frames[i].time+.1)-frames[i].time)));
    }
    await writeFile(join(frameDir,'capture.ffconcat'),timeline.join('\n'));
    const ffmpeg=execFileSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
    execFileSync(ffmpeg,['-loglevel','error','-y','-f','concat','-safe','0','-i','capture.ffconcat',
      '-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6',
      '-b:v','0','-crf','30',join(output, process.env.HEAVEN_ONLY_SABER ? 'worldscene-saber.webm' : 'worldscene-gameplay.webm')],{cwd:frameDir,stdio:'inherit'});
  }
  console.log('Chrome interaction PASS');
} finally {
  socket?.close();
  chrome.kill();
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150}).catch(()=>{});
}
