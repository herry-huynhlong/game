import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9298);
const output=resolve('art/previews/tribulation-vfx');
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


  const baseline=process.argv.includes('--baseline');
  await visit('/?cultivationDemo=1','Boolean(window.__worldRebuild?.ready())');
  await run("document.querySelector('#cultivation-demo [data-rank=\"0\"]').click()");
  const subject=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.tribulation?.phase==='cloud');
    if(!n)return null;
    s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.1);s.cameras.main.centerOn(n.x,n.y-110);
    return {id:n.id,hp:n.hp,site:n.tribulation.site};
  `);
  assert.ok(subject,JSON.stringify({errors,failed}));
  await sleep(300);
  const benchmark=async()=>run(`new Promise(resolve=>{
    const frames=[];let last=0;
    const tick=t=>{if(last)frames.push(t-last);last=t;
      if(frames.length<132){requestAnimationFrame(tick);return;}
      const sorted=[...frames].sort((a,b)=>a-b),s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
      resolve({fps:132000/frames.reduce((a,b)=>a+b,0),p95:sorted[125],width:innerWidth,height:innerHeight,zoom:s.cameras.main.zoom});
    };requestAnimationFrame(tick);
  })`);
  const fps=await benchmark();
  await shot(baseline?'before-cloud':'world-cloud');
  const result=await evalScene(`
    const w=s.populationWorld,n=w.npcs.find(n=>n.id===${JSON.stringify(subject.id)}),t=n.tribulation;
    const pump=()=>{w.clock.day=Math.floor(t.nextAt/1440);w.clock.minute=t.nextAt%1440;s.cultivation.tick();};
    if(t.phase==='cloud')pump();
    const hp=n.hp,pending=t.phase,strikes=t.strikes;
    pump();s.persistPopulation();
    const actualHp=n.hp;s.cultivation.tick();
    if(actualHp!==n.hp)throw Error('Duplicate damage on the same tick');
    return {hp,pending,strikes,hitHp:n.hp,hitCount:t.strikes,phase:t.phase,anchor:t.anchor??{x:n.x,y:n.y}};
  `);
  if(!baseline){assert.equal(result.pending,'warning');assert.equal(result.hitCount,result.strikes+1);assert.ok(result.hitHp<result.hp);}
  await sleep(45);await shot(baseline?'before-impact':'world-impact');
  if(!baseline){
    const rendered=()=>run('window.__worldRebuild.getTribulationVisuals()');
    const first=await rendered();
    assert.deepEqual(first.storms[0].endpoint,result.anchor);
    await evalScene(`
      s.setZoom(.95);s.cameras.main.centerOn(${result.anchor.x+120},${result.anchor.y-150});
      s.persistPopulation();
    `);
    await sleep(65);
    const panned=await rendered();
    assert.deepEqual(panned.storms[0].endpoint,result.anchor);
    await send('Page.reload');
    await sleep(650);
    for(let i=0;i<90&&!await run('Boolean(window.__worldRebuild?.ready())');i++)await sleep(100);
    const restored=await evalScene(`
      const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(subject.id)});
      return {hp:n.hp,wave:n.tribulation?.strikes,anchor:n.tribulation?.anchor};
    `);
    assert.deepEqual(restored,{hp:result.hitHp,wave:result.hitCount,anchor:result.anchor});
    await evalScene(`s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.1);s.cameras.main.centerOn(500,500);`);
    await sleep(85);
    const offscreen=await evalScene(`
      const w=s.populationWorld,n=w.npcs.find(n=>n.id===${JSON.stringify(subject.id)}),t=n.tribulation;
      w.clock.day=Math.floor(t.nextAt/1440);w.clock.minute=t.nextAt%1440;s.cultivation.tick();
      return {hp:n.hp,wave:t.strikes,visible:s.cultivation.stormVisuals.last.length};
    `);
    assert.equal(offscreen.wave,2);assert.ok(offscreen.hp<restored.hp);assert.equal(offscreen.visible,0);

    await visit('/?tribulationVfx=1',`Boolean(window.__worldRebuild?.ready()&&document.querySelector('#tribulation-arena'))`);
    await sleep(540);
    const arenaCode='const a=s.cultivation.arena;';
    const arena=code=>evalScene(arenaCode+code);
    const option=(name,value)=>arena(`const input=a.fields[${JSON.stringify(name)}];
      input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change'));`);
    const seek=async seconds=>{
      await arena(`a.seek(${seconds});`);
      await sleep(45);
      return (await rendered()).storms[0];
    };
    const actors=await arena(`return {
      staged:a.arenaActors.size,sites:s.cultivation.sites.length,roster:s.populationWorld.npcs.length,
      cultivators:s.populationWorld.npcs.filter(n=>n.profession==='tu_si'&&n.modularAppearance).length
    };`);
    assert.equal(actors.staged,1,JSON.stringify({actors,errors}));
    assert.equal(await arena("return ['wind','charge','impact','residue'].filter(k=>s.cache.audio.exists('tribulation-'+k)).length;"),4);
    await arena(`a.fields.shake.checked=false;a.fields.shake.dispatchEvent(new Event('change'));
      a.fields.sound.checked=true;a.fields.sound.dispatchEvent(new Event('change'));`);
    const start=await run(`(()=>{const r=document.querySelector('#tribulation-arena [data-restart]').getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...start});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...start});
    let playback;
    for(let i=0;i<12;i++){
      await sleep(120);
      playback=await arena('return {playing:a.vfx.playing.size,paused:a.paused,time:a.seconds,locked:s.sound.locked,hidden:document.hidden,storms:a.vfx.last};');
      if(playback.playing)break;
    }
    const audioPlaying=playback.playing;
    assert.ok(audioPlaying>=1,JSON.stringify({playback,errors}));
    await arena("a.seek(5.35);a.panel.querySelector('[data-pause]').click();");
    const cues=await run(`new Promise(resolve=>{
      ${scene}
      const visual=s.cultivation.stormVisuals,start=performance.now(),played=new Set();
      const check=()=>{
        for(const sound of visual.playing)if(sound.isPlaying)played.add(sound.key);
        if(played.has('tribulation-charge')&&played.has('tribulation-impact')&&played.has('tribulation-residue')||
          performance.now()-start>3800){resolve([...played]);return;}
        requestAnimationFrame(check);
      };
      check();
    })`);
    for(const name of ['charge','impact','residue'])assert.ok(cues.includes('tribulation-'+name),JSON.stringify({cues,errors}));
    await option('rate','.25');
    assert.equal(await arena('return a.rate;'),.25);
    await seek(1);
    const stepped=await arena("a.panel.querySelector('[data-step]').click();return a.seconds;");
    assert.ok(Math.abs(stepped-1-1/60)<.001);
    await shot('arena-controls');
    await arena("a.panel.style.visibility='hidden';");
    for(const [name,time,phase,wave] of [
      ['01-cloud-convergence',1.65,'cloud',0],['02-cloud-formed',3.95,'cloud',0],
      ['03-charge',6.68,'warning',0],['04-lightning-leader',6.94,'warning',0],
      ['05-lightning',7.06,'strike',1],['06-impact',7.24,'strike',1],
      ['07-second-wave',10.08,'strike',2],['08-success',14.05,'success',2]
    ]){
      const state=await seek(time);
      assert.equal(state?.phase,phase,name);assert.equal(state.wave,wave,name);
      assert.deepEqual(state.endpoint,{x:state.x,y:state.y},name);
      await shot(name);
    }
    await option('outcome','failure');
    assert.equal((await seek(14.05)).phase,'failure');
    await shot('09-failure');
    await arena(`const {point}=a.arenaActors.values().next().value;
      s.setZoom(.25);s.cameras.main.centerOn(point.x,point.y-140);`);
    assert.equal((await seek(3.95))?.phase,'cloud');
    await shot('12-overview');
    await option('realm','3');
    assert.equal((await seek(27.05)).wave,5);
    await shot('10-hoa-than-fifth-wave');
    await option('outcome','success');
    await option('count','3');await option('quality','high');
    await seek(11.6);
    assert.equal((await rendered()).storms.length,3);
    await shot('11-three-storms');
    const high=await benchmark();
    await option('quality','low');await sleep(90);
    const lowState=await rendered();
    assert.equal(lowState.storms.length,1);assert.equal(lowState.pool,3);
    const low=await benchmark();
    const culled=await arena(`s.cameras.main.centerOn(500,500);return true;`);
    assert.ok(culled);await sleep(80);assert.equal((await rendered()).storms.length,0);
    assert.equal(await run("localStorage.getItem('world-rebuild-1c-v1')"),null);
    assert.deepEqual((await rendered()).storms,[]);
    await writeFile(join(output,'arena.json'),JSON.stringify({panned,restored,offscreen,audioPlaying,cues,high,low,lowState},null,2));
    if(process.argv.includes('--video')){
      await option('count','1');await option('realm','0');await option('quality','high');
      await mkdir(join(output,'frames'),{recursive:true});
      for(let i=0;i<160;i++){
        await seek(i/10);
        await shot('frames/'+String(i).padStart(3,'0'));
      }
    }
  }
  await writeFile(join(output,baseline?'before.json':'world.json'),JSON.stringify({subject,fps,result,errors,failed},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  console.log(JSON.stringify({fps,result}));
}finally{ws?.close();chrome.kill();}
