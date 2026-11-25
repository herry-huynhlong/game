import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9380);
const output=resolve('art/previews/world-inspector');
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

  const ready="Boolean(window.__worldRebuild?.ready())";


  await visit('/?testMode=1',ready);



  const ask=code=>evalScene('const ins=s.inspector,w=s.populationWorld,env=w.environment;'+code);
  const current=()=>ask(`
    const p=ins.panel, icon=p.querySelector('canvas'), painted=icon.getContext('2d').getImageData(0,0,64,64).data.some((v,i)=>i%4===3&&v>0);
    return {hidden:p.hidden,id:p.dataset.id,kind:p.dataset.kind,title:p.querySelector('h2').textContent,state:p.querySelector('[data-state]').textContent,
      fields:p.querySelector('[data-fields]').textContent,health:p.querySelector('progress[data-tone="health"]')?.value,
      qi:p.querySelector('progress[data-tone="qi"]')?.value,growth:p.querySelector('progress[data-tone="growth"]')?.value,
      skills:p.querySelector('[data-skills]').textContent,mark:ins.marker.visible,painted};
  `);
  const mouse=(type,x,y,extras={})=>send('Input.dispatchMouseEvent',{type,x,y,...extras});
  const click=async(x,y)=>{
    assert.ok(Number.isFinite(x)&&Number.isFinite(y),JSON.stringify({x,y}));
    await mouse('mouseMoved',x,y);
    await mouse('mousePressed',x,y,{button:'left',buttons:1,clickCount:1});
    await mouse('mouseReleased',x,y,{button:'left',buttons:0,clickCount:1});
    await sleep(170);
  };
  const key=async(key,code,windowsVirtualKeyCode)=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode});
    await sleep(65);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode});
  };
  const selection=await ask(`
    w.clock.paused=true;s.cameraTween?.stop();
    const trees=[...ins.static.values()].filter(o=>o.kind==='tree');
    const thunder=s.westTreasures.system.nodes.find(n=>n.itemId==='thunder_fruit'&&s.westTreasures.system.guardian(n));
    return {tree:trees.find(e=>e.data.gid===408).id,ancient:trees.find(e=>e.data.gid===1771&&e.data.y>800&&e.data.y<4600).id,ore:[...ins.static.values()].find(e=>e.kind==='ore').id,
      thunder:thunder.id,guard:s.westTreasures.system.guardian(thunder).id,
      natural:s.westTreasures.system.nodes.find(n=>!n.guardSpecies).id,herb:env.resourceNodes[0].id,
      flower:env.fauna.find(f=>f.species==='flower').id,boss:env.fauna.find(f=>f.species==='wood-king').id};
  `);
  const pointFor=async(kind,id,zoom)=>{
    await ask(`const entry=ins.lookup(${JSON.stringify({kind,id})}), a=ins.anchor(entry);
      if(!entry.sprite||!a)throw Error('Fixture has no sprite');
      s.cameraTween?.stop();if(s.possessedNpcId)s.cameraFollowSuspended=true;
      const target=entry.kind==='treasure'?a:entry.sprite;
      s.cameras.main.setZoom(${zoom}).centerOn(target.x,target.y);s.clampCamera();return true;`);
    await sleep(200);
    return ask(`
      const entry=ins.lookup(${JSON.stringify({kind,id})}),camera=s.cameras.main,o=entry.sprite,b=o.getBounds(),cv=s.game.canvas,rect=cv.getBoundingClientRect();
      const origin=camera.getWorldPoint(0,0);
      let hit;
      for(const fy of [.47,.32,.64,.24,.78,.88])for(const fx of [.50,.41,.59,.3,.7,.22,.78]){
        const p={x:b.left+b.width*fx,y:b.top+b.height*fy};
        const entries=ins.hits(p);
        const x=rect.left+(p.x-origin.x)*camera.zoom*rect.width/s.scale.width,y=rect.top+(p.y-origin.y)*camera.zoom*rect.height/s.scale.height;
        if(entries[0]?.id===entry.id&&document.elementFromPoint(x,y)===cv&&!hit)hit={x,y,stack:entries.map(a=>a.kind)};
      }
      if(!hit)return {visible:o.visible,bounds:[b.x,b.y,b.width,b.height],view:[camera.worldView.x,camera.worldView.y],z:camera.zoom};
      return hit;
    `);
  };
  const pick=async(kind,id,zoom)=>{
    const p=await pointFor(kind,id,zoom);
    assert.ok(p.x>0&&p.y>0,JSON.stringify({kind,id,p}));
    await click(p.x,p.y);
    const card=await current();
    assert.deepEqual([card.hidden,card.kind,card.id,card.mark,card.painted],[false,kind,id,true,true],JSON.stringify({card,p}));
    return card;
  };
  const tree=await pick('tree',selection.tree,.66);
  const ancient=await pick('tree',selection.ancient,1.45);
  assert.ok(/Cổ thụ/.test(ancient.fields)&&!/năm tuổi|có linh tính/.test(tree.fields));
  await shot('ancient-tree');
  const ore=await pick('ore',selection.ore,1.1);
  assert.ok(ore.fields.includes('Trữ lượng'));
  const herb=await pick('herb',selection.herb,.75);
  assert.ok(herb.fields.includes('Trữ lượng'));
  const thunder=await pick('treasure',selection.thunder,1.15);
  assert.match(thunder.title,/Lôi Linh Quả/);
  assert.ok(thunder.fields.includes('Bảo hộ'));
  await shot('guarded-treasure');
  const switchLink=async id=>{
    const found=await ask(`const button=ins.panel.querySelector('[data-inspect="'+${JSON.stringify(id)}+'"]');if(button){button.click();return true}return false;`);
    assert.ok(found);
    await sleep(150);
    return current();
  };
  const guard=await switchLink(selection.guard);
  assert.equal(guard.kind,'fauna');assert.equal(guard.id,selection.guard);assert.ok(guard.skills.length>10);
  assert.equal((await switchLink(selection.thunder)).id,selection.thunder);
  await ask("ins.panel.querySelector('[data-locate]').click();return true;");
  await sleep(475);
  const near=await ask('const a=ins.anchor(ins.lookup(ins.selected)),v=s.cameras.main.worldView;return Math.abs(v.centerX-a.x)<100&&Math.abs(v.centerY-a.y)<100;');
  assert.equal(near,true);
  const natural=await pick('treasure',selection.natural,.46);
  assert.match(natural.fields,/Mọc tự nhiên/);
  const originalPlant=await ask(`
    const p=ins.lookup(ins.selected).data,tree=ins.lookup({kind:'tree',id:${JSON.stringify(selection.ancient)}}).sprite;
    const old={x:p.x,y:p.y};
    Object.assign(p,{x:tree.x,y:tree.y+14});
    s.westTreasures.visuals(true);
    return old;
  `);
  const overlapPoint=await pointFor('treasure',selection.natural,1.1);
  assert.ok(overlapPoint.stack?.includes('tree'),JSON.stringify(overlapPoint));
  await click(overlapPoint.x,overlapPoint.y);
  assert.equal((await current()).id,selection.natural);
  assert.equal((await switchLink(selection.ancient)).kind,'tree');
  await ask(`
    const p=ins.lookup({kind:'treasure',id:${JSON.stringify(selection.natural)}}).data;
    Object.assign(p,${JSON.stringify(originalPlant)});s.westTreasures.visuals(true);return true;
  `);
  await pick('treasure',selection.natural,1.1);
  const naturalPoint=await pointFor('treasure',selection.natural,1.1);
  await sleep(140);
  await mouse('mouseMoved',naturalPoint.x,naturalPoint.y);
  const tooltip=await run("document.querySelector('#world-inspector-tooltip').textContent");
  assert.ok(tooltip.includes(natural.title));
  await ask('ins.lookup(ins.selected).data.plantedAt=env.faunaClockMs;return true;');
  await sleep(150);
  assert.equal((await current()).growth,0);
  await ask('s.tickFauna(5500);return true;');
  await sleep(150);
  assert.ok((await current()).growth>0);
  const progression=await ask(`
    const node=ins.lookup(ins.selected).data;
    node.plantedAt=env.faunaClockMs-500000;
    const npc=w.npcs.find(n=>n.alive);
    Object.assign(npc,{x:node.x,y:node.y});
    return s.westTreasures.harvest(npc,node);
  `);
  assert.equal(progression,true);
  await sleep(185);
  assert.match((await current()).state,/Đã thu hoạch/);
  const flower=await pick('fauna',selection.flower,1.38);
  assert.match(flower.state,/cắm rễ/);
  let combat=await ask(`
    const f=ins.lookup(ins.selected).data;
    const offsets=Array.from({length:16},(_,i)=>({x:f.x+Math.cos(i*Math.PI/8)*78,y:f.y+Math.sin(i*Math.PI/8)*78}));
    const point=offsets.find(p=>s.canOccupy(p.x,p.y)&&s.monsterLine(f,p)&&s.monsterMovement.terrain(s.groundOccupancy.bodies.get(f.id),p.x,p.y));
    if(!point)return {};
    const npc=w.npcs.find(n=>n.alive&&n.populationRole==='hunter');
    Object.assign(npc,point);s.npcSprites.get(npc.id).setPosition(npc.x,npc.y);s.syncGroundOccupancy();s.tickFauna(650);
    return {npc:npc.id,phase:f.flower.phase};
  `);
  assert.equal(combat.phase,'waking');
  await sleep(200);assert.match((await current()).state,/thức tỉnh/);await shot('flower-waking');
  const changes=await ask(`
    const f=ins.lookup(ins.selected).data,n= w.npcs.find(n=>n.id===${JSON.stringify(combat.npc)});
    s.tickFauna(1900);
    s.applyFaunaDamage(f,n,12,'inspect:flower:hit');
    return {hp:f.hp,qi:f.qi,phase:f.flower.phase};
  `);
  await sleep(180);
  assert.equal(changes.phase,'mobile');assert.equal((await current()).health,changes.hp);assert.ok(changes.hp<flower.health);
  await shot('flower-active');
  const speeds=await ask(`
    const e=document.querySelector('#world-clock-speed'),set=v=>{e.value=v;e.dispatchEvent(new Event('change'));};
    const result=['0','1','2','4'].map(x=>{set(x);const before=env.faunaClockMs;s.updatePopulation(s.time.now,100);return env.faunaClockMs-before;});
    set('0');return result;
  `);
  assert.deepEqual(speeds,[0,100,200,400]);
  await sleep(185);
  const held=await current();
  assert.match(held.skills,/Hồi sau/);
  await sleep(420);
  assert.equal((await current()).skills,held.skills);
  const dropID=await ask(`
    const f=ins.lookup(ins.selected).data,n=w.npcs.find(n=>n.id===${JSON.stringify(combat.npc)});
    return s.applyFaunaDamage(f,n,10000,'inspect:flower:dead').drops[0].id;
  `);
  await sleep(180);assert.match((await current()).state,/tử vong/);
  await pick('drop',dropID,1.27);
  await key('Escape','Escape',27);
  assert.equal((await current()).hidden,true);
  const boss=await pick('fauna',selection.boss,.63);
  assert.ok(boss.fields.includes('Yêu vương')&&boss.skills.includes('Vạn Mộc Triều Tông'));
  const dragOrigin=await pointFor('fauna',selection.boss,.77);
  assert.ok(dragOrigin.x>0,JSON.stringify(dragOrigin));
  const beforeDrag=await ask('return s.cameras.main.scrollX;');
  await mouse('mousePressed',dragOrigin.x,dragOrigin.y,{button:'left',buttons:1,clickCount:1});
  await mouse('mouseMoved',dragOrigin.x-70,dragOrigin.y+40,{buttons:1});
  await mouse('mouseReleased',dragOrigin.x-70,dragOrigin.y+40,{button:'left',buttons:0,clickCount:1});
  await sleep(130);
  assert.equal((await current()).id,boss.id);assert.ok(Math.abs(await ask('return s.cameras.main.scrollX;')-beforeDrag)>12);
  const beforeZoom=await ask('return s.cameras.main.zoom;');
  await mouse('mouseWheel',dragOrigin.x-70,dragOrigin.y+40,{deltaX:0,deltaY:-80});
  await sleep(130);
  assert.ok(await ask('return s.cameras.main.zoom;')>beforeZoom);
  const npcId=await ask("return w.npcs.find(n=>n.alive&&n.populationRole==='city_guard').id;");
  const npcPoint=await pointFor('npc',npcId,1.05);
  assert.ok(npcPoint.x>0&&npcPoint.y>0,JSON.stringify(npcPoint));
  await click(npcPoint.x,npcPoint.y);
  assert.equal(await ask('return s.selectedNpcId;'),npcId);
  assert.equal((await current()).hidden,true);
  const possession=await ask(`
    s.beginPossession();return s.possessedNpcId;
  `);
  assert.ok(possession);
  await sleep(150);assert.equal((await current()).hidden,true);
  const possessedPoint=await pointFor('tree',selection.tree,1);
  await click(possessedPoint.x,possessedPoint.y);
  assert.equal((await current()).hidden,true);
  await key('Escape','Escape',27);assert.equal(await ask('return !!s.possessedNpcId;'),false);
  await pick('tree',selection.tree,1);
  const blank=await ask(`
    const cv=s.game.canvas;
    for(let y=300;y<750;y+=35)for(let x=300;x<900;x+=35){
      const p={clientX:x,clientY:y};
      if(document.elementFromPoint(x,y)===cv&&!ins.hits(ins.point(p)).length)return {x,y};
    }
    return null;
  `);
  assert.ok(blank);
  await click(blank.x,blank.y);
  assert.equal((await current()).hidden,true);

  // Dense-forest comparison with the inspector open versus closed.
  await run("localStorage.removeItem('world-rebuild-1c-v1')");
  await visit('/?testMode=1&region=west-poison',ready);
  const perf=await run(`(async()=>{ ${scene}
    const flower=s.populationWorld.environment.fauna.find(f=>f.species==='flower');
    s.cameraTween?.stop();
    s.populationWorld.clock.paused=false;
    s.cameras.main.setZoom(.5).centerOn(-2250,2710);s.clampCamera();
    const initial=s.populationWorld.environment.fauna.filter(f=>f.alive).length;
    await new Promise(done=>setTimeout(done,1700));
    const measure=()=>new Promise(done=>{const frames=[];let old;const tick=at=>{
      if(old)frames.push(at-old);old=at;
      if(frames.length<150)requestAnimationFrame(tick);
      else {const mean=frames.reduce((a,b)=>a+b)/frames.length;frames.sort((a,b)=>a-b);done({fps:1000/mean,p95:frames[142],max:frames.at(-1)});}
    };requestAnimationFrame(tick);});
    const closed=await measure();
    s.inspector.select({kind:'fauna',id:flower.id});
    await new Promise(done=>setTimeout(done,260));
    const open=await measure();
    s.inspector.close();
    const closedAgain=await measure();
    return {open,closed,closedAgain,initial,width:innerWidth,height:innerHeight,zoom:s.cameras.main.zoom};
  })()`);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const result={selection,tree:tree.title,ancient:ancient.title,ore:ore.title,thunder:thunder.title,natural:natural.title,flower:flower.state,combat:changes,speeds,perf};
  await writeFile(join(output,'validation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{ws?.close();chrome.kill()}
