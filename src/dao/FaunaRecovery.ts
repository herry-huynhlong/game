import { RECOVERY } from './CombatRecovery';
import { insideHabitat, type FaunaZone } from './FaunaSystem';
import { FAUNA_SPECIES } from './MonsterRegistry';
import type { FaunaSave, MonsterPoint } from './types';

export const FLOWER_WAKE_MS=1120;
export const FLOWER_RESTORE_MS=780;
const RETURN_LIMIT_MS=12500;
export const canDisguise=(f:FaunaSave)=>f.species==='flower'||f.species==='vine'||Boolean(f.growth);
export const faunaStationaryForm=(f:FaunaSave)=>f.species==='flower'&&(!f.flower||['rooted','alert','waking'].includes(f.flower.phase))||
  Boolean(f.growth&&['normal','spirit','dormant'].includes(f.growth.phase))||
  (f.species==='vine'&&(!f.recovery&&f.state==='sleep'||f.recovery?.phase==='resting'));
const distance=(a:MonsterPoint,b:MonsterPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
type Open=(f:FaunaSave,point:MonsterPoint)=>boolean;

export function beginFaunaReturn(f:FaunaSave,z:FaunaZone,now:number){
  if(f.recovery)return;
  const anchor={x:z.x+(z.anchorDx??0),y:z.y+(z.anchorDy??0)};
  const preferAnchor=['wolf','toad','centipede','eagle','stag'].includes(f.species)&&z.anchorDx!==undefined&&z.anchorDy!==undefined&&
    distance(anchor,f.home)<(f.leashRadius??z.leash??FAUNA_SPECIES[f.species].leash)*.7;
  const goal=FAUNA_SPECIES[f.species].speed===0?{x:f.x,y:f.y}:preferAnchor?anchor:{...f.home};
  f.recovery={phase:'returning',at:now,goal};
  f.targetNpcId=undefined;f.targetSeenAt=undefined;f.cast=undefined;
  f.roamTarget=goal;f.state='return';
  if(f.species==='flower')f.flower={phase:'returning',at:now};
}

function restore(f:FaunaSave,now:number){
  f.roamTarget=undefined;
  f.recovery={phase:canDisguise(f)?'restoring':'resting',at:now,goal:{x:f.x,y:f.y}};
  f.state=canDisguise(f)?'recover':'sleep';
  if(f.species==='flower')f.flower={phase:'rooting',at:now};
}

export function updateFaunaReturn(f:FaunaSave,z:FaunaZone,now:number,open:Open,blocked=false){
  const rest=f.recovery;
  if(!rest)return false;
  if(rest.phase==='resting'){
    f.state='sleep';
    f.roamTarget=undefined;
    if(!canDisguise(f)&&f.hp>=f.maxHp*RECOVERY.resumeBeast){f.recovery=undefined;return false;}
    return true;
  }
  if(rest.phase==='restoring'){
    if(now-rest.at<(f.species==='flower'?FLOWER_RESTORE_MS:900))return true;
    rest.phase='resting';rest.at=now;f.state='sleep';
    if(f.flower)f.flower={phase:'rooted',at:now};
    if(f.growth){f.growth.phase='dormant';f.growth.wakeAt=undefined;}
    return true;
  }
  const standing=insideHabitat(f,z,12)&&open(f,f);
  if(standing&&(distance(f,rest.goal)<=8||blocked||rest.phase==='waiting'||now-rest.at>=RETURN_LIMIT_MS)){
    restore(f,now);
    return true;
  }
  if(blocked||rest.phase==='waiting'||now-rest.at>=RETURN_LIMIT_MS||!open(f,rest.goal)){
    if(now<(rest.retryAt??0))return true;
    rest.retryAt=now+650;
    const candidates=[18,36,57,82].flatMap(radius=>Array.from({length:8},(_,i)=>({
      x:f.x+Math.cos(i*Math.PI/4)*radius,y:f.y+Math.sin(i*Math.PI/4)*radius,
    })));
    const point=candidates.find(p=>distance(p,rest.goal)>14&&insideHabitat(p,z,18)&&open(f,p));
    if(point){
      rest.goal=point;
      if(rest.phase==='waiting'){rest.at=now;rest.phase='returning';}
    }else{
      rest.phase='waiting';f.state='idle';f.roamTarget=undefined;
      return true;
    }
  }
  f.state='return';
  f.roamTarget=rest.goal;
  return true;
}
