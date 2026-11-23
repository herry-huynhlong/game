export class PassageTraffic {
  constructor(gates){
    this.gates=gates.map(({a,b,id})=>{
      const horizontal=Math.abs(a.x-b.x)>Math.abs(a.y-b.y);
      return {id,horizontal,x:(a.x+b.x)/2,y:(a.y+b.y)/2,approach:Math.hypot(a.x-b.x,a.y-b.y)/2+72,
        core:28,direction:0,until:0,waiting:new Map(),inside:new Map()};
    });
  }

  guide(npc,target,time){
    for(const gate of this.gates){
      const {horizontal,x,y,approach,core}=gate;
      const along=horizontal?npc.x-x:npc.y-y,across=horizontal?npc.y-y:npc.x-x;
      const go=horizontal?target.x-x:target.y-y;
      if(Math.abs(along)>approach||Math.abs(across)>88||Math.abs(go)<core||Math.sign(along)===Math.sign(go))continue;
      const direction=Math.sign(go);
      for(const [id,request] of gate.waiting)if(time-request.seen>2000)gate.waiting.delete(id);
      for(const [id,record] of gate.inside)if(!record.actor.alive||Math.abs((horizontal?record.actor.x-x:record.actor.y-y))>core+14||time-record.seen>2600)gate.inside.delete(id);
      const waiting=gate.waiting.get(npc.id)??{direction,since:time,seen:time};
      waiting.direction=direction;waiting.seen=time;gate.waiting.set(npc.id,waiting);
      const occupying=gate.inside.get(npc.id);
      if(!gate.inside.size&&(!gate.direction||time>=gate.until)){
        const head=[...gate.waiting.values()].sort((a,b)=>a.since-b.since)[0];
        gate.direction=head.direction;gate.until=time+2800;
      }
      const clear=direction===gate.direction&&(time<gate.until||gate.inside.size===0);
      if(!clear&&!occupying&&Math.abs(along)>core+14){
        const side=-direction*52,stop=along;
        const bay=horizontal?{x:x+stop,y:y+side}:{x:x+side,y:y+stop};
        return {wait:true,id:gate.id,target:bay};
      }
      if(Math.abs(along)<=core+14){
        gate.inside.set(npc.id,{actor:npc,direction,seen:time});
        gate.waiting.delete(npc.id);
      }
      // Guide through the opening, retaining the original goal outside it.
      const delta=Math.abs(along)>core+14?-direction*(core+10):direction*(core+17);
      return {id:gate.id,target:horizontal?{x:x+delta,y}:{x,y:y+delta}};
    }
    return null;
  }
}
