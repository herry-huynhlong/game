import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const out=resolve('art/previews/cuu-canh-thien-uy');
export async function captureBalance({send,evalScene,visit,ready,errors,failed}){
  const baseline=process.argv.includes('--baseline');
  const phase=(baseline?'before':'after')+(process.argv.includes('--skill')?'-skill':'');
  await mkdir(out,{recursive:true});
  if(process.argv.includes('--natural')){
    await visit('/?testMode=1&populationTest=108',ready);
    await simulateDays(evalScene);
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    return;
  }
  const outcomes=[];
  for(const same of baseline?[false]:[false,true]){
    await visit('/?testMode=1&populationTest=108',ready);
    const fixture=await evalScene(`
      const w=s.populationWorld;
      w.clock.paused=true;w.heaven.divinePower=10000;
      const n=w.npcs.find(n=>n.alive&&!n.minor&&n.profession==='tu_si'&&!n.flight);
      const targets=w.environment.fauna.filter(a=>a.alive&&a.realmIndex===2&&a.realmLevel===1).sort((a,b)=>a.id.localeCompare(b.id));
      const candidates=targets.length?targets:w.environment.fauna.filter(a=>a.alive&&a.realmIndex===2).sort((a,b)=>a.id.localeCompare(b.id));
      Object.assign(n,{realmIndex:${same?2:0},realmLevel:${same?1:9},talent:50,spiritualRoot:'metal',technique:'sword',techniqueMastery:{sword:3},
        mp:100,skills:['qi-sword'],inventory:[{itemId:'iron_sword',count:1}],equippedWeapon:'iron_sword',underground:undefined,wallLevel:0,skyStep:undefined,tribulation:undefined});
      for(const f of candidates){
        const r=window.__worldRebuild.prepareWeaponCombatTest(n.id,f.id);
        if(!r.ok)continue;
        f.hp=f.maxHp;s.balanceFixture={npc:n,target:f};
        return {actors:r,attacker:{id:n.id,realmIndex:n.realmIndex,layer:n.realmLevel,root:n.spiritualRoot,technique:n.technique,
          mastery:n.techniqueMastery.sword,weapon:n.equippedWeapon,talent:n.talent},
          target:{id:f.id,species:f.species,rank:f.rank,realmIndex:f.realmIndex,layer:f.realmLevel,maxHp:f.maxHp,hp:f.hp}};
      }
      return {error:'No Kim Dan beast with a legal attack cell',eligible:candidates.length};`);
    assert.ok(fixture.actors,JSON.stringify(fixture));
    const frames=[];
    for(let hit=1;hit<= (same?12:4);hit++){
      const snapshot=await evalScene(`
        const {npc,target}=s.balanceFixture,w=s.populationWorld;
        if(!target.alive)return null;
        window.__worldRebuild.resetWeaponCooldownForTest();
        const before=target.hp,i=w.events.length,damage=s.performPossessedAttack(target.id,${process.argv.includes('--skill')});
        const event=w.events.filter(e=>e.actorId===npc.id&&e.targetId===target.id).at(-1);
        return {damage,before,after:target.hp,alive:target.alive,event,trace:s.lastDamageTrace??null,eventCount:w.events.length-i};`);
      if(!snapshot)break;
      assert.ok(snapshot.damage.ok,JSON.stringify(snapshot));
      frames.push(snapshot);
      await sleep(140);
      const image=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(join(out,phase+(same?'-same':'-gap')+'-'+String(hit).padStart(2,'0')+'.png'),Buffer.from(image.data,'base64'));
    }
    if(!baseline&&!same)assert.ok(frames.at(-1).alive&&frames.at(-1).after>=fixture.target.maxHp*.9,JSON.stringify(frames));
    outcomes.push({same,fixture,frames});
    if(!baseline&&!same){
      const autonomous=await evalScene(`
        const {npc,target}=s.balanceFixture,w=s.populationWorld;
        s.endPossession();Object.assign(npc,{populationRole:'hunter',convalescence:undefined,marketVisit:undefined,
          fatigue:0,hunger:0,safety:100,faunaAttackReadyAt:0,faunaEvadeUntil:0,goalAction:'idle',shortGoal:''});
        const prey=target,original=prey.hp,wasAlive=prey.alive;
        npc.hp=Math.max(npc.hp,100);
        npc.realmIndex=0;npc.realmLevel=9;const avoided=!s.canRiskHunt(npc,prey);
        npc.realmIndex=2;npc.realmLevel=1;npc.hp=1800;
        const eligible=s.canRiskHunt(npc,prey);
        npc.faunaHuntTargetId=prey.id;
        const during=prey.hp;
        s.tickHunters(s.faunaNow()+10);
        return {avoided,eligible,hit:prey.hp<during,original,wasAlive,goal:npc.shortGoal};
      `);
      assert.ok(autonomous.avoided&&autonomous.eligible&&autonomous.hit&&autonomous.wasAlive,JSON.stringify(autonomous));
      await writeFile(join(out,phase+'-autonomous.json'),JSON.stringify(autonomous,null,2)+'\n');
    }
  }
  if(!baseline){
    await visit('/combat-balance.html',"Boolean(document.querySelector('#balance output dd'))");
    const checked=await evalScene("return true;").catch(()=>false);
    assert.equal(checked,false,'Balance Lab must load separately from WorldScene');
    const lab=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(out,'combat-balance-lab.png'),Buffer.from(lab.data,'base64'));
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  }
  await writeFile(join(out,phase+'.json'),JSON.stringify(outcomes,null,2)+'\n');
  console.log('Combat browser '+phase, JSON.stringify(outcomes.map(x=>({target:x.fixture.target,hp:x.frames.map(f=>f.after)}))));
}


async function simulateDays(ev){
  const snapshot=`
    const w=s.populationWorld,live=w.npcs.filter(n=>n.alive);
    return {day:w.clock.day,minute:w.clock.minute,alive:live.length,
      dead:w.npcs.filter(n=>!n.alive).length,realms:live.reduce((r,n)=>(r[n.realmIndex]=(r[n.realmIndex]??0)+1,r),{}),
      fauna:w.environment.fauna.filter(f=>f.alive).length,spiritStones:live.reduce((sum,n)=>sum+n.spiritStones,0),
      divine:{earned:w.heaven.divineLedger.earned,breakthrough:w.heaven.divineLedger.breakthrough,
        npcDeath:w.heaven.divineLedger.npcDeath,faunaDeath:w.heaven.divineLedger.faunaDeath},
      hitResidents:live.filter(n=>(n.combatHealth?.lastTakenAt??0)>0&&!n.minor).length,
      recovering:live.filter(n=>s.recovery.status(n).rate>0).length,
      damagedBuildings:w.environment.objects.filter(o=>o.hp<o.maxHp).length,
      expedition:s.expeditions.state.counters??{},counts:s.balanceSimulation.counts,inflow:s.balanceSimulation.inflow,
      outflow:s.balanceSimulation.outflow,hourlyHunt:s.balanceSimulation.hunt.size};
  `;
  const snapshots=[await ev("s.populationWorld.clock.paused=true;s.balanceSimulation={seen:new Set(),hunt:new Set(),counts:{},inflow:0,outflow:0};"+snapshot)];
  const days=Math.max(1,Math.min(8,Number(process.env.BALANCE_SIM_DAYS??3)));
  for(let day=0;day<days;day++){
    for(let block=0;block<12;block++){
      await ev(`
        const w=s.populationWorld,data=s.balanceSimulation;
        w.clock.paused=false;w.clock.speed=4;
        for(let step=0;step<120;step++){
          const balances=new Map(w.npcs.map(n=>[n.id,n.spiritStones]));
          s.updatePopulation(s.time.now+step*250,250);
          for(const n of w.npcs){
            const difference=n.spiritStones-(balances.get(n.id)??n.spiritStones);
            if(difference>0)data.inflow+=difference;else data.outflow-=difference;
            if(n.faunaHuntTargetId&&n.goalAction==='fight')data.hunt.add(n.id+'|'+n.faunaHuntTargetId);
          }
          if(step%8!==0&&step!==119)continue;
          for(const e of w.events){
            if(data.seen.has(e.id))continue;
            data.seen.add(e.id);data.counts[e.type]=(data.counts[e.type]??0)+1;
          }
        }
        w.clock.paused=true;return true;
      `);
    }
    const value=await ev(snapshot);snapshots.push(value);
    await writeFile(join(out,'natural.json'),JSON.stringify(snapshots,null,2)+'\n');
    console.log('Ngày '+value.day+' · dân số '+value.alive+' · Thần lực mới '+value.divine.earned);
  }
}
