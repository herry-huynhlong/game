import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9278);
const output=resolve('art/previews/resident-profile');
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
  await visit('/?testMode=1','Boolean(window.__worldRebuild?.ready())');
  const choose=await evalScene(`
    const npc=s.populationWorld.npcs.find(n=>n.populationRole==='low_disciple');
    Object.assign(npc,{realmIndex:0,realmLevel:8,hp:134,xp:180});
    s.selectNPC(npc.id);return {id:npc.id,name:npc.name};
  `);
  const update=properties=>evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    Object.assign(n,${JSON.stringify(properties)});
    s.refreshPossessionHud();
  `);
  const field=name=>run('document.querySelector('+JSON.stringify('[data-profile="'+name+'"]')+')?.textContent');
  const refresh=()=>run("document.querySelector('.resident-portrait img').src");
  await sleep(260);
  assert.equal(await field('realm'),'Luyện Khí tầng 8');
  assert.match(await field('hp'),/^134 \/ \d+/);
  assert.match(await field('xp'),/^180 \/ \d+ · \d+%$/);
  const original=await refresh();
  assert.ok(original.startsWith('data:image/png;base64,')&&original.length>1100);
  await shot('after');
  await shot('after-card',true);
  await run("window.__stableProfile=document.querySelector('.resident-identity')");
  await update({hp:92,mp:47});
  assert.match(await field('hp'),/^92 \/ \d+/);
  assert.match(await field('mp'),/^47 \/ \d+/);
  assert.equal(await run("window.__stableProfile===document.querySelector('.resident-identity')"),true);
  await update({realmIndex:0,realmLevel:9,xp:10000});
  assert.equal(await field('realm'),'Luyện Khí tầng 9');
  assert.equal(await field('flight'),'Chưa thể ngự kiếm');
  assert.match(await field('cultivation'),/viên mãn/);
  await shot('luyen-khi-9');
  await update({realmIndex:1,realmLevel:1,xp:20,hp:180,mp:1});
  assert.equal(await field('realm'),'Trúc Cơ tầng 1');
  assert.equal(await field('flight'),'Đủ cảnh giới ngự kiếm');
  assert.match(await field('flightDetail'),/Linh lực chưa đủ/);
  await update({realmLevel:8,mp:125,hp:185,inventory:[],equippedWeapon:null,skills:[]});
  assert.equal(await field('realm'),'Trúc Cơ tầng 8');
  assert.match(await field('flightDetail'),/Cần kiếm/);
  await update({realmLevel:0});
  assert.equal(await field('realm'),'Chưa có tu vi');
  assert.equal(await run("document.querySelector('[data-progress=xp]').hidden"),true);
  await update({realmLevel:1,hp:180,mp:98,xp:25,skills:['qi-sword']});
  assert.equal(await evalScene('return s.persistPopulation()'),true);
  const tab=await send('Target.createTarget',{url:origin+'/npc-xianxia-editor.html?npc='+encodeURIComponent(choose.id)});
  let editor;
  try{
    let target;
    for(let i=0;i<50&&!target;i++){
      target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(page=>page.id===tab.targetId);
      if(!target)await sleep(100);
    }
    assert.ok(target);
    editor=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok,fail)=>{editor.onopen=ok;editor.onerror=fail});
    let serial=0;
    const evalEditor=expression=>new Promise((ok,fail)=>{
      const request=++serial;
      editor.onmessage=e=>{
        const m=JSON.parse(e.data);if(m.id!==request)return;
        if(m.result.exceptionDetails)fail(Error(m.result.exceptionDetails.exception?.description??m.result.exceptionDetails.text));else ok(m.result.result.value);
      };
      editor.send(JSON.stringify({id:request,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
    });
    let ready=false;
    for(let i=0;i<120&&!ready;i++){
      ready=await evalEditor("Boolean(window.__characterEditor&&document.querySelector('#roster-cultivation')?.textContent.includes('Trúc Cơ tầng 1'))");
      if(!ready)await sleep(100);
    }
    assert.ok(ready,'Character Editor shows canonical realm');
    const change=part=>evalEditor(`(()=>{
      const input=document.getElementById(${JSON.stringify(part)}),previous=input.value;
      const choice=[...input.options].find(o=>!o.disabled&&o.value!==previous);
      input.value=choice.value;input.dispatchEvent(new Event('change'));
      document.querySelector('#roster-manual').click();document.querySelector('#roster-confirm').click();
      return {previous,next:input.value,status:document.querySelector('#roster-status').textContent};
    })()`);
    let earlier=original;
    for(const part of ['hair','outfit','outfitColor']){
      const changeResult=await change(part);
      assert.match(changeResult.status,/Đã lưu 1/);
      assert.notEqual(changeResult.previous,changeResult.next);
      let current=earlier;
      for(let i=0;i<40&&current===earlier;i++){await sleep(100);current=await refresh();}
      assert.notEqual(current,earlier,part+' appears in the open profile after editor saved');
      assert.equal(await evalScene(`return s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)}).modularAppearance.look[${JSON.stringify(part)}]`),changeResult.next);
      earlier=current;
    }
  }finally{editor?.close();await send('Target.closeTarget',{targetId:tab.targetId});}
  await send('Page.bringToFront');
  await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    s.cameraTween?.stop();s.cameraTween=null;s.cameras.main.centerOn(n.x,n.y);
    s.cameras.main.preRender();
    s.updatePopulation(s.time.now,16);
    s.npcAppearanceFleet.update(s.time.now,80);
  `);
  const match=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    const portrait=s.residentProfile.portraits.renderer,live=s.npcAppearanceFleet.entries.get(n.id)?.renderer;
    const keys=['bodyType','face','eyes','eyebrows','hair','hairColor','outfit','outfitColor','accessory','headwear'];
    return {visible:s.npcSprites.get(n.id).visible,missing:keys.filter(key=>
      portrait.appearance[key]!==n.modularAppearance.look[key]||live?.appearance[key]!==n.modularAppearance.look[key])};
  `);
  assert.ok(match.visible&&match.missing.length===0,JSON.stringify(match));
  await shot('editor-sync');
  const edited=await refresh();
  await evalScene("return s.persistPopulation()");
  await send('Page.reload',{ignoreCache:true});await ready();
  await evalScene(`s.selectNPC(${JSON.stringify(choose.id)});`);
  assert.equal(await field('realm'),'Trúc Cơ tầng 1');
  assert.equal(await refresh(),edited);
  const avatarSeries=[];
  for(const [label,role] of [['merchant','merchant'],['elder','elder'],['hunter','hunter']]){
    const img=await evalScene(`
      const n=s.populationWorld.npcs.find(n=>n.populationRole===${JSON.stringify(role)});s.selectNPC(n.id);
      return s.residentProfile.image.src;
    `);
    assert.ok(img.startsWith('data:image/png'));
    avatarSeries.push(img);
    await sleep(160);await shot(label,true);
  }
  assert.equal(new Set(avatarSeries).size,3);
  const cache=await evalScene(`
    const all=s.populationWorld.npcs,cache=s.residentProfile.portraits;
    const textures=s.textures.getTextureKeys().length;
    const targetCountBefore=s.children.list.length;
    for(const n of all){s.selectedNpcId=n.id;s.refreshPossessionHud();}
    return {capacity:cache.cache.size,roster:all.length,texturesBefore:textures,texturesAfter:s.textures.getTextureKeys().length,
      childrenBefore:targetCountBefore,childrenAfter:s.children.list.length};
  `);
  assert.equal(cache.capacity,24);
  assert.equal(cache.roster,108);
  assert.equal(cache.texturesAfter,cache.texturesBefore);
  assert.equal(cache.childrenAfter,cache.childrenBefore);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:740,deviceScaleFactor:1,mobile:true});
  await evalScene(`s.selectNPC(${JSON.stringify(choose.id)});`);
  await sleep(170);
  const mobile=await run(`(()=>{
    const panel=document.querySelector('#possession-panel'),r=panel.getBoundingClientRect();
    const first=document.querySelector('#npc-gift').getBoundingClientRect();
    return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,minTap:first.height,
      noHorizontalScroll:panel.scrollWidth<=panel.clientWidth};
  })()`);
  assert.ok(mobile.fits&&mobile.minTap>=40&&mobile.noHorizontalScroll,JSON.stringify(mobile));
  await shot('mobile');
  await send('Emulation.clearDeviceMetricsOverride');
  const advanced=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)}),w=s.populationWorld;
    n.xp=10000;n.actionCooldown=0;n.inventory.push({itemId:'qi_pill',count:1});
    s.populationSimulation.breakthroughIfReady(n,w.clock.day,w.clock.minute);
    s.refreshPossessionHud();
    return {level:n.realmLevel,event:w.events.findLast(e=>e.type==='npc-breakthrough')?.description,progress:n.xp};
  `);
  assert.equal(advanced.level,2);
  assert.match(advanced.event,/Trúc Cơ tầng 2/);
  assert.equal(advanced.progress,0);
  assert.equal(await field('realm'),'Trúc Cơ tầng 2');
  await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(choose.id)});
    Object.assign(n,{realmIndex:0,realmLevel:9,flightCooldown:0,mp:120,hp:145});
    s.populationWorld.heaven.divinePower=10000;s.syncGroundOccupancy();
    const p=s.flyingSword.chooseLanding(n,n,true);
    if(!p)throw Error('No free launch point');
    Object.assign(n,p);s.syncSwordActor(n);s.syncGroundOccupancy();s.selectNPC(n.id);s.beginPossession();
  `);
  const pressV=async()=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'v',code:'KeyV',windowsVirtualKeyCode:86});
    await sleep(120);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'v',code:'KeyV',windowsVirtualKeyCode:86});
  };
  await pressV();
  assert.equal(await evalScene("return s.flyingSword.active.has(s.possessedNpcId)"),false);
  await update({realmIndex:1,realmLevel:1,mp:120,hp:180});
  await pressV();
  assert.equal(await evalScene("return s.flyingSword.active.has(s.possessedNpcId)"),true);
  assert.match(await field('flightDetail'),/Đang (cất cánh|ngự kiếm)/);
  await shot('possessed');
  await pressV();
  await sleep(870);
  assert.equal(await evalScene("return s.flyingSword.active.has(s.possessedNpcId)"),false);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(join(output,'verification.json'),JSON.stringify({npc:choose,cache,mobile,editorSync:true,advanced,realmBounds:true,saveReload:true,keyboard:true},null,2));
  console.log(JSON.stringify({npc:choose,cache,mobile,editorSync:true,advanced,realmBounds:true,saveReload:true,keyboard:true}));
}finally{ws?.close();chrome.kill();}
