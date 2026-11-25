import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9434);
const output=resolve('art/previews/di-mach-bi-canh');
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
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    (()=>{const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}})();
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<240;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };

  const ready="Boolean(window.__worldRebuild?.ready())";


  await visit('/?testMode=1',ready);
  await visit('/?testMode=1',ready);
  const overview=await evalScene(`
    const u=s.underground,w=s.populationWorld;
    const a=u.sites.get('sect-jade');
    const b=[...u.sites.values()].find(x=>x.kind==='iron');
    const n=w.npcs.find(n=>n.alive&&u.canEnter(n,a)&&!n.wallLevel&&!n.flight);
    if(!n)throw Error('No eligible test NPC');
    n.x=a.point.x;n.y=a.point.y;s.npcSprites.get(n.id).setPosition(n.x,n.y);
    n.wallLevel=0;s.syncGroundOccupancy();
    const order={id:'cave-browser-order',name:'Khai thác Thanh Ngọc',type:'spirit-vein:'+a.id,status:'active',quantity:2,collected:0,veinId:a.id,assignee:n.id,item:a.item,merit:2,reward:3,escrow:3,expires:9000};
    s.sectCampus.state.orders.push(order);
    u.workOrder(n,a.id,order);
    if(!n.underground)throw Error('The active work order did not enter the cave');
    u.view.show(a.id);
    const other=u.instance(b), previousCount=b.state.amount;
    const start=w.clock.minute;
    for(let i=0;i<17;i++){w.clock.minute++;u.tick();}
    return {sites:u.sites.size,npc:n.id,start,now:w.clock.minute,underground:n.underground,otherCount:previousCount,stock:Object.values(other.stock).reduce((a,b)=>a+b,0),surfaceVisible:s.npcSprites.get(n.id).visible,population:w.npcs.length};
  `);
  assert.equal(overview.population,108);
  assert.equal(overview.surfaceVisible,false);
  assert.equal(overview.sites,16);
  assert.equal(overview.otherCount,overview.stock);
  assert.ok(overview.underground.x!==2||overview.underground.y!==8);
  await shot('01-npc-dang-xuong-mo');
  const result=await evalScene(`
    const u=s.underground,w=s.populationWorld,a=u.sites.get('sect-jade'),n=w.npcs.find(n=>n.id===${JSON.stringify(overview.npc)});
    const b=[...u.sites.values()].find(x=>x.kind==='iron');
    const before=a.state.amount;
    const start={x:n.underground.x,y:n.underground.y};
    u.view.hide();
    for(let i=0;i<115;i++){w.clock.minute++;u.tick();}
    const held=n.inventory.find(x=>x.itemId===a.item)?.count??0;
    const campus=s.sectCampus,order=campus.state.orders.find(x=>x.id==='cave-browser-order');
    const returned=!n.underground;
    const desk=campus.site('counter'),clerk=campus.clerk,anchor={x:n.x,y:n.y};
    Object.assign(clerk,{x:desk.x,y:desk.y,decisionSlot:'sect-campus:quests',hunger:0,fatigue:0,hp:1000,flight:null,skyStep:null,wallLevel:0});
    const counter=[{x:desk.x,y:desk.y+18},{x:desk.x-20,y:desk.y},{x:desk.x+20,y:desk.y}]
      .find(p=>s.merchants.line(p,clerk));
    Object.assign(n,counter);
    const balance=n.spiritStones;
    const paid=campus.deliver(n,order.id),repeated=campus.deliver(n,order.id);
    const wage=n.spiritStones-balance;
    Object.assign(n,anchor);
    if(!u.enter([n],a))throw Error('Could not re-enter');
    u.view.show(a.id);s.persistPopulation();
    return {start,ore:b.state.amount,before,after:a.state.amount,held,collected:order.collected,returned,paid,repeated,wage, underground:n.underground,
      stock:Object.values(u.instance(a).stock).reduce((a,b)=>a+b,0)};

  `);
  assert.equal(result.collected,2);
  assert.ok(result.returned);
  assert.equal(result.paid,true);
  assert.equal(result.repeated,false);
  assert.equal(result.wage,3);
  assert.equal(result.before-result.after,2);
  assert.equal(result.after,result.stock);
  assert.ok(result.held>=2);
  await shot('02-tru-luong-sau-khi-khai-thac');
  await visit('/?testMode=1',ready);
  const saved=await evalScene(`
    const u=s.underground,w=s.populationWorld,a=u.sites.get('sect-jade'),n=w.npcs.find(n=>n.id===${JSON.stringify(overview.npc)});
    const ids=w.npcs.filter(x=>x.id===n.id).length;
    const d=n.underground;
    u.view.show(a.id);
    return {amount:a.state.amount,ids,d,population:w.npcs.length};
  `);
  assert.equal(saved.ids,1);
  assert.equal(saved.amount,result.after);
  assert.equal(saved.d.siteId,'sect-jade');
  assert.equal(saved.population,108);
  await shot('03-tai-lai-cung-instance');
  const observed=await evalScene(`
    const u=s.underground;
    const site=u.sites.get('forbidden-heart');
    const prior=site.state.discovered;
    u.view.show(site.id,site.grade-1);
    return {previous:prior,current:site.state.discovered,amount:site.state.amount,level:u.view.level,allocated:!!u.state.instances[site.id]};
  `);
  assert.equal(observed.previous,observed.current);
  assert.equal(observed.level,3);
  assert.equal(observed.allocated,false);
  await shot('04-linh-mach-cuc-pham-tang-4');
  const field=await evalScene(`
    const u=s.underground,w=s.populationWorld,a=u.sites.get('sect-jade');
    u.view.hide();
    s.cameras.main.centerOn(a.point.x,a.point.y);
    s.setZoom(1.05);
    s.inspector.select({kind:'spiritVein',id:a.id});
    return {label:s.inspector.panel.querySelector('h2').textContent,fields:s.inspector.panel.querySelector('dl').textContent,
      open:s.inspector.undergroundButton.hidden,blocked:[...u.sites.values()].filter(site=>!s.footprintTerrainOpen(site.point.x,site.point.y,9,6)).map(site=>site.id)};
  `);
  assert.equal(field.open,false);
  assert.ok(field.label.includes('Thanh Ngọc'));
  await shot('05-giam-dinh-cua-mo');
  assert.deepEqual(field.blocked,[]);
  await evalScene("s.inspector.undergroundButton.click(); return true");
  const rates=[];
  for(const mode of [0,1,2,4]){
    const start=await evalScene(`
      const u=s.underground,w=s.populationWorld;
      u.view.el('speed').value=String(${mode});u.view.el('speed').dispatchEvent(new Event('change'));
      return {minute:w.clock.day*1440+w.clock.minute,frames:s.game.loop.frame,wall:performance.now()};
    `);
    await sleep(3600);
    const end=await evalScene(`
      const w=s.populationWorld;
      return {minute:w.clock.day*1440+w.clock.minute,frames:s.game.loop.frame,wall:performance.now()};
    `);
    rates.push({mode,minutes:end.minute-start.minute,fps:Math.round((end.frames-start.frames)*1000/(end.wall-start.wall))});
  }
  assert.equal(rates[0].minutes,0);
  assert.ok(rates[1].minutes>=1&&rates[2].minutes>rates[1].minutes&&rates[3].minutes>rates[2].minutes,JSON.stringify(rates));
  const fixture=await evalScene(`
    const u=s.underground,w=s.populationWorld,site=u.sites.get('sect-jade');
    u.view.hide();w.clock.paused=true;
    const n=w.npcs.find(n=>n.id===${JSON.stringify(overview.npc)});
    delete n.underground;n.x=site.point.x;n.y=site.point.y;n.flight=null;n.skyStep=null;n.wallLevel=0;
    s.npcSprites.get(n.id).setPosition(n.x,n.y);s.syncGroundOccupancy();
    w.heaven.divinePower=120;
    s.selectNPC(n.id);s.beginPossession();
    return {id:n.id,controlled:s.possessedNpcId===n.id,x:n.x,y:n.y};
  `);
  assert.equal(fixture.controlled,true);
  const key=async(code,keyCode,hold=120)=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:code.toLowerCase(),code:'Key'+code,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});
    await sleep(hold);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:code.toLowerCase(),code:'Key'+code,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});
    await sleep(130);
  };
  await key('E',69);
  const enters=await evalScene("return s.scheduler.byId.get(s.possessedNpcId).npc.underground");
  assert.equal(enters?.siteId,'sect-jade');
  await key('D',68,460);
  const moved=await evalScene("return s.scheduler.byId.get(s.possessedNpcId).npc.underground");
  assert.ok(moved.x>enters.x+1);
  await key('A',65,650);
  await key('E',69);
  const exits=await evalScene("const n=s.scheduler.byId.get(s.possessedNpcId).npc;return {inside:!!n.underground,x:n.x,y:n.y};");
  assert.equal(exits.inside,false);
  assert.deepEqual([exits.x,exits.y],[fixture.x,fixture.y]);
  const party=await evalScene(`
    s.endPossession(); const u=s.underground,w=s.populationWorld,a=u.sites.get('sect-jade');
    const team=w.npcs.filter(n=>u.canEnter(n,a)).slice(0,4);
    team.forEach((n,i)=>{n.x=a.point.x+(i%2)*24;n.y=a.point.y+Math.floor(i/2)*24;s.npcSprites.get(n.id).setPosition(n.x,n.y)});
    s.syncGroundOccupancy();
    const refused=u.enter(team,a,{type:'party',id:'test-party'},25);
    const partial=team.some(n=>n.underground);
    const accepted=u.enter(team,a,{type:'party',id:'test-party'},40);
    const destinations=team.map(n=>n.underground?.siteId);
    const footprint=new Set(team.map(n=>JSON.stringify([n.underground?.x,n.underground?.y]))).size;
    const beastSite=[...u.sites.values()].find(x=>x.map.floors[0].lair?.species===0);
    const c=u.instance(beastSite),floor=beastSite.map.floors[0],hunter=team[0];
    Object.assign(hunter.underground,floor.lair,{siteId:beastSite.id,floor:0,job:null});
    hunter.hp=500;
    const phases=[];
    for(let t=0;t<12;t++){if(++w.clock.minute===1440){w.clock.minute=0;w.clock.day++;}u.beastTick(beastSite,c,0,[hunter]);phases.push(c.beasts[0].phase);}
    u.view.show(beastSite.id,0);
    window.caveBeastFixture={beastSite,c,hunter};
    return {refused,partial,accepted,destinations,footprint,phases};
  `);
  assert.equal(party.refused,false);
  assert.equal(party.partial,false);
  assert.equal(party.accepted,true);
  assert.deepEqual(party.destinations,Array(4).fill('sect-jade'));
  assert.equal(party.footprint,4);
  for(const phase of ['DETECTED_TARGET','GROUND_WARNING','EMERGING','ACTIVE','COMBAT'])assert.ok(party.phases.includes(phase));
  await shot('06-dia-sa-yeu-trung');
  const retreat=await evalScene(`
    const {beastSite,c,hunter}=window.caveBeastFixture,u=s.underground,w=s.populationWorld;
    Object.assign(hunter.underground,{x:2,y:8});
    const phases=[];
    for(let i=0;i<35;i++){if(++w.clock.minute===1440){w.clock.minute=0;w.clock.day++;}u.beastTick(beastSite,c,0,[hunter]);phases.push(c.beasts[0].phase);}
    return phases;
  `);
  assert.ok(retreat.includes('RETURN_HOME')&&retreat.includes('BURROWING'));
  assert.equal(retreat.at(-1),'BURIED_IDLE');
  const farming=await evalScene(`
    const u=s.underground,w=s.populationWorld,p=s.sectCampus.production;
    const site=p.points.find(q=>s.prop(q,'crop')==='ration');
    const id=s.prop(site,'id'),n=w.npcs.find(x=>x.alive&&!x.underground&&x.profession==='nong_dan');
    const job={id:'controlled-farm',type:'farm-food',item:'ration',quantity:4};
    const farmPast=w.clock.minute;
    const cycles=[];
    u.view.hide();w.clock.paused=true;
    n.x=site.x;n.y=site.y;n.wallLevel=0;n.flight=null;n.skyStep=null;
    s.npcSprites.get(n.id).setPosition(n.x,n.y);
    s.cameras.main.centerOn(site.x,site.y);
    s.setZoom(1);
    s.syncGroundOccupancy();
    const field=p.state.fields[id],before=n.inventory.find(x=>x.itemId==='ration')?.count??0;
    field.phase=0;
    const seeds=p.campus.vault.treasury.find(i=>i.itemId==='rice_seed');
    if(seeds)seeds.count=Math.max(1,seeds.count);
    else p.campus.vault.treasury.push({itemId:'rice_seed',count:1});
    const tick=minutes=>{for(let i=0;i<minutes;i++){if(++w.clock.minute===1440){w.clock.minute=0;w.clock.day++;}}};
    p.farm(n,job);tick(13);p.farm(n,job);cycles.push(field.phase);
    tick(35);p.farm(n,job);tick(13);p.farm(n,job);cycles.push(field.phase);
    tick(125);p.update();cycles.push(field.phase);
    window.caveFarmFixture={n,job,p,tick};
    return {cycles,before,npc:n.name,pose:n.farmPose,elapsed:w.clock.minute-farmPast};
  `);
  assert.deepEqual(farming.cycles,[1,2,3]);
  await shot('09-ruong-thu-hoach');
  const harvest=await evalScene(`
    const {n,job,p,tick}=window.caveFarmFixture;
    p.farm(n,job);tick(13);p.farm(n,job);p.update();
    return {count:n.inventory.find(i=>i.itemId==='ration')?.count??0,collected:job.collected};
  `);
  assert.equal(harvest.count-farming.before,4);
  assert.equal(harvest.collected,4);
  await shot('10-ruong-sau-thu-hoach');
  const benchmarkStart=await evalScene(`
    const w=s.populationWorld;
    w.clock.paused=false;w.clock.speed=1;
    return {frames:s.game.loop.frame,wall:performance.now(),minutes:w.clock.day*1440+w.clock.minute};
  `);
  await sleep(4500);
  const benchmarkSurface=await evalScene(`
    const w=s.populationWorld;
    return {frames:s.game.loop.frame,wall:performance.now(),minutes:w.clock.day*1440+w.clock.minute,fauna:w.environment.fauna.length};
  `);
  const surface={fps:Math.round((benchmarkSurface.frames-benchmarkStart.frames)*1000/(benchmarkSurface.wall-benchmarkStart.wall)),minutes:benchmarkSurface.minutes-benchmarkStart.minutes,fauna:benchmarkSurface.fauna};
  assert.ok(surface.minutes>=2);
  const splitView=await evalScene(`
    const u=s.underground,w=s.populationWorld,site=u.sites.get('sect-jade');
    const n=w.npcs.find(n=>n.id===${JSON.stringify(overview.npc)});
    const prior=n.underground?.siteId??'surface';
    u.view.show(site.id,0);
    const walkers=w.npcs.filter(n=>n.alive&&!n.underground&&n.actionTarget).slice(0,30)
      .map(n=>({id:n.id,x:n.x,y:n.y}));
    window.surfaceCaveWalkers=walkers;
    return {prior,minutes:w.clock.day*1440+w.clock.minute,render:s.cameras.main.visible};
  `);
  await sleep(3800);
  const surfaceWhileHidden=await evalScene(`
    const w=s.populationWorld;
    const moved=window.surfaceCaveWalkers.filter(p=>{const n=s.scheduler.byId.get(p.id).npc;return !n.underground&&Math.hypot(n.x-p.x,n.y-p.y)>1}).length;
    return {minutes:w.clock.day*1440+w.clock.minute, moved, paused:w.clock.paused};
  `);
  assert.equal(splitView.render,false);
  assert.ok(surfaceWhileHidden.minutes>splitView.minutes);
  assert.ok(surfaceWhileHidden.moved>0);
  await evalScene("s.underground.view.hide();return true");
  const visualRoster=await evalScene(`
    const w=s.populationWorld,u=s.underground,base=s.sectCampus.site('counter');
    const people=[
      w.npcs.find(n=>n.populationRole==='city_guard'),
      w.npcs.find(n=>n.profession==='nong_dan'),
      w.npcs.find(n=>n.profession==='thuong_nhan'),
      w.npcs.find(n=>n.populationRole==='hunter'),
      s.society.places.get('clinic').staff,
      s.society.places.get('music').staff,
      [...s.sectCampus.staff].filter(([id,role])=>role==='alchemy').map(([id])=>s.scheduler.byId.get(id).npc)[0],
      w.npcs.find(n=>n.populationRole==='sect_leader'),
    ].filter(Boolean);
    w.clock.paused=true;u.view.hide();
    s.inspector.close();
    s.cameras.main.centerOn(base.x,base.y);
    s.setZoom(1.55);
    for(const [i,n] of people.entries()){
      delete n.underground;n.flight=null;n.skyStep=null;n.wallLevel=0;n.action='idle';
      n.x=base.x-175+i*50;n.y=base.y+45;
      const sprite=s.npcSprites.get(n.id);
      sprite.setPosition(n.x,n.y).setVisible(true);
      sprite.play(s.npcTextureFor(n)+'_idle_down');
    }
    const components=[...new Set([...u.sites.values()].map(site=>s.navComponentAt(site.point)))];
    return {components,npc:people.map(n=>n.id)};
  `);
  await sleep(400);
  const marks=await evalScene(`
    return Object.fromEntries(${JSON.stringify(visualRoster.npc)}.map(id=>[id,s.npcAppearanceFleet.entries.get(id)?.renderer.professionMark?.frame.name??null]));
  `);
  assert.ok(new Set(Object.values(marks).filter(x=>x!==null)).size>=5,JSON.stringify(marks));
  await shot('11-npc-theo-nghe');
  const shade=await evalScene(`
    const u=s.underground,p=s.sectCampus.production,site=p.points.find(o=>s.prop(o,'crop')==='ration');
    s.cameras.main.centerOn(site.x,site.y);s.setZoom(1);
    const plots=s.facilitySprites.filter(sprite=>sprite.getData('production').crop);
    for(const sprite of plots){
      const field=p.state.fields[sprite.getData('production').crop];
      sprite.setTexture('society-facilities',3+field.phase);
    }
    return plots.length;
  `);
  assert.ok(shade>0);
  await shot('12-ruong-doi-chieu-cu');
  await evalScene("s.sectCampus.production.update();return true;");
  await shot('13-ruong-doi-chieu-moi');
  console.log(JSON.stringify({visualRoster,marks,shade,splitView,surfaceWhileHidden,farming,harvest,surface,overview,result,saved,observed,field,rates,fixture,enters,moved,exits,party,retreat,errors,failed},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
