import { faunaHabitat } from './FaunaHabitat.js';

const CELL=12;
const AXES=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const TURN=[0,1,-1,2,-2,3,-3,4];
const STANCE={wolf:36,boar:43,toad:86};
export const MONSTER_MOVEMENT=Object.freeze({
  arrival:2,waypointArrival:5,goalRefresh:26,blockedAfter:650,loopAfter:2500,retryAfter:320,avoidHold:780,
  facingHold:230,yieldHold:1800,maxFailures:3,maxExpanded:820,routeBudgetMs:85,
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const at=(p,x,y)=>({x:p.x+x,y:p.y+y});
const habitatGap=(z,x,y,hw,hh)=>Math.max(0,z.x+hw-x,x+hw-z.x-z.width,z.y+hh-y,y+hh-z.y-z.height);
const unit=(a,b)=>{const d=distance(a,b)||1;return{x:(b.x-a.x)/d,y:(b.y-a.y)/d}};
const facing=(x,y)=>Math.abs(x)>Math.abs(y)?x<0?'west':'east':y<0?'north':'south';
const snapshot=p=>p&&{x:p.x,y:p.y};

/** Owns the monster ground transform. Generic NPC recovery never writes it. */
export class MonsterMovement {
  constructor(grid,zones,{safe=()=>false,water=()=>false}={}){
    this.grid=grid;this.zones=new Map(zones.map(z=>[z.zoneId,z]));
    this.safe=safe;this.water=water;
    this.states=new Map();this.slots=new Map();this.events=[];this.now=0;this.nextSearch=0;
  }
  state(actor){
    let s=this.states.get(actor.id);
    if(!s){
      s={path:[],index:0,failures:0,repaths:0,stuckCount:0,stuckMs:0,recovered:0,abandoned:0,turns:0,
        noProgress:0,velocity:{x:0,y:0},lastMoving:0,neighbors:[],blocked:null,reason:'idle'};
      this.states.set(actor.id,s);
    }
    return s;
  }
  begin(now,actors){
    this.now=now;
    if(now<(this.nextMaintenance??0))return;
    this.nextMaintenance=now+150;
    const active=new Set(actors.filter(a=>a.alive).map(a=>a.id));
    for(const id of this.states.keys())if(!active.has(id))this.states.delete(id);
    for(const [id,slot] of this.slots){
      const body=this.grid.bodies.get(slot.target);
      if(!active.has(id)||!body?.actor.alive||this.grid.bodies.get(id)?.actor.targetNpcId!==slot.target)this.slots.delete(id);
    }
    for(const body of this.grid.recover(12,b=>active.has(b.id),(b,x,y)=>this.terrain(b,x,y))){
      const {actor,x,y}=body;
      Object.assign(actor,{x,y});
      const s=this.state(actor);
      s.overlapRecovery=(s.overlapRecovery??0)+1;
      s.reason='tách footprint từ vị trí đã lưu';
    }
  }
  terrain(body,x,y,padding=0){
    const z=faunaHabitat(this.zones.get(body.actor.zoneId),body.actor.species),hw=body.width/2+padding,hh=body.height/2+padding,p={x,y};
    if(!z)return false;
    const gap=habitatGap(z,x,y,hw,hh);
    const reentering=gap>0&&body.actor.recovery?.phase==='returning'&&gap<=habitatGap(z,body.actor.x,body.actor.y,hw,hh);
    if(gap>0&&!reentering||this.safe(p))return false;
    if(body.floor===2)return this.grid.mapOpen(x,y,hw,hh,body);
    return !this.water(x,y,hw,hh)&&this.grid.mapOpen(x,y,hw,hh,body);
  }
  line(body,a,b,dynamic=false,padding=0,spacing=3){
    const d=distance(a,b),count=Math.max(1,Math.ceil(d/spacing));
    for(let i=1;i<=count;i++){
      const x=a.x+(b.x-a.x)*i/count,y=a.y+(b.y-a.y)*i/count;
      if(!this.terrain(body,x,y,padding)||(dynamic&&!this.grid.open(body,x,y)))return false;
    }
    return true;
  }
  approach(actor,target,prefer=STANCE[actor.species]??37){
    const body=this.grid.bodies.get(actor.id),current=this.slots.get(actor.id);
    if(!body)return undefined;
    if(current?.target===target.id&&distance(current.anchor,target)<MONSTER_MOVEMENT.goalRefresh&&
      this.terrain(body,current.point.x,current.point.y)&&
      (distance(actor,current.point)<8||this.grid.open(body,current.point.x,current.point.y)))return current.point;
    this.slots.delete(actor.id);
    const theta=Math.atan2(actor.y-target.y,actor.x-target.x);
    const base=Math.round(theta/(Math.PI/4));
    for(const offset of TURN){
      const sector=(base+offset+8)%8,angle=sector*Math.PI/4;
      const point=at(target,Math.cos(angle)*prefer,Math.sin(angle)*prefer);
      if([...this.slots.values()].some(s=>s.target===target.id&&Math.abs(s.point.x-point.x)<(s.width+body.width)/2+2&&Math.abs(s.point.y-point.y)<(s.height+body.height)/2+2))continue;
      if(!this.terrain(body,point.x,point.y)||!this.grid.open(body,point.x,point.y))continue;
      if(!this.line(body,point,target))continue;
      this.slots.set(actor.id,{target:target.id,sector,anchor:snapshot(target),point,width:body.width,height:body.height});return point;
    }
    return undefined;
  }
  record(actor,s,reason){
    this.events.push({at:this.now,id:actor.id,species:actor.species,rank:actor.rank,position:snapshot(actor),
      previousPosition:snapshot(s.previousPosition),goal:snapshot(s.goal),waypoint:snapshot(s.path[s.index]),blocked:s.blocked,neighbors:[...s.neighbors],reason});
    if(this.events.length>180)this.events.shift();
  }
  halt(actor,reason='đứng theo trạng thái',preserveProgress=false){
    const s=this.state(actor);
    s.velocity={x:0,y:0};if(!preserveProgress)s.noProgress=0;s.reason=reason;
  }
  commit(actor,body,position,substep,reason){
    const s=this.state(actor),dx=position.x-actor.x,dy=position.y-actor.y;
    s.previousPosition=snapshot(actor);
    Object.assign(actor,position);
    s.velocity={x:dx*1000/substep,y:dy*1000/substep};s.lastMoving=this.now;s.distance=(s.distance??0)+Math.hypot(dx,dy);
    s.reason=reason;
    if(!actor.cast&&Math.hypot(dx,dy)>.35){
      const direction=facing(dx,dy);
      if(!actor.direction)actor.direction=direction;
      if(direction===actor.direction)s.facingCandidate=null;
      else if(direction!==s.facingCandidate){
        s.facingCandidate=direction;s.facingSince=this.now;
      }else if(this.now>=Math.max(s.facingSince+100,s.nextFacing??0)){
        actor.direction=direction;s.turns++;s.nextFacing=this.now+MONSTER_MOVEMENT.facingHold;
        s.facingCandidate=null;
      }
    }
  }
  sweep(body,point){
    // One swept footprint for locomotion and casts, including habitat and shore.
    return this.grid.advance(body,point.x,point.y,false,(x,y)=>this.terrain(body,x,y));
  }
  skill(actor,point){
    const body=this.grid.bodies.get(actor.id);
    if(!body)return false;
    const move=this.sweep(body,point);
    if(!move){this.halt(actor,'kỹ năng bị chặn');return false;}
    this.commit(actor,body,move,50,'kỹ năng');
    return true;
  }
  route(actor,goal,step,speed){
    const body=this.grid.bodies.get(actor.id);
    if(!body)return 'unreachable';
    const s=this.state(actor),cfg=MONSTER_MOVEMENT;
    if(!goal){this.halt(actor);return 'waiting';}
    if(s.failedGoal&&distance(s.failedGoal,goal)<cfg.goalRefresh&&this.now<s.failedUntil){
      this.halt(actor,'đích bị khóa tạm sau khi thử lại');return 'unreachable';
    }
    if(!s.goal||distance(s.goal,goal)>cfg.goalRefresh){
      s.goal=snapshot(goal);s.path=[];s.index=0;s.failures=0;s.noProgress=0;s.blocked=null;
      s.forceSearch=false;s.avoid=null;s.retryAt=0;s.netAnchor=null;
    }
    if(distance(body,goal)<=cfg.arrival&&this.line(body,body,goal,true)){
      this.halt(actor,'đã đến');s.path=[];s.index=0;
      return 'arrived';
    }
    if(!s.path.length){
      if(this.now<(s.retryAt??0)){this.halt(actor,'chờ tìm lại đường');return 'waiting';}
      if(!s.forceSearch&&this.line(body,body,s.goal)){
        s.path=[s.goal];s.index=0;
      }else{
        if(this.now<this.nextSearch){this.halt(actor,'chờ lượt tìm đường');return 'waiting';}
        this.nextSearch=this.now+cfg.routeBudgetMs;
        s.repaths++;s.path=this.findPath(body,s.goal,s.blocked==='actor');s.index=0;
        if(!s.path.length)return this.fail(actor,s,s.blocked==='actor'?'đường đang bị cá thể khác chắn':'không có đường hợp lệ');
      }
    }
    while(s.index<s.path.length){
      const next=s.path[s.index+1],radius=next?cfg.waypointArrival:cfg.arrival;
      if(distance(body,s.path[s.index])>radius||next&&!this.line(body,body,next))break;
      s.index++;
    }
    const waypoint=s.path[s.index];
    if(!waypoint){
      s.path=[];s.index=0;
      if(distance(body,goal)<=cfg.arrival&&this.line(body,body,goal,true)){this.halt(actor,'đã đến');return 'arrived';}
      if(s.fallback){s.fallback=false;return this.fail(actor,s,'đã tới điểm gần nhất, đích còn bị chặn');}
      s.goal=snapshot(goal);return 'waiting';
    }
    const amount=Math.min(step*speed/1000,distance(body,waypoint)),v=unit(body,waypoint);
    if(!s.netAnchor||distance(body,s.netAnchor)>32){
      s.netAnchor=snapshot(body);s.netSince=this.now;
    }else if(this.now-s.netSince>=cfg.loopAfter){
      s.noProgress=Math.max(s.noProgress,this.now-s.netSince);
      s.blocked='actor';
      return this.stuck(actor,s,'di chuyển quanh một vị trí');
    }
    s.heading=v;
    const old=distance(body,waypoint);
    const projected=at(body,v.x*amount,v.y*amount);
    let movement=null,reason='theo tuyến';
    if(s.yieldTo&&this.now<(s.yieldUntil??0)){
      const other=this.grid.bodies.get(s.yieldTo);
      const clear=!other||distance(body,other)>86||((other.x-body.x)*s.yieldVector.x+(other.y-body.y)*s.yieldVector.y)<-10;
      if(clear){s.yieldTo=undefined;s.avoid=null;}
      else{
        movement=this.goAside(body,s,amount);
        if(movement){this.commit(actor,body,movement,step,'lùi vào chỗ nhường');return 'moving';}
        this.halt(actor,'đang nhường '+other.id);return 'waiting';
      }
    }else s.yieldTo=undefined;
    if(s.avoid&&this.now<s.avoid.until){
      if(s.avoid.exit&&distance(body,s.avoid.point)<3){
        s.avoid.point=s.avoid.exit;s.avoid.exit=null;
      }
      movement=this.goAside(body,s,amount);
      if(movement)reason='giữ bên đi vòng';
      else s.avoid=null;
    }else s.avoid=null;
    if(!movement&&!s.avoid){
      const terrain=this.terrain(body,projected.x,projected.y);
      const look=at(body,v.x*Math.min(distance(body,waypoint),amount+13),v.y*Math.min(distance(body,waypoint),amount+13));
      const ahead=[...this.grid.near(body.x,body.y,body.radius+54)].filter(other=>other!==body&&
        Math.abs(look.x-other.x)<(body.width+other.width)/2+6&&Math.abs(look.y-other.y)<(body.height+other.height)/2+6);
      s.neighbors=ahead.map(b=>b.id);
      if(terrain&&this.grid.open(body,projected.x,projected.y)&&(!ahead.length||this.grid.open(body,look.x,look.y))){
        movement=this.sweep(body,projected);
      }else if(terrain&&ahead.length){
        s.blocked='actor';
        const other=ahead[0];
        const otherState=this.states.get(other.id),heading=otherState?.heading;
        const alignment=heading?v.x*heading.x+v.y*heading.y:0;
        const inQueue=alignment>.65&&otherState?.reason!=='đã đến'&&
          this.now-(otherState.lastMoving??0)<1400;
        if(inQueue&&!this.grid.open(body,look.x,look.y)){
          this.halt(actor,'chờ cá thể cùng chiều',true);
          return 'waiting';
        }
        const clearance=(body.width+other.width)/2+15;
        const sidePoints=[1,-1].flatMap(sign=>[23,29,17].map(offset=>{
          const point=at(body,-v.y*sign*offset+v.x*9,v.x*sign*offset+v.y*9);
          return {point,exit:alignment<-.3?at(point,v.x*clearance,v.y*clearance):null};
        }));
        const side=sidePoints.find(({point,exit})=>this.line(body,body,point,true)&&(!exit||this.line(body,point,exit,true)));
        if(side){
          s.avoid={...side,until:this.now+cfg.avoidHold+(side.exit?500:0)};
          movement=this.goAside(body,s,amount);reason='đi vòng cá thể';
        }else if(alignment<-.2&&other.category===2&&body.id.localeCompare(other.id)>0&&
          (s.lastYield!==other.id||this.now>=(s.yieldRetry??0))){
          const bay=this.yieldBay(body,v);
          if(bay){
            s.yieldTo=other.id;s.yieldVector=v;s.yieldUntil=this.now+cfg.yieldHold;
            s.lastYield=other.id;s.yieldRetry=s.yieldUntil+1400;
            s.avoid={point:bay,until:s.yieldUntil};
            movement=this.goAside(body,s,amount);reason='lùi vào chỗ nhường';
          }
        }
        if(!movement&&this.grid.open(body,projected.x,projected.y))movement=this.sweep(body,projected);
      }else s.blocked='terrain';
    }
    if(movement){
      this.commit(actor,body,movement,step,reason);
      if(old-distance(body,waypoint)>.25){s.noProgress=0;s.blocked=null;if(s.wasStuck){s.recovered++;s.wasStuck=false;}s.forward=(s.forward??0)+(old-distance(body,waypoint));if(s.forward>65){s.failures=0;s.forward=0;}}
      else if(!s.avoid)s.noProgress+=step;
      else s.noProgress=Math.min(s.noProgress,cfg.blockedAfter/2);
      if(s.noProgress>=cfg.blockedAfter)return this.stuck(actor,s,'đổi hướng không tiến gần waypoint');
      return 'moving';
    }
    s.velocity={x:0,y:0};
    s.reason=s.blocked==='terrain'?'vật cản địa hình':'chờ khoảng trống';
    s.noProgress+=step;
    if(s.noProgress>=cfg.blockedAfter)return this.stuck(actor,s,s.reason);
    return 'waiting';
  }
  goAside(body,s,max){
    const point=s.avoid?.point;
    if(!point||distance(body,point)<3)return null;
    const v=unit(body,point),step=Math.min(max*.78,distance(body,point));
    return this.sweep(body,at(body,v.x*step,v.y*step));
  }
  yieldBay(body,v){
    for(const backward of [32,52,74])for(const side of [18,-18,0]){
      const p=at(body,-v.x*backward-v.y*side,-v.y*backward+v.x*side);
      if(this.line(body,body,p,true))return p;
    }
    return null;
  }
  stuck(actor,s,reason){
    s.stuckCount++;s.stuckMs+=s.noProgress;s.longestStall=Math.max(s.longestStall??0,s.noProgress);s.wasStuck=true;
    this.record(actor,s,reason);
    return this.fail(actor,s,reason);
  }
  fail(actor,s,reason){
    s.failures++;s.forward=0;s.netAnchor=null;s.path=[];s.index=0;s.forceSearch=true;s.avoid=null;s.noProgress=0;s.reason=reason;
    s.retryAt=this.now+MONSTER_MOVEMENT.retryAfter*Math.min(s.failures,3);
    if(s.failures<MONSTER_MOVEMENT.maxFailures+(s.blocked==='actor'?2:0))return 'waiting';
    s.abandoned++;s.failedGoal=s.goal;s.failedUntil=this.now+6400;s.goal=null;
    this.slots.delete(actor.id);
    this.record(actor,s,'bỏ đích: '+reason);
    return 'unreachable';
  }
  findPath(body,goal,dynamic){
    const s=this.state(body.actor),origin=snapshot(body),nodes=new Map(),pending=[];
    s.fallback=false;
    const key=(x,y)=>x*4096+y;
    const add=(x,y,g,parent)=>{
      const p=at(origin,x*CELL,y*CELL),h=distance(p,goal);
      const node={x,y,p,g,h,parent,score:g+h,closed:false};
      nodes.set(key(x,y),node);pending.push(node);return node;
    };
    const start=add(0,0,0,null),clearance=this.terrain(body,origin.x,origin.y,1.25)?1.25:0;
    let best=start,found=null;
    for(let expanded=0;pending.length&&expanded<MONSTER_MOVEMENT.maxExpanded;){
      let i=0;for(let j=1;j<pending.length;j++)if(pending[j].score<pending[i].score)i=j;
      const node=pending[i];pending[i]=pending.at(-1);pending.pop();
      if(node.closed||nodes.get(key(node.x,node.y))!==node)continue;
      expanded++;node.closed=true;
      if(node.h<best.h)best=node;
      if(node.h<27&&this.line(body,node.p,goal,dynamic)){found={p:goal,parent:node};break;}
      for(const [dx,dy] of AXES){
        const x=node.x+dx,y=node.y+dy,g=node.g+(dx&&dy?17:12),prior=nodes.get(key(x,y));
        if(prior&&prior.g<=g)continue;
        const p=at(origin,x*CELL,y*CELL);
        if(!this.line(body,node.p,p,dynamic,node===start?clearance:1.25,node===start?1:3))continue;
        add(x,y,g,node);
      }
    }
    if(!found&&best.h<start.h-20){found=best;s.fallback=true;}
    const points=[];
    for(let node=found;node?.parent;node=node.parent)points.push(node.p);
    // Keep only corners reachable by a straight footprint sweep.
    points.reverse();
    const compact=[];let last=origin;
    for(let i=0;i<points.length;){
      let end=i;
      while(end+1<points.length&&this.line(body,last,points[end+1],dynamic,1.25))end++;
      compact.push(points[end]);last=points[end];i=end+1;
    }
    return compact;
  }
  diagnostics(actors,seed){
    return {seed,clock:this.now,monsters:actors.filter(a=>a.alive).map(a=>{
      const s=this.states.get(a.id),body=this.grid.bodies.get(a.id);
      return {id:a.id,species:a.species,rank:a.rank,state:a.state,position:snapshot(a),previousPosition:snapshot(s?.previousPosition),goal:snapshot(s?.goal??a.roamTarget),
        route:s?.path.slice(s.index).map(snapshot)??[],velocity:this.now-(s?.lastMoving??0)<135?s?.velocity:{x:0,y:0},
        footprint:body&&[body.width,body.height],personalRadius:body?.personalRadius,blocked:s?.blocked,
        neighbors:s?.neighbors??[],waypointDistance:body&&s?.path[s.index]?distance(body,s.path[s.index]):null,
        failedRoutes:s?.failures??0,longestStall:s?.longestStall??0,slot:this.slots.get(a.id)?.sector,stuck:(s?.noProgress??0)>300,stuckMs:s?.stuckMs??0,
        noProgress:s?.noProgress??0,repaths:s?.repaths??0,distance:s?.distance??0,turns:s?.turns??0,
        stuckCount:s?.stuckCount??0,recovered:s?.recovered??0,abandoned:s?.abandoned??0,reason:s?.reason??a.state};
    }),events:[...this.events]};
  }
}
