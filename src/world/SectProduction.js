import { EconomySystem as Economy } from '../dao/EconomySystem.ts';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export class SectProduction {
  constructor(campus) {
    this.campus=campus;
    this.scene=campus.scene;
    this.world=campus.world;
    this.points=[...campus.points.values()].filter(p=>this.scene.prop(p,'site')==='farm'||this.scene.prop(p,'site')==='mine');
    this.state=campus.state.production??={fields:{},veins:{},totals:{},history:[]};
    for(const p of this.points){
      const id=this.scene.prop(p,'id');
      if(this.scene.prop(p,'site')==='farm')this.state.fields[id]??={phase:0,output:this.scene.prop(p,'crop')};
      else this.state.veins[id]??={amount:this.scene.prop(p,'capacity'),max:this.scene.prop(p,'capacity'),
        grade:this.scene.prop(p,'grade'),renewAt:0};
    }
    if(Object.keys(this.state.fields).length&&!this.state.seeded){
      const stores=this.world.settlement.materials;
      const seeds=Math.min(4,Economy.count(stores,'rice_seed'));
      if(seeds&&Economy.remove(stores,'rice_seed',seeds)){
        Economy.add(campus.vault.treasury,'rice_seed',seeds);
        campus.transfer('inbound','rice_seed',seeds);
      }
      this.state.seeded=true;
    }
  }
  note(type,n,id,item,count) {
    const s=this.state;
    s.totals[type]=(s.totals[type]??0)+count;
    s.history.push({at:this.campus.now(),type,npcId:n?.id??null,id,item,count});
    if(s.history.length>84)s.history.shift();
    if(n){
      const labels={mined:'Khai thác quặng',spiritMined:'Khai thác linh thạch',planted:'Gieo giống',watered:'Chăm sóc ruộng',harvested:'Thu hoạch'};
      const {day,minute}=this.world.clock;
      this.world.events.push({id:'production:'+id+':'+this.campus.now()+':'+type,day,minute,status:'completed',
        type:'society-'+type,actorId:n.id,description:n.name+' · '+labels[type]});
      if(this.world.events.length>400)this.world.events.shift();
    }
    this.scene.requestBackgroundSave();
  }
  update() {
    const now=this.campus.now();
    for(const field of Object.values(this.state.fields))if(field.phase===2&&now>=field.readyAt)field.phase=3;
    for(const vein of Object.values(this.state.veins))if(!vein.amount&&now>=vein.renewAt)vein.amount=vein.max;
    for(const sprite of this.scene.facilitySprites??[]){
      const {ore,crop}=sprite.getData('production');
      const vein=this.state.veins[ore],field=this.state.fields[crop];
      if(vein){
        const ratio=vein.amount/vein.max,frame=5*(ratio===0?3:ratio<.39?2:ratio<.76?1:0);
        if(sprite.texture.key!=='di-mach-deposits')sprite.setTexture('di-mach-deposits',frame);
        else if(Number(sprite.frame.name)!==frame)sprite.setFrame(frame);
      }else if(field){
        const phase=field.phase===3?5:field.phase===2?(field.readyAt-now<(field.output==='ration'?59:85)?4:3):
          field.phase===1?(field.careAt-now<=18?2:1):0;
        const variant=field.output==='ration'?0:1+([...crop].reduce((sum,c)=>sum+c.charCodeAt(0),0)%3);
        const frame=variant*6+phase;
        if(sprite.texture.key!=='di-mach-plots')sprite.setTexture('di-mach-plots',frame);
        else if(Number(sprite.frame.name)!==frame)sprite.setFrame(frame);
      }
    }
  }
  select(n,q,valid) {
    const relevant=this.points.filter(p=>valid(this.scene.prop(p,'id'))&&this.scene.canReachPoint(n,p));
    const previous=relevant.find(p=>this.scene.prop(p,'id')===q.workSite);
    const site=previous??relevant.sort((a,b)=>distance(n,a)-distance(n,b))
      .find(p=>this.scene.groundPositionOpen(n,p.x,p.y));
    if(!site)return null;
    const id=this.scene.prop(site,'id');
    if(q.workSite!==id){q.workSite=id;q.workUntil=null;}
    return {id,site};
  }
  work(n,q,kind,choose,minutes,apply) {
    const target=this.select(n,q,choose);
    if(!target){this.campus.move(n,n.home??n,'production-wait','rest');return;}
    this.campus.move(n,target.site,kind,'work');
    if(distance(n,target.site)>14){q.workUntil=null;return;}
    if(kind==='farm')n.farmPose=['sow','water','water','harvest'][this.state.fields[target.id].phase];
    q.workUntil??=this.campus.now()+minutes(target.id);
    if(this.campus.now()<q.workUntil)return;
    apply(target.id);
    q.workUntil=null;q.workSite=null;
  }
  mine(n,q){
    if(this.scene.underground){
      const target=this.select(n,q,id=>this.state.veins[id]?.amount>0);
      if(target)this.scene.underground.workOrder(n,target.id,q);
      else this.campus.move(n,n.home??n,'production-wait','rest');
      return;
    }
    this.work(n,q,'mine',id=>this.state.veins[id]?.amount>0,id=>this.state.veins[id].grade===2?29:19,id=>{
      const vein=this.state.veins[id],amount=Math.min(vein.grade,q.quantity-this.campus.progress(n,q),vein.amount);
      if(amount<=0)return;
      vein.amount-=amount;
      if(!vein.amount)vein.renewAt=this.campus.now()+1440;
      Economy.add(n.inventory,'iron_ore',amount);
      q.collected=(q.collected??0)+amount;
      this.note('mined',n,id,'iron_ore',amount);
    });
  }
  farm(n,q){
    const now=this.campus.now(),stock=this.campus.vault.treasury;
    const seed=q.item==='ration'?'rice_seed':'spirit_herb';
    const valid=id=>{
      const field=this.state.fields[id];
      return Boolean(field&&field.output===q.item&&(field.phase===3||field.phase===1&&now>=field.careAt||
        field.phase===0&&Economy.count(stock,seed)>0));
    };
    this.work(n,q,'farm',valid,()=>12,id=>{
      const field=this.state.fields[id];
      if(field.phase===0){
        if(!Economy.remove(stock,seed,1))return;
        this.campus.transfer('outbound',seed,1);
        field.phase=1;field.careAt=now+35;
        this.note('planted',n,id,seed,1);
      }else if(field.phase===1){
        field.phase=2;field.readyAt=now+(q.item==='ration'?125:185);
        this.note('watered',n,id,q.item,1);
      }else if(field.phase===3){
        field.phase=0;
        const yieldSize=q.item==='ration'?4:3;
        Economy.add(n.inventory,q.item,yieldSize);
        q.collected=(q.collected??0)+yieldSize;
        this.note('harvested',n,id,q.item,yieldSize);
      }
    });
  }
}
