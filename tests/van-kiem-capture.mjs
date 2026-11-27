import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { captureVanPhap } from './van-phap-evidence.mjs';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9488);
const output=resolve('art/previews/van-kiem-art-review',process.env.VAN_KIEM_CAPTURE ?? 'after');
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
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };
  const ready="Boolean(window.__worldRebuild?.ready())";
  const night=process.argv.includes('--night');
  const bank=process.argv.includes('--bank');
  const close=process.argv.includes('--close');
  const onlyStills=process.argv.includes('--stills');
  await visit('/?combatGallery=1&testMode=1',ready);
  if(process.argv.includes('--van-phap')){
    await captureVanPhap({send,evalScene,run,errors,failed,visit,ready,output:resolve('art/previews/van-phap')});
  }else{
  const expression=`
    const lab=s.martialGallery;
    const field=(n,v)=>{const el=document.querySelector('[data-martial="'+n+'"]');if(!el)return;el.value=v;el.dispatchEvent(new Event('change'));};
  `;
  const setup=await evalScene(expression+`
    field('speed',0);field('zoom',${close?2:"'game'"});field('detail',2);
    field('course','myriad-sword');field('skill','myriad-unite');field('realm',4);field('mastery',4);field('weapon','heaven_thunder_jian');
    if(${night}){s.populationWorld.clock.minute=1260;field('light','night');}
    if(${bank})field('site','bank');
    const untouched=lab.snapshot();
    const fired=document.querySelector('.martial-gallery-controls button').onclick();
    const cast=s.martialCombat.casts.get(untouched.actorId);
    const attempt=s.martialCombat.cast(cast.npc,cast.skill.id,cast.target);
    return {fired,attempt,id:cast.id,loanCount:cast.swords.length,target:cast.targetId,mp:cast.npc.mp,
      ownerIds:cast.swords.map(row=>row.instance.ownerId),duration:cast.timeline.complete,
      camera:{zoom:s.cameras.main.zoom,width:s.scale.width,height:s.scale.height},renderer:s.game.renderer.type};
  `);
  assert.equal(setup.fired,true);
  assert.equal(setup.attempt,false);
  const moments={0:'00-vao-the',480:'01-van-cong',1280:'02-bay-len',1700:'03-khau-quyet',2820:'04-xung-danh',3180:'05-muon-kiem-tu-xa',
    5250:'06-kiem-tran',6430:'07-xuat-kiem',7210:'08-va-cham',8950:'09-du-am',9530:'10-quy-chu-ha-xuong',10100:'11-hoan-tat',11200:'12-sach-hieu-ung'};
  const video=Object.fromEntries(Array.from({length:175},(_,i)=>[i*64,i]));
  const timeline=[...new Set([...Object.keys(moments),...Object.keys(video)].map(Number))].sort((a,b)=>a-b);
  const frames=join(output,night?'frames-night':'frames');
  const states=[];
  if(!onlyStills)await mkdir(frames,{recursive:true});
  let previous=0;
  for(const time of timeline){
    const state=await evalScene(expression+`
      lab.advance(${time-previous});s.martialCombat.render();
      const snap=lab.snapshot(),art=s.martialCombat.cinematic;
      return {...snap,borrowed:s.martialCombat.borrowed.size,
        renderSwords:art?.swordCount??s.martialCombat.props.swords.filter(node=>node.visible).length,
        visible:art?.visibleCount()??0};
    `);
    previous=time;
    if(moments[time]){
      states.push({time,...state});
      await shot((night?'dem-':'')+moments[time]);
    }
    if(!onlyStills&&Object.hasOwn(video,time)){
      const image=await send('Page.captureScreenshot',{format:'jpeg',quality:90});
      await writeFile(join(frames,String(video[time]).padStart(4,'0')+'.jpg'),Buffer.from(image.data,'base64'));
    }
  }
  await writeFile(join(output,(night?'dem-':'')+'timeline.json'),JSON.stringify({setup,states,errors,failed},null,2)+'\n');
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  assert.equal(states.at(-1).projectiles,Math.max(3,setup.loanCount));
  assert.ok(states.at(-1).hits>0);
  if(!night&&!bank&&!close&&process.env.VAN_KIEM_CAPTURE!=='before'){
    const before=JSON.parse(await readFile(join(output,'../before/timeline.json'),'utf8'));
    assert.equal(states.at(-1).hits,before.states.at(-1).hits);
    assert.equal(states.at(-1).target.hp,before.states.at(-1).target.hp);
    assert.equal(setup.mp,before.setup.mp);
  }
  assert.equal(states.at(-1).borrowed,0);
  assert.equal(states.at(-1).visible,0);
  if(process.argv.includes('--benchmark')){
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:780,y:850,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:780,y:850,button:'left',clickCount:1});
    const metrics=await run(`new Promise(resolve=>{
      ${scene}
      const combat=s.martialCombat,lab=s.martialGallery;
      const button=document.querySelector('.martial-gallery-controls button');
      button.onclick();
      const cast=combat.casts.get(lab.snapshot().actorId);
      let first=0,last=0,peak=0,objects=0,totalCpu=0;
      const times=[],cpu=[],audioStart=combat.cinematic.cueCount;
      const step=time=>{
        if(!first){first=time;last=time;}
        else{
          const delta=time-last;last=time;times.push(delta);
          const started=performance.now();
          lab.advance(delta);
          cpu.push(performance.now()-started);
          totalCpu+=performance.now()-started;
          peak=Math.max(peak,combat.cinematic.swordCount);
          objects=Math.max(objects,combat.cinematic.visibleCount());
        }
        if(time-first<11200){requestAnimationFrame(step);return;}
        times.sort((a,b)=>a-b);cpu.sort((a,b)=>a-b);
        resolve({fps:times.length*1000/(time-first),frameP95:times[Math.floor(times.length*.95)],maxFrame:times.at(-1),
          cpuP95:cpu[Math.floor(cpu.length*.95)],cpuAvg:totalCpu/cpu.length,peakSwords:peak,peakVisibleObjects:objects,
          cues:combat.cinematic.cueCount-audioStart,duration:time-first,hits:cast.hits,projectiles:cast.projectiles.length,
          firstImpact:cast.impacts[0]?.at,loans:cast.swords.length,pool:combat.cinematic.pool.length,after:combat.cinematic.visibleCount(),
          textures:s.textures.get('van-kiem-cinematic').getFrameNames().length,audioLocked:s.sound.locked,renderer:s.game.renderer.type});
      };requestAnimationFrame(step);
    })`);
    await writeFile(join(output,'benchmark.json'),JSON.stringify(metrics,null,2)+'\n');
    assert.equal(metrics.after,0);
    assert.equal(metrics.peakSwords,150);
    console.log(JSON.stringify(metrics));
  }
  console.log('Chrome captured '+timeline.length+' samples in '+output);
  }
} finally {
  ws?.close();
  chrome.kill();
}
