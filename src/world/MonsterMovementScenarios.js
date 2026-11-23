import { GroundOccupancy, groundFootprint } from './GroundOccupancy.js';
import { MonsterMovement } from './MonsterMovement.js';
import { MonsterCombat, startMonsterSkill } from '../dao/MonsterCombat.ts';

const ZONE={zoneId:'stress',x:10,y:14,width:540,height:313};
const STEP=50;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(x,y)=>({x,y});
const obstacle=(x,y,w,h)=>({x,y,w,h});
const beast=(id,x,y,species='wolf',rank='normal')=>({id,x,y,home:point(x,y),zoneId:'stress',
  species,rank,state:'patrol',alive:true,hp:100,maxHp:100,nextThinkAt:Infinity,attackReadyAt:0});
const npc=(x,y)=>({id:'target',x,y,alive:true,hp:1000});
export const MOVEMENT_CASES=[
  {id:'head-on',label:'1 · Hai sói ngược chiều',ms:10500},
  {id:'pack',label:'2 · Năm sói vây một NPC',ms:8500},
  {id:'passage',label:'3 · Mười yêu thú qua đường hẹp',ms:15000},
  {id:'charge-wall',label:'4 · Sơn Trư húc gần tường',ms:3500},
  {id:'shore',label:'5 · Độc Thiềm nhảy sát bờ',ms:3600},
  {id:'elites',label:'6 · Hai Tinh Anh tránh nhau',ms:10500},
  {id:'tree',label:'7 · Đi vòng gốc cây',ms:10500},
  {id:'moving-goal',label:'8 · Mục tiêu chạy liên tục',ms:11000},
  {id:'return',label:'9 · Mất mục tiêu và về lãnh địa',ms:11000},
  {id:'crowd',label:'10 · Ba mươi yêu thú',ms:24000},
  {id:'unreachable',label:'Đích bị cô lập',ms:11000},
  {id:'old-overlap',label:'Vị trí chồng từ save cũ',ms:7000},
];
function setup(id,seed){
  let monsters=[],goals=[],walls=[],target=null,water=null,cast=null;
  const pair=(left,right)=>{monsters=[left,right];goals=[point(440,right.y),point(95,left.y)];};
  if(id==='head-on')pair(beast('a',95,155),beast('b',440,155));
  if(id==='pack'){
    target=npc(270,158);
    monsters=[[84,95],[149,245],[246,55],[413,94],[443,231]].map(([x,y],i)=>beast('pack-'+i,x,y));
  }
  if(id==='passage'){
    walls=[obstacle(214,14,128,120),obstacle(214,190,128,137)];
    const side=[0,1,2,3,4];
    monsters=side.map(i=>beast('line-'+i,174-i*35,146+i%2*4,i%2?'wolf':'toad'));
    monsters.push(...side.map(i=>beast('return-'+i,380+i*35,179-i%2*4)));
    goals=[...side.map(i=>point(522-i*35,149)),...side.map(i=>point(37+i*35,175))];
  }
  if(id==='charge-wall'){
    walls=[obstacle(269,68,24,192)];
    monsters=[beast('charge',230,160,'boar')];target=npc(344,160);cast='charge';
  }
  if(id==='shore'){
    water=obstacle(320,14,230,313);
    monsters=[beast('leap',245,160,'toad','elite')];target=npc(366,160);cast='skyfall';
  }
  if(id==='elites')pair(beast('a',95,155,'boar','elite'),beast('b',440,155,'toad','elite'));
  if(id==='tree'){
    walls=[obstacle(232,127,62,66)];
    monsters=[beast('tree',130,160)];goals=[point(415,160)];
  }
  if(id==='moving-goal'){
    target=npc(435,112);monsters=[beast('moving',140,167,'toad')];
    walls=[obstacle(252,164,42,72)];
  }
  if(id==='return'){
    target=npc(240,161);monsters=[beast('return',248,160)];monsters[0].home=point(100,158);
    monsters[0].targetNpcId=target.id;monsters[0].nextThinkAt=0;
    walls=[obstacle(150,127,34,73)];
  }
  if(id==='crowd'){
    walls=[obstacle(283,93,26,13),obstacle(258,155,27,16),obstacle(278,220,28,15)];
    const offset=seed%5-2;
    const rows=[36,100,165,230,294];
    const outbound=row=>row%2===0;
    monsters=Array.from({length:30},(_,i)=>{
      const lane=i%6,row=Math.floor(i/6),east=outbound(row);
      const x=east?35+lane*40:525-lane*40;
      return beast('crowd-'+String(i).padStart(2,'0'),x,rows[row]+offset,['wolf','boar','toad'][i%3],i%7===0?'elite':'normal');
    });
    goals=monsters.map((_f,i)=>{
      const lane=i%6,row=Math.floor(i/6),east=outbound(row);
      return point(east?303+lane*40:252-lane*40,rows[row]+offset);
    });
  }
  if(id==='unreachable'){
    walls=[obstacle(252,14,34,313)];monsters=[beast('sealed',150,155,'boar')];goals=[point(397,155)];
  }
  if(id==='old-overlap'){
    monsters=[beast('overlap-a',252,162),beast('overlap-b',252,162,'toad','elite')];
    walls=[obstacle(219,128,13,64)];
    goals=[point(344,92),point(349,233)];
  }
  return {monsters,goals,walls,target,water,cast};
}
function overlapsRect(rect,x,y,hw,hh){
  return x+hw>rect.x&&x-hw<rect.x+rect.w&&y+hh>rect.y&&y-hh<rect.y+rect.h;
}
export function createMovementScenario(id,seed=27183,baseline=false){
  const layout=setup(id,seed),{monsters,goals,walls,target,water,cast}=layout;
  const enabled=id==='return'||Boolean(cast);
  const open=(x,y,hw,hh)=>x-hw>=ZONE.x&&x+hw<=ZONE.x+ZONE.width&&y-hh>=ZONE.y&&y+hh<=ZONE.y+ZONE.height&&
    !walls.some(r=>overlapsRect(r,x,y,hw,hh))&&(!water||!overlapsRect(water,x,y,hw,hh));
  const grid=new GroundOccupancy(open),controller=new MonsterMovement(grid,[ZONE]);
  grid.sync(target?[target]:[],monsters);
  const env={fauna:monsters,monsterHazards:[],monsterProjectiles:[]};
  const log={peakOverlap:0,overlapTicks:0,invalidTicks:0,teleports:0,hits:0};
  const positions=monsters.map(m=>point(m.x,m.y));
  const combat=new MonsterCombat(env,[ZONE],{
    movement:baseline?undefined:controller,
    targets:(p,r)=>target?.alive&&dist(p,target)<=r?[target]:[],
    move:(f,p,avoid)=>{const m=grid.advance(grid.bodies.get(f.id),p.x,p.y,avoid);if(m)Object.assign(f,m);return !!m;},
    open:(f,p)=>grid.open(grid.bodies.get(f.id),p.x,p.y),
    line:(a,b)=>{const n=Math.ceil(dist(a,b)/3);for(let j=1;j<=n;j++)if(!open(a.x+(b.x-a.x)*j/n,a.y+(b.y-a.y)*j/n,1,1))return false;return true;},
    safe:()=>false,damage:()=>log.hits++,avoid:()=>{},threat:()=>false,
  });
  if(cast)startMonsterSkill(monsters[0],cast,target,0);
  const arrived=new Set(),abandoned=new Set(),baselineWaiting=new Map();
  let clock=0,minRange=Infinity,slots=0,returned=false,firstArrival=null;
  function advance(){
    clock+=STEP;
    if(id==='return')target.alive=false;
    if(id==='moving-goal'){
      target.x=381+65*Math.cos(clock/2100);
      target.y=150+78*Math.sin(clock/2000);
    }
    if(id==='pack'||id==='moving-goal')for(const f of monsters)f.targetNpcId=target.id;
    grid.sync(target?[target]:[],monsters);
    if(baseline)controller.now=clock;
    if(enabled)combat.tick(clock,STEP);
    else{
      if(!baseline)controller.begin(clock,monsters);
      for(const [i,f] of monsters.entries()){
        if(id==='unreachable'&&abandoned.has(f.id))continue;
        const goal=id==='pack'||id==='moving-goal'?(baseline?point(target.x-20,target.y):controller.approach(f,target)):goals[i];
        if(goal)f.roamTarget=goal;
        if(baseline){
          if(!goal)continue;
          const d=dist(f,goal),step=Math.min(d,3.5);
          const move=d>.2&&grid.advance(grid.bodies.get(f.id),f.x+(goal.x-f.x)*step/d,f.y+(goal.y-f.y)*step/d,true);
          if(move)Object.assign(f,move);
          if(d<6)arrived.add(f.id);
          const short=dist(f,goal)<d-.15;
          baselineWaiting.set(f.id,short||d<6?0:(baselineWaiting.get(f.id)??0)+STEP);
        }else{
          const result=controller.route(f,goal,STEP,f.species==='boar'?65:78);
          if(result==='arrived')arrived.add(f.id);
          if(result==='unreachable'&&id!=='moving-goal'&&id!=='pack')abandoned.add(f.id);
        }
      }
    }
    const overlaps=grid.overlaps().length;
    log.peakOverlap=Math.max(log.peakOverlap,overlaps);log.overlapTicks+=Number(overlaps>0);
    for(const [i,f] of monsters.entries()){
      const body=grid.bodies.get(f.id);
      if(!open(f.x,f.y,body.width/2,body.height/2))log.invalidTicks++;
      if(dist(positions[i],f)>(cast?27:6.3))log.teleports++;
      positions[i]=point(f.x,f.y);
      if(target)minRange=Math.min(minRange,dist(f,target));
    }
    if(id==='return'&&dist(monsters[0],monsters[0].home)<10)returned=true;
    if(arrived.size&&firstArrival===null)firstArrival=clock;
    slots=Math.max(slots,controller.slots.size);
  }
  function report(){
    const debug=controller.diagnostics(monsters,seed),stats=debug.monsters;
    if(baseline)for(const f of stats){
      if(f.goal)f.route=[f.goal];
      f.noProgress=baselineWaiting.get(f.id)??0;
      f.stuck=f.noProgress>=650;
    }
    return {id,baseline,clock,...log,remainingOverlap:grid.overlaps().length,
      arrived:arrived.size,firstArrival,abandoned:abandoned.size,slots,minimumRange:Number.isFinite(minRange)?Math.round(minRange):null,
      returned,
      repaths:stats.reduce((n,s)=>n+s.repaths,0),recovered:stats.reduce((n,s)=>n+s.recovered,0),
      stuckCount:stats.reduce((n,s)=>n+s.stuckCount,0),stuckMs:stats.reduce((n,s)=>n+s.stuckMs,0),
      maxTurns:Math.max(0,...stats.map(s=>s.turns)),debug};
  }
  return {...layout,id,seed,baseline,grid,controller,env,advance,report};
}
