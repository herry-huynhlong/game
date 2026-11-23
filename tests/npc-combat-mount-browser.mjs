import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const output = resolve('art/previews/npc-combat-mount');
const profile = await mkdtemp(join(tmpdir(), 'thanh-van-heaven-'));
await mkdir(output, { recursive: true });
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5175';
const debugPort = Number(process.env.RIG_DEBUG_PORT ?? 9260);
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



 await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
 await send('Page.navigate',{url:origin+'/npc-xianxia-editor.html'});
 await until(()=>run('Boolean(window.__characterEditor)'),30000);
 const status=()=>run('window.__characterEditor.status()');
 const action=name=>run(`document.getElementById('arena-${name}').click()`);
 const pick=(id,value)=>run(`(()=>{const el=document.getElementById('${id}');el.value='${value}';el.dispatchEvent(new Event('change'));})()`);
 const idle=()=>until(async()=> /^(idle|crossbowHold|crossbowEmpty|crossbowAim)$/.test((await status()).combat.replace('mounted/','')));
 const event=async(test)=>until(async()=>{const s=await status();return test(s.event)?s.event:null;});
 const combo=[];
 await pick('weapon','sword');await idle();
 await action('debug');
 for(const direction of ['down','up','left','right']){
   await pick('direction',direction);await until(async()=> (await status()).direction===direction);
   await action('attack');combo.push(await event(e=>e?.type==='strike'&&e.direction===direction));
   await shot('2A-kiem-'+direction);await idle();
 }
 assert.equal(new Set(combo.map(e=>e.move)).size,3);assert.equal((await status()).hits,4);
 await pick('bodyType','male_strong');await pick('weapon','saber');await idle();
 await action('attack');await event(e=>e?.move==='saberSweep');await shot('2A-dao');await idle();
 await pick('weapon','crossbow');await idle();await action('aim');await action('attack');
 const bolt=await event(e=>e?.type==='bolt');assert.ok(Number.isFinite(bolt.start.x)&&Number.isFinite(bolt.start.y));
 assert.equal((await status()).loaded,false);await shot('2A-no');await idle();
 await action('reload');await event(e=>e?.type==='loaded');assert.equal((await status()).loaded,true);await idle();
 await action('summon');await action('mount');await until(async()=> (await status()).mount==='mounted');
 await shot('2B-len-yen');
 await pick('motion','run');
 for(const direction of ['up','down','left','right']){
   await pick('direction',direction);await until(async()=> (await status()).direction===direction&&(await status()).motion==='run');
   await shot('2B-huyen-ho-'+direction);
 }
 await pick('motion','idle');await idle();
 await pick('bodyType','female_slender');await pick('weapon','sword');await idle();
 await action('attack');const mountedSword=await event(e=>e?.type==='strike'&&e.mounted);await shot('2C-kiem-tren-ho');await idle();
 await pick('weapon','crossbow');await idle();await action('attack');const mountedBolt=await event(e=>e?.type==='bolt'&&e.mounted);await shot('2C-no-tren-ho');await idle();
 await action('mount');await until(async()=> (await status()).mount==='parked');await shot('2C-xuong-yen');
 const frameTime=await run(`new Promise(resolve=>{const values=[];let prev;const tick=t=>{if(prev)values.push(t-prev);prev=t;if(values.length<105)requestAnimationFrame(tick);else{values.sort((a,b)=>a-b);resolve({median:values[52],p95:values[99],fps:1000/(values.reduce((a,b)=>a+b)/values.length)});}};requestAnimationFrame(tick);})`);
 await send('Page.navigate',{url:origin+'/?characterRig=1&testMode=1'});
 await until(()=>run('window.__worldRebuild?.ready()'),40000);
 const current=()=>run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');const p=s.characterRigPreview;return {ready:p?.character.root.visible,mount:p?.mount.state,x:p?.sprite.x,y:p?.sprite.y,motion:p?.character.motion,weapon:p?.character.combat.weapon,crossbow:p?.character.combat.loaded,action:p?.character.combat.state,shots:s.heavenActions.shots.length,population:s.populationWorld.npcs.length};})()`);
 await until(async()=> (await current()).ready);
 await run("document.querySelector('#npc-gift').click()");
 await run("Array.from(document.querySelectorAll('#heaven-shop article')).find(x=>x.textContent.includes('Nỏ Thiết Mộc')).querySelector('button').click()");
 await delay(720);
 await run("Array.from(document.querySelectorAll('#heaven-shop article')).find(x=>x.textContent.includes('Cần câu phổ thông')).querySelector('button').click()");
 await run("document.querySelector('[data-close-heaven]').click();document.querySelector('#possess-start').click()");
 await until(()=>run('window.__worldRebuild.getPossessionState().active'));
 const key=async(name,type='rawKeyDown')=>send('Input.dispatchKeyEvent',{type,key:name.toLowerCase(),code:'Key'+name,windowsVirtualKeyCode:name.charCodeAt(0)});
 const press=async(name)=>{await key(name);await delay(130);await key(name,'keyUp');};
 await press('M');await until(async()=> (await current()).mount==='parked');
 await until(async()=> (await current()).action==='idle');
 await press('M');await until(async()=> (await current()).mount==='mounted').catch(async error=>{console.log(await current(),errors,missing);await shot('world-diagnostic');throw error;});
 await until(async()=> (await current()).action==='idle');
 const before=await current();
 const walkDir=await run(`(()=>{const r=window.__worldRebuildGame.scene.getScene('world-rebuild-1b').characterRigPreview;return [['D',16,0],['A',-16,0],['S',0,16],['W',0,-16]].find(([,x,y])=>r.canMountAt(r.sprite.x+x,r.sprite.y+y))?.[0]})()`);
 assert.ok(walkDir);
 await key(walkDir);await until(async()=>{const q=await current();return Math.hypot(q.x-before.x,q.y-before.y)>2;});await key(walkDir,'keyUp');
 await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');const r=s.characterRigPreview;const old=s.handlePossessedAction.bind(s);s.handlePossessedAction=key=>{const result=old(key);if(key==='J')window.__swordInput={state:r.character.combat.state,weapon:r.character.combat.weapon,mount:r.mount.state};return result;};const emit=r.character.onActionEvent;r.character.onActionEvent=(event,action,anchors)=>{if(event==='strike')window.__swordEvent={name:action.name,direction:action.direction};emit(event,action,anchors);};})()`);
 await key('J');
 await until(()=>run('window.__swordEvent')).catch(async error=>{console.log(await current(),await run('window.__swordInput'),errors,missing);throw error;});
 await shot('2D-world-kiem');await key('J','keyUp');
 await until(async()=> (await current()).action==='idle');
 assert.equal(await run("window.__worldRebuild.equipPossessedWeapon('training_crossbow')"),true);
 await until(async()=> (await current()).action==='crossbowHold');
 await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');const fire=s.heavenActions.launchBolt.bind(s.heavenActions);s.heavenActions.launchBolt=(npc,tip,...args)=>{window.__boltTrace={tip:{x:tip.x,y:tip.y},expected:s.characterRigPreview.character.worldAttachment('tip'),accepted:fire(npc,tip,...args)};return window.__boltTrace.accepted;};})()`);
 await press('J');await until(async()=> !(await current()).crossbow);await shot('2D-world-no');
 const worldBolt=await until(()=>run('window.__boltTrace'));assert.deepEqual(worldBolt.tip,worldBolt.expected);assert.equal(worldBolt.accepted,true);
 await until(async()=> (await current()).action==='crossbowEmpty');
 await press('M');await until(async()=> (await current()).mount==='parked');
 const world=await current();assert.equal(world.population,108);
 await until(async()=> (await current()).action==='crossbowEmpty');
 assert.equal(await run("window.__worldRebuild.equipPossessedWeapon('fishing_rod_basic')"),true);
 const bank=await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');const r=s.characterRigPreview;
   for(const f of s.riverFishSystem.getState(s.cameras.main).records)for(let a=0;a<Math.PI*2;a+=Math.PI/12)for(let d=30;d<=210;d+=2){
     const ux=Math.cos(a),uy=Math.sin(a),x=f.x-d*ux,y=f.y-d*uy;
     const point=s.heavenActions.castPoint({x,y},ux,uy);
     if(point?.component!==f.component||Math.hypot(point.x-f.x,point.y-f.y)>=45)continue;
     Object.assign(r.npc,{x,y});r.sprite.setPosition(x,y);
     s.cameras.main.centerOn(x,y);return {x:f.x,y:f.y};
   }
 })()`);
 assert.ok(bank);
 await delay(200);
 const aim=await run(`(()=>{const c=window.__worldRebuildGame.scene.getScene('world-rebuild-1b').cameras.main;return{x:(${bank.x}-c.worldView.x)*c.zoom,y:(${bank.y}-c.worldView.y)*c.zoom};})()`);
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(aim.x),y:Math.round(aim.y)});
 await press('F');
 const fish=()=>run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');return {phase:s.heavenActions.fishing?.phase,caught:s.populationWorld.environment.fish.some(f=>f.caughtBy===s.possessedNpcId)};})()`);
 await until(async()=> (await fish()).phase==='bite');
 await shot('2D-world-cau-ca');
 await press('F');await until(async()=> (await fish()).caught);

 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile(join(output,'verification.json'),JSON.stringify({combo,bolt,mountedSword,mountedBolt,worldBolt,world,fishing:await fish(),frameTime,errors,missing},null,2));
 console.log('PASS 2A / 2B / 2C / 2D',frameTime);
} finally {
  socket?.close();
  chrome.kill();
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150}).catch(()=>{});
}
