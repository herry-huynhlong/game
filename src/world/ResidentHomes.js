import { cultivationStats } from '../systems/CultivationSystem.ts';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function distributeResidentHomes(scene){
  const world=scene.populationWorld;
  if(world.population.homeLayout===3)return;
  const markers=scene.markers.filter(p=>/^residence-\d+$/.test(p.id));
  const original=world.npcs.filter(n=>n.home&&!n.homeId?.startsWith('merchant-home:'));
  const centers=scene.markers.filter(m=>['forest-outer','south-outskirts'].includes(m.id));
  const affected=original.filter(n=>!n.homeId?.startsWith('residence-')&&
    (centers.some(p=>distance(p,n.home)<235)||n.populationRole==='low_disciple'));
  const occupied=original.filter(n=>!affected.includes(n)).map(n=>n.home);
  const dorm=scene.markers.find(m=>m.id==='sect-dorm');
  const campus=scene.markers.find(m=>m.id==='sect-yard');
  const sectLodgings=[dorm,campus].filter(Boolean).flatMap(anchor=>[
    [-208,126],[-200,-113],[185,-105],[181,98],[0,-180],[-82,166],[90,164],
  ].map(([x,y],index)=>({x:anchor.x+x,y:anchor.y+y,id:'sect-lodging-'+anchor.id+'-'+index})));
  for(const n of affected){
    const nearest=[...(n.populationRole==='low_disciple'?sectLodgings:markers)].sort((a,b)=>distance(n.home,a)-distance(n.home,b));
    const home=nearest.flatMap(m=>[[0,28],[-56,18],[56,20],[-61,73],[62,73],[0,93]].map(([x,y])=>({
      x:m.x+x,y:m.y+y,address:m.id,
    }))).find(p=>occupied.every(h=>distance(h,p)>=58)&&scene.monsterSafe(p)&&
      scene.footprintTerrainOpen(p.x,p.y,13,7)&&scene.canReachPoint(n,p));
    if(!home)continue;
    n.home={x:home.x,y:home.y};
    n.homeId=home.address;
    occupied.push(n.home);
  }
  world.population.homeLayout=3;
}

export function reviewMeditation(scene,n,now){
  if(n.alive&&n.goalAction==='flee'&&n.home&&distance(n,n.home)<82&&scene.monsterSafe(n)&&now>=(n.faunaEvadeUntil??0))
    n.safety=Math.min(100,n.safety+.26);
  if(!n.alive||n.manualMeditation||n.tribulation||n.goalAction!=='cultivate'){
    delete n.meditationSession;
    return;
  }
  const session=n.meditationSession??={until:now+78+(n.aiProfile?.seed??0)%68};
  const hp=cultivationStats(n).hpMax;
  if(now<session.until&&n.hunger<71&&n.fatigue<74&&n.hp>=hp*.52)return;
  delete n.meditationSession;
  n.meditationBreakUntil=now+72+(n.aiProfile?.seed??0)%65;
  n.decisionSlot=undefined;
  n.goalAction=n.hunger>=71?'eat':'rest';
  n.shortGoal='Kết thúc phiên đả tọa, đánh giá lại nhu cầu';
  n.actionTarget=n.home??{x:n.x,y:n.y};
  scene.cultivation.spots.release(n);
  scene.resetNpcRoute(n);
}
