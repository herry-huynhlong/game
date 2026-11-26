import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9462);
const output=resolve('art/previews/dong-hoang-art');
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
  await send('Network.setCacheDisabled',{cacheDisabled:true});
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
  const ready="Boolean(window.__worldRebuild?.ready() && window.__worldRebuildGame)";
  const mode=process.argv.includes('--before')?'before':'after';
  const name=(file)=>mode+'-'+file;
  const galleryOnly=process.argv.includes('--gallery');
  if(mode==='after'){
    await visit('/east-art-gallery.html','Boolean(window.__eastArtReady)');
    await sleep(160);
    assert.equal(await run("document.querySelectorAll('#creatures article').length"),9);
    await shot('gallery-doi-chieu');
    const controls=`(pose,scale,direction)=>{document.querySelector('#pose').value=pose;
      document.querySelector('#scale').value=scale;document.querySelector('#direction').value=direction;}`;
    await run(`(${controls})('move','2','2')`);
    await sleep(140);
    const poses=[];
    for(let i=0;i<5;i++){
      poses.push(await run("Array.from(document.querySelectorAll('#creatures article figure:nth-child(2) canvas'),c=>c.toDataURL())"));
      await sleep(170);
    }
    assert.ok(poses[0].every((_,index)=>new Set(poses.map(row=>row[index])).size>1));
    await run(`(${controls})('active','2','2');document.querySelector('#play').click()`);
    for(let i=0;i<4;i++){
      await run("document.querySelector('#frame').value="+i);
      await sleep(100);
      await shot('gallery-action-'+i);
    }
    await run(`(${controls})('idle','4','1')`);
    await sleep(135);
    assert.ok(await run("document.querySelector('#creatures canvas').width >= 448"));
    await run(`(${controls})('disguise','1','0')`);
    await sleep(135);
    assert.ok(await run("document.querySelector('#creatures canvas').width < 130"));
    await run("document.querySelector('#terrain').scrollIntoView()");
    await sleep(260);
    await shot('gallery-canh-quan');
  }
  if(!galleryOnly){
  await visit('/?testMode=1&region=east',ready);
  await sleep(650);
  const frame=async(mark,zoom)=>evalScene(`
    const p=${mark};s.cameraTween?.stop();s.cameraTween=null;
    s.cameras.main.setZoom(${zoom}).centerOn(p.x,p.y-12);
    s.clampCamera();s.updateSceneryVisibility();s.refreshFaunaVisibility();
  `);
  await shot(name('toan-canh'));
  const water=[];
  const atlas=await evalScene('return s.terrainCache?.tileVariants??null;');
  await frame("s.society.places.get('east-rest').counter",.86);
  await sleep(550);
  await shot(name('oc-dao'));
  const benchmark=await run(`new Promise(resolve=>{
    let first,last;const samples=[];
    const step=t=>{
      if(first===undefined)first=t;
      if(last!==undefined)samples.push(t-last);
      last=t;
      if(t-first<2500)requestAnimationFrame(step);
      else {samples.sort((a,b)=>a-b);resolve({fps:samples.length*1000/(t-first),p95:samples[Math.floor(samples.length*.95)]});}
    };
    requestAnimationFrame(step);
  })`);
  if(mode==='after'){
    for(const [zoom,speed] of [[.34,1],[.86,2],[1.55,4],[.86,0]]){
      await frame("({x:10444-s.westOffsetX,y:3078})",zoom);
      await evalScene(`
        const select=document.querySelector('#world-clock-speed');
        select.value='${speed}';select.dispatchEvent(new Event('change'));
      `);
      const readWater=()=>evalScene(`
        return s.flowSprites.filter(sprite=>sprite.getData('waterKind')==='east-oasis-ripple')
          .map(sprite=>[sprite.texture.key,Number(sprite.frame.name),sprite.visible]);
      `);
      await sleep(160);
      const a=await readWater();
      await sleep(360);
      const b=await readWater();
      const live=a.filter((f,i)=>f[2]&&b[i][2]&&f[1]!==b[i][1]).length;
      assert.ok(live>=3&&a.every(f=>f[0]==='rebuild-water-motion'));
      water.push({zoom,speed,live,total:a.length});
    }
    await frame("({x:10444-s.westOffsetX,y:3078})",1.42);
    await sleep(180);await shot('after-gon-song-1');
    await sleep(310);await shot('after-gon-song-2');
    await evalScene(`
      s.populationWorld.clock.speed=1;
      s.populationWorld.clock.minute=1210;
      for(let i=0;i<28;i++)s.tickFauna(100);
    `);
  }
  const subjects=[];
  for(const species of ['sand-scorpion','bone-wolf','bone-skeleton','bone-general','sand-worm','sand-golem','flame-lizard','bone-king','wetland-toad']){
    const target=species==='wetland-toad'?"f.species==='toad'&&f.zoneId==='east-wetland'":"f.species==='"+species+"'";
    await frame("s.populationWorld.environment.fauna.find(f=>f.alive&&"+target+")",1.55);
    await sleep(130);
    await shot(name(species));
    if(mode==='after'){
      const value=await evalScene(`
        const beast=s.populationWorld.environment.fauna.find(f=>f.alive&&${target});
        const sprite=s.faunaSprites.get(beast.id);
        return {species:'${species}',visible:sprite.visible,texture:sprite.texture.key,frame:Number(sprite.frame.name),size:sprite.frame.width};
      `);
      assert.ok(value.visible&&value.texture==='monster-east-'+species&&value.size===112);
      subjects.push(value);
    }
  }
  let portrait,motion;
  if(mode==='after'){
    await frame("s.populationWorld.environment.fauna.find(f=>f.alive&&f.species==='bone-wolf')",1.32);
    await sleep(250);
    portrait=await evalScene(`
      const beast=s.populationWorld.environment.fauna.find(f=>f.alive&&f.species==='bone-wolf');
      s.inspector.select({kind:'fauna',id:beast.id});
      const canvas=s.inspector.panel.querySelector('canvas');
      return {title:s.inspector.panel.querySelector('h2').textContent,size:canvas.width,visible:!s.inspector.panel.hidden,
        hasArt:canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v===255)};
    `);
    assert.ok(portrait.visible&&portrait.size===112&&portrait.hasArt);
    await shot('after-giam-dinh');
    await evalScene(`
      s.inspector.close();
      const w=s.populationWorld;
      const beast=w.environment.fauna.find(f=>f.alive&&f.species==='sand-scorpion');
      const actor=w.npcs.find(n=>n.alive&&!n.underground&&!n.wallLevel&&n.realmIndex>=2);
      const place=[[-24,0],[24,0],[0,-24],[0,24],[-35,0],[35,0]].map(([x,y])=>({x:beast.x+x,y:beast.y+y}))
        .find(p=>s.groundPositionOpen(actor,p.x,p.y)&&!s.monsterSafe(p)&&s.monsterLine(p,beast));
      if(!place)throw new Error('No clear point for the combat fixture');
      Object.assign(actor,place);s.npcSprites.get(actor.id).setPosition(actor.x,actor.y);
      s.syncGroundOccupancy();
    `);
    await frame("s.populationWorld.environment.fauna.find(f=>f.alive&&f.species==='sand-scorpion')",1.55);
    await sleep(100);
    const collected=[];
    for(let i=0;i<45&&collected.length<4;i++){
      const state=await evalScene(`
        const world=s.populationWorld,beast=world.environment.fauna.find(f=>f.alive&&f.species==='sand-scorpion');
        s.tickFauna(120);
        s.monsterVisuals.update(world.environment,world.environment.faunaClockMs);
        return {id:beast.id,skill:beast.cast?.skillId??null,
          frame:Number(s.faunaSprites.get(beast.id).frame.name)};
      `);
      const row=Math.floor(state.frame/16),active=row===3||row===10||row===11;
      if(!state.skill||collected.some(x=>x.frame===state.frame))continue;
      const samePhase=collected.filter(e=>e.phase===(active?'strike':row===2?'windup':'recover'));
      if(samePhase.length>=(active?2:1))continue;
      collected.push({...state,phase:active?'strike':row===2?'windup':'recover'});
      await sleep(55);
      await shot('after-doc-hat-combat-'+collected.length);
    }
    assert.ok(['windup','strike','recover'].every(phase=>collected.some(e=>e.phase===phase)));
    motion=collected;
  }
  await writeFile(join(output,name('benchmark')+'.json'),JSON.stringify({benchmark,atlas,water,subjects,portrait,motion,errors,failed},null,2));
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
} finally{
  if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({id:999999,method:'Browser.close'}));
  ws?.close();
  chrome.kill();
}
