import { groundFootprint } from './GroundOccupancy.js';

const overlaps=(p,w,h,r)=>p.x+w>r.x&&p.x-w<r.x+r.width&&p.y+h>r.y&&p.y-h<r.y+r.height;
const live=npc=>npc.alive&&!npc.ascended;

function nearest(point,isOpen,occupied){
  const free=(x,y)=>isOpen(x,y)&&!occupied.some(other=>Math.hypot(other.x-x,other.y-y)<20);
  for(let radius=8;radius<=384;radius+=8){
    const count=Math.max(8,Math.round(radius*Math.PI/4));
    let best,bestDistance=Infinity;
    for(let i=0;i<count;i++){
      const angle=i/count*2*Math.PI;
      const x=Math.round((point.x+radius*Math.cos(angle))/4)*4;
      const y=Math.round((point.y+radius*Math.sin(angle))/4)*4;
      const distance=Math.hypot(x-point.x,y-point.y);
      if(distance<bestDistance&&free(x,y)){best={x,y};bestDistance=distance}
    }
    if(best)return best;
  }
  return null;
}

export function placeCityResidents(npcs,citySolids,terrainOpen,connected,markers,fresh){
  const inNewSolid=(point,hw,hh)=>point&&citySolids.some(r=>overlaps(point,hw,hh,r));
  const occupied=npcs.filter(n=>live(n)&&!inNewSolid(n,groundFootprint(n).width/2,groundFootprint(n).height/2));
  const homes=markers.filter(m=>m.id.startsWith('residence-'));
  let nextHome=0,moved=0;
  for(const n of npcs){
    if(!live(n))continue;
    const {width,height}=groundFootprint(n),hw=width/2,hh=height/2;
    const open=(x,y)=>terrainOpen(x,y,hw+1,hh+1)&&connected({x,y});
    if(inNewSolid(n,hw,hh)){
      const next=nearest(n,open,occupied);
      if(!next)throw new Error('Không tìm thấy vị trí hợp lệ gần '+n.id);
      Object.assign(n,next);
      occupied.push(n);
      moved++;
    }
    if(fresh&&n.spawnRegionId==='city'&&n.authorityRole!=='city_master'&&['commoner','merchant','independent_cultivator'].includes(n.populationRole)&&homes.length){
      const home=homes[nextHome++%homes.length];
      n.home={x:home.x,y:home.y};
    }
    for(const field of ['home','workPosition','actionTarget']){
      const point=n[field];
      if(!inNewSolid(point,hw,hh))continue;
      const next=nearest(point,open,[]);
      if(next)n[field]=next;
    }
    for(const point of n.patrolPoints??[]){
      if(!inNewSolid(point,hw,hh))continue;
      const next=nearest(point,open,[]);
      if(next)Object.assign(point,next);
    }
  }
  return moved;
}
