import { cultivationStats } from '../systems/CultivationSystem.ts';
import { realmPosition } from '../systems/RealmConfig.ts';

export const SKY_STEP = Object.freeze({
  mp:34, reserve:9, cooldown:46000, minManual:108, minAuto:720,
  phases:Object.freeze({cast:460,vanish:180,travel:360,arrive:270,recover:270}),
});
const goals=new Set(['work','cultivate','teach','gather','rest','trade','shop','mission','travel','socialize','guard']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=({x,y})=>({x,y});
const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const next={cast:'vanish',vanish:'travel',travel:'arrive',arrive:'recover'};
const near=[[1,0],[0,1],[-1,0],[0,-1],[.707,.707],[-.707,.707],[-.707,-.707],[.707,-.707]];
const heading=(a,b)=>Math.abs(a.x-b.x)>Math.abs(a.y-b.y)?b.x>a.x?'right':'left':b.y>a.y?'down':'up';
export const meetsSkyStepRealm=npc=>Boolean(npc&&(realmPosition(npc)?.index??-1)>=2);
export const skyStepRange=npc=>1380+Math.max(0,npc.realmIndex-2)*235;
export const skyStepReasons={
  realm:'Cần đạt Kim Đan tầng 1.', busy:'Đang thực hiện hành động khác.', mp:'Linh lực chưa đủ.',
  cooldown:'Đạp Gió Lướt Mây đang hồi.', range:'Điểm đến nằm ngoài tầm thân pháp.',
  pad:'Không tìm thấy điểm đáp an toàn.', zone:'Tuyến đi qua vùng cấm hoặc đích không thể tiếp cận.',
};

export function skyStepEligibility(npc,{mount,locked=false}={}){
  if(!npc?.alive||npc.ascended||npc.wallLevel||npc.flight||npc.skyStep||npc.tribulation||npc.manualMeditation||
    mount?.attached||mount?.locked||locked||npc.goalAction==='fight'||npc.goalAction==='flee')return 'busy';
  if(!meetsSkyStepRealm(npc))return 'realm';
  if(npc.skyStepCooldown>0)return 'cooldown';
  if(npc.mp<SKY_STEP.mp+SKY_STEP.reserve)return 'mp';
  if(npc.fatigue>83||npc.hp<cultivationStats(npc).hpMax*.45||npc.safety<35)return 'busy';
  return null;
}

export class SkyStepController {
  constructor(port){
    this.port=port;
    this.active=new Map();
    this.pads=new Map();
    this.nextCheck=new Map();
  }
  preview(npc,target,{manual=false,...options}={}){
    const reason=skyStepEligibility(npc,options);
    if(reason)return {ok:false,reason};
    if(!finite(target)||distance(npc,target)>(skyStepRange(npc))||distance(npc,target)<(manual?SKY_STEP.minManual:SKY_STEP.minAuto))
      return {ok:false,reason:'range'};
    if(!this.port.landOpen(npc,npc))return {ok:false,reason:'pad'};
    if(!this.port.connected(npc,target)||!this.port.airLine(npc,target))return {ok:false,reason:'zone'};
    const landing=this.findLanding(npc,npc,target);
    return landing?{ok:true,landing}:{ok:false,reason:'pad'};
  }
  findLanding(npc,from,goal){
    for(const p of [point(goal),...[24,40,58,80].flatMap(r=>near.map(([x,y])=>({
      x:Math.round(goal.x+x*r),y:Math.round(goal.y+y*r),
    })))]){
      if(distance(from,p)>skyStepRange(npc)||distance(from,p)<SKY_STEP.minManual)continue;
      if(this.port.landOpen(npc,p)&&this.port.connected(p,goal)&&this.port.airLine(from,p))return p;
    }
    return null;
  }
  reserve(npc,landing){
    this.pads.set(npc.id,{id:'sky-pad:'+npc.id,...landing,species:'tiger',fixed:true,alive:true});
  }
  start(npc,goal,options={}){
    const result=this.preview(npc,goal,options);
    if(!result.ok)return result;
    npc.mp-=SKY_STEP.mp;
    npc.skyStepCooldown=SKY_STEP.cooldown;
    npc.skyStep={mode:'SkyStep',phase:'cast',elapsed:0,from:point(npc),goal:point(goal),landing:result.landing,
      manual:Boolean(options.manual),heading:heading(npc,result.landing)};
    this.active.set(npc.id,npc);this.reserve(npc,result.landing);
    this.port.changed(npc,'cast');
    return result;
  }
  consider(npc,target,time){
    if(!meetsSkyStepRealm(npc)||!goals.has(npc.goalAction)||npc.marketVisit||npc.tribulation||
      npc.faunaHuntTargetId||npc.meditationSpot&&distance(npc,npc.meditationSpot)<18||!finite(target)||
      distance(npc,target)<SKY_STEP.minAuto||time<(this.nextCheck.get(npc.id)??0))return false;
    this.nextCheck.set(npc.id,time+2300);
    return this.start(npc,target).ok;
  }
  restore(npcs){
    for(const npc of npcs){
      const step=npc.skyStep;
      if(!step)continue;
      if(!npc.alive||npc.flight||!meetsSkyStepRealm(npc)||!SKY_STEP.phases[step.phase]||
        !finite(step.from)||!finite(step.goal)||!finite(step.landing)){delete npc.skyStep;continue;}
      step.elapsed=Number.isFinite(step.elapsed)?Math.max(0,Math.min(step.elapsed,SKY_STEP.phases[step.phase])):0;
      this.active.set(npc.id,npc);
      if(step.phase!=='arrive'&&step.phase!=='recover')this.reserve(npc,step.landing);
    }
  }
  finish(npc){
    this.active.delete(npc.id);this.pads.delete(npc.id);delete npc.skyStep;
    this.port.changed(npc,'end');
  }
  advance(npcs,delta){
    for(const npc of npcs)if(npc.skyStepCooldown>0)npc.skyStepCooldown=Math.max(0,npc.skyStepCooldown-delta);
    for(const npc of this.active.values()){
      const step=npc.skyStep;
      if(!npc.alive||npc.flight||npc.tribulation||npc.goalAction==='fight'||npc.goalAction==='flee'||
        !step.manual&&(!finite(npc.actionTarget)||distance(npc.actionTarget,step.goal)>28)){
        this.finish(npc);continue;
      }
      step.elapsed+=delta;
      while(step.elapsed>=SKY_STEP.phases[step.phase]){
        step.elapsed-=SKY_STEP.phases[step.phase];
        const phase=next[step.phase];
        if(!phase){this.finish(npc);break;}
        if(phase==='arrive'){
          const stillOpen=this.port.landOpen(npc,step.landing)&&this.port.airLine(step.from,step.landing)&&
            this.port.connected(step.landing,step.goal);
          const landing=stillOpen?step.landing:this.findLanding(npc,step.from,step.goal);
          if(!landing){this.finish(npc);break;}
          step.landing=landing;
          this.pads.delete(npc.id);
          npc.x=landing.x;npc.y=landing.y;
        }
        step.phase=phase;
        this.port.changed(npc,phase);
      }
    }
  }
}

export function skyStepPose(step){
  if(!step)return null;
  const t=step.elapsed/SKY_STEP.phases[step.phase];
  const cast=step.phase==='cast',depart=step.phase==='vanish',arrive=step.phase==='arrive';
  return {alpha:step.phase==='travel'?0:depart?1-t:arrive?t:1,
    height:depart?t*20:arrive?(1-t)*16:cast?t*4:0,
    mount:(depart||arrive) ? .65 : cast ? t*.48 : (1-t)*.5,lean:3,cloth:Math.round(Math.sin(t*15)*3+3)};
}
