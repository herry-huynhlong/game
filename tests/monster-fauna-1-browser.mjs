import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9265);
const output=resolve('art/previews/monster-v2');
const profile=await mkdtemp(join(tmpdir(),'tvk-lod-'));
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
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };
  await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
  await sleep(750);
  const world=await evalScene(`
    const w=s.populationWorld,env=w.environment,state=s.getFaunaState(),water=s.map.layers.find(l=>l.name==='Water');
    return {npc:w.npcs.length,fish:s.riverFishSystem?.getState(s.cameras.main)?.count,version:env.monsterVersion,
      zones:state.zones.map(z=>({id:z.zoneId,species:z.species,cap:z.cap,living:z.living,elite:z.elite})),
      invalid:state.records.filter(f=>s.monsterSafe(f)||water?.data[Math.floor(f.y/32)]?.[Math.floor(f.x/32)]?.index>=0||!s.groundPositionOpen(f,f.x,f.y)).map(f=>f.id),
      ids:env.fauna.map(f=>[f.id,f.rank,f.species]),tiger:s.textures.exists('mount-tiger')};
  `);
  assert.equal(world.npc,108);assert.equal(world.version,2);assert.ok(world.fish>0);
  assert.deepEqual(world.invalid,[]);assert.ok(world.zones.every(z=>z.cap===z.living&&z.elite<=1));
  assert.deepEqual([...new Set(world.ids.map(f=>f[2]))].sort(),['boar','toad','wolf']);
  const screenshots={};
  for(const species of ['wolf','boar','toad']){
    await evalScene(`
      const f=s.populationWorld.environment.fauna.find(a=>a.species===${JSON.stringify(species)}&&a.alive);
      s.selectedFaunaId=f.id;s.cameraTween?.stop();s.cameraTween=null;
      s.setZoom(1.25);s.cameras.main.centerOn(f.x,f.y);
    `);
    await sleep(370);
    screenshots[species]=await evalScene(`return s.getFaunaState().records.filter(f=>f.species===${JSON.stringify(species)}&&f.visible).length`);
    assert.ok(screenshots[species]>0);
    await shot('world-'+species);
  }
  const offCamera=await evalScene(`
    s.gotoMarker('city-center',1);
    const beasts=s.populationWorld.environment.fauna.filter(f=>f.species==='wolf');
    const initial=beasts.map(f=>[f.x,f.y]);
    for(let i=0;i<24;i++)s.updatePopulation(performance.now(),250,250);
    return beasts.filter((f,i)=>Math.hypot(f.x-initial[i][0],f.y-initial[i][1])>4).length;
  `);
  assert.ok(offCamera>0,'forest wolves move while city is viewed');
  const hunt=await evalScene(`
    const w=s.populationWorld,h=w.npcs.find(n=>n.populationRole==='hunter'&&n.alive);
    const f=w.environment.fauna.filter(f=>f.alive&&f.species==='wolf'&&f.rank==='normal')
      .find(f=>[[-34,0],[34,0],[0,29],[0,-29]].some(([x,y])=>s.groundPositionOpen(h,f.x+x,f.y+y)&&s.monsterLine(f,{x:f.x+x,y:f.y+y})));
    if(!h||!f)return null;
    const [dx,dy]=[[-34,0],[34,0],[0,29],[0,-29]].find(([x,y])=>s.groundPositionOpen(h,f.x+x,f.y+y)&&s.monsterLine(f,{x:f.x+x,y:f.y+y}));
    Object.assign(h,{x:f.x+dx,y:f.y+dy,hp:100,fatigue:0,safety:75,faunaAttackReadyAt:0,faunaEvadeUntil:0});
    s.npcSprites.get(h.id).setPosition(h.x,h.y);
    w.clock.minute=620;f.hp=1;
    window.__worldRebuild.testStartHunterHunt(h.id,f.id);s.syncGroundOccupancy();s.tickHunters(s.faunaNow());
    const drop=w.environment.drops.find(d=>d.sourceId===f.id);
    if(!drop)return {killed:!f.alive,claimed:false};
    if(Math.hypot(h.x-drop.x,h.y-drop.y)>30){
      const length=Math.hypot(h.x-f.x,h.y-f.y),point={x:f.x+dx*27/length,y:f.y+dy*27/length};
      const movement=s.moveOnGround(h,s.npcSprites.get(h.id),point.x,point.y,false);
      if(movement){Object.assign(h,movement);s.npcSprites.get(h.id).setPosition(h.x,h.y);}
    }
    s.tickHunters(s.faunaNow());s.persistPopulation();
    return {killed:!f.alive,claimed:drop.status==='claimed',holder:h.id,item:drop.itemId,count:h.inventory.find(i=>i.itemId===drop.itemId)?.count??0,
      drop:drop.id,queue:w.environment.faunaRespawns.some(q=>q.sourceDeathId===f.id)};
  `);
  assert.ok(hunt?.killed&&hunt.claimed&&hunt.count&&hunt.queue,JSON.stringify(hunt));
  await send('Page.reload',{ignoreCache:true});await ready();
  const persisted=await evalScene(`
    const w=s.populationWorld,d=w.environment.drops.find(d=>d.id===${JSON.stringify(hunt.drop)});
    return {claimed:d?.status==='claimed',holder:d?.claimedBy,valid:w.environment.fauna.every(f=>['wolf','boar','toad'].includes(f.species)&&['normal','elite'].includes(f.rank))};
  `);
  assert.deepEqual(persisted,{claimed:true,holder:hunt.holder,valid:true});

  await visit('/monster-gallery.html','Boolean(window.__monsterGallery?.beast)');
  assert.equal(await run("document.querySelectorAll('#variants button').length"),6);
  const arena=[];
  for(const species of ['wolf','boar','toad'])for(const rank of ['normal','elite']){
    const fixture=await run(`(()=>{
      const s=window.__monsterGallery;
      document.querySelector('[data-variant="${species}-${rank}"]').click();
      const skills=Array.from(document.getElementById('skill').options,o=>o.value);
      const results=[];
      for(const id of skills){
        document.getElementById('skill').value=id;
        document.getElementById('direction').value='east';
        document.getElementById('preview').click();
        const started=Boolean(s.beast.cast);
        let touched=s.hunter.hp<135,phases=new Set();
        for(let i=0;i<130;i++){
          s.step();phases.add(s.beast.state);touched||=s.hunter.hp<135;
        }
        results.push({id,started,touched,phases:[...phases]});
      }
      document.getElementById('duel').click();
      for(let i=0;i<330;i++)s.step();
      const duel={hp:s.beast.hp,hunter:s.hunter.hp,loot:s.environment.drops.length};
      document.getElementById('reset').click();
      document.getElementById('collision').checked=true;
      return {species:s.id,rank:s.rank,results,duel};
    })()`);
    assert.ok(fixture.results.every(k=>k.started),JSON.stringify(fixture));
    assert.ok(fixture.duel.hp<100||fixture.duel.hunter<135);
    arena.push(fixture);await sleep(150);await shot(species+'-'+rank);
  }
  await run(`document.querySelector('[data-variant="toad-elite"]').click();document.getElementById('skill').value='skyfall';document.getElementById('direction').value='east';document.getElementById('preview').click();`);
  await sleep(600);await shot('arena-skyfall');
  for(const [species,skill,steps] of [['wolf','phantom-pounce',16],['boar','quake',22],['toad','poison-mist',24]]){
    await run(`(()=>{
      const s=window.__monsterGallery;
      document.querySelector('[data-variant="${species}-elite"]').click();
      document.getElementById('skill').value='${skill}';
      document.getElementById('direction').value='east';
      document.getElementById('preview').click();
      for(let i=0;i<${steps};i++)s.step();
    })()`);
    await sleep(90);
    await shot('arena-'+skill);
  }
  await visit('/npc-xianxia-editor.html','Boolean(document.querySelector("#map-stage canvas")&&document.querySelector("#appearance-fields select"))');
  await sleep(200);
  assert.ok(await run("document.getElementById('arena-summon').textContent.includes('Huyền Hổ')"));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={world,screenshots,offCamera,hunt,persisted,arena,editor:true,errors,failed};
  await writeFile(join(output,'verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({zones:world.zones,offCamera,hunt,arena:arena.map(f=>[f.species,f.rank,f.duel]),editor:report.editor}));
}finally{ws?.close();chrome.kill();}
