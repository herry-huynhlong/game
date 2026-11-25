import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9399);
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
  const setup=await ask(`
    w.clock.paused=true;
    const v=s.sectCampus.spiritVeins,ex=s.expeditions;
    const actor=w.npcs.find(n=>n.populationRole==='elder');
    const open=[...v.sites.values()].filter(site=>[1,2,3,4].includes(site.grade)).filter((site,i,a)=>a.findIndex(x=>x.grade===site.grade)===i);
    v.update();
    const checks=open.map(site=>{
      const n={...actor,realmIndex:3,inventory:[],x:site.point.x,y:site.point.y};
      const before=site.state.amount,guard=v.guard(site),known=site.state.discovered;
      site.state.discovered=true;
      const deniedOwner=site.state.owner?v.extract({...n,faction:'Ngoại nhân'},site,1):null;
      if(site.state.owner&&deniedOwner)throw new Error('False authorization');
      const guarded=guard?v.extract(n,site,1):null;
      if(guard)guard.alive=false;
      const amount=v.extract(n,site,2);
      if(guard)guard.alive=true;
      return {grade:site.grade,amount,used:before-site.state.amount,item:n.inventory[0]?.itemId,guarded,known};
    });
    w.clock.minute=570;
    const q=ex.options().find(q=>q.kind==='hunt'&&q.job!==null);
    if(!q)return {checks,unavailable:true};
    const team=w.npcs.filter(n=>n.populationRole==='hunter').slice(0,3);
    const place=(n,p)=>{Object.assign(n,{x:p.x,y:p.y});s.npcSprites.get(n.id).setPosition(p.x,p.y);};
    const coast=ex.slots(team,q.meet);
    for(const n of team){Object.assign(n,{hunger:0,fatigue:0,alive:true,faunaHuntTargetId:null,marketVisit:null,decisionSlot:null,
      goalAction:'idle',safety:90,spiritStones:10});n.hp=100;n.mp=100;place(n,coast[n.id]);}
    s.syncGroundOccupancy();
    const p={id:'expedition-ledger',name:'Liệp Yêu Đội · Kiểm thử',job:q,leader:team[0].id,
      members:team.map(n=>n.id),created:ex.now,phase:'field',started:ex.now,hits:0,escrow:q.reward};
    if(!ex.fund(q,-q.reward))throw new Error('Escrow unavailable');
    ex.state.parties.push(p);for(const n of team)ex.current.set(n.id,p);
    const prey=env.fauna.find(f=>f.alive&&f.zoneId===q.region&&f.species===q.species);
    if(!prey)return {checks,missingPrey:q};
    prey.hp=1; p.preyId=prey.id;
    const physical=ex.slots(team,prey,31);
    if(!physical)return {checks,noPreySlots:true};
    let i=0; for(const n of team){place(n,physical[n.id]);if(i++===0){n.actionTarget=physical[n.id];n.decisionSlot='expedition';}}
    s.syncGroundOccupancy();
    ex.fight(p,team,prey);ex.field(p,team);ex.collect(p,team);
    const item=p.item;
    if(!item)return {checks,phase:p.phase,hits:p.hits,prey:prey.hp,drops:env.drops.filter(x=>x.sourceId===prey.id)};
    const stock=ex.treasury(q).stock, before=stock.find(row=>row.itemId===item)?.count??0;
    const paidBefore=team.reduce((sum,n)=>sum+n.spiritStones,0),desk=ex.slots(team,q.desk);
    for(const n of team)place(n,desk[n.id]);
    s.syncGroundOccupancy();
    ex.deliver(p,team);ex.deliver(p,team);
    const delivered={phase:p.phase,paid:p.paid,stock:(stock.find(row=>row.itemId===item)?.count??0)-before,
      wallets:team.reduce((sum,n)=>sum+n.spiritStones,0)-paidBefore,
      dropState:env.drops.find(d=>d.sourceId===prey.id&&d.itemId===item)?.status,counters:ex.state.counters};
    s.persistPopulation();
    return {checks,delivered,id:p.id};
  `);
  console.log(JSON.stringify(setup));
  assert.deepEqual(setup.checks.map(x=>[x.grade,x.amount,x.used,x.item]),[
    [1,2,2,'spirit_stone_low'],[2,2,2,'spirit_stone_middle'],[3,2,2,'spirit_stone_high'],[4,2,2,'spirit_stone_supreme']
  ]);
  assert.deepEqual(setup.checks.slice(2).map(x=>x.guarded),[0,0]);
  assert.equal(setup.delivered?.phase,'completed');
  assert.equal(setup.delivered.stock,1);
  assert.equal(setup.delivered.wallets,setup.delivered.paid);
  assert.equal(setup.delivered.dropState,'claimed');
  await visit('/?testMode=1',ready);
  const persisted=await ask(`return w.expeditions.parties.find(p=>p.id===${JSON.stringify(setup.id)}).phase;`);
  assert.equal(persisted,'completed');
  const mining=await ask(`
    const v=s.sectCampus.spiritVeins,ex=s.expeditions,site=v.sites.get('outer-mist');
    const crew=w.npcs.filter(n=>n.populationRole==='hunter').slice(0,3);
    const party={id:'mining-ledger',name:'Khai Khoáng Đội · Kiểm thử',job:{kind:'mine',siteId:site.id,label:'Khai thác '+site.name,
      region:site.region,meet:site.point,desk:site.point,field:site.point},leader:crew[0].id,members:crew.map(n=>n.id),
      phase:'field',created:ex.now,started:ex.now,hits:0,escrow:5};
    const positions=ex.slots(crew,site.point,51);
    for(const n of crew){
      Object.assign(n,positions[n.id],{realmIndex:1,goalAction:'idle',flight:undefined});
      s.npcSprites.get(n.id).setPosition(n.x,n.y);ex.current.set(n.id,party);
    }
    ex.state.parties.push(party);s.syncGroundOccupancy();ex.field(party,crew);
    s.cameraTween?.stop();s.cameraTween=null;
    s.setZoom(1.25);s.cameras.main.centerOn(site.point.x,site.point.y);s.clampCamera();
    s.inspector.select({kind:'spiritVein',id:site.id});
    return {id:site.id,until:party.workAt,stock:site.state.amount};
  `);
  assert.ok(mining.until);
  await sleep(450);await shot('mining-controlled');
  await writeFile(join(output,'controlled-ledger.json'),JSON.stringify({...setup,persisted},null,2));
}finally{ws?.close();chrome.kill()}
