import assert from 'node:assert/strict';import fs from 'node:fs';
const result=JSON.parse(fs.readFileSync('art/previews/gfx5b4c-a4-verify/controlled-trace.json','utf8'));
const names=['right','down_right','down','down_left','left','up_left','up','up_right'];
const expected={N:'up',NE:'up_right',E:'right',SE:'down_right',S:'down',SW:'down_left',W:'left',NW:'up_left'};
assert.equal(result.storageUnchanged,true);assert.equal(result.returned,true);assert.equal(result.legs.length,10);assert.equal(new Set(result.legs.map(x=>x.name)).size,8);assert.deepEqual(result.errors,[]);
for(const leg of result.legs){
 assert.ok(leg.accepted&&leg.reached,`route failed: ${leg.name}`);
 const moved=leg.trace.filter(s=>Math.hypot(s.dx,s.dy)>=0.01);
 assert.ok(moved.length>=6,`${leg.name}: not enough moving samples`);
 for(const s of moved){if(!s.animation?.startsWith('prototype8-C03_walk_'))continue;const d=names[(Math.round(Math.atan2(s.dy,s.dx)/(Math.PI/4))+8)%8];assert.equal(s.animation,`prototype8-C03_walk_${d}`,`${leg.name}: direction mismatch`)}
 const actual=moved.filter(s=>s.animation===`prototype8-C03_walk_${expected[leg.name]}`);assert.equal(new Set(actual.map(s=>s.frame)).size,6,`${leg.name}: not all six walk frames observed`);
 assert.ok(!leg.trace.some(s=>Object.values(s.blocked).some(Boolean)),`${leg.name}: Arcade collision blocked movement`);
}
const hold=result.hold;assert.ok(hold.length>=6);assert.ok(hold.filter(s=>s.animation?.includes('_idle_')).length>=3);assert.ok(Math.hypot(hold.at(-1).x-hold[0].x,hold.at(-1).y-hold[0].y)<0.1);
console.log('PASS: WorldScene real NPC, eight actual displacement directions, six walk frames each, idle hold, resumed control and unchanged test LocalStorage.');
