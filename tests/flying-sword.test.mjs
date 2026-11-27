import assert from 'node:assert/strict';
import {build} from 'esbuild';

const result=await build({entryPoints:['src/world/FlyingSword.js'],bundle:true,write:false,format:'esm',platform:'node'});
const {AerialNavigation,FlyingSwordController,FLIGHT,flightEligibility,travelMode,visualFlightPose}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const actor=(id,x,y,extra={})=>({id,x,y,alive:true,realmIndex:2,realmLevel:1,hp:1500,mp:120,hunger:0,fatigue:0,
  spiritualRoot:'metal',technique:'sword',techniqueMastery:{sword:1},skills:['qi-sword'],inventory:[],
  action:'travel',goalAction:'cultivate',actionTarget:{x:940,y},...extra});
const nav=new AerialNavigation(1300,650,[
  {x:470,y:210,width:80,height:200,ceiling:Infinity},
  {x:750,y:100,width:44,height:176,ceiling:30},
]);
const blocked={x:940,y:310};
const open=(_n,p)=>Math.hypot(p.x-blocked.x,p.y-blocked.y)>19;
const port={landOpen:open,connected:()=>true,moved:()=>{},changed:()=>{}};
const flight=new FlyingSwordController(nav,port);
const n=actor('shao',90,310),b=actor('yu',105,368);
assert.equal(flightEligibility(actor('unqualified',90,310,{realmIndex:0})).reason,'realm');
assert.equal(flightEligibility(actor('mp',90,310,{mp:4})).reason,'mp');
assert.equal(flightEligibility(actor('injured',90,310,{hp:50})).reason,'injured');
assert.equal(flightEligibility(actor('sword',90,310,{skills:[]})).reason,'sword');
assert.equal(flightEligibility(n,{mount:{attached:true}}).reason,'busy');
assert.equal(travelMode(n,{attached:true}),'MountedBeast');
assert.equal(flight.consider(actor('near',90,320),{x:230,y:320}),false);
assert.ok(!nav.line(n,n.actionTarget));
assert.ok(nav.line({x:710,y:165},{x:820,y:165},52));
assert.ok(!nav.line({x:710,y:165},{x:820,y:165},18));
assert.ok(flight.consider(n,n.actionTarget));
assert.ok(flight.consider(b,b.actionTarget));
assert.ok(n.flight.route.length>1&&Math.hypot(n.flight.landing.x-blocked.x,n.flight.landing.y-blocked.y)>19);
const phases=new Set();
for(let i=0;i<790&&flight.active.size;i++){
  flight.advance([n,b],30,()=>null);
  for(const f of flight.active.values()){
    phases.add(f.flight.phase);assert.ok(nav.open(f,f.flight.altitude));
  }
  if(n.flight?.altitude>40&&b.flight?.altitude>40)assert.ok(Math.hypot(n.x-b.x,n.y-b.y)>=FLIGHT.separation);
}
for(const p of ['SummonSword','MountSword','TakeOff','FlyingMove','FlyingAccelerate','Landing','DismountSword','DismissSword'])assert.ok(phases.has(p),p);
assert.equal(travelMode(n),'Ground');
assert.equal(travelMode(b),'Ground');
assert.equal(n.goalAction,'cultivate');
assert.ok(n.mp<120);
assert.equal(n.inventory.length,0);
assert.equal(flight.startManual(n),false,'cooldown at landing');

const manual=actor('manual',250,120),pilot=new FlyingSwordController(nav,port);
assert.ok(pilot.startManual(manual));
const advance=(count,input,controller=pilot,npc=manual)=>{for(let i=0;i<count;i++)controller.advance([npc],35,()=>input);};
advance(45,{x:0,y:0});
assert.equal(manual.flight.altitude,52);
assert.equal(manual.flight.phase,'FlyingIdle');
assert.ok(visualFlightPose(manual.flight).mount===1);
for(const [x,y,dir] of [[1,0,'right'],[0,1,'down'],[-1,0,'left'],[0,-1,'up']]){
  advance(1,{x,y,fast:true});
  assert.equal(manual.flight.phase,'FlyingTurn');
  advance(13,{x,y,fast:true});
  assert.equal(manual.flight.heading,dir);
}
const cold=JSON.parse(JSON.stringify(manual)),resumed=new FlyingSwordController(nav,port);
resumed.restore([cold]);
assert.equal(cold.flight.altitude,52);
assert.equal(cold.flight.sword,manual.flight.sword);
const start=cold.x;
advance(20,{x:1,y:0},resumed,cold);
assert.ok(cold.x>start);
resumed.releaseControl(cold);
advance(160,null,resumed,cold);
assert.equal(travelMode(cold),'Ground');
const speeds=new FlyingSwordController(new AerialNavigation(1900,650),port);
const sprinter=actor('sprinter',100,100);
assert.ok(speeds.startManual(sprinter));
advance(45,{x:0,y:0},speeds,sprinter);
advance(24,{x:1,y:0},speeds,sprinter);
const cruise=sprinter.flight.speed;
advance(18,{x:1,y:0,fast:true},speeds,sprinter);
assert.ok(sprinter.flight.speed>cruise*1.25);
advance(4,{x:1,y:0,slow:true},speeds,sprinter);
assert.ok(sprinter.flight.speed<cruise*.65);
sprinter.mp=0;
advance(120,{x:0,y:0},speeds,sprinter);
assert.equal(travelMode(sprinter),'Ground','low MP triggers a safe approach and landing');

const arriving=actor('arriving',100,310,{actionTarget:{x:940,y:310}});
let occupant=null;
const landingController=new FlyingSwordController(nav,{...port,landOpen:(_n,p)=>!occupant||Math.hypot(p.x-occupant.x,p.y-occupant.y)>18});
assert.ok(landingController.consider(arriving,arriving.actionTarget));
for(let i=0;i<380&&arriving.flight?.phase!=='Landing';i++)landingController.advance([arriving],35,()=>null);
assert.equal(arriving.flight?.phase,'Landing');
occupant={x:arriving.x,y:arriving.y};
for(let i=0;i<260&&arriving.flight;i++)landingController.advance([arriving],35,()=>null);
assert.equal(travelMode(arriving),'Ground');
assert.ok(Math.hypot(arriving.x-occupant.x,arriving.y-occupant.y)>18,'a competing ground actor forces another landing pad');

console.log('PASS sword eligibility, autonomous detour, spacing, occupied landing, four directions, cooldown and airborne save.');
