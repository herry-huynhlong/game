import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';

const output = resolve('art/previews/heaven/browser');
const profile = await mkdtemp(join(tmpdir(), 'thanh-van-heaven-'));
await mkdir(output, { recursive: true });
const origin = process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5175';
const debugPort = Number(process.env.HEAVEN_DEBUG_PORT ?? 9237);
const chrome = spawn(process.env.CHROME_EXE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-first-run',
  '--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'--window-size=1320,1050',origin+'/?testMode=1',
], { stdio:'ignore', windowsHide:true });
let socket;

async function until(fn, ms=20000) {
  const end=Date.now()+ms;
  while (Date.now()<end) {
    const result=await fn();
    if (result) return result;
    await delay(90);
  }
  throw new Error('Timeout: '+fn.toString());
}

try {
  const page=await until(async()=>{
    try {return (await (await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()).find(t=>t.type==='page');}
    catch {return null;}
  });
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail;});
  let sequence=0;
  const pending=new Map(), errors=[], missing=[], frames=[];
  socket.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if (msg.id) {
      const {ok,fail}=pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) fail(Error(msg.error.message)); else ok(msg.result);
    }
    if (msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
    if (msg.method==='Page.screencastFrame') {
      frames.push({data:msg.params.data,time:msg.params.metadata.timestamp});
      void send('Page.screencastFrameAck',{sessionId:msg.params.sessionId});
    }
    if (msg.method==='Network.responseReceived' && msg.params.response.status>=400 &&
        !msg.params.response.url.includes('favicon')) missing.push(msg.params.response.url);
  };
  function send(method,params={}) {
    const id=++sequence;
    return new Promise((ok,fail)=>{pending.set(id,{ok,fail});socket.send(JSON.stringify({id,method,params}));});
  }
  async function run(expression) {
    const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async function shot(name) {
    const result=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(result.data,'base64'));
  }
  const click = selector => run(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const choose = (selector,value) => run(`(()=>{const select=document.querySelector(${JSON.stringify(selector)});select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const key = async key=>{
    for (const type of ['rawKeyDown','keyUp']) {
      await send('Input.dispatchKeyEvent',{type,key:key.toLowerCase(),code:'Key'+key,windowsVirtualKeyCode:key.charCodeAt(0),nativeVirtualKeyCode:key.charCodeAt(0)});
      await delay(150);
    }
  };
  const aim = async position => send('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(position.x),y:Math.round(position.y)});
  const save = () => run("JSON.parse(localStorage.getItem('world-rebuild-1c-v1'))");
  const metrics={};
  const measure=async name=>{
    metrics[name]=await run(`new Promise(resolve=>{
      const samples=[];
      requestAnimationFrame(start=>{
        let previous=start;
        const collect=now=>{
          samples.push(now-previous);previous=now;
          if(now-start<900) return requestAnimationFrame(collect);
          samples.sort((a,b)=>a-b);
          resolve({fps:1000*samples.length/(now-start),avgMs:(now-start)/samples.length,
            p95Ms:samples[Math.min(samples.length-1,Math.floor(samples.length*.95))]});
        };
        requestAnimationFrame(collect);
      });
    })`);
  };
  const ready = () => until(async()=>{
    if (errors.length) throw Error(JSON.stringify(errors[0]));
    return run('Boolean(window.__worldRebuild?.ready())');
  }).catch(async error=>{
    console.error(await run('({url:location.href,boot:window.__worldBoot?.snapshot(),title:document.title})'),missing);
    throw error;
  });
  await send('Page.enable');await send('Network.enable');await send('Runtime.enable');
  await send('Page.navigate',{url:origin+'/?testMode=1'});
  await send('Page.bringToFront');
  await delay(700);
  await ready();
  if (process.env.RECORD_HEAVEN) await send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:960,maxHeight:720,everyNthFrame:3});
  const sceneFixture = npcId => `const scene=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
    const actor=scene.populationWorld.npcs.find(n=>n.id===${npcId});
    const place=(x,y)=>{actor.x=x;actor.y=y;scene.npcSprites.get(actor.id).setPosition(x,y);scene.cameras.main.centerOn(x,y);scene.setZoom(1.2)};
    const screen=(x,y)=>{const c=scene.cameras.main;return {x:(x-c.worldView.x)*c.zoom,y:(y-c.worldView.y)*c.zoom}};`;
  if (process.env.HEAVEN_BENCHMARK_ONLY) {
    for (const [name,location] of [['city','city'],['forest','forest'],['river','river']]) {
      await run(`(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
        if('${location}'==='river')s.gotoHabitat('river');else s.gotoRegion('${location}');
      })()`);
      await delay(1000);
      await run("window.__worldRebuildGame.scene.getScene('world-rebuild-1b').setZoom(.95)");
      await delay(900);
      await measure(name);
    }
    await click('#open-heaven-shop');
    await delay(500);
    await measure('shop');
    await writeFile(join(output,'metrics-no-recording.json'),JSON.stringify(metrics,null,2));
  } else if (!process.env.HEAVEN_ONLY_SABER) {
  const initial=await save();
  assert.equal(initial.npcs.length,108);
  assert.equal(initial.environment.fish.filter(f=>f.species==='spirit').length,1);
  const npc=initial.npcs.find(n=>n.equippedWeapon==='iron_sword'&&(n.realmIndex>0||n.realmLevel>=2)&&n.populationRole==='low_disciple');
  assert.ok(npc,'an equipped disciple meets the learning requirement');
  const npcId=JSON.stringify(npc.id);
  await measure('city');
  await run(`window.__worldRebuildGame.scene.getScene('world-rebuild-1b').selectNPC(${npcId})`);
  await click('#possess-start');
  await key('F');
  await until(()=>run("document.getElementById('population-toast')?.textContent.includes('Cần sở hữu cần câu')"));
  await shot('00-no-rod');
  await click('#possess-end');
  const balance=(await save()).heaven.divinePower;
  await click('#open-heaven-shop');
  await shot('01-shop-rod');
  await measure('shop');
  await click('[data-heaven-list] article button');
  await delay(250);
  await click('[data-heaven-tab=skills]');
  await shot('02-skill-books');
  await click('[data-heaven-list] article button');
  await click('[data-heaven-tab=vault]');
  await shot('03-heaven-vault');
  const purchased=await save();
  assert.equal(purchased.heaven.divinePower,balance-10);
  assert.equal(purchased.heaven.shopLedger.length,2);
  await send('Page.reload');await delay(800);await ready();
  assert.equal((await save()).heaven.shopLedger.length,2);
  await click('#open-heaven-shop');
  await click('[data-heaven-tab=gift]');
  await choose('[data-heaven-list] select',npc.id);
  await click('[data-heaven-list] article button');
  await click('[data-heaven-list] article button');
  let data=await save();
  assert.equal(data.heaven.shopLedger.filter(r=>r.owner===npc.id).length,2);
  await click('[data-close-heaven]');
  await run(`window.__worldRebuildGame.scene.getScene('world-rebuild-1b').selectNPC(${npcId})`);
  await click('#possess-start');
  await run("window.heavenKeys=[];addEventListener('keydown',e=>heavenKeys.push([e.key,e.keyCode]))");
  await key('F');
  await until(()=>run("document.getElementById('population-toast')?.textContent.includes('trang bị cần câu')"),4000).catch(async error=>{
    console.error(await run("(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');return {keys:heavenKeys,key:s.keys.F?.keyCode,focus:document.hasFocus(),time:s.time.now,active:s.possessedNpcId,toast:document.getElementById('population-toast')?.textContent}})()"), errors.map(e=>e.exception?.description));
    throw error;
  });
  await click('#possession-heaven-status + button');
  data=await save();
  assert.ok(data.npcs.find(n=>n.id===npc.id).skills.includes('qingyun_wave'));
  assert.equal(data.heaven.shopLedger.find(r=>r.itemId==='book_qingyun_wave').owner,'consumed');
  await shot('04-learned-skill');
  await delay(300);
  // Set initial positions only. All casts, hits, catches and inventory changes use normal input.
  const fixture=sceneFixture(npcId);
  const combat = await run(`(()=>{${fixture}
    const fauna=scene.populationWorld.environment.fauna;
    for(const f of fauna.filter(f=>f.alive)) for(const [dx,dy] of [[160,0],[-160,0],[0,160],[0,-160]]) {
      const x=f.x-dx,y=f.y-dy;
      const clearMiss=[...fauna,...scene.populationWorld.npcs].every(n=>n===actor||!n.alive||
        !scene.heavenActions.inLane({x,y},n,-dx/160,-dy/160,214,36));
      if(!clearMiss||!scene.canOccupy(x,y)||!scene.clearFaunaLine({x,y},f)||scene.populationWorld.npcs.some(n=>n!==actor&&Math.hypot(n.x-f.x,n.y-f.y)<180))continue;
      scene.faunaTick=-4000;
      place(x,y);scene.selectedFaunaId=null;scene.selectedNpcId=actor.id;
      return {id:f.id,hp:f.hp,x:f.x,y:f.y,dx,dy};
    }
  })()`);
  assert.ok(combat);
  await delay(180);
  await aim(await run(`(()=>{${fixture}return screen(actor.x-${combat.dx},actor.y-${combat.dy})})()`));
  await key('J');
  await delay(750);
  assert.equal((await save()).events.filter(e=>e.id.startsWith('heaven-strike:')&&e.actorId===npc.id).length,0);
  await aim(await run(`(()=>{${fixture}return screen(${combat.x},${combat.y})})()`));
  await key('K');
  await until(()=>run(`window.__worldRebuildGame.scene.getScene('world-rebuild-1b').populationWorld.environment.fauna.find(f=>f.id===${JSON.stringify(combat.id)}).hp<${combat.hp}`));
  await shot('05-ranged-impact');
  await measure('forest');
  const crime = await run(`(()=>{${fixture}
    const world=scene.populationWorld;
    const resident=world.npcs.find(n=>n!==actor&&n.alive&&n.populationRole==='commoner');
    for(let y=1770;y<2580;y+=18)for(let x=2750;x<4350;x+=18){
      const target={x:x+108,y};
      if(!scene.canOccupy(x,y)||!scene.canOccupy(target.x,y)||!scene.clearFaunaLine({x,y},target)||
         world.npcs.some(n=>n!==actor&&n!==resident&&Math.abs(n.y-y)<40&&n.x>x-20&&n.x<x+160))continue;
      place(x,y);
      Object.assign(resident,target);
      resident.home={...target}; resident.actionTarget={...target};
      resident.workPosition={...target}; resident.goalAction='work';
      resident.decisionSlot='env-repair:browser-fixture';
      scene.npcRoutes.delete(resident.id);
      scene.npcSprites.get(resident.id).setPosition(target.x,target.y);
      scene.selectedFaunaId=null;
      return {id:resident.id,...target};
    }
  })()`);
  assert.ok(crime);
  await delay(200);
  await aim(await run(`(()=>{${fixture}return screen(${crime.x},${crime.y})})()`));
  await key('J');
  await until(async()=>(await save()).cityLaw?.incidents.some(i=>i.attackerId===npc.id&&i.victimId===crime.id));
  await shot('05a-city-law');
  const bank = await run(`(()=>{${fixture}
    const river=scene.riverFishSystem;
    for(const f of river.getState(scene.cameras.main).records){
      for(let a=0;a<Math.PI*2;a+=Math.PI/12)for(let d=30;d<=210;d+=2){
        const dx=Math.cos(a),dy=Math.sin(a),x=f.x-d*dx,y=f.y-d*dy;
        const point=scene.heavenActions.castPoint({x,y},dx,dy);
        if(point?.component===f.component&&Math.hypot(point.x-f.x,point.y-f.y)<45){place(x,y);return {x:f.x,y:f.y}}
      }
    }
  })()`);
  assert.ok(bank);
  await choose('#equipment-weapon','fishing_rod_basic');
  await delay(200);
  await aim(await run(`(()=>{${fixture}return screen(${bank.x},${bank.y})})()`));
  await key('F');
  await until(()=>run("Boolean(window.__worldRebuildGame.scene.getScene('world-rebuild-1b').heavenActions.fishing)"),2000).catch(async error=>{
    console.error('Fishing did not cast',await run(`(()=>{${fixture}
      return {bank:${JSON.stringify(bank)},position:{x:actor.x,y:actor.y},gear:actor.equippedWeapon,toast:document.getElementById('population-toast')?.textContent};
    })()`));
    throw error;
  });
  await until(()=>run("document.getElementById('possession-heaven-status')?.textContent.includes('Cá cắn!')"));
  await shot('06a-bite');
  await key('F');
  await until(async()=>(await save()).environment.fish.some(f=>f.caughtBy===npc.id));
  await run("document.querySelector('#possession-panel details').open=true");
  await shot('06-catch-inventory');
  await measure('river');
  await send('Page.reload');await delay(800);await ready();
  data=await save();
  const reloaded=data.npcs.find(n=>n.id===npc.id);
  assert.equal(data.npcs.length,108);
  assert.ok(reloaded.skills.includes('qingyun_wave'));
  assert.equal(reloaded.inventory.filter(i=>i.itemId==='book_qingyun_wave').length,0);
  assert.equal(reloaded.inventory.find(i=>i.itemId==='fishing_rod_basic').count,1);
  await choose('#equipment-weapon','iron_sword');
  assert.equal((await save()).npcs.find(n=>n.id===npc.id).equippedWeapon,'iron_sword');
  const caught=data.environment.fish.filter(f=>f.caughtBy===npc.id);
  assert.equal(caught.length,1);
  assert.equal(reloaded.inventory.find(i=>i.itemId==='river_fish_'+caught[0].species).count,1);
  assert.equal(await run("(()=>{const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');return s.riverFishSystem.getState(s.cameras.main).living})()"),4);
  const hunter=data.npcs.find(n=>n.populationRole==='hunter'&&n.alive&&n.realmIndex===0&&n.realmLevel>=2);
  if (hunter) {
    await click('#possess-end');
    await click('#open-heaven-shop');
    await click('[data-heaven-tab=skills]');
    await click('[data-heaven-list] article:nth-child(3) button');
    await click('[data-heaven-tab=gift]');
    await choose('[data-heaven-list] select',hunter.id);
    await click('[data-heaven-list] article button');
    await click('[data-close-heaven]');
    await run(`window.__worldRebuildGame.scene.getScene('world-rebuild-1b').selectNPC(${JSON.stringify(hunter.id)})`);
    await click('#possess-start');
    await click('#possession-heaven-status + button');
    assert.ok((await save()).npcs.find(n=>n.id===hunter.id).skills.includes('spirit_thrust'));
    await click('#possess-end');
    const hunterFixture=fixture.replace(npcId,JSON.stringify(hunter.id));
    const prey=await run(`(()=>{${hunterFixture}
      const world=scene.populationWorld;
      for(const f of world.environment.fauna.filter(f=>f.alive))for(const [dx,dy] of [[180,0],[-180,0],[0,180],[0,-180]]){
        const x=f.x-dx,y=f.y-dy;
        if(!scene.canOccupy(x,y)||!scene.clearFaunaLine({x,y},f)||world.npcs.some(n=>n!==actor&&Math.hypot(n.x-f.x,n.y-f.y)<220))continue;
        place(x,y);actor.faunaHuntTargetId=f.id;actor.actionTarget={x,y};actor.faunaHuntsToday=0;
        scene.npcRoutes.delete(actor.id);
        return f.id;
      }
    })()`);
    assert.ok(prey);
    await until(async()=>(await save()).events.some(e=>e.id.startsWith('heaven-strike:')&&e.actorId===hunter.id&&e.targetId===prey));
    await shot('07-autonomous-hunter');
  }
  }
  if (process.env.HEAVEN_SABER_ORIGIN) {
    // A second clean origin gives this scenario its own starting balance.
    if (process.env.HEAVEN_SABER_ORIGIN!==origin) {
      await send('Page.navigate',{url:process.env.HEAVEN_SABER_ORIGIN+'/?testMode=1'});
      await delay(800);
      await ready();
    }
    await send('Page.bringToFront');
    const second=await save();
    const guard=second.npcs.find(n=>n.equippedWeapon==='iron_dao'&&(n.realmIndex>0||n.realmLevel>=2));
    assert.ok(guard);
    await click('#open-heaven-shop');
    await click('[data-heaven-tab=skills]');
    await click('[data-heaven-list] article:nth-child(2) button');
    await click('[data-heaven-list] article:nth-child(4) button');
    await click('[data-heaven-tab=gift]');
    await choose('[data-heaven-list] select',guard.id);
    await click('[data-heaven-list] article button');
    await click('[data-heaven-list] article button');
    await click('[data-close-heaven]');
    const guardFixture=sceneFixture(JSON.stringify(guard.id));
    await run(`(()=>{${guardFixture}scene.selectNPC(actor.id)})()`);
    await click('#possess-start');
    await click('#possession-heaven-status + button');
    await click('#possession-heaven-status + button');
    await choose('#possession-panel select[aria-label="Võ kỹ phím K"]','crescent_wave');
    const target=await run(`(()=>{${guardFixture}
      const world=scene.populationWorld;
      for(const f of world.environment.fauna.filter(f=>f.alive))for(const [dx,dy] of [[145,0],[-145,0],[0,145],[0,-145]]){
        const x=f.x-dx,y=f.y-dy;
        if(!scene.canOccupy(x,y)||!scene.clearFaunaLine({x,y},f)||world.npcs.some(n=>n!==actor&&Math.hypot(n.x-f.x,n.y-f.y)<175))continue;
        scene.faunaTick=-3500;place(x,y);scene.selectedFaunaId=null;
        return {id:f.id,x:f.x,y:f.y};
      }
    })()`);
    assert.ok(target);
    await delay(200);
    await aim(await run(`(()=>{${guardFixture}return screen(${target.x},${target.y})})()`));
    await key('K');
    await until(async()=>(await save()).events.some(e=>e.id.startsWith('heaven-strike:')&&e.actorId===guard.id&&e.targetId===target.id),3500).catch(async error=>{
      console.error(await run(`(()=>{${guardFixture}
        const p=scene.input.activePointer,c=scene.cameras.main;
        return {skill:actor.activeHeavenSkill,skills:actor.skills,equipment:actor.equippedWeapon,
          mp:actor.mp,actor:{x:actor.x,y:actor.y},target:scene.populationWorld.environment.fauna.find(f=>f.id===${JSON.stringify(target.id)}),
          pointer:c.getWorldPoint(p.x,p.y),toast:document.getElementById('population-toast')?.textContent,
          strikes:scene.populationWorld.events.filter(e=>e.id.startsWith('heaven-strike:'))}
      })()`));
      throw error;
    });
    await shot('08-saber-impact');
    await choose('#possession-panel select[aria-label="Võ kỹ phím K"]','spirit_guard');
    await delay(1900);
    await key('K');
    await until(async()=>(await save()).npcs.find(n=>n.id===guard.id).heavenGuardUntil>Date.now());
    await shot('09-spirit-guard');
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(missing,[]);
  if (Object.keys(metrics).length && !process.env.HEAVEN_BENCHMARK_ONLY) await writeFile(join(output,'metrics.json'),JSON.stringify(metrics,null,2));
  if (frames.length) {
    await send('Page.stopScreencast');
    const frameDir=join(profile,'frames');
    await mkdir(frameDir,{recursive:true});
    const timeline=['ffconcat version 1.0'];
    for (let i=0;i<frames.length;i++) {
      const name=String(i).padStart(5,'0')+'.jpg';
      await writeFile(join(frameDir,name),Buffer.from(frames[i].data,'base64'));
      timeline.push("file '"+name+"'",'duration '+Math.max(.05,Math.min(1,(frames[i+1]?.time ?? frames[i].time+.1)-frames[i].time)));
    }
    await writeFile(join(frameDir,'capture.ffconcat'),timeline.join('\n'));
    const ffmpeg=execFileSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
    execFileSync(ffmpeg,['-loglevel','error','-y','-f','concat','-safe','0','-i','capture.ffconcat',
      '-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6',
      '-b:v','0','-crf','30',join(output, process.env.HEAVEN_ONLY_SABER ? 'worldscene-saber.webm' : 'worldscene-gameplay.webm')],{cwd:frameDir,stdio:'inherit'});
  }
  if (process.env.HEAVEN_BENCHMARK_ONLY) console.log(metrics);
  else if (process.env.HEAVEN_ONLY_SABER) console.log('Chrome PASS: Bán Nguyệt Đao Khí registered damage and Hộ Thể Linh Cương persisted.');
  else console.log('Chrome PASS: purchased, reloaded, gifted, learned, free-aim hit, fished, reloaded. Roster 108 and living fish 4.');
} finally {
  socket?.close();
  chrome.kill();
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150}).catch(()=>{});
}
