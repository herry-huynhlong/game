import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9398);
const output=resolve('art/previews/bach-tu-xuat-hanh');
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
    for(let i=0;i<240;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };

  const ready="Boolean(window.__worldRebuild?.ready())";


  await visit('/?testMode=1',ready);




  const ask=code=>evalScene('const w=s.populationWorld,env=w.environment;'+code);
  const initial=await ask(`
    w.clock.paused=true;
    return {homeVersion:w.population.homeLayout,homes:w.npcs.filter(n=>/^residence-/.test(n.homeId)).length,
      sites:[...s.sectCampus.spiritVeins.sites.values()].map(m=>({id:m.id,grade:m.grade,open:s.footprintTerrainOpen(m.point.x,m.point.y,10,7)})),
      region:w.npcs.length};
  `);
  console.log('World',JSON.stringify(initial));
  assert.deepEqual([1,2,3,4].map(g=>initial.sites.filter(s=>s.grade===g).length),[9,5,3,1]);
  assert.ok(initial.sites.every(s=>s.open)&&initial.homeVersion===3&&initial.homes>=20);
  for(const grade of [1,2,3,4]){
    const aim=await ask(`
      const m=[...s.sectCampus.spiritVeins.sites.values()].find(m=>m.grade===${grade});
      s.cameraTween?.stop();
      s.setZoom(1.15);s.cameras.main.centerOn(m.point.x,m.point.y);s.clampCamera();
      return {id:m.id,x:m.point.x,y:m.point.y};
    `);
    await sleep(350);
    let selected;
    for(let attempt=0;attempt<8&&selected!==aim.id;attempt++){
      const hit=await ask(`
        const c=s.cameras.main,canvas=s.game.canvas.getBoundingClientRect(),origin=c.getWorldPoint(0,0);
        const id=${JSON.stringify(aim.id)};
        for(const dy of [-20,-12,-28,-4])for(const dx of [0,6,-6,12,-12]){
          const p={x:${aim.x}+dx,y:${aim.y}+dy};
          if(s.inspector.hits(p)[0]?.id!==id)continue;
          const x=canvas.left+(p.x-origin.x)*c.zoom*canvas.width/s.scale.width,y=canvas.top+(p.y-origin.y)*c.zoom*canvas.height/s.scale.height;
          if(document.elementFromPoint(x,y)===s.game.canvas)return {x,y};
        }
      `);
      if(hit){
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',...hit});
        for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...hit,button:'left',buttons:type==='mousePressed'?1:0,clickCount:1});
        selected=await ask('return s.inspector.selected?.id;');
      }
      if(selected!==aim.id)await sleep(170);
    }
    assert.equal(selected,aim.id);
    await shot('linh-mach-'+grade);
    await ask('s.inspector.close()');
  }
  const clocks=await ask(`
    const read=()=>w.clock.day*1440+w.clock.minute;
    let t=s.time.now;return [0,1,2,4].map(speed=>{
      const from=read();w.clock.paused=!speed;w.clock.speed=speed||1;t+=1000;s.updatePopulation(t,1000,1000);
      return [speed,read()-from];});
  `);
  assert.deepEqual(clocks,[[0,0],[1,1],[2,2],[4,4]]);
  const samples=[],screens=new Set();
  const start=await ask('w.clock.paused=true;return w.clock.day*1440+w.clock.minute;');
  let last;
  for(let i=0;i<46;i++){
    const part=await ask(`
      let t=Math.max(s.time.now,s.testExpeditionAt??0);
      const samples=[], allTrades=(s.testExpeditionTrades??=new Set()), members=(s.testExpeditionMembers??=new Set());
      w.clock.paused=false;w.clock.speed=4;
      for(let i=0;i<60;i++){
        t+=1000;s.updatePopulation(t,1000,1000);
        if(i%5===0){for(const tx of w.economy.transactions)allTrades.add(tx.id);
          for(const p of w.expeditions.parties)for(const id of p.roster??p.members)members.add(id);}
        const combat=w.expeditions.parties.some(p=>p.phase==='field'&&p.preyId&&p.hits&&w.environment.fauna.some(f=>f.id===p.preyId&&f.alive));
        if(combat&&!s.testExpeditionCombat){s.testExpeditionCombat=true;break;}
      }
      s.testExpeditionAt=t;w.clock.paused=true;
      const pop=s.getPopulationState(),living=w.npcs.filter(n=>n.alive);
      const all=living.map(n=>({x:n.x,y:n.y,npcs:living.filter(q=>Math.hypot(q.x-n.x,q.y-n.y)<=100)})).sort((a,b)=>b.npcs.length-a.npcs.length);
      const groups=[all[0],all.find(g=>Math.hypot(g.x-all[0].x,g.y-all[0].y)>210)].filter(Boolean).map(g=>({
        x:g.x,y:g.y,members:g.npcs.map(n=>({id:n.id,role:n.populationRole,action:n.action,goal:n.goalAction,target:n.actionTarget,
          work:s.sectCampus.orderFor(n)?.id??s.expeditions.of(n)?.id, why:n.aiDecision?.reason,needs:[n.hunger,n.fatigue],
          seat:n.meditationSpot,path:s.scheduler.byId.get(n.id)?.routeFailure}))}));
      const ex=w.expeditions,seen=ex.parties.filter(p=>p.escrow>0).map(p=>({id:p.id,phase:p.phase,kind:p.job.kind,
        x:s.expeditions.npc(p.leader)?.x,hits:p.hits,mining:Boolean(p.workAt),foe:p.preyId,
        fighting:p.phase==='field'&&w.environment.fauna.some(f=>f.id===p.preyId&&f.alive)}));
      const veinCounts=[1,2,3,4].map(g=>[...s.sectCampus.spiritVeins.sites.values()].filter(v=>v.grade===g).reduce((a,b)=>a+b.state.mined,0));
      return {minute:w.clock.day*1440+w.clock.minute,seen,groups,alive:living.length,stuck:pop.states.stuck,
        west:living.filter(n=>n.x<0).length,counters:ex.counters,veinCounts,trades:allTrades.size,members:members.size};
    `);
    samples.push(part);last=part;
    const party=part.seen.find(p=>p.fighting&&!screens.has('san-yeu-thu')) ??
      part.seen.find(p=>!screens.has(p.phase)&&p.phase==='outbound'&&p.x<1400) ??
      part.seen.find(p=>p.hits&&!screens.has('combat'))??part.seen.find(p=>p.mining&&!screens.has('mining'));
    if(party){
      const label=party.fighting?'san-yeu-thu':party.hits?'combat':party.mining?'mining':party.phase;
      await ask(`const p=w.expeditions.parties.find(p=>p.id===${JSON.stringify(party.id)}),n=s.expeditions.npc(p.leader);
        s.setZoom(1.1);s.cameras.main.centerOn(n.x,n.y);s.clampCamera();s.selectNPC(n.id);`);
      await sleep(220);await shot(label);screens.add(label);
    }
    if(part.minute-start>=10080)break;
  }
  assert.ok(last.minute-start>=10080);
  const state=await ask(`
    const ex=w.expeditions;
    s.persistPopulation();
    return {parties:ex.parties.map(p=>[p.id,p.phase,p.escrow]),mines:Object.fromEntries([...s.sectCampus.spiritVeins.sites].map(([id,v])=>[id,v.state.amount]))};
  `);
  await visit('/?testMode=1',ready);
  const reloaded=await ask(`
    w.clock.paused=true;const ex=w.expeditions;
    return {parties:ex.parties.map(p=>[p.id,p.phase,p.escrow]),mines:Object.fromEntries([...s.sectCampus.spiritVeins.sites].map(([id,v])=>[id,v.state.amount]))};
  `);
  assert.deepEqual(reloaded,state);
  await ask("s.gotoRegion('city',false);s.setZoom(.95);w.clock.speed=1;w.clock.paused=false;s.frameSamples.length=0");
  await sleep(4000);await shot('thanh-van-thanh');
  const fps=await ask('const p=s.getPopulationState();return {fps:p.fps,p95:p.frameP95Ms,visible:p.visible,size:[s.scale.width,s.scale.height],zoom:s.cameras.main.zoom}');
  await writeFile(join(output,'seven-days.json'),JSON.stringify({initial,clocks,start,samples,fps,screens:[...screens],errors,failed},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('Outcome',JSON.stringify({days:(last.minute-start)/1440,counters:last.counters,veins:last.veinCounts,members:last.members,trades:last.trades,
    maxWest:Math.max(...samples.map(p=>p.west)),peakStuck:Math.max(...samples.map(p=>p.stuck)),fps,screens:[...screens]}));
}finally{ws?.close();chrome.kill()}
