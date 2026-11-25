import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9411);
const output=resolve('art/previews/nhan-gian-yen-hoa');
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




  const ask=code=>evalScene('const w=s.populationWorld,env=w.environment;'+code);
  const initial=await ask(`
    w.clock.paused=true;const o=s.society;
    return {places:o.report().map(v=>[v.id,v.capacity]),tables:[...o.places.values()].map(v=>[v.id,
      v.seats.map(p=>[p.id,p.table,p.facing,s.footprintTerrainOpen(p.x,p.y,10,7)])])};
  `);
  console.log('Initial',JSON.stringify(initial));
  assert.equal(initial.places.length,5);
  assert.ok(initial.tables.every(([,seats])=>seats.every(p=>p[3])));
  assert.ok(initial.tables.every(([,seats])=>seats.every(p=>seats.filter(q=>q[1]===p[1]).length<=4)));

  const clocks=await ask(`
    const o=s.society;let t=s.time.now;return [0,1,2,4].map(speed=>{
      const at=o.now();w.clock.paused=!speed;w.clock.speed=speed||1;
      t+=1000;s.updatePopulation(t,1000,1000);
      return [speed,o.now()-at];});
  `);
  assert.deepEqual(clocks,[[0,0],[1,1],[2,2],[4,4]]);
  const samples=[],shots=new Set();
  for(let step=0;step<27;step++){
    const data=await ask(`
      const o=s.society,take=(s.naturalSocialGuests??={}), tx=(s.socialExpectedCash??={});
      let t=Math.max(s.time.now,s.socialTestTime??0);
      w.clock.paused=false;w.clock.speed=4;
      for(let i=0;i<58;i++){
        t+=1000;s.updatePopulation(t,1000,1000);
        for(const [id,v] of Object.entries(o.visits))if(v.paid)(take[v.venue]??=new Set()).add(id);
        const view=s.socialCapture??={};
        const guests=Object.entries(o.visits).filter(([id,v])=>['tea','music','clinic'].includes(v.venue)&&o.isSeated(s.scheduler.byId.get(id).npc));
        const ready=guests.find(([id,v])=>!view[v.venue]&&(v.venue!=='tea'||o.social.current('tea').some(c=>c.lines.length>0)));
        if(ready){view[ready[1].venue]=true;s.socialShot={id:ready[0],venue:ready[1].venue};break;}
      }
      s.socialTestTime=t;w.clock.paused=true;
      const pop=s.getPopulationState(),seen=s.socialShot;
      s.socialShot=null;
      const duplicate=Object.values(o.visits).some((p,i,a)=>a.findIndex(q=>p.venue===q.venue&&p.seat===q.seat)!==i);
      return {clock:o.now(),seen,duplicate,venues:o.report(),parties:w.expeditions.counters,stuck:pop.states.stuck,
        counters:o.social.state.counters,guestIds:Object.fromEntries(Object.entries(take).map(([id,set])=>[id,set.size])),
        news:[...o.social.state.history].filter(c=>c.news).length,active:o.social.current().length};
    `);
    samples.push(data);assert.equal(data.duplicate,false);
    if(data.seen){
      await ask(`const v=s.society.places.get(${JSON.stringify(data.seen.venue)});
        s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.2);
        s.cameras.main.centerOn(v.landmark?.x??v.counter.x,v.landmark?.y??v.counter.y);s.clampCamera();
        s.inspector.select({kind:'venue',id:v.id});`);
      await sleep(350);
      const actuality=await ask(`
        const v=s.society.places.get(${JSON.stringify(data.seen.venue)});
        const node=document.querySelector('#world-inspector details[data-id]');
        if(node)node.open=true;
        return {kind:s.inspector.selected?.kind,count:Object.values(s.society.visits).filter(e=>e.venue===v.id).length,
          bubbles:s.socialVisuals.bubbles.filter(b=>b.visible).map(b=>[b.getData('speaker'),b.text])};
      `);
      assert.equal(actuality.kind,'venue');assert.ok(actuality.count>0);
      data.view=actuality;
      await shot(data.seen.venue);shots.add(data.seen.venue);
      await ask('s.inspector.close();');
    }
  }
  const final=samples.at(-1),start=initial.clock??samples[0].clock;
  console.log('Natural',JSON.stringify({last:final,shots:[...shots]}));
  const loaded=await ask(`
    const o=s.society, state=JSON.stringify([o.state.visits,o.social.state.active,o.social.state.history,o.state.venues]);
    s.persistPopulation();return state;
  `);
  await visit('/?testMode=1',ready);
  assert.equal(await ask(`const o=s.society;w.clock.paused=true;
    return JSON.stringify([o.state.visits,o.social.state.active,o.social.state.history,o.state.venues]);`),loaded);
  await ask("s.gotoRegion('city',false);s.setZoom(.95);w.clock.speed=1;w.clock.paused=false;s.frameSamples.length=0");
  await sleep(3500);
  const fps=await ask('const p=s.getPopulationState();return {fps:p.fps,p95:p.frameP95Ms,visible:p.visible,size:[s.scale.width,s.scale.height],zoom:s.cameras.main.zoom}');
  await writeFile(join(output,'simulation.json'),JSON.stringify({initial,clocks,samples,final,fps,shots:[...shots],errors,failed},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  assert.ok(final.clock-start>4320);
  assert.ok(final.counters.completed>0&&final.venues.find(v=>v.id==='tea').served>0);
  console.log('FPS',JSON.stringify(fps));
}finally{ws?.close();chrome.kill()}
