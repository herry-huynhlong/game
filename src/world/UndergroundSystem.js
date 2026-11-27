import {resolveDamage,healthAtNewMax} from '../systems/CombatBalance.ts';
import {realmBase} from '../systems/RealmConfig.ts';
import { creditDeath } from '../dao/DivinePowerLedger.ts';
import {cultivationStats} from '../systems/CultivationSystem.ts';
import {EconomySystem as Economy} from '../dao/EconomySystem.ts';
import {CAVE_LAYOUT_VERSION,CAVE_ENTRY,CAVE_BEASTS,CAVE_TREASURES,CAVE_FLORA,CAVE_BIOMES,caveBiomeAt,caveCell,caveDistance,caveLine,caveOpen,caveRoute,caveSafePoint,caveStep,createCave,syncCaveStock} from './UndergroundMaps.js';
import {UndergroundView} from './UndergroundView.js';

const entrySlots=[CAVE_ENTRY,{x:3,y:7},{x:3,y:9},{x:4,y:7},{x:4,y:9}];
const groundDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const caveStats=species=>{
  const spec=CAVE_BEASTS[species],base=realmBase(spec);
  return {...base,rank:spec,attack:base.attack*Math.min(1.35,.65+spec.damage/45)};
};
const beastDrops=['demon_core','scorpion_venom','spirit_stone_middle','beast_core_foundation','iron_ore','beast_core_gold'];
const treasureItems=['di_tam_linh_nhu','huyen_tinh_thach','dia_hoa_linh_chi','han_ngoc_tuy','tu_tinh_linh_qua','van_nien_thach_tuy','linh_mach_chi_tam'];

export class UndergroundSystem {
  constructor(scene,interior){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.campus=scene.sectCampus;
    this.veins=this.campus.spiritVeins;
    this.state=this.world.underground??={instances:{}};
    this.sites=new Map();
    this.routes=new Map();
    this.stockVersion=new WeakMap();
    for(const vein of this.veins.sites.values())
      this.register({...vein,kind:'spirit'});
    for(const point of this.campus.production.points){
      const id=scene.prop(point,'id'),state=this.campus.production.state.veins[id];
      if(!state)continue;
      this.register({id,point,state,grade:1,max:state.max,minutes:state.grade===2?29:19,
        item:'iron_ore',kind:'iron',name:point.name||'Mỏ quặng sắt',region:'Thanh Vân Tông'});
    }
    this.view=new UndergroundView(this);
    if(interior)this.sites.set(interior.id,interior);
    for(const npc of this.world.npcs){
      const d=npc.underground;
      if(!d)continue;
      const site=this.sites.get(d.siteId);
      if(!site){delete npc.underground;continue;}
      if(d.layoutVersion!==CAVE_LAYOUT_VERSION){
        d.floor=Math.max(0,Math.min(d.floor??0,site.map.floors.length-1));
        Object.assign(d,caveSafePoint(site.map.floors[d.floor],d),{layoutVersion:CAVE_LAYOUT_VERSION});
        delete d.workAt;delete d.nodeId;
      }
    }
  }

  register(site){
    let map;
    const configured={...site,get map(){return map??=createCave(site);}};
    this.sites.set(site.id,configured);
  }
  observedStock(site){
    const stock={...(this.state.instances[site.id]?.stock??{})};
    syncCaveStock(site.map.nodes,stock,site.state.amount);
    return stock;
  }
  nodeName(site,node){
    const floor=site.map.floors[node.level];
    return (site.kind==='iron'?'Vỉa sắt':'Mạch tinh thể')+' · '+CAVE_BIOMES[caveBiomeAt(floor,node.x,node.y)].name+' '+(Number(node.id.split(':')[1])+1);
  }
  plantStage(site,plant){
    const harvested=this.state.instances[site.id]?.plants?.[plant.id];
    const age=harvested===undefined?plant.age+Math.max(0,this.now-1440):this.now-harvested;
    return harvested!==undefined&&age<95?-1:Math.min(3,Math.floor(age/120));
  }
  get now(){return this.world.clock.day*1440+this.world.clock.minute;}
  save(){this.scene.requestBackgroundSave();}

  instance(site){
    const state=this.state.instances[site.id]??={stock:{},beasts:{},treasures:{},drops:[]};
    if(state.layoutVersion!==CAVE_LAYOUT_VERSION){
      for(const drop of state.drops)Object.assign(drop,caveSafePoint(site.map.floors[drop.level]??site.map.floors[0],drop));
      for(const [level,beast] of Object.entries(state.beasts)){
        const floor=site.map.floors[level];
        if(floor?.lair)Object.assign(beast,{x:floor.lair.x,y:floor.lair.y,life:beast.life??0});
      }
      state.layoutVersion=CAVE_LAYOUT_VERSION;
    }
    if(this.stockVersion.get(state)!==site.state.amount){
      syncCaveStock(site.map.nodes,state.stock,site.state.amount);
      this.stockVersion.set(state,site.state.amount);
    }
    for(const [level,floor] of site.map.floors.entries()){
      if(!floor.lair||state.beasts[level])continue;
      const {x,y,species}=floor.lair;
      state.beasts[level]={id:site.id+':beast:'+level,species,x,y,hp:caveStats(species).hp,combatBalanceVersion:1,phase:'BURIED_IDLE',at:0};
    }
    return state;
  }

  describe(id){
    const site=this.sites.get(id);
    if(!site)return null;
    const state=this.state.instances[id];
    const active=this.world.npcs.filter(n=>n.alive&&n.underground?.siteId===id),stock=this.observedStock(site);
    return {id:site.id,point:site.point,floors:site.map.floors.length,amount:site.state.amount,capacity:site.max,
      empty:site.map.nodes.filter(n=>!stock[n.id]).length,
      danger:site.map.floors.some((floor,level)=>floor.lair&&(state?.beasts[level]?.hp??1)>0),
      parties:new Set(active.map(n=>this.scene.expeditions?.of(n)?.id).filter(Boolean)).size,
      owner:site.state.owner??null,name:site.name,region:site.region,nodes:site.map.nodes.length,
      beasts:site.map.floors.filter(floor=>floor.lair).length,
      active,
      visited:Boolean(state?.visited)};
  }

  canEnter(npc,site,job){
    return Boolean(site&&npc.alive&&!npc.underground&&!npc.tribulation&&!npc.wallLevel&&!npc.flight&&!npc.skyStep&&
      (site.kind==='auction'?this.scene.weeklyAuction?.access(npc,job):
        this.scene.civic?.undergroundAccess(npc,site,job)||site.kind==='iron'||this.veins.authorized(npc,site)&&site.state.discovered&&!this.veins.guard(site)));
  }
  canPlaceOpportunity(site){return site.kind==='iron'||site.kind==='spirit'&&Boolean(site.state.discovered);}

  enter(team,site,job=null,radius=34){
    const arrivals=site?.entrySlots??entrySlots;
    if(!team.length||team.length>arrivals.length||!team.every(n=>this.canEnter(n,site,job)&&groundDistance(n,site.point)<=radius))return false;
    const floor=site.map.floors[0];
    const occupied=new Set(this.world.npcs.filter(n=>n.alive&&n.underground?.siteId===site.id&&n.underground.floor===0)
      .map(n=>caveCell(floor,n.underground)));
    const slots=arrivals.filter(p=>!occupied.has(caveCell(floor,p)));
    if(slots.length<team.length)return false;
    this.instance(site).visited=true;
    for(const [index,n] of team.entries()){
      this.scene.cultivation?.interrupt(n);
      n.faunaHuntTargetId=undefined;
      this.scene.workstations?.release(n.id);
      n.underground={...slots[index],siteId:site.id,floor:0,job,facing:'down',layoutVersion:CAVE_LAYOUT_VERSION};
      if(site.kind==='auction')n.underground.auctionLayout=2;
      n.actionTarget=null;
      n.action='travel';
      n.shortGoal='Đi vào '+site.name;
      this.scene.resetNpcRoute(n);
      this.scene.npcSprites.get(n.id)?.setVisible(false);
    }
    this.scene.syncGroundOccupancy();
    this.save();
    return true;
  }

  enterNearby(npc){
    const target=[...this.sites.values()].find(site=>site.kind!=='auction'&&groundDistance(npc,site.point)<=32);
    if(!target)return false;
    if(!this.enter([npc],target))this.scene.worldPopulationToast('Cửa mỏ chưa mở, đang có yêu thú canh giữ hoặc thân phận chưa phù hợp.');
    else this.view.show(target.id,0);
    return true;
  }

  exit(npc,site){
    const anchor=[site.kind==='auction'?{x:site.point.x,y:site.point.y}:{x:npc.x,y:npc.y},...[16,24,32].flatMap(r=>[[r,0],[-r,0],[0,r],[0,-r]].map(([x,y])=>({x:site.point.x+x,y:site.point.y+y})))].find(p=>
      this.scene.groundPositionOpen(npc,p.x,p.y)&&this.scene.canReachPoint(site.point,p));
    if(!anchor)return false;
    Object.assign(npc,anchor);
    delete npc.underground;
    if(site.kind==='auction')this.scene.weeklyAuction?.clearRoute(npc);
    this.routes.delete(npc.id);
    npc.action='idle';
    npc.shortGoal='Đã trở về mặt đất';
    this.scene.npcSprites.get(npc.id)?.setPosition(npc.x,npc.y);
    this.scene.syncGroundOccupancy();
    if(npc.id===this.scene.possessedNpcId){this.scene.cameras.main.centerOn(npc.x,npc.y);this.view.hide();}
    this.save();
    return true;
  }

  blocked(npc){
    const d=npc.underground,floor=this.sites.get(d.siteId).map.floors[d.floor];
    return new Set(this.world.npcs.filter(n=>n!==npc&&n.alive&&n.underground?.siteId===d.siteId&&n.underground.floor===d.floor)
      .map(n=>caveCell(floor,n.underground)));
  }

  move(npc,point,floor,blocked=this.blocked(npc)){
    const d=npc.underground;
    if(!point||!caveDistance(d,point))return false;
    const key=d.siteId+':'+d.floor+':'+point.x+':'+point.y;
    let route=this.routes.get(npc.id);
    if(route?.key!==key||!route.steps.length||caveDistance(d,route.steps[0])!==1||blocked.has(caveCell(floor,route.steps[0]))){
      if(route?.key===key&&route.retry>this.now)return false;
      const steps=caveRoute(floor,d,point,blocked);
      this.routes.set(npc.id,route={key,steps:steps??[],retry:steps?0:this.now+2});
    }
    if(!route.steps.length)return false;
    for(let i=0;i<2&&route.steps.length;i++){
      const step=route.steps[0];
      if(blocked.has(caveCell(floor,step)))break;
      route.steps.shift();this.walk(d,step);
    }
    npc.action='travel';
    return true;
  }

  walk(actor,step){
    actor.facing=step.x>actor.x?'right':step.x<actor.x?'left':step.y<actor.y?'up':'down';
    actor.x=step.x;
    actor.y=step.y;
  }

  portal(npc,site,direction){
    const d=npc.underground,next=d.floor+direction;
    const floor=site.map.floors[next];
    if(!floor||direction>0&&site.kind==='auction'&&!this.scene.weeklyAuction?.permittedFloor(npc,next))return false;
    const portal=direction>0?floor.entry:floor.down;
    const positions=[portal,{x:portal.x,y:portal.y-1},{x:portal.x,y:portal.y+1}];
    const arrival=positions.find(p=>caveOpen(floor,p.x,p.y)&&!this.world.npcs.some(n=>n!==npc&&n.alive&&n.underground?.siteId===site.id&&n.underground.floor===next&&!caveDistance(p,n.underground)));
    if(!arrival)return false;
    Object.assign(d,arrival,{floor:next});
    this.routes.delete(npc.id);
    this.save();
    return true;
  }

  workOrder(npc,siteId,order){
    const site=this.sites.get(siteId);
    if(!site)return false;
    if(npc.underground)return true;
    if(this.canEnter(npc,site)&&site.state.amount>0&&npc.hp>cultivationStats(npc).hpMax*.5){
      this.campus.move(npc,site.point,'mine','work');
      this.enter([npc],site,{type:'order',id:order.id});
    }
    return true;
  }

  mine(npc,site,state,node,requested){
    if(site.kind==='spirit'&&!this.veins.authorized(npc,site))return 0;
    const count=Math.min(Math.max(0,Math.floor(requested)),state.stock[node.id]??0,site.state.amount);
    if(count<=0)return 0;
    const ledger=site.state;
    if(site.kind==='spirit'&&ledger.amount===site.max)ledger.renewAt=this.now+site.recovery;
    ledger.amount-=count;
    state.stock[node.id]-=count;
    this.stockVersion.set(state,ledger.amount);
    if(site.kind==='spirit'){ledger.mined+=count;ledger.lastMined=this.now;}
    else if(!ledger.amount)ledger.renewAt=this.now+1440;
    Economy.add(npc.inventory,site.item,count);
    this.campus.production.note(site.kind==='iron'?'mined':'spiritMined',npc,site.id,site.item,count);
    return count;
  }

  work(npc,site,state,order){
    const d=npc.underground;
    const reserved=new Set(this.world.npcs.filter(n=>n!==npc&&n.alive&&n.underground?.siteId===site.id)
      .map(n=>n.underground.nodeId).filter(Boolean));
    const node=site.map.nodes.filter(n=>state.stock[n.id]>0&&!reserved.has(n.id))
      .sort((a,b)=>Number(b.id===d.nodeId)-Number(a.id===d.nodeId)||Math.abs(d.floor-a.level)-Math.abs(d.floor-b.level)||
        caveDistance(d,a)-caveDistance(d,b))[0];
    if(!node){if(!site.state.amount)d.returning=true;return;}
    if(d.nodeId!==node.id){d.nodeId=node.id;delete d.workAt;}
    const floor=site.map.floors[d.floor];
    if(node.level!==d.floor){
      const direction=Math.sign(node.level-d.floor),portal=direction>0?site.map.floors[d.floor].down:site.map.floors[d.floor].entry;
      if(caveDistance(d,portal))this.move(npc,portal,floor);
      else this.portal(npc,site,direction);
      return;
    }
    if(caveDistance(d,node)){this.move(npc,node,floor);return;}
    npc.action='work';
    npc.shortGoal='Đang khai thác '+site.name;
    d.workAt??=this.now+site.minutes;
    if(this.now<d.workAt)return;
    const amount=this.mine(npc,site,state,node,order.quantity-(order.collected??0));
    order.collected=(order.collected??0)+amount;
    delete d.workAt;
    if(order.collected>=order.quantity)d.returning=true;
  }

  returnToEntry(npc,site){
    const d=npc.underground,floor=site.map.floors[d.floor];
    delete d.nodeId;
    npc.action='travel';
    npc.shortGoal='Đang tìm đường ra cửa mỏ';
    if(caveDistance(d,floor.entry)){this.move(npc,floor.entry,floor);return;}
    if(d.floor)this.portal(npc,site,-1);
    else this.exit(npc,site);
  }

  orderFor(npc,d){
    if(d.job?.type==='contract'){
      const c=this.scene.civic?.state.contracts[d.job.id];
      return c?.status==='active'&&c.workerId===npc.id&&c.expires>this.now?c:null;
    }
    if(d.job?.type==='order')return this.campus.state.orders.find(q=>q.id===d.job.id&&q.status==='active');
    if(d.job?.type==='party'){
      const party=this.scene.expeditions.state.parties.find(p=>p.id===d.job.id&&p.phase==='field');
      if(!party||party.leader!==npc.id)return null;
      return party.mineWork??={quantity:2,collected:0};
    }
    return null;
  }

  support(npc,site,party){
    const d=npc.underground,lead=this.world.npcs.find(n=>n.id===party.leader&&n.alive)?.underground;
    if(!lead||lead.returning||lead.siteId!==site.id){d.returning=true;return;}
    if(lead.floor!==d.floor){
      const direction=Math.sign(lead.floor-d.floor),portal=direction>0?site.map.floors[d.floor].down:site.map.floors[d.floor].entry;
      if(caveDistance(d,portal))this.move(npc,portal,site.map.floors[d.floor]);
      else this.portal(npc,site,direction);
    }else if(caveDistance(d,lead)>3){
      const floor=site.map.floors[d.floor],blocked=this.blocked(npc);
      const positions=[{x:lead.x+1,y:lead.y},{x:lead.x-1,y:lead.y},{x:lead.x,y:lead.y+1},{x:lead.x,y:lead.y-1}]
        .sort((a,b)=>caveDistance(d,a)-caveDistance(d,b));
      if(positions.some(p=>this.move(npc,p,floor,blocked)))npc.action='guard';
    }else npc.action='guard';
  }

  explore(npc,site,d){
    const party=this.scene.expeditions.of(npc);
    if(!party||party.id!==d.job.id||party.phase!=='field'||party.explored||!this.veins.authorized(npc,site))return false;
    if(party.leader!==npc.id){this.support(npc,site,party);return true;}
    const floor=site.map.floors[d.floor];
    const target=floor.down??floor.rooms.at(-1);
    if(caveDistance(d,target)){this.move(npc,target,floor);npc.shortGoal='Khảo sát '+(target.name??'lối xuống tầng sâu');}
    else if(floor.down)this.portal(npc,site,1);
    else{party.explored=true;this.save();}
    return true;
  }

  restWorker(npc,site,d,manual=false){
    const max=cultivationStats(npc).hpMax;
    if(!manual&&(npc.hp>=max*.77||npc.hp<max*.36))return false;
    const floor=site.map.floors[d.floor],camp=floor.props.find(p=>p.kind==='camp');
    if(caveDistance(d,camp)>2){
      if(manual)return false;
      this.move(npc,camp,floor);return true;
    }
    if(d.lastRest===this.now)return true;
    d.lastRest=this.now;npc.action='rest';npc.shortGoal='Dưỡng thương ở trạm nghỉ';
    npc.hp=Math.min(max,npc.hp+max*.015);npc.fatigue=Math.max(0,npc.fatigue-2);
    return true;
  }

  applyVenom(npc){
    const d=npc.underground;
    if(!d||this.now>(d.venomUntil??0)||this.now<(d.venomTick??Infinity))return;
    d.venomTick=this.now+2;
    npc.hp=Math.max(0,npc.hp-2);
    if(!npc.hp){npc.alive=false;npc.deathCause='Trúng độc dưới lòng đất';creditDeath(this.world,npc,'npc-death',npc.deathCause);delete npc.underground;}
    this.save();
  }

  tick(){
    const active=new Map();
    for(const npc of this.world.npcs){
      const d=npc.underground;
      if(!npc.alive||!d)continue;
      if(!active.has(d.siteId))active.set(d.siteId,[]);
      active.get(d.siteId).push(npc);
    }
    for(const [id,residents] of active){
      const site=this.sites.get(id),state=this.instance(site);
      for(const [level,floor] of site.map.floors.entries()){
        if(floor.lair)this.beastTick(site,state,level,residents.filter(n=>n.underground?.floor===level));
      }
      for(const npc of residents){
        if(!npc.alive)continue;
        if(site.kind==='auction'){
          if(npc.id!==this.scene.possessedNpcId||npc.underground.auctionAssist)this.scene.weeklyAuction.inside(npc);
          continue;
        }
        this.applyVenom(npc);
        if(!npc.alive||npc.id===this.scene.possessedNpcId||this.now<(npc.underground.staggerUntil??0))continue;
        this.scene.opportunities?.tryFind(npc);
        const d=npc.underground,order=this.orderFor(npc,d);
        const status=this.scene.civic?.state.custody[npc.id]?.status;
        if(status==='awaiting-rescue'||status==='detained'){npc.action='idle';continue;}
        if(['law','warrant'].includes(d.job?.type)&&!d.returning&&this.scene.civic?.advanceUnderground(npc,site,d.job))continue;
        if(!d.returning&&d.job?.type==='explore'&&npc.hp>cultivationStats(npc).hpMax*.36&&this.explore(npc,site,d))continue;
        if(!d.returning&&order&&this.restWorker(npc,site,d))continue;
        const party=d.job?.type==='party'&&this.scene.expeditions.state.parties.find(p=>p.id===d.job.id&&p.phase==='field');
        if(d.returning||site.kind==='spirit'&&!this.veins.authorized(npc,site)||npc.hp<=cultivationStats(npc).hpMax*.36||!order&&!party)this.returnToEntry(npc,site);
        else if(order)this.work(npc,site,state,order);
        else this.support(npc,site,party);
      }
      this.save();
    }
    // Finish the retreat animation even if the final occupant already left.
    for(const [id,state] of Object.entries(this.state.instances)){
      const site=this.sites.get(id);
      if(!site||active.has(id))continue;
      this.instance(site);
      for(const level of Object.keys(state.beasts))this.beastTick(site,state,Number(level),[]);
    }
  }

  beastTick(site,state,level,npcs){
    const beast=state.beasts[level],floor=site.map.floors[level],home=floor.lair;
    const spec=CAVE_BEASTS[beast.species],stats=caveStats(beast.species);
    if(beast.combatBalanceVersion!==1){
      beast.hp=healthAtNewMax(beast.hp,spec.hp,stats.hp);
      beast.combatBalanceVersion=1;
    }
    if(beast.hp<=0){
      beast.reviveAt??=this.now+1200+level*180;
      if(this.now<beast.reviveAt||npcs.some(n=>n.underground&&caveDistance(n.underground,home)<8))return;
      Object.assign(beast,{x:home.x,y:home.y,hp:stats.hp,phase:'BURIED_IDLE',at:this.now,life:(beast.life??0)+1});
      delete beast.reviveAt;delete beast.attackAt;this.save();
    }
    const target=npcs.filter(n=>n.alive&&caveDistance(n.underground,home)<=home.radius&&caveLine(floor,n.underground,home))
      .sort((a,b)=>caveDistance(a.underground,beast)-caveDistance(b.underground,beast))[0];
    const phase=(name)=>{beast.phase=name;beast.at=this.now;this.save();};
    switch(beast.phase){
      case 'BURIED_IDLE':
        if(target&&caveDistance(target.underground,home)<=5)phase('DETECTED_TARGET');
        else if(beast.hp<stats.hp&&this.now%5===0){beast.hp=Math.min(stats.hp,beast.hp+stats.hp*.009);this.save();}
        break;
      case 'DETECTED_TARGET': phase(target?'GROUND_WARNING':'BURIED_IDLE');break;
      case 'GROUND_WARNING':
        if(!target)phase('BURROWING');
        else if(this.now-beast.at>=3)phase('EMERGING');
        break;
      case 'EMERGING':
        if(this.now-beast.at>=2)phase('ACTIVE');
        break;
      case 'ACTIVE':
      case 'COMBAT': {
        if(!target){phase('RETURN_HOME');break;}
        const d=target.underground,range=caveDistance(beast,d);
        if(range>1){
          const step=caveStep(floor,beast,d);
          if(step&&(range>spec.range||!caveLine(floor,beast,d)))this.walk(beast,step);
          if(range>spec.range||!caveLine(floor,beast,d))break;
        }
        if(beast.phase!=='COMBAT')phase('COMBAT');
        if(this.now>=(beast.attackAt??0)){
          beast.attackAt=this.now+spec.interval;
          const attackTargets=beast.species===5?npcs.filter(n=>n.underground&&caveDistance(n.underground,beast)<=2):[target];
          for(const rival of attackTargets){
            const defense=cultivationStats(rival).defense;
            rival.hp=Math.max(0,rival.hp-resolveDamage(stats.attack,defense,stats.rank,rival,this.scene.damageModifiers(beast,rival)).damage);
            if(beast.species===1){rival.underground.venomUntil=this.now+8;rival.underground.venomTick=this.now+2;}
            if(beast.species===2)rival.underground.staggerUntil=this.now+2;
            if(beast.species===3)rival.mp=Math.max(0,rival.mp-cultivationStats(rival).mpMax*.04);
            if(!rival.hp){rival.alive=false;rival.deathCause='Yêu thú dưới lòng đất';creditDeath(this.world,rival,'npc-death',rival.deathCause);delete rival.underground;}
          }
          this.save();
        }
        const fighter=npcs.find(n=>n.alive&&n.underground&&n.id!==this.scene.possessedNpcId&&caveDistance(n.underground,beast)<=1);
        if(fighter&&this.now>=(beast.counterAt??0)){
          this.hit(state,beast,fighter,level);
          beast.counterAt=this.now+3;
        }
        break;
      }
      case 'RETURN_HOME': {
        if(!caveDistance(beast,home)){phase('BURROWING');break;}
        const step=caveStep(floor,beast,home);
        if(step)this.walk(beast,step);
        break;
      }
      case 'BURROWING':
        if(this.now-beast.at>=3)phase('BURIED_IDLE');
        break;
    }
  }

  hit(state,beast,npc,level){
    if(beast.hp<=0||!['ACTIVE','COMBAT','RETURN_HOME'].includes(beast.phase))return;
    const target=caveStats(beast.species);
    if(beast.combatBalanceVersion!==1){
      beast.hp=healthAtNewMax(beast.hp,CAVE_BEASTS[beast.species].hp,target.hp);
      beast.combatBalanceVersion=1;
    }
    beast.hp=Math.max(0,beast.hp-resolveDamage(cultivationStats(npc).attack,target.defense,npc,target.rank,this.scene.damageModifiers(npc,beast)).damage);
    if(!beast.hp){
      const life=beast.id+':'+(beast.life??0),spec=CAVE_BEASTS[beast.species];
      const underground={siteId:npc.underground.siteId,floor:level,x:beast.x,y:beast.y};
      creditDeath(this.world,{...beast,...spec,underground},'fauna-death','Bị đánh bại dưới lòng đất',life);
      state.drops.push({id:life,x:beast.x,y:beast.y,level,item:beastDrops[beast.species],claimed:false});
    }
    this.save();
  }

  interact(npc,site,state,mode){
    const d=npc.underground;
    const floor=site.map.floors[d.floor];
    if(mode==='withdraw'&&!floor.props.some(p=>p.kind==='camp'&&caveDistance(d,p)<=2))return false;
    if(caveDistance(d,floor.entry)<=1)return d.floor?this.portal(npc,site,-1):this.exit(npc,site);
    if(site.kind==='auction')return this.scene.weeklyAuction.interactInterior(npc,floor);
    if(this.scene.opportunities?.tryFind(npc,true))return true;
    if(floor.down&&caveDistance(d,floor.down)<=1)return this.portal(npc,site,1);
    const plant=floor.flora.find(p=>caveDistance(d,p)<=1&&CAVE_FLORA[p.type].material&&this.plantStage(site,p)===3);
    if(plant&&!this.world.clock.paused){
      (state.plants??={})[plant.id]=this.now;
      const kind=CAVE_FLORA[plant.type];
      Economy.add(npc.inventory,kind.material==='dia_hoa_linh_chi'?kind.material:'spirit_herb',1);
      this.scene.worldPopulationToast('Đã hái '+kind.name+'.');
      this.save();return true;
    }
    const camp=floor.props.find(p=>p.kind==='camp'&&caveDistance(d,p)<=2);
    if(camp){
      if(mode){
        const cargo=((state.warehouse??={})[npc.id]??=[]);
        const from=mode==='deposit'?npc.inventory:cargo,to=mode==='deposit'?cargo:npc.inventory;
        const warehouse=site.id+':warehouse:'+npc.id;
        if(Economy.transferItem(from,to,site.item,1,mode==='deposit'?npc.id:warehouse,
          mode==='deposit'?warehouse:npc.id,mode==='deposit'?npc:undefined)){
          this.save();
          this.scene.worldPopulationToast(mode==='deposit'?'Đã gửi 1 đơn vị vào kho tạm.':'Đã lấy 1 đơn vị từ kho tạm.');
        }else this.scene.worldPopulationToast('Không có quặng phù hợp để chuyển.');
      }else{d.restUntil=this.now+32;npc.action='rest';}
      return true;
    }
    const drop=state.drops.find(drop=>!drop.claimed&&drop.level===d.floor&&caveDistance(d,drop)<=1);
    if(drop){drop.claimed=true;Economy.add(npc.inventory,drop.item,1);this.save();return true;}
    const treasure=site.map.floors[d.floor].treasure,guard=state.beasts[d.floor];
    if(treasure&&!state.treasures[d.floor]&&caveDistance(d,treasure)<=1&&(!guard?.hp||treasure.type%2===0)){
      state.treasures[d.floor]=npc.id;
      Economy.add(npc.inventory,treasureItems[treasure.type],1);
      this.scene.worldPopulationToast('Đã thu thập '+CAVE_TREASURES[treasure.type]+'.');
      this.save();
      return true;
    }
    const node=site.map.nodes.find(n=>n.level===d.floor&&caveDistance(d,n)<=1);
    if(!node){
      const other=this.scene.scheduler.byId.get(this.selectedNpcId)?.npc;
      if(other!==npc&&other?.underground?.siteId===site.id&&other.underground.floor===d.floor&&caveDistance(other.underground,d)<=2){
        this.scene.worldPopulationToast(other.name+' · '+other.shortGoal);return true;
      }
      return false;
    }
    if(!state.stock[node.id]){this.scene.worldPopulationToast('Điểm khai thác đã cạn.');return true;}
    if(this.world.clock.paused)return true;
    if(this.world.npcs.some(n=>n!==npc&&n.alive&&n.underground?.siteId===site.id&&n.underground.nodeId===node.id)){
      this.scene.worldPopulationToast('Cụm khoáng đang có người khai thác.');return true;
    }
    if(d.nodeId!==node.id){d.nodeId=node.id;d.workAt=this.now+site.minutes;npc.action='work';}
    this.scene.worldPopulationToast('Đang khai thác. Giữ vị trí để hoàn thành.');
    return true;
  }

  control(npc,dt,justDown){
    const d=npc.underground,site=this.sites.get(d.siteId),state=this.instance(site),keys=this.scene.keys;
    const down=(...letters)=>letters.some(key=>keys[key]?.isDown);
    this.view.show(site.id,d.floor,true);
    if(justDown(keys.ESC)){this.view.hide();this.scene.endPossession();return;}
    if(['awaiting-rescue','detained'].includes(this.scene.civic?.state.custody[npc.id]?.status))return;
    if(justDown(keys.E)){this.interact(npc,site,state,down('SHIFT')?'deposit':null);return;}
    if(justDown(keys.R)){this.interact(npc,site,state,'withdraw');return;}
    const dx=Number(down('D','RIGHT'))-Number(down('A','LEFT'));
    const dy=Number(down('S','DOWN'))-Number(down('W','UP'));
    if(dx||dy){delete d.auctionAssist;delete d.auctionSeated;}
    this.inputDelay=Math.max(0,(this.inputDelay??0)-dt);
    if(!this.inputDelay&&(dx||dy)&&this.now>=(d.staggerUntil??0)){
      const step={x:d.x+dx,y:d.y+(dx?0:dy)},floor=site.map.floors[d.floor];
      if(caveOpen(floor,step.x,step.y)&&!this.blocked(npc).has(caveCell(floor,step))){
        this.walk(d,step);
        delete d.nodeId;
        delete d.workAt;
        delete d.restUntil;
        npc.action='travel';
        this.save();
      }
      this.inputDelay=down('SHIFT')?95:145;
    }
    if(this.world.clock.paused)return;
    if(d.nodeId&&this.now>=d.workAt){
      const node=site.map.nodes.find(n=>n.id===d.nodeId);
      if(node&&caveDistance(d,node)<=1)this.mine(npc,site,state,node,1);
      delete d.workAt;
      delete d.nodeId;
    }
    const beast=state.beasts[d.floor];
    if(d.restUntil>=this.now)this.restWorker(npc,site,d,true);
    if(justDown(keys.J)&&this.now>=(d.attackAt??0)){
      const target=this.scene.scheduler.byId.get(this.selectedNpcId)?.npc;
      if(target!==npc&&target?.alive&&target.underground?.siteId===site.id&&target.underground.floor===d.floor&&caveDistance(target.underground,d)<=1){
        this.scene.civic?.undergroundStrike(npc,target);
      }else if(beast&&caveDistance(beast,d)<=1)this.hit(state,beast,npc,d.floor);
      else return;
      d.attackAt=this.now+3;npc.action='fight';
    }
  }
}
