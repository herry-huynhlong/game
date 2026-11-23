const STATIONS=new Set(['work','farm','trade','shop','eat','rest','cultivate','socialize','patrol','guard']);
const OFFSETS=[[0,0]];
for(const radius of [24,45,66])for(let i=0;i<8;i++){
  const angle=i*Math.PI/4;
  OFFSETS.push([Math.round(radius*Math.cos(angle)),Math.round(radius*Math.sin(angle))]);
}

export class WorkstationSlots {
  constructor(open,reachable){
    this.open=open;
    this.reachable=reachable;
    this.claims=new Map();
  }

  release(id){this.claims.delete(id);}

  prune(npcs,possessedId){
    const valid=new Map(npcs.filter(n=>n.alive&&!n.ascended&&n.id!==possessedId&&STATIONS.has(n.goalAction)).map(n=>[n.id,n.goalAction]));
    for(const [id,claim] of this.claims)if(valid.get(id)!==claim.action)this.release(id);
  }

  reserve(npc,anchor,retry=false){
    if(!anchor||!STATIONS.has(npc.goalAction)){
      this.release(npc.id);
      return anchor;
    }
    const key=npc.goalAction+':'+anchor.x+':'+anchor.y;
    const current=this.claims.get(npc.id);
    if(current?.key===key&&!retry)return current;
    this.release(npc.id);
    const separation=20;
    const nearby=[...this.claims.values()].filter(p=>Math.abs(p.x-anchor.x)<90&&Math.abs(p.y-anchor.y)<90);
    for(let slot=0;slot<OFFSETS.length;slot++){
      if(retry&&slot===current?.slot)continue;
      const [dx,dy]=OFFSETS[slot], point={x:anchor.x+dx,y:anchor.y+dy};
      if(nearby.some(p=>Math.hypot(p.x-point.x,p.y-point.y)<separation)||!this.open(npc,point.x,point.y)||!this.reachable(npc,point))continue;
      const claim={...point,key,slot,npcId:npc.id,action:npc.goalAction,anchorX:anchor.x,anchorY:anchor.y,refuge:anchor.refuge??false};
      this.claims.set(npc.id,claim);
      return claim;
    }
    if(retry&&current?.key===key){this.claims.set(npc.id,current);return current;}
    return null;
  }
}
