import { weaponForNpc } from './WeaponCombat.js';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { REALMS, realmPosition } from '../systems/RealmConfig.ts';

export const FLIGHT = Object.freeze({
  minimumRealm:'foundation', cruiseHeight:52, clearance:14, minRange:480,
  urgentRange:245, launchCost:8, costPerSecond:2.3, reserve:5, speed:216,
  cooldown:6500, commitment:1700, separation:36, landingPadding:11,
  phases:Object.freeze({SummonSword:420,MountSword:310,TakeOff:620,Landing:620,DismountSword:290,DismissSword:340}),
});
export const travelMode=(npc,mount)=>npc.flight?'FlyingSword':mount?.attached||mount?.locked?'MountedBeast':'Ground';
export const blocksGroundCombat=npc=>Boolean(npc?.flight);
export const aboveGroundCombat=npc=>(npc?.flight?.altitude??0)>=16;
const point=({x,y})=>({x,y});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const smooth=t=>t*t*(3-2*t);
const validPoint=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const directions=['down','left','up','right'];
const phases=new Set([...Object.keys(FLIGHT.phases),'FlyingIdle','FlyingMove','FlyingAccelerate','FlyingTurn']);
const blockedGoals=new Set(['fight','flee','commission']);
const flightGoals=new Set(['cultivate','teach','gather','guard','patrol','mission','travel','work','rest','shop','trade','socialize','recruit']);
const clamp=(v,max)=>Math.max(0,Math.min(max,v));
const directionFor=(x,y)=>Math.abs(x)>Math.abs(y)?(x<0?'left':'right'):(y<0?'up':'down');

export function meetsFlightRealm(npc){
  const position=npc&&realmPosition(npc);
  const minimum=REALMS.findIndex(realm=>realm.id===FLIGHT.minimumRealm);
  return Boolean(position&&minimum>=0&&position.index>=minimum);
}

export const FLIGHT_REASONS=Object.freeze({
  inactive:'Nhân vật hiện không thể cất cánh.',
  realm:'Cần đạt Trúc Cơ tầng 1.',
  busy:'Đang cưỡi thú hoặc thực hiện hành động khác.',
  sword:'Cần kiếm đang trang bị hoặc Kiếm Khí khi tay không.',
  injured:'Thương thế hoặc mệt mỏi chưa cho phép bay.',
  mp:'Linh lực chưa đủ để cất cánh.',
  cooldown:'Đang hồi linh lực sau khi hạ kiếm.',
  pad:'Cần một khoảng trống hợp lệ để cất cánh.',
});

export function flightEligibility(npc,{mount,locked=false}={}){
  if(!npc?.alive||npc.ascended)return {ok:false,reason:'inactive'};
  if(!meetsFlightRealm(npc))return {ok:false,reason:'realm'};
  if(travelMode(npc,mount)==='MountedBeast'||locked)return {ok:false,reason:'busy'};
  const sword=weaponForNpc(npc);
  const source=sword?.kind==='jian'?sword.id:!npc.equippedWeapon&&npc.skills?.includes('qi-sword')?'qi-sword':null;
  if(!source)return {ok:false,reason:'sword'};
  if(npc.hp<cultivationStats(npc).hpMax*.45||npc.fatigue>89)return {ok:false,reason:'injured'};
  if(npc.mp<FLIGHT.launchCost+FLIGHT.reserve+FLIGHT.costPerSecond*2)return {ok:false,reason:'mp'};
  if(npc.flightCooldown>0)return {ok:false,reason:'cooldown'};
  return {ok:true,source};
}

const flightSpeed=npc=>FLIGHT.speed*(1+Math.max(0,npc.realmIndex-1)*.12);
const flightCost=npc=>FLIGHT.costPerSecond/Math.max(1,1+(npc.realmIndex-1)*.16);

export class AerialNavigation {
  constructor(width,height,zones=[]){
    this.width=width;this.height=height;this.zones=zones;
  }
  open(p,height=FLIGHT.cruiseHeight){
    const pad=FLIGHT.clearance;
    return p.x>=pad&&p.y>=pad&&p.x<=this.width-pad&&p.y<=this.height-pad&&
      !this.zones.some(r=>height<=r.ceiling&&p.x>r.x-pad&&p.x<r.x+r.width+pad&&p.y>r.y-pad&&p.y<r.y+r.height+pad);
  }
  line(a,b,height=FLIGHT.cruiseHeight){
    if(!this.open(a,height)||!this.open(b,height))return false;
    // Slab intersection checks the whole segment, including thin zones between ticks.
    return !this.zones.some(r=>{
      if(height>r.ceiling)return false;
      let lo=0,hi=1;
      for(const [start,delta,min,max] of [
        [a.x,b.x-a.x,r.x-FLIGHT.clearance,r.x+r.width+FLIGHT.clearance],
        [a.y,b.y-a.y,r.y-FLIGHT.clearance,r.y+r.height+FLIGHT.clearance],
      ]){
        if(Math.abs(delta)<.001){if(start<=min||start>=max)return false;continue;}
        const u=(min-start)/delta,v=(max-start)/delta;
        lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));
        if(lo>hi)return false;
      }
      return lo<=hi;
    });
  }
  route(from,to){
    if(this.line(from,to))return [point(to)];
    if(!this.open(from)||!this.open(to))return null;
    const pad=FLIGHT.clearance+8;
    const nodes=[point(from),point(to)];
    for(const r of this.zones){
      if(r.ceiling<FLIGHT.cruiseHeight)continue;
      for(const x of [r.x-pad,r.x+r.width+pad])for(const y of [r.y-pad,r.y+r.height+pad]){
        const corner={x,y};
        if(this.open(corner))nodes.push(corner);
      }
    }
    const costs=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),visited=new Set();
    costs[0]=0;
    for(let step=0;step<nodes.length;step++){
      let best=-1;
      for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&Number.isFinite(costs[i])&&(best<0||costs[i]<costs[best]))best=i;
      if(best<0)break;
      if(best===1){
        const route=[];
        for(let i=1;i!==0;i=prev[i])route.unshift(nodes[i]);
        return route;
      }
      visited.add(best);
      for(let i=1;i<nodes.length;i++){
        const cost=costs[best]+dist(nodes[best],nodes[i]);
        if(cost<costs[i]&&this.line(nodes[best],nodes[i])){costs[i]=cost;prev[i]=best;}
      }
    }
    return null;
  }
}

const ring=[[-1,0],[1,0],[0,-1],[0,1],[-.707,-.707],[.707,-.707],[-.707,.707],[.707,.707]];

export class FlyingSwordController {
  constructor(nav,port){
    this.nav=nav;this.port=port;this.active=new Map();this.elapsed=0;this.checkAt=new Map();this.pads=new Map();
  }
  restore(npcs){
    for(const n of npcs){
      const f=n.flight;
      if(!f)continue;
      if(!n.alive||n.ascended||f.mode!=='FlyingSword'||!validPoint(n)||!validPoint(f.launch)||
        !Number.isFinite(f.altitude)||!Number.isFinite(f.phaseMs)){
        delete n.flight;continue;
      }
      f.phase=phases.has(f.phase)?f.phase:'FlyingIdle';
      f.total=Number.isFinite(f.total)?f.total:0;
      f.landing=validPoint(f.landing)?f.landing:null;
      f.goal=validPoint(f.goal)?f.goal:undefined;
      f.route=Array.isArray(f.route)?f.route.filter(validPoint):[];
      f.altitude=clamp(f.altitude,FLIGHT.cruiseHeight);f.speed=0;f.wait=0;
      f.heading=directions.includes(f.heading)?f.heading:'down';
      this.active.set(n.id,n);
      // Possession will be restored by WorldScene. An abandoned manual trip returns safely.
      if(f.altitude>0&&!this.nav.open(n,f.altitude))f.recover=true;
    }
  }
  chooseLanding(n,near,connected){
    const options=[point(near)];
    for(const radius of [24,48,80,120,176,248,352,496])for(const [dx,dy] of ring){
      options.push({x:near.x+dx*radius,y:near.y+dy*radius});
    }
    return options.find(p=>this.nav.open(p,0)&&this.port.landOpen(n,p)&&
      (!connected||this.port.connected(p,near))&&this.separated(n,p,0,true));
  }
  separated(n,p,height,landing=false){
    for(const other of this.active.values()){
      if(other===n||!other.alive)continue;
      const f=other.flight;
      if(f.landing&&landing&&dist(f.landing,p)<FLIGHT.separation)return false;
      if((landing||Math.abs(f.altitude-height)<28)&&dist(other,p)<FLIGHT.separation)return false;
    }
    return true;
  }
  launchWaypoint(n,goal){
    const pad=this.pads.get(n.id);
    if(pad&&this.elapsed<pad.until&&dist(goal,pad.goal)<80&&!this.canLaunch(n))return pad.point;
    if(pad)this.pads.delete(n.id);
    return null;
  }
  consider(n,goal,options={}){
    if(this.elapsed<(this.checkAt.get(n.id)??0))return false;
    this.checkAt.set(n.id,this.elapsed+1700);
    const range=dist(n,goal),urgent=Boolean(options.urgent);
    if(!flightGoals.has(n.goalAction)&&!(urgent&&n.goalAction==='fight')||
      n.decisionSlot?.startsWith('duel:')||n.faunaHuntTargetId)return false;
    const threshold=urgent?FLIGHT.urgentRange:n.goalAction==='gather'?FLIGHT.minRange+100:FLIGHT.minRange;
    if(range<threshold)return false;
    const eligible=flightEligibility(n,options);
    if(!eligible.ok)return false;
    if(!this.canLaunch(n)){
      if(!this.pads.has(n.id)){
        const launch=this.chooseLanding(n,n,true);
        if(launch&&dist(n,launch)<=176)this.pads.set(n.id,{goal:point(goal),point:launch,until:this.elapsed+4700});
      }
      return false;
    }
    this.pads.delete(n.id);
    const landing=this.chooseLanding(n,goal,true);
    const route=landing&&this.nav.route(n,landing);
    if(!route)return false;
    const length=route.reduce((sum,p,i)=>sum+dist(i?route[i-1]:n,p),0);
    const seconds=length/flightSpeed(n)+1.8;
    if(seconds*flightCost(n)+FLIGHT.launchCost+FLIGHT.reserve>n.mp||
      seconds+dist(landing,goal)/72>range/(urgent?100:78)*.87)return false;
    return this.start(n,eligible.source,{urgent,goalAction:n.goalAction,goal:point(goal),landing,route,heading:directionFor(route[0].x-n.x,route[0].y-n.y)});
  }
  canLaunch(n){
    return this.nav.open(n,0)&&this.port.landOpen(n,n)&&this.separated(n,n,0,true);
  }
  startManual(n,options={},heading='down'){
    const eligible=flightEligibility(n,options);
    return eligible.ok&&this.canLaunch(n)?this.start(n,eligible.source,{heading,manual:true,route:[]}):false;
  }
  start(n,sword,trip){
    if(n.flight)return false;
    n.mp-=FLIGHT.launchCost;
    n.flight={mode:'FlyingSword',sword,eligibleAtLaunch:true,launch:point(n),altitude:0,
      phase:'SummonSword',phaseMs:0,total:0,speed:0,wait:0,...trip};
    this.active.set(n.id,n);this.port.changed(n,'start');
    return true;
  }
  takeControl(n){
    const f=n.flight;
    if(!f||['Landing','DismountSword','DismissSword'].includes(f.phase))return;
    f.manual=true;f.route=[];f.landing=null;f.emergency=false;f.landRequested=false;
  }
  land(n){if(n.flight)n.flight.landRequested=true;}
  releaseControl(n){
    if(!n.flight)return;
    n.flight.manual=false;
    n.flight.landRequested=true;
  }
  advance(npcs,delta,manualFor){
    this.elapsed+=delta;
    for(const n of npcs)if(n.flightCooldown>0)n.flightCooldown=Math.max(0,n.flightCooldown-delta);
    for(const n of this.active.values()){
      if(!n.alive||n.ascended){this.end(n);continue;}
      const input=manualFor(n);
      if(n.flight.manual&&!input)this.releaseControl(n);
      const budget=input?Math.min(delta,70):delta;
      for(let left=budget;left>0&&n.flight;left-=50)this.tick(n,Math.min(left,50),input);
      if(n.flight)this.port.moved(n);
    }
  }
  setPhase(f,phase){if(f.phase!==phase){f.phase=phase;f.phaseMs=0;}}
  tick(n,dt,input){
    const f=n.flight;
    f.total+=dt;f.phaseMs+=dt;
    const span=FLIGHT.phases[f.phase];
    if(f.recover){
      // A map update may place a new restricted volume over a saved flight.
      const restricted=this.nav.zones.find(r=>f.altitude<=r.ceiling&&n.x>r.x-FLIGHT.clearance&&
        n.x<r.x+r.width+FLIGHT.clearance&&n.y>r.y-FLIGHT.clearance&&n.y<r.y+r.height+FLIGHT.clearance);
      if(!restricted){delete f.recover;f.landRequested=true;}
      else{
        const exits=[
          {x:restricted.x-FLIGHT.clearance-1,y:n.y},{x:restricted.x+restricted.width+FLIGHT.clearance+1,y:n.y},
          {x:n.x,y:restricted.y-FLIGHT.clearance-1},{x:n.x,y:restricted.y+restricted.height+FLIGHT.clearance+1},
        ].filter(p=>this.nav.open(p,f.altitude)).sort((a,b)=>dist(n,a)-dist(n,b));
        const exit=exits[0];
        if(exit){const step=Math.min(1,dt*.09/dist(n,exit));n.x+=(exit.x-n.x)*step;n.y+=(exit.y-n.y)*step;}
        return;
      }
    }
    if(f.phase==='SummonSword'||f.phase==='MountSword'){
      if(f.landRequested){this.setPhase(f,'DismissSword');return;}
      if(f.phaseMs>=span)this.setPhase(f,f.phase==='SummonSword'?'MountSword':'TakeOff');
      return;
    }
    if(f.phase==='TakeOff'){
      if(!this.separated(n,n,FLIGHT.cruiseHeight)||f.landRequested){
        f.wait+=dt;f.phaseMs-=dt;
        if(f.wait>=2400||f.landRequested){f.landingHeight=f.altitude;this.setPhase(f,'Landing');}
        return;
      }
      f.wait=0;
      f.altitude=FLIGHT.cruiseHeight*smooth(clamp(f.phaseMs/span,1));
      if(f.phaseMs>=span)this.setPhase(f,'FlyingIdle');
      return;
    }
    if(f.phase==='Landing'){
      if(!this.port.landOpen(n,n)||!this.separated(n,n,0)){
        f.landRequested=true;f.landing=null;f.route=[];f.lifting=true;delete f.landingHeight;
        this.setPhase(f,'FlyingIdle');return;
      }
      f.altitude=(f.landingHeight??FLIGHT.cruiseHeight)*(1-smooth(clamp(f.phaseMs/span,1)));
      if(f.phaseMs>=span){this.setPhase(f,'DismountSword');this.port.changed(n,'touchdown');}
      return;
    }
    if(f.phase==='DismountSword'||f.phase==='DismissSword'){
      if(f.phaseMs>=span){if(f.phase==='DismissSword')this.end(n);else this.setPhase(f,'DismissSword');}
      return;
    }
    if(f.lifting){
      f.altitude=Math.min(FLIGHT.cruiseHeight,f.altitude+dt*.08);
      if(f.altitude>=FLIGHT.cruiseHeight)delete f.lifting;
      return;
    }
    n.mp=Math.max(0,n.mp-dt*flightCost(n)/1000*(f.fast?1.24:1));
    const source=f.sword==='qi-sword'?!n.equippedWeapon&&n.skills?.includes('qi-sword'):weaponForNpc(n)?.id===f.sword;
    const destinationChanged=f.goal&&(Boolean(f.goalAction)&&n.goalAction!==f.goalAction||dist(n.actionTarget??f.goal,f.goal)>180);
    const needsGround=blockedGoals.has(n.goalAction)&&!(f.urgent&&n.goalAction==='fight'&&f.landing&&dist(n,f.landing)>138);
    if(n.mp<=FLIGHT.reserve||!source||n.hp<cultivationStats(n).hpMax*.45||!input&&(needsGround||destinationChanged))f.landRequested=true;
    if(f.landRequested&&(f.total>=FLIGHT.commitment||n.mp<=FLIGHT.reserve)&&
      (!f.emergency||!f.route.length&&f.wait>800)){
      f.emergency=true;
      f.landing=this.chooseLanding(n,n,false)??this.chooseLanding(n,f.launch,false);
      f.route=f.landing?this.nav.route(n,f.landing)??[]:[];
      f.wait=0;
    }
    if(f.landing&&dist(n,f.landing)<2){
      if(this.port.landOpen(n,n)&&this.separated(n,n,0)){f.speed=0;this.setPhase(f,'Landing');return;}
      f.landRequested=true;f.wait=850;f.landing=null;f.route=[];
    }
    let target=f.route[0];
    if(input&&f.manual&&!f.landRequested&&Math.hypot(input.x,input.y)>.1)
      target={x:n.x+input.x*64,y:n.y+input.y*64};
    if(!target){
      f.speed=0;f.wait+=dt;f.fast=false;
      this.setPhase(f,'FlyingIdle');return;
    }
    const range=dist(n,target);
    if(range<2){f.route.shift();return;}
    const vx=(target.x-n.x)/range,vy=(target.y-n.y)/range;
    const heading=directionFor(vx,vy);
    f.fast=Boolean(input?.fast&&f.manual&&!f.landRequested);
    const ceiling=flightSpeed(n)*(f.fast?1.38:input?.slow ? .56 : 1);
    const remaining=f.landing&&f.route.length===1?range:Infinity;
    const limit=Math.min(ceiling,remaining<150?50+remaining*1.8:ceiling);
    const oldSpeed=f.speed;
    f.speed=Math.min(limit,f.speed+dt*.42);
    const step=Math.min(range,f.speed*dt/1000);
    const candidates=[0,.48,-.48,1.48,-1.48].map(angle=>({
      x:n.x+(vx*Math.cos(angle)-vy*Math.sin(angle))*step,
      y:n.y+(vy*Math.cos(angle)+vx*Math.sin(angle))*step,
    }));
    const chosen=candidates.find(p=>this.nav.line(n,p,f.altitude)&&this.separated(n,p,f.altitude));
    if(!chosen){
      f.wait+=dt;f.speed=0;
      this.setPhase(f,'FlyingIdle');
      if(f.wait>3300&&!f.manual){f.landRequested=true;f.emergency=false;}
      return;
    }
    n.x=chosen.x;n.y=chosen.y;f.wait=0;
    if(heading!==f.heading){f.heading=heading;this.setPhase(f,'FlyingTurn');}
    else if(f.phase!=='FlyingTurn'||f.phaseMs>=240)this.setPhase(f,f.speed>oldSpeed+2?'FlyingAccelerate':'FlyingMove');
  }
  end(n){
    this.active.delete(n.id);delete n.flight;n.flightCooldown=FLIGHT.cooldown;
    this.port.changed(n,'end');
  }
}

export function visualFlightPose(f){
  if(!f||f.phase==='SummonSword'||f.phase==='DismissSword')return null;
  const mount=f.phase==='MountSword'?smooth(clamp(f.phaseMs/FLIGHT.phases.MountSword,1)):
    f.phase==='DismountSword'?1-smooth(clamp(f.phaseMs/FLIGHT.phases.DismountSword,1)):1;
  return {mount,cloth:Math.round(Math.sin(f.total/(f.fast?75:104))*(f.speed>35?2:1)),
    lean:f.phase==='FlyingAccelerate'?2:f.phase==='FlyingTurn'?1:0};
}
