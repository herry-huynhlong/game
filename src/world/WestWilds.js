import { ITEM_CATALOG } from '../dao/ItemCatalog.ts';
import { EconomySystem as Economy } from '../dao/EconomySystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';

const itemDefinition=id=>ITEM_CATALOG[id];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const herbIds=['qingling_herb','purple_jade_fungus','violet_mist_flower','thunder_fruit','ancient_blood_lotus'];
const actors=new Set(['herb_gatherer','hunter','low_disciple','elder','independent_cultivator']);
const night=minute=>minute<300||minute>=1140;
const count=(n,id)=>Economy.count(n.inventory,id);

export class WestWilds {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.state=this.world.westWilds??={harvest:{}};
    const objects=name=>scene.map.getObjectLayer(name)?.objects??[];
    const prop=(o,p)=>scene.prop(o,p);
    this.regions=objects('RegionMarkers').filter(o=>prop(o,'westWilds')).map(o=>({
      id:prop(o,'regionId'),name:o.name,danger:prop(o,'danger'),realm:prop(o,'realm'),minRealm:prop(o,'minRealm'),x:o.x,width:o.width,
    }));
    this.pockets=objects('WestPoison');
    this.nodes=objects('WestResources').map(o=>({id:prop(o,'nodeId'),zone:prop(o,'zone'),grade:prop(o,'grade'),
      x:o.x,y:o.y,nightOnly:prop(o,'nightOnly'),regen:prop(o,'regen'),itemId:herbIds[prop(o,'grade')]}));
    this.nodesById=new Map(this.nodes.map(n=>[n.id,n]));
    this.fog=scene.add.graphics().setDepth(9);
    for(const n of this.nodes)n.sprite=scene.add.image(n.x,n.y,'di-mach-wild-herbs',n.grade+20).setOrigin(.5,.9).setDepth(n.y+1);
    for(const shop of this.world.shops.filter(s=>s.id==='sect-treasure-pavilion'||s.id==='city-apothecary')){
      for(const id of [...herbIds,'detox_pill']){
        shop.buyPrices[id]??=ITEM_CATALOG[id].value;
        shop.sellPrices[id]??=Math.ceil(ITEM_CATALOG[id].value*1.25);
      }
    }
  }

  get now(){const {day,minute}=this.world.clock;return day*1440+minute;}
  regionAt(x){return this.regions.find(r=>x>=r.x&&x<r.x+r.width);}
  ready(node){return (this.state.harvest[node.id]??0)<=this.now&&(!node.nightOnly||night(this.world.clock.minute));}
  journal(n,message){const e=n.westJourney; if(e)(e.log??=[]).push(message);if(e?.log.length>6)e.log.shift();}

  allowed(n,region){
    const stats=cultivationStats(n),hp=n.hp/stats.hpMax,qi=n.mp/stats.mpMax;
    const risk=n.realmIndex+(n.realmLevel??1)*.035+(n.aiProfile?.axes.courage??50)/350+
      (count(n,'detox_pill') ? .22 : 0)+(count(n,'protective_talisman') ? .10 : 0)+
      (count(n,'iron_sword')||count(n,'iron_dao') ? .06 : 0);
    return hp>=.72&&qi>=.32&&n.fatigue<70&&(n.westPoison??0)<35&&risk>=region.minRealm&&
      (region.id!=='west-forbidden'||n.realmIndex>=3);
  }

  harvest(n,node){
    if(!node||!this.ready(node)||distance(n,node)>32||!this.scene.clearFaunaLine(n,node)||n.realmIndex<this.regionAt(node.x).minRealm)return false;
    const amount=node.grade>2?1:2;
    this.state.harvest[node.id]=this.now+node.regen;
    Economy.add(n.inventory,node.itemId,amount);
    if(n.westJourney){n.westJourney.collected={itemId:node.itemId,amount};this.journal(n,`Thu hoạch ${itemDefinition(node.itemId).name} ×${amount}.`);}
    this.scene.requestBackgroundSave();
    return true;
  }

  missionRules(){
    return this.regions.filter(r=>['west-outer','west-inner','west-poison'].includes(r.id)).sort((a,b)=>a.minRealm-b.minRealm).map(r=>{
      const {itemId}=this.nodes.find(n=>n.zone===r.id);
      return {type:'expedition-'+r.id,name:'Dược liệu từ '+r.name,zone:r.name,westRegion:r.id,difficulty:r.danger,
        item:itemId,realm:r.minRealm,quantity:2,demand:4,reward:18+r.minRealm*16,merit:3+r.minRealm*2,outside:true};
    });
  }

  pursueOrder(n,order,campus){
    const region=this.regions.find(r=>r.id===order.westRegion);
    if(!region)return;
    if(!this.allowed(n,region)){
      campus.move(n,n.home,'west-shelter','rest');
      return;
    }
    const claimed=new Set(this.world.npcs.filter(a=>a.westJourney?.status==='outbound'&&a!==n).map(a=>a.westJourney.nodeId));
    const other=this.world.npcs.filter(a=>a!==n).map(a=>campus.orderFor(a)?.westNode);
    const nodes=this.nodes.filter(node=>node.zone===region.id&&!claimed.has(node.id)&&!other.includes(node.id)&&
      this.ready(node)&&this.scene.canReachPoint(n,node));
    const target=nodes.find(node=>node.id===order.westNode)??nodes.sort((a,b)=>distance(n,a)-distance(n,b))[0];
    if(!target){delete order.westNode;campus.move(n,n.home,'west-shelter','rest');return;}
    order.westNode=target.id;
    campus.move(n,target,'west-order','gather');
    if(distance(n,target)<=26&&this.harvest(n,target))delete order.westNode;
  }

  interact(n){
    const node=this.nodes.find(p=>distance(n,p)<=30);
    if(!node)return false;
    this.scene.worldPopulationToast(this.harvest(n,node)?`Đã thu hoạch ${itemDefinition(node.itemId).name}.`:
      `${itemDefinition(node.itemId).name} · ${this.ready(node)?'Cần cảnh giới phù hợp và đường tiếp cận trống.':node.nightOnly&&!night(this.world.clock.minute)?'Nở vào ban đêm.':'Đang mọc lại.'}`);
    return true;
  }

  poison(n){
    let p=n.westPoison??0;
    if(n.x>=0&&p===0)return;
    const pocket=!n.flight&&!n.skyStep&&this.pockets.find(r=>n.x>=r.x&&n.x<=r.x+r.width&&n.y>=r.y&&n.y<=r.y+r.height);
    p=pocket?Math.min(100,p+Math.max(.7,3.7-n.realmIndex*.8)-(count(n,'protective_talisman')?.45:0)):Math.max(0,p-(n.action==='rest'?3.5:1.5));
    if(p>=40&&Economy.remove(n.inventory,'detox_pill',1)){p=Math.max(0,p-55);this.journal(n,'Dùng Giải Độc Đan.');}
    if(p>=45){n.fatigue=Math.min(100,n.fatigue+.65);n.mp=Math.max(0,n.mp-.7);}
    if(p>=70)n.hp=Math.max(1,n.hp-1.3);
    n.westPoison=p;
  }

  tick(){
    const now=this.now, minute=this.world.clock.minute;
    const npcs=this.world.npcs;
    const claimed=new Set(npcs.filter(n=>n.alive&&n.westJourney?.status==='outbound').map(n=>n.westJourney.nodeId));
    let active=npcs.filter(n=>n.alive&&n.westJourney&&n.westJourney.status!=='finished').length;
    for(const n of npcs){
      if(!n.alive||n.underground||n.decisionSlot?.startsWith('civic:'))continue;
      this.poison(n);
      if(this.scene.recovery?.drives(n)||this.scene.westTreasures?.directs(n))continue;
      if(this.scene.expeditions?.has(n)||n.id===this.scene.possessedNpcId||n.flight||n.skyStep||n.wallLevel||n.tribulation||n.lawResponse?.status==='responding'||n.marketVisit||n.manualMeditation)continue;
      const e=n.westJourney;
      if(e&&e.status!=='finished'){
        this.advance(n,e);
        continue;
      }
      if(active>=3||!this.free(n))continue;
      if((minute<360||minute>1090)&&(n.aiProfile?.axes.courage??0)<68)continue;
      if((now+this.scene.stableHash(n.id))%61!==0)continue;
      const usedByOrder=this.scene.sectCampus.state.orders.find(o=>o.status==='active'&&o.westNode)?.westNode;
      const candidates=this.nodes.filter(node=>node.id!==usedByOrder&&!claimed.has(node.id)&&this.ready(node)&&
        this.allowed(n,this.regionAt(node.x))&&this.scene.canReachPoint(n,node));
      candidates.sort((a,b)=>b.grade-a.grade||distance(a,n)-distance(b,n));
      const node=candidates[0];if(!node)continue;
      if(node.zone==='west-poison'&&!count(n,'detox_pill')&&this.scene.merchants.start(n,{
        side:'buy',itemId:'detox_pill',count:1,preferred:'sect-treasure-pavilion',onlyPreferred:true,
      }))continue;
      claimed.add(node.id);
      const partner=active<2&&node.grade<=2&&!node.nightOnly&&this.scene.stableHash(n.id+':'+this.world.clock.day)%3===0?
        npcs.find(other=>other!==n&&other.alive&&distance(n,other)<115&&this.free(other)&&
          this.allowed(other,this.regionAt(node.x))&&this.scene.canReachPoint(other,node)):null;
      this.start(n,node,partner?.id);
      active++;
      if(partner){this.start(partner,node,n.id,true);active++;}
    }
  }

  free(n){
    return n.id!==this.scene.possessedNpcId&&n.authorityRole!=='city_master'&&actors.has(n.populationRole)&&
      (!n.westJourney||n.westJourney.status==='finished'&&(n.westJourney.retryAt??0)<=this.now)&&
      !n.faunaHuntTargetId&&!this.scene.sectCampus.orderFor(n)&&!n.assignedMissionId&&!n.assignedCommissionId&&
      !n.meditationSpot&&!n.manualMeditation&&!n.tribulation&&!n.flight&&!n.skyStep&&!n.wallLevel&&!n.marketVisit&&!n.lawResponse&&
      !['fight','flee'].includes(n.goalAction)&&!/^(society|sect-campus|board|mandate):/.test(n.decisionSlot??'')&&n.hunger<=68;
  }

  start(n,node,partnerId,escort=false){
    n.westJourney={nodeId:node.id,zone:node.zone,status:'outbound',since:this.now,partnerId,escort,log:[]};
    this.journal(n,partnerId?`Đi cùng đồng đội tìm ${itemDefinition(node.itemId).name}.`:`Khởi hành tìm ${itemDefinition(node.itemId).name}.`);
    this.direct(n,escort?this.escortPoint(n,node):node,'travel');
  }

  escortPoint(n,node){
    const options=[{x:node.x,y:node.y-38},{x:node.x-38,y:node.y},{x:node.x+38,y:node.y}];
    return options.find(p=>this.scene.canOccupy(p.x,p.y)&&this.scene.canReachPoint(n,p))??{x:node.x+48,y:node.y};
  }

  directs(n){return n.decisionSlot==='west:explore'&&n.westJourney?.status!=='finished';}
  direct(n,target,action){
    if(n.decisionSlot==='west:explore'&&n.goalAction===action&&distance(n.actionTarget,target)<4)return;
    n.decisionSlot='west:explore';n.goalAction=action;n.action='travel';n.actionTarget={x:target.x,y:target.y};
    this.scene.workstations.release(n.id);
    this.scene.resetNpcRoute(n);
    n.shortGoal=action==='flee'?'Rút về chỗ an toàn':action==='rest'?'Về nhà sau chuyến đi':'Khám phá '+this.regionAt(target.x)?.name;
  }

  advance(n,e){
    const node=this.nodesById.get(e.nodeId),home=n.home??this.scene.markerRegion('forest');
    if(e.status==='outbound'){
      const realm=beast=>beast.realmIndex??Number(beast.rank==='elite');
      const threat=this.world.environment.fauna.find(f=>f.alive&&distance(f,n)<105&&
        (realm(f)>n.realmIndex||f.targetNpcId===n.id&&n.hp<cultivationStats(n).hpMax*.78));
      const partner=e.partnerId&&this.scene.scheduler.byId.get(e.partnerId)?.npc, teammate=partner?.westJourney;
      const matching=partner?.alive&&teammate?.nodeId===e.nodeId&&teammate?.since===e.since;
      const unsafe=(n.westPoison??0)>=45||n.hp<cultivationStats(n).hpMax*.6||n.goalAction==='flee'||threat||this.now-e.since>210||matching&&teammate.status==='retreat';
      if(e.escort&&!unsafe&&node&&matching&&teammate.status==='outbound'&&this.ready(node)){
        this.direct(n,this.escortPoint(n,node),'travel');return;
      }
      if(e.escort){e.status=matching&&teammate.status==='returning'?'returning':'retreat';}
      else {
        if(!unsafe&&node&&this.ready(node)&&distance(n,node)>26){this.direct(n,node,'travel');return;}
        const collected=!unsafe&&this.harvest(n,node);
        if(collected&&matching&&teammate.status==='outbound'&&distance(partner,node)<85&&e.collected.amount>1){
          Economy.remove(n.inventory,node.itemId,1);Economy.add(partner.inventory,node.itemId,1);e.collected.amount--;
          teammate.collected={itemId:node.itemId,amount:1};this.journal(partner,`Được chia ${itemDefinition(node.itemId).name} ×1.`);
        }
        if(!collected)this.journal(n,unsafe?'Rút lui vì nguy hiểm hoặc quá thời gian tìm đường.':'Linh thảo chưa thể thu hoạch.');
        e.status=collected?'returning':'retreat';
      }
    }
    if(distance(n,home)<=34){e.status='finished';e.retryAt=this.now+240;n.decisionSlot=undefined;n.goalAction='rest';this.journal(n,'Đã trở về nơi an toàn.');this.scene.requestBackgroundSave();return;}
    this.direct(n,home,e.status==='retreat'?'flee':'rest');
  }

  update(time){
    if(time<(this.nextUpdate??0))return;
    this.nextUpdate=time+150;
    const view=this.scene.cameras.main.worldView;
    for(const n of this.nodes){
      const inside=n.x>view.x-40&&n.x<view.right+40&&n.y>view.y-40&&n.y<view.bottom+40;
      n.sprite.setVisible(inside);
      if(!inside)continue;
      const left=Math.max(0,(this.state.harvest[n.id]??0)-this.now);
      const growth=left/n.regen;
      const phase=left?(growth>.94?5:growth>.74?0:growth>.53?1:growth>.28?2:3):n.nightOnly&&!night(this.world.clock.minute)?3:4;
      const frame=n.grade+5*phase;
      if(Number(n.sprite.frame.name)!==frame)n.sprite.setFrame(frame);
    }
    this.fog.clear();
    if(view.x>=0)return;
    const dark=night(this.world.clock.minute);
    for(const r of this.pockets){
      if(r.x>view.right||r.x+r.width<view.x||r.y>view.bottom||r.y+r.height<view.y)continue;
      this.fog.fillStyle(0x8a679f,.17).fillRect(r.x,r.y,r.width,r.height);
      for(let i=0;i<15;i++){
        const x=Math.round(r.x+((i*43+time/95)%r.width)),y=r.y+8+(i*79)%(r.height-16);
        this.fog.fillStyle(0xbba7d1,.17).fillRect(x,y,17+i%4*6,2+i%3);
      }
    }
    if(dark)for(const n of this.nodes){
      if(!n.sprite.visible)continue;
      const x=n.x+Math.round(20*Math.sin(time/680+n.x)),y=n.y-23+Math.round(10*Math.sin(time/570+n.y));
      this.fog.fillStyle(0xe9d89a,.6+.25*Math.sin(time/400+n.x)).fillRect(x,y,2,2);
    }
  }
}
