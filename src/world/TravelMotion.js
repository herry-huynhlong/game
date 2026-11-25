export const travelDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function travelSpeed(current,max,remaining,dt,arrival){
  // Limit the braking envelope to the final destination. Corners retain momentum.
  const braking=arrival?Math.max(12,Math.sqrt(2*210*Math.max(0,remaining-3))):max;
  const desired=Math.min(braking,max);
  return Math.min(desired,current+170*dt/1000);
}

export function stableFacing(entry,dx,dy,time){
  if(Math.hypot(dx,dy)<.15)return entry.direction??'down';
  const direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
  const prior=entry.direction;
  if(!prior||direction===prior)return direction;
  const opposite=(prior==='right'&&direction==='left')||(prior==='left'&&direction==='right')||
    (prior==='up'&&direction==='down')||(prior==='down'&&direction==='up');
  if(time<(entry.facingUntil??0))return prior;
  if(opposite&&time-(entry.lastTurnAt??-Infinity)<420)entry.oscillations=(entry.oscillations??0)+1;
  entry.lastTurnAt=time;entry.facingUntil=time+145;
  return direction;
}

export function newTravelWatch(npc,target,time){
  return {x:npc.x,y:npc.y,goal:{x:target.x,y:target.y},best:travelDistance(npc,target),since:time,meters:0};
}

export function observeTravel(watch,npc,time,headingAround=false){
  const moved=Math.hypot(npc.x-watch.x,npc.y-watch.y);
  watch.meters+=moved;watch.x=npc.x;watch.y=npc.y;
  const next=travelDistance(npc,watch.goal);
  if(next<watch.best-7||headingAround&&watch.meters>35){
    watch.best=Math.min(watch.best,next);watch.since=time;watch.meters=0;
  }
}
