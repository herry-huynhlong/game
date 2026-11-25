import { groundFootprint } from './GroundOccupancy.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clearance=[[0,0],[18,0],[-18,0],[0,13],[0,-13]];

export class MeditationSpots {
  constructor(scene){
    this.scene=scene;
    this.reserved=new Map();
    this.blockedApproaches=new Map();
    this.spots=[];
    this.protected=scene.markers.filter(m=>/gate-|bridge|entrance|stall|quest-office/.test(m.id));
    for(const id of ['sect-yard','south-outskirts','forest-outer']){
      const origin=scene.markers.find(m=>m.id===id);
      if(!origin)continue;
      for(let y=-168;y<=168;y+=29)for(let x=-192;x<=192;x+=32){
        // Leave regularly spaced aisles through each group.
        if(Math.abs(x)<64||Math.abs(y)<=28)continue;
        const point={x:origin.x+x,y:origin.y+y};
        if(this.safe(point))this.spots.push(point);
      }
    }
    for(const npc of scene.populationWorld.npcs){
      if(!npc.meditationSpot)continue;
      if(npc.alive&&npc.goalAction==='cultivate'&&this.safe(npc.meditationSpot)&&!this.taken(npc,npc.meditationSpot)){
        this.reserved.set(npc.id,npc.meditationSpot);
      }else delete npc.meditationSpot;
    }
  }

  safe(p){
    const scene=this.scene;
    if(this.protected.some(m=>distance(m,p)<(m.id.includes('bridge')||m.id.startsWith('gate-')?88:39)))return false;
    return clearance.every(([x,y])=>{
      const px=p.x+x,py=p.y+y,tile=scene.roadLayer?.data[Math.floor(py/32)]?.[Math.floor(px/32)];
      return !(tile?.index>=0)&&!scene.monsterWater(px,py)&&scene.footprintTerrainOpen(px,py,12,7);
    });
  }

  taken(npc,p){
    for(const [id,spot] of this.reserved)if(id!==npc.id&&distance(spot,p)<27)return true;
    return false;
  }

  open(npc,p){
    return this.scene.groundOccupancy.open({id:npc.id,...groundFootprint(npc,false,true)},p.x,p.y);
  }

  reserve(npc,manual=false){
    const deferred=this.blockedApproaches.get(npc.id),now=this.scene.scheduler.time;
    if(!manual&&deferred&&now<deferred.retry)return null;
    if(deferred&&now>=deferred.until)this.blockedApproaches.delete(npc.id);
    const avoiding=this.blockedApproaches.get(npc.id);
    const old=this.reserved.get(npc.id);
    if(!manual&&old&&this.open(npc,old))return old;
    const formation=npc.decisionSlot==='sect-campus:array'&&this.campus;
    const choices=formation?Array.from({length:8},(_,i)=>formation.site('seat-'+i)).filter(Boolean):this.spots;
    const selected=manual?(this.safe(npc)&&!this.taken(npc,npc)&&this.open(npc,npc)?{x:npc.x,y:npc.y}:null):
      choices.filter(p=>!this.taken(npc,p)&&this.open(npc,p)&&this.scene.canReachPoint(npc,p)&&
        (!avoiding||avoiding.spots.every(q=>distance(p,q)>28)&&this.segmentTo(npc,p)))
        .sort((a,b)=>distance(npc,a)-distance(npc,b))[0];
    if(!selected)return null;
    npc.meditationSpot=selected;
    this.reserved.set(npc.id,selected);
    return selected;
  }

  segmentTo(npc,p){
    const grid=this.scene.groundOccupancy,body=grid.bodies.get(npc.id);
    return body&&distance(npc,p)<140&&grid.clearSegment(body,npc,p);
  }
  relocate(npc,old){
    const now=this.scene.scheduler.time,prior=this.blockedApproaches.get(npc.id);
    const avoided=[...(prior?.spots??[]).slice(-3),old];
    this.blockedApproaches.set(npc.id,{spots:avoided,retry:0,until:now+24000});
    this.release(npc);
    const next=this.reserve(npc);
    if(!next)this.blockedApproaches.get(npc.id).retry=now+5400;
    return next;
  }

  release(npc){
    this.reserved.delete(npc.id);
    delete npc.meditationSpot;
  }
}
