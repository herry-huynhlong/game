import { SKY_STEP, skyStepRange } from './SkyStep.js';

const texture='sky-step-cloud';
const rounded=Math.round;
const pi=Math.PI;
const wave=t=>Math.sin(Math.min(1,Math.max(0,t))*pi);

export function preloadSkyStep(scene){
  scene.load.spritesheet(texture,'/assets/sky-step/cloud.png',{frameWidth:96,frameHeight:42});
  scene.load.audio('sky-step-wind','/assets/tribulation/wind.wav');
}

export class SkyStepVisuals {
  constructor(scene){
    this.scene=scene;this.pool=[];
    this.target=scene.add.graphics().setDepth(6450).setVisible(false);
    this.announced=new Map();
    this.sound=null;
    scene.events.once('shutdown',()=>this.sound?.destroy());
  }
  make(){
    const {scene}=this;
    const cloud=()=>scene.add.image(0,0,texture).setVisible(false).setDepth(6421);
    return {from:cloud(),to:cloud(),wind:scene.add.graphics().setDepth(6420).setVisible(false)};
  }
  aim(npc,point,preview){
    const g=this.target.clear().setVisible(Boolean(npc));
    if(!npc)return;
    const range=skyStepRange(npc);
    g.lineStyle(2,0x7aded4,.4).strokeCircle(npc.x,npc.y,range);
    if(!point)return;
    const at=preview?.landing??point,color=preview?.ok?0x85ffe1:0xef8b78;
    g.lineStyle(1,color,.55).lineBetween(npc.x,npc.y,at.x,at.y);
    g.lineStyle(2,color,.95).strokeEllipse(at.x,at.y,36,22);
    g.lineBetween(at.x-7,at.y,at.x+7,at.y).lineBetween(at.x,at.y-5,at.x,at.y+5);
  }
  update(active,time){
    const view=this.scene.cameras.main.worldView;
    const on=p=>p.x>=view.x-100&&p.x<=view.right+100&&p.y>=view.y-85&&p.y<=view.bottom+85;
    let used=0;
    for(const [id,npc] of active){
      const step=npc.skyStep;
      if(!step||used>=3)continue;
      const {from,landing,phase}=step;
      const minX=Math.min(from.x,landing.x),maxX=Math.max(from.x,landing.x);
      const minY=Math.min(from.y,landing.y)-115,maxY=Math.max(from.y,landing.y);
      const lineVisible=phase==='travel'&&maxX>=view.x&&minX<=view.right&&maxY>=view.y&&minY<=view.bottom;
      if(!on(from)&&!on(landing)&&!lineVisible)continue;
      const slot=this.pool[used]??(this.pool[used]=this.make());
      used++;
      this.draw(slot,step,time);
      if(phase==='cast'&&!this.announced.has(id)&&!this.scene.sound?.locked&&!this.scene.sound?.mute){
        if(!this.sound)this.sound=this.scene.sound.add('sky-step-wind',{volume:.20});
        if(!this.sound.isPlaying)this.sound.play();
        this.announced.set(id,true);
      }
    }
    for(let i=used;i<this.pool.length;i++){
      const {from,to,wind}=this.pool[i];from.setVisible(false);to.setVisible(false);wind.setVisible(false);
    }
    for(const id of this.announced.keys())if(!active.has(id))this.announced.delete(id);
  }
  draw(slot,step,time){
    const g=slot.wind.clear().setVisible(true),phase=step.phase,t=step.elapsed/SKY_STEP.phases[phase];
    const index=Math.floor(time/70)%6;
    const cast=phase==='cast',vanish=phase==='vanish',travel=phase==='travel',arrive=phase==='arrive';
    const a=step.from,b=step.landing;
    const cloud=(image,point,alpha,scale,frame)=>{
      image.setVisible(alpha>.01);
      if(alpha>.01)image.setPosition(rounded(point.x),rounded(point.y-11)).setFrame(frame).setAlpha(alpha).setScale(scale);
    };
    cloud(slot.from,a,cast?.2+.72*t:vanish?.93:travel?(1-t)*.45:0,cast?.55+.55*t:1+.48*t,index);
    cloud(slot.to,b,travel?t*.58:arrive?.92:phase==='recover'?.72*(1-t):0,
      arrive?1+.6*t:phase==='recover'?1.55+.27*t:.51+t*.35,(index+3)%6);
    if(cast||vanish)this.spiral(g,a,t,1,time);
    if(travel||arrive||phase==='recover')this.spiral(g,b,t,phase==='recover'?1-t:1,time);
    if(!travel)return;
    const tail=Math.max(0,t-.35);
    const arc=u=>({x:rounded(a.x+(b.x-a.x)*u),y:rounded(a.y+(b.y-a.y)*u-30-108*wave(u))});
    for(const [width,color,alpha] of [[10,0x238f96,.34],[5,0x6ce1c3,.84],[2,0xe4ffe4,1]]){
      const start=arc(tail);g.lineStyle(width,color,alpha).beginPath().moveTo(start.x,start.y);
      for(let k=1;k<=9;k++){const p=arc(tail+(t-tail)*k/9);g.lineTo(p.x,p.y);}
      g.strokePath();
    }
    const lead=arc(t);
    g.fillStyle(0xf1ffe5,1).fillRect(lead.x-3,lead.y-3,7,6);
    for(let j=0;j<15;j++){
      const u=Math.max(0,t-j*.018),p=arc(u),off=Math.sin(j*12.53)*j*.8;
      g.fillStyle(j%3?0x7df9d6:0xdaca9a,.75-j*.035).fillRect(rounded(p.x+off),rounded(p.y+off*.65),j<6?3:2,2);
    }
  }
  spiral(g,p,t,alpha,time){
    for(let i=0;i<18;i++){
      const angle=time*.014+i*.52,spread=9+1.7*i+(i%3)*t*6,rise=(i%5)*(1+t*5);
      const x=rounded(p.x+Math.cos(angle)*spread),y=rounded(p.y+Math.sin(angle)*spread*.36-rise);
      g.fillStyle(i%3?0xb1f9dd:0x5fbfba,alpha*(.86-i*.03)).fillRect(x,y,4-i%3,2);
      if(i<9)g.lineStyle(1,0x98f1cb,alpha*.68).lineBetween(x,y,x+rounded(Math.sin(angle)*8),y-rounded(Math.cos(angle)*4));
    }
  }
}
