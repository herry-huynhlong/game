import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const output = resolve('art/previews/npc-appearance-fleet');
const profile = await mkdtemp(join(tmpdir(), 'thanh-van-heaven-'));
await mkdir(output, { recursive: true });
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5175';
const debugPort = Number(process.env.RIG_DEBUG_PORT ?? 9281);
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
 const navigate=async path=>send('Page.navigate',{url:origin+path});
 const ready=()=>until(()=>run('window.__worldRebuild?.ready()'),35000);
 const fleet=()=>run('window.__worldRebuild.getNpcAppearanceReport()');
 const save=()=>run("JSON.parse(localStorage.getItem('world-rebuild-1c-v1'))");
 const appearance=world=>Object.fromEntries(world.npcs.map(n=>[n.id,n.modularAppearance]));
 await navigate('/?testMode=1');await ready();
 await until(async()=> (await fleet()).visible>12);
 const report=await fleet();assert.equal(report.total,108);assert.equal(report.modular,108);assert.equal(report.legacy,0);assert.equal(report.locked,2);assert.equal(report.duplicates,0);
 let original=await save();const snapshot=appearance(original);
 assert.ok(Object.values(snapshot).every(Boolean));
 await shot('world-city');
 // Same camera and zoom in both render modes. Sample rAF in a fresh isolated tab.
 const benchmark=()=>run(`new Promise(resolve=>{const values=[];let prev;function frame(t){if(prev)values.push(t-prev);prev=t;if(values.length<75)return requestAnimationFrame(frame);values.sort((a,b)=>a-b);resolve({fps:1000/(values.reduce((a,b)=>a+b,0)/values.length),p95:values[71],heap:performance.memory?.usedJSHeapSize??null});}requestAnimationFrame(frame);})`);
 const modularPerf=await benchmark();
 await navigate('/?legacyNpc=1&testMode=1');await ready();
 await delay(450);const legacyPerf=await benchmark();
 assert.deepEqual(appearance(await save()),snapshot);
 await navigate('/?region=south&testMode=1');await ready();
 await until(async()=> (await fleet()).visible>0);
 assert.deepEqual(appearance(await save()),snapshot);await shot('world-south');
 const disciple=original.npcs.find(n=>n.alive&&n.populationRole==='low_disciple'&&n.realmIndex<=1&&n.equippedWeapon==='iron_sword')??original.npcs.find(n=>n.alive&&n.populationRole==='low_disciple'&&n.realmIndex<=1);
 await run(`window.__worldRebuild.selectNPC(${JSON.stringify(disciple.id)})`);
 await run("document.querySelector('#possess-start').click()");
 await until(()=>run('window.__worldRebuild.getPossessionState().active'));
 const before=await run('window.__worldRebuild.getPossessionState()');
 const keyName=await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b'),a=s.npcSprites.get(s.possessedNpcId);return [['D',16,0],['A',-16,0],['W',0,-16],['S',0,16]].find(([,x,y])=>s.canOccupy(a.x+x,a.y+y))?.[0]})()`);
 assert.ok(keyName);
 const key={key:keyName.toLowerCase(),code:'Key'+keyName,windowsVirtualKeyCode:keyName.charCodeAt(0)};
 await send('Input.dispatchKeyEvent',{...key,type:'rawKeyDown'});
 await until(async()=>{const v=await run('window.__worldRebuild.getPossessionState()');return Math.hypot(v.x-before.x,v.y-before.y)>3;});
 await send('Input.dispatchKeyEvent',{...key,type:'keyUp'});
 const equipped=await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');const entry=s.npcAppearanceFleet.entries.get(s.possessedNpcId);return {rendered:entry.weapon,real:entry.record.look.weapon,npc:s.possessedNpcId};})()`);
 assert.equal(equipped.real,'none');
 if(disciple.equippedWeapon==='iron_sword')assert.equal(equipped.rendered,'sword');
 await shot('world-possession');
 await run("document.querySelector('#possess-end').click()");
 await navigate('/npc-xianxia-editor.html');
 await until(()=>run("document.getElementById('npc-roster-gallery')?.dataset.ready==='true'"),30000);
 const click=id=>run(`document.getElementById('${id}').click()`);
 const optionIds=()=>run("Array.from(document.querySelector('#roster-select').options,o=>o.value)");
 let inspected=new Set();
 for(let page=0;page<5;page++){
   const options=await optionIds();for(const id of options)inspected.add(id);
   await run("document.querySelector('#npc-roster-gallery').scrollIntoView()");
   await delay(165);await shot('gallery-'+(page+1));
   if(page<4)await click('roster-next');
 }
 assert.equal(inspected.size,108);
 for(let i=0;i<4;i++)await click('roster-prev');
 const ids=(await optionIds()).filter(id=>!snapshot[id].locked).slice(0,2);
 await run(`(()=>{const list=document.querySelector('#roster-select');for(const o of list.options)o.selected=${JSON.stringify(ids)}.includes(o.value);list.dispatchEvent(new Event('change'));})()`);
 await click('roster-random-selected');
 assert.deepEqual(appearance(await save()),snapshot);
 await click('roster-confirm');
 const updated=appearance(await save());
 assert.deepEqual(Object.keys(updated).filter(id=>JSON.stringify(updated[id])!==JSON.stringify(snapshot[id])).sort(),ids.sort());
 await click('roster-lock');await click('roster-confirm');
 let locked=appearance(await save());assert.equal(locked[ids[0]].locked,true);
 await click('roster-random-one');assert.match(await run("document.getElementById('roster-status').textContent"),/Không có/);
 await run(`(()=>{const list=document.querySelector('#roster-select');list.value=${JSON.stringify(ids[1])};list.dispatchEvent(new Event('change'));const hair=document.getElementById('hairColor');hair.value=hair.value==='silver'?'chestnut':'silver';hair.dispatchEvent(new Event('change'));})()`);
 await click('roster-manual');assert.deepEqual(appearance(await save()),locked);
 await click('roster-confirm');locked=appearance(await save());assert.equal(locked[ids[1]].manual,true);
 await click('roster-random-one');assert.match(await run("document.getElementById('roster-status').textContent"),/Không có/);

 await run("document.querySelector('#map-stage').scrollIntoView();document.querySelector('#stress').click()");
 await delay(700);const stress=await benchmark();
 assert.equal(await run('window.__characterEditor.status().crowd'),60);
 await shot('stress-60');
 await navigate('/?testMode=1');await ready();assert.deepEqual(appearance(await save()),locked);
 const final=await fleet();
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(join(output,'verification.json'),JSON.stringify({report,final,equipped,inspected:inspected.size,modularPerf,legacyPerf,stress,errors,missing},null,2));
 console.log('PASS roster, migration, gallery, persistence, equipment, possession and 60 animated NPCs',JSON.stringify({report,modularPerf,legacyPerf,stress}));
} finally {
  socket?.close();
  chrome.kill();
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150}).catch(()=>{});
}
