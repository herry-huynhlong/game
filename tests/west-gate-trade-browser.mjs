import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9281);
const output=resolve('art/previews/world-trade');
const profile=await mkdtemp(join(tmpdir(),'tvk-resident-profile-'));
await mkdir(output,{recursive:true});
const chrome=spawn(process.env.CHROME_EXE??'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--no-first-run',
  '--remote-debugging-port='+port,'--window-size=1600,1050','--user-data-dir='+profile,'about:blank',
],{stdio:'ignore',windowsHide:true});
let ws;
try {
  let target;
  for(let i=0;i<100&&!target;i++){
    try{target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(page=>page.type==='page')}catch{}
    if(!target)await sleep(100);
  }
  assert.ok(target);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
  let id=0;
  const pending=new Map(),errors=[],failed=[];
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id){const req=pending.get(m.id);pending.delete(m.id);if(req)m.error?req.fail(Error(m.error.message)):req.ok(m.result)}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
    if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!m.params.response.url.endsWith('/favicon.ico'))failed.push(m.params.response.url);
  };
  function send(method,params={}) {
    return new Promise((ok,fail)=>{pending.set(++id,{ok,fail});ws.send(JSON.stringify({id,method,params}))});
  }
  async function run(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  }
  const scene="const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');";
  const evalScene=code=>run(`(()=>{${scene}${code}})()`);
  async function ready(){
    for(let i=0;i<100;i++){if(await run('Boolean(window.__worldRebuild?.ready())'))return;await sleep(125)}
    throw Error('WorldScene not ready: '+JSON.stringify(errors));
  }
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<100;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async(name,profile=false)=>{
    const clip=profile?await run(`(()=>{
      const r=document.querySelector('#possession-panel').getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};
    })()`):undefined;
    const image=await send('Page.captureScreenshot',{format:'png',clip});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };



  await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
  const wall=await evalScene(`
    const gate=s.passageTraffic.gates.find(g=>g.id==='gate-west'),m=s.merchants;
    const venue=m.shops.get('city-market');
    const actor=s.populationWorld.npcs.find(n=>n.id!==venue.owner.id&&n.alive);
    for(const dy of [-140,-110,-95,95,110,140])for(const dx of [18,22,26,30]){
      const a={x:gate.x-dx,y:gate.y+dy},b={x:gate.x+dx,y:gate.y+dy};
      if(!s.footprintTerrainOpen(a.x,a.y,8,4)||!s.footprintTerrainOpen(b.x,b.y,8,4)||m.line(a,b))continue;
      const buyer={...actor,...a,flight:undefined,ascended:false};
      const owner={...venue.owner,...b,flight:undefined,ascended:false,hunger:10,fatigue:10,safety:100,
        action:'trade',goalAction:'trade',decisionSlot:'shop-shift:'+venue.shop.id,lawResponse:null};
      const shop={...venue.shop,openHour:0,closeHour:24};
      const fixture={owner,shop,position:b};
      return {serving:m.serving(fixture),rejected:!m.canTrade(buyer,fixture),distance:2*dx};
    }
    return null;
  `);
  assert.ok(wall?.serving&&wall.rejected&&wall.distance<=64,JSON.stringify(wall));
  const data=await evalScene(`
    const g=s.passageTraffic.gates.find(g=>g.id==='gate-west'),w=s.populationWorld;
    for(const n of w.npcs)n.alive=false;
    s.merchants.next=Infinity;const trial=w.npcs.filter(n=>n.populationRole==='commoner').slice(0,10).map((n,i)=>{
      const side=i<5?-1:1, rank=i%5;
      Object.assign(n,{alive:true,x:g.x+side*(60+Math.floor(rank/2)*30),y:g.y+(rank%2?18:-18)+Math.floor(rank/4)*36,goalAction:'work',
        actionTarget:{x:g.x-side*150,y:g.y+(rank-2)*28},realmIndex:0,realmLevel:1});
      s.npcSprites.get(n.id).setPosition(n.x,n.y);
      return {n,side};
    });
    let invalid=0,overlaps=0,lastArrivalMs=0;const crossed=new Set();
    for(let i=0;i<4800;i++){
      s.scheduler.time+=50;s.syncGroundOccupancy();s.routesStartedThisFrame=0;s.routeLimit=15;s.routeDeadline=Infinity;s.worldMoveBudget=100;
      for(const {n} of trial)s.moveAutonomousNpc(s.scheduler.byId.get(n.id));
      invalid+=trial.filter(({n})=>!s.footprintTerrainOpen(n.x,n.y,8,4)).length;
      overlaps+=s.groundOccupancy.overlaps().length; for(const {n,side} of trial){if((n.x-g.x)*side< -100)crossed.add(n.id);} if(crossed.size===trial.length){lastArrivalMs=(i+1)*50;break;}
    }
    return {lastArrivalMs,crossed:crossed.size,g:{x:g.x,y:g.y,current:g.current,requests:[...g.requests].map(([k,v])=>({k,stage:v.stage,bay:v.bay,seen:v.seen}))},lanes:g.lanes,invalid,overlaps,rows:trial.map(({n,side})=>{const e=s.scheduler.byId.get(n.id);return {id:n.id,side,x:Math.round(n.x),y:Math.round(n.y),blocked:n.pathBlocked,wait:e.passageWait,retry:e.retryAt,detour:e.detour,current:s.npcRoutes.get(n.id)?.points.slice(n.routeIndex,n.routeIndex+3),goal:n.actionTarget}})};
  `);
  await writeFile(join(output,'gate-bidirectional-after.json'),JSON.stringify({...data,wall},null,2));
  assert.equal(data.crossed,10);
  assert.equal(data.invalid,0);
  assert.equal(data.overlaps,0);
  assert.deepEqual(errors,[]);
  await evalScene("s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.2);s.cameras.main.centerOn(1984,2192);");
  await sleep(450);
  await shot('gate-after');
  console.log(JSON.stringify({crossed:data.crossed,lastArrivalMs:data.lastArrivalMs,invalid:data.invalid,overlaps:data.overlaps}));
}finally{ws?.close();chrome.kill();}
