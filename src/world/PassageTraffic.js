export class PassageTraffic {
  constructor(gates,open=()=>true){
    this.open=open;
    this.gates=gates.map(({a,b,id,clear=53})=>{
      const horizontal=Math.abs(a.x-b.x)>Math.abs(a.y-b.y);
      const gate={id,horizontal,x:(a.x+b.x)/2,y:(a.y+b.y)/2,approach:clear+71,clear,requests:new Map(),current:null};
      gate.lanes=[12,16,20].find(offset=>[-offset,offset].every(across=>
        Array.from({length:Math.ceil((clear+7)*2/6)+1},(_,i)=>this.position(gate,
          Math.min(clear+7,i*6-clear-7),across)).every(p=>open(p))))??0;
      return gate;
    });
  }

  position(g,along,across){
    return g.horizontal?{x:g.x+along,y:g.y+across}:{x:g.x+across,y:g.y+along};
  }

  release(id){
    for(const gate of this.gates){
      gate.requests.delete(id);
      if(gate.current===id)gate.current=null;
    }
  }

  guide(npc,target,time){
    for(const gate of this.gates){
      const {horizontal,x,y,approach,clear,requests}=gate;
      const along=horizontal?npc.x-x:npc.y-y,across=horizontal?npc.y-y:npc.x-x;
      const go=horizontal?target.x-x:target.y-y;
      const direction=Math.sign(go);
      for(const [id,r] of requests)if(!r.actor.alive||r.actor.flight||time-r.seen>2600){
        requests.delete(id);
        if(gate.current===id)gate.current=null;
      }
      let request=requests.get(npc.id);
      if(request&&(direction!==request.direction||along*direction>=clear||Math.abs(across)>140)){
        requests.delete(npc.id);
        if(gate.current===npc.id)gate.current=null;
        request=null;
      }
      if(!request){
        if(Math.abs(along)>approach||Math.abs(across)>85||Math.abs(go)<clear||along*direction>=0)continue;
        request={actor:npc,direction,seen:time,entered:time,stage:'approach',progress:along*direction,advanced:time};
        requests.set(npc.id,request);
      }
      request.seen=time;
      if(along*direction>request.progress+5){request.progress=along*direction;request.advanced=time;}
      if(gate.lanes){
        const lane=direction*gate.lanes;
        const entry=this.position(gate,-direction*(clear+7),lane);
        if(request.stage==='approach'&&(Math.hypot(npc.x-entry.x,npc.y-entry.y)<7||
          along*direction>=-clear-7&&Math.abs(across-lane)<=9||along*direction>-clear+8))request.stage='cross';
        return {id:gate.id,stage:request.stage,target:request.stage==='approach'?entry:this.position(gate,direction*(clear+6),lane)};
      }
      // Gates with insufficient clearance retain a single admission token.
      const owner=requests.get(gate.current);
      if(owner&&time-owner.advanced>3800&&owner.progress<(-clear+14)&&requests.size>1){
        owner.deferUntil=time+1600;owner.entered=time;owner.advanced=time;gate.current=null;
      }
      if(!gate.current){
        const queue=[...requests.values()].sort((a,b)=>a.entered-b.entered);
        const first=queue.find(r=>time>=(r.deferUntil??0))??queue[0];
        gate.current=first.actor.id;first.advanced=time;
      }
      if(gate.current!==npc.id&&Math.abs(along)>Math.max(31,clear-24)){
        if(!request.bay){
          const stops=[35,59,83,107].flatMap(depth=>[42,-42,70,-70].map(offset=>
            this.position(gate,-direction*(clear+depth),offset)));
          request.bay=stops.filter(p=>this.open(p)&&![...requests.values()].some(r=>r.bay&&Math.hypot(p.x-r.bay.x,p.y-r.bay.y)<22))
            .sort((a,b)=>Math.hypot(npc.x-a.x,npc.y-a.y)-Math.hypot(npc.x-b.x,npc.y-b.y))[0]??{x:npc.x,y:npc.y};
        }
        return {id:gate.id,wait:true,target:request.bay};
      }
      request.bay=null;
      const entry=this.position(gate,-direction*(clear+11),0);
      if(request.stage==='approach'&&(Math.hypot(npc.x-entry.x,npc.y-entry.y)<5||along*direction>-clear+8))request.stage='cross';
      return {id:gate.id,stage:request.stage,target:request.stage==='approach'?entry:this.position(gate,direction*(clear+6),0)};
    }
    return null;
  }
}
