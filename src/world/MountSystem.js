import { AXES } from './CharacterCombat.js';

export class MountSystem {
  phase=0;
  state='absent';
  direction='down';

  constructor(scene,rider,scale){
    this.rider=rider;
    this.scale=scale;
    this.anchors=scene.cache.json.get('combat-anchors');
    this.node=scene.add.image(0,0,'combat-mount','tiger/down/0').setScale(scale).setVisible(false);
    this.cover=scene.add.image(0,0,'combat-mount','tiger/down/0').setScale(scale).setVisible(false);
  }

  summon(x,y,direction){
    if(this.state!=='absent')return false;
    this.x=x;this.y=y;this.direction=direction;this.state='parked';
    this.render(x,y,direction,'idle',0);
    return true;
  }

  toggle(x,y,direction,canStand,place){
    const {combat}=this.rider;
    if(combat.action)return false;
    if(this.state==='parked'){
      if(Math.hypot(x-this.x,y-this.y)>64||!canStand(this.x,this.y))return false;
      if(!combat.start('mountEnter',direction))return false;
      this.state='entering';
      // The caller keeps the existing collision root until the seating event.
      this.transition={x:this.x,y:this.y,place};
      return true;
    }
    if(this.state!=='mounted')return false;
    const [vx,vy]=AXES[direction];
    const offset=28*this.scale/.7;
    const valid=[[-vy,vx],[vy,-vx],[-vx,-vy],[vx,vy]].find(([a,b])=>canStand(x+a*offset,y+b*offset));
    if(!valid||!combat.start('dismount',direction))return false;
    this.state='leaving';
    this.transition={x:x+valid[0]*offset,y:y+valid[1]*offset,place};
    return true;
  }

  event(name){
    if(name==='seated'&&this.state==='entering'){
      const {x,y,place}=this.transition;
      place(x,y);this.state='mounted';this.transition=null;
    }else if(name==='landed'&&this.state==='leaving'){
      const {x,y,place}=this.transition;
      place(x,y);this.state='parked';this.transition=null;
    }
  }

  get attached(){return this.state==='mounted'||this.state==='leaving';}
  get locked(){return this.state==='entering'||this.state==='leaving';}

  render(x,y,direction,motion,distance){
    this.rider.riding=this.attached;
    this.rider.rideBob=0;
    if(this.state==='absent')return;
    if(this.attached){this.x=x;this.y=y;this.direction=direction;}
    if(this.attached&&motion!=='idle')this.phase=(this.phase+distance/(this.scale*(motion==='run'?38:50)))%1;
    const phase=this.attached&&motion!=='idle'?Math.floor(this.phase*4):0;
    const frame=[0,1,0,2][phase];
    const key=`tiger/${this.direction}/${frame}`;
    const [ax,ay]=this.anchors.origins[key];
    const [sx,sy]=this.anchors.saddles[key];
    this.node.setFrame(key).setOrigin(0).setPosition(Math.round(this.x-ax*this.scale),Math.round(this.y-ay*this.scale)).setDepth(this.y-.04).setVisible(true);
    this.saddle={x:this.x+sx*this.scale,y:this.y+sy*this.scale};
    const hips=this.rider.root.scaleY*34;
    const action=this.rider.combat.action;
    if(this.attached||this.state==='entering'){
      let px=this.saddle.x,py=this.saddle.y+hips;
      if(this.state==='entering'){
        const mix=(action?.frame??0)/2;
        px=x+(px-x)*mix;py=y+(py-y)*mix;
      }else if(this.state==='leaving'&&this.transition){
        const mix=(action?.frame??0)/2;
        px+=(this.transition.x-px)*mix;py+=(this.transition.y-py)*mix;
      }
      this.rider.root.setPosition(Math.round(px),Math.round(py));
    }
    const occlusion=this.attached&&this.direction==='down';
    if(occlusion){
      const h=this.cover.texture.get(key).height;
      this.cover.setFrame(key).setOrigin(0).setPosition(this.node.x,this.node.y).setCrop(0,Math.round(h*.56),this.cover.frame.width,Math.round(h*.30)).setDepth(this.y+.03);
    }
    this.cover.setVisible(occlusion);
  }

  reset(){this.state='absent';this.transition=null;this.saddle=null;this.rider.riding=false;this.node.setVisible(false);this.cover.setVisible(false);}
}

export function mountedPositionAllowed(x,y,canStand,radius=10){
  return canStand(x,y)&&canStand(x-radius,y)&&canStand(x+radius,y)&&canStand(x,y-radius)&&canStand(x,y+radius);
}
