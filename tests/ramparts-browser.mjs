import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9334);
const output=resolve('art/previews/ramparts');
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
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };

  const ready="Boolean(window.__worldRebuild?.ready())";
  await visit('/?testMode=1',ready);
  const frame=async (name,x,y,zoom)=>{
    await evalScene(`s.cameraTween?.stop();s.cameraTween=null;s.setZoom(${zoom});
      s.cameras.main.centerOn(${x},${y});s.clampCamera();s.updateSceneryVisibility();`);
    await sleep(260);
    await shot(name);
  };
  await frame('01-toan-canh',3472,2110,.38);
  const layout=await evalScene(`
    const r=s.ramparts, names=['north','south','east','west'];
    const gates=r.gates.map(o=>({side:s.prop(o,'side'),x:o.x,y:o.y}));
    const ground=names.map(side=>{
      const p=s.passageTraffic.gates.find(g=>g.id==='gate-'+side);
      if(!p)return {side,ok:false};
      const ok=[-p.lanes,p.lanes].every(lane=>Array.from({length:25},(_,i)=>i*5-60).every(along=>{
        const {x,y}=s.passageTraffic.position(p,along,lane);
        return s.footprintTerrainOpen(x,y,8,4);
      }));
      return {side,lanes:p.lanes,ok};
    });
    const stairs=r.stairs.map(({name,foot,upper,approach,landing,side})=>({name,foot,upper,approach,landing,side}));
    return {gates,ground,stairs,population:s.populationWorld.npcs.length,
      corners:r.corners.map(({x,y})=>({x,y})),props:r.posts.length};
  `);
  assert.equal(layout.population,108);
  assert.equal(layout.stairs.length,8);
  assert.ok(layout.ground.every(g=>g.ok),JSON.stringify(layout.ground));
  for(const gate of layout.gates)await frame('02-cong-'+gate.side,gate.x,gate.y-35,1.2);
  await frame('03-goc-thanh',layout.corners[0].x+64,layout.corners[0].y+40,1.35);
  const fixture=await evalScene(`
    const ramparts=s.ramparts,w=s.populationWorld;
    const player=w.npcs.find(n=>n.alive&&n.populationRole==='low_disciple');
    const stair=ramparts.stairs.find(r=>r.side==='south');
    const pos=stair.approach;
    Object.assign(player,pos,{action:'idle',goalAction:'idle',actionTarget:{...pos},hp:100,mp:60});
    w.heaven.divinePower=500;
    s.npcSprites.get(player.id).setPosition(pos.x,pos.y);
    s.resetNpcRoute(player);s.syncGroundOccupancy();s.selectNPC(player.id);s.beginPossession();
    s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.3);
    return {id:player.id,active:s.possessedNpcId===player.id,stair:{side:stair.side,foot:stair.foot,landing:stair.landing}};
  `);
  assert.equal(fixture.active,true);
  const player=code=>evalScene(`const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(fixture.id)});${code}`);
  const state=()=>player('return {x:n.x,y:n.y,level:n.wallLevel??0,height:s.ramparts.height(n),depth:s.npcSprites.get(n.id).depth};');
  const drive=async (key,code,virtual,until)=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',code,key,windowsVirtualKeyCode:virtual,nativeVirtualKeyCode:virtual});
    try{
      for(let i=0;i<50;i++){
        const data=await state();
        if(until(data))return data;
        await sleep(70);
      }
      return await state();
    }finally{
      await send('Input.dispatchKeyEvent',{type:'keyUp',code,key,windowsVirtualKeyCode:virtual,nativeVirtualKeyCode:virtual});
    }
  };
  const mid=await drive('s','KeyS',83,p=>p.height>=18);
  assert.equal(mid.level,1,JSON.stringify(mid));
  assert.ok(mid.height<48,JSON.stringify(mid));
  await shot('04-len-cau-thang');
  const top=await drive('s','KeyS',83,p=>p.height===48&&p.y>=fixture.stair.landing.y-7);
  assert.equal(top.height,48,JSON.stringify(top));
  await shot('05-nhap-than-tren-tuong');
  const edge=await drive('s','KeyS',83,p=>p.level!==1);
  assert.equal(edge.level,1,'The rail must prevent leaving the deck');
  assert.ok(edge.y-top.y<40);
  await player('return s.persistPopulation();');
  await visit('/?testMode=1',ready);
  const restored=await state();
  assert.equal(restored.level,1,JSON.stringify({edge,restored}));
  assert.ok(Math.hypot(restored.x-edge.x,restored.y-edge.y)<2);
  const down=await drive('w','KeyW',87,p=>p.level===0);
  assert.equal(down.level,0,JSON.stringify(down));
  await player('s.endPossession();s.closeNpcCard();');
  const validation=await evalScene(`
    const r=s.ramparts, grid=s.groundOccupancy;
    const reports=[];
    for(const stair of r.stairs){
      const local=new grid.constructor(grid.mapOpen);
      const at=(p,lane)=>({x:p.x+stair.dy*lane,y:p.y-stair.dx*lane});
      const actors=[
        {n:{id:'climb',alive:true,...at(stair.approach,-12)},target:at(stair.landing,-12),expected:1},
        {n:{id:'descend',alive:true,wallLevel:1,...at(stair.landing,12)},target:at(stair.approach,12),expected:0}
      ];
      for(let i=0;i<70;i++){
        local.sync(actors.map(a=>a.n),[],null);
        for(const {n,target} of actors){
          const dx=target.x-n.x,dy=target.y-n.y,d=Math.hypot(dx,dy);
          if(d<.02)continue;
          const step=Math.min(d,3),body=local.bodies.get(n.id);
          const movement=local.advance(body,n.x+dx/d*step,n.y+dy/d*step,false,undefined,
            (b,x,y)=>r.transition(b,x,y,stair));
          if(movement)Object.assign(n,movement,{wallLevel:body.floor});
        }
        if(local.overlaps().length)throw Error('Stair overlap '+stair.name);
      }
      if(actors.some(a=>Math.hypot(a.n.x-a.target.x,a.n.y-a.target.y)>1||a.n.wallLevel!==a.expected))
        throw Error('Stair movement '+stair.name+' '+JSON.stringify(actors));
    }
    for(const gate of s.passageTraffic.gates.filter(o=>o.id.startsWith('gate-'))){
      const local=new grid.constructor(grid.mapOpen);
      const pass=new s.passageTraffic.constructor([{
        id:gate.id,a:s.passageTraffic.position(gate,-64,0),b:s.passageTraffic.position(gate,64,0)
      }],p=>s.footprintTerrainOpen(p.x,p.y,8,4));
      const actors=[1,-1].map(dir=>{
        const start=s.passageTraffic.position(gate,-dir*100,0);
        const target=s.passageTraffic.position(gate,dir*100,0);
        return {n:{id:gate.id+dir,alive:true,...start},target,dir};
      });
      let count=0,limit=0,peak=0;
      for(let time=0;time<11000&&count!==2;time+=60){
        local.sync(actors.map(a=>a.n),[],null);
        count=0;
        for(const actor of actors){
          const {n,target,dir}=actor;
          const passed=(gate.horizontal?n.x-gate.x:n.y-gate.y)*dir>94;
          if(passed){count++;continue;}
          const next=pass.guide(n,target,time)?.target??target;
          const dx=next.x-n.x,dy=next.y-n.y,d=Math.hypot(dx,dy),step=Math.min(d,3.6);
          if(d<.01)continue;
          const motion=local.advance(local.bodies.get(n.id),n.x+dx/d*step,n.y+dy/d*step,true);
          if(motion){Object.assign(n,motion);limit=Math.max(limit,step);}
        }
        peak=Math.max(peak,local.overlaps().length);
      }
      if(count!==2||peak!==0)throw Error(gate.id+' traffic: '+JSON.stringify({count,peak,limit,actors}));
    }
    for(const gate of r.gates){
      const side=s.prop(gate,'side'),axis=side==='north'||side==='south'?'x':'y';
      const x=gate.x-(axis==='x'?16:0),y=gate.y-(axis==='y'?16:0);
      const a={id:'ground-test',x,y,alive:true},b={id:'deck-test',x,y,alive:true,wallLevel:1};
      const ag={id:a.id,actor:a,width:16,height:8,radius:8,mask:3,category:1,floor:0};
      const bg={...ag,id:b.id,actor:b,floor:1};
      grid.place(ag,x,y);grid.place(bg,x,y);
      const levels=grid.open(ag,x,y)&&grid.open(bg,x,y)&&!s.clearCombatLine(a,b);
      grid.forgetCell(ag);grid.forgetCell(bg);
      const offset=axis==='x'?{x:144,y:0}:{x:0,y:173};
      const deckContinuation=[-1,1].every(sign=>r.open(x+sign*offset.x,y+sign*offset.y,8,4));
      reports.push({side,levels,deckContinuation,bodyBlocked:!s.footprintTerrainOpen(x+offset.x,y+offset.y,8,4)});
    }
    return reports;
  `);
  assert.ok(validation.every(p=>p.levels&&p.deckContinuation&&p.bodyBlocked),JSON.stringify(validation));
  console.log('Geometry, possession and reload:',JSON.stringify({layout,mid,top,edge,restored,down,validation}));
  const patrol=await evalScene(`
    const w=s.populationWorld, r=s.ramparts;
    w.clock.minute=550; w.clock.speed=4;
    const runners=[];
    for(const n of w.npcs.filter(n=>n.alive&&n.populationRole==='city_guard')){
      n.goalAction='patrol';n.fatigue=5;n.hunger=3;n.action='travel';
      n.flight=undefined;n.skyStep=undefined;delete n.wallLevel;
      const entry=s.scheduler.byId.get(n.id);
      const job=r.order(entry);
      if(!job?.target||!entry.rampartJob?.post)continue;
      const {approach,dx,dy}=entry.rampartJob.stair;
      const from={x:approach.x-dx*18,y:approach.y-dy*18};
      if(!s.footprintTerrainOpen(from.x,from.y,9,5))continue;
      Object.assign(n,from,{actionTarget:job.target});
      s.npcSprites.get(n.id).setPosition(n.x,n.y);
      s.resetNpcRoute(n);
      runners.push({id:n.id,from,side:entry.rampartJob.stair.side});
    }
    s.syncGroundOccupancy();
    return runners;
  `);
  assert.ok(patrol.length>=4,JSON.stringify(patrol));
  const runnerIds=JSON.stringify(patrol.map(p=>p.id));
  const runners=()=>evalScene(`return s.populationWorld.npcs.filter(n=>${runnerIds}.includes(n.id)).map(n=>{
    const e=s.scheduler.byId.get(n.id);return {id:n.id,x:n.x,y:n.y,level:n.wallLevel??0,goal:n.goalAction,
      duty:e.rampartJob?.duty??-1,checkpoint:e.rampartJob?.checkpoint??0,standing:Boolean(e.rampartJob?.standingUntil)};
  });`);
  let raised=[];
  for(let i=0;i<100;i++){
    raised=await runners();
    if(raised.filter(n=>n.level).length>=3)break;
    await sleep(200);
  }
  assert.ok(raised.filter(n=>n.level).length>=3,JSON.stringify(raised));
  const example=raised.find(n=>n.level);
  await frame('06-lich-tuan-ve-binh',example.x,example.y-45,1.3);
  let walked=[];
  for(let i=0;i<100;i++){
    walked=await runners();
    if(walked.some(n=>n.level&&(n.standing||n.checkpoint>0)))break;
    await sleep(200);
  }
  const sentry=walked.find(n=>n.level&&(n.standing||n.checkpoint>0));
  assert.ok(sentry,JSON.stringify(walked));
  await frame('07-ve-binh-vong-gac',sentry.x,sentry.y-48,1.55);
  const rotation=await evalScene(`
    const w=s.populationWorld,r=s.ramparts;
    const shift=w.clock.minute,slots=()=>w.npcs.filter(n=>n.populationRole==='city_guard').map(n=>r.wantsDuty(n));
    const before=slots();
    w.clock.minute+=240;
    const after=slots();
    w.clock.minute=shift;
    return {before,after};
  `);
  assert.ok(rotation.before.filter(d=>d>=0).length>=4);
  assert.ok(rotation.before.some((d,i)=>d>=0&&rotation.after[i]!==d));
  const leaving=await evalScene(`const w=s.populationWorld;const guard=w.npcs.find(n=>n.id===${JSON.stringify(sentry.id)});
    guard.hunger=96;guard.goalAction='eat';guard.actionTarget=guard.home;
    s.resetNpcRoute(guard);return guard.id;`);
  let departed;
  for(let i=0;i<140;i++){
    departed=(await runners()).find(n=>n.id===leaving);
    if(departed.level===0)break;
    await sleep(200);
  }
  assert.equal(departed.level,0,JSON.stringify(departed));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  const result={population:layout.population,validation,mid,top,edge,restored,down,patrol,raised,walked,rotation,departed};
  await writeFile(join(output,'browser.json'),JSON.stringify(result,null,2));
  console.log('PASS: four gate decks, independent collision at shared XY, possession up/down, rail, reload and scheduled guards',JSON.stringify({raised,walked,departed}));
} finally {
  ws?.close();
  chrome.kill();
}
