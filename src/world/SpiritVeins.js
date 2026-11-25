import {migrateVeins,normalizeTitles} from './VeinMigration.js';
import { EconomySystem } from '../dao/EconomySystem.ts';

const grades=['Hạ phẩm','Trung phẩm','Thượng phẩm','Cực phẩm'];
const items=['spirit_stone_low','spirit_stone_middle','spirit_stone_high','spirit_stone_supreme'];
const worth=[1,3,6,10];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export class SpiritVeins {
  constructor(campus){
    this.campus=campus;
    this.scene=campus.scene;
    this.state=campus.state.spiritVeins??={};
    const points=this.scene.map.getObjectLayer('SpiritVeins')?.objects??[];
    migrateVeins(campus.world,points.find(point=>this.scene.prop(point,'veinId')==='sect-jade'));
    this.sites=new Map();
    for(const point of points){
      const get=key=>this.scene.prop(point,key), id=get('veinId'), grade=get('grade');
      const max=get('capacity'),minutes=18+grade*7, recovery=720+grade*360;
      const state=this.state[id]??={amount:max,owner:get('owner')||null,discovered:!get('hidden'),renewAt:0};
      // Older saves have no lifetime extraction counter. The current deficit is a known lower bound.
      state.initial??=max;
      state.mined??=Math.max(0,state.initial-state.amount);
      this.sites.set(id,{id,point,grade,max,minutes,recovery,state,name:point.name,item:items[grade-1],
        quality:grades[grade-1],region:get('region'),guard:get('guard'),worth:worth[grade-1]});
    }
    normalizeTitles(this.sites.values(),campus.world.factions);
  }

  guard(site){
    const fauna=this.campus.world.environment.fauna;
    if(!site.guard)return null;
    if(site.state.guardId)return fauna.find(f=>f.id===site.state.guardId&&f.alive)??null;
    const territory=this.scene.faunaZones.find(z=>z.zoneId===site.region)?.territories?.[site.guard];
    if(!territory||site.point.x<territory.x||site.point.x>territory.x+territory.width||
      site.point.y<territory.y||site.point.y>territory.y+territory.height)return null;
    return fauna.filter(f=>f.alive&&f.species===site.guard&&f.zoneId===site.region)
      .sort((a,b)=>distance(a.home,site.point)-distance(b.home,site.point))[0]??null;
  }

  authorized(n,site){
    if(this.scene.civic)return this.scene.civic.canMine(n,site);
    return Boolean(site&&n.alive&&n.realmIndex>=site.grade-1&&(!site.state.owner||
      site.state.owner===this.campus.vault.id&&n.faction===this.campus.vault.name));
  }

  rules(){
    const at=this.campus.now(),vault=this.campus.vault;
    if(vault.wealth>=110||this.campus.state.orders.some(q=>q.veinId&&['open','active'].includes(q.status)))return [];
    return [...this.sites.values()].filter(s=>s.grade===1&&s.state.discovered&&s.state.amount>=2&&!this.guard(s)&&
      (s.state.owner===vault.id||!s.state.owner)&&at>=(s.state.nextOrderAt??0))
      .sort((a,b)=>(a.state.lastMined??0)-(b.state.lastMined??0)).slice(0,1)
      .map(s=>({type:'spirit-vein:'+s.id,veinId:s.id,item:s.item,quantity:2,demand:2,reward:2*s.worth-1,
        realm:s.grade-1,merit:s.grade+1,name:'Khai thác '+s.name,zone:s.region,difficulty:s.quality,outside:true}));
  }

  update(){
    const at=this.campus.now();
    for(const site of this.sites.values()){
      const {state,point}=site;
      if(site.sprite){
        const ratio=state.amount/site.max,frame=site.grade+5*(ratio===0?3:ratio<.34?2:ratio<.76?1:0);
        if(Number(site.sprite.frame.name)!==frame)site.sprite.setFrame(frame);
      }
      if(site.guard){
        if(!state.guardId){state.guardId=this.guard(site)?.id;}
        else if(!this.guard(site)){
          state.guardRenewAt??=at+720;
          if(at>=state.guardRenewAt){delete state.guardId;delete state.guardRenewAt;state.guardId=this.guard(site)?.id;}
        }
      }
      if(state.amount<site.max&&at>=state.renewAt){
        state.amount++;
        state.renewAt=at+site.recovery;
        this.scene.requestBackgroundSave();
      }
      const scout=!state.discovered&&this.campus.world.npcs.find(n=>n.alive&&!n.underground&&n.realmIndex>=site.grade-1&&distance(n,point)<=74);
      if(scout)this.reveal(site,scout);
    }
  }

  reveal(site,n){
    if(site.state.discovered)return;
    site.state.discovered=true;
    const {day,minute}=this.campus.world.clock,events=this.campus.world.events;
    events.push({id:'spirit-vein-found:'+site.id,type:'vein-discovered',day,minute,actorId:n.id,status:'completed',
      description:n.name+' đã phát hiện '+site.name+' · '+site.quality+'.'});
    if(events.length>400)events.shift();
    this.scene.requestBackgroundSave();
  }

  mine(n,q){
    if(this.scene.underground?.workOrder(n,q.veinId,q))return;
    const site=this.sites.get(q.veinId);
    if(!site||!this.authorized(n,site)||!site.state.amount||this.guard(site)||
      !this.scene.canReachPoint(n,site.point)){
      // Let the normal expiry path refund escrow if the site remains unavailable.
      q.workUntil=null;
      this.campus.move(n,n.home??n,'production-wait','rest');
      return;
    }
    this.campus.move(n,site.point,'spirit-vein','work');
    if(distance(n,site.point)>15){q.workUntil=null;return;}
    q.workUntil??=this.campus.now()+site.minutes;
    if(this.campus.now()<q.workUntil)return;
    const amount=Math.min(site.state.amount,q.quantity-(q.collected??0));
    if(amount<=0)return;
    q.collected=(q.collected??0)+this.extract(n,site,amount);
    q.workUntil=null;
  }

  extract(n,site,requested){
    if(!this.authorized(n,site)||!site.state.discovered||this.guard(site)||distance(n,site.point)>30)return 0;
    const amount=Math.min(site.state.amount,Math.floor(requested));
    if(amount<=0)return 0;
    const now=this.campus.now(),state=site.state;
    if(state.amount===site.max)state.renewAt=now+site.recovery;
    state.amount-=amount;state.mined+=amount;state.lastMined=now;
    EconomySystem.add(n.inventory,site.item,amount);
    this.campus.production.note('spiritMined',n,site.id,site.item,amount);
    return amount;
  }

  settle(q){
    const site=this.sites.get(q.veinId);
    if(!site||!EconomySystem.remove(this.campus.vault.treasury,site.item,q.quantity))return;
    this.campus.vault.wealth+=q.quantity*site.worth;
    site.state.nextOrderAt=this.campus.now()+360;
  }
}
