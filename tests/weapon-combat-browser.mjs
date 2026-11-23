import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const chrome = process.env.CHROME_EXE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = Number(process.env.PERF_DEBUG_PORT ?? 9225);
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5175';
const profile = await mkdtemp(path.join(os.tmpdir(), 'qingyun-weapon-test-'));
const shots = path.resolve('art/previews/weapons/browser');
await mkdir(shots, { recursive: true });
let browser;
let ws;

async function until(fn, ms=20000) {
  const end=Date.now()+ms;
  while(Date.now()<end){try{const value=await fn();if(value)return value}catch{}await delay(200)}
  throw new Error('Timed out waiting for Chrome DevTools');
}
try {
  browser=spawn(chrome,[...(process.env.GAME_TEST_HEADLESS?['--headless=new']:[]),`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--window-size=1360,900','--force-device-scale-factor=1',origin+'/?testMode=1'],{stdio:'ignore',windowsHide:true});
  const target=await until(async()=>{const r=await fetch(`http://127.0.0.1:${port}/json/list`);return(await r.json()).find(x=>x.type==='page'&&x.url.startsWith(origin))});
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  let id=0;const pending=new Map();let pageErrors=[];
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')pageErrors.push(m.params.exceptionDetails.text)};
  function send(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
  await send('Page.enable');await send('Runtime.enable');
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
  await until(async()=>await evaluate('Boolean(window.__worldRebuild?.ready())'));
  const state=await evaluate('window.__worldRebuild.getWeaponState()');
  assert.equal(state.armed.length,5,'fresh world should issue the finite first batch of five weapons');
  assert.equal(state.unarmed,103,'unissued residents remain unarmed');
  const dao=state.armed.find(x=>x.weapon==='iron_dao');
  const jian=state.armed.find(x=>x.weapon==='iron_sword');
  assert.ok(dao&&jian,'both authored weapon types should be provisioned');
  const fauna=await evaluate("window.__worldRebuild.getFaunaState().records.find(f=>f.alive)?.id");
  assert.ok(fauna,'live fauna fixture exists');
  const setup=await evaluate(`window.__worldRebuild.prepareWeaponCombatTest(${JSON.stringify(dao.id)},${JSON.stringify(fauna)})`);
  assert.ok(setup.ok,JSON.stringify(setup));
  const panel=await evaluate("({weapon:document.querySelector('#equipment-weapon')?.value,hasSword:document.querySelector('#equipment-weapon')?.options.length>1})");
  assert.equal(panel.weapon,'iron_dao');assert.ok(panel.hasSword);
  await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(x=>writeFile(path.join(shots,'01-possessed-dao.png'),Buffer.from(x.data,'base64')));
  const before=await evaluate(`window.__worldRebuild.getFaunaState().records.find(f=>f.id===${JSON.stringify(fauna)}).hp`);
  const hit=await evaluate(`window.__worldRebuild.attackTest(${JSON.stringify(fauna)},false)`);
  assert.ok(hit.ok,JSON.stringify(hit));assert.equal(hit.weapon,'iron_dao');
  const after=await evaluate(`window.__worldRebuild.getFaunaState().records.find(f=>f.id===${JSON.stringify(fauna)}).hp`);
  assert.ok(after<before,`real combat should reduce fauna HP (${before} -> ${after})`);
  const overlay=await evaluate(`({visible:document.querySelector('canvas')!==null,weaponSprites:window.__worldRebuild.getWeaponState().armed.length})`);
  assert.equal(overlay.weaponSprites,5);
  await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(x=>writeFile(path.join(shots,'02-dao-hit.png'),Buffer.from(x.data,'base64')));
  const equipped=await evaluate("document.querySelector('#equipment-weapon')?.value");
  await evaluate("(()=>{const s=document.querySelector('#equipment-weapon');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  assert.equal(await evaluate("document.querySelector('#equipment-weapon')?.value"),'');
  await evaluate(`window.__worldRebuild.equipPossessedWeapon(${JSON.stringify(dao.weapon)})`);
  assert.equal(await evaluate("document.querySelector('#equipment-weapon')?.value"),'iron_dao');
  await evaluate('window.__worldRebuild.endPossessionForTest()');
  const secondFauna=await evaluate(`window.__worldRebuild.getFaunaState().records.find(f=>f.alive&&f.id!==${JSON.stringify(fauna)})?.id`);
  assert.ok(secondFauna,'second live fauna fixture exists');
  const setupJian=await evaluate(`window.__worldRebuild.prepareWeaponCombatTest(${JSON.stringify(jian.id)},${JSON.stringify(secondFauna)})`);
  assert.ok(setupJian.ok,JSON.stringify(setupJian));
  assert.equal(setupJian.weapon,'iron_sword');
  await evaluate('window.__worldRebuild.resetWeaponCooldownForTest()');
  await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(x=>writeFile(path.join(shots,'03-possessed-jian.png'),Buffer.from(x.data,'base64')));
  const jianBefore=await evaluate(`window.__worldRebuild.getFaunaState().records.find(f=>f.id===${JSON.stringify(secondFauna)}).hp`);
  const jianHit=await evaluate(`window.__worldRebuild.attackTest(${JSON.stringify(secondFauna)},false)`);
  assert.ok(jianHit.ok,JSON.stringify(jianHit));assert.equal(jianHit.weapon,'iron_sword');
  const jianAfter=await evaluate(`window.__worldRebuild.getFaunaState().records.find(f=>f.id===${JSON.stringify(secondFauna)}).hp`);
  assert.ok(jianAfter<jianBefore,`jian combat should reduce fauna HP (${jianBefore} -> ${jianAfter})`);
  await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(x=>writeFile(path.join(shots,'04-jian-hit.png'),Buffer.from(x.data,'base64')));
  await send('Browser.close').catch(()=>{});
  if(pageErrors.length)throw new Error(`Browser exceptions: ${pageErrors.join('; ')}`);
  console.log(JSON.stringify({ok:true,issued:state.armed.length,unarmed:state.unarmed,daoNpc:dao.id,jianNpc:jian.id,fauna,beforeHp:before,afterHp:after,daoHit:hit,jianFauna:secondFauna,jianBeforeHp:jianBefore,jianAfterHp:jianAfter,jianHit,equipmentRoundTrip:true,screenshots:[path.join(shots,'01-possessed-dao.png'),path.join(shots,'02-dao-hit.png'),path.join(shots,'03-possessed-jian.png'),path.join(shots,'04-jian-hit.png')],pageErrors},null,2));
} finally {
  try{ws?.close()}catch{}
  if(browser?.pid){try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore'})}catch{}}
  browser?.kill();
  await delay(700);
  for(let i=0;i<8;i++){try{await rm(profile,{recursive:true,force:true});break}catch{await delay(300)}}
}
