import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/world/MonsterMovementScenarios.js'],write:false,bundle:true,format:'esm',platform:'node'});
const {MOVEMENT_CASES,createMovementScenario}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=[];
for(const {id,ms} of MOVEMENT_CASES){
  const scenario=createMovementScenario(id);
  for(let t=0;t<ms;t+=50)scenario.advance();
  const result=scenario.report();
  output.push(result);
}
for(const {debug,...r} of output)console.log(JSON.stringify(r));
for(const r of output){
  assert.equal(r.invalidTicks,0,r.id+' terrain');
  assert.equal(r.teleports,0,r.id+' maximum movement per tick');
  assert.equal(r.remainingOverlap,0,r.id+' overlaps');
  if(r.id!=='old-overlap')assert.equal(r.peakOverlap,0,r.id+' transient overlaps');
  if(['head-on','elites','tree'].includes(r.id))assert.equal(r.arrived,r.id==='tree'?1:2,r.id+' arrives');
  if(r.id==='passage')assert.equal(r.arrived,10,r.id+' all actors make it through');
  if(r.id==='pack')assert.ok(r.slots>=5 && r.arrived>=4,r.id+' distinct attack positions');
  if(r.id==='charge-wall')assert.ok(r.hits===0&&r.minimumRange<114,r.id+' cast reaches wall without bypassing it');
  if(r.id==='shore')assert.ok(r.hits===0&&r.minimumRange<121,r.id+' cast reaches shore without landing in water');
  if(r.id==='moving-goal')assert.ok(r.minimumRange<115&&r.repaths<14,r.id+' pursuit');
  if(r.id==='return')assert.ok(r.returned,r.id+' returned to home');
  if(r.id==='crowd')assert.ok(r.arrived===30&&r.maxTurns<15,r.id+' large crowd progresses');
  if(r.id==='unreachable')assert.equal(r.abandoned,1,r.id+' bounded recovery');
  if(r.id==='old-overlap')assert.ok(r.overlapTicks<30&&r.arrived===2,r.id+' old overlap resolves incrementally');
}

// Shift the whole crowd relative to the obstacles and exercise other traffic orders.
for(const seed of [27182,27184,27185,27186]){
  const scenario=createMovementScenario('crowd',seed);
  for(let i=0;i<480;i++)scenario.advance();
  const {debug,...summary}=scenario.report();
  assert.equal(summary.peakOverlap,0);
  assert.equal(summary.invalidTicks,0);
  assert.equal(summary.teleports,0);
  assert.ok(summary.arrived===30&&summary.abandoned===0&&summary.maxTurns<=15,JSON.stringify({seed,...summary}));
  console.log(JSON.stringify({seed,...summary}));
}
const baseline=createMovementScenario('tree',27183,true);
for(let i=0;i<210;i++)baseline.advance();
assert.ok(baseline.report().firstArrival>output.find(r=>r.id==='tree').firstArrival,'detour completes sooner with the new route');
