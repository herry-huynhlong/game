export class PassageTraffic {
  constructor(gates,open=()=>true){
    this.open=open;
    this.gates=gates.map(({a,b,id})=>{
      const horizontal=Math.abs(a.x-b.x)>Math.abs(a.y-b.y);
      const gate={id,horizontal,x:(a.x+b.x)/2,y:(a.y+b.y)/2,approach:124,clear:53,requests:new Map(),current:null};
      gate.lanes=[12,16,20].find(offset=>[-offset,offset].every(across=>
        Array.from({length:21},(_,i)=>this.position(gate,i*6-60,across)).every(p=>open(p))))??0;
      return gate;
    });
  }

  position(g,along,across){
    return g.horizontal?{x:g.x+along,y:g.y+across}:{x:g.x+across,y:g.y+along};
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
        request={actor:npc,direction,seen:time,entered:time,stage:'approach'};
        requests.set(npc.id,request);
      }
      request.seen=time;
      if(gate.lanes){
        const lane=direction*gate.lanes;
        const entry=this.position(gate,-direction*(clear+7),lane);
        if(request.stage==='approach'&&(Math.hypot(npc.x-entry.x,npc.y-entry.y)<7||along*direction>-clear+8))request.stage='cross';
        return {id:gate.id,stage:request.stage,target:request.stage==='approach'?entry:this.position(gate,direction*(clear+6),lane)};
      }
      // Gates with insufficient clearance retain a single admission token.
      if(!gate.current){
        const first=[...requests.values()].sort((a,b)=>a.entered-b.entered)[0];
        gate.current=first.actor.id;
      }
      if(gate.current!==npc.id&&Math.abs(along)>31){
        if(!request.bay){
          const stops=[88,112,136,160].flatMap(depth=>[42,-42,70,-70].map(offset=>
            this.position(gate,-direction*depth,offset)));
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
