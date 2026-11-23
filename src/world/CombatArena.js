import { ACTIONS, AXES } from './CharacterCombat.js';
import { MountSystem, mountedPositionAllowed } from './MountSystem.js';

export class CombatArena {
  constructor(scene,rider){
    this.scene=scene;
    this.rider=rider;
    this.mount=new MountSystem(scene,rider,1.55);
    this.hitCount=0;
    this.clock=0;
    this.bolts=[];
    this.lastEvent=null;
    this.graphics=scene.add.graphics().setDepth(90);
    this.targets=[[320,195],[320,279],[278,235],[362,235]].map(([x,y])=>({x,y,mark:scene.add.rectangle(x,y-10,18,28,0x9b7550).setStrokeStyle(2,0xe0c087)}));
    this.wall=scene.add.rectangle(560,270,26,88,0x66917b).setStrokeStyle(2,0x567163);
    rider.onActionEvent=(event,action)=>this.event(event,action);
  }

  canStand(x,y,radius=0){
    return mountedPositionAllowed(x,y,(px,py)=>px>=62&&px<=578&&py>=183&&py<=371&&!(px>545&&px<575&&py>225&&py<316),radius);
  }

  move(x,y){
    if(this.mount.locked)return;
    const root=this.rider.root;
    const radius=this.mount.attached?13:0;
    for(const [px,py] of [[x,y],[root.x,y],[x,root.y]]){
      if(this.canStand(px,py,radius)){root.setPosition(px,py);break;}
    }
  }

  command(name){
    const {rider,mount}=this;
    const position=this.ground??{x:rider.root.x,y:rider.root.y};
    const dir=rider.direction;
    if(name==='summon')return mount.summon(position.x,position.y,dir);
    if(name==='mount')return mount.toggle(position.x,position.y,dir,(x,y)=>this.canStand(x,y),(x,y)=>{
      this.ground={x,y};rider.root.setPosition(x,y);
    });
    if(mount.locked)return false;
    if(name==='aim'){
      if(rider.combat.weapon!=='crossbow'||rider.combat.action)return false;
      rider.combat.aim=!rider.combat.aim;rider.apply();return true;
    }
    if(name==='reload')return rider.combat.weapon==='crossbow'&&!rider.combat.loaded&&rider.combat.start('crossbowReload',dir);
    if(name==='attack')return rider.combat.attack(dir);
    return false;
  }

  drawHit(target){
    this.hitCount++;
    target.mark.setFillStyle(0xc55f53);
    this.scene.time.delayedCall(130,()=>target.mark.setFillStyle(0x9b7550));
  }

  event(event,action){
    this.mount.event(event);
    const {rider,scene}=this;
    this.lastEvent={type:event,move:action.name,direction:action.direction,frame:action.frame,mounted:this.mount.attached};
    if(!['bolt','strike'].includes(event))return;
    const dir=action.direction;
    const [ux,uy]=AXES[dir];
    if(event==='bolt'){
      const tip=rider.worldAttachment('tip');
      if(!tip)return;
      const start={x:tip.x,y:tip.y};
      this.lastEvent.start=start;
      this.bolts.push({sprite:scene.add.image(start.x,start.y,'combat-mount','bolt').setOrigin(1,.5).setRotation(Math.atan2(uy,ux)).setDepth(5),x:start.x,y:start.y,ux,uy,range:340});
      scene.sound.play('rig-bolt',{volume:.24});
      return;
    }
    const origin=this.ground??{x:rider.root.x,y:rider.root.y};
    const range=action.name.startsWith('saber')?65:56;
    const width=action.name==='swordThrust'?16:28;
    this.arc={x:origin.x,y:origin.y,ux,uy,range,width,until:this.clock+140};
    for(const target of this.targets){
      const dx=target.x-origin.x,dy=target.y-origin.y;
      const forward=dx*ux+dy*uy,lateral=dx*uy-dy*ux;
      if(forward>0&&forward<range&&Math.abs(lateral)<width)this.drawHit(target);
    }
    const fx=scene.add.graphics().setDepth(8).lineStyle(2,0xe3c578,.9);
    fx.lineBetween(origin.x+ux*24-uy*16,origin.y+uy*24+ux*16-16,origin.x+ux*range+uy*9,origin.y+uy*range-ux*9-16);
    scene.time.delayedCall(100,()=>fx.destroy());
    scene.sound.play('rig-strike',{volume:.2});
  }

  beginFrame(){
    if(this.ground)this.rider.root.setPosition(this.ground.x,this.ground.y);
  }

  finishFrame(delta,motion,direction,distance){
    const root=this.rider.root;
    this.ground={x:root.x,y:root.y};
    this.clock+=delta;
    this.mount.render(root.x,root.y,this.rider.combat.action?.direction??direction,motion,distance);
    this.rider.advance(delta,motion,direction,distance/root.scaleX);
    this.updateBolts(delta);
  }

  updateBolts(delta){
    this.bolts=this.bolts.filter(bolt=>{
      const distance=Math.min(bolt.range,delta*.37);
      for(let traversed=0;traversed<distance;){
        const step=Math.min(4,distance-traversed);
        bolt.x+=bolt.ux*step;bolt.y+=bolt.uy*step;bolt.range-=step;traversed+=step;
        const target=this.targets.find(dummy=> Math.abs(dummy.x-bolt.x)<12&&Math.abs(dummy.y-13-bolt.y)<19);
        if(target){this.drawHit(target);bolt.range=0;break;}
        if(bolt.x>546&&bolt.x<574&&bolt.y>225&&bolt.y<315){bolt.range=0;break;}
      }
      if(bolt.range<=0){bolt.sprite.destroy();return false;}
      bolt.sprite.setPosition(Math.round(bolt.x),Math.round(bolt.y));return true;
    });
  }

  debug(visible){
    this.graphics.clear();
    if(!visible)return;
    const draw=(point,color)=>{if(point)this.graphics.fillStyle(color).fillCircle(point.x,point.y,4);};
    draw(this.rider.worldAttachment('hand'),0xf6cb58);
    draw(this.rider.worldAttachment('tip'),0x73d0ee);
    draw(this.mount.saddle,0x9de171);
    if(this.lastEvent?.start)draw(this.lastEvent.start,0xfd8f72);
    if(this.arc&&this.arc.until>=this.clock){
      const {x,y,ux,uy,range,width}=this.arc;
      this.graphics.lineStyle(2,0xe9ae68,.9).strokePoints([
        {x:x-uy*width,y:y+ux*width},{x:x+ux*range-uy*width,y:y+uy*range+ux*width},
        {x:x+ux*range+uy*width,y:y+uy*range-ux*width},{x:x+uy*width,y:y-ux*width},
      ],true);
    }
  }

  get state(){return this.mount.attached?`mounted/${this.rider.combat.state}`:this.mount.locked?this.mount.state:this.rider.combat.state;}
  stepLength(){const action=this.rider.combat.action;return action?ACTIONS[action.name][action.frame][0]-action.time+.01:90;}
}
