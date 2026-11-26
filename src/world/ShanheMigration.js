export function relocateShanheResidents(scene,world){
  const recent=scene.collisionRects.filter(rect=>rect.kind==='shanhe-cliff'||rect.kind==='shanhe-water');
  if(!recent.length)return;
  const overlap=(p,r)=>p&&p.x+8>r.x&&p.y+5>r.y&&p.x-8<r.x+r.width&&p.y-5<r.y+r.height;
  const open=p=>scene.footprintTerrainOpen(p.x,p.y,8,5);
  function correct(point){
    if(!point||!recent.some(rect=>overlap(point,rect)))return point;
    for(let r=16;r<=720;r+=16){
      for(let i=0;i<16;i++){
        const angle=i*Math.PI/8;
        const candidate={x:Math.round(point.x+r*Math.cos(angle)),y:Math.round(point.y+r*Math.sin(angle))};
        if(open(candidate)&&scene.navComponentAt(candidate)>0)return candidate;
      }
    }
    return point;
  }
  for(const npc of world.npcs){
    if(!npc.alive||npc.underground||npc.wallLevel||npc.flight||npc.skyStep)continue;
    const here=correct(npc);
    if(here!==npc)Object.assign(npc,here);
    npc.home=correct(npc.home);
    npc.actionTarget=correct(npc.actionTarget);
  }
  for(const drop of world.environment.drops??[]){
    if(drop.status!=='ground'||drop.underground)continue;
    const point=correct(drop);
    if(point!==drop)Object.assign(drop,point);
  }
}
