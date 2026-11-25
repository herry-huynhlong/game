import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9288);
const output=resolve('art/previews/meditation-traffic');
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


  const baseline=process.argv.includes('--baseline');
  await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
  const layout=await evalScene(`
    const w=s.populationWorld,ref=s.cultivation.sites[0],candidates=w.npcs.filter(n=>n.alive&&n.realmIndex===0);
    const center=[];
    for(let y=ref.y-200;y<ref.y+280;y+=16)for(let x=ref.x-260;x<ref.x+300;x+=16)
      if([-100,-50,0,50,100].every(dx=>[-32,0,32].every(dy=>s.footprintTerrainOpen(x+dx,y+dy,11,8))))center.push({x,y});
    const c=s.footprintTerrainOpen(3648,4180,11,8)?{x:3648,y:4180}:
      center.sort((a,b)=>Math.hypot(a.x-ref.x,a.y-ref.y)-Math.hypot(b.x-ref.x,b.y-ref.y))[0];
    const sit=w.npcs.find(n=>n.modularAppearance?.look.outfit==='fairy'&&n.alive);
    const others=candidates.filter(n=>n!==sit).slice(0,6);
    window.crossing={center:c,sit:sit.id,movers:others.slice(0,5).map(n=>n.id),extra:others[5].id};
    s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.8);s.cameras.main.centerOn(c.x,c.y-35);
    const place=(n,x,y)=>{Object.assign(n,{x,y,flight:undefined,action:'idle',goalAction:'idle',tribulation:undefined});
      s.npcSprites.get(n.id).setPosition(x,y).setDepth(y).setData('moving',false);};
    place(sit,c.x,c.y);
    Object.assign(sit,{action:'cultivate',goalAction:'cultivate',actionTarget:c,meditationSpot:c});
    for(const [i,n] of others.entries())place(n,c.x-95+i*32,c.y+80);
    const tick=s.populationSimulation.tickNpc.bind(s.populationSimulation);
    s.populationSimulation.tickNpc=(n,...args)=>n===sit?undefined:tick(n,...args);
    s.scheduler.byId.get(sit.id).thinkDue=Infinity;
    s.syncGroundOccupancy();
    return window.crossing;
  `);
  await sleep(650);
  await shot(baseline?'before-pose':'after-pose');
  if(!baseline){
    await evalScene('s.cultivation.debug=true;');
    await sleep(70);await shot('debug-anchors');
    await evalScene('s.cultivation.debug=false;');
    const costumes=await evalScene(`
      const n=s.populationWorld.npcs.find(n=>n.id===window.crossing.sit);
      const r=s.npcAppearanceFleet.entries.get(n.id).renderer,look=r.appearance;
      const result=[];
      for(const direction of ['down','left','up','right']){
        r.advance(16,'idle',direction,0);
        r.customize({...look,outfit:'workwear',hair:'loose'});
        const alternate=r.seated.texture.key;
        r.customize({...look,hair:'bun'});
        result.push({direction,updated:alternate!==r.seated.texture.key,seated:r.seated.visible,
          hair:r.layers.hairFront.visible,neck:r.meditationAnchors.neck});
      }
      r.customize(look);
      return result;
    `);
    assert.ok(costumes.every(row=>row.seated&&row.updated&&row.hair),JSON.stringify(costumes));
  }
  const frames=await run(`new Promise(resolve=>{
    const a=[];let last=0;const tick=t=>{if(last)a.push(t-last);last=t;if(a.length<90){requestAnimationFrame(tick);return;}
    a.sort((x,y)=>x-y);resolve({fps:90000/a.reduce((x,y)=>x+y),p95:a[85]});};requestAnimationFrame(tick);
  })`);
  const path=await evalScene(`
    const c=window.crossing.center,w=s.populationWorld;
    const sitter=w.npcs.find(n=>n.id===window.crossing.sit),n=w.npcs.find(n=>n.id===window.crossing.movers[0]);
    Object.assign(sitter,{x:c.x,y:c.y,meditationSpot:c,action:'cultivate',goalAction:'cultivate',actionTarget:c});
    s.npcSprites.get(sitter.id).setPosition(c.x,c.y).setData('moving',false);
    for(const other of w.npcs){
      if(other===sitter||[window.crossing.extra,n.id].includes(other.id))continue;
      if(Math.hypot(other.x-c.x,other.y-c.y)<165)other.alive=false;
    }
    const actors=[n,w.npcs.find(n=>n.id===window.crossing.extra)];
    for(const [i,p] of actors.entries()){
      const x=c.x+(i===0?-85:85),y=c.y;
      Object.assign(p,{x,y,goalAction:'work',action:'travel',actionTarget:{x:c.x+(i===0?85:-85),y},
        routeIndex:0,flight:undefined,pathBlocked:false});
      s.npcSprites.get(p.id).setPosition(x,y);
      s.npcRoutes.delete(p.id);
      Object.assign(s.scheduler.byId.get(p.id),{retryAt:0,travelWatch:null,detour:null,waitingForSlot:false});
    }
    let overlaps=0,largestStep=0,pathMs=0;
    for(let i=0;i<360;i++){
      s.scheduler.time+=50;s.syncGroundOccupancy();
      s.routesStartedThisFrame=0;s.routeLimit=10;s.routeDeadline=Infinity;s.routeTimeThisFrame=0;s.worldMoveBudget=65;
      for(const p of actors){
        const x=p.x,y=p.y;s.moveAutonomousNpc(s.scheduler.byId.get(p.id));
        largestStep=Math.max(largestStep,Math.hypot(p.x-x,p.y-y));
      }
      pathMs+=s.routeTimeThisFrame;
      overlaps+=s.groundOccupancy.overlaps().filter(({0:a,1:b})=>[a.id,b.id].includes(sitter.id)&&actors.some(n=>n.id===a.id||n.id===b.id)).length;
    }
    return {largestStep,overlaps,pathMs,body:s.groundOccupancy.bodies.get(sitter.id)?.width,
      rows:actors.map(n=>({id:n.id,distance:Math.hypot(n.x-n.actionTarget.x,n.y-n.actionTarget.y),goal:n.goalAction,
        repaths:s.scheduler.byId.get(n.id).seatedRepaths??0}))};
  `);
  let crowd,restore;
  if(!baseline){
    assert.equal(path.overlaps,0);
    assert.ok(path.largestStep<5);
    assert.ok(path.rows.every(n=>n.goal==='work'&&n.distance<=13),JSON.stringify(path));
    assert.equal(path.body,22);
    assert.ok(path.rows.every(n=>n.repaths<=4));
    await evalScene(`
      const c=window.crossing.center,w=s.populationWorld;
      const n=w.npcs.find(n=>n.id===window.crossing.movers[0]),other=w.npcs.find(n=>n.id===window.crossing.extra);
      const sitter=w.npcs.find(n=>n.id===window.crossing.sit);
      other.alive=false;
      Object.assign(n,{x:c.x-73,y:c.y,actionTarget:{x:c.x+75,y:c.y},goalAction:'work',action:'travel',routeIndex:0,pathBlocked:false});
      Object.assign(sitter,{x:c.x,y:c.y,action:'cultivate',goalAction:'cultivate',actionTarget:c,meditationSpot:c});
      s.npcSprites.get(sitter.id).setPosition(c.x,c.y).setData('moving',false);
      s.npcSprites.get(n.id).setPosition(n.x,n.y).setVisible(true);
      Object.assign(s.scheduler.byId.get(n.id),{retryAt:0,bypass:null,detour:null,travelWatch:null,waitingForSlot:false});
      s.updatePopulation=()=>{};s.npcRoutes.delete(n.id);s.selectedNpcId=n.id;s.cultivation.debug=true;
    `);
    await mkdir(join(output,'one-frames'),{recursive:true});
    for(let i=0;i<25;i++){
      await evalScene(`
        const n=s.populationWorld.npcs.find(n=>n.id===window.crossing.movers[0]);
        for(let j=0;j<5;j++){
          s.scheduler.time+=50;s.syncGroundOccupancy();s.routesStartedThisFrame=0;s.routeLimit=10;s.routeDeadline=Infinity;
          s.routeTimeThisFrame=0;s.worldMoveBudget=60;s.moveAutonomousNpc(s.scheduler.byId.get(n.id));
        }
      `);
      await shot('one-frames/'+String(i).padStart(3,'0'));
    }
    assert.ok(await evalScene(`const n=s.populationWorld.npcs.find(n=>n.id===window.crossing.movers[0]);
      return n.goalAction==='work'&&Math.hypot(n.x-n.actionTarget.x,n.y-n.actionTarget.y)<=13;`));
    await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
    const setup=await evalScene(`
      const w=s.populationWorld,ref=s.cultivation.sites[0],probes=[];
      for(let y=ref.y-220;y<=ref.y+200;y+=16)for(let x=ref.x-360;x<=ref.x+360;x+=16){
        if([-152,-128,-96,-64,-32,0,32,64,96,128,152].every(dx=>
          [-50,-36,-18,0,18,36,50].every(dy=>s.footprintTerrainOpen(x+dx,y+dy,12,7))))
          probes.push({x,y});
      }
      const center=probes.sort((a,b)=>Math.hypot(a.x-ref.x,a.y-ref.y)-Math.hypot(b.x-ref.x,b.y-ref.y))[0];
      const sitters=w.npcs.filter(n=>n.alive&&['low_disciple','elder','independent_cultivator'].includes(n.populationRole)).slice(0,10);
      const movers=w.npcs.filter(n=>n.alive&&n.populationRole==='commoner').slice(0,5);
      const participants=[...sitters,...movers];
      const {x,y}=center;
      const place=(n,px,py)=>{
        s.skyStep?.active.delete(n.id);
        s.skyStep?.pads.delete(n.id);
        Object.assign(n,{x:px,y:py,flight:undefined,skyStep:undefined,tribulation:undefined,marketVisit:undefined,
          meditationBlockedUntil:undefined,realmIndex:0,realmLevel:1});
        s.npcSprites.get(n.id).setPosition(px,py).setDepth(py).setData('moving',false).setVisible(true);};
      for(const n of w.npcs)if(!participants.includes(n)&&Math.hypot(n.x-x,n.y-y)<225)n.alive=false;
      for(const [i,n] of sitters.entries()){
        const px=x-64+(i%5)*32,py=y+(i===2?0:i<5?-42:42);
        place(n,px,py);Object.assign(n,{action:'cultivate',goalAction:'cultivate',actionTarget:{x:px,y:py},meditationSpot:{x:px,y:py}});
      }
      const goals=new Map();
      for(const [i,n] of movers.entries()){
        const offset=[-14,0,14,-14,14][i];
        place(n,x-(i<3?112:143),y+offset);
        const target={x:x+(i<3?135:105),y:y+offset};
        goals.set(n.id,target);
        Object.assign(n,{action:'travel',goalAction:'work',actionTarget:target,routeIndex:0,pathBlocked:false,meditationSpot:undefined});
        s.npcRoutes.delete(n.id);
        Object.assign(s.scheduler.byId.get(n.id),{retryAt:0,travelWatch:null,detour:null,waitingForSlot:false});
      }
      const tick=s.populationSimulation.tickNpc.bind(s.populationSimulation);
      s.populationSimulation.tickNpc=(n,...args)=>participants.includes(n)?undefined:tick(n,...args);
      // Drive the real movement loop in fixed steps while the browser renders
      // each captured frame independently of machine speed.
      s.updatePopulation=()=>{};
      const run=window.crowdTrial={center,sitters,movers,goals,pathMs:0,overlap:0,largestStep:0,turns:0};
      s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.8);s.cameras.main.centerOn(x,y-22);
      s.syncGroundOccupancy();
      // After staging everyone, refresh seated footprints against the new positions.
      s.syncGroundOccupancy();
      for(const n of participants)s.npcSprites.get(n.id).setVisible(true);
      return {center,sitters:sitters.length,movers:movers.length,bodies:sitters.map(n=>s.groundOccupancy.bodies.get(n.id)?.seated)};
    `);
    assert.deepEqual(setup.bodies,Array(10).fill(true),JSON.stringify(setup));
    await mkdir(join(output,'frames'),{recursive:true});
    for(let i=0;i<82;i++){
      await evalScene(`
        const v=window.crowdTrial;
        for(let j=0;j<5;j++){
          s.scheduler.time+=50;s.syncGroundOccupancy();s.routesStartedThisFrame=0;s.routeLimit=10;s.routeDeadline=Infinity;
          s.routeTimeThisFrame=0;s.worldMoveBudget=65;
          for(const n of v.movers){
            const x=n.x,y=n.y;
            s.moveAutonomousNpc(s.scheduler.byId.get(n.id));
            v.largestStep=Math.max(v.largestStep,Math.hypot(x-n.x,y-n.y));
          }
          v.pathMs+=s.routeTimeThisFrame;
          const ids=new Set([...v.sitters,...v.movers].map(n=>n.id));
          v.overlap+=s.groundOccupancy.overlaps().filter(([a,b])=>ids.has(a.id)&&ids.has(b.id)).length;
        }
      `);
      if(i<64)await shot('frames/'+String(i).padStart(3,'0'));
    }
    crowd=await evalScene(`
      const t=window.crowdTrial;
      return {sitters:t.sitters.length,overlaps:t.overlap,largestStep:t.largestStep,pathMs:t.pathMs,
        rows:t.movers.map(n=>({id:n.id,remaining:Math.hypot(n.x-t.goals.get(n.id).x,n.y-t.goals.get(n.id).y),goal:n.goalAction,
        repaths:s.scheduler.byId.get(n.id).seatedRepaths??0,x:n.x,y:n.y,shortGoal:n.shortGoal}))};
    `);
    assert.ok(crowd.rows.every(n=>n.remaining<=13&&n.goal==='work'),JSON.stringify(crowd));
    assert.equal(crowd.overlaps,0);
    assert.ok(crowd.largestStep<5);
    await shot('crowd-after');
    restore=await evalScene(`
      const t=window.crowdTrial,w=s.populationWorld;
      for(const n of t.sitters)s.cultivation.spots.release(n);
      const ids=[];
      for(const n of t.sitters){
        const p=s.cultivation.spots.reserve(n);
        if(!p)continue;
        ids.push(n.id);Object.assign(n,{x:p.x,y:p.y,actionTarget:p,goalAction:'cultivate',action:'cultivate'});
        s.npcSprites.get(n.id).setPosition(p.x,p.y);
      }
      s.syncGroundOccupancy();s.persistPopulation();
      return ids;
    `);
    assert.equal(restore.length,10);
    await send('Page.reload');await sleep(850);await ready();
    const reserved=await evalScene(`
      const ids=${JSON.stringify(restore)};return ids.filter(id=>{
        const n=s.populationWorld.npcs.find(n=>n.id===id);
        return n?.meditationSpot&&s.cultivation.spots.reserved.has(id)&&s.groundOccupancy.bodies.get(id)?.seated;
      }).length;
    `);
    assert.equal(reserved,10);
    restore={reserved};
    assert.deepEqual(errors,[]);
    assert.deepEqual(failed,[]);
  }
  await writeFile(join(output,baseline?'baseline.json':'after.json'),JSON.stringify({layout,frames,path,crowd,restore,errors,failed},null,2));
  console.log(JSON.stringify({frames,path,crowd,restore,errors:errors.slice(0,4)}));
}finally{ws?.close();chrome.kill();}
