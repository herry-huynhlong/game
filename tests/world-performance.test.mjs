import assert from 'node:assert/strict';
import { NpcSimulationScheduler } from '../src/world/NpcSimulationScheduler.js';

const npcs=[{id:'near',x:50,y:50},{id:'middle',x:350,y:50},{id:'far',x:1000,y:50},{id:'controlled',x:1800,y:50}]
  .map(n=>({...n,alive:true,goalAction:'work',actionTarget:{x:n.x,y:n.y}}));
const scheduler=new NpcSimulationScheduler(npcs), view={x:0,y:0,right:100,bottom:100};
const urgent=new Set();
const counts={near:0,middle:0,far:0,controlled:0};
const decisions={near:0,middle:0,far:0,controlled:0};
const moveTime={near:0,middle:0,far:0,controlled:0};
for(let i=1;i<=500;i++){
  if(i%50===0)scheduler.accrueMinute('controlled');
  const {moving,thinking}=scheduler.advance(20,view,'controlled',urgent);
  for(const entry of moving){
    counts[entry.npc.id]++;
    moveTime[entry.npc.id]+=scheduler.elapsedForMove(entry);
  }
  for(const entry of thinking){
    assert.ok(entry.workMinutes>0);
    decisions[entry.npc.id]++;
    scheduler.finishDecision(entry);
  }
}
assert.deepEqual(scheduler.counts,[2,1,1]);
assert.ok(counts.near>counts.middle&&counts.middle>counts.far&&counts.far>0);
assert.ok(decisions.near>decisions.middle&&decisions.middle>decisions.far&&decisions.far>0);
assert.equal(counts.controlled,0);
assert.equal(decisions.controlled,0);
assert.ok(moveTime.far>9500&&moveTime.far<=10000);
assert.equal(scheduler.byId.get('far').visible,false);
urgent.add('far');
scheduler.advance(16,view,'controlled',urgent);
assert.equal(scheduler.byId.get('far').level,0);
assert.equal(scheduler.byId.get('far').visible,false);
console.log('PASS: staggered NPC simulation, bounded movement time, off-camera urgent actions and possession priority.');
