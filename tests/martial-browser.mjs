import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {captureCommerce} from './commerce-browser.mjs';
import {captureBalance} from './combat-balance-browser.mjs';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9477);
const output=resolve('art/previews/thien-dia-dau-phap');
const profile=await mkdtemp(join(tmpdir(),'tvk-population-profile-'));
await mkdir(output,{recursive:true});
const chrome=spawn(process.env.CHROME_EXE??'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--no-first-run','--enable-precise-memory-info',
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
    return new Promise((ok,fail)=>{
      const request=++id, timer=setTimeout(()=>{pending.delete(request);fail(Error('Chrome timeout '+method));},60000);
      pending.set(request,{ok:value=>{clearTimeout(timer);ok(value);},fail:error=>{clearTimeout(timer);fail(error);}});
      ws.send(JSON.stringify({id:request,method,params}));
    });
  }
  async function run(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  }
  const scene="const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');";
  const evalScene=code=>run(`(()=>{${scene}${code}})()`);
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('HeapProfiler.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    (()=>{const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}})();
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<240;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed,boot:await run("window.__worldBoot?.snapshot()")}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };
  const ready="Boolean(window.__worldRebuild?.ready())";
  if(process.argv.includes('--balance')){
    await captureBalance({send,evalScene,visit,ready,errors,failed});
  }else if(process.argv.includes('--commerce')){
    await captureCommerce({send,evalScene,visit,ready,errors,failed});
  }else{
  await visit('/?combatGallery=1&testMode=1',ready);
  const control=`const lab=s.martialGallery;const field=(n,v)=>{const el=document.querySelector('[data-martial="'+n+'"]');el.value=v;el.dispatchEvent(new Event('change'));};`;
  const fixture=await evalScene(control+`
    field('speed',0);field('zoom',1);field('detail',2);
    return {sample:lab.snapshot(),list:[...document.querySelector('[data-martial="course"]').options].map(option=>option.value),catalog:document.querySelector('.martial-catalog button')!==null};
  `);
  assert.ok(fixture.sample.target,JSON.stringify(fixture));
  assert.equal(fixture.list.length,15);
  await run("document.querySelector('.martial-catalog').open=true");
  await shot('catalogue-15-cong-phap-15-vu-khi');
  await run("document.querySelector('.martial-catalog').open=false");
  const evidence=new Set([0,3,6,9,10,11,12,13,14]);
  const checks=[];
  for(const [i,course] of fixture.list.entries()){
    const moves=await evalScene(control+`
      field('course',${JSON.stringify(course)});
      return [...document.querySelector('[data-martial="skill"]').options].map(option=>option.value);
    `);
    for(const [j,move] of moves.entries()){
      const capture=evidence.has(i)&&(j===2||j===1&&[11,13,14].includes(i));
      const name=([11,13,14].includes(i)?move:course);
      const start=await evalScene(control+`
        field('skill',${JSON.stringify(move)});
        if(${j}===0)field('weapon',document.querySelector('[data-martial="weapon"]').options[${i}+1].value);
        const before=lab.snapshot();
        const fired=document.querySelector('.martial-gallery-controls button').onclick();
        const cast=s.martialCombat.casts.get(before.actorId);
        if(!cast)return {fired,before};
        const start=Math.round((cast.timeline.manifest+cast.timeline.release)/2);
        lab.advance(start);s.martialCombat.render();
        return {fired,before,start,timeline:cast.timeline,type:cast.skill.effect,
          mp:cast.qiCost,expectedHits:cast.skill.hits,after:lab.snapshot(),cool:cast.npc.martial.ready[cast.skill.id]>cast.at};
      `);
      assert.equal(start.fired,true,move+' '+JSON.stringify(start));
      assert.ok(start.cool,move);
      assert.ok(Math.abs(start.before.actor.mp-start.after.actor.mp-start.mp)<1e-7,move);
      if(capture)await shot(name+'-01-hien-hinh');
      const impact=start.timeline.impact+(move==='myriad-unite'?820:170);
      await evalScene(control+`lab.advance(${impact-start.start});s.martialCombat.render(); return lab.snapshot();`);
      if(capture)await shot(name+'-02-va-cham');
      const end=await evalScene(control+`lab.advance(${start.timeline.aftermath+100-impact});s.martialCombat.render();return lab.snapshot();`);
      if(capture)await shot(name+'-03-du-am');
      assert.ok(end.hits>0,move+' '+JSON.stringify(end));
      if(start.type==='heal')assert.ok(end.actor.hp>start.before.actor.hp,move);
      else if(start.type==='dash')assert.ok(Math.hypot(end.actor.x-start.before.actor.x,end.actor.y-start.before.actor.y)>0,move);
      else if(start.type!=='guard')assert.ok(end.target.hp<start.before.target.hp,move);
      const clean=await evalScene(control+`for(let i=0;i<32;i++)lab.advance(250);return s.martialCombat.casts.size+s.martialCombat.conditions.size;`);
      assert.equal(clean,0,move);
      checks.push({course,move,type:start.type,hits:end.hits,damage:start.before.target.hp-end.target.hp});
    }
  }
  const gates=await evalScene(control+`
    field('realm',0);field('mastery',4);
    const rejected=document.querySelector('.martial-gallery-controls button').onclick()===false;
    field('realm',4);field('mastery',0);field('skill',document.querySelector('[data-martial="skill"]').options[2].value);
    const locked=document.querySelector('.martial-gallery-controls button').onclick()===false;
    return {rejected,locked,hasUnisolatedSave:Object.keys(localStorage).some(key=>/population-v|world-rebuild-population/.test(key))};
  `);
  assert.deepEqual(gates,{rejected:true,locked:true,hasUnisolatedSave:false});
  const ritual=await evalScene(control+`
    field('speed',0);field('zoom','game');field('course','myriad-sword');field('skill','myriad-unite');field('mastery',4);field('realm',4);
    field('weapon','heaven_thunder_jian');
    const start=lab.snapshot();
    const near=s.populationWorld.npcs.find(n=>n.alive&&n.id!==start.actorId&&n.realmIndex<4);
    for(const itemId of ['steel_jian','jade_jian','purple_jian','heaven_thunder_jian','void_jian'])
      if(!near.inventory.some(row=>row.itemId===itemId))near.inventory.push({itemId,count:1});
    return {start};
  `);
  await sleep(1800);
  const begin=await evalScene(control+`
    const start=lab.snapshot();
    const fired=document.querySelector('.martial-gallery-controls button').onclick();
    const cast=s.martialCombat.casts.get(start.actorId);
    const repeated=s.martialCombat.cast(cast.npc,cast.skill.id,cast.target);
    return {fired,repeated,target:cast?.targetId,length:cast?.timeline.complete,loans:cast?.swords.map(sword=>({id:sword.instance.id,owner:sword.instance.ownerId}))};
  `);
  assert.equal(begin.fired,true);
  assert.equal(begin.repeated,false);
  assert.equal(begin.length,10000);
  assert.ok(begin.loans.length>=2);
  assert.equal(new Set(begin.loans.map(x=>x.id)).size,begin.loans.length);
  let before=0;
  const ritualFrames=[];
  for(const [time,title] of [[650,'01-van-cong'],[1490,'02-khau-quyet'],[3160,'03-muon-kiem'],[5510,'04-kiem-tran'],
    [6140,'05-kiem-xuat-phat'],[7070,'06-kiem-va-cham'],[9150,'07-kiem-quy-chu'],[10010,'08-hoan-tat']]){
    const state=await evalScene(control+`lab.advance(${time-before});s.martialCombat.render();return lab.snapshot();`);
    if(time<6000){assert.equal(state.hits,0,title);assert.equal(state.target.hp,ritual.start.target.hp,title);}
    if(time===5510)assert.ok(state.actor.z>=40);
    if(time===6140)assert.ok(state.projectiles>=1);
    if(time===7070)assert.ok(state.impactEvents>=1);
    if(time===10010){assert.equal(state.actor.z,0);assert.ok(state.hits>=2);}
    ritualFrames.push({time,title,...state});
    await shot('van-kiem-'+title);
    before=time;
  }
  const cleared=await evalScene(control+`return {casts:s.martialCombat.casts.size,borrowed:s.martialCombat.borrowed.size,props:s.martialCombat.props.swords.filter(sprite=>sprite.visible).length};`);
  assert.deepEqual(cleared,{casts:0,borrowed:0,props:0});
  const buildingImpact=await evalScene(control+`
    field('target','building');field('course','nine-skies');field('skill','thunder-earth');
    const before=lab.snapshot(), other=s.populationWorld.environment.objects.map(item=>[item.id,item.hp]);
    const fired=document.querySelector('.martial-gallery-controls button').onclick();
    const cast=s.martialCombat.casts.get(before.actorId);
    if(!cast)return {before,fired};
    lab.advance(cast.timeline.impact+130);
    const after=lab.snapshot();
    const damaged=s.populationWorld.environment.objects.filter(item=>item.hp<other.find(row=>row[0]===item.id)[1]).map(item=>item.id);
    const unchanged=s.populationWorld.environment.objects.length-damaged.length;
    return {fired,before,after,damaged,unchanged};
  `);
  assert.ok(buildingImpact.fired&&buildingImpact.damaged.length>0&&buildingImpact.unchanged>0,JSON.stringify(buildingImpact));
  await shot('loi-kich-cong-trinh');
  const speeds=await evalScene(control+`
    const result=[];
    for(const speed of [0,1,2,4]){
      field('speed',speed);
      const initial=s.martialCombat.clock;
      lab.step(100);
      result.push(s.martialCombat.clock-initial);
    }
    field('speed',0);field('target','beast');return result;
  `);
  assert.deepEqual(speeds,[0,100,200,400]);
  const duel=await evalScene(control+`
    field('target','npc');field('course','breeze');field('skill','breeze-cut');
    const before=lab.snapshot();
    const fired=document.querySelector('.martial-gallery-controls button').onclick();
    const cast=s.martialCombat.casts.get(before.actorId);
    if(cast)lab.advance(1000);
    return {fired,locked:cast?.targetId===before.target.id,hit:lab.snapshot().target.hp<before.target.hp};
  `);
  assert.deepEqual(duel,{fired:true,locked:true,hit:true});
  await evalScene(control+"field('target','beast');return true;");
  const views=await evalScene(control+`
    field('realm',4);field('mastery',4);field('course','breeze');
    const tested=[];
    for(const dir of ['left','up','down','right']){
      field('direction',dir);
      const fixture=lab.snapshot();
      const fired=document.querySelector('.martial-gallery-controls button').onclick();
      tested.push({direction:s.martialCombat.casts.get(fixture.actorId)?.direction,fired});
      lab.advance(700);
    }
    const zooms=[1,2,4].map(zoom=>{field('zoom',zoom);return s.cameras.main.zoom;});
    field('site','bank');field('zoom','game');
    return {tested,zooms,target:lab.snapshot().target?.id};
  `);
  assert.deepEqual(views.tested,['left','up','down','right'].map(direction=>({direction,fired:true})));
  assert.deepEqual(views.zooms,[1,2,4]);
  assert.ok(views.target);
  await shot('san-thu-ven-song');
  await evalScene(control+"field('site','forest');return true;");
  const autonomous=await evalScene(control+`
    field('course','breeze');field('mastery',2);field('realm',0);
    const fixture=lab.snapshot(),npc=s.scheduler.byId.get(fixture.actorId).npc,foe=s.populationWorld.environment.fauna.find(f=>f.id===fixture.target.id);
    npc.hp=1000;
    const invoked=s.martialCombat.ai(npc,foe);
    const selected=s.martialCombat.casts.get(npc.id)?.skill.id;
    lab.advance(900);
    return {invoked,selected,damaged:foe.hp<fixture.target.hp};
  `);
  assert.ok(autonomous.invoked&&autonomous.damaged&&['breeze-cut','breeze-three','breeze-return'].includes(autonomous.selected),JSON.stringify(autonomous));
  const battle=await evalScene(control+`
    field('realm',4);field('mastery',4);field('speed',0);field('zoom','game');
    field('course','golden-crow');field('skill','nine-suns');field('weapon','crow_dao');field('group',8);
    document.querySelector('.martial-gallery-controls button').onclick();
    const combat=s.martialCombat,castCount=combat.casts.size;
    lab.advance(2650);s.martialCombat.render();
    return {castCount,remaining:combat.casts.size};
  `);
  assert.equal(battle.castCount,8,JSON.stringify(battle));
  assert.equal(battle.remaining,8,JSON.stringify(battle));
  await sleep(180);
  Object.assign(battle,await evalScene(`
    const combat=s.martialCombat;
    return {stamps:combat.vanPhap.used,titles:combat.props.titles.filter(node=>node.visible).length};
  `));
  assert.ok(battle.stamps>100,JSON.stringify(battle));
  assert.equal(battle.titles,1,JSON.stringify(battle));
  await shot('giao-chien-dong-thoi');
  battle.render=await run(`new Promise(resolve=>{
    let last=0, first=0;const times=[];
    const step=time=>{if(!first)first=time;if(last)times.push(time-last);last=time;
      const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
      s.martialGallery.advance(1);
      if(time-first<4200)requestAnimationFrame(step);
      else{times.sort((a,b)=>a-b);resolve({count:times.length,fps:Math.round(times.length*100000/(time-first))/100,
        p95:times[Math.floor(times.length*.95)]});}
    };requestAnimationFrame(step);
  })`);
  await writeFile(join(output,'combat-results.json'),JSON.stringify({checks,gates,battle,ritualFrames,buildingImpact,speeds},null,2)+'\n');
  const loadStarted=performance.now();
  await visit('/?testMode=1&populationTest=180',ready);
  const sceneReadyMs=performance.now()-loadStarted;
  const worldFrame=await run(`new Promise(resolve=>{
    const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
    const city=s.markers.find(m=>m.id==='city-center');
    const entryStarted=performance.now();
    s.navigateCameraTo(city.x,city.y,'martial-benchmark',false,.95);
    const timings={};const restore=[];
    for(const [target,key] of [[s.martialCombat,'advance'],[s.martialCombat,'render'],[s.martialEconomy,'tick']]){
      const original=target[key];timings[key]={count:0,total:0,max:0};
      target[key]=function(...args){
        const before=performance.now(),result=original.apply(this,args);
        if(recording){
          const used=performance.now()-before,measure=timings[key];
          measure.count++;measure.total+=used;measure.max=Math.max(measure.max,used);
        }
        return result;
      };
      restore.push(()=>{target[key]=original;});
    }
    const times=[];let prior=0,started=0,recording=false,cityReadyMs;
    const step=time=>{
      if(!started)started=time;
      if(cityReadyMs===undefined&&!s.cameraTween&&s.cameras.main.worldView.contains(city.x,city.y)){
        cityReadyMs=performance.now()-entryStarted;
      }
      if(prior&&recording)times.push(time-prior);
      recording=time-started>=3500;
      prior=time;
      if(time-started<10500)requestAnimationFrame(step);
      else{
        const total=times.reduce((sum,value)=>sum+value,0);
        times.sort((a,b)=>a-b);
        restore.forEach(fn=>fn());
        resolve({fps:Math.round(times.length*100000/total)/100,p95:times[Math.floor(times.length*.95)],
          p99:times[Math.floor(times.length*.99)],max:times.at(-1),roster:s.populationWorld.npcs.length,timings,navBuildMs:s.navigationBuildMs,cityReadyMs});
      }
    };
    requestAnimationFrame(step);
  })`);
  assert.ok(worldFrame.cityReadyMs>0);
  worldFrame.sceneReadyMs=sceneReadyMs;
  const market=await evalScene(`
    const w=s.populationWorld;
    const venue=s.merchants.shops.get('city-forge');
    const npc=w.npcs.find(n=>n.alive&&!n.minor&&n.id!==venue?.owner.id&&n.spiritStones>=32);
    const book=venue?.shop.stock.find(row=>row.itemId==='manual_breeze');
    if(!npc||!book)return {venue:Boolean(venue),buyer:Boolean(npc),stock:venue?.shop.stock.map(row=>row.itemId)};
    const faction=w.factions.find(f=>f.id==='qingyun-city');
    const total=()=>npc.spiritStones+venue.shop.cash+(faction?.wealth??0);
    w.clock.minute=720;
    const before={money:total(),count:book.count};
    Object.assign(venue.owner,venue.position,{hunger:0,fatigue:0,safety:100,goalAction:'work',action:'work',decisionSlot:'shop-shift:city-forge',marketVisit:undefined});
    Object.assign(npc,venue.counter[0],{profession:'tu_si',vocation:undefined,hunger:0,fatigue:0,flight:undefined,wallLevel:0,underground:false});
    const pending=s.martialEconomy.intent(npc);
    const trade=s.merchants.execute(npc,venue,'buy','manual_breeze',1);
    const learned=trade.ok&&s.martialEconomy.learn(npc,'manual_breeze');
    const duplicate=s.martialEconomy.learn(npc,'manual_breeze');
    Object.assign(npc,{realmIndex:4,realmLevel:9,vocation:'smith',inventory:[...npc.inventory,{itemId:'iron_ore',count:2},{itemId:'wood',count:2}]});
    const forge=s.martialEconomy.forge(npc,'steel_jian');
    const wood=npc.inventory.find(x=>x.itemId==='wood')?.count;
    const conserved=total()===before.money;
    npc.equippedWeapon=null;npc.action='idle';
    const slot=w.npcs.indexOf(npc);
    w.clock.minute+=(19-(w.clock.day*1440+w.clock.minute+slot*3)%19)%19;
    s.martialEconomy.tick();
    s.persistPopulation();
    return {pending,trade:trade.ok,message:trade.message,learned,duplicate,forge,wood,conserved,autoEquip:npc.equippedWeapon,stockDelta:before.count-book.count,
      id:npc.id,saved:Boolean(npc.martial),issued:s.martialEconomy.sources.seeded};
  `);
  assert.equal(market.trade,true,JSON.stringify(market));
  assert.equal(market.conserved,true,JSON.stringify(market));
  assert.equal(market.learned,true);
  assert.equal(market.duplicate,false);
  assert.equal(market.forge,true,JSON.stringify(market));
  assert.equal(market.wood,1);
  assert.ok(market.pending,JSON.stringify(market));
  assert.equal(market.autoEquip,'steel_jian',JSON.stringify(market));
  await visit('/?testMode=1&populationTest=180',ready);
  const reloaded=await evalScene(`
    const w=s.populationWorld,n=s.scheduler.byId.get(${JSON.stringify(market.id)})?.npc;
    return {book:n?.martial?.active,weapon:n?.inventory.some(row=>row.itemId==='steel_jian'),seeded:s.martialEconomy.sources.seeded,
      count:w.npcs.length,stock:s.merchants.shops.get('city-forge').shop.stock.find(row=>row.itemId==='manual_breeze')?.count};
  `);
  assert.deepEqual(reloaded,{book:'breeze',weapon:true,seeded:true,count:180,stock:3});
  const pendingAuction=await evalScene(`
    const w=s.populationWorld,eco=s.martialEconomy;
    const smith=s.scheduler.byId.get(${JSON.stringify(market.id)}).npc;
    const item='heaven_thunder_jian';
    const forage=s.merchants.shops.get('city-forge');
    Object.assign(smith,forage.counter[0],{vocation:'smith',realmIndex:4,realmLevel:9});
    smith.martial.learned['purple-sword']=470;
    for(const id of ['beast_core_gold','thunder_fruit','red_fire_crystal'])
      smith.inventory.push({itemId:id,count:2});
    const product=n=>n.inventory.find(row=>row.itemId===item)?.count??0;
    const forged=eco.forge(smith,item);
    const duplicate=eco.forge(smith,item);
    eco.reward({species:'eagle',rank:'elite',id:'test-elite'},smith);
    const exclusive=product(smith)===1&&smith.inventory.some(row=>row.itemId==='manual_nine-skies');
    const venue=s.merchants.shops.get('city-market');
    const buyers=w.npcs.filter(n=>n.alive&&!n.minor&&n!==smith&&n!==venue.owner).slice(0,2);
    w.clock.minute=720;
    Object.assign(venue.owner,venue.position,{hunger:0,fatigue:0,safety:100,goalAction:'trade',action:'trade',decisionSlot:'shop-shift:city-market',marketVisit:undefined});
    Object.assign(smith,venue.counter[0],{wallLevel:0,underground:false,flight:undefined});
    for(const [i,buyer] of buyers.entries()){
      Object.assign(buyer,venue.counter[Math.min(i+1,venue.counter.length-1)],
        {hunger:0,fatigue:0,wallLevel:0,underground:false,flight:undefined,spiritStones:1200});
    }
    const money=()=>smith.spiritStones+buyers.reduce((total,n)=>total+n.spiritStones,0);
    const initial=money();
    const listed=eco.listAuction(smith,item), row=eco.auctions.at(-1);
    if(!listed)return {forged,duplicate,exclusive,listed,position:venue.position,sale:venue.shop.id};
    const bids=buyers.map(n=>eco.bidAuction(n,row));
    const paid=row.bids[0]?.price;
    s.persistPopulation();
    return {forged,duplicate,exclusive,listed,bids,paid,seller:smith.id,buyer:buyers[1].id,rival:buyers[0].id,initial};
  `);
  const {seller,buyer,rival,initial,...opening}=pendingAuction;
  assert.deepEqual(opening,{forged:true,duplicate:false,exclusive:true,listed:true,bids:[true,true],paid:660});
  await visit('/?testMode=1&populationTest=180',ready);
  const rareMarket=await evalScene(`
    const item='heaven_thunder_jian',eco=s.martialEconomy,row=eco.auctions[0];
    const [seller,buyer,rival]=${JSON.stringify([seller,buyer,rival])}.map(id=>s.scheduler.byId.get(id).npc);
    if(!row)return {restored:false};
    const product=n=>n.inventory.find(stack=>stack.itemId===item)?.count??0;
    eco.auctionTick(row.expires);eco.auctionTick(row.expires+1);
    const conserved=seller.spiritStones+buyer.spiritStones+rival.spiritStones===${initial};
    s.persistPopulation();
    return {restored:true,won:product(buyer),lost:product(rival),seller:product(seller),conserved,pending:eco.auctions.length,
      recorded:eco.world.economy.transactions.filter(t=>t.itemId===item&&t.buyerId===buyer.id).length};
  `);
  assert.deepEqual(rareMarket,{restored:true,won:1,lost:0,seller:0,conserved:true,pending:0,recorded:1});
  const retaliation=await evalScene(`
    const w=s.populationWorld, combat=s.martialCombat;
    const n=w.npcs.find(n=>n.id===${JSON.stringify(seller)});
    const beast=w.environment.fauna.find(f=>f.alive&&!s.monsterSafe(f)&&[[46,0],[0,46],[-46,0],[0,-46]].some(([dx,dy])=>
      s.footprintTerrainOpen(f.x+dx,f.y+dy,10,7)&&s.clearCombatLine({x:f.x+dx,y:f.y+dy},f)));
    const rival=w.environment.fauna.find(f=>f!==beast&&f.alive);
    const around=[[46,0],[0,46],[-46,0],[0,-46]].map(([dx,dy])=>({x:beast.x+dx,y:beast.y+dy,wallLevel:0}));
    const open=around.find(p=>s.footprintTerrainOpen(p.x,p.y,10,7)&&s.clearCombatLine(p,beast));
    Object.assign(n,open,{hp:600,mp:1000,realmIndex:beast.realmIndex??0,realmLevel:3,action:'idle',goalAction:'idle',convalescence:undefined,
      martial:{active:'breeze',learned:{breeze:240},ready:{}}});
    n.aiProfile.axes.courage=85;
    s.npcSprites.get(n.id).setPosition(n.x,n.y);
    s.syncGroundOccupancy();
    const full=s.recovery.status(n).maximum;n.hp=full;n.mp=100*4**n.realmIndex;
    s.monsterHitNpc(n,4,beast.id,'overhaul-retaliation');
    const hp=n.hp, locked=combat.locked(n)?.id===beast.id;
    const noSwitch=combat.engage(n,rival)===false;
    s.navigateCameraTo(n.x,n.y,'martial-retaliation',true,1);
    combat.retaliate();
    const actual=combat.casts.get(n.id)?.targetId===beast.id;
    return {hp,hurt:hp<full,locked,noSwitch,actual};
  `);
  assert.deepEqual({...retaliation,hp:undefined},{hp:undefined,hurt:true,locked:true,noSwitch:true,actual:true});
  await shot('phan-cong-ai-worldscene');
  const worldBuilding=await evalScene(`
    const w=s.populationWorld, combat=s.martialCombat;
    const n=w.npcs.find(n=>n.id===${JSON.stringify(seller)});
    const b=w.environment.objects.find(o=>o.id==='commission-hall'), aim={...b.repairSite,structure:true};
    const position={x:aim.x-82,y:aim.y,wallLevel:0};
    Object.assign(n,position,{hp:600,mp:25600,realmIndex:4,realmLevel:9,spiritualRoot:'metal',
      martial:{active:'nine-skies',learned:{'nine-skies':800},ready:{}}});
    s.npcSprites.get(n.id).setPosition(n.x,n.y);
    combat.clear();
    s.syncGroundOccupancy();
    let casts=0,afterOne;
    for(let i=0;i<8&&b.hp>0;i++){
      n.martial.ready={};n.martial.next=0;n.mp=25600;
      if(combat.cast(n,'thunder-earth',aim))casts++;
      combat.advance(4100);
      if(i===0)afterOne=b.hp;
    }
    const footprint=s.martialBuildingSolids.get(b.id);
    s.persistPopulation();
    return {casts,afterOne,id:b.id,hp:b.hp,stage:b.status,collision:b.collision,enabled:footprint.enabled,
      cases:s.civic.cases.filter(c=>c.kind==='propertyDamage'&&c.siteId===b.id).length};
  `);
  assert.ok(worldBuilding.afterOne>0,JSON.stringify(worldBuilding));
  assert.equal(worldBuilding.hp,0,JSON.stringify(worldBuilding));
  assert.equal(worldBuilding.stage,'destroyed');
  assert.equal(worldBuilding.collision,null);
  assert.equal(worldBuilding.enabled,false);
  assert.ok(worldBuilding.cases>0);
  await visit('/?testMode=1&populationTest=180',ready);
  const buildingReload=await evalScene(`
    const b=s.populationWorld.environment.objects.find(o=>o.id===${JSON.stringify(worldBuilding.id)});
    return {hp:b.hp,shown:s.buildingSprites.get(b.id).visible,enabled:s.martialBuildingSolids.get(b.id).enabled};
  `);
  assert.deepEqual(buildingReload,{hp:0,shown:false,enabled:false});
  await writeFile(join(output,'combat-results.json'),JSON.stringify({checks,gates,views,battle,worldFrame,market,reloaded,autonomous,ritualFrames,buildingImpact,speeds,duel,retaliation,worldBuilding,buildingReload,
    rareMarket:{...opening,...rareMarket}},null,2)+'\n');
  if(process.argv.includes('--combat-only')){
    assert.deepEqual(errors,[]);
    assert.deepEqual(failed,[]);
    console.log('Verified '+checks.length+' martial techniques in WorldScene.');
  }else{
  await visit('/?testMode=1&populationTest=108',ready);
  const readEconomy=`
    const w=s.populationWorld;
    return {
      day:w.clock.day,minute:w.clock.minute,
      roster:w.npcs.filter(n=>n.alive&&!n.minor).map(n=>({id:n.id,profession:n.profession,role:n.populationRole,stones:n.spiritStones,
        action:n.action,known:Object.keys(n.martial?.learned??{}),armed:n.equippedWeapon})),
      factions:w.factions.map(f=>({id:f.id,wealth:f.wealth})),
      shops:w.shops.map(shop=>({id:shop.id,cash:shop.cash,prices:Object.fromEntries(Object.entries(shop.sellPrices).filter(([id])=>
        /manual_|^spirit_herb$|core|^healing_pill$|^iron_ore$|^ration$/.test(id)))})),
      trades:w.economy.transactions, events:w.events.filter(e=>/pay|wage|work|mine|trade|quest|martial|commission/.test(e.type)),
      orders:s.sectCampus.snapshot().orders?.map(o=>({type:o.type,reward:o.reward,status:o.status})),
      production:s.sectCampus.production.state.totals,
      liquidity:w.npcs.reduce((sum,n)=>sum+n.spiritStones,0)+w.factions.reduce((sum,f)=>sum+f.wealth,0)+w.shops.reduce((sum,shop)=>sum+shop.cash,0)
    };
  `;
  const schedule=await evalScene(`
    const w=s.populationWorld;
    w.clock.paused=true;s.martialObservedWork=new Set();s.martialCashFlow={};
    return w.clock.minute;
  `);
  const step=minutes=>evalScene(`
    const w=s.populationWorld, work=s.martialObservedWork;
    w.clock.paused=false;w.clock.speed=4;
    for(let i=0;i<${minutes};i++){
      const wallets=new Map(w.npcs.map(n=>[n.id,n.spiritStones]));
      s.updatePopulation(s.time.now+i*250,250);
      for(const n of w.npcs)if(['work','trade','hunt','gather','farm','mine','craft','repair','fight'].includes(n.action))work.add(n.id);
      for(const n of w.npcs){
        const difference=n.spiritStones-(wallets.get(n.id)??n.spiritStones);
        if(!difference)continue;
        const row=s.martialCashFlow[n.profession]??={inflow:0,outflow:0};
        if(difference>0)row.inflow+=difference;else row.outflow-=difference;
      }
    }
    w.clock.paused=true;return {day:w.clock.day,minute:w.clock.minute};
  `);
  if(schedule)for(let left=1440-schedule;left>0;left-=120)await step(Math.min(120,left));
  const daily=[],workSets=[];
  daily.push(await evalScene(readEconomy));
  const simulationDays=Number(process.env.MARTIAL_SIM_DAYS??5);
  await evalScene('s.martialCashFlow={};return true;');
  for(let day=0;day<simulationDays;day++){
    await evalScene('s.martialObservedWork.clear();return true;');
    for(let left=1440;left>0;left-=120)await step(Math.min(120,left));
    daily.push(await evalScene(readEconomy));
    workSets.push(new Set(await evalScene('return [...s.martialObservedWork];')));
  }
  const samples=[];
  for(const [i,work] of workSets.entries()){
    const newer=new Map(daily[i+1].roster.map(n=>[n.id,n]));
    for(const n of daily[i].roster)if(work.has(n.id)&&newer.has(n.id)){
      samples.push({day:daily[i].day,id:n.id,profession:n.profession,role:n.role,net:newer.get(n.id).stones-n.stones});
    }
  }
  const median=values=>{const a=values.toSorted((x,y)=>x-y),i=Math.floor(a.length/2);return a.length?(a[i]+a[Math.ceil(a.length/2)-1])/2:null;};
  const byProfession=Object.fromEntries([...new Set(samples.map(n=>n.profession))].map(profession=>{
    const group=samples.filter(n=>n.profession===profession);
    return [profession,{count:group.length,median:median(group.map(n=>n.net))}];
  }));
  const worker=samples.filter(n=>n.profession==='tu_si');
  const report={byProfession,simulationDays,walletCashFlow:await evalScene('return s.martialCashFlow;'),cultivatorNet:{count:worker.length,median:median(worker.map(n=>n.net)),
    positiveMedian:median(worker.filter(n=>n.net>0).map(n=>n.net))},snapshots:daily.map(({roster,trades,events,...rest})=>({
      ...rest,independentMedian:median(roster.filter(n=>n.role==='independent_cultivator').map(n=>n.stones)),
      trades:trades.filter(t=>t.day===rest.day-1).length,learned:roster.filter(n=>n.known.length).length,
      martial:events.filter(e=>e.type.startsWith('martial-')).length,
    }))};
  await writeFile(join(output,'economy-results.json'),JSON.stringify(report,null,2)+'\n');
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  console.log('Verified '+checks.length+' martial techniques in WorldScene.');
  }
  }
} finally {
  ws?.close();
  chrome.kill();
}
