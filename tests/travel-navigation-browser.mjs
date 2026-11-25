import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9320);
const output=resolve('art/previews/sky-step');
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

  await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
  const setup=await evalScene(`
    const w=s.populationWorld,hub=s.markers.find(m=>m.id==='sect-yard');
    const actors=w.npcs.filter(n=>n.populationRole==='commoner').slice(0,12);
    const open=p=>s.footprintTerrainOpen(p.x,p.y,11,7);
    let arena;
    for(let x=hub.x-160;x<hub.x+145&&!arena;x+=12){
      for(let y=hub.y-160;y<hub.y+180&&!arena;y+=12){
        if([-92,-70,-35,0,35,70,92].every(dx=>[-40,-18,0,18,40].every(dy=>open({x:x+dx,y:y+dy}))))arena={x,y};
      }
    }
    if(!arena)throw Error('No sample open terrain');
    s.updatePopulation=()=>{};
    for(const n of w.npcs)if(!actors.includes(n))n.alive=false;
    for(const n of w.environment.fauna)n.alive=false;
    window.travelTest={actors,arena,results:{},
      place(n,x,y,goal,target){
        Object.assign(n,{x,y,alive:true,hp:150,realmIndex:0,realmLevel:2,goalAction:goal,action:goal,actionTarget:target??{x,y},
          pathBlocked:false,flight:undefined,tribulation:undefined,marketVisit:undefined,faunaHuntTargetId:undefined,meditationSpot:undefined});
        s.npcSprites.get(n.id).setPosition(x,y).setDepth(y).setData('moving',false).setVisible(true);
        s.workstations.release(n.id);s.resetNpcRoute(n);
        const e=s.scheduler.byId.get(n.id);
        e.lastMove=s.scheduler.time;e.waitingForSlot=false;e.nextBypassAt=0;e.confirmedGoal=undefined;
        e.repaths=e.recoveries=e.walked=e.oscillations=e.abandonedRoutes=e.maxStuckMs=0;
      },
      clear(){
        for(const n of actors){n.alive=false;s.npcSprites.get(n.id).setVisible(false);}
        for(const g of s.passageTraffic.gates){g.requests.clear();g.current=null;}
      },
      pulse(moving,ticks){
        let overlaps=0,invalid=0,largest=0,arrivalMs=0;
        for(let i=0;i<ticks;i++){
          s.scheduler.time+=50;s.syncGroundOccupancy();
          s.worldMoveBudget=65;s.routesStartedThisFrame=0;s.routeLimit=12;s.routeDeadline=Infinity;
          s.routeTimeThisFrame=0;s.localBypassBudget=3;
          for(const n of moving){
            const e=s.scheduler.byId.get(n.id),old={x:n.x,y:n.y};
            s.confirmNpcPlan(e);s.moveAutonomousNpc(e);s.confirmNpcAction(e);
            largest=Math.max(largest,Math.hypot(n.x-old.x,n.y-old.y));
            if(!open(n))invalid++;
            if(!arrivalMs&&moving.every(p=>Math.hypot(p.x-p.actionTarget.x,p.y-p.actionTarget.y)<=12.1))arrivalMs=(i+1)*50;
          }
          overlaps+=s.groundOccupancy.overlaps().length;
        }
        const rows=window.__worldRebuild.getTravelDiagnostics().filter(r=>moving.some(n=>n.id===r.id));
        return {overlaps,invalid,largest,arrivalMs,rows,arrived:moving.filter(p=>Math.hypot(p.x-p.actionTarget.x,p.y-p.actionTarget.y)<=12.1).length};
      }
    };
    s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.4);s.cameras.main.centerOn(arena.x,arena.y);
    return arena;
  `);
  const test=body=>evalScene('const t=window.travelTest,a=t.actors,c=t.arena;'+body);
  const pass=await test(`
    t.clear();const goal={x:c.x+90,y:c.y};
    t.place(a[0],c.x-91,c.y,'work',goal);
    t.place(a[1],c.x,c.y,'idle');t.place(a[2],c.x+20,c.y,'idle');t.place(a[3],c.x+40,c.y,'idle');
    t.place(a[4],c.x+20,c.y-17,'idle');
    return t.pulse([a[0]],320);
  `);
  assert.equal(pass.arrived,1,JSON.stringify(pass));assert.equal(pass.overlaps,0);assert.equal(pass.invalid,0);
  await shot('07-group-bypass');
  const unreachable=await test(`
    t.clear();t.place(a[0],c.x,c.y,'work',{x:-10000,y:c.y});
    const result=t.pulse([a[0]],50);
    return {...result,x:a[0].x,y:a[0].y,goal:a[0].goalAction};
  `);
  assert.equal(unreachable.x,setup.x);assert.equal(unreachable.y,setup.y);
  assert.equal(unreachable.rows[0].reason,'outside-world');assert.ok(unreachable.rows[0].repaths<8);
  const occupied=await test(`
    t.clear();const goal={x:c.x+70,y:c.y};
    t.place(a[0],c.x-81,c.y,'work',goal);s.syncGroundOccupancy();
    const slot=s.workstations.reserve(a[0],goal);
    t.place(a[1],slot.x,slot.y,'idle');
    const result=t.pulse([a[0]],310);
    return {...result,original:goal,newTarget:a[0].actionTarget,distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};
  `);
  assert.equal(occupied.overlaps,0);
  assert.equal(occupied.arrived,1,JSON.stringify(occupied));
  assert.notDeepEqual(occupied.newTarget,occupied.original,JSON.stringify(occupied));
  const changed=await test(`
    t.clear();t.place(a[0],c.x-86,c.y,'work',{x:c.x+83,y:c.y});
    t.pulse([a[0]],23);
    const before=a[0].x;
    a[0].goalAction='flee';a[0].actionTarget={x:c.x-76,y:c.y+30};
    t.place(a[1],a[0].x-28,c.y+12,'travel',{x:a[0].x-28,y:c.y-24});
    const result=t.pulse([a[0],a[1]],160);
    return {...result,before,after:a[0].x,goal:a[0].goalAction};
  `);
  assert.equal(changed.arrived,2,JSON.stringify(changed));assert.equal(changed.goal,'flee');assert.equal(changed.overlaps,0);
  const bridge=await test(`
    t.clear();const gate=s.passageTraffic.gates.find(g=>g.id==='east-river-bridge'),movers=a.slice(0,5);
    if(!gate)throw Error('No bridge gate');
    for(const [i,n] of movers.entries()){
      const direction=i<3?1:-1,lane=(i%3-1)*19;
      const from=s.passageTraffic.position(gate,-direction*(gate.clear+38+(i%3)*23),lane);
      const goal=s.passageTraffic.position(gate,direction*(gate.clear+57+(i%3)*23),lane);
      t.place(n,from.x,from.y,'work',goal);
    }
    s.setZoom(1.35);s.cameras.main.centerOn(gate.x,gate.y);
    const result=t.pulse(movers,1100);
    return {...result,lanes:gate.lanes,positions:movers.map(n=>({x:n.x,y:n.y,goal:n.actionTarget,
      routeIndex:n.routeIndex,gate:gate.requests.get(n.id)?.stage}))};
  `);
  assert.equal(bridge.arrived,5,JSON.stringify(bridge));assert.equal(bridge.overlaps,0);assert.equal(bridge.invalid,0);
  await shot('08-bridge-flow');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(join(output,'navigation.json'),JSON.stringify({setup,pass,unreachable,occupied,changed,bridge},null,2));
  console.log(JSON.stringify({pass,unreachable,occupied,changed,bridge}));
}finally{ws?.close();chrome.kill();}
