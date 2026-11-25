import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9284);
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

  const waitFor=async(expression)=>{for(let i=0;i<80;i++){if(await run(expression))return;await sleep(125)}throw Error(expression);};
  const key=(type,code,key,n)=>send('Input.dispatchKeyEvent',{type,code,key,windowsVirtualKeyCode:n,nativeVirtualKeyCode:n});
  const tap=async(code,name,n)=>{await key('keyDown',code,name,n);await sleep(125);await key('keyUp',code,name,n);};
  const readyExpression='Boolean(window.__worldRebuild?.ready())';
  await visit('/?testMode=1',readyExpression);
  const layout=await evalScene(`
    const w=s.populationWorld;w.clock.minute=600;w.clock.speed=1;
    const v=s.merchants.shops.get('city-market');
    const n=w.npcs.find(n=>n.populationRole==='commoner'&&n.alive);
    window.tradeCase={owner:v.owner.id,actor:n.id,shop:v.shop.id};
    Object.assign(v.owner,{...v.position,hunger:10,fatigue:10,safety:100,decisionSlot:undefined,actionProgress:0});
    s.populationSimulation.tickNpc(v.owner,1,w.clock.day,w.clock.minute,0);
    s.npcSprites.get(v.owner.id).setPosition(v.owner.x,v.owner.y);
    const directions=[[-1,0,'KeyD','d',68],[1,0,'KeyA','a',65],[0,-1,'KeyS','s',83],[0,1,'KeyW','w',87]];
    const casePoint=directions.map(([dx,dy,...key])=>({x:v.position.x+dx*79,y:v.position.y+dy*79,key})).find(p=>
      s.merchants.line(v.position,p)&&[0,.2,.4,.6].every(f=>s.groundPositionOpen(n,p.x+(v.position.x-p.x)*f,p.y+(v.position.y-p.y)*f)));
    Object.assign(n,{x:casePoint.x,y:casePoint.y,spiritStones:100,hunger:12});
    s.npcSprites.get(n.id).setPosition(n.x,n.y);
    s.selectNPC(n.id);s.beginPossession();s.setZoom(1.1);
    return {key:casePoint.key,range:s.merchants.canTrade(n,v),shops:s.merchants.shops.size};
  `);
  assert.equal(layout.shops,5);
  assert.equal(layout.range,false);
  await tap('KeyE','e',69);
  assert.equal(await run("document.querySelector('#merchant-panel').open"),false);
  await key('keyDown',...layout.key);
  for(let i=0;i<22;i++){
    await sleep(75);
    if(await run("!document.querySelector('#merchant-prompt').hidden"))break;
  }
  await key('keyUp',...layout.key);
  await waitFor("!document.querySelector('#merchant-prompt').hidden");
  await tap('KeyE','e',69);
  await waitFor("document.querySelector('#merchant-panel').open");
  const snapshot=`const w=s.populationWorld,c=window.tradeCase,n=w.npcs.find(n=>n.id===c.actor),
    shop=w.shops.find(v=>v.id===c.shop), city=w.factions.find(f=>f.id==='qingyun-city');
    return {x:n.x,y:n.y,stones:n.spiritStones,cash:shop.cash,tax:city.wealth,sellPrice:shop.sellPrices.ration,buyPrice:shop.buyPrices.ration,
      stock:shop.stock.find(i=>i.itemId==='ration')?.count??0,items:n.inventory.find(i=>i.itemId==='ration')?.count??0,
      transactions:w.economy.transactions.filter(t=>t.shopId===shop.id&&t.itemId==='ration'&&(t.buyerId===n.id||t.sellerId===n.id)).length};`;
  const before=await evalScene(snapshot);
  const rejected=await evalScene(`
    const m=s.merchants,v=m.shops.get(window.tradeCase.shop),n=s.populationWorld.npcs.find(n=>n.id===window.tradeCase.actor);
    const soldOut=m.quote(n,v,'buy','ration',1000);
    const coins=n.spiritStones;n.spiritStones=0;
    const broke=m.quote(n,v,'buy','ration',1);n.spiritStones=coins;
    const save=s.persistPopulation;s.persistPopulation=()=>false;
    const conflict=m.execute(n,v,'buy','ration',1,true);s.persistPopulation=save;
    return [soldOut.ok,broke.ok,conflict.ok];
  `);
  assert.deepEqual(rejected,[false,false,false]);
  assert.deepEqual(await evalScene(snapshot),before);
  await run("document.querySelector('[data-item=ration]').click()");
  await shot('shop-buy');
  await run("document.querySelector('[data-confirm]').click();document.querySelector('[data-confirm]').click()");
  const buy=await evalScene(snapshot);
  assert.equal(buy.transactions,before.transactions+1);
  assert.equal(buy.stones,before.stones-before.sellPrice);
  assert.equal(buy.items,before.items+1);
  assert.equal(buy.stock,before.stock-1);
  assert.equal(buy.cash+buy.tax,before.cash+before.tax+before.sellPrice);
  await run("document.querySelector('[data-side=sell]').click();document.querySelector('[data-item=ration]').click()");
  await shot('shop-sell');
  await run("document.querySelector('[data-confirm]').click()");
  const sell=await evalScene(snapshot);
  assert.equal(sell.stones,buy.stones+buy.buyPrice-Math.floor(buy.buyPrice*.05));
  assert.equal(sell.stock,before.stock);
  assert.equal(sell.items,before.items);
  assert.equal(sell.transactions,buy.transactions+1);
  await tap('Escape','Escape',27);
  assert.equal(await run("document.querySelector('#merchant-panel').open"),false);
  assert.equal(await run('window.__worldRebuild.getPossessionState().active'),true);
  await key('keyDown',...layout.key);
  await sleep(125);
  await key('keyUp',...layout.key);
  const resumed=await evalScene(snapshot);
  assert.ok(Math.hypot(resumed.x-sell.x,resumed.y-sell.y)>3);
  const context=await run('window.tradeCase');
  await send('Page.reload');
  await sleep(800);
  await ready();
  await run('window.tradeCase='+JSON.stringify(context));
  const reloaded=await evalScene(snapshot);
  for(const field of ['stones','stock','items','cash','transactions'])assert.equal(reloaded[field],sell[field],field);
  assert.equal(await run('window.__worldRebuild.getPossessionState().npcId'),context.actor);
  await writeFile(join(output,'trade-player.json'),JSON.stringify({layout,before,buy,sell,resumed,reloaded,errors,failed},null,2));
  const market=await evalScene(`
    const w=s.populationWorld,m=s.merchants,v=m.shops.get('city-market');
    Object.assign(v.owner,{...v.position,hunger:10,fatigue:10,safety:100,decisionSlot:undefined,actionProgress:0});
    s.populationSimulation.tickNpc(v.owner,1,w.clock.day,w.clock.minute,0);
    s.npcSprites.get(v.owner.id).setPosition(v.position.x,v.position.y);
    const hunters=w.npcs.filter(n=>n.alive&&n.populationRole==='hunter').slice(0,5);
    const ids=new Set(hunters.map(n=>n.id));
    m.nextDecision=new Map(w.npcs.filter(n=>!ids.has(n.id)).map(n=>[n.id,Infinity]));
    const before=v.shop.stock.find(i=>i.itemId==='wolf_fang')?.count??0;
    const coins=v.shop.cash;
    const trial=[];
    for(const radius of [120,142,104,157,180,91])for(let j=0;j<16&&trial.length<hunters.length;j++){
      const t=j*Math.PI/8,x=Math.round(v.position.x+Math.cos(t)*radius),y=Math.round(v.position.y+Math.sin(t)*radius);
      const n=hunters[trial.length];
      if(!s.groundPositionOpen(n,x,y)||!s.canReachPoint({x,y},v.position)||trial.some(p=>Math.hypot(x-p.x,y-p.y)<30))continue;
      trial.push({id:n.id,x,y,stones:n.spiritStones});
      Object.assign(n,{x,y,realmIndex:0,realmLevel:1,hp:200,hunger:15,fatigue:12,safety:100,goalAction:'work',actionTarget:{x,y},
        faunaHuntLimitDay:w.clock.day,faunaHuntsToday:1,faunaEvadeUntil:undefined,
        faunaHuntTargetId:undefined,flight:undefined,marketVisit:undefined,marketRetryAt:undefined,inventory:[{itemId:'wolf_fang',count:1}]});
      s.npcSprites.get(n.id).setPosition(x,y);s.npcRoutes.delete(n.id);
      s.syncGroundOccupancy();
    }
    for(const n of hunters) m.start(n,m.propose(n));
    s.cameraFollowSuspended=true;s.cameras.main.centerOn(v.position.x,v.position.y);
    window.marketCase={trial,before,coins};
    return {count:trial.length,visits:m.report().visits.filter(x=>ids.has(x.id))};
  `);
  assert.equal(market.count,5);
  assert.equal(market.visits.length,5);
  await shot('market-traffic');
  const frames=await run(`new Promise(resolve=>{
    const times=[];let last=0;
    function sample(time){
      if(last)times.push(time-last);
      last=time;
      if(times.length<100){requestAnimationFrame(sample);return;}
      const sorted=[...times].sort((a,b)=>a-b),s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
      resolve({fps:100000/times.reduce((a,b)=>a+b,0),p95Ms:sorted[94],
        visits:s.merchants.report().visits.length,width:innerWidth,height:innerHeight,zoom:s.cameras.main.zoom});
    }
    requestAnimationFrame(sample);
  })`);
  const automatic=await evalScene(`
    const {trial,before,coins}=window.marketCase,w=s.populationWorld,m=s.merchants,v=m.shops.get('city-market');
    const npcs=trial.map(p=>w.npcs.find(n=>n.id===p.id)),ids=new Set(trial.map(p=>p.id));
    let maxClaims=0,duplicateSlots=0,invalid=0;
    for(let i=0;i<1500;i++){
      s.scheduler.time+=50;s.syncGroundOccupancy();s.routesStartedThisFrame=0;s.routeLimit=15;s.routeDeadline=Infinity;s.worldMoveBudget=100;
      m.tick(s.scheduler.time);
      const slots=m.report().visits.filter(v=>ids.has(v.id)&&v.slot).map(v=>v.slot.x+':'+v.slot.y);
      maxClaims=Math.max(maxClaims,slots.length);duplicateSlots+=slots.length-new Set(slots).size;
      for(const n of npcs){s.moveAutonomousNpc(s.scheduler.byId.get(n.id));if(!s.footprintTerrainOpen(n.x,n.y,8,4))invalid++}
    }
    return {maxClaims,duplicateSlots,invalid,before,coins,stock:v.shop.stock.find(i=>i.itemId==='wolf_fang')?.count??0,cash:v.shop.cash,
      rows:npcs.map((n,i)=>({id:n.id,coins:n.spiritStones-trial[i].stones,left:!n.marketVisit,goal:n.goalAction,reason:n.shortGoal,
        traveled:Math.hypot(n.x-trial[i].x,n.y-trial[i].y),item:n.inventory.find(j=>j.itemId==='wolf_fang')?.count??0,
        sales:w.economy.transactions.filter(t=>t.sellerId===n.id&&t.itemId==='wolf_fang'&&t.shopId===v.shop.id).length}))};
  `);
  await writeFile(join(output,'trade-market.json'),JSON.stringify({market,automatic,frames},null,2));
  assert.equal(automatic.duplicateSlots,0);
  assert.equal(automatic.invalid,0);
  assert.ok(automatic.maxClaims>=4);
  assert.equal(automatic.rows.filter(n=>n.sales===1&&n.coins===12&&n.left&&n.item===0).length,5,JSON.stringify(automatic));
  assert.equal(automatic.stock,automatic.before+5);
  assert.equal(automatic.cash,automatic.coins-60);
  const pharmacy=await evalScene(`
    const w=s.populationWorld,m=s.merchants,v=m.shops.get('city-apothecary'),owner=v.owner;
    const n=w.npcs.find(n=>n.alive&&n.populationRole==='commoner'&&n.id!==s.possessedNpcId);
    const count=(items,id)=>items.find(i=>i.itemId===id)?.count??0;
    w.clock.minute=610;
    Object.assign(owner,{...v.position,hunger:10,fatigue:10,safety:100,decisionSlot:undefined,actionProgress:0});
    v.retryAt=0;v.shop.healingBrewDay=undefined;
    s.populationSimulation.tickNpc(owner,1,w.clock.day,w.clock.minute,0);
    v.shop.stock=[{itemId:'spirit_herb',count:4}];
    const pulse=()=>{s.scheduler.time+=500;m.tick(s.scheduler.time);};
    pulse();
    const manufactured={herbs:count(v.shop.stock,'spirit_herb'),medicine:count(v.shop.stock,'healing_pill')};
    pulse();
    const noDuplicate=count(v.shop.stock,'healing_pill')===manufactured.medicine;
    const slot=v.counter[0];
    Object.assign(n,{x:slot.x,y:slot.y,goalAction:'rest',flight:undefined,hp:10,spiritStones:32,inventory:[],marketVisit:undefined,marketRetryAt:undefined});
    const choice=m.propose(n),result=m.execute(n,v,'buy',choice.itemId,1);
    const remaining=count(v.shop.stock,'healing_pill');
    m.propose(n);
    const health=n.hp;
    w.clock.minute=v.shop.closeHour*60;
    s.populationSimulation.tickNpc(owner,1,w.clock.day,w.clock.minute,0);
    m.tick(s.scheduler.time+500);
    return {manufactured,noDuplicate,item:choice.itemId,paid:result.ok,stones:n.spiritStones,remaining,health,
      healingConsumed:count(n.inventory,'healing_pill')===0,closed:!m.serving(v),returning:owner.goalAction==='rest'};
  `);
  assert.deepEqual(pharmacy.manufactured,{herbs:2,medicine:1});
  assert.equal(pharmacy.noDuplicate,true);
  assert.equal(pharmacy.item,'healing_pill');
  assert.equal(pharmacy.paid,true);
  assert.equal(pharmacy.stones,16);
  assert.equal(pharmacy.remaining,0);
  assert.ok(pharmacy.health>10);
  assert.ok(pharmacy.healingConsumed&&pharmacy.closed&&pharmacy.returning);
  await writeFile(join(output,'trade-market.json'),JSON.stringify({market,automatic,frames,pharmacy},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  console.log(JSON.stringify({playerTrade:true,saveRollback:true,reload:true,customers:automatic.rows.length,
    duplicateSlots:automatic.duplicateSlots,invalid:automatic.invalid,frames}));
}finally{ws?.close();chrome.kill();}
