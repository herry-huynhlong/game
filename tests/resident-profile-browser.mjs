import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const activities=process.argv.includes('--activities');
const seed=activities?'2d36bc60-3269-4fe4-877b-0000000002cc':'2d36bc60-3269-4fe4-877b-0cea1df03455';
const port=Number(process.env.PERF_DEBUG_PORT??9278);
const output=resolve('art/previews/resident-profile');
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
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '${seed}'}return uuid()}}
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
  if(activities){
    const fixture=await evalScene(`
      const w=s.populationWorld,v=s.merchants.shops.get('city-market'),n=v.owner;
      const home=[[-300,0],[300,0],[0,-300],[0,300],[-275,100],[275,-100]].map(([x,y])=>({x:v.position.x+x,y:v.position.y+y}))
        .find(p=>s.groundPositionOpen(n,p.x,p.y)&&s.canReachPoint(p,v.position));
      if(!home)throw Error('No walkable meal destination');
      const pantry=w.factions.find(f=>f.name===n.faction);
      pantry.treasury.push({itemId:'ration',count:5});
      w.clock.minute=480;w.clock.speed=4;
      Object.assign(n,home,{home,goalAction:'rest',action:'rest',actionTarget:home,
        hunger:20,fatigue:8,safety:96,inventory:[],decisionSlot:undefined});
      s.npcSprites.get(n.id).setPosition(home.x,home.y);
      s.resetNpcRoute(n);s.syncGroundOccupancy();
      s.scheduler.byId.get(n.id).thinkDue=0;
      s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.1);s.cameras.main.centerOn(v.position.x-40,v.position.y);
      s.selectNPC(n.id);
      return {id:n.id,actualName:n.name,home,shop:v.position,profession:n.profession,faction:n.faction};
    `);
    const code=`const w=s.populationWorld,v=s.merchants.shops.get('city-market'),n=v.owner,e=s.scheduler.byId.get(n.id);`;
    const actor=body=>evalScene(code+body);
    const state=()=>actor(`
      s.refreshPossessionHud();
      const fields=s.residentProfile.fields,dist=Math.hypot(n.x-v.position.x,n.y-v.position.y);
      return {id:n.id,name:n.name,goal:n.goalAction,action:n.action,slot:n.decisionSlot,
        hunger:n.hunger,fatigue:n.fatigue,x:n.x,y:n.y,target:n.actionTarget,profession:n.profession,faction:n.faction,
        progress:n.actionProgress,minute:w.clock.minute,dist,serving:s.merchants.serving(v),
        activity:fields.activity.textContent,workplace:fields.workplace.textContent,note:fields.note.textContent,
        moving:s.npcSprites.get(n.id).getData('moving'),flight:Boolean(n.flight),
        workClaim:s.workstations.claims.get(n.id)?.action,marketVisit:Boolean(n.marketVisit),possession:s.possessedNpcId};
    `);
    const until=async(predicate,label)=>{
      let row;
      for(let i=0;i<140;i++){
        await sleep(100);
        row=await state();
        if(predicate(row))return row;
      }
      throw Error(label+' '+JSON.stringify({row,errors,failed}));
    };
    const toWork=await until(r=>r.goal==='trade'&&r.action==='travel'&&r.moving,'walking to counter');
    assert.equal(toWork.activity,'Đang đến Phường Thị Thanh Vân');
    assert.equal(await actor(`
      const previous={blocked:n.pathBlocked,since:e.blockedSince};
      n.pathBlocked=true;e.blockedSince=s.scheduler.time-3200;s.refreshPossessionHud();
      const activity=s.residentProfile.fields.activity.textContent;
      n.pathBlocked=previous.blocked;e.blockedSince=previous.since;s.refreshPossessionHud();
      return activity;
    `),'Đang chờ đường thông');
    const serving=await until(r=>r.serving,'serving');
    assert.equal(serving.activity,'Đang bán hàng tại Phường Thị Thanh Vân');
    assert.equal(serving.action,'trade');
    assert.equal(await run("document.querySelector('[data-profile=name]').textContent"),'Từ Nhất Minh');
    await shot('new-profile',true);
    await shot('merchant-serving');
    await run(`document.querySelector('[data-page=cultivation]').click()`);
    assert.equal(await run(`document.querySelector('[data-sheet=cultivation]').getBoundingClientRect().height>0`),true);
    await run(`document.querySelector('[data-page=inventory]').click()`);
    assert.equal(await run(`document.querySelector('[data-sheet=inventory]').textContent.includes('linh thạch')`),true);
    await run(`document.querySelector('[data-page=overview]').click()`);
    assert.equal(await run(`document.querySelector('[data-sheet=cultivation]').getBoundingClientRect().height`),0);
    await actor(`w.clock.minute=690;n.hunger=75;e.thinkDue=0;`);
    const toMeal=await until(r=>r.goal==='eat'&&r.action==='travel'&&r.moving,'walking to eat');
    assert.equal(toMeal.activity,'Đang đi tìm bữa ăn');
    assert.equal(toMeal.note,'Tạm rời quầy để ăn uống.');
    assert.equal(toMeal.serving,false);
    assert.ok(!toMeal.workClaim||toMeal.workClaim==='eat');
    await shot('merchant-going-to-eat');
    assert.equal(await actor('return s.persistPopulation();'),true,'Meal must be saved before reloading');
    await send('Page.reload',{ignoreCache:true});await sleep(650);await ready();
    await actor(`s.selectNPC(n.id);s.cameraTween?.stop();s.cameraTween=null;
      s.setZoom(1.1);s.cameras.main.centerOn(n.x,n.y);`);
    const restored=await state();
    assert.equal(restored.goal,'eat');
    assert.equal(restored.serving,false);
    assert.equal(restored.profession,fixture.profession);
    assert.equal(restored.workplace,toMeal.workplace);
    assert.deepEqual(restored.target,toMeal.target);
    const meal=await until(r=>r.action==='eat'&&!r.marketVisit,'eating');
    assert.equal(meal.activity,'Đang dùng bữa');
    const back=await until(r=>r.goal==='trade'&&r.action==='travel'&&r.hunger<44,'returning after meal');
    assert.equal(back.activity,toWork.activity);
    await until(r=>r.serving,'serving after meal');
    const retreat=await actor(`
      s.evadeFauna(n,{x:n.x-8,y:n.y+2},s.faunaNow());s.refreshPossessionHud();
      return {goal:n.goalAction,target:n.actionTarget,serving:s.merchants.serving(v),activity:s.residentProfile.fields.activity.textContent};
    `);
    assert.equal(retreat.goal,'flee');
    assert.equal(retreat.serving,false);
    assert.equal(retreat.activity,'Đang tránh nguy hiểm');
    await sleep(450);
    assert.deepEqual((await state()).target,retreat.target);
    await until(r=>r.serving,'returned after danger');
    await actor(`w.clock.minute=v.shop.closeHour*60;e.thinkDue=0;`);
    const closing=await until(r=>r.goal==='rest'&&r.action==='travel','returning home after closing');
    assert.equal(closing.activity,'Đang trên đường về nhà');
    assert.equal(closing.serving,false);
    const resting=await until(r=>r.action==='rest','resting after closing');
    assert.equal(resting.activity,'Đang nghỉ ngơi');
    const cultivator=await actor(`
      const c=w.npcs.find(c=>c.alive&&c.populationRole==='low_disciple');
      const p=s.cultivation.spots.reserve(c,true)??s.cultivation.spots.spots.find(p=>s.canReachPoint(c,p));
      Object.assign(c,p,{fatigue:0,hunger:10,safety:100,hp:145,mp:70,xp:5,action:'work',goalAction:'work',actionTarget:{x:p.x,y:p.y},decisionSlot:undefined,actionProgress:0});
      s.npcSprites.get(c.id).setPosition(c.x,c.y);s.resetNpcRoute(c);s.syncGroundOccupancy();
      s.selectNPC(c.id);s.refreshPossessionHud();const before=s.residentProfile.fields.activity.textContent;
      w.clock.minute=810;
      s.populationSimulation.tickNpc(c,1,w.clock.day,w.clock.minute,0);
      const entry=s.scheduler.byId.get(c.id),target=s.resolveWorkstation(entry,s.setNpcGoalTarget(c));
      if(target)c.actionTarget=target;
      s.confirmNpcPlan(entry);s.refreshPossessionHud();
      return {before,after:s.residentProfile.fields.activity.textContent,goal:c.goalAction,action:c.action,hasWorkSlot:s.workstations.claims.has(c.id)};
    `);
    assert.equal(cultivator.before,'Đang làm việc');
    assert.equal(cultivator.goal,'cultivate');assert.equal(cultivator.hasWorkSlot,false);
    assert.match(cultivator.after,/đả tọa/);
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:740,deviceScaleFactor:1,mobile:true});
    await actor('s.selectNPC(n.id);');await sleep(180);
    const mobile=await run(`(()=>{const p=document.querySelector('#possession-panel'),r=p.getBoundingClientRect(),name=p.querySelector('h3');
      return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth,
        font:getComputedStyle(name).fontFamily,lineHeight:getComputedStyle(name).lineHeight,tap:p.querySelector('#npc-gift').getBoundingClientRect().height};})()`);
    assert.ok(mobile.fits&&mobile.tap>=40&&mobile.font.includes('Segoe UI'),JSON.stringify(mobile));
    await shot('activity-mobile');
    await send('Emulation.clearDeviceMetricsOverride');

    await run("localStorage.removeItem('world-rebuild-1c-v1')");
    await send('Page.reload');await sleep(700);await ready();
    await actor(`w.clock.speed=4;window.activityAudit={ticks:0,startDay:w.clock.day,violations:[],transitions:0,seen:{},last:{},snapshots:[]};`);
    for(let batch=0;batch<36;batch++)await actor(`
      const audit=window.activityAudit;
      for(let frame=0;frame<120;frame++){
        s.updatePopulation(performance.now(),250);
        const {day,minute}=w.clock;
        if(++audit.ticks%5)continue;
        for(const v of s.merchants.byOwner.values()){
          const o=v.owner;if(!o.alive)continue;
          if(audit.last[o.id]&&audit.last[o.id]!==o.goalAction)audit.transitions++;
          audit.last[o.id]=o.goalAction;audit.seen[o.goalAction]=(audit.seen[o.goalAction]??0)+1;
          if(s.merchants.serving(v)&&(o.action!==o.goalAction||['eat','rest','flee'].includes(o.goalAction)||o.marketVisit))
            audit.violations.push({id:o.id,day,minute,type:'serving-while-busy'});
          if(o.goalAction==='eat'&&s.workstations.claims.get(o.id)?.action==='trade')
            audit.violations.push({id:o.id,day,minute,type:'meal-with-counter-claim'});
        }
        for(const o of w.npcs){
          if(o.id!==s.possessedNpcId&&o.flight?.altitude>12&&s.groundOccupancy.bodies.has(o.id)){
            // The ground grid is refreshed before flight advances, so require two consecutive samples.
            audit.air??={};if(audit.air[o.id]===audit.ticks-5)audit.violations.push({id:o.id,day,minute,type:'flight-and-ground'});
            audit.air[o.id]=audit.ticks;
          }
        }
      }
      if(audit.ticks%1440===0)audit.snapshots.push({day:w.clock.day,alive:w.npcs.filter(n=>n.alive).length});
    `);
    const simulation=await actor(`return {...window.activityAudit,roster:w.npcs.length,endDay:w.clock.day,
      shopCount:s.merchants.shops.size,groundActorCount:s.groundOccupancy.bodies.size};`);
    assert.equal(simulation.roster,108);assert.ok(simulation.endDay-simulation.startDay>=3);
    assert.deepEqual(simulation.violations,[]);
    assert.ok(simulation.transitions>0&&simulation.seen.eat>0&&simulation.seen.trade>0,JSON.stringify(simulation));
    await writeFile(join(output,'activities.json'),JSON.stringify({fixture,toWork,serving,toMeal,restored,meal,back,retreat,closing,resting,cultivator,mobile,simulation,errors,failed},null,2));
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log(JSON.stringify({name:fixture.actualName,simulation,cultivator,mobile}));
  }else{
  const choose=await evalScene(`
    const npc=s.populationWorld.npcs.find(n=>n.populationRole==='low_disciple');
    Object.assign(npc,{realmIndex:0,realmLevel:8,hp:134,xp:180});
    s.selectNPC(npc.id);return {id:npc.id,name:npc.name};
  `);
  const update=properties=>evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    Object.assign(n,${JSON.stringify(properties)});
    s.refreshPossessionHud();
  `);
  const field=name=>run('document.querySelector('+JSON.stringify('[data-profile="'+name+'"]')+')?.textContent');
  const refresh=()=>run("document.querySelector('.resident-portrait img').src");
  await sleep(260);
  assert.equal(await field('realm'),'Luyện Khí tầng 8');
  assert.match(await field('hp'),/^134 \/ \d+/);
  assert.match(await field('xp'),/^180 \/ \d+ · \d+%$/);
  const original=await refresh();
  assert.ok(original.startsWith('data:image/png;base64,')&&original.length>1100);
  await shot('after');
  await shot('after-card',true);
  await run("window.__stableProfile=document.querySelector('.resident-identity')");
  await update({hp:92,mp:47});
  assert.match(await field('hp'),/^92 \/ \d+/);
  assert.match(await field('mp'),/^47 \/ \d+/);
  assert.equal(await run("window.__stableProfile===document.querySelector('.resident-identity')"),true);
  await update({realmIndex:0,realmLevel:9,xp:10000});
  assert.equal(await field('realm'),'Luyện Khí tầng 9');
  assert.equal(await field('flight'),'Chưa thể ngự kiếm');
  assert.match(await field('cultivation'),/viên mãn/);
  await shot('luyen-khi-9');
  await update({realmIndex:1,realmLevel:1,xp:20,hp:180,mp:1});
  assert.equal(await field('realm'),'Trúc Cơ tầng 1');
  assert.equal(await field('flight'),'Đủ cảnh giới ngự kiếm');
  assert.match(await field('flightDetail'),/Linh lực chưa đủ/);
  await update({realmLevel:8,mp:125,hp:185,inventory:[],equippedWeapon:null,skills:[]});
  assert.equal(await field('realm'),'Trúc Cơ tầng 8');
  assert.match(await field('flightDetail'),/Cần kiếm/);
  await update({realmLevel:0});
  assert.equal(await field('realm'),'Chưa có tu vi');
  assert.equal(await run("document.querySelector('[data-progress=xp]').hidden"),true);
  await update({realmLevel:1,hp:180,mp:98,xp:25,skills:['qi-sword']});
  assert.equal(await evalScene('return s.persistPopulation()'),true);
  const tab=await send('Target.createTarget',{url:origin+'/npc-xianxia-editor.html?npc='+encodeURIComponent(choose.id)});
  let editor;
  try{
    let target;
    for(let i=0;i<50&&!target;i++){
      target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(page=>page.id===tab.targetId);
      if(!target)await sleep(100);
    }
    assert.ok(target);
    editor=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok,fail)=>{editor.onopen=ok;editor.onerror=fail});
    let serial=0;
    const evalEditor=expression=>new Promise((ok,fail)=>{
      const request=++serial;
      editor.onmessage=e=>{
        const m=JSON.parse(e.data);if(m.id!==request)return;
        if(m.result.exceptionDetails)fail(Error(m.result.exceptionDetails.exception?.description??m.result.exceptionDetails.text));else ok(m.result.result.value);
      };
      editor.send(JSON.stringify({id:request,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
    });
    let ready=false;
    for(let i=0;i<120&&!ready;i++){
      ready=await evalEditor("Boolean(window.__characterEditor&&document.querySelector('#roster-cultivation')?.textContent.includes('Trúc Cơ tầng 1'))");
      if(!ready)await sleep(100);
    }
    assert.ok(ready,'Character Editor shows canonical realm');
    const change=part=>evalEditor(`(()=>{
      const input=document.getElementById(${JSON.stringify(part)}),previous=input.value;
      const choice=[...input.options].find(o=>!o.disabled&&o.value!==previous);
      input.value=choice.value;input.dispatchEvent(new Event('change'));
      document.querySelector('#roster-manual').click();document.querySelector('#roster-confirm').click();
      return {previous,next:input.value,status:document.querySelector('#roster-status').textContent};
    })()`);
    let earlier=original;
    for(const part of ['hair','outfit','outfitColor']){
      const changeResult=await change(part);
      assert.match(changeResult.status,/Đã lưu 1/);
      assert.notEqual(changeResult.previous,changeResult.next);
      let current=earlier;
      for(let i=0;i<40&&current===earlier;i++){await sleep(100);current=await refresh();}
      assert.notEqual(current,earlier,part+' appears in the open profile after editor saved');
      assert.equal(await evalScene(`return s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)}).modularAppearance.look[${JSON.stringify(part)}]`),changeResult.next);
      earlier=current;
    }
  }finally{editor?.close();await send('Target.closeTarget',{targetId:tab.targetId});}
  await send('Page.bringToFront');
  await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    s.cameraTween?.stop();s.cameraTween=null;s.cameras.main.centerOn(n.x,n.y);
    s.cameras.main.preRender();
    s.updatePopulation(s.time.now,16);
    s.npcAppearanceFleet.update(s.time.now,80);
  `);
  const match=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    const portrait=s.residentProfile.portraits.renderer,live=s.npcAppearanceFleet.entries.get(n.id)?.renderer;
    const keys=['bodyType','face','eyes','eyebrows','hair','hairColor','outfit','outfitColor','accessory','headwear'];
    return {visible:s.npcSprites.get(n.id).visible,missing:keys.filter(key=>
      portrait.appearance[key]!==n.modularAppearance.look[key]||live?.appearance[key]!==n.modularAppearance.look[key])};
  `);
  assert.ok(match.visible&&match.missing.length===0,JSON.stringify(match));
  await shot('editor-sync');
  const edited=await refresh();
  await evalScene("return s.persistPopulation()");
  await send('Page.reload',{ignoreCache:true});await ready();
  await evalScene(`s.selectNPC(${JSON.stringify(choose.id)});`);
  assert.equal(await field('realm'),'Trúc Cơ tầng 1');
  assert.equal(await refresh(),edited);
  const avatarSeries=[];
  for(const [label,role] of [['merchant','merchant'],['elder','elder'],['hunter','hunter']]){
    const img=await evalScene(`
      const n=s.populationWorld.npcs.find(n=>n.populationRole===${JSON.stringify(role)});s.selectNPC(n.id);
      return s.residentProfile.image.src;
    `);
    assert.ok(img.startsWith('data:image/png'));
    avatarSeries.push(img);
    await sleep(160);await shot(label,true);
  }
  assert.equal(new Set(avatarSeries).size,3);
  const cache=await evalScene(`
    const all=s.populationWorld.npcs,cache=s.residentProfile.portraits;
    const textures=s.textures.getTextureKeys().length;
    const targetCountBefore=s.children.list.length;
    for(const n of all){s.selectedNpcId=n.id;s.refreshPossessionHud();}
    return {capacity:cache.cache.size,roster:all.length,texturesBefore:textures,texturesAfter:s.textures.getTextureKeys().length,
      childrenBefore:targetCountBefore,childrenAfter:s.children.list.length};
  `);
  assert.equal(cache.capacity,24);
  assert.equal(cache.roster,108);
  assert.equal(cache.texturesAfter,cache.texturesBefore);
  assert.equal(cache.childrenAfter,cache.childrenBefore);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:740,deviceScaleFactor:1,mobile:true});
  await evalScene(`s.selectNPC(${JSON.stringify(choose.id)});`);
  await sleep(170);
  const mobile=await run(`(()=>{
    const panel=document.querySelector('#possession-panel'),r=panel.getBoundingClientRect();
    const first=document.querySelector('#npc-gift').getBoundingClientRect();
    return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,minTap:first.height,
      noHorizontalScroll:panel.scrollWidth<=panel.clientWidth};
  })()`);
  assert.ok(mobile.fits&&mobile.minTap>=40&&mobile.noHorizontalScroll,JSON.stringify(mobile));
  await shot('mobile');
  await send('Emulation.clearDeviceMetricsOverride');
  const advanced=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)}),w=s.populationWorld;
    n.xp=10000;n.actionCooldown=0;n.inventory.push({itemId:'qi_pill',count:1});
    s.populationSimulation.breakthroughIfReady(n,w.clock.day,w.clock.minute);
    s.refreshPossessionHud();
    return {level:n.realmLevel,event:w.events.findLast(e=>e.type==='npc-breakthrough')?.description,progress:n.xp};
  `);
  assert.equal(advanced.level,2);
  assert.match(advanced.event,/Trúc Cơ tầng 2/);
  assert.equal(advanced.progress,0);
  assert.equal(await field('realm'),'Trúc Cơ tầng 2');
  await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    Object.assign(n,{realmIndex:0,realmLevel:9,flightCooldown:0,mp:120,hp:145});
    s.populationWorld.heaven.divinePower=10000;s.syncGroundOccupancy();
    const p=s.flyingSword.chooseLanding(n,n,true);
    if(!p)throw Error('No free launch point');
    Object.assign(n,p);s.syncSwordActor(n);s.syncGroundOccupancy();s.selectNPC(n.id);s.beginPossession();
  `);
  const pressV=async()=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'v',code:'KeyV',windowsVirtualKeyCode:86});
    await sleep(120);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'v',code:'KeyV',windowsVirtualKeyCode:86});
  };
  await pressV();
  assert.equal(await evalScene("return s.flyingSword.active.has(s.possessedNpcId)"),false);
  await update({realmIndex:1,realmLevel:1,mp:120,hp:180});
  await pressV();
  assert.equal(await evalScene("return s.flyingSword.active.has(s.possessedNpcId)"),true);
  assert.match(await field('flightDetail'),/Đang (cất cánh|ngự kiếm)/);
  await shot('possessed');
  await pressV();
  await sleep(870);
  assert.equal(await evalScene("return s.flyingSword.active.has(s.possessedNpcId)"),false);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(join(output,'verification.json'),JSON.stringify({npc:choose,cache,mobile,editorSync:true,advanced,realmBounds:true,saveReload:true,keyboard:true},null,2));
  console.log(JSON.stringify({npc:choose,cache,mobile,editorSync:true,advanced,realmBounds:true,saveReload:true,keyboard:true}));
  }
}finally{ws?.close();chrome.kill();}
