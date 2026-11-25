import { newTravelWatch, observeTravel } from './TravelMotion.js';
import { groundFootprint } from './GroundOccupancy.js';

const HEIGHT = 48;
const SHIFT_MINUTES = 90;
const SIDES = ['north','south','east','west'];
const OUTWARD = {north:'up',south:'down',east:'right',west:'left'};
const REST_SLOT = 9;
const STREET_SLOT = 8;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inRect = (x, y, r) => x >= r.x && y >= r.y && x <= r.x + r.width && y <= r.y + r.height;

export class Ramparts {
  constructor(scene) {
    this.scene = scene;
    const objects = name => scene.map.getObjectLayer(name)?.objects ?? [];
    const prop = (o, key) => scene.prop(o, key);
    this.decks = objects('RampartWalkways');
    this.stairs = objects('RampartStairs').map(r => {
      const upper = { x: prop(r, 'upperX'), y: prop(r, 'upperY') };
      const foot = { x: prop(r, 'footX'), y: prop(r, 'footY') };
      const length = distance(upper, foot);
      const dx = (upper.x - foot.x) / length, dy = (upper.y - foot.y) / length;
      return { ...r, upper, foot, length, dx, dy, side: prop(r, 'side'),
        approach: { x: foot.x - dx * 16, y: foot.y - dy * 16 },
        landing: { x: upper.x + dx * 26, y: upper.y + dy * 26 } };
    });
    this.nodes = objects('RampartPatrol');
    this.corners = this.nodes.filter(o => prop(o,'kind') === 'corner')
      .sort((a,b) => prop(a,'index') - prop(b,'index'));
    this.posts = this.nodes.filter(o => prop(o,'kind') === 'tower');
    this.gates = this.nodes.filter(o => prop(o,'kind') === 'gate');
    this.gatePosts = new Map(this.gates.map(o=>[prop(o,'side'),o]));
    this.guards = new Map();
    this.guardIds = [];
  }

  register(npcs) {
    for (const npc of npcs) {
      if (npc.wallLevel !== undefined && npc.wallLevel !== 1) delete npc.wallLevel;
      if (npc.wallLevel === 1) {
        const {width,height}=groundFootprint(npc);
        if (npc.flight || npc.skyStep || !this.open(npc.x,npc.y,width/2,height/2)) delete npc.wallLevel;
      }
      if (npc.populationRole === 'city_guard') { this.guards.set(npc.id, this.guardIds.length);this.guardIds.push(npc.id); }
    }
  }

  open(x, y, hw, hh) {
    for (const px of [x - hw, x + hw]) for (const py of [y - hh, y + hh]) {
      if (!this.decks.some(r => inRect(px,py,r)) && !this.stairs.some(r => inRect(px,py,r))) return false;
    }
    return true;
  }

  // Sample the full footprint until the point of transition. Both actors still
  // occupy their actual XY, regardless of how they are projected by the renderer.
  transition(body, x, y, assignedStair) {
    for (const r of assignedStair ? [assignedStair] : this.stairs) {
      const lateral = (x-r.foot.x)*r.dy - (y-r.foot.y)*r.dx;
      const halfWidth = (Math.abs(r.dy)*body.width + Math.abs(r.dx)*body.height)/2;
      if (Math.abs(lateral) > 28-halfWidth) continue;
      const next = (x-r.foot.x)*r.dx + (y-r.foot.y)*r.dy;
      const prior = (body.x-r.foot.x)*r.dx + (body.y-r.foot.y)*r.dy;
      if (body.floor === 1 && next <= 9 && prior >= 9 && next < prior) return 0;
      if (body.floor !== 1 && next >= 9 && prior <= 9 && next > prior) return 1;
    }
    return body.floor;
  }

  height(npc) {
    if (npc.wallLevel !== 1) return 0;
    const stair = this.stairs.find(r => inRect(npc.x,npc.y,r) &&
      !this.decks.some(deck => inRect(npc.x,npc.y,deck)));
    if (!stair) return HEIGHT;
    const t = (npc.x-stair.foot.x)*stair.dx + (npc.y-stair.foot.y)*stair.dy;
    return HEIGHT * clamp((t - 9) / (stair.length - 9),0,1);
  }

  depth(npc) {
    if (npc.wallLevel !== 1) return npc.y;
    return npc.y + 160;
  }

  preparePosts() {
    const {scene} = this;
    this.groundPosts = SIDES.map((side,index)=>{
      const gate=scene.markers.find(m=>m.id==='gate-'+side);
      const x=gate.x+(index<2?58:index===2?-36:36);
      const y=gate.y+(index===0?18:index===1?-24:60);
      const position=scene.findOpenPosition(x,y,scene.collisionRects,[]);
      return {...position,name:gate.id};
    });
    this.streetPosts = ['city-center','city-hall-entrance','tavern-entrance','apothecary-entrance']
      .map(id=>scene.markers.find(m=>m.id===id)).filter(Boolean)
      .map(p=>({...scene.findOpenPosition(p.x+22,p.y+18,scene.collisionRects,[]),name:p.id}));
  }

  rotation() {
    const {day,minute}=this.scene.populationWorld.clock;
    const at=day*1440+minute, shift=Math.floor(at/SHIFT_MINUTES);
    if (this.shift?.id===shift) return this.shift;
    const turns=shift%9, cycles=Math.floor(shift/9)%10;
    const occupants=Array.from({length:10},(_,slot)=>(slot-cycles+10)%10);
    for(let i=0;i<turns;i++) [occupants[i],occupants[REST_SLOT]]=[occupants[REST_SLOT],occupants[i]];
    const slots=[];
    occupants.forEach((index,slot)=>slots[index]=slot);
    return this.shift={id:shift,start:shift*SHIFT_MINUTES,occupants,slots};
  }

  role(npc){
    const index=this.guards.get(npc.id);
    return index===undefined ? -1 : this.rotation().slots[index];
  }

  routine(npc) {
    const duty=this.reliefDuty(npc,this.role(npc));
    if(duty<0)return;
    if(duty===REST_SLOT){
      const entry=this.scene.scheduler?.byId.get(npc.id);
      const shift=this.rotation().id;
      if(entry?.guardRest?.shift!==shift){
        const job=entry?.rampartJob;
        const base=job?.stair&&npc.wallLevel?job.stair.approach:job?.ground??{x:npc.x,y:npc.y};
        const choices=[[44,0],[-44,0],[0,44],[0,-44]].map(([x,y])=>({x:base.x+x,y:base.y+y}));
        const position=choices.find(p=>this.scene.groundPositionOpen({...npc,wallLevel:undefined},p.x,p.y)&&
          this.scene.canReachPoint(base,p))??npc.home??base;
        if(entry)entry.guardRest={shift,position};
      }
      return {action:'rest',position:entry?.guardRest?.position??npc.home??npc,name:'Nghỉ giữa ca',slot:'guard-relief'};
    }
    const position=duty<4?this.gatePosts.get(SIDES[duty]):duty<STREET_SLOT?this.groundPosts[duty-4]:this.streetPosts[0];
    return {action:duty>=4&&duty<STREET_SLOT?'guard':'patrol',position,name:duty<4?'Tuần tra trên tường':duty===STREET_SLOT?'Tuần tra nội thành':'Canh cổng thành',slot:'guard-duty:'+duty};
  }

  wantsDuty(npc) {
    const planned=this.role(npc);
    if(planned<0 || !npc.alive || npc.id===this.scene.possessedNpcId || npc.flight || npc.skyStep ||
      npc.lawResponse?.status==='responding' || npc.lawResponse?.status==='at-scene' ||
      npc.tribulation || npc.marketVisit || npc.goalAction==='eat' ||
      ['fight','flee'].includes(npc.goalAction) || /^(need:|mandate:|duel:)/.test(npc.decisionSlot??''))return -1;
    const duty=this.reliefDuty(npc,planned);
    return duty===REST_SLOT?-1:duty;
  }

  reliefDuty(npc,planned){
    if(planned!==REST_SLOT)return planned;
    const job=this.scene.scheduler?.byId.get(npc.id)?.rampartJob;
    const shift=this.rotation(), clock=this.scene.populationWorld.clock;
    if(!job||job.duty<0||!job.onPost||clock.day*1440+clock.minute-shift.start>=55)return planned;
    const incoming=this.guardIds[shift.occupants[job.duty]];
    const relief=this.scene.scheduler.byId.get(incoming)?.rampartJob;
    return relief?.duty===job.duty&&relief.onPost ? planned : job.duty;
  }

  order(entry) {
    const npc = entry.npc;
    const status=npc.lawResponse?.status;
    if (!this.guards.has(npc.id) && !npc.wallLevel && !status) return null;
    const response = status==='responding' || status==='at-scene'
      ? this.scene.scheduler.byId.get(npc.lawResponse.targetId)?.npc : null;
    const suspect = response?.alive && response.wallLevel ? response : null;
    const duty = this.wantsDuty(npc), raised = npc.wallLevel === 1;
    if (!this.corners.length) return null;
    if (duty < 0 && !raised && !suspect) {
      if (entry.rampartJob) this.scene.npcRoutes.delete(npc.id);
      entry.rampartJob = undefined;
      return null;
    }
    if (entry.rampartJob?.duty !== duty || entry.rampartJob.responseId !== suspect?.id) {
      const ground = duty>=4&&duty<STREET_SLOT ? this.groundPosts[duty-4] : null;
      const post = duty>=0&&duty<4 ? this.posts[duty*2+(this.guards.get(npc.id)%2)] : null;
      const stairs = this.stairs;
      const closest = (target, choices) => choices.reduce((best,r) =>
        !best || distance(r.landing,target) < distance(best.landing,target) ? r : best, null);
      entry.rampartJob = { duty, ground, post, responseId:suspect?.id, standingUntil: 0, checkpoint: 0,
        stair: closest(suspect ?? post ?? npc, stairs.filter(r => !post || r.side === this.scene.prop(post,'side'))) };
      this.scene.npcRoutes.delete(npc.id);
      npc.routeIndex = 0;
    }
    const job = entry.rampartJob;
    if (!raised && job.ground) {
      const target=job.alternate??job.ground,d=distance(npc,target);
      if(d<12 || job.handoverAt&&d<28){
        job.onPost=true;
        return {wait:true,direction:OUTWARD[SIDES[duty-4]],state:'guarding',point:target};
      }
      const grid=this.scene.groundOccupancy, body=grid?.bodies.get(npc.id);
      const occupying=d<31&&body&&grid.blockingBody(body,target.x,target.y);
      if(occupying?.actor?.populationRole==='city_guard'){
        job.handoverAt??=this.scene.scheduler.time;
        job.onPost=true;
        return {wait:true,direction:OUTWARD[SIDES[duty-4]],state:'guarding',point:target};
      }
      return {target,point:target,state:'toDuty'};
    }
    if (!raised && duty===STREET_SLOT)
      return this.patrolOrder(entry,this.streetPosts,false);
    if (!raised && distance(npc, job.stair.approach) > 5 && !job.entering) return { target: job.stair.approach };
    if (!raised) {
      job.entering = true;
      return { local: job.stair.landing, stair: job.stair };
    }
    const activeStair = !this.decks.some(r=>inRect(npc.x,npc.y,r)) &&
      this.stairs.find(r=>inRect(npc.x,npc.y,r));
    if (activeStair) {
      return { local:job.post||suspect?activeStair.landing:activeStair.approach, stair:activeStair };
    }
    if (job.entering && distance(npc,job.stair.landing) > 5) return { local: job.stair.landing, stair: job.stair };
    job.entering = false;
    if (suspect) {
      if (distance(npc,suspect) < 34) return { wait:true };
      return { local:this.deckWaypoint(npc,suspect) };
    }
    if (!job.post) {
      if (job.exiting || distance(npc,job.stair.landing) < 5) {
        job.exiting = true;
        return { local: job.stair.approach, stair: job.stair };
      }
      return { local: this.deckWaypoint(npc,job.stair.landing) };
    }
    const gate = this.gatePosts.get(SIDES[duty]);
    return this.patrolOrder(entry,[job.post,gate,this.posts[duty*2+(job.post===this.posts[duty*2]?1:0)]],true);
  }

  patrolOrder(entry,points,raised){
    const {npc,rampartJob:job}=entry;
    if(!raised&&entry.travelWatch&&
      this.scene.scheduler.time-entry.travelWatch.since>=18000&&
      this.scene.scheduler.time>=(entry.nextPatrolRerouteAt??0)){
      const retry=this.scene.scheduler.time;
      entry.nextPatrolRerouteAt=retry+35000;
      for(let step=1;step<points.length;step++){
        const alternate=points[(job.checkpoint+step)%points.length];
        if(!this.scene.canReachPoint(npc,alternate)||!this.scene.groundPositionOpen(npc,alternate.x,alternate.y))continue;
        entry.lastPatrolReroute={at:retry,from:points[job.checkpoint%points.length].name,to:alternate.name};
        job.checkpoint+=step;job.alternate=null;job.standingUntil=0;
        this.scene.resetNpcRoute(npc);
        break;
      }
    }
    const point=points[job.checkpoint%points.length],next=points[(job.checkpoint+1)%points.length];
    const lane=raised?this.patrolLane(point,this.guards.get(npc.id)%2?13:-13):job.alternate??point;
    const state=job.onPost?'patrolling':'toDuty';
    if(distance(npc,lane)<(raised?9:12)){
      job.onPost=true;
      if(!job.standingUntil){
        const seed=this.scene.stableHash(npc.id+':'+job.checkpoint);
        job.standingUntil=this.scene.scheduler.time+2100+seed%4600;
      }
      if(this.scene.scheduler.time>=job.standingUntil){
        job.standingUntil=0;job.alternate=null;job.checkpoint++;
      }
      return {wait:true,direction:raised?OUTWARD[SIDES[job.duty]]:entry.direction,state:'observing',point,next};
    }
    return raised?{local:this.deckWaypoint(npc,lane),state,point,next}:{target:lane,state,point,next};
  }

  patrolLane(target, offset) {
    const segment = this.locate(target);
    return { x: target.x + (segment.dx ? 0 : offset), y: target.y + (segment.dy ? 0 : offset) };
  }

  locate(point) {
    let best, along = 0;
    for (const [index, a] of this.corners.entries()) {
      const b = this.corners[(index+1) % 4];
      const length = distance(a,b), dx = (b.x-a.x)/length, dy = (b.y-a.y)/length;
      const projection = clamp((point.x-a.x)*dx+(point.y-a.y)*dy,0,length);
      const deviation = Math.hypot(point.x-a.x-projection*dx,point.y-a.y-projection*dy);
      if (!best || deviation < best.deviation) best = { index, s: along+projection, dx, dy, deviation };
      along += length;
    }
    return { ...best, circumference: along };
  }

  deckWaypoint(from, to) {
    const a = this.locate(from), b = this.locate(to);
    if (a.index === b.index) return to;
    const clockwise = (b.s-a.s+a.circumference) % a.circumference < a.circumference / 2;
    const index = clockwise ? (a.index+1)%4 : a.index;
    const corner = this.corners[index];
    if (distance(from,corner) > 7) return corner;
    const next = this.corners[(index+(clockwise ? 1 : 3))%4];
    const step = distance(corner,next);
    return { x: corner.x+(next.x-corner.x)*24/step, y: corner.y+(next.y-corner.y)*24/step };
  }

  checkLocalProgress(entry,order){
    const {npc}=entry,time=this.scene.scheduler.time,target=order.local;
    if(!entry.travelWatch||distance(entry.travelWatch.goal,target)>25){
      entry.travelWatch=newTravelWatch(npc,target,time);
      return;
    }
    observeTravel(entry.travelWatch,npc,time);
    const elapsed=time-entry.travelWatch.since;
    entry.maxStuckMs=Math.max(entry.maxStuckMs??0,elapsed);
    if(elapsed<3500||time<(entry.nextRecoveryAt??0))return;
    entry.nextRecoveryAt=time+3900+entry.index%5*210;
    const grid=this.scene.groundOccupancy,body=grid.bodies.get(npc.id);
    if(!body)return;
    const d=distance(npc,target);
    if(d<6)return;
    const vx=(target.x-npc.x)/d,vy=(target.y-npc.y)/d;
    const blocker=grid.blockingBody(body,npc.x+vx*9,npc.y+vy*9);
    entry.blockerId=blocker?.id??null;
    entry.routeFailure=blocker?'rampart-occupied':'rampart-edge';
    for(const offset of [17,-17,26,-26]){
      const bay={x:npc.x-vy*offset-vx*5,y:npc.y+vx*offset-vy*5};
      if(grid.clearSegment(body,npc,bay)){
        entry.rampartYield={...bay,until:time+1300};
        break;
      }
    }
  }

  move(entry, sprite, order, delta) {
    const npc = entry.npc, yielding=entry.rampartYield;
    let target=order.local;
    if(target&&yielding){
      if(yielding.until>this.scene.scheduler.time&&distance(npc,yielding)>4)target=yielding;
      else entry.rampartYield=null;
    }
    entry.rampartStair = order.stair;
    let moved = false;
    if (target) {
      const d = distance(npc,target), step = Math.min(d, delta * .048);
      const dx = target.x - npc.x, dy = target.y - npc.y;
      const motion = d > .01 && this.scene.moveOnGround(npc,sprite,npc.x + dx/d*step,npc.y + dy/d*step);
      if (motion) {
        npc.x = motion.x; npc.y = motion.y;
        sprite.setPosition(npc.x,npc.y);
        entry.direction = Math.abs(dx)>Math.abs(dy) ? (dx<0?'left':'right') : (dy<0?'up':'down');
        moved = true;
        if(!yielding){entry.blockerId=null;entry.routeFailure=null;}
      }
    }
    entry.rampartStair = undefined;
    if(order.direction)entry.direction=order.direction;
    sprite.setDepth(this.depth(npc)).setData('moving',moved);
    if (sprite.visible) sprite.play(this.scene.npcTextureFor(npc) + '_' + (moved?'walk':'idle') + '_' + (entry.direction??'down'),true);
    npc.pathBlocked = Boolean(target&&!moved&&distance(npc,target)>4);
    npc.action = moved ? 'travel' : order.wait&&entry.rampartJob?.duty>=0 ? 'guard' : npc.wallLevel ? 'guard' : npc.action;
    return moved;
  }
}
